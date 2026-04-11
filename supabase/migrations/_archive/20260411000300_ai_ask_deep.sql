-- nf_ai_ask_deep — "深度解讀" second-pass analyst for VP-level users.
--
-- Step 2 of the two-step orchestrator:
--   Step 1  : nf_ai_ask(question)       → SUMMARY + INSIGHT (one-glance)
--   Step 2  : nf_ai_ask_deep(...)       → TREND + OBSERVATIONS +
--                                         RECOMMENDATIONS + RISKS (deep dive)
--
-- Design decisions (locked in with product owner):
--   * Does NOT re-fetch the RPC. Caller passes back the exact `data` jsonb
--     they already saw so the deep analysis is anchored to the SAME rows on
--     screen — no "wait, the numbers changed" confusion.
--   * PII-masked via nf_mask_pii before leaving the DB.
--   * Uses the same Gemma 4 31B model as Call 2 (15 RPM / 1.5K RPD free).
--   * 60s HTTP timeout — exec users said "delay ≤30s is fine".
--   * Permissive prompt ("free-form within a four-section skeleton") —
--     we trust the modern model, regex only enforces format.
--   * Returns structured jsonb with four nullable string fields so the
--     frontend Card can render each section with its own header/icon.
--   * Plain-text fallback when parsing fails: return the raw text in
--     `trend` so the user at least sees *something*.
--
-- Frontend contract:
--   SELECT public.nf_ai_ask_deep(
--            p_question  := '最近 30 天營收走勢',
--            p_rpc_name  := 'nf_revenue_trend',
--            p_data      := <jsonb array returned by Call 1>
--          );
--
-- Returns:
--   {
--     trend           : text | null,
--     observations    : text | null,
--     recommendations : text | null,
--     risks           : text | null,
--     model_used      : 'gemma-4-31b-it',
--     error           : text | null        -- only on failure
--   }

