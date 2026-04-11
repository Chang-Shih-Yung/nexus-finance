-- nf_ai_ask v12.4 — render hint (table / chart / both / text).
--
-- Design (locked in session):
--   * chart_hint (v12.3) decides *which* chart shape.
--   * render_hint (v12.4) decides *what to render*: table, chart, both, text.
--   * Backend never nulls `data` — frontend reads `render` and chooses.
--   * 'auto' resolves at query time based on row count + chart availability:
--       - single_row / 1 row / non-array          → text
--       - has chart AND rows ≤ 12                  → both
--       - has chart AND rows > 12                  → chart
--       - otherwise                                → table
--
-- COMMENT JSON extended with "render" field. Values:
--   text | table | chart | both | auto
-- Sync preserves existing catalog value when COMMENT doesn't specify,
-- so this migration can ship render_hint updates without re-seeding COMMENTs.

-- ============================================================
-- 1. Schema: add render_hint column
-- ============================================================
ALTER TABLE public.ai_function_catalog
  ADD COLUMN IF NOT EXISTS render_hint text NOT NULL DEFAULT 'auto';

ALTER TABLE public.ai_function_catalog
  DROP CONSTRAINT IF EXISTS ai_function_catalog_render_hint_check;

ALTER TABLE public.ai_function_catalog
  ADD CONSTRAINT ai_function_catalog_render_hint_check
  CHECK (render_hint IN ('auto','text','table','chart','both'));

-- ============================================================
-- 2. Sync function: read "render" from COMMENT, preserve existing on conflict
-- ============================================================
CREATE OR REPLACE FUNCTION public.nf_ai_catalog_sync()
RETURNS TABLE(out_action text, out_name text, out_enabled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_rec             record;
  v_comment         text;
  v_body            text;
  v_json_part       text;
  v_meta            jsonb;
  v_desc            text;
  v_category        text;
  v_examples        jsonb;
  v_chart_hint      text;
  v_render_hint     text;
  v_returns         text;
  v_returns_text    text;
  v_sig             text;
  v_default_enabled boolean;
  v_result_name     text;
  v_result_action   text;
  v_result_enabled  boolean;
BEGIN
  FOR v_rec IN
    SELECT
      p.oid,
      p.proname,
      pg_get_function_arguments(p.oid) AS args,
      pg_get_function_result(p.oid)    AS result
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'nf\_%' ESCAPE '\'
      AND p.proname <> 'nf_ai_ask'
      AND p.proname <> 'nf_ai_catalog_sync'
      AND p.proname <> 'nf_ai_friendly_fallback'
      AND p.proname <> 'nf_mask_pii'
      AND p.proname <> 'nf_check_dashboard_access'
  LOOP
    v_comment := obj_description(v_rec.oid, 'pg_proc');
    v_meta        := NULL;
    v_desc        := NULL;
    v_category    := NULL;
    v_examples    := '[]'::jsonb;
    v_chart_hint  := NULL;
    v_render_hint := NULL;

    IF v_comment IS NOT NULL THEN
      IF position('---' IN v_comment) > 0 THEN
        v_body      := trim(split_part(v_comment, '---', 1));
        v_json_part := trim(substring(v_comment FROM position('---' IN v_comment) + 3));
        BEGIN
          v_meta := v_json_part::jsonb;
        EXCEPTION WHEN others THEN
          v_meta := NULL;
        END;
      ELSE
        v_body := trim(v_comment);
      END IF;

      v_desc := NULLIF(v_body, '');
      IF v_meta IS NOT NULL THEN
        v_category := v_meta->>'category';
        IF jsonb_typeof(v_meta->'examples') = 'array' THEN
          v_examples := v_meta->'examples';
        END IF;
        IF v_meta ? 'description_zh' THEN
          v_desc := v_meta->>'description_zh';
        END IF;
        IF v_meta ? 'chart' THEN
          v_chart_hint := v_meta->>'chart';
        END IF;
        IF v_meta ? 'render' THEN
          v_render_hint := v_meta->>'render';
        END IF;
      END IF;
    END IF;

    v_returns_text := lower(COALESCE(v_rec.result, ''));
    IF v_returns_text LIKE 'void%' OR v_returns_text LIKE 'trigger%' THEN
      v_returns := 'write';
    ELSIF v_returns_text LIKE 'setof %' OR v_returns_text LIKE 'table(%' THEN
      v_returns := 'row_set';
    ELSE
      v_returns := 'single_row';
    END IF;

    IF v_chart_hint IS NULL THEN
      IF v_returns = 'single_row' OR v_returns = 'write' THEN
        v_chart_hint := 'none';
      ELSE
        v_chart_hint := 'auto';
      END IF;
    END IF;

    v_default_enabled :=
      NOT (v_rec.proname ~
        '^nf_(generate|set|insert|update|delete|create|drop|grant|revoke|reset|sync|register)_');

    v_sig := v_rec.proname || '(' || COALESCE(v_rec.args, '') || ')';

    INSERT INTO public.ai_function_catalog AS c (
      name, description_zh, category, returns_shape,
      example_questions, enabled, signature_hint,
      chart_hint, render_hint, last_synced_at
    )
    VALUES (
      v_rec.proname,
      COALESCE(v_desc, '(待補充)'),
      v_category,
      v_returns,
      v_examples,
      v_default_enabled,
      v_sig,
      v_chart_hint,
      COALESCE(v_render_hint, 'auto'),
      now()
    )
    ON CONFLICT (name) DO UPDATE
      SET description_zh    = EXCLUDED.description_zh,
          category          = EXCLUDED.category,
          returns_shape     = EXCLUDED.returns_shape,
          example_questions = EXCLUDED.example_questions,
          signature_hint    = EXCLUDED.signature_hint,
          chart_hint        = EXCLUDED.chart_hint,
          -- Preserve existing render_hint when COMMENT doesn't specify.
          render_hint       = COALESCE(v_render_hint, c.render_hint),
          last_synced_at    = EXCLUDED.last_synced_at
      RETURNING
        (CASE WHEN xmax = 0 THEN 'inserted' ELSE 'updated' END),
        c.name, c.enabled
      INTO v_result_action, v_result_name, v_result_enabled;

    out_action  := v_result_action;
    out_name    := v_result_name;
    out_enabled := v_result_enabled;
    RETURN NEXT;
  END LOOP;

  FOR v_rec IN
    SELECT c.name AS cname
    FROM public.ai_function_catalog c
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = c.name
    )
  LOOP
    DELETE FROM public.ai_function_catalog WHERE name = v_rec.cname;
    out_action  := 'deleted';
    out_name    := v_rec.cname;
    out_enabled := false;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ============================================================
