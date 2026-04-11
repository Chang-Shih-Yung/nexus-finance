-- ============================================================================
-- Wave 5 (second half) — rewire nf_ai_ask_deep to read from nf_ai_config,
-- and lower the seeded defaults so cold-start Gemma calls finish inside
-- the Supabase Kong gateway's ~60s idle timeout.
--
-- Problem:
--   The first deep call after a Gemma cold start takes 40–70 seconds
--   because Google has to warm the 26B A4B model. The Supabase Kong
--   gateway cuts the request at ~60s and returns 503 regardless of what
--   our Postgres function is doing. nf_ai_ask_deep itself is fine —
--   statement_timeout is 120s, CURLOPT_TIMEOUT_MS is 100s — but the
--   gateway beats both.
--
--   There is no way to raise Kong's ceiling on Supabase, so the fix is
--   to make every deep call *cheaper*: fewer rows, shorter blob, shorter
--   answer. A cheaper prompt finishes in 25–35s even on a cold start,
--   which sits comfortably under 60s.
--
-- Strategy:
--   1. Wire nf_ai_ask_deep to load its 6 tunables from nf_ai_config at
--      function start, using the getter helpers from Wave 4. Fallbacks
--      match the new (smaller) defaults so a missing row never brings
--      back the slow shape.
--   2. UPDATE the existing seed rows to the smaller values:
--        deep.max_rows        20     →     8
--        deep.data_blob_chars 3000   →  1200
--        deep.max_tokens      200    →   120
--        deep.timeout_ms      100000 → 55000   (< Kong's ~60s ceiling)
--      deep.model and deep.temperature are unchanged.
--
-- Why drop CURLOPT_TIMEOUT_MS below Kong's ceiling:
--   If curl waits 100s but the gateway cuts at 60s, the gateway returns
--   503 and our function never gets to write `http_failed` to the error
--   ledger — we lose observability. By setting curl to 55s we get a
--   clean EXCEPTION inside the function, log it, and return a structured
--   error response that the gateway will happily forward. Worst case: a
--   genuinely slow Gemma call returns `http_failed` instead of 503, but
--   at least we SEE it.
--
-- Safety:
--   - Single function re-create via CREATE OR REPLACE.
--   - All hardcoded values are preserved as fallback defaults on the
--     getter calls, so even if someone TRUNCATEs nf_ai_config the
--     function still runs — just with the new smaller shape.
--   - No signature change, no GRANT change, no downstream caller
--     needs updating.
-- ============================================================================

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
  -- ── Tunables loaded from nf_ai_config at BEGIN ────────────────
  -- Fallback defaults on each getter match the new (smaller) seeded
  -- values so a missing row is safe and does not regress to the slow
  -- shape that caused the original 503.
  v_model            text;
  v_timeout_ms       int;
  v_max_rows         int;
  v_data_blob_chars  int;
  v_max_tokens       int;
  v_temperature      numeric;

  -- ── Runtime state ──────────────────────────────────────────────
  v_api_key        text;
  v_endpoint       text;
  v_existing_sub   text;
  v_masked         jsonb;
  v_row_count      int;
  v_data_blob      text;
  v_prompt         text;
  v_body           jsonb;
  v_resp           extensions.http_response;
  v_json           jsonb;
  v_raw_text       text;
  v_json_start     int;
  v_json_end       int;
  v_json_slice     text;
  v_parsed         jsonb;
  v_summary        text;
  v_highlights     jsonb;
  v_highlight      text;
  v_bullets        text := '';
  v_degraded       boolean := false;
  v_degrade_reason text;
  v_max_rep        int;
  v_curlopt_ok     boolean := false;
BEGIN
  -- ── Load config upfront so every code path below sees consistent
  --    values. Each getter has its own default so a missing row or a
  --    bad cast silently falls back instead of crashing the function. ──
  v_model           := public.nf_ai_config_get_text   ('deep.model',            'gemma-4-26b-a4b-it');
  v_timeout_ms      := public.nf_ai_config_get_int    ('deep.timeout_ms',        55000);
  v_max_rows        := public.nf_ai_config_get_int    ('deep.max_rows',              8);
  v_data_blob_chars := public.nf_ai_config_get_int    ('deep.data_blob_chars',     1200);
  v_max_tokens      := public.nf_ai_config_get_int    ('deep.max_tokens',           120);
  v_temperature     := public.nf_ai_config_get_numeric('deep.temperature',         0.2);

  IF p_question IS NULL OR trim(p_question) = '' THEN
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model, rpc_attempted)
    VALUES (COALESCE(p_question, ''), 'deep', 'missing_question', NULL, v_model, p_rpc_name);
    RETURN jsonb_build_object(
      'error', 'missing_question',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'degraded', true, 'degrade_reason', 'missing_question'
    );
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'array'
     OR jsonb_array_length(p_data) = 0 THEN
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model, rpc_attempted)
    VALUES (p_question, 'deep', 'empty_data', NULL, v_model, p_rpc_name);
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
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model, rpc_attempted)
    VALUES (p_question, 'deep', 'missing_api_key', NULL, v_model, p_rpc_name);
    RETURN jsonb_build_object(
      'error', 'missing_api_key',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'degraded', true, 'degrade_reason', 'missing_api_key'
    );
  END IF;

  BEGIN
    PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', v_timeout_ms::text);
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

  IF v_row_count > v_max_rows THEN
    SELECT jsonb_agg(elem)
      INTO v_masked
      FROM (
        SELECT elem
        FROM jsonb_array_elements(v_masked) WITH ORDINALITY AS t(elem, ord)
        WHERE ord <= v_max_rows
      ) s;
    v_row_count := v_max_rows;
  END IF;

  v_data_blob := v_masked::text;
  IF char_length(v_data_blob) > v_data_blob_chars THEN
    v_data_blob := left(v_data_blob, v_data_blob_chars) || '…';
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
      'temperature',     v_temperature,
      'maxOutputTokens', v_max_tokens
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
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model, rpc_attempted)
    VALUES (p_question, 'deep', 'http_failed', SQLERRM, v_model, p_rpc_name);
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
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model, rpc_attempted)
    VALUES (p_question, 'deep', format('http_status_%s', v_resp.status),
            left(v_resp.content, 500), v_model, p_rpc_name);
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
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model, rpc_attempted)
    VALUES (p_question, 'deep', 'invalid_json', left(v_resp.content, 500), v_model, p_rpc_name);
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
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model, rpc_attempted)
    VALUES (p_question, 'deep', 'empty_response', NULL, v_model, p_rpc_name);
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
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model, rpc_attempted)
    VALUES (p_question, 'deep', 'degeneration_detected', left(v_raw_text, 200), v_model, p_rpc_name);
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
  v_json_start := position('{' in v_raw_text);
  v_json_end   := length(v_raw_text) - position('}' in reverse(v_raw_text)) + 1;

  IF v_json_start = 0 OR v_json_end < v_json_start THEN
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model, rpc_attempted)
    VALUES (p_question, 'deep', 'schema_decode_failed',
            'no_json_braces: ' || left(v_raw_text, 200), v_model, p_rpc_name);
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
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model, rpc_attempted)
    VALUES (p_question, 'deep', 'schema_decode_failed',
            SQLERRM || ' | slice: ' || left(v_json_slice, 200), v_model, p_rpc_name);
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

-- ── Lower the seeded config values ─────────────────────────────
-- Unconditionally UPDATE so the migration is idempotent even when the
-- row already has the new value (UPDATE ... SET x = 8 WHERE x <> 8
-- would be equivalent but noisier).
UPDATE public.nf_ai_config SET value = '8'     WHERE key = 'deep.max_rows';
UPDATE public.nf_ai_config SET value = '1200'  WHERE key = 'deep.data_blob_chars';
UPDATE public.nf_ai_config SET value = '120'   WHERE key = 'deep.max_tokens';
UPDATE public.nf_ai_config SET value = '55000' WHERE key = 'deep.timeout_ms';
