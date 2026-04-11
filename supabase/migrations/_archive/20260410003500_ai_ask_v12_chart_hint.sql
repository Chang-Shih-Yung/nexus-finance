-- nf_ai_ask v12.3 — catalog-driven chart derivation (hybrid approach).
--
-- Design (locked in session):
--   1. Catalog declares chart type semantics (line/bar/pie/none/auto)
--   2. Server derives x_field / y_field by inspecting actual row shape
--   3. LLM never touches chart decisions — eliminates field hallucination
--
-- Field detection rules for a chartable row_set:
--   * Classify every top-level field in row[0] by jsonb_typeof + pattern
--   * "date" = string matching ^YYYY-MM-DD
--   * "text" = string that isn't a date
--   * "number" = jsonb number
--   * line chart: first date field → x, first number field → y
--   * bar/pie  : first text field → x, first number field → y
--   * auto     : has date → line, else has text → bar, else none
--
-- Hint values stored in ai_function_catalog.chart_hint:
--   none | line | bar | pie | auto
-- Defaults to 'auto' if catalog/COMMENT doesn't specify.

-- ============================================================
-- 1. Schema: add chart_hint column
-- ============================================================
ALTER TABLE public.ai_function_catalog
  ADD COLUMN IF NOT EXISTS chart_hint text NOT NULL DEFAULT 'auto';