-- 3. Data: seed render_hint per function
-- ============================================================
-- Uses direct UPDATE (no COMMENT re-seed) because sync() now preserves
-- existing render_hint when COMMENT lacks the field. Next time someone
-- touches a function's COMMENT they can add "render": "..." and it will
-- override this. Unknown functions stay 'auto' and fall through to the
-- runtime auto-resolver in nf_ai_ask.

DO $seed$
DECLARE
  v_map jsonb := jsonb_build_object(
    -- Pure snapshots / single-row KPIs → text only
    'nf_today_snapshot',         'text',
    'nf_revenue_summary',        'text',
    'nf_loan_portfolio',         'text',
    'nf_deposit_summary',        'text',
    'nf_compliance_status',      'text',
    'nf_fraud_summary',          'text',
    'nf_system_status',          'text',
    'nf_investment_summary',     'text',
    'nf_account_summary',        'text',
    'nf_anomaly_check',          'text',

    -- Pure lists → table only (no meaningful chart)
    'nf_compliance_items',       'table',
    'nf_customer_feedback_recent','table',
    'nf_fraud_alerts_list',      'table',
    'nf_fx_rates',               'table',
    'nf_investment_products',    'table',
    'nf_pending_transactions',   'table',
    'nf_recent_transactions',    'table',

    -- Time series → both (見趨勢 + 對照數字)
    'nf_revenue_trend',          'both',
    'nf_monthly_activity',       'both',
    'nf_daily_trend',            'both',
    'nf_customer_nps',           'both',
    'nf_digital_adoption',       'both',

    -- Breakdowns / rankings → both (排名也想看數字)
    'nf_revenue_by_product',     'both',
    'nf_loan_by_type',           'both',
    'nf_deposit_by_product',     'both',
    'nf_branch_ranking',         'both',
    'nf_rm_performance',         'both',
    'nf_channel_distribution',   'both',
    'nf_budget_vs_actual',       'both',
    'nf_system_overview',        'both',
    'nf_current_breakdown',      'both',
    'nf_top_n',                  'both',
    'nf_period_compare',         'both',

    -- Write-only
    'nf_generate_daily_snapshot','text'
  );
  v_name text;
  v_val  text;
