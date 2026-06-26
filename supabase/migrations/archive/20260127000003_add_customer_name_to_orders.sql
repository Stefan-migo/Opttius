-- Migration: 20260127000003_add_customer_name_to_orders.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add customer_name field to orders table
-- This allows storing customer name for easier identification in POS sales
-- especially for unregistered customers

-- Add customer_name column if it doesn't exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add comment
COMMENT ON COLUMN public.orders.customer_name IS 'Nombre completo del cliente para identificación rápida en ventas POS. Puede ser de cliente registrado o no registrado.';
