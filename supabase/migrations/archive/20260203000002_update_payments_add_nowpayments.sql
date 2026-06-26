-- Migration: 20260203000002_update_payments_add_nowpayments.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add NOWPayments to allowed gateways
-- Date: 2026-02-03
-- Description: Updates the check constraints for the 'gateway' column in payments and webhook_events tables to include 'nowpayments'.

-- Update payments table constraint
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_gateway_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_gateway_check 
CHECK (gateway IN ('flow', 'mercadopago', 'paypal', 'nowpayments'));

-- Update webhook_events table constraint
ALTER TABLE public.webhook_events DROP CONSTRAINT IF EXISTS webhook_events_gateway_check;
ALTER TABLE public.webhook_events ADD CONSTRAINT webhook_events_gateway_check 
CHECK (gateway IN ('flow', 'mercadopago', 'paypal', 'nowpayments'));

-- Update comments to reflect the new gateway support
COMMENT ON TABLE public.payments IS 'Payment records from gateways (Flow, Mercado Pago, PayPal, NOWPayments) - multi-tenant';
COMMENT ON COLUMN public.payments.gateway_charge_id IS 'Gateway charge ID when applicable (Flow, Mercado Pago, PayPal, NOWPayments)';