-- ============================================================
-- 2. Sync function: parse chart_hint from COMMENT JSON meta
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
    v_meta    := NULL;
    v_desc    := NULL;
    v_category := NULL;
    v_examples := '[]'::jsonb;
    v_chart_hint := NULL;

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

    -- Default chart_hint based on returns_shape if COMMENT didn't specify.
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
      example_questions, enabled, signature_hint, chart_hint, last_synced_at
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
      now()
    )
    ON CONFLICT (name) DO UPDATE
      SET description_zh    = EXCLUDED.description_zh,
          category          = EXCLUDED.category,
          returns_shape     = EXCLUDED.returns_shape,
          example_questions = EXCLUDED.example_questions,
          signature_hint    = EXCLUDED.signature_hint,
          chart_hint        = EXCLUDED.chart_hint,
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
-- 3. Re-seed COMMENTs with chart field in metadata
-- ============================================================
DO $seed$
DECLARE
  v_rec  record;
  v_sig  text;
  v_meta jsonb := jsonb_build_object(
    'nf_revenue_summary',
      jsonb_build_object('desc','近 N 天營收總覽（單行快照）。',
                         'category','revenue','chart','none',
                         'examples',jsonb_build_array('最近 30 天營收總覽','這個月營收狀況')),
    'nf_revenue_by_product',
      jsonb_build_object('desc','近 N 天各產品線營收拆解。',
                         'category','revenue','chart','bar',
                         'examples',jsonb_build_array('最近 30 天各產品營收','產品別業績')),
    'nf_revenue_trend',
      jsonb_build_object('desc','近 N 天營收逐日時序。',
                         'category','revenue','chart','line',
                         'examples',jsonb_build_array('最近 30 天營收走勢','營收趨勢')),
    'nf_loan_portfolio',
      jsonb_build_object('desc','放款組合總覽（單行快照）。',
                         'category','loan','chart','none',
                         'examples',jsonb_build_array('放款總覽','現在放款狀況')),
    'nf_loan_by_type',
      jsonb_build_object('desc','依放款類別的分布。',
                         'category','loan','chart','pie',
                         'examples',jsonb_build_array('放款依類別分布','不同類型放款比例')),
    'nf_deposit_summary',
      jsonb_build_object('desc','存款總覽（單行快照）。',
                         'category','deposit','chart','none',
                         'examples',jsonb_build_array('存款總覽','現在存款狀況')),
    'nf_deposit_by_product',
      jsonb_build_object('desc','依產品的存款分布。',
                         'category','deposit','chart','pie',
                         'examples',jsonb_build_array('存款依產品別','各類存款分布')),
    'nf_compliance_status',
      jsonb_build_object('desc','合規狀態總覽（單行快照）。',
                         'category','compliance','chart','none',
                         'examples',jsonb_build_array('合規狀態','現在合規情況')),
    'nf_compliance_items',
      jsonb_build_object('desc','合規事件列表，可依 status 篩選。',
                         'category','compliance','chart','none',
                         'examples',jsonb_build_array('未結案的合規事件','所有合規項目')),
    'nf_customer_nps',
      jsonb_build_object('desc','近 N 天客戶 NPS 指標。',
                         'category','customer','chart','none',
                         'examples',jsonb_build_array('最近 30 天 NPS','客戶滿意度')),
    'nf_customer_feedback_recent',
      jsonb_build_object('desc','近期客戶回饋。',
                         'category','customer','chart','none',
                         'examples',jsonb_build_array('最近客戶回饋','客戶意見')),
    'nf_fraud_summary',
      jsonb_build_object('desc','詐欺偵測總覽（單行快照）。',
                         'category','fraud','chart','none',
                         'examples',jsonb_build_array('詐欺情況','fraud 總覽')),
    'nf_fraud_alerts_list',
      jsonb_build_object('desc','近期詐欺警示列表。',
                         'category','fraud','chart','none',
                         'examples',jsonb_build_array('最近詐欺警示','可疑交易列表')),
    'nf_system_status',
      jsonb_build_object('desc','系統狀態總覽（單行快照）。',
                         'category','system','chart','none',
                         'examples',jsonb_build_array('系統狀態','系統現況')),
    'nf_system_overview',
      jsonb_build_object('desc','系統整體概覽（多元件）。',
                         'category','system','chart','bar',
                         'examples',jsonb_build_array('系統整體概覽','各元件狀況')),
    'nf_fx_rates',
      jsonb_build_object('desc','匯率牌告。',
                         'category','markets','chart','none',
                         'examples',jsonb_build_array('匯率','目前匯率牌告')),
    'nf_investment_products',
      jsonb_build_object('desc','投資商品列表，可依 category 篩選。',
                         'category','investment','chart','none',
                         'examples',jsonb_build_array('投資商品','基金清單')),
    'nf_investment_summary',
      jsonb_build_object('desc','投資業務總覽（單行快照）。',
                         'category','investment','chart','none',
                         'examples',jsonb_build_array('投資業務總覽','理財業務狀況')),
    'nf_budget_vs_actual',
      jsonb_build_object('desc','預算 vs 實績對比，指定季度。',
                         'category','finance','chart','bar',
                         'examples',jsonb_build_array('本季預算達成率','2026-Q2 預算 vs 實績')),
    'nf_branch_ranking',
      jsonb_build_object('desc','分行排名，可依 metric 與 period。',
                         'category','branch','chart','bar',
                         'examples',jsonb_build_array('本季分行營收排名','分行業績排名')),
    'nf_rm_performance',
      jsonb_build_object('desc','理專業績表現。',
                         'category','rm','chart','bar',
                         'examples',jsonb_build_array('理專業績','RM 表現')),
    'nf_channel_distribution',
      jsonb_build_object('desc','通路分布（近 N 天）。',
                         'category','channel','chart','pie',
                         'examples',jsonb_build_array('通路分布','各通路使用率')),
    'nf_digital_adoption',
      jsonb_build_object('desc','數位採用率（近 N 天）。',
                         'category','channel','chart','line',
                         'examples',jsonb_build_array('數位採用率','digital adoption')),
    'nf_account_summary',
      jsonb_build_object('desc','帳戶總覽（單行快照）。',
                         'category','account','chart','none',
                         'examples',jsonb_build_array('帳戶總覽','總帳戶數')),
    'nf_monthly_activity',
      jsonb_build_object('desc','近 N 個月帳戶活動。',
                         'category','account','chart','line',
                         'examples',jsonb_build_array('最近 12 個月活動','月活量')),
    'nf_pending_transactions',
      jsonb_build_object('desc','待處理交易列表。',
                         'category','transaction','chart','none',
                         'examples',jsonb_build_array('待處理交易','pending transactions')),
    'nf_recent_transactions',
      jsonb_build_object('desc','近期交易列表。',
                         'category','transaction','chart','none',
                         'examples',jsonb_build_array('最近交易','近期交易紀錄')),
    'nf_daily_trend',
      jsonb_build_object('desc','單指標逐日時序。',
                         'category','dashboard','chart','line',
                         'examples',jsonb_build_array('最近 7 天登入次數','近 30 天交易金額走勢')),
    'nf_current_breakdown',
      jsonb_build_object('desc','單指標今日維度拆解。',
                         'category','dashboard','chart','bar',
                         'examples',jsonb_build_array('今日各分行交易量','今日通路拆解')),
    'nf_top_n',
      jsonb_build_object('desc','單指標 top-N 排名。',
                         'category','dashboard','chart','bar',
                         'examples',jsonb_build_array('交易量前十分行','top 5 通路')),
    'nf_period_compare',
      jsonb_build_object('desc','單指標期間對比。',
                         'category','dashboard','chart','bar',
                         'examples',jsonb_build_array('近 7 天與前 7 天交易量對比','期間比較')),
    'nf_anomaly_check',
      jsonb_build_object('desc','單指標異常偵測。',
                         'category','dashboard','chart','none',
                         'examples',jsonb_build_array('今日交易異常','最近 7 天異常')),
    'nf_today_snapshot',
      jsonb_build_object('desc','今日 KPI 快照（全行各核心指標單行）。',
                         'category','snapshot','chart','none',
                         'examples',jsonb_build_array('今天營運狀況','今日 KPI','現在情況')),
    'nf_generate_daily_snapshot',
      jsonb_build_object('desc','[write] 產生每日快照，不供 AI 呼叫。',
                         'category','write','chart','none',
                         'examples',jsonb_build_array())
  );
  v_name  text;
  v_entry jsonb;
  v_body  text;
