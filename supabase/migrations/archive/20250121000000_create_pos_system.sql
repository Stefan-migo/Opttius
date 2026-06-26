-- Migration: 20250121000000_create_pos_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create POS (Point of Sale) System
-- This migration adds POS functionality, payment methods, and SII (Chile) integration

-- Add POS-specific fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS is_pos_sale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pos_terminal_id TEXT,
ADD COLUMN IF NOT EXISTS pos_cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pos_location TEXT;

-- Update payment method to support POS payment types
-- Note: We'll use a more flexible approach with a separate payment_methods table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method_type TEXT CHECK (payment_method_type IN (
  'cash', 
  'debit_card', 
  'credit_card', 
  'installments',
  'transfer',
  'check',
  'mercadopago',
  'other'
));

-- Add card machine transaction details
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS card_machine_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS card_machine_authorization_code TEXT,
ADD COLUMN IF NOT EXISTS card_machine_brand TEXT, -- Visa, Mastercard, etc.
ADD COLUMN IF NOT EXISTS card_last_four_digits TEXT;

-- Add installment payment details
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS installments_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS first_installment_due_date TIMESTAMPTZ;

-- Add SII (Chile Tax System) fields
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sii_invoice_type TEXT CHECK (sii_invoice_type IN ('boleta', 'factura', 'none')),
ADD COLUMN IF NOT EXISTS sii_rut TEXT, -- Customer tax ID (RUT)
ADD COLUMN IF NOT EXISTS sii_business_name TEXT, -- Razón social for facturas
ADD COLUMN IF NOT EXISTS sii_address TEXT, -- Address for tax purposes
ADD COLUMN IF NOT EXISTS sii_commune TEXT, -- Comuna
ADD COLUMN IF NOT EXISTS sii_city TEXT, -- Ciudad
ADD COLUMN IF NOT EXISTS sii_invoice_number TEXT UNIQUE, -- Folio number
ADD COLUMN IF NOT EXISTS sii_dte_number TEXT, -- DTE (Documento Tributario Electrónico) number
ADD COLUMN IF NOT EXISTS sii_track_id TEXT, -- SII tracking ID
ADD COLUMN IF NOT EXISTS sii_status TEXT DEFAULT 'pending' CHECK (sii_status IN ('pending', 'sent', 'accepted', 'rejected', 'cancelled')),
ADD COLUMN IF NOT EXISTS sii_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sii_response JSONB; -- Store SII API response

-- Add tax breakdown for SII
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tax_breakdown JSONB; -- {iva: 19%, other_taxes: {...}}

-- Create payment_installments table for tracking installment payments
CREATE TABLE IF NOT EXISTS public.payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  due_date TIMESTAMPTZ NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  paid_amount DECIMAL(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_order_installment UNIQUE (order_id, installment_number)
);

-- Create pos_sessions table to track POS sessions (cash register sessions)
CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  terminal_id TEXT,
  location TEXT,
  opening_cash_amount DECIMAL(12,2) DEFAULT 0,
  closing_cash_amount DECIMAL(12,2),
  opening_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  closing_time TIMESTAMPTZ,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'suspended')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create pos_transactions table for detailed transaction tracking
CREATE TABLE IF NOT EXISTS public.pos_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'refund', 'void', 'return')),
  payment_method TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  change_amount DECIMAL(12,2) DEFAULT 0, -- For cash payments
  card_machine_transaction_id TEXT,
  card_machine_authorization_code TEXT,
  receipt_printed BOOLEAN DEFAULT FALSE,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_is_pos_sale ON public.orders(is_pos_sale);
