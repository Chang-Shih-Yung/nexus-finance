-- AI assistant v12 — catalog sync + COMMENT metadata for all nf_* functions.
--
-- "Schema = AI ability": every nf_* function in pg_proc becomes an AI tool
-- automatically, enabled by naming convention. The operator's
-- `enabled` overrides are preserved across syncs.
--
-- COMMENT payload is plain text with an optional JSON block. Convention:
--   COMMENT ON FUNCTION public.nf_foo(...) IS $$
--   <zh-TW one-liner>
--   ---
--   {"category":"revenue","examples":["近 30 天營收總覽","這個月業績"]}
--   $$;
--
-- nf_ai_catalog_sync() parses the JSON suffix if present, else falls back
-- to just description_zh = comment body.

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
  v_returns         text;
  v_returns_text    text;
  v_sig             text;
  v_default_enabled boolean;
  v_result_name     text;
  v_result_action   text;
  v_result_enabled  boolean;
BEGIN
  -- 1) Upsert every nf_* function visible in public schema.
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
      AND p.proname <> 'nf_ai_ask'                  -- the orchestrator itself
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
        -- allow metadata to override description_zh if provided
        IF v_meta ? 'description_zh' THEN
          v_desc := v_meta->>'description_zh';
        END IF;
      END IF;
    END IF;

    -- Classify returns_shape from the SQL result string.
    v_returns_text := lower(COALESCE(v_rec.result, ''));
    IF v_returns_text LIKE 'void%' OR v_returns_text LIKE 'trigger%' THEN
      v_returns := 'write';
    ELSIF v_returns_text LIKE 'setof %' OR v_returns_text LIKE 'table(%' THEN
      v_returns := 'row_set';
    ELSE
      v_returns := 'single_row';
    END IF;

    -- Default-enabled unless the name matches a write-intent verb.
    v_default_enabled :=
      NOT (v_rec.proname ~
        '^nf_(generate|set|insert|update|delete|create|drop|grant|revoke|reset|sync|register)_');

    v_sig := v_rec.proname || '(' || COALESCE(v_rec.args, '') || ')';

    INSERT INTO public.ai_function_catalog AS c (
      name, description_zh, category, returns_shape,
      example_questions, enabled, signature_hint, last_synced_at
    )
    VALUES (
      v_rec.proname,
      COALESCE(v_desc, '(待補充)'),
      v_category,
      v_returns,
      v_examples,
      v_default_enabled,
      v_sig,
      now()
    )
    ON CONFLICT (name) DO UPDATE
      SET description_zh    = EXCLUDED.description_zh,
          category          = EXCLUDED.category,
          returns_shape     = EXCLUDED.returns_shape,
          example_questions = EXCLUDED.example_questions,
          signature_hint    = EXCLUDED.signature_hint,
          last_synced_at    = EXCLUDED.last_synced_at
      -- NOTE: `enabled` is intentionally NOT updated, so operator toggles
      -- persist across syncs.
      RETURNING
        (CASE WHEN xmax = 0 THEN 'inserted' ELSE 'updated' END),
        c.name, c.enabled
      INTO v_result_action, v_result_name, v_result_enabled;

    out_action  := v_result_action;
    out_name    := v_result_name;
    out_enabled := v_result_enabled;
    RETURN NEXT;
  END LOOP;

  -- 2) Garbage-collect catalog rows whose backing function no longer exists.
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

COMMENT ON FUNCTION public.nf_ai_catalog_sync() IS
  'Idempotent sync of public.ai_function_catalog from pg_proc + COMMENT ON FUNCTION. Call after adding/renaming nf_* functions. Preserves operator enabled overrides.';

-- ---------------------------------------------------------------------------
-- Seed COMMENT metadata for every real nf_* function currently in the repo.
--
-- We look up each function's actual signature from pg_proc by name and
-- apply COMMENT ON FUNCTION via dynamic SQL, so this migration survives
-- any future signature change without needing hand-edits. Functions that
-- don't exist in this DB are silently skipped.
-- ---------------------------------------------------------------------------

