-- Migration: 20260207000001_add_gateway_plan_id_to_subscription_tiers.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add gateway_plan_id to subscription_tiers (Phase C - Recurring)
-- Stores Mercado Pago PreApproval Plan id for recurring subscriptions

ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS gateway_plan_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_tiers_gateway_plan
  ON public.subscription_tiers(gateway_plan_id) WHERE gateway_plan_id IS NOT NULL;

COMMENT ON COLUMN public.subscription_tiers.gateway_plan_id IS 'Mercado Pago PreApproval Plan id for recurring billing (optional)';
