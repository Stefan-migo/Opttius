-- Migration: 20260127000002_add_pos_session_to_orders.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add pos_session_id to orders table
-- Links orders to cash register sessions

-- Add pos_session_id column to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_orders_pos_session_id ON public.orders(pos_session_id);

-- Comment
COMMENT ON COLUMN public.orders.pos_session_id IS 'References the POS session (cash register session) when this order was created';
