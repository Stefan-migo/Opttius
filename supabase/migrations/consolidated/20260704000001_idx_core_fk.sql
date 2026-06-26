-- Migration: 20260704000001_idx_core_fk
-- Description: FK indexes for core tables (profiles, admin_users, branches, organizations)
-- Phase: 1 (Performance — Indexes)
-- Spec: S-003
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_admin_users_created_by;
--   DROP INDEX IF EXISTS public.idx_profiles_preferred_branch_id;

BEGIN;

CREATE INDEX IF NOT EXISTS idx_admin_users_created_by
  ON public.admin_users(created_by);

CREATE INDEX IF NOT EXISTS idx_profiles_preferred_branch_id
  ON public.profiles(preferred_branch_id);

COMMIT;
