-- nf_ai_ask_deep v1.7 — lean on 26B A4B's actual strength: structured
-- JSON output via responseSchema / constrained decoding.
--
-- Background: v1.3 → v1.6 all tried to coax Gemma 4 26B A4B into
-- producing a four-section zh-TW narrative (【趨勢】/【觀察】/【建議】/
-- 【風險】). Every attempt either timed out (>100s for 700 output
-- tokens) or produced degenerate repetition. Root cause — verified
-- against Gemma 4's official model card — is that 26B A4B is a MoE
-- model optimised for "function calling and agentic workflows rather
-- than extended narrative generation". Its router actively hurts us
-- on free-form narrative because every token makes it hesitate.
--
-- v1.7 approach: give the model what it's good at.
--
--   1. Use Gemini API's `responseMimeType: "application/json"` +
--      `responseSchema` to force constrained decoding. The model no
--      longer has to "remember the format" — the decoder refuses any
--      token that would break the schema, so output is 100% valid
--      JSON every time. This is the same machinery Gemma uses for
--      function calling, which is its wheelhouse.
--
--   2. Schema is intentionally tiny — two fields:
--        summary    : string  (1 sentence overall insight)
--        highlights : string[]  (2-4 key points)
--      We drop 【建議】/【風險】 entirely from this "light" mode. Those
--      sections require causal reasoning + recommendation generation,
--      which is where 26B A4B struggles most. If we want them back
--      later, do it with a stronger model (Gemini Flash / 31B), not
--      by bullying 26B into doing something it wasn't trained for.
--
--   3. maxOutputTokens 700 → 400. 1-sentence summary + 2-4 bullets
--      fits easily in 300 zh-TW tokens; 400 leaves headroom.
--
--   4. Prompt collapses from 8 hard rules + skeleton to 3 short
--      instructions + the JSON schema description. Less prompt =
--      faster prefill + less cognitive load for the MoE router.
--
-- Return shape is unchanged for the frontend — we map the JSON back:
--   summary    → trend            (frontend section: 重點摘要)
--   highlights → observations     (joined as "- ..." bullets)
--   recommendations / risks → NULL (frontend already hides null sections)
--
-- Everything from v1.6 that was fine is preserved: 26B A4B model,
-- curl 100s, statement_timeout 120s, row cap 20, 3000-char blob cap,
-- repetition guard (as belt-and-braces; should basically never fire
-- now that output is constrained), degraded flag paths.

