-- Migration: 20250210000000_add_admin_products_access.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Add admin access policies for products
-- This allows admin users to view, edit, and manage ALL products regardless of status

-- Drop existing restrictive policies for authenticated users viewing products
DROP POLICY IF EXISTS "Authenticated users can view active products" ON products;

-- Create admin policy for viewing ALL products (including draft and archived)
CREATE POLICY "Admin users can view all products" ON products
FOR SELECT USING (
  public.is_admin(auth.uid())
);

-- Re-create policy for regular authenticated users to view only active products
CREATE POLICY "Authenticated users can view active products" ON products
FOR SELECT USING (
  NOT public.is_admin(auth.uid()) 
  AND (status = 'active' OR status IS NULL)
);

-- Ensure admins can update all products
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;

CREATE POLICY "Admin users can update all products" ON products
FOR UPDATE USING (
  public.is_admin(auth.uid())
) WITH CHECK (
  public.is_admin(auth.uid())
);

CREATE POLICY "Authenticated users can update own products" ON products
FOR UPDATE USING (
  NOT public.is_admin(auth.uid())
  AND auth.role() = 'authenticated'
) WITH CHECK (
  NOT public.is_admin(auth.uid())
  AND auth.role() = 'authenticated'
);

-- Ensure admins can delete products
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

CREATE POLICY "Admin users can delete all products" ON products
FOR DELETE USING (
  public.is_admin(auth.uid())
);

-- Product variants admin access
DROP POLICY IF EXISTS "Anyone can view product variants" ON product_variants;

CREATE POLICY "Admin users can view all product variants" ON product_variants
FOR SELECT USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "Users can view active product variants" ON product_variants
FOR SELECT USING (
  NOT public.is_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = product_variants.product_id 
    AND status = 'active'
  )
);

-- Categories admin access
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;

CREATE POLICY "Admin users can view all categories" ON categories
FOR SELECT USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "Users can view active categories" ON categories
FOR SELECT USING (
  NOT public.is_admin(auth.uid())
  AND is_active = TRUE
);

CREATE POLICY "Admin users can manage categories" ON categories
FOR ALL USING (
  public.is_admin(auth.uid())
) WITH CHECK (
  public.is_admin(auth.uid())
);

COMMENT ON POLICY "Admin users can view all products" ON products IS 'Allows admin users to see all products regardless of status';
COMMENT ON POLICY "Authenticated users can view active products" ON products IS 'Regular users can only see active products';

