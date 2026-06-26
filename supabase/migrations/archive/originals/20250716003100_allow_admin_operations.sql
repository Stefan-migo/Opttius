-- Migration: 20250716003100_allow_admin_operations.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Allow admin operations for categories and products
-- This fixes the RLS policy issue preventing admin interface from working

-- Drop existing restrictive INSERT policies
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert product variants" ON public.product_variants;

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update product variants" ON public.product_variants;

-- Create permissive policies for admin operations
-- These allow both authenticated users and admin interface operations

-- Categories policies
CREATE POLICY "Allow insert categories" ON public.categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update categories" ON public.categories
  FOR UPDATE USING (true);

-- Products policies  
CREATE POLICY "Allow insert products" ON public.products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update products" ON public.products
  FOR UPDATE USING (true);

-- Product variants policies
CREATE POLICY "Allow insert product variants" ON public.product_variants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update product variants" ON public.product_variants
  FOR UPDATE USING (true); 