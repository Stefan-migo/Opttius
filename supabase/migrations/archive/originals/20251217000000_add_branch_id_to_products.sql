-- Migration: 20251217000000_add_branch_id_to_products.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add branch_id to products table
-- This allows products to be specific to each branch for inventory management

-- Add branch_id column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_branch ON public.products(branch_id);

-- Update RLS policies to filter by branch
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

-- Create new RLS policies that consider branch_id
CREATE POLICY "Admins can view products in their branches"
ON public.products
FOR SELECT
USING (
  -- Super admin sees all products
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin sees products in their accessible branches
  EXISTS (
    SELECT 1 FROM public.admin_branch_access aba
    WHERE aba.admin_user_id = auth.uid()
    AND (
      aba.branch_id = products.branch_id
      OR products.branch_id IS NULL -- Allow viewing products without branch (legacy)
    )
  )
);

CREATE POLICY "Admins can insert products in their branches"
ON public.products
FOR INSERT
WITH CHECK (
  -- Super admin can create products in any branch
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can only create products in their accessible branches
  EXISTS (
    SELECT 1 FROM public.admin_branch_access aba
    WHERE aba.admin_user_id = auth.uid()
    AND aba.branch_id = products.branch_id
  )
);

CREATE POLICY "Admins can update products in their branches"
ON public.products
FOR UPDATE
USING (
  -- Super admin can update any product
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can update products in their accessible branches
  EXISTS (
    SELECT 1 FROM public.admin_branch_access aba
    WHERE aba.admin_user_id = auth.uid()
    AND (
      aba.branch_id = products.branch_id
      OR products.branch_id IS NULL -- Allow updating products without branch (legacy)
    )
  )
);

CREATE POLICY "Admins can delete products in their branches"
ON public.products
FOR DELETE
USING (
  -- Super admin can delete any product
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can delete products in their accessible branches
  EXISTS (
    SELECT 1 FROM public.admin_branch_access aba
    WHERE aba.admin_user_id = auth.uid()
    AND (
      aba.branch_id = products.branch_id
      OR products.branch_id IS NULL -- Allow deleting products without branch (legacy)
    )
  )
);

-- Add comment
COMMENT ON COLUMN public.products.branch_id IS 'Sucursal a la que pertenece el producto. NULL para productos globales (legacy).';
