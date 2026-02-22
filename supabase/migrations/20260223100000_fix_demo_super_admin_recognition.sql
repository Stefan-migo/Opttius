-- Migration: Fix super_admin recognition for demo org users
-- Users assigned to demo org via assign-demo must be recognized as super_admin
-- when in the demo optic context, to enable multi-branch testing.
--
-- Problem: is_super_admin only checked admin_branch_access.branch_id IS NULL.
-- If that row is missing or migrations overwrite state, demo users appear as admin only.
--
-- Solution: Also treat admin_users.role = 'super_admin' as super_admin.
-- This ensures demo org owners (assign-demo sets role=super_admin) are always
-- recognized for multi-branch testing regardless of admin_branch_access state.
-- Date: 2026-02-23

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
  -- admin_users.role = 'super_admin': demo org owners and org super admins
  -- Must be recognized for multi-branch testing in demo optic
  IF EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = user_id
    AND is_active = true
    AND role = 'super_admin'
  ) THEN
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

COMMENT ON FUNCTION public.is_super_admin IS 'Root/dev, admin_users.role=super_admin, and users with admin_branch_access(branch_id=NULL) have super admin access. Ensures demo org users can test multi-branch.';