DO $seed$
DECLARE
  v_rec  record;
  v_sig  text;
  v_meta jsonb := jsonb_build_object(
    -- Executive / revenue
    'nf_revenue_summary',
      jsonb_build_object('desc','近 N 天營收總覽（單行快照）。',
                         'category','revenue',
                         'examples',jsonb_build_array('最近 30 天營收總覽','這個月營收狀況')),
    'nf_revenue_by_product',
      jsonb_build_object('desc','近 N 天各產品線營收拆解。',
                         'category','revenue',
                         'examples',jsonb_build_array('最近 30 天各產品營收','產品別業績')),
    'nf_revenue_trend',
      jsonb_build_object('desc','近 N 天營收逐日時序。',
                         'category','revenue',
                         'examples',jsonb_build_array('最近 30 天營收走勢','營收趨勢')),
    -- Loans
    'nf_loan_portfolio',
      jsonb_build_object('desc','放款組合總覽（單行快照）。',
                         'category','loan',
                         'examples',jsonb_build_array('放款總覽','現在放款狀況')),
    'nf_loan_by_type',
      jsonb_build_object('desc','依放款類別的分布。',
                         'category','loan',
                         'examples',jsonb_build_array('放款依類別分布','不同類型放款比例')),
    -- Deposits
    'nf_deposit_summary',
      jsonb_build_object('desc','存款總覽（單行快照）。',
                         'category','deposit',
                         'examples',jsonb_build_array('存款總覽','現在存款狀況')),
    'nf_deposit_by_product',
      jsonb_build_object('desc','依產品的存款分布。',
                         'category','deposit',
                         'examples',jsonb_build_array('存款依產品別','各類存款分布')),
    -- Compliance
    'nf_compliance_status',
      jsonb_build_object('desc','合規狀態總覽（單行快照）。',
                         'category','compliance',
                         'examples',jsonb_build_array('合規狀態','現在合規情況')),
    'nf_compliance_items',
      jsonb_build_object('desc','合規事件列表，可依 status 篩選。',
                         'category','compliance',
                         'examples',jsonb_build_array('未結案的合規事件','所有合規項目')),
    -- Customer / NPS
    'nf_customer_nps',
      jsonb_build_object('desc','近 N 天客戶 NPS 指標。',
                         'category','customer',
                         'examples',jsonb_build_array('最近 30 天 NPS','客戶滿意度')),
    'nf_customer_feedback_recent',
      jsonb_build_object('desc','近期客戶回饋。',
                         'category','customer',
                         'examples',jsonb_build_array('最近客戶回饋','客戶意見')),
    -- Fraud
    'nf_fraud_summary',
      jsonb_build_object('desc','詐欺偵測總覽（單行快照）。',
                         'category','fraud',
                         'examples',jsonb_build_array('詐欺情況','fraud 總覽')),
    'nf_fraud_alerts_list',
      jsonb_build_object('desc','近期詐欺警示列表。',
                         'category','fraud',
                         'examples',jsonb_build_array('最近詐欺警示','可疑交易列表')),
    -- System
    'nf_system_status',
      jsonb_build_object('desc','系統狀態總覽（單行快照）。',
                         'category','system',
                         'examples',jsonb_build_array('系統狀態','系統現況')),
    'nf_system_overview',
      jsonb_build_object('desc','系統整體概覽（多元件）。',
                         'category','system',
                         'examples',jsonb_build_array('系統整體概覽','各元件狀況')),
    -- Investments / FX
    'nf_fx_rates',
      jsonb_build_object('desc','匯率牌告。',
                         'category','markets',
                         'examples',jsonb_build_array('匯率','目前匯率牌告')),
    'nf_investment_products',
      jsonb_build_object('desc','投資商品列表，可依 category 篩選。',
                         'category','investment',
                         'examples',jsonb_build_array('投資商品','基金清單')),
    'nf_investment_summary',
      jsonb_build_object('desc','投資業務總覽（單行快照）。',
                         'category','investment',
                         'examples',jsonb_build_array('投資業務總覽','理財業務狀況')),
    -- Budget / branch / RM
    'nf_budget_vs_actual',
      jsonb_build_object('desc','預算 vs 實績對比，指定季度。',
                         'category','finance',
                         'examples',jsonb_build_array('本季預算達成率','2026-Q2 預算 vs 實績')),
    'nf_branch_ranking',
      jsonb_build_object('desc','分行排名，可依 metric 與 period。',
                         'category','branch',
                         'examples',jsonb_build_array('本季分行營收排名','分行業績排名')),
    'nf_rm_performance',
      jsonb_build_object('desc','理專業績表現。',
                         'category','rm',
                         'examples',jsonb_build_array('理專業績','RM 表現')),
    'nf_channel_distribution',
      jsonb_build_object('desc','通路分布（近 N 天）。',
                         'category','channel',
                         'examples',jsonb_build_array('通路分布','各通路使用率')),
    'nf_digital_adoption',
      jsonb_build_object('desc','數位採用率（近 N 天）。',
                         'category','channel',
                         'examples',jsonb_build_array('數位採用率','digital adoption')),
    -- Accounts / transactions
    'nf_account_summary',
      jsonb_build_object('desc','帳戶總覽（單行快照）。',
                         'category','account',
                         'examples',jsonb_build_array('帳戶總覽','總帳戶數')),
    'nf_monthly_activity',
      jsonb_build_object('desc','近 N 個月帳戶活動。',
                         'category','account',
                         'examples',jsonb_build_array('最近 12 個月活動','月活量')),
    'nf_pending_transactions',
      jsonb_build_object('desc','待處理交易列表。',
                         'category','transaction',
                         'examples',jsonb_build_array('待處理交易','pending transactions')),
    'nf_recent_transactions',
      jsonb_build_object('desc','近期交易列表。',
                         'category','transaction',
                         'examples',jsonb_build_array('最近交易','近期交易紀錄')),
    -- Dashboard (overhaul)
    'nf_daily_trend',
      jsonb_build_object('desc','單指標逐日時序。',
                         'category','dashboard',
                         'examples',jsonb_build_array('最近 7 天登入次數','近 30 天交易金額走勢')),
    'nf_current_breakdown',
      jsonb_build_object('desc','單指標今日維度拆解。',
                         'category','dashboard',
                         'examples',jsonb_build_array('今日各分行交易量','今日通路拆解')),
    'nf_top_n',
      jsonb_build_object('desc','單指標 top-N 排名。',
                         'category','dashboard',
                         'examples',jsonb_build_array('交易量前十分行','top 5 通路')),
    'nf_period_compare',
      jsonb_build_object('desc','單指標期間對比。',
                         'category','dashboard',
                         'examples',jsonb_build_array('近 7 天與前 7 天交易量對比','期間比較')),
    'nf_anomaly_check',
      jsonb_build_object('desc','單指標異常偵測。',
                         'category','dashboard',
                         'examples',jsonb_build_array('今日交易異常','最近 7 天異常')),
    -- Snapshot
    'nf_today_snapshot',
      jsonb_build_object('desc','今日 KPI 快照（全行各核心指標單行）。',
                         'category','snapshot',
                         'examples',jsonb_build_array('今天營運狀況','今日 KPI','現在情況')),
    -- Write-intent (explicit disable for belt-and-suspenders)
    'nf_generate_daily_snapshot',
      jsonb_build_object('desc','[write] 產生每日快照，不供 AI 呼叫。',
                         'category','write',
                         'examples',jsonb_build_array())
  );
  v_name text;
  v_entry jsonb;
  v_body  text;
