-- ============================================================================
-- AI Consolidated Baseline — supersedes 19 prior ai_ask iterations.
--
-- Squashed on 2026-04-11. Replaces:
--   20260410003200..20260411001700 (21 files, ~10000 lines of dead iterations)
-- See supabase/migrations/_archive/README.md for the full list and the
-- migration repair commands needed to sync remote state with this baseline.
--
-- This file contains the FINAL state only:
--   1. ai_function_catalog.chart_hint    column     (was v12.3)
--   2. ai_function_catalog.render_hint   column     (was v12.4)
--   3. nf_ai_catalog_sync()              function   (was v12.4)
--   4. render_hint seed map              data       (was v12.4)
--   5. nf_ai_ask                         function   (v13.5)
--   6. nf_ai_ask_deep                    function   (v1.8)
--
-- All blocks are idempotent (CREATE OR REPLACE / IF NOT EXISTS) so
-- `supabase db reset` from a fresh state runs cleanly. On a remote where
-- the prior 21 migrations were already applied, this baseline is a no-op
-- (every CREATE OR REPLACE re-installs the same final state).
--
-- Design notes for nf_ai_ask v13.5 and nf_ai_ask_deep v1.8 — see commit
-- history of supabase/migrations/_archive/ for the iteration log.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Schema: chart_hint and render_hint columns on ai_function_catalog
-- ----------------------------------------------------------------------------
ALTER TABLE public.ai_function_catalog
  ADD COLUMN IF NOT EXISTS chart_hint  text NOT NULL DEFAULT 'auto';

ALTER TABLE public.ai_function_catalog
  ADD COLUMN IF NOT EXISTS render_hint text NOT NULL DEFAULT 'auto';

ALTER TABLE public.ai_function_catalog
  DROP CONSTRAINT IF EXISTS ai_function_catalog_render_hint_check;

ALTER TABLE public.ai_function_catalog
  ADD CONSTRAINT ai_function_catalog_render_hint_check
  CHECK (render_hint IN ('auto','text','table','chart','both'));

