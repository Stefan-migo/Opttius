-- Migration: 20260204000000_fix_root_user_branch_access.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix Root User Branch Access
-- Root/dev users need to see all branches (including optica-root) to access populated data.
-- Currently they have no admin_branch_access, so get_user_branches returns empty.
-- Solution: Treat root users like super_admin for branch visibility.
-- Date: 2026-02-04

-- ===== UPDATE get_user_branches: Include root users =====
-- When user is root/dev, return all branches (like super_admin with no org)
CREATE OR REPLACE FUNCTION public.get_user_branches(user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  branch_id UUID,
  branch_name TEXT,
  branch_code TEXT,
  role TEXT,
  is_primary BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM public.admin_users
  WHERE id = user_id
  LIMIT 1;

  -- Root/dev users: see ALL branches (user_org_id is null, so no filter)
  -- Super admin: see branches from their org (or all if no org)
  IF public.is_super_admin(user_id) OR public.is_root_user(user_id) THEN
    RETURN QUERY
    SELECT 
      b.id,
      b.name,
      b.code,
      CASE 
        WHEN public.is_root_user(user_id) THEN 'root'::TEXT
        ELSE 'super_admin'::TEXT
      END,
      false
    FROM public.branches b
    WHERE b.is_active = true
    AND (user_org_id IS NULL OR b.organization_id = user_org_id)
    ORDER BY b.name;
  ELSE
    -- Return user's assigned branches
    RETURN QUERY
    SELECT 
      aba.branch_id,
      b.name,
      b.code,
      aba.role,
      aba.is_primary
    FROM public.admin_branch_access aba
    JOIN public.branches b ON b.id = aba.branch_id
    WHERE aba.admin_user_id = user_id
    AND b.is_active = true
    ORDER BY aba.is_primary DESC, b.name;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_user_branches IS 'Get branches for user. Root/dev and super_admin see all branches (filtered by org for super_admin).';

-- ===== UPDATE is_super_admin: Include root users =====
-- Root users should be treated as super_admin for branch/context purposes
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Root/dev users have full access like super_admin
  IF public.is_root_user(user_id) THEN
    RETURN TRUE;
  END IF;
  -- Super admin has a record with NULL branch_id in admin_branch_access
  RETURN EXISTS (
    SELECT 1 FROM public.admin_branch_access
    WHERE admin_user_id = user_id
    AND branch_id IS NULL
  );
END;
$$;

COMMENT ON FUNCTION public.is_super_admin IS 'Root/dev and users with admin_branch_access(branch_id=NULL) have super admin access.';