BEGIN
  FOR v_name, v_entry IN SELECT * FROM jsonb_each(v_meta) LOOP
    -- Find the actual signature (there may be multiple overloads; take the first).
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
      RAISE NOTICE 'Skipping COMMENT for %: function does not exist', v_name;
      CONTINUE;
    END IF;

    v_body := format(
      '%s%s---%s%s',
      v_entry->>'desc',
      E'\n',
      E'\n',
      jsonb_build_object(
        'category', v_entry->>'category',
        'examples', v_entry->'examples'
      )::text
    );

    EXECUTE format('COMMENT ON FUNCTION %s IS %L', v_sig, v_body);
  END LOOP;
END;
$seed$;

-- ---------------------------------------------------------------------------
-- First sync run. Populates ai_function_catalog from the COMMENTs above
-- plus any other nf_* functions present (e.g. nf_stats_*, nf_ai_*_users).
-- ---------------------------------------------------------------------------
DO $sync$
DECLARE
  v_sync record;
  v_ins  int := 0;
  v_upd  int := 0;
  v_del  int := 0;
BEGIN
  FOR v_sync IN SELECT * FROM public.nf_ai_catalog_sync() LOOP
    IF v_sync.out_action = 'inserted' THEN v_ins := v_ins + 1;
    ELSIF v_sync.out_action = 'updated' THEN v_upd := v_upd + 1;
    ELSIF v_sync.out_action = 'deleted' THEN v_del := v_del + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'nf_ai_catalog_sync: inserted=% updated=% deleted=%', v_ins, v_upd, v_del;
END;
$sync$;

-- Explicit disable for write-intent that doesn't match the naming guard,
-- in case it was synced with enabled=true from a previous schema.
UPDATE public.ai_function_catalog
   SET enabled = false
 WHERE name IN ('nf_generate_daily_snapshot', 'nf_ai_catalog_sync');
