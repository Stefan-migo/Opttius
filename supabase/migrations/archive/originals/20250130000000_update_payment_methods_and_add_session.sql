-- Migration: 20250130000000_update_payment_methods_and_add_session.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update payment methods and add pos_session_id to order_payments
-- Part 1: Update payment method constraints to replace 'deposit' with 'transfer'
-- Part 2: Add pos_session_id to order_payments for session tracking
--
-- NOTE: This migration checks if order_payments table exists before modifying it

-- ===== PART 1: UPDATE PAYMENT METHODS =====

DO $$
BEGIN
  -- Check if order_payments table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'order_payments'
  ) THEN
    -- First, update existing 'deposit' payments to 'transfer' in order_payments
    UPDATE public.order_payments
    SET payment_method = 'transfer'
    WHERE payment_method = 'deposit';

    -- Update the constraint to include 'transfer' and remove 'deposit'
    ALTER TABLE public.order_payments
      DROP CONSTRAINT IF EXISTS order_payments_payment_method_check;

    ALTER TABLE public.order_payments
      ADD CONSTRAINT order_payments_payment_method_check
      CHECK (payment_method IN ('cash', 'debit', 'credit', 'transfer', 'check'));

    -- Add pos_session_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_payments' 
      AND column_name = 'pos_session_id'
    ) THEN
      ALTER TABLE public.order_payments
        ADD COLUMN pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL;
      
      CREATE INDEX IF NOT EXISTS idx_order_payments_pos_session_id 
        ON public.order_payments(pos_session_id) 
        WHERE pos_session_id IS NOT NULL;
    END IF;
  ELSE
    RAISE NOTICE 'Table order_payments does not exist yet, skipping payment methods update';
  END IF;
END $$;

-- Update orders.payment_method_type if it exists (check first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'payment_method_type'
  ) THEN
    -- Update existing 'deposit' to 'transfer' in orders
    UPDATE public.orders
    SET payment_method_type = 'transfer'
    WHERE payment_method_type = 'deposit';

    -- Update constraint
    ALTER TABLE public.orders
      DROP CONSTRAINT IF EXISTS orders_payment_method_type_check;

    ALTER TABLE public.orders
      ADD CONSTRAINT orders_payment_method_type_check
      CHECK (payment_method_type IN ('cash', 'debit', 'credit', 'transfer', 'check', 'mercadopago', 'stripe'));
  END IF;
END $$;

-- ===== PART 2: ADD POS_SESSION_ID TO ORDERS =====

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'orders'
  ) THEN
    -- Add pos_session_id to orders if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'pos_session_id'
    ) THEN
      ALTER TABLE public.orders
        ADD COLUMN pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL;
      
      CREATE INDEX IF NOT EXISTS idx_orders_pos_session_id 
        ON public.orders(pos_session_id) 
        WHERE pos_session_id IS NOT NULL;
    END IF;
  END IF;
END $$;
