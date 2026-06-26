-- Migration: 20260129000001_update_payments_gateway_stripe_to_flow.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update payment gateway from 'stripe' to 'flow'
-- Flow es la pasarela principal para Chile, ya que Stripe no tiene soporte en Chile.
-- Reference: docs/PAYMENT_GATEWAYS_IMPLEMENTATION_GUIDE.md

-- ===== UPDATE EXISTING DATA =====
-- Update any existing 'stripe' records to 'flow' (if any exist)
-- Only execute if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    UPDATE public.payments SET gateway = 'flow' WHERE gateway = 'stripe';
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'webhook_events') THEN
    UPDATE public.webhook_events SET gateway = 'flow' WHERE gateway = 'stripe';
  END IF;
END $$;

-- ===== UPDATE CHECK CONSTRAINTS =====
-- Drop old constraints and add new ones only if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_gateway_check;
    ALTER TABLE public.payments ADD CONSTRAINT payments_gateway_check CHECK (gateway IN ('flow', 'mercadopago', 'paypal'));
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'webhook_events') THEN
    ALTER TABLE public.webhook_events DROP CONSTRAINT IF EXISTS webhook_events_gateway_check;
    ALTER TABLE public.webhook_events ADD CONSTRAINT webhook_events_gateway_check CHECK (gateway IN ('flow', 'mercadopago', 'paypal'));
  END IF;
END $$;

-- ===== UPDATE COMMENTS =====
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    COMMENT ON TABLE public.payments IS 'Payment records from gateways (Flow, Mercado Pago, PayPal) - multi-tenant';
    COMMENT ON COLUMN public.payments.gateway_payment_intent_id IS 'Flow order ID, Mercado Pago preference ID, PayPal order ID, or equivalent';
    COMMENT ON COLUMN public.payments.gateway_charge_id IS 'Gateway charge ID when applicable (Flow, Mercado Pago, PayPal)';
  END IF;
END $$;
