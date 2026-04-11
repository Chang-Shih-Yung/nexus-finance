-- ============================================================================
-- nf_ai_config_list + nf_ai_config_set — UI-facing read/write RPCs.
--
-- Goal:
--   Let a simple frontend panel read the full tunables table and tweak
--   individual rows without opening the Supabase SQL editor. Admin gating
--   is intentionally behind the *write* call, not the *read* call:
--
--     - nf_ai_config_list()  — authenticated + service_role can SELECT.
--       Non-admins see the rows and can open the panel in read-only mode.
--
--     - nf_ai_config_set()   — service_role only. Any other role gets a
--       clean "permission denied" error the frontend can turn into a
--       "read-only mode" toast.
--
--   The write path also type-validates against value_type (int/numeric/
--   bool/text) so the UI can't accidentally park 'hello' into an int key
--   and crash the getters later.
--
-- Safety:
--   - Purely additive — two new functions, no table changes.
--   - SECURITY DEFINER with locked search_path.
--   - Write function checks caller role explicitly; does not rely on RLS
--     alone because the table's RLS is already service_role-only.
-- ============================================================================

-- ── Read: return full tunables table ──────────────────────────────
CREATE OR REPLACE FUNCTION public.nf_ai_config_list()
RETURNS TABLE (
  key         text,
  value       text,
  value_type  text,
  description text,
  updated_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT key, value, value_type, description, updated_at
  FROM public.nf_ai_config
  ORDER BY key;
$$;

COMMENT ON FUNCTION public.nf_ai_config_list() IS
'Returns all nf_ai_config rows for the settings panel. SECURITY DEFINER so
authenticated users can render the panel in read-only mode without needing
direct table access.';

GRANT EXECUTE ON FUNCTION public.nf_ai_config_list()
  TO authenticated, service_role;

-- ── Write: update a single row with type validation ───────────────
CREATE OR REPLACE FUNCTION public.nf_ai_config_set(
  p_key   text,
  p_value text
)
RETURNS public.nf_ai_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row         public.nf_ai_config;
  v_value_type  text;
  v_dummy_int   int;
  v_dummy_num   numeric;
BEGIN
  -- Admin gating. SECURITY DEFINER lets us see the table regardless of the
  -- caller's RLS, so we must check the caller role ourselves. Only the
  -- service_role JWT (used by the "Save" button when the operator has the
  -- service key configured) is allowed to mutate.
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'nf_ai_config_set: only service_role may write (caller role: %)',
      COALESCE(current_setting('request.jwt.claim.role', true), 'anonymous')
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- Look up the row's declared type so we can validate the new value.
  SELECT value_type INTO v_value_type
  FROM public.nf_ai_config
  WHERE key = p_key;

  IF v_value_type IS NULL THEN
    RAISE EXCEPTION 'nf_ai_config_set: unknown key %', p_key
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;

  -- Type-check before the UPDATE so getters never see a bad cast.
  CASE v_value_type
    WHEN 'int' THEN
      BEGIN
        v_dummy_int := p_value::int;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'nf_ai_config_set: value % is not a valid int for key %',
          p_value, p_key USING ERRCODE = '22023';
      END;
    WHEN 'numeric' THEN
      BEGIN
        v_dummy_num := p_value::numeric;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'nf_ai_config_set: value % is not a valid numeric for key %',
          p_value, p_key USING ERRCODE = '22023';
      END;
    WHEN 'bool' THEN
      IF p_value NOT IN ('true', 'false', 't', 'f', '1', '0') THEN
        RAISE EXCEPTION 'nf_ai_config_set: value % is not a valid bool for key %',
          p_value, p_key USING ERRCODE = '22023';
      END IF;
    WHEN 'text' THEN
      -- Any string is fine. Empty string is allowed so the operator can
      -- clear an override if we ever add optional keys.
      NULL;
    ELSE
      RAISE EXCEPTION 'nf_ai_config_set: unsupported value_type % for key %',
        v_value_type, p_key USING ERRCODE = '22023';
  END CASE;

  UPDATE public.nf_ai_config
  SET value = p_value
  WHERE key = p_key
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.nf_ai_config_set(text, text) IS
'Updates a single nf_ai_config row with type validation. Requires
service_role JWT claim; otherwise raises insufficient_privilege so the
frontend can show a read-only indicator.';

-- Both roles can call it, but the function body will reject non-service_role.
-- Granting authenticated lets the error flow back to the UI cleanly rather
-- than surfacing a generic "function does not exist" from PostgREST.
GRANT EXECUTE ON FUNCTION public.nf_ai_config_set(text, text)
  TO authenticated, service_role;
