-- ============================================================================
-- Small, deterministic helpers shared by nf_ai_ask and nf_ai_ask_deep.
--
-- Scope note:
--   The original Wave 5 plan was to extract a single `nf_ai_call_gemma()`
--   helper that wraps curl timeout + POST + status check + JSON parse. That
--   turned out to be risky: the three call sites (Call 1 tool-dispatch, Call
--   2 narration-with-fallback, Deep standalone) have subtly different error
--   taxonomies and graceful-degradation rules. Forcing them into one helper
--   would mean designing a universal error contract and retrofitting every
--   return shape — exactly the kind of change the user asked us NOT to make
--   without real test coverage.
--
--   So Wave 5 ships the *safe* subset: two tiny deterministic helpers that
--   each callsite can opt into without changing its error handling. The big
--   HTTP wrapper is deferred to a later PR when we have an AI integration
--   test harness to catch regressions.
--
--   These helpers are purely additive — no existing function is modified.
--   Consumption is left for the next nf_ai_ask / nf_ai_ask_deep revision.
-- ============================================================================

-- ── Gemini endpoint URL builder ────────────────────────────────────
-- Same string format as the inline `format(...)` calls in nf_ai_ask lines
-- ~381-388 and nf_ai_ask_deep line ~1022. Centralising makes it a one-line
-- swap if Google ever changes the path (e.g. v1beta → v1) or if we want
-- to switch to Vertex AI.
CREATE OR REPLACE FUNCTION public.nf_ai_gemma_endpoint(
  p_model   text,
  p_api_key text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT format(
    'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
    p_model, p_api_key
  );
$$;

COMMENT ON FUNCTION public.nf_ai_gemma_endpoint(text, text) IS
'Builds the Google Generative Language API endpoint for a given model name
and API key. IMMUTABLE so it can be inlined. Used by nf_ai_ask and
nf_ai_ask_deep to avoid duplicating the v1beta URL string.';

GRANT EXECUTE ON FUNCTION public.nf_ai_gemma_endpoint(text, text)
  TO authenticated, service_role;

-- ── JWT dummy-claim guard ──────────────────────────────────────────
-- Both AI functions have this six-line block near the top:
--   BEGIN
--     v_existing_sub := current_setting('request.jwt.claim.sub', true);
--   EXCEPTION WHEN OTHERS THEN v_existing_sub := NULL;
--   END;
--   IF v_existing_sub IS NULL OR v_existing_sub = '' THEN
--     PERFORM set_config('request.jwt.claim.sub', '00000000-...', true);
--   END IF;
--
-- Purpose: lets downstream SECURITY DEFINER RPCs that assume a JWT claim
-- (e.g. for RLS) still work when the caller is the scheduler or a test
-- harness with no real JWT. The extraction is a pure no-arg side-effect
-- helper — idempotent and safe to call multiple times.
CREATE OR REPLACE FUNCTION public.nf_ai_ensure_jwt_sub()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_sub text;
BEGIN
  BEGIN
    v_sub := current_setting('request.jwt.claim.sub', true);
  EXCEPTION WHEN OTHERS THEN
    v_sub := NULL;
  END;
  IF v_sub IS NULL OR v_sub = '' THEN
    PERFORM set_config(
      'request.jwt.claim.sub',
      '00000000-0000-0000-0000-000000000000',
      true
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.nf_ai_ensure_jwt_sub() IS
'Ensures request.jwt.claim.sub is set so downstream RLS-aware RPCs do not
trip on a missing claim. Idempotent. Used by nf_ai_ask and nf_ai_ask_deep
when called outside a real authenticated session (scheduler, tests).';

GRANT EXECUTE ON FUNCTION public.nf_ai_ensure_jwt_sub()
  TO authenticated, service_role;
