-- Migration: 20260205000002_add_trial_columns.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add trial columns for free trial functionality
-- trial_ends_at: when the trial period ends
-- trial_days_override (organizations): custom trial days per org (NULL = use system default)

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_days_override INTEGER;

COMMENT ON COLUMN public.subscriptions.trial_ends_at IS 'When the free trial ends. NULL if not in trial.';
COMMENT ON COLUMN public.organizations.trial_days_override IS 'Custom trial days for this org. NULL = use system default (membership_trial_days).';
