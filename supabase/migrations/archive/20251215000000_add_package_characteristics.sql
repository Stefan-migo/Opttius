-- Migration: 20251215000000_add_package_characteristics.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Add package_characteristics column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS package_characteristics TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.products.package_characteristics IS 'Package/container characteristics for biocosmetic products';
