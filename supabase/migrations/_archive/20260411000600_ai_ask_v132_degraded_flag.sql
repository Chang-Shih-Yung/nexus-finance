-- nf_ai_ask v13.2 — surface a `degraded` flag so the frontend can warn
-- the user when the model output took a fallback path.
--
-- Why: v13.0 silently used server-side templates when Call 2 failed
-- (HTTP timeout / JSON parse / unparseable format). Execs saw a bland
-- "共查得 N 筆資料" and couldn't tell it was a canned string vs a real
-- AI narration. Now we flag it explicitly.
--
-- Changes from v13.1 (rank-fix):
--   * Adds `degraded: boolean` and `degrade_reason: text | null`.
--   * degraded = true when Call 2 output was unusable and we fell back
--     to the template narration. Also true when chart was expected
--     (catalog render_hint = chart/both) but derivation failed and we
--     silently dropped to 'table'.
--   * `degrade_reason` is an enum-like short string intended as the
--     i18n key / tooltip body:
--       call2_http_failed    - Gemma connect/timeout
--       call2_status_<code>  - non-200 from Google AI
--       call2_json_failed    - response body wasn't JSON
--       call2_parse_failed   - SUMMARY/INSIGHT labels absent
--       chart_derivation_failed - catalog said chart but no usable fields
--     The frontend maps these to zh-TW strings in its tooltip.
--
-- No change to parsing, chart derivation, prompt, or template text.