BEGIN
  FOR v_name IN SELECT jsonb_object_keys(v_map) LOOP
    v_val := v_map->>v_name;
    UPDATE public.ai_function_catalog
       SET render_hint = v_val
     WHERE name = v_name;
  END LOOP;
END;
$seed$;

-- ============================================================
-- 4. nf_ai_ask v12.4 — add render resolution + return `render` field
-- ============================================================
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
  -- chart derivation locals
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
  -- render resolution
  v_render           text;
  v_row_count        int;
BEGIN
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
      'render', 'text',
      'follow_ups', '[]'::jsonb,
      'error_category', 'config',
      'error_code', 'missing_api_key'
    );
  END IF;

  v_endpoint := format(
    'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
    v_model, v_api_key
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
      'rpc_called', NULL, 'params', NULL, 'data', NULL, 'chart', NULL,
      'render', 'text',
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
      'render', 'text',
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
      'render', 'text',
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
      'render', 'text',
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
      'render', 'text',
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
      'render', 'text',
      'follow_ups', '[]'::jsonb,
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
    VALUES (p_question, 'dispatch_error', 'rpc_exec_failed', SQLERRM, v_model,
            v_rpc_name, v_rpc_args);
    RETURN jsonb_build_object(
      'answer', format('⚠️ 執行「%s」時發生錯誤，請稍後再試。', v_rpc_name),
      'rpc_called', v_rpc_name, 'params', v_rpc_args,
      'data', NULL, 'chart', NULL, 'render', 'text', 'follow_ups', '[]'::jsonb,
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
      'data', '[]'::jsonb, 'chart', NULL, 'render', 'text', 'follow_ups', '[]'::jsonb,
      'error_category', 'empty_data', 'error_code', 'no_rows',
      'model_used', v_model
    );
  END IF;

  -- ── Derive chart from catalog hint + first row shape. ─────
  v_hint := COALESCE(v_catalog_row.chart_hint, 'auto');

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

  -- ── Resolve render hint ─────────────────────────────────────
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

  -- Safety: if catalog says chart/both but we failed to derive a chart,
  -- degrade gracefully to table (never show an empty chart slot).
  IF v_render IN ('chart', 'both') AND v_chart IS NULL THEN
    v_render := 'table';
  END IF;

  -- ── Call 2 — single-turn narration ──
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
    v_answer := '資料已就緒，請看下方內容。';
    RETURN jsonb_build_object(
      'answer', v_answer,
      'rpc_called', v_rpc_name, 'params', v_rpc_args,
      'data', v_rpc_result, 'chart', v_chart,
      'render', v_render,
      'follow_ups', '[]'::jsonb,
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

  -- Post-process: strip meta leakage.
  IF v_answer IS NOT NULL AND v_answer <> '' THEN
    v_clean := '';
    FOREACH v_line IN ARRAY string_to_array(v_answer, E'\n') LOOP
      v_line := trim(v_line);
      CONTINUE WHEN v_line = '';
      CONTINUE WHEN v_line ~ '^[\*\-\>\#`]';
      CONTINUE WHEN v_line ~ '^\d+[\.\)]';
      CONTINUE WHEN v_line ~* '^(input|task|constraint|draft|output|violates|rule|note)\s*[:：]';
      CONTINUE WHEN octet_length(v_line) = char_length(v_line);
      v_clean := v_clean || v_line;
      EXIT;
    END LOOP;

    IF v_clean <> '' THEN
      v_clean := regexp_replace(v_clean, '^(答|結論|總結|回答|回覆)\s*[:：]\s*', '');
      v_clean := regexp_replace(v_clean, '^["''「『](.*)["''」』]$', '\1');
      v_answer := trim(v_clean);
    ELSE
      v_answer := NULL;
    END IF;
  END IF;

  IF v_answer IS NULL OR v_answer = '' THEN
    v_answer := '資料已就緒，請看下方內容。';
  END IF;

  RETURN jsonb_build_object(
    'answer',      v_answer,
    'rpc_called',  v_rpc_name,
    'params',      v_rpc_args,
    'data',        v_rpc_result,
    'chart',       v_chart,
    'render',      v_render,
    'follow_ups',  '[]'::jsonb,
    'model_used',  v_model
  );
END;
$$;
