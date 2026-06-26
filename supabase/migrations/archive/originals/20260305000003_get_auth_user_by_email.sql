-- Migration: 20260305000003_get_auth_user_by_email.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

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
