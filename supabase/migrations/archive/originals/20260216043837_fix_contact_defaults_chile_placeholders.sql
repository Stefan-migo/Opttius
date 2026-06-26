-- Migration: 20260216043837_fix_contact_defaults_chile_placeholders.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix contact defaults - Chile placeholders instead of Argentina
-- New optics should not have Argentina data pre-loaded. Use empty/neutral placeholders.
-- Date: 2026-02-16

-- Update global contact defaults (organization_id IS NULL AND branch_id IS NULL)
-- config_value is JSONB: use '"value"' for strings, '""' for empty
UPDATE public.system_config
SET config_value = '""'::jsonb
WHERE config_key = 'address'
  AND organization_id IS NULL
  AND branch_id IS NULL;

UPDATE public.system_config
SET config_value = '""'::jsonb
WHERE config_key = 'phone_number'
  AND organization_id IS NULL
  AND branch_id IS NULL;

UPDATE public.system_config
SET config_value = '"contacto@tuoptica.cl"'::jsonb
WHERE config_key = 'contact_email'
  AND organization_id IS NULL
  AND branch_id IS NULL;

UPDATE public.system_config
SET config_value = '"soporte@tuoptica.cl"'::jsonb
WHERE config_key = 'support_email'
  AND organization_id IS NULL
  AND branch_id IS NULL;