CREATE OR REPLACE FUNCTION public.nf_ai_ask_deep(
  p_question text,
  p_rpc_name text,
  p_data     jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
SET statement_timeout = '120s'
AS $$
DECLARE
  v_api_key      text;
  v_model        text := 'gemma-4-26b-a4b-it';
  v_endpoint     text;
  v_existing_sub text;
  v_masked       jsonb;
  v_row_count    int;
  v_data_blob    text;
  v_prompt       text;
  v_schema       jsonb;
  v_body         jsonb;
  v_resp         extensions.http_response;
  v_json         jsonb;
  v_raw_text     text;
  v_parsed       jsonb;
  v_summary      text;
  v_highlights   jsonb;
  v_highlight    text;
  v_bullets      text := '';
  v_degraded     boolean := false;
  v_degrade_reason text;
  v_max_rep      int;
  v_curlopt_ok   boolean := false;
BEGIN
  IF p_question IS NULL OR trim(p_question) = '' THEN
    RETURN jsonb_build_object(
      'error', 'missing_question',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'degraded', true, 'degrade_reason', 'missing_question'
    );
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'array'
     OR jsonb_array_length(p_data) = 0 THEN
    RETURN jsonb_build_object(
      'error', 'empty_data',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'degraded', true, 'degrade_reason', 'empty_data'
    );
  END IF;

  BEGIN
    v_existing_sub := current_setting('request.jwt.claim.sub', true);
  EXCEPTION WHEN OTHERS THEN
    v_existing_sub := NULL;
  END;
  IF v_existing_sub IS NULL OR v_existing_sub = '' THEN
    PERFORM set_config('request.jwt.claim.sub',
                       '00000000-0000-0000-0000-000000000000', true);
  END IF;

  SELECT decrypted_secret INTO v_api_key
  FROM vault.decrypted_secrets
  WHERE name = 'google_ai_api_key'
  LIMIT 1;

  IF v_api_key IS NULL OR v_api_key = '' THEN
    RETURN jsonb_build_object(
      'error', 'missing_api_key',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'degraded', true, 'degrade_reason', 'missing_api_key'
    );
  END IF;

  BEGIN
    PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '100000');
    v_curlopt_ok := true;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'http_set_curlopt failed: %', SQLERRM;
    v_curlopt_ok := false;
  END;

  v_endpoint := format(
    'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
    v_model, v_api_key
  );

  v_masked := public.nf_mask_pii(p_data);
  v_row_count := jsonb_array_length(v_masked);

  IF v_row_count > 20 THEN
    SELECT jsonb_agg(elem)
      INTO v_masked
      FROM (
        SELECT elem
        FROM jsonb_array_elements(v_masked) WITH ORDINALITY AS t(elem, ord)
        WHERE ord <= 20
      ) s;
    v_row_count := 20;
  END IF;

  v_data_blob := v_masked::text;
  IF char_length(v_data_blob) > 3000 THEN
    v_data_blob := left(v_data_blob, 3000) || '…';
  END IF;

  -- ── Lean prompt — no skeleton, no 8 hard rules. The schema does
  -- the format enforcement for us via constrained decoding.
  v_prompt := format(
E'你是 Nexus Finance 的資料分析助手。請根據以下業務資料，為執行副總產出「重點解讀」。\n\n' ||
E'來源 RPC：%s\n筆數：%s（已做 PII 遮罩）\n使用者的問題：%s\n\n資料（JSON）：\n%s\n\n' ||
E'---\n\n' ||
E'產出要求：\n' ||
E'1. 全部繁體中文，台灣商業用語，不可有英文句子。\n' ||
E'2. summary 是一句話的整體摘要（30-60 字），若資料是快照就寫整體分布，不要虛構時間趨勢。\n' ||
E'3. highlights 是 2-4 點關鍵觀察，每點 20-40 字，必須引用資料裡真實的數字或名稱。',
    p_rpc_name,
    v_row_count,
    p_question,
    v_data_blob
  );

  -- ── Gemini API responseSchema (subset of OpenAPI 3.0) ──
  -- `type`, `properties`, `items`, `required`, `description` are
  -- all supported. Constrained decoding forces the model to emit
  -- valid JSON matching this shape — no parser heroics needed.
  v_schema := jsonb_build_object(
    'type', 'object',
    'properties', jsonb_build_object(
      'summary', jsonb_build_object(
        'type', 'string',
        'description', '一句繁體中文整體摘要，30-60 字'
      ),
      'highlights', jsonb_build_object(
        'type', 'array',
        'description', '2-4 個重點觀察，每點 20-40 字，引用真實數字或名稱',
        'items', jsonb_build_object('type', 'string')
      )
    ),
    'required', jsonb_build_array('summary', 'highlights')
  );

  v_body := jsonb_build_object(
    'contents', jsonb_build_array(
      jsonb_build_object(
        'role', 'user',
        'parts', jsonb_build_array(
          jsonb_build_object('text', v_prompt)
        )
      )
    ),
    'generationConfig', jsonb_build_object(
      'temperature',      0.2,
      'topP',             0.9,
      'topK',             40,
      'maxOutputTokens',  400,
      'responseMimeType', 'application/json',
      'responseSchema',   v_schema
    )
  );

  BEGIN
    SELECT * INTO v_resp
    FROM extensions.http((
      'POST',
      v_endpoint,
      ARRAY[extensions.http_header('Content-Type', 'application/json')],
      'application/json',
      v_body::text
    )::extensions.http_request);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'http_failed: ' || SQLERRM,
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model,
      'degraded', true, 'degrade_reason', 'http_failed',
      'curlopt_applied', v_curlopt_ok
    );
  END;

  IF v_resp.status <> 200 THEN
    RETURN jsonb_build_object(
      'error', format('http_status_%s', v_resp.status),
      'message', left(v_resp.content, 500),
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model,
      'degraded', true,
      'degrade_reason', format('http_status_%s', v_resp.status)
    );
  END IF;

  BEGIN
    v_json := v_resp.content::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'invalid_json',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model,
      'degraded', true, 'degrade_reason', 'invalid_json'
    );
  END;

  -- Even with responseMimeType=json, Gemini wraps the JSON string
  -- in candidates[0].content.parts[0].text. We still have to json-
  -- decode that string into structured jsonb.
  v_raw_text := v_json #>> '{candidates,0,content,parts,0,text}';

  IF v_raw_text IS NULL OR trim(v_raw_text) = '' THEN
    RETURN jsonb_build_object(
      'error', 'empty_response',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model,
      'degraded', true, 'degrade_reason', 'empty_response'
    );
  END IF;

  -- Belt-and-braces degeneracy guard. Should basically never fire
  -- now that output is schema-constrained, but keep it so a future
  -- model swap doesn't regress silently.
  SELECT MAX(cnt) INTO v_max_rep
  FROM (
    SELECT regexp_matches(v_raw_text, '(.{4,8})\1{3,}', 'g') AS m, 1 AS cnt
  ) s;

  IF v_max_rep IS NOT NULL AND v_max_rep > 0 THEN
    RETURN jsonb_build_object(
      'error', 'degeneration_detected',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model,
      'degraded', true, 'degrade_reason', 'degeneration_detected',
      'raw_preview', left(v_raw_text, 200)
    );
  END IF;

  BEGIN
    v_parsed := v_raw_text::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'schema_decode_failed',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model,
      'degraded', true, 'degrade_reason', 'schema_decode_failed',
      'raw_preview', left(v_raw_text, 200)
    );
  END;

  v_summary    := NULLIF(trim(COALESCE(v_parsed->>'summary', '')), '');
  v_highlights := v_parsed->'highlights';

  -- Join highlights array into a bullet list that matches the
  -- frontend's existing `parseSectionBody` list detection
  -- (lines prefixed with "- ").
  IF v_highlights IS NOT NULL AND jsonb_typeof(v_highlights) = 'array' THEN
    FOR v_highlight IN SELECT jsonb_array_elements_text(v_highlights)
    LOOP
      IF trim(v_highlight) = '' THEN CONTINUE; END IF;
      IF v_bullets = '' THEN
        v_bullets := '- ' || trim(v_highlight);
      ELSE
        v_bullets := v_bullets || E'\n- ' || trim(v_highlight);
      END IF;
    END LOOP;
  END IF;

  IF v_bullets = '' THEN v_bullets := NULL; END IF;

  -- Flag degraded if schema came back but fields were empty — means
  -- the model respected the shape but gave us nothing to show.
  IF v_summary IS NULL OR v_bullets IS NULL THEN
    v_degraded := true;
    v_degrade_reason := 'sections_incomplete';
  END IF;

  RETURN jsonb_build_object(
    'trend',           v_summary,   -- maps to frontend "重點摘要"
    'observations',    v_bullets,   -- maps to frontend "重點觀察"
    'recommendations', NULL,
    'risks',           NULL,
    'model_used',      v_model,
    'degraded',        v_degraded,
    'degrade_reason',  v_degrade_reason,
    'curlopt_applied', v_curlopt_ok,
    'error',           NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.nf_ai_ask_deep(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nf_ai_ask_deep(text, text, jsonb) TO authenticated;
