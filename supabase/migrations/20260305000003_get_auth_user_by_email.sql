-- Migration: Helper to get auth user id by email (for demo request approval flow)
-- Used when approving demo requests to check if user already exists

CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_auth_user_id_by_email(text) IS 'Returns auth.users.id for given email. Used by demo approval flow.';
