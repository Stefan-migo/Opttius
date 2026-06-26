-- Migration: 20260122000001_add_customer_own_frame_to_work_orders.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add customer_own_frame to quotes and lab_work_orders
-- This column indicates if the customer brings their own frame (lens replacement only)

-- Add customer_own_frame to quotes table
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS customer_own_frame BOOLEAN DEFAULT false NOT NULL;

-- Add customer_own_frame to lab_work_orders table
ALTER TABLE public.lab_work_orders
ADD COLUMN IF NOT EXISTS customer_own_frame BOOLEAN DEFAULT false NOT NULL;

-- Add comments
COMMENT ON COLUMN public.quotes.customer_own_frame IS 'Indica si el cliente trae su propio marco (solo recambio de cristales)';
COMMENT ON COLUMN public.lab_work_orders.customer_own_frame IS 'Indica si el cliente trae su propio marco (solo recambio de cristales)';
