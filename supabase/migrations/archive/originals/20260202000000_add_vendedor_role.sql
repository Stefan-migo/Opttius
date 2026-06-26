-- Migration: 20260202000000_add_vendedor_role.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add 'vendedor' role to admin_users for salesperson users
-- Users with role vendedor should appear as "Vendedor" in the UI, not "Administrador"
-- Date: 2026-02-02

-- ===== VALIDACIÓN PREVIA =====
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE role NOT IN ('admin', 'super_admin', 'root', 'dev', 'employee', 'vendedor')
  ) THEN
    RAISE EXCEPTION 'Found invalid roles. Please migrate data first.';
  END IF;
END $$;

-- ===== UPDATE ADMIN_USERS ROLE CONSTRAINT =====
ALTER TABLE public.admin_users 
DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE public.admin_users 
ADD CONSTRAINT admin_users_role_check 
CHECK (role IN ('root', 'dev', 'super_admin', 'admin', 'employee', 'vendedor'));

COMMENT ON CONSTRAINT admin_users_role_check ON public.admin_users IS 
'Roles: root/dev (SaaS), super_admin (org), admin (sucursal), employee (operaciones), vendedor (ventas)';

-- ===== FUNCTION is_employee: include vendedor as operational role =====
CREATE OR REPLACE FUNCTION public.is_employee(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = user_id
    AND role IN ('employee', 'vendedor')
    AND is_active = true
  );
END;
$$;

COMMENT ON FUNCTION public.is_employee IS 'Returns true if user has employee or vendedor role (operational access, no admin permissions)';
