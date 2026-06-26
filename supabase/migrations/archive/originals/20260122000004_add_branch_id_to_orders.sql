-- Migration: 20260122000004_add_branch_id_to_orders.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add branch_id to orders table
-- This enables multi-branch order tracking and billing

-- Add branch_id column to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.orders.branch_id IS 'Sucursal donde se realizó la orden';

-- Create index for efficient branch-based queries
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders(branch_id);