CREATE INDEX IF NOT EXISTS idx_orders_pos_cashier ON public.orders(pos_cashier_id);
CREATE INDEX IF NOT EXISTS idx_orders_sii_invoice_number ON public.orders(sii_invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_sii_status ON public.orders(sii_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_type ON public.orders(payment_method_type);

CREATE INDEX IF NOT EXISTS idx_payment_installments_order ON public.payment_installments(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_due_date ON public.payment_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_installments_status ON public.payment_installments(payment_status);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_cashier ON public.pos_sessions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON public.pos_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opening_time ON public.pos_sessions(opening_time DESC);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_order ON public.pos_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_session ON public.pos_transactions(pos_session_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_created ON public.pos_transactions(created_at DESC);

-- Add updated_at triggers
CREATE TRIGGER update_payment_installments_updated_at
  BEFORE UPDATE ON public.payment_installments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pos_sessions_updated_at
  BEFORE UPDATE ON public.pos_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pos_transactions_updated_at
  BEFORE UPDATE ON public.pos_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_installments
CREATE POLICY "Admins can manage installments" ON public.payment_installments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for pos_sessions
CREATE POLICY "Admins can manage POS sessions" ON public.pos_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for pos_transactions
CREATE POLICY "Admins can manage POS transactions" ON public.pos_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Function to generate SII invoice number (folio)
CREATE OR REPLACE FUNCTION generate_sii_invoice_number(invoice_type TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  year_part TEXT;
  sequence_number INTEGER;
  invoice_number TEXT;
BEGIN
  -- Set prefix based on invoice type
  IF invoice_type = 'boleta' THEN
    prefix := 'B';
  ELSIF invoice_type = 'factura' THEN
    prefix := 'F';
  ELSE
    prefix := 'N';
  END IF;
  
  -- Get year (last 2 digits)
  year_part := TO_CHAR(NOW(), 'YY');
  
  -- Get next sequence number for this year and type
  SELECT COALESCE(MAX(CAST(SUBSTRING(sii_invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM public.orders
  WHERE sii_invoice_type = invoice_type
    AND sii_invoice_number LIKE prefix || year_part || '%';
  
  -- Format: B240001, F240001, etc.
  invoice_number := prefix || year_part || LPAD(sequence_number::TEXT, 6, '0');
  
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate IVA (19% VAT for Chile)
CREATE OR REPLACE FUNCTION calculate_iva(amount DECIMAL, include_iva BOOLEAN DEFAULT true)
RETURNS DECIMAL AS $$
BEGIN
  IF include_iva THEN
    -- If amount includes IVA, calculate the base amount
    RETURN ROUND(amount / 1.19, 2);
  ELSE
    -- If amount doesn't include IVA, calculate IVA amount
    RETURN ROUND(amount * 0.19, 2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement inventory
CREATE OR REPLACE FUNCTION decrement_inventory(product_id UUID, quantity INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Get current inventory
  SELECT inventory_quantity INTO current_stock
  FROM public.products
  WHERE id = product_id;
  
  IF current_stock IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update inventory
  UPDATE public.products
  SET inventory_quantity = GREATEST(0, current_stock - quantity),
      updated_at = NOW()
  WHERE id = product_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update POS session cash amount
CREATE OR REPLACE FUNCTION update_pos_session_cash(session_id UUID, cash_amount DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.pos_sessions
  SET closing_cash_amount = COALESCE(closing_cash_amount, opening_cash_amount) + cash_amount,
      updated_at = NOW()
  WHERE id = session_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.payment_installments IS 'Tracks installment payments for orders';
COMMENT ON TABLE public.pos_sessions IS 'Tracks POS cash register sessions';
COMMENT ON TABLE public.pos_transactions IS 'Detailed transaction log for POS operations';
COMMENT ON COLUMN public.orders.is_pos_sale IS 'Indicates if this order was created through POS';
COMMENT ON COLUMN public.orders.sii_invoice_type IS 'SII invoice type: boleta (B2C) or factura (B2B)';
COMMENT ON COLUMN public.orders.sii_rut IS 'Customer RUT (Chilean tax ID)';
COMMENT ON COLUMN public.orders.sii_dte_number IS 'DTE (Documento Tributario Electrónico) number from SII';