BEGIN
  FOR v_name, v_entry IN SELECT * FROM jsonb_each(v_meta) LOOP
    SELECT format('%s.%s(%s)',
                  n.nspname,
                  p.proname,
                  pg_get_function_identity_arguments(p.oid))
      INTO v_sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = v_name
    ORDER BY p.oid
    LIMIT 1;

    IF v_sig IS NULL THEN
      CONTINUE;
    END IF;

    v_body := format(
      '%s%s---%s%s',
      v_entry->>'desc',
      E'\n',
      E'\n',
      jsonb_build_object(
        'category', v_entry->>'category',
        'chart',    v_entry->>'chart',
        'examples', v_entry->'examples'
      )::text
    );

    EXECUTE format('COMMENT ON FUNCTION %s IS %L', v_sig, v_body);
  END LOOP;
END;
$seed$;

-- Re-run sync so chart_hint propagates from the updated COMMENTs.
SELECT * FROM public.nf_ai_catalog_sync();

-- ============================================================
-- 4. nf_ai_ask v12.3 — adds chart derivation block
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

    -- Resolve 'auto' based on what fields are available.
    IF v_hint = 'auto' THEN
      IF array_length(v_date_fields, 1) >= 1 AND array_length(v_number_fields, 1) >= 1 THEN
        v_hint := 'line';
      ELSIF array_length(v_text_fields, 1) >= 1 AND array_length(v_number_fields, 1) >= 1 THEN
        v_hint := 'bar';
      ELSE
        v_hint := 'none';
      END IF;
    END IF;

    -- Pick x/y fields based on resolved hint.
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
    v_answer := '資料已就緒，請看下方表格。';
    RETURN jsonb_build_object(
      'answer', v_answer,
      'rpc_called', v_rpc_name, 'params', v_rpc_args,
      'data', v_rpc_result, 'chart', v_chart, 'follow_ups', '[]'::jsonb,
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
    v_answer := '資料已就緒，請看下方圖表或表格。';
  END IF;

  RETURN jsonb_build_object(
    'answer', v_answer,
    'rpc_called', v_rpc_name,
    'params', v_rpc_args,
    'data', v_rpc_result,
    'chart', v_chart,
    'follow_ups', '[]'::jsonb,
    'model_used', v_model
  );
END;
$$;
