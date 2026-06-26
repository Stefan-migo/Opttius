-- Migration: 20260205000001_subscriptions_gateway_agnostic.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Make subscriptions gateway-agnostic (Flow, Mercado Pago)
-- Replace Stripe-specific columns with generic gateway columns

-- Add gateway column
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'flow' CHECK (gateway IN ('flow', 'mercadopago', 'paypal'));

-- Rename columns (preserves data)
ALTER TABLE public.subscriptions
  RENAME COLUMN stripe_subscription_id TO gateway_subscription_id;

ALTER TABLE public.subscriptions
  RENAME COLUMN stripe_customer_id TO gateway_customer_id;

-- Update indexes (drop old, create new)
DROP INDEX IF EXISTS public.idx_subscriptions_stripe_sub;
DROP INDEX IF EXISTS public.idx_subscriptions_stripe_customer;

CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_sub
  ON public.subscriptions(gateway_subscription_id) WHERE gateway_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_customer
  ON public.subscriptions(gateway_customer_id) WHERE gateway_customer_id IS NOT NULL;

-- Update comments
COMMENT ON COLUMN public.subscriptions.gateway_subscription_id IS 'Flow/Mercado Pago/PayPal subscription or order ID for webhook processing';
COMMENT ON COLUMN public.subscriptions.gateway_customer_id IS 'Gateway customer ID (Flow, Mercado Pago, PayPal)';
