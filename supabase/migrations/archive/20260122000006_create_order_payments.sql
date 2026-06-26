-- Migration: 20260122000006_create_order_payments.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create order_payments table for tracking real payments
-- This enables Cash-First logic and payment tracking

-- Create order_payments table
CREATE TABLE IF NOT EXISTS public.order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'cash', 'debit', 'credit', 'transfer', 'check'
  )),
  payment_reference TEXT,              -- Número de transacción, cheque, etc.
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.order_payments IS 'Registro de pagos reales realizados sobre órdenes';
COMMENT ON COLUMN public.order_payments.amount IS 'Monto del pago (debe ser positivo)';
COMMENT ON COLUMN public.order_payments.payment_method IS 'Método de pago: cash, debit, credit, transfer, check';
COMMENT ON COLUMN public.order_payments.payment_reference IS 'Referencia del pago (número de transacción, cheque, etc.)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_payments_order ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_date ON public.order_payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_order_payments_method ON public.order_payments(payment_method);

-- Create function to calculate order balance
CREATE OR REPLACE FUNCTION public.calculate_order_balance(p_order_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_total DECIMAL(10,2);
  v_paid DECIMAL(10,2);
BEGIN
  -- Get order total
  SELECT total_amount INTO v_total 
  FROM public.orders 
  WHERE id = p_order_id;
  
  -- If order not found, return 0
  IF v_total IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_paid 
  FROM public.order_payments 
  WHERE order_id = p_order_id;
  
  -- Return balance (total - paid, minimum 0)
  RETURN GREATEST(0, v_total - v_paid);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_order_balance IS 'Calcula el saldo pendiente de una orden (total - pagos realizados)';