-- ----------------------------------------------------------------------------
-- 2. nf_ai_catalog_sync — populates ai_function_catalog from pg_proc COMMENTs
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. Render hint seed — assigns a default render_hint to each known nf_* RPC.
--    Sync preserves existing values, so re-applying this seed only fills
--    in functions whose COMMENT doesn't specify "render".
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. nf_ai_ask v13.5 — Call 1 (Gemma function calling) + Call 2 (narration).
--    Single-track 26B A4B model. Manual JSON extraction (no responseSchema).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nf_ai_ask(p_question text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
SET statement_timeout = '120s'
AS $$
DECLARE
  v_api_key          text;
  v_model_call1      text := 'gemma-4-26b-a4b-it';
  v_model_call2      text := 'gemma-4-26b-a4b-it';   -- same model, different role
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
  v_existing_sub     text;
  v_err_cat          text;
  v_err_code         text;
  v_err_reason       text;
  v_used_template    boolean := false;
  v_call2_debug      text;
  v_skip_call2       boolean := false;
  -- JSON extraction
  v_json_start       int;
  v_json_end         int;
  v_json_slice       text;
  v_parsed           jsonb;
  -- chart derivation
  v_chart            jsonb := NULL;
  v_first_row        jsonb;
  v_row_key          text;
  v_row_val          jsonb;
  v_number_fields    text[] := ARRAY[]::text[];
  v_date_fields      text[] := ARRAY[]::text[];
  v_text_fields     text[] := ARRAY[]::text[];
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
  -- degraded signalling
  v_degraded         boolean := false;
  v_degrade_reason   text;
BEGIN
  -- Call 1 gets generous 90s; Call 2 will lower to 50s right before its shot.
  PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '90000');

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
      'error_category', 'config', 'error_code', 'missing_api_key'
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
      'error_category', 'schema_drift', 'error_code', 'empty_catalog'
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
  v_catalog_hint := v_hint;

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

  IF v_render IN ('chart', 'both') AND v_chart IS NULL THEN
    v_render := 'table';
    v_degraded := true;
    v_degrade_reason := 'chart_derivation_failed';
  END IF;

  IF v_catalog_hint IN ('line', 'bar', 'pie') AND v_chart IS NULL
     AND v_degraded = false THEN
    v_degraded := true;
    v_degrade_reason := 'chart_derivation_failed';
  END IF;

  -- Skip Call 2 for single-row / text responses.
  IF v_render = 'text' OR v_row_count <= 1 THEN
    v_skip_call2 := true;
    IF v_render = 'text' THEN
      v_answer := format('以下是%s的最新數據。', p_question);
    ELSE
      v_answer := format('以下為%s的結果，詳見下方內容。', p_question);
    END IF;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- Call 2 — narration on 26B A4B, Deep v1.8 shape
  -- No prefill, no few-shot, no system_instruction.
  -- Ask for {"summary":..., "insight":...} and manually extract JSON.
  -- ══════════════════════════════════════════════════════════════════
  IF NOT v_skip_call2 THEN
    v_data_blob := LEFT(v_rpc_result::text, 3000);

    v_call2_prompt := format(
E'資料（%s，共 %s 筆）：%s\n\n問題：%s\n\n' ||
E'請用繁體中文回覆一個 JSON，只包含兩個欄位：\n' ||
E'{"summary": "一句話整體摘要，不超過 60 字", "insight": "一句話關鍵觀察，不超過 80 字，可引用數字、百分比或名稱"}\n\n' ||
E'只輸出 JSON，不要其他文字，不要 markdown 標記。',
      v_rpc_name, v_row_count, v_data_blob, p_question
    );

    v_call2_body := jsonb_build_object(
      'contents', jsonb_build_array(
        jsonb_build_object(
          'role', 'user',
          'parts', jsonb_build_array(
            jsonb_build_object('text', v_call2_prompt)
          )
        )
      ),
      'generationConfig', jsonb_build_object(
        'temperature',     0.2,
        'maxOutputTokens', 300
      )
    );

    -- Tighten curl budget for Call 2 — 50s (Deep uses 100s; Call 2 only
    -- outputs ~100 tokens so it should finish in 10–20s normally).
    BEGIN
      PERFORM extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '50000');
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'http_set_curlopt for call2 failed: %', SQLERRM;
    END;

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
          IF v_raw_text IS NULL OR trim(v_raw_text) = '' THEN
            v_call2_debug := 'call2_empty';
            v_raw_text := NULL;
          END IF;
        EXCEPTION WHEN others THEN
          v_raw_text := NULL;
          v_call2_debug := 'call2_not_json';
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

    -- ── Manual JSON extraction (same as Deep v1.8) ──
    IF v_raw_text IS NOT NULL AND v_raw_text <> '' THEN
      v_json_start := position('{' in v_raw_text);
      v_json_end   := length(v_raw_text) - position('}' in reverse(v_raw_text)) + 1;

      IF v_json_start > 0 AND v_json_end >= v_json_start THEN
        v_json_slice := substring(v_raw_text FROM v_json_start FOR (v_json_end - v_json_start + 1));
        BEGIN
          v_parsed := v_json_slice::jsonb;
          v_answer  := NULLIF(trim(COALESCE(v_parsed->>'summary', '')), '');
          v_insight := NULLIF(trim(COALESCE(v_parsed->>'insight', '')), '');
        EXCEPTION WHEN others THEN
          v_answer  := NULL;
          v_insight := NULL;
          v_call2_debug := 'call2_schema_decode_failed';
        END;
      ELSE
        v_call2_debug := 'call2_schema_decode_failed';
      END IF;

      -- Length clamps (same as v13.3)
      IF v_answer IS NOT NULL AND char_length(v_answer) > 80 THEN
        v_answer := LEFT(v_answer, 80);
      END IF;
      IF v_insight IS NOT NULL AND char_length(v_insight) > 100 THEN
        v_insight := LEFT(v_insight, 100);
      END IF;
    END IF;

    -- Template fallback when Call 2 gave us nothing usable.
    IF v_answer IS NULL THEN
      v_used_template := true;
      v_degraded := true;
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
      ELSE
        v_answer := format('以下為%s的結果，詳見下方圖表。', p_question);
      END IF;
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
    'model_used',     CASE WHEN v_skip_call2 THEN v_model_call1 ELSE v_model_call2 END,
    'debug_reason',
      CASE
        WHEN v_skip_call2 THEN 'call2_skipped_for_text'
        WHEN v_used_template AND v_call2_debug IS NOT NULL
          THEN 'template fallback — ' || v_call2_debug
        WHEN v_used_template
          THEN 'template fallback — call2 output unparseable'
        ELSE NULL
      END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.nf_ai_ask(text) TO authenticated, anon, service_role;

-- ----------------------------------------------------------------------------
-- 5. nf_ai_ask_deep v1.8 — four-section deep analysis (trend / observations
--    / recommendations / risks). Same model + extraction shape as v13.5.
-- ----------------------------------------------------------------------------
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
  -- Without responseSchema the model might wrap the JSON in
  -- ```json ... ``` fences or add a preamble. Slice from the first
  -- '{' to the last '}' to recover the JSON substring.
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
