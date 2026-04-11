-- nf_ai_ask + nf_ai_ask_deep — fix statement_timeout override so it
-- actually applies to the top-level statement that invoked the function.
--
-- Problem: v13.3 / v1.3 both used `SET LOCAL statement_timeout = '120s'`
-- inside the function body. That's a known PostgreSQL gotcha:
-- `statement_timeout` is scheduled as a wall-clock timer when the
-- top-level statement (SELECT nf_ai_ask(...)) starts executing, using
-- the role's default (authenticated = 8s on Supabase). A SET LOCAL
-- inside the function updates the GUC variable but does NOT reschedule
-- the already-running timer, so the outer statement still gets killed
-- at 8s. SET LOCAL only helps *subsequent* statements inside the txn.
--
-- Fix: use a function-attribute SET clause via ALTER FUNCTION. This is
-- applied by the fmgr on function entry and DOES reschedule the timer
-- for the enclosing top-level statement. Same mechanism we already use
-- for `search_path` on SECURITY DEFINER functions — now extended to
-- statement_timeout.
--
-- Note: we keep the SET LOCAL line in the v13.3/v1.3 function bodies as
-- a harmless no-op (it'll just re-set the same value). No body rewrite
-- needed — ALTER FUNCTION attaches the attribute to the existing proc.

ALTER FUNCTION public.nf_ai_ask(text)
  SET statement_timeout = '120s';

ALTER FUNCTION public.nf_ai_ask_deep(text, text, jsonb)
  SET statement_timeout = '120s';

-- Verification query (run manually in SQL Editor after push):
--   SELECT proname, proconfig
--     FROM pg_proc
--    WHERE proname IN ('nf_ai_ask', 'nf_ai_ask_deep');
-- Expected: proconfig contains 'statement_timeout=120s'.
