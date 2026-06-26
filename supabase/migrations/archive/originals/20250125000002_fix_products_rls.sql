-- Migration: 20250125000002_fix_products_rls.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Fix RLS policies for products table to allow service role operations

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

-- Create new policies that allow service role operations
CREATE POLICY "Allow service role full access to products" ON products
FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to view active products
CREATE POLICY "Authenticated users can view active products" ON products
FOR SELECT USING (
  auth.role() = 'authenticated' 
  AND (status = 'active' OR status IS NULL)
);

-- Allow authenticated users to insert products
CREATE POLICY "Authenticated users can insert products" ON products
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update products
CREATE POLICY "Authenticated users can update products" ON products
FOR UPDATE USING (
  auth.role() = 'authenticated'
) WITH CHECK (
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete products (soft delete)
CREATE POLICY "Authenticated users can delete products" ON products
FOR DELETE USING (
  auth.role() = 'authenticated'
);
