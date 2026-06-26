-- Migration: 20260131000010_fix_admin_users_rls_recursion.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Fix infinite recursion in admin_users RLS policies
-- This migration fixes the circular dependency caused by policies querying admin_users
-- Date: 2026-01-31

-- ===== DROP ALL EXISTING POLICIES =====
DROP POLICY IF EXISTS "Root users can view all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Root users can manage all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can delete admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view own admin record" ON public.admin_users;
DROP POLICY IF EXISTS "Service role can manage admin users" ON public.admin_users;

-- ===== CREATE NON-RECURSIVE POLICIES =====
-- Policy 1: Users can view their own admin record (no recursion)
CREATE POLICY "Users can view own admin record"
ON public.admin_users
FOR SELECT
USING (id = auth.uid());

-- Policy 2: Root/dev users can view all admin users (uses SECURITY DEFINER function)
CREATE POLICY "Root users can view all admin users"
ON public.admin_users
FOR SELECT
USING (public.is_root_user(auth.uid()));

-- Policy 3: Admins can view all admin users (uses SECURITY DEFINER function to avoid recursion)
CREATE POLICY "Admins can view all admin users"
ON public.admin_users
FOR SELECT
USING (
  -- Use SECURITY DEFINER function to avoid recursion
  (SELECT public.get_admin_role(auth.uid())) IN ('admin', 'super_admin')
);

-- Policy 4: Root/dev users can manage all admin users
CREATE POLICY "Root users can manage all admin users"
ON public.admin_users
FOR ALL
USING (public.is_root_user(auth.uid()))
WITH CHECK (public.is_root_user(auth.uid()));

-- Policy 5: Admins can insert admin users (uses SECURITY DEFINER function)
CREATE POLICY "Admins can insert admin users"
ON public.admin_users
FOR INSERT
WITH CHECK (
  (SELECT public.get_admin_role(auth.uid())) IN ('admin', 'super_admin')
);

-- Policy 6: Admins can update admin users (uses SECURITY DEFINER function)
CREATE POLICY "Admins can update admin users"
ON public.admin_users
FOR UPDATE
USING (
  (SELECT public.get_admin_role(auth.uid())) IN ('admin', 'super_admin')
)
WITH CHECK (
  (SELECT public.get_admin_role(auth.uid())) IN ('admin', 'super_admin')
);

-- Policy 7: Admins can delete admin users (uses SECURITY DEFINER function)
CREATE POLICY "Admins can delete admin users"
ON public.admin_users
FOR DELETE
USING (
  (SELECT public.get_admin_role(auth.uid())) IN ('admin', 'super_admin')
);

-- ===== COMMENTS =====
COMMENT ON POLICY "Users can view own admin record" ON public.admin_users IS 
'Allow users to view their own admin record without recursion';
COMMENT ON POLICY "Root users can view all admin users" ON public.admin_users IS 
'Root/dev users can view all admin users using SECURITY DEFINER function';
COMMENT ON POLICY "Admins can view all admin users" ON public.admin_users IS 
'Admins can view all admin users using SECURITY DEFINER function to avoid recursion';
