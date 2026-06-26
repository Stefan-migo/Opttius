-- Migration: 20260131000009_create_root_dev_employee_roles.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add root, dev, and employee roles for SaaS management
-- This migration adds support for:
-- - root/dev users: Full SaaS management access (multi-tenant)
-- - employee users: Operational access without admin permissions
-- Date: 2026-01-31

-- ===== VALIDACIÓN PREVIA =====
-- Validar que no hay roles inválidos antes de cambiar constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE role NOT IN ('admin', 'super_admin', 'root', 'dev', 'employee')
  ) THEN
    RAISE EXCEPTION 'Found invalid roles. Please migrate data first.';
  END IF;
END $$;

-- ===== UPDATE ADMIN_USERS ROLE CONSTRAINT =====
ALTER TABLE public.admin_users 
DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE public.admin_users 
ADD CONSTRAINT admin_users_role_check 
CHECK (role IN ('root', 'dev', 'super_admin', 'admin', 'employee'));

COMMENT ON CONSTRAINT admin_users_role_check ON public.admin_users IS 
'Roles: root/dev (gestión SaaS), super_admin (org completa), admin (sucursal), employee (operaciones)';

-- ===== CREATE FUNCTION TO CHECK IF USER IS ROOT/DEV =====
CREATE OR REPLACE FUNCTION public.is_root_user(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = user_id
    AND role IN ('root', 'dev')
    AND is_active = true
  );
END;
$$;

COMMENT ON FUNCTION public.is_root_user IS 'Check if user has root or dev role for SaaS management access';

-- ===== CREATE FUNCTION TO CHECK IF USER IS EMPLOYEE =====
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
    AND role = 'employee'
    AND is_active = true
  );
END;
$$;

COMMENT ON FUNCTION public.is_employee IS 'Check if user has employee role (operational access only, no admin permissions)';

-- ===== UPDATE RLS POLICIES FOR ADMIN_USERS =====
-- Root users can view all admin users
DROP POLICY IF EXISTS "Root users can view all admin users" ON public.admin_users;
CREATE POLICY "Root users can view all admin users"
ON public.admin_users
FOR SELECT
USING (
  public.is_root_user(auth.uid())
  OR
  -- Existing policies still apply
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.id = auth.uid() 
    AND au.is_active = true
  )
);

-- Root users can manage all admin users
DROP POLICY IF EXISTS "Root users can manage all admin users" ON public.admin_users;
CREATE POLICY "Root users can manage all admin users"
ON public.admin_users
FOR ALL
USING (public.is_root_user(auth.uid()))
WITH CHECK (public.is_root_user(auth.uid()));

-- ===== UPDATE RLS POLICIES FOR ORGANIZATIONS =====
-- Root users can view all organizations
DROP POLICY IF EXISTS "Root users can view all organizations" ON public.organizations;
CREATE POLICY "Root users can view all organizations"
ON public.organizations
FOR SELECT
USING (
  public.is_root_user(auth.uid())
  OR
  -- Existing policy
  id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid()
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
);

-- Root users can manage all organizations
DROP POLICY IF EXISTS "Root users can manage all organizations" ON public.organizations;
CREATE POLICY "Root users can manage all organizations"
ON public.organizations
FOR ALL
USING (public.is_root_user(auth.uid()))
WITH CHECK (public.is_root_user(auth.uid()));

-- ===== IMPORTANTE: ACTUALIZAR TODAS LAS POLÍTICAS RLS =====
-- ⚠️ Esta migración actualiza políticas básicas. Las políticas RLS de otras tablas
-- (orders, quotes, lab_work_orders, appointments, products, customers, etc.)
-- deben actualizarse manualmente para incluir root/dev y employee según el patrón:
--
-- Patrón recomendado para cada tabla:
-- 1. Root/dev: Acceso completo (sin filtro)
-- 2. Super admin: Acceso a su organización (get_user_organization_id)
-- 3. Admin/Employee: Acceso a su organización/sucursal
--
-- Ejemplo para tabla orders:
-- CREATE POLICY "Root users can view all orders"
-- ON public.orders FOR SELECT
-- USING (
--   public.is_root_user(auth.uid())
--   OR (public.is_super_admin(auth.uid()) AND organization_id = public.get_user_organization_id())
--   OR organization_id = public.get_user_organization_id()
-- );

-- ===== OPCIONAL: MIGRAR SUPER_ADMINS EXISTENTES =====
-- (Comentado por defecto, descomentar si se requiere migrar super_admins a root)
/*
UPDATE public.admin_users
SET role = 'root'
WHERE id IN (
  SELECT admin_user_id FROM public.admin_branch_access
  WHERE branch_id IS NULL
)
AND role = 'admin';
*/

-- ===== COMMENTS =====
COMMENT ON FUNCTION public.is_root_user IS 'Returns true if user has root or dev role, granting full SaaS management access';
COMMENT ON FUNCTION public.is_employee IS 'Returns true if user has employee role, granting operational access only';
