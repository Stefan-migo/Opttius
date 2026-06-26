-- Migration: 20260228000000_add_prescription_expiration_config.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add prescription_expiration_months to system_config
-- Configures default expiration time for prescriptions (default 6 months)
-- Used by CreatePrescriptionForm to auto-calculate expiration_date from prescription_date

INSERT INTO public.system_config (
  config_key,
  config_value,
  description,
  category,
  is_public,
  is_sensitive,
  value_type,
  organization_id,
  branch_id
)
SELECT
  'prescription_expiration_months',
  to_jsonb(6),
  'Tiempo de expiración por defecto de las recetas (en meses). Al crear una receta, la fecha de vencimiento se calcula automáticamente sumando este valor a la fecha de creación.',
  'prescriptions',
  false,
  false,
  'number',
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_config
  WHERE config_key = 'prescription_expiration_months'
  AND organization_id IS NULL
  AND branch_id IS NULL
);