CREATE OR REPLACE FUNCTION public.nf_ai_ask_deep(
  p_question text,
  p_rpc_name text,
  p_data     jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_api_key      text;
  v_model        text := 'gemma-4-31b-it';
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
BEGIN
  -- ── Input guards ─────────────────────────────────────────────
  IF p_question IS NULL OR trim(p_question) = '' THEN
    RETURN jsonb_build_object(
      'error', 'missing_question',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL
    );
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'array'
     OR jsonb_array_length(p_data) = 0 THEN
    RETURN jsonb_build_object(
      'error', 'empty_data',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL
    );
  END IF;

  -- ── Ensure request.jwt.claim.sub is set (mirrors nf_ai_ask) ──
  BEGIN
    v_existing_sub := current_setting('request.jwt.claim.sub', true);
  EXCEPTION WHEN OTHERS THEN
    v_existing_sub := NULL;
  END;
  IF v_existing_sub IS NULL OR v_existing_sub = '' THEN
    PERFORM set_config('request.jwt.claim.sub',
                       '00000000-0000-0000-0000-000000000000', true);
  END IF;

  -- ── Load Gemma API key from Vault ────────────────────────────
  SELECT decrypted_secret INTO v_api_key
  FROM vault.decrypted_secrets
  WHERE name = 'google_ai_api_key'
  LIMIT 1;

  IF v_api_key IS NULL OR v_api_key = '' THEN
    RETURN jsonb_build_object(
      'error', 'missing_api_key',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL
    );
  END IF;

  -- ── HTTP timeout: deep analysis is allowed up to 60s ─────────
  BEGIN
    PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '60000');
  EXCEPTION WHEN OTHERS THEN
    -- Extension may not support curlopt; carry on with default timeout.
    NULL;
  END;

  v_endpoint := format(
    'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
    v_model, v_api_key
  );

  -- ── PII mask the payload before it leaves the DB ─────────────
  v_masked := public.nf_mask_pii(p_data);
  v_row_count := jsonb_array_length(v_masked);

  -- Hard cap on rows shipped to the LLM so we don't blow context.
  -- Deep analysis still works on ~50 rows; beyond that the summary
  -- already captured the pattern and the model can infer from a
  -- representative slice.
  IF v_row_count > 50 THEN
    SELECT jsonb_agg(elem)
      INTO v_masked
      FROM (
        SELECT elem
        FROM jsonb_array_elements(v_masked) WITH ORDINALITY AS t(elem, ord)
        WHERE ord <= 50
      ) s;
  END IF;

  v_data_blob := v_masked::text;

  -- ── Build the deep-analysis prompt ───────────────────────────
  -- Four-section skeleton. Permissive about content, strict about
  -- the four labels so we can split reliably.
  v_prompt := format(
E'你是 Nexus Finance 的資深資料分析師，正在為執行副總級使用者撰寫深度解讀。\n' ||
E'使用者原本的問題：%s\n' ||
E'資料來源 RPC：%s\n' ||
E'資料（JSON，共 %s 筆；已做 PII 遮罩）：\n%s\n\n' ||
E'請用繁體中文輸出以下四個段落，格式嚴格如下（段落名稱必須完全一致，不可翻譯）：\n\n' ||
E'TREND:\n<一段話描述整體趨勢，可引用具體數字、百分比或時間點，約 80-120 字>\n\n' ||
E'OBSERVATIONS:\n- <觀察一，可比較高低點、異常值或季節性模式>\n- <觀察二>\n- <觀察三（可選）>\n\n' ||
E'RECOMMENDATIONS:\n- <對執行副總的具體建議一，聚焦可行動的決策>\n- <建議二>\n- <建議三（可選）>\n\n' ||
E'RISKS:\n- <潛在風險或需要留意的訊號一>\n- <風險二（可選）>\n\n' ||
E'規則：\n' ||
E'1. 使用繁體中文與台灣商業慣用語。\n' ||
E'2. 四個段落標題（TREND / OBSERVATIONS / RECOMMENDATIONS / RISKS）必須保留英文原樣並以冒號結尾。\n' ||
E'3. 不要加入英文翻譯或解釋。\n' ||
E'4. 不要使用 Markdown 粗體或標題符號（# *），只用條列符號「-」。\n' ||
E'5. 若資料平淡或無明顯風險，可寫「目前尚無顯著風險」而非留空。\n',
    p_question,
    p_rpc_name,
    v_row_count,
    v_data_blob
  );

  -- ── Call Gemma 4 31B ─────────────────────────────────────────
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
      'temperature', 0.4,
      'maxOutputTokens', 1200
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
      'model_used', v_model
    );
  END;

  IF v_resp.status <> 200 THEN
    RETURN jsonb_build_object(
      'error', format('http_status_%s', v_resp.status),
      'message', left(v_resp.content, 500),
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model
    );
  END IF;

  BEGIN
    v_json := v_resp.content::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'invalid_json',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model
    );
  END;

  v_raw_text := v_json #>> '{candidates,0,content,parts,0,text}';

  IF v_raw_text IS NULL OR trim(v_raw_text) = '' THEN
    RETURN jsonb_build_object(
      'error', 'empty_response',
      'trend', NULL, 'observations', NULL,
      'recommendations', NULL, 'risks', NULL,
      'model_used', v_model
    );
  END IF;

  -- ── Parse the four sections line by line ─────────────────────
  -- State machine: current section tracks which bucket to append.
  v_section := NULL;
  FOREACH v_line IN ARRAY string_to_array(v_raw_text, E'\n')
  LOOP
    -- Detect section header. Accepts "TREND:", "TREND：" etc.
    IF v_line ~* '^\s*TREND\s*[:：]' THEN
      -- Flush previous buffer into its section before switching.
      IF v_section = 'trend'           THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations' THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs := trim(v_buf);
      ELSIF v_section = 'risks'        THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'trend';
      v_buf := trim(regexp_replace(v_line, '^\s*TREND\s*[:：]\s*', '', 'i'));
      CONTINUE;
    ELSIF v_line ~* '^\s*OBSERVATIONS?\s*[:：]' THEN
      IF v_section = 'trend'           THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations' THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs := trim(v_buf);
      ELSIF v_section = 'risks'        THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'observations';
      v_buf := trim(regexp_replace(v_line, '^\s*OBSERVATIONS?\s*[:：]\s*', '', 'i'));
      CONTINUE;
    ELSIF v_line ~* '^\s*RECOMMENDATIONS?\s*[:：]' THEN
      IF v_section = 'trend'           THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations' THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs := trim(v_buf);
      ELSIF v_section = 'risks'        THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'recommendations';
      v_buf := trim(regexp_replace(v_line, '^\s*RECOMMENDATIONS?\s*[:：]\s*', '', 'i'));
      CONTINUE;
    ELSIF v_line ~* '^\s*RISKS?\s*[:：]' THEN
      IF v_section = 'trend'           THEN v_trend := trim(v_buf);
      ELSIF v_section = 'observations' THEN v_obs   := trim(v_buf);
      ELSIF v_section = 'recommendations' THEN v_recs := trim(v_buf);
      ELSIF v_section = 'risks'        THEN v_risks := trim(v_buf);
      END IF;
      v_section := 'risks';
      v_buf := trim(regexp_replace(v_line, '^\s*RISKS?\s*[:：]\s*', '', 'i'));
      CONTINUE;
    END IF;

    -- Accumulate content inside the current section.
    IF v_section IS NOT NULL THEN
      IF v_buf = '' THEN
        v_buf := v_line;
      ELSE
        v_buf := v_buf || E'\n' || v_line;
      END IF;
    END IF;
  END LOOP;

  -- Flush the final section.
  IF v_section = 'trend'              THEN v_trend := trim(v_buf);
  ELSIF v_section = 'observations'    THEN v_obs   := trim(v_buf);
  ELSIF v_section = 'recommendations' THEN v_recs  := trim(v_buf);
  ELSIF v_section = 'risks'           THEN v_risks := trim(v_buf);
  END IF;

  -- ── Fallback: parsing failed → stuff the raw text into trend ─
  IF v_trend IS NULL AND v_obs IS NULL
     AND v_recs IS NULL AND v_risks IS NULL THEN
    v_trend := trim(v_raw_text);
    IF char_length(v_trend) > 1500 THEN
      v_trend := LEFT(v_trend, 1500) || '…';
    END IF;
  END IF;

  -- Empty-string → NULL so the frontend can cleanly skip sections.
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
    'error',           NULL
  );
END;
$$;

-- Expose to authenticated users only. PII-masked data still leaves the DB,
-- so we don't want anon hitting this.
REVOKE ALL ON FUNCTION public.nf_ai_ask_deep(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nf_ai_ask_deep(text, text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.nf_ai_ask_deep(text, text, jsonb) IS
  'Deep analysis second-pass using Gemma 4 31B. Caller passes back the '
  'same data rows they saw from nf_ai_ask so the analysis is anchored to '
  'the exact snapshot on screen (no re-fetch). Returns four sections: '
  'trend / observations / recommendations / risks.';
