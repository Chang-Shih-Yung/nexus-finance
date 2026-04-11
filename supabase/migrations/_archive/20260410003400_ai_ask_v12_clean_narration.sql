-- nf_ai_ask v12.2 — clean up Call 2 narration.
--
-- Problem observed: Gemma 4 was leaking its chain-of-thought to the
-- frontend. A single question produced a bubble containing:
--   * Input: functionResponse containing...
--   * Task: Describe the result...
--   * Constraint 1/2/3: ...
--   * change_pct: -6.9
--   * Draft 1 (Too detailed): ...
-- i.e. the entire reasoning trace plus raw data dump. Non-technical
-- executives should never see this.
--
-- Root cause:
--   (a) Call 2 used multi-turn functionResponse format, which prompted
--       Gemma to treat the task as "analyze step by step".
--   (b) Call 2 system prompt was written as a rules list, which the
--       model echoed back instead of following silently.
--
-- Fix:
--   * Call 2 → single-turn plain text prompt. No system_instruction,
--     no multi-turn, no functionResponse.
--   * Prompt says exactly what to output, in imperative voice.
--   * maxOutputTokens dropped to 120.
--   * Post-process v_answer server-side: drop bullet lines, English
--     meta lines, keep only lines containing Chinese characters.

CREATE OR REPLACE FUNCTION public.nf_ai_ask(p_question text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_api_key          text;
  v_model            text := 'gemma-4-26b-a4b-it';
  v_endpoint         text;
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
  v_line             text;
  v_clean            text;
  v_existing_sub     text;
  v_err_cat          text;
  v_err_code         text;
  v_err_reason       text;
BEGIN
  -- Give Gemma 30s to respond (default is 5s, cold starts exceed it).
  PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '30000');

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
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'follow_ups', '[]'::jsonb,
      'error_category', 'config',
      'error_code', 'missing_api_key'
    );
  END IF;

  v_endpoint := format(
    'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
    v_model, v_api_key
  );

  -- Build tool declarations from the catalog.
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
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'follow_ups', '[]'::jsonb,
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

  -- Call 1 — tool selection.
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
      v_endpoint,
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
    VALUES (p_question, v_err_cat, v_err_code, v_err_reason, v_model);
    RETURN jsonb_build_object(
      'answer', '⚠️ AI 服務暫時無法連線，請稍後再試。',
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'follow_ups', '[]'::jsonb,
      'error_category', v_err_cat, 'error_code', v_err_code
    );
  END;

  IF v_call1_resp.status <> 200 THEN
    v_err_cat := CASE WHEN v_call1_resp.status = 429 THEN 'quota' ELSE 'dispatch_error' END;
    v_err_code := 'call1_status_' || v_call1_resp.status::text;
    v_err_reason := LEFT(COALESCE(v_call1_resp.content::text, ''), 400);
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model)
    VALUES (p_question, v_err_cat, v_err_code, v_err_reason, v_model);
    RETURN jsonb_build_object(
      'answer',
        CASE WHEN v_err_cat = 'quota'
             THEN '⏳ AI 配額暫時用完，請稍後再試。'
             ELSE '⚠️ AI 服務回應異常，請稍後再試。'
        END,
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'follow_ups', '[]'::jsonb,
      'error_category', v_err_cat, 'error_code', v_err_code
    );
  END IF;

  BEGIN
    v_call1_json := v_call1_resp.content::jsonb;
  EXCEPTION WHEN others THEN
    INSERT INTO public.ai_ask_errors
      (question, error_category, error_code, debug_reason, model)
    VALUES (p_question, 'llm_format', 'call1_not_json',
            LEFT(COALESCE(v_call1_resp.content::text, ''), 400), v_model);
    RETURN jsonb_build_object(
      'answer', '⚠️ AI 回應格式不符，請換個說法再試一次。',
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'follow_ups', '[]'::jsonb,
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
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'follow_ups', '[]'::jsonb,
      'model_used', v_model
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
            v_model, v_rpc_name, v_rpc_args);
    RETURN jsonb_build_object(
      'answer',
        format('⚠️ 模型選擇了不存在或已停用的函式「%s」，請換個說法再試一次。', v_rpc_name),
      'rpc_called', NULL, 'params', v_rpc_args, 'data', NULL, 'chart', NULL,
      'follow_ups', '[]'::jsonb,
      'error_category', 'schema_drift', 'error_code', 'rpc_not_in_catalog'
    );
  END IF;

  -- Type-aware argument builder.
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
    VALUES (p_question, 'dispatch_error', 'rpc_exec_failed', SQLERRM, v_model,
            v_rpc_name, v_rpc_args);
    RETURN jsonb_build_object(
      'answer', format('⚠️ 執行「%s」時發生錯誤，請稍後再試。', v_rpc_name),
      'rpc_called', v_rpc_name, 'params', v_rpc_args,
      'data', NULL, 'chart', NULL, 'follow_ups', '[]'::jsonb,
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
      'rpc_called', v_rpc_name, 'params', v_rpc_args,
      'data', '[]'::jsonb, 'chart', NULL, 'follow_ups', '[]'::jsonb,
      'error_category', 'empty_data', 'error_code', 'no_rows',
      'model_used', v_model
    );
  END IF;

  -- ── Call 2 — single-turn narration, plain text. ──────────────
  -- Truncate data blob to avoid blowing the context window on large row sets.
  v_data_blob := LEFT(v_rpc_result::text, 4000);

  v_call2_prompt := format(
    '使用者問題：%s' || E'\n\n' ||
    '資料（JSON 片段）：%s' || E'\n\n' ||
    '請輸出「一句」繁體中文，描述整體方向或現況。' || E'\n' ||
    '嚴禁：具體數字、英文、項目符號、多行、草稿、任何解釋或思考過程。' || E'\n' ||
    '只輸出那句話本身，不要加引號、不要加「答：」、不要換行。',
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
      'temperature', 0.2,
      'maxOutputTokens', 120
    )
  );

  BEGIN
    SELECT * INTO v_call2_resp
    FROM extensions.http((
      'POST',
      v_endpoint,
      ARRAY[]::extensions.http_header[],
      'application/json',
      v_call2_body::text
    )::extensions.http_request);
  EXCEPTION WHEN others THEN
    v_answer := '資料已就緒，請看下方表格。';
    RETURN jsonb_build_object(
      'answer', v_answer,
      'rpc_called', v_rpc_name, 'params', v_rpc_args,
      'data', v_rpc_result, 'chart', NULL, 'follow_ups', '[]'::jsonb,
      'model_used', v_model,
      'debug_reason', 'call2 http failed: ' || SQLERRM
    );
  END;

  v_answer := NULL;
  IF v_call2_resp.status = 200 THEN
    BEGIN
      v_call2_json := v_call2_resp.content::jsonb;
      v_answer := v_call2_json #>> '{candidates,0,content,parts,0,text}';
    EXCEPTION WHEN others THEN
      v_answer := NULL;
    END;
  END IF;

  -- ── Post-process: strip meta leakage. ───────────────────────
  -- Gemma sometimes still writes bullets / draft labels / English
  -- meta lines. We keep only lines that contain Chinese characters
  -- and don't start with markdown markers or obvious meta keywords.
  IF v_answer IS NOT NULL AND v_answer <> '' THEN
    v_clean := '';
    FOREACH v_line IN ARRAY string_to_array(v_answer, E'\n') LOOP
      v_line := trim(v_line);
      CONTINUE WHEN v_line = '';
      CONTINUE WHEN v_line ~ '^[\*\-\>\#`]';           -- bullets / markdown
      CONTINUE WHEN v_line ~ '^\d+[\.\)]';              -- numbered list
      CONTINUE WHEN v_line ~* '^(input|task|constraint|draft|output|violates|rule|note)\s*[:：]';
      -- require at least one non-ASCII (Chinese) character
      CONTINUE WHEN octet_length(v_line) = char_length(v_line);
      v_clean := v_clean || v_line;
      EXIT;  -- take only the first qualifying line
    END LOOP;

    IF v_clean <> '' THEN
      -- strip leading 答：/結論：/總結：/回答：
      v_clean := regexp_replace(v_clean, '^(答|結論|總結|回答|回覆)\s*[:：]\s*', '');
      -- strip wrapping quotes
      v_clean := regexp_replace(v_clean, '^["''「『](.*)["''」』]$', '\1');
      v_answer := trim(v_clean);
    ELSE
      v_answer := NULL;
    END IF;
  END IF;

  IF v_answer IS NULL OR v_answer = '' THEN
    v_answer := '資料已就緒，請看下方表格。';
  END IF;

  RETURN jsonb_build_object(
    'answer', v_answer,
    'rpc_called', v_rpc_name,
    'params', v_rpc_args,
    'data', v_rpc_result,
    'chart', NULL,
    'follow_ups', '[]'::jsonb,
    'model_used', v_model
  );
END;
$$;