CREATE OR REPLACE FUNCTION public.nf_ai_ask(p_question text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_api_key          text;
  v_model_call1      text := 'gemma-4-26b-a4b-it';
  v_model_call2      text := 'gemma-4-31b-it';
  v_endpoint_call1   text;
  v_endpoint_call2   text;
  v_tools            jsonb;
  v_decls            jsonb;
  v_sys              text;
  v_call1_body       jsonb;
  v_call1_resp       extensions.http_response;
  v_call1_json       jsonb;
  v_parts            jsonb;
  v_part             jsonb;
  v_fn_call          jsonb;
  v_rpc_name         text;
  v_rpc_args         jsonb;
  v_catalog_row      public.ai_function_catalog%ROWTYPE;
  v_arg_parts        text[];
  v_key              text;
  v_val              jsonb;
  v_val_type         text;
  v_sql              text;
  v_rpc_result       jsonb;
  v_data_blob        text;
  v_call2_prompt     text;
  v_call2_body       jsonb;
  v_call2_resp       extensions.http_response;
  v_call2_json       jsonb;
  v_answer           text;
  v_insight          text;
  v_raw_text         text;
  v_line             text;
  v_existing_sub     text;
  v_err_cat          text;
  v_err_code         text;
  v_err_reason       text;
  v_used_template    boolean := false;
  v_call2_debug      text;
  -- chart derivation
  v_chart            jsonb := NULL;
  v_first_row        jsonb;
  v_row_key          text;
  v_row_val          jsonb;
  v_number_fields    text[] := ARRAY[]::text[];
  v_date_fields      text[] := ARRAY[]::text[];
  v_text_fields      text[] := ARRAY[]::text[];
  v_hint             text;
  v_chart_type       text;
  v_x_field          text;
  v_y_field          text;
  v_catalog_hint     text;
  -- render resolution
  v_render           text;
  v_row_count        int;
  -- template fallback helpers
  v_first_num        numeric;
  v_last_num         numeric;
  v_delta_pct        numeric;
  -- v13.2 degraded flag
  v_degraded         boolean := false;
  v_degrade_reason   text;
BEGIN
  PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '60000');

  BEGIN
    v_existing_sub := current_setting('request.jwt.claim.sub', true);
  EXCEPTION WHEN others THEN
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
      'answer',
        E'⚙️ AI 助手尚未設定。\n'
        || '請在 Supabase Vault 新增名為 google_ai_api_key 的密鑰'
        || '（從 https://aistudio.google.com 取得，免費）。',
      'insight', NULL,
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'render', 'text',
      'follow_ups', '[]'::jsonb,
      'degraded', true, 'degrade_reason', 'missing_api_key',
      'error_category', 'config',
      'error_code', 'missing_api_key'
    );
  END IF;

  v_endpoint_call1 := format(
    'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
    v_model_call1, v_api_key
  );
  v_endpoint_call2 := format(
    'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
    v_model_call2, v_api_key
  );

  SELECT jsonb_agg(
    jsonb_build_object(
      'name', c.name,
      'description',
        c.description_zh
        || CASE WHEN jsonb_array_length(c.example_questions) > 0
                THEN ' 範例：' || (
                  SELECT string_agg(elem #>> '{}', '; ')
                  FROM jsonb_array_elements(c.example_questions) elem
                )
                ELSE ''
           END,
      'parameters', jsonb_build_object(
        'type', 'object',
        'properties', '{}'::jsonb,
        'description', COALESCE(c.signature_hint, '')
      )
    )
  )
  INTO v_decls
  FROM public.ai_function_catalog c
  WHERE c.enabled = true;

  IF v_decls IS NULL OR jsonb_array_length(v_decls) = 0 THEN
    RETURN jsonb_build_object(
      'answer', '⚠️ AI 工具目錄為空，請先執行 nf_ai_catalog_sync()。',
      'insight', NULL,
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'render', 'text',
      'follow_ups', '[]'::jsonb,
      'degraded', true, 'degrade_reason', 'empty_catalog',
      'error_category', 'schema_drift',
      'error_code', 'empty_catalog'
    );
  END IF;

  v_tools := jsonb_build_array(
    jsonb_build_object('functionDeclarations', v_decls)
  );

  v_sys :=
    '你是 Nexus Finance 的資料助手。根據使用者的 zh-TW 問題，' ||
    '從提供的工具（functions）中選出最合適的一個並呼叫。' ||
    '若問題與任何工具都無關，直接用 zh-TW 回覆說明無可用資料來源。' ||
    '參數型態：整數欄位傳 number，文字欄位傳 string。' ||
    '今日日期：' || to_char(now() AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD') || '。';

  v_call1_body := jsonb_build_object(
    'system_instruction', jsonb_build_object(
      'parts', jsonb_build_array(jsonb_build_object('text', v_sys))
    ),
    'contents', jsonb_build_array(
      jsonb_build_object(
        'role', 'user',
        'parts', jsonb_build_array(jsonb_build_object('text', p_question))
      )
    ),
    'tools', v_tools,
    'toolConfig', jsonb_build_object(
      'functionCallingConfig', jsonb_build_object('mode', 'AUTO')
    ),
    'generationConfig', jsonb_build_object(
      'temperature', 0.1,
      'maxOutputTokens', 512
    )
  );

  BEGIN
    SELECT * INTO v_call1_resp
    FROM extensions.http((
      'POST',
      v_endpoint_call1,
      ARRAY[]::extensions.http_header[],
      'application/json',
      v_call1_body::text
    )::extensions.http_request);
  EXCEPTION WHEN others THEN
    v_err_cat := 'dispatch_error';
    v_err_code := 'call1_http';
    v_err_reason := SQLERRM;
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model)
    VALUES (p_question, v_err_cat, v_err_code, v_err_reason, v_model_call1);
    RETURN jsonb_build_object(
      'answer', '⚠️ AI 服務暫時無法連線，請稍後再試。',
      'insight', NULL,
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'render', 'text',
      'follow_ups', '[]'::jsonb,
      'degraded', true, 'degrade_reason', 'call1_http_failed',
      'error_category', v_err_cat, 'error_code', v_err_code
    );
  END;

  IF v_call1_resp.status <> 200 THEN
    v_err_cat := CASE WHEN v_call1_resp.status = 429 THEN 'quota' ELSE 'dispatch_error' END;
    v_err_code := 'call1_status_' || v_call1_resp.status::text;
    v_err_reason := LEFT(COALESCE(v_call1_resp.content::text, ''), 400);
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model)
    VALUES (p_question, v_err_cat, v_err_code, v_err_reason, v_model_call1);
    RETURN jsonb_build_object(
      'answer',
        CASE WHEN v_err_cat = 'quota'
             THEN '⏳ AI 配額暫時用完，請稍後再試。'
             ELSE '⚠️ AI 服務回應異常，請稍後再試。'
        END,
      'insight', NULL,
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'render', 'text',
      'follow_ups', '[]'::jsonb,
      'degraded', true, 'degrade_reason', v_err_code,
      'error_category', v_err_cat, 'error_code', v_err_code
    );
  END IF;

  BEGIN
    v_call1_json := v_call1_resp.content::jsonb;
  EXCEPTION WHEN others THEN
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model)
    VALUES (p_question, 'llm_format', 'call1_not_json',
            LEFT(COALESCE(v_call1_resp.content::text, ''), 400), v_model_call1);
    RETURN jsonb_build_object(
      'answer', '⚠️ AI 回應格式不符，請換個說法再試一次。',
      'insight', NULL,
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'render', 'text',
      'follow_ups', '[]'::jsonb,
      'degraded', true, 'degrade_reason', 'call1_not_json',
      'error_category', 'llm_format', 'error_code', 'call1_not_json'
    );
  END;

  v_parts := v_call1_json #> '{candidates,0,content,parts}';
  v_fn_call := NULL;

  IF v_parts IS NOT NULL AND jsonb_typeof(v_parts) = 'array' THEN
    FOR v_part IN SELECT * FROM jsonb_array_elements(v_parts) LOOP
      IF v_part ? 'functionCall' THEN
        v_fn_call := v_part->'functionCall';
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF v_fn_call IS NULL THEN
    v_answer := v_call1_json #>> '{candidates,0,content,parts,0,text}';
    IF v_answer IS NULL OR v_answer = '' THEN
      v_answer := '這個問題目前沒有對應的資料來源，請換個說法試試。';
    END IF;
    RETURN jsonb_build_object(
      'answer', v_answer,
      'insight', NULL,
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'render', 'text',
      'follow_ups', '[]'::jsonb,
      'degraded', false, 'degrade_reason', NULL,
      'model_used', v_model_call1
    );
  END IF;

  v_rpc_name := v_fn_call->>'name';
  v_rpc_args := COALESCE(v_fn_call->'args', '{}'::jsonb);

  SELECT * INTO v_catalog_row
  FROM public.ai_function_catalog
  WHERE name = v_rpc_name AND enabled = true;

  IF NOT FOUND THEN
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model,
       rpc_attempted, params_attempted)
    VALUES (p_question, 'schema_drift', 'rpc_not_in_catalog',
            'Gemma picked ' || v_rpc_name || ' but it is not enabled in catalog',
            v_model_call1, v_rpc_name, v_rpc_args);
    RETURN jsonb_build_object(
      'answer',
        format('⚠️ 模型選擇了不存在或已停用的函式「%s」，請換個說法再試一次。', v_rpc_name),
      'insight', NULL,
      'rpc_called', NULL, 'params', v_rpc_args, 'data', NULL, 'chart', NULL,
      'render', 'text',
      'follow_ups', '[]'::jsonb,
      'degraded', true, 'degrade_reason', 'rpc_not_in_catalog',
      'error_category', 'schema_drift', 'error_code', 'rpc_not_in_catalog'
    );
  END IF;

  v_arg_parts := ARRAY[]::text[];
  FOR v_key, v_val IN SELECT * FROM jsonb_each(v_rpc_args) LOOP
    v_val_type := jsonb_typeof(v_val);
    IF v_val_type = 'number' OR v_val_type = 'boolean' THEN
      v_arg_parts := array_append(v_arg_parts,
        format('%I => %s', v_key, v_val #>> '{}'));
    ELSIF v_val_type = 'null' THEN
      v_arg_parts := array_append(v_arg_parts, format('%I => NULL', v_key));
    ELSE
      v_arg_parts := array_append(v_arg_parts,
        format('%I => %L', v_key, v_val #>> '{}'));
    END IF;
  END LOOP;

  IF array_length(v_arg_parts, 1) IS NULL THEN
    v_sql := format('SELECT to_jsonb(array_agg(row_to_json(t))) FROM %I() t', v_rpc_name);
  ELSE
    v_sql := format(
      'SELECT to_jsonb(array_agg(row_to_json(t))) FROM %I(%s) t',
      v_rpc_name, array_to_string(v_arg_parts, ', ')
    );
  END IF;

  BEGIN
    EXECUTE v_sql INTO v_rpc_result;
  EXCEPTION WHEN others THEN
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model,
       rpc_attempted, params_attempted)
    VALUES (p_question, 'dispatch_error', 'rpc_exec_failed', SQLERRM, v_model_call1,
            v_rpc_name, v_rpc_args);
    RETURN jsonb_build_object(
      'answer', format('⚠️ 執行「%s」時發生錯誤，請稍後再試。', v_rpc_name),
      'insight', NULL,
      'rpc_called', v_rpc_name, 'params', v_rpc_args,
      'data', NULL, 'chart', NULL, 'render', 'text', 'follow_ups', '[]'::jsonb,
      'degraded', true, 'degrade_reason', 'rpc_exec_failed',
      'error_category', 'dispatch_error', 'error_code', 'rpc_exec_failed'
    );
  END;

  IF v_rpc_result IS NULL THEN v_rpc_result := '[]'::jsonb; END IF;
  v_rpc_result := public.nf_mask_pii(v_rpc_result);

  IF jsonb_typeof(v_rpc_result) = 'array'
     AND jsonb_array_length(v_rpc_result) = 0 THEN
    RETURN jsonb_build_object(
      'answer',
        format('目前「%s」沒有可顯示的資料，建議換個時間範圍或指標再試試。', p_question),
      'insight', NULL,
      'rpc_called', v_rpc_name, 'params', v_rpc_args,
      'data', '[]'::jsonb, 'chart', NULL, 'render', 'text', 'follow_ups', '[]'::jsonb,
      'degraded', false, 'degrade_reason', NULL,
      'error_category', 'empty_data', 'error_code', 'no_rows',
      'model_used', v_model_call1
    );
  END IF;

  -- ── Derive chart ──
  v_hint := COALESCE(v_catalog_row.chart_hint, 'auto');
  v_catalog_hint := v_hint;  -- remember the original catalog ask

  IF v_hint <> 'none'
     AND v_catalog_row.returns_shape <> 'single_row'
     AND jsonb_typeof(v_rpc_result) = 'array'
     AND jsonb_array_length(v_rpc_result) >= 2 THEN

    v_first_row := v_rpc_result->0;
    v_number_fields := ARRAY[]::text[];
    v_date_fields   := ARRAY[]::text[];
    v_text_fields   := ARRAY[]::text[];

    FOR v_row_key, v_row_val IN SELECT * FROM jsonb_each(v_first_row) LOOP
      IF jsonb_typeof(v_row_val) = 'number' THEN
        v_number_fields := array_append(v_number_fields, v_row_key);
      ELSIF jsonb_typeof(v_row_val) = 'string' THEN
        IF (v_row_val #>> '{}') ~ '^\d{4}-\d{2}-\d{2}' THEN
          v_date_fields := array_append(v_date_fields, v_row_key);
        ELSE
          v_text_fields := array_append(v_text_fields, v_row_key);
        END IF;
      END IF;
    END LOOP;

    -- v13.1: deprioritize rank-like numeric columns.
    IF array_length(v_number_fields, 1) > 1 THEN
      SELECT array_agg(f ORDER BY pref, ord)
        INTO v_number_fields
        FROM (
          SELECT f,
                 ord,
                 CASE WHEN f ~* '^(rank|rk|排名|id|seq|sequence|order|ord|index|idx|no|num)$'
                      THEN 1 ELSE 0
                 END AS pref
          FROM unnest(v_number_fields) WITH ORDINALITY AS t(f, ord)
        ) s;
    END IF;

    IF v_hint = 'auto' THEN
      IF array_length(v_date_fields, 1) >= 1 AND array_length(v_number_fields, 1) >= 1 THEN
        v_hint := 'line';
      ELSIF array_length(v_text_fields, 1) >= 1 AND array_length(v_number_fields, 1) >= 1 THEN
        v_hint := 'bar';
      ELSE
        v_hint := 'none';
      END IF;
    END IF;

    v_chart_type := NULL;
    v_x_field := NULL;
    v_y_field := NULL;

    IF v_hint = 'line'
       AND array_length(v_date_fields, 1) >= 1
       AND array_length(v_number_fields, 1) >= 1 THEN
      v_chart_type := 'line';
      v_x_field := v_date_fields[1];
      v_y_field := v_number_fields[1];
    ELSIF v_hint IN ('bar', 'pie')
          AND array_length(v_text_fields, 1) >= 1
          AND array_length(v_number_fields, 1) >= 1 THEN
      v_chart_type := v_hint;
      v_x_field := v_text_fields[1];
      v_y_field := v_number_fields[1];
    END IF;

    IF v_chart_type IS NOT NULL THEN
      v_chart := jsonb_build_object(
        'type',    v_chart_type,
        'x_field', v_x_field,
        'y_field', v_y_field
      );
    END IF;
  END IF;

  -- ── Resolve render hint ──
  v_render := COALESCE(v_catalog_row.render_hint, 'auto');
  v_row_count := CASE
    WHEN jsonb_typeof(v_rpc_result) = 'array'
      THEN jsonb_array_length(v_rpc_result)
    ELSE 1
  END;

  IF v_render = 'auto' THEN
    IF v_catalog_row.returns_shape = 'single_row'
       OR jsonb_typeof(v_rpc_result) <> 'array'
       OR v_row_count <= 1 THEN
      v_render := 'text';
    ELSIF v_chart IS NOT NULL AND v_row_count <= 12 THEN
      v_render := 'both';
    ELSIF v_chart IS NOT NULL THEN
      v_render := 'chart';
    ELSE
      v_render := 'table';
    END IF;
  END IF;

  -- Safety degrade: catalog explicitly asked for a chart but we couldn't
  -- derive one. Surface this to the user so they know why they're
  -- seeing a table instead of the bar chart they expected.
  IF v_render IN ('chart', 'both') AND v_chart IS NULL THEN
    v_render := 'table';
    v_degraded := true;
    v_degrade_reason := 'chart_derivation_failed';
  END IF;

  -- Also flag if the catalog asked for a chart but it silently resolved
  -- to 'table' via the 'auto' branch above (no chart fields present).
  IF v_catalog_hint IN ('line', 'bar', 'pie') AND v_chart IS NULL
     AND v_degraded = false THEN
    v_degraded := true;
    v_degrade_reason := 'chart_derivation_failed';
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- Call 2 — Gemma 4 31B narration with SUMMARY/INSIGHT format
  -- ══════════════════════════════════════════════════════════════════
  v_data_blob := LEFT(v_rpc_result::text, 4000);

  v_call2_prompt := format(
    E'你是 Nexus Finance 的資料分析助手。根據下方查詢結果，給執行副總看一份簡短的觀察。\n\n' ||
    E'使用者問題：%s\n\n' ||
    E'資料（JSON）：%s\n\n' ||
    E'請用繁體中文輸出兩行，格式嚴格如下：\n' ||
    E'SUMMARY: <一句結論，最多 60 字，可引用具體數字或百分比>\n' ||
    E'INSIGHT: <一句延伸觀察或對比，最多 80 字；若資料平淡可寫「無特別異常」>\n\n' ||
    E'只輸出這兩行。不要加英文翻譯、不要解釋、不要加引號。',
    p_question, v_data_blob
  );

  v_call2_body := jsonb_build_object(
    'contents', jsonb_build_array(
      jsonb_build_object(
        'role', 'user',
        'parts', jsonb_build_array(jsonb_build_object('text', v_call2_prompt))
      )
    ),
    'generationConfig', jsonb_build_object(
      'temperature', 0.3,
      'maxOutputTokens', 300
    )
  );

  v_raw_text := NULL;
  v_call2_debug := NULL;

  BEGIN
    SELECT * INTO v_call2_resp
    FROM extensions.http((
      'POST',
      v_endpoint_call2,
      ARRAY[]::extensions.http_header[],
      'application/json',
      v_call2_body::text
    )::extensions.http_request);

    IF v_call2_resp.status = 200 THEN
      BEGIN
        v_call2_json := v_call2_resp.content::jsonb;
        v_raw_text := v_call2_json #>> '{candidates,0,content,parts,0,text}';
      EXCEPTION WHEN others THEN
        v_raw_text := NULL;
        v_call2_debug := 'call2_json_failed';
      END;
    ELSE
      v_call2_debug := format('call2_status_%s', v_call2_resp.status);
    END IF;
  EXCEPTION WHEN others THEN
    v_raw_text := NULL;
    v_call2_debug := 'call2_http_failed';
  END;

  v_answer  := NULL;
  v_insight := NULL;

  IF v_raw_text IS NOT NULL AND v_raw_text <> '' THEN
    FOREACH v_line IN ARRAY string_to_array(v_raw_text, E'\n') LOOP
      v_line := trim(v_line);
      IF v_line = '' THEN CONTINUE; END IF;

      IF v_answer IS NULL AND v_line ~* '^SUMMARY\s*[:：]' THEN
        v_answer := trim(regexp_replace(v_line, '^SUMMARY\s*[:：]\s*', '', 'i'));
      ELSIF v_insight IS NULL AND v_line ~* '^INSIGHT\s*[:：]' THEN
        v_insight := trim(regexp_replace(v_line, '^INSIGHT\s*[:：]\s*', '', 'i'));
      END IF;

      EXIT WHEN v_answer IS NOT NULL AND v_insight IS NOT NULL;
    END LOOP;

    IF v_answer IS NOT NULL THEN
      v_answer := regexp_replace(v_answer, '^["''「『<\(（]+', '');
      v_answer := regexp_replace(v_answer, '["''」』>\)）]+$', '');
      v_answer := trim(v_answer);
      IF char_length(v_answer) > 60 THEN
        v_answer := LEFT(v_answer, 60);
      END IF;
      v_answer := NULLIF(v_answer, '');
    END IF;

    IF v_insight IS NOT NULL THEN
      v_insight := regexp_replace(v_insight, '^["''「『<\(（]+', '');
      v_insight := regexp_replace(v_insight, '["''」』>\)）]+$', '');
      v_insight := trim(v_insight);
      IF char_length(v_insight) > 80 THEN
        v_insight := LEFT(v_insight, 80);
      END IF;
      v_insight := NULLIF(v_insight, '');
    END IF;
  END IF;

  -- ── Template fallback when Gemma output was unusable ──
  IF v_answer IS NULL THEN
    v_used_template := true;
    v_degraded := true;
    -- Prefer the specific HTTP/JSON reason if we captured one;
    -- otherwise the parser must have failed on a 200 response.
    v_degrade_reason := COALESCE(v_call2_debug, 'call2_parse_failed');

    IF v_chart IS NOT NULL AND v_chart->>'type' = 'line'
       AND jsonb_typeof(v_rpc_result) = 'array'
       AND v_row_count >= 2 THEN
      BEGIN
        v_first_num := (v_rpc_result->0->>(v_chart->>'y_field'))::numeric;
        v_last_num  := (v_rpc_result->(v_row_count - 1)->>(v_chart->>'y_field'))::numeric;
      EXCEPTION WHEN others THEN
        v_first_num := NULL;
        v_last_num := NULL;
      END;

      IF v_first_num IS NOT NULL AND v_first_num <> 0 AND v_last_num IS NOT NULL THEN
        v_delta_pct := ((v_last_num - v_first_num) / v_first_num) * 100;
        v_answer := CASE
          WHEN v_delta_pct >  2 THEN format('%s整體呈上升趨勢。', p_question)
          WHEN v_delta_pct < -2 THEN format('%s整體呈下降趨勢。', p_question)
          ELSE format('%s大致持平。', p_question)
        END;
      ELSE
        v_answer := format('以下為%s的走勢資料。', p_question);
      END IF;

    ELSIF v_render = 'table' THEN
      v_answer := format('共查得 %s 筆資料，詳見下方列表。', v_row_count);
    ELSIF v_render = 'text' THEN
      v_answer := format('以下是%s的最新數據。', p_question);
    ELSE
      v_answer := format('以下為%s的結果，詳見下方圖表。', p_question);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'answer',         v_answer,
    'insight',        v_insight,
    'rpc_called',     v_rpc_name,
    'params',         v_rpc_args,
    'data',           v_rpc_result,
    'chart',          v_chart,
    'render',         v_render,
    'follow_ups',     '[]'::jsonb,
    'degraded',       v_degraded,
    'degrade_reason', v_degrade_reason,
    'model_used',     v_model_call2,
    'debug_reason',
      CASE
        WHEN v_used_template AND v_call2_debug IS NOT NULL
          THEN 'template fallback — ' || v_call2_debug
        WHEN v_used_template
          THEN 'template fallback — call2 output unparseable'
        ELSE NULL
      END
  );
END;
$$;
