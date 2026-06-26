-- Migration: 20260122000009_update_payment_methods_and_add_session.sql
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

-- ===== PART 1: UPDATE PAYMENT METHODS =====

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
  END IF;
END $$;

-- ===== PART 2: ADD POS_SESSION_ID TO ORDER_PAYMENTS =====

-- Add pos_session_id column to order_payments
ALTER TABLE public.order_payments
  ADD COLUMN IF NOT EXISTS pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_order_payments_pos_session_id 
  ON public.order_payments(pos_session_id);

-- Create index for querying payments by session and date
CREATE INDEX IF NOT EXISTS idx_order_payments_session_date 
  ON public.order_payments(pos_session_id, paid_at) 
  WHERE pos_session_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.order_payments.pos_session_id IS 'Sesión de caja (POS) en la que se realizó este pago. NULL para pagos realizados fuera de sesión.';

-- ===== COMMENTS =====
COMMENT ON COLUMN public.order_payments.payment_method IS 'Método de pago: cash (efectivo), debit (débito), credit (crédito), transfer (transferencia), check (cheque)';
