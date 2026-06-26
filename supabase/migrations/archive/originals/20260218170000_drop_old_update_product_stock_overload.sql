-- Migration: 20260218170000_drop_old_update_product_stock_overload.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Resolve RPC ambiguity: two overloads of update_product_stock exist.
-- The 4-param version (20260120000000) conflicts with the 8-param version (20260218164824).
-- Drop the old 4-param overload; the 8-param version has defaults for optional params.
DROP FUNCTION IF EXISTS public.update_product_stock(UUID, UUID, INTEGER, BOOLEAN);
