-- nf_ai_ask_deep v1.8 — minimal diagnostic version.
--
-- Hypothesis under test: Gemma 4 26B A4B on Google's free-tier
-- generativelanguage.googleapis.com does NOT reliably support the
-- Gemini `responseMimeType: "application/json"` + `responseSchema`
-- structured-output pathway, and when fed those params it hangs
-- instead of returning 400 Bad Request. v1.7 used both and got
-- `0 bytes received @ 100s` three calls in a row.
--
-- v1.8 strips the body down to the same minimal shape Call 1 uses
-- (which we know works on the exact same model + API key + http
-- extension + endpoint), with only the fields we actually need:
--
--   - NO responseSchema
--   - NO responseMimeType
--   - NO topP / topK         (Call 1 doesn't use them; align)
--   - Minimal prompt — no skeleton, no 8 hard rules, no few-shot.
--     Just "here's the data, return JSON with summary + highlights".
--   - maxOutputTokens 400 → 200 (summary ~50 chars + 2-3 bullets
--     ~30 chars each ≈ 150 tokens)
--   - Manual JSON parse on the free-text response (same approach
--     we already use for the raw text field in the API response)
--
-- If v1.8 succeeds:
--   → responseSchema was the blocker. Never pass it to Gemma again.
--   → We got deep analysis working on 26B A4B with a pure-prompt
--     approach.
--
-- If v1.8 still returns `0 bytes received @ 100s`:
--   → responseSchema was NOT the (only) blocker. Something else in
--     our request body is triggering Google's upstream to hang.
--     Next step would be a dead-simple ping ("say hi", 10 tokens,
--     no data blob) to isolate whether it's prompt size or the
--     model path itself that's broken.
--
-- Optional sanity-check model swap:
--   User explicitly asked NOT to build a Gemini Flash comparison
--   this round. If v1.8 fails, bring that conversation back — a
--   one-line model swap to gemini-2.0-flash would isolate whether
--   the issue is Gemma-specific or endpoint-wide.
--
-- All other v1.6/v1.7 safety rails preserved: curl 100s, statement
-- 120s, row cap 20, blob char cap 3000, repetition guard, curlopt
-- debug flag, degraded reason paths.

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
  -- To sanity-check against Gemini Flash, temporarily change the line
  -- above to: v_model text := 'gemini-2.0-flash';
  v_endpoint     text;
  v_existing_sub text;
  v_masked       jsonb;
  v_row_count    int;
  v_data_blob    text;
  v_prompt       text;
  v_body         jsonb;
  v_resp         extensions.http_response;
  v_json         jsonb;
  v_raw_text     text;
  v_json_start   int;
  v_json_end     int;
  v_json_slice   text;
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

  -- ── Minimal prompt. No skeleton, no hard rules. Just ask for JSON. ──
  v_prompt := format(
E'資料 (%s，共 %s 筆)：%s\n\n問題：%s\n\n' ||
E'請用繁體中文回覆一個 JSON，只包含兩個欄位：\n' ||
E'{"summary": "一句話整體摘要", "highlights": ["重點1", "重點2"]}\n\n' ||
E'只輸出 JSON，不要其他文字。',
    p_rpc_name, v_row_count, v_data_blob, p_question
  );

  -- ── Minimal body — mirror Call 1's shape exactly ────────────
  -- No system_instruction (Call 1 has it, we don't need it for a
  -- one-shot narration; keep it minimal to isolate variables).
  -- No tools, no toolConfig, no responseSchema, no topP/topK.
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
      'temperature',     0.2,
      'maxOutputTokens', 200
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

  -- Repetition guard (belt-and-braces).
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

  -- ── Extract the JSON blob from free text ───────────────────
  -- Without responseSchema the model might wrap the JSON in
  -- ```json ... ``` fences or add a preamble. Slice from the first
  -- '{' to the last '}' to recover the JSON substring.
  v_json_start := position('{' in v_raw_text);
  v_json_end   := length(v_raw_text) - position('}' in reverse(v_raw_text)) + 1;

  IF v_json_start = 0 OR v_json_end < v_json_start THEN
    RETURN jsonb_build_object(
      'error', 'schema_decode_failed',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model,
      'degraded', true, 'degrade_reason', 'schema_decode_failed',
      'raw_preview', left(v_raw_text, 200)
    );
  END IF;

  v_json_slice := substring(v_raw_text FROM v_json_start FOR (v_json_end - v_json_start + 1));

  BEGIN
    v_parsed := v_json_slice::jsonb;
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

  IF v_summary IS NULL OR v_bullets IS NULL THEN
    v_degraded := true;
    v_degrade_reason := 'sections_incomplete';
  END IF;

  RETURN jsonb_build_object(
    'trend',           v_summary,
    'observations',    v_bullets,
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
