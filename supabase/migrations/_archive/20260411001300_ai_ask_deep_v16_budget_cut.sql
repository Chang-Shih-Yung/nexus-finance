-- nf_ai_ask_deep v1.6 — cut 26B A4B's workload to fit the curl budget.
--
-- Problem observed on v1.5:
--   Two consecutive deep-analysis attempts on the same query both
--   failed with "0 bytes received":
--     1st: http_failed: timeout 90002ms (curl ceiling)
--     2nd: 57014 canceling statement (Postgres ceiling)
--   Root cause is NOT timeout tuning — Google's 26B A4B free-tier
--   endpoint is taking longer than 90s to emit even the first token
--   because we're asking it to produce ~1400 output tokens on top of
--   a ~2KB prompt. At 15-25 tok/s on free tier, 1400 tokens is ~70s
--   of pure generation, plus 20-40s of cold start + prefill, which
--   straddles our 90s curl ceiling.
--
-- Fix: reduce the budget 26B A4B has to spend.
--
--   maxOutputTokens : 1400 → 700   (~35s saved on generation)
--   row cap         : 50   → 20   (smaller input blob → faster prefill)
--   data_blob cap   : none → 3000 chars (hard cap guard for huge RPCs)
--   curl timeout    : 90s  → 100s (+10s headroom for cold start)
--   stmt timeout    : 120s → 120s (unchanged; curl still fires first)
--
--   Also: replace the silent `EXCEPTION WHEN OTHERS THEN NULL` around
--   http_set_curlopt with a RAISE NOTICE so we can see in the logs if
--   the curl option isn't being applied. v1.5's 2nd-attempt 57014
--   implied curl wasn't actually capped, but we couldn't tell because
--   the error was swallowed. This makes future diagnosis cheaper.
--
-- Everything else — skeleton prompt, loosened 趨勢 semantics, stable
-- sampling (temp 0.2, topP 0.9, topK 40), repetition guard, parser —
-- is preserved verbatim from v1.5.

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
  v_body         jsonb;
  v_resp         extensions.http_response;
  v_json         jsonb;
  v_raw_text     text;
  v_section      text;
  v_buf          text := '';
  v_trend        text;
  v_obs          text;
  v_recs         text;
  v_risks        text;
  v_line         text;
  v_trimmed      text;
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

  -- ── curl cap: 100s, fire BEFORE statement_timeout 120s ──────
  -- Was `EXCEPTION WHEN OTHERS THEN NULL` in v1.5 — that silently
  -- swallowed failures and contributed to v1.5's 2nd-attempt 57014.
  -- Now we at least log + mark it so debug_reason can tell us next time.
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

  -- Row cap: 50 → 20. 20 rows is plenty to reflect distribution;
  -- deep analysis is supposed to synthesise, not enumerate.
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

  -- Hard char cap as a belt-and-braces guard against pathological
  -- RPCs with huge per-row payloads. 3000 chars ≈ 750 tokens, well
  -- under our target prefill budget.
  v_data_blob := v_masked::text;
  IF char_length(v_data_blob) > 3000 THEN
    v_data_blob := left(v_data_blob, 3000) || '…';
  END IF;

  v_prompt := format(
E'以下是使用者查詢的業務資料，來源 RPC：%s，共 %s 筆（已做 PII 遮罩）：\n\n%s\n\n' ||
E'---\n\n' ||
E'使用者原本的問題：%s\n\n' ||
E'你是 Nexus Finance 的資深資料分析師，為執行副總（EVP）撰寫深度解讀。\n' ||
E'請用繁體中文（台灣商業用語）輸出四段分析，嚴格照以下骨架的結構。\n\n' ||
E'═══ 輸出骨架（只展示段落結構，不是內容範例）═══\n\n' ||
E'【趨勢】\n' ||
E'<此處寫一段整體狀況概述，50 到 120 字>\n\n' ||
E'【觀察】\n' ||
E'- <重點 1>\n' ||
E'- <重點 2>\n' ||
E'- <重點 3（可選）>\n\n' ||
E'【建議】\n' ||
E'- <可執行動作 1>\n' ||
E'- <可執行動作 2>\n\n' ||
E'【風險】\n' ||
E'- <風險 1>\n' ||
E'- <風險 2（可選）>\n\n' ||
E'═══ 骨架結束 ═══\n\n' ||
E'硬性要求：\n' ||
E'1. 四個段落標題必須是「【趨勢】」「【觀察】」「【建議】」「【風險】」，不得翻譯為 TREND 等英文。\n' ||
E'2. 不要使用 **粗體** 或 # 符號，條列只用「- 」。\n' ||
E'3. 全部繁體中文，禁止英文句子。\n' ||
E'4. 不要前言、不要重述題目、不要複述骨架文字（<>裡的占位符不要出現在輸出裡）。\n' ||
E'5. 【趨勢】段可以是「時間趨勢」也可以是「整體狀況 / 分布概述」。若資料是快照、排名或結構佔比，請寫整體狀況與分布，不要硬編不存在的時間變化。\n' ||
E'6. 所有數字、名稱、百分比都要根據上面提供的真實資料，不要虛構。\n' ||
E'7. 輸出要精簡：整份四段合計不超過 500 字。\n' ||
E'8. 直接從「【趨勢】」這一行開始寫。',
    p_rpc_name,
    v_row_count,
    v_data_blob,
    p_question
  );

  -- maxOutputTokens: 1400 → 700. 500 字 zh-TW ≈ 600-700 tokens.
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
      'topP',            0.9,
      'topK',            40,
      'maxOutputTokens', 700
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

  -- Repetition guard: any 4-8 char substring repeating 4+ times → treat
  -- as degenerate and bail, so the retry button fires instead of dumping
  -- garbage like "趨勢– 趨勢– 趨→ 趨勢–" into the UI.
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

  v_section := NULL;
  FOREACH v_line IN ARRAY string_to_array(v_raw_text, E'\n')
  LOOP
    v_trimmed := regexp_replace(v_line, '^[\s\*\-•·]+', '');
    v_trimmed := regexp_replace(v_trimmed, '\*\*', '', 'g');

    IF v_trimmed ~ '^[【\[]\s*趨勢\s*[】\]]' THEN
      IF v_section = 'trend'              THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
      ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'trend';
      v_buf := trim(regexp_replace(v_trimmed, '^[【\[]\s*趨勢\s*[】\]]\s*', ''));
      CONTINUE;
    ELSIF v_trimmed ~ '^[【\[]\s*觀察\s*[】\]]' THEN
      IF v_section = 'trend'              THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
      ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'observations';
      v_buf := trim(regexp_replace(v_trimmed, '^[【\[]\s*觀察\s*[】\]]\s*', ''));
      CONTINUE;
    ELSIF v_trimmed ~ '^[【\[]\s*建議\s*[】\]]' THEN
      IF v_section = 'trend'              THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
      ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'recommendations';
      v_buf := trim(regexp_replace(v_trimmed, '^[【\[]\s*建議\s*[】\]]\s*', ''));
      CONTINUE;
    ELSIF v_trimmed ~ '^[【\[]\s*風險\s*[】\]]' THEN
      IF v_section = 'trend'              THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
      ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'risks';
      v_buf := trim(regexp_replace(v_trimmed, '^[【\[]\s*風險\s*[】\]]\s*', ''));
      CONTINUE;
    END IF;

    IF v_section IS NOT NULL THEN
      v_line := regexp_replace(v_line, '\*\*([^*]+)\*\*', '\1', 'g');
      IF v_buf = '' THEN
        v_buf := v_line;
      ELSE
        v_buf := v_buf || E'\n' || v_line;
      END IF;
    END IF;
  END LOOP;

  IF v_section = 'trend'              THEN v_trend := trim(v_buf);
  ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
  ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
  ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
  END IF;

  IF v_trend IS NULL AND v_obs IS NULL
     AND v_recs IS NULL AND v_risks IS NULL THEN
    v_trend := trim(regexp_replace(v_raw_text, '^【趨勢】\s*', ''));
    v_degraded := true;
    v_degrade_reason := 'parse_failed';
  END IF;

  IF v_degraded = false
     AND (v_trend IS NULL OR v_obs IS NULL OR v_recs IS NULL) THEN
    v_degraded := true;
    v_degrade_reason := 'sections_incomplete';
  END IF;

  IF v_trend = '' THEN v_trend := NULL; END IF;
  IF v_obs   = '' THEN v_obs   := NULL; END IF;
  IF v_recs  = '' THEN v_recs  := NULL; END IF;
  IF v_risks = '' THEN v_risks := NULL; END IF;

  RETURN jsonb_build_object(
    'trend',           v_trend,
    'observations',    v_obs,
    'recommendations', v_recs,
    'risks',           v_risks,
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
