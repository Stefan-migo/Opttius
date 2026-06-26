-- Migration: 20260207000000_add_subscription_gateway_payment_method.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add gateway_payment_method_id to subscriptions (Phase C - Save payment method)
-- Stores Mercado Pago card id for saved card / recurring billing

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS gateway_payment_method_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_payment_method
  ON public.subscriptions(gateway_payment_method_id) WHERE gateway_payment_method_id IS NOT NULL;

COMMENT ON COLUMN public.subscriptions.gateway_payment_method_id IS 'Gateway saved card/payment method ID (e.g. Mercado Pago card id for recurring)';
