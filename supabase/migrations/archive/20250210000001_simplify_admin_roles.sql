-- Migration: 20250210000001_simplify_admin_roles.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Simplify admin roles to only 'admin'
-- This migration removes multiple role types and keeps only 'admin'

-- First, drop the old constraint to allow updates
ALTER TABLE public.admin_users 
DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- Then, update all existing admin users to 'admin' role
UPDATE public.admin_users
SET 
  role = 'admin',
  permissions = '{
    "orders": ["read", "create", "update", "delete"],
    "products": ["read", "create", "update", "delete"],
    "customers": ["read", "create", "update", "delete"],
    "analytics": ["read"],
    "settings": ["read", "create", "update", "delete"],
    "admin_users": ["read", "create", "update", "delete"],
    "support": ["read", "create", "update", "delete"],
    "bulk_operations": ["read", "create", "update", "delete"]
  }'::jsonb,
  updated_at = NOW()
WHERE role IN ('super_admin', 'store_manager', 'customer_support', 'content_manager') OR role IS NULL;

-- Add new simplified constraint
ALTER TABLE public.admin_users 
ADD CONSTRAINT admin_users_role_check 
CHECK (role = 'admin');

-- Update the get_admin_role function to work with simplified roles
CREATE OR REPLACE FUNCTION public.get_admin_role(user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role TEXT;
BEGIN
  SELECT role INTO admin_role
  FROM public.admin_users 
  WHERE id = user_id 
  AND is_active = true;
  
  RETURN admin_role;
END;
$$;

-- Update RLS policies to work with simplified 'admin' role
-- Drop old policies to avoid recursion
DROP POLICY IF EXISTS "Super admins can manage admin users" ON public.admin_users;

-- Policy for SELECT (allows admins to view all admin users)
CREATE POLICY "Admins can view all admin users"
ON public.admin_users
FOR SELECT
USING (
  -- Uses SECURITY DEFINER function to avoid recursion
  (SELECT public.get_admin_role(auth.uid())) = 'admin'
);

-- Policy for INSERT (allows admins to create new admins)
CREATE POLICY "Admins can insert admin users"
ON public.admin_users
FOR INSERT
WITH CHECK (
  (SELECT public.get_admin_role(auth.uid())) = 'admin'
);

-- Policy for UPDATE (allows admins to update admin users)
CREATE POLICY "Admins can update admin users"
ON public.admin_users
FOR UPDATE
USING (
  (SELECT public.get_admin_role(auth.uid())) = 'admin'
)
WITH CHECK (
  (SELECT public.get_admin_role(auth.uid())) = 'admin'
);

-- Policy for DELETE (allows admins to delete admin users)
CREATE POLICY "Admins can delete admin users"
ON public.admin_users
FOR DELETE
USING (
  (SELECT public.get_admin_role(auth.uid())) = 'admin'
);

-- Update the handle_new_admin_user function
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if this is the designated admin email
  IF NEW.email = 'daluzalkimya@gmail.com' THEN
    INSERT INTO public.admin_users (
      id,
      email,
      role,
      permissions,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      'admin',
      '{
        "orders": ["read", "create", "update", "delete"],
        "products": ["read", "create", "update", "delete"],
        "customers": ["read", "create", "update", "delete"],
        "analytics": ["read"],
        "settings": ["read", "create", "update", "delete"],
        "admin_users": ["read", "create", "update", "delete"],
        "support": ["read", "create", "update", "delete"],
        "bulk_operations": ["read", "create", "update", "delete"]
      }'::jsonb,
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      is_active = true,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON TABLE public.admin_users IS 'Administrative users with full access to admin dashboard - simplified to single admin role';

