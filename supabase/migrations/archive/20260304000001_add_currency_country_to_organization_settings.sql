-- Migration: 20260304000001_add_currency_country_to_organization_settings.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add currency and country to organization_settings
-- Enables explicit locale configuration per organization for AI agent, invoices, and multi-country support.
-- The AI agent uses these (with fallbacks) to know which currency and country the optica operates in.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'currency') THEN
        ALTER TABLE public.organization_settings ADD COLUMN currency TEXT;
        COMMENT ON COLUMN public.organization_settings.currency IS 'Moneda de la organización (CLP, ARS, MXN, EUR, USD, etc.). Si no se define, se infiere de teléfono/dirección/tipo de documento.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'country') THEN
        ALTER TABLE public.organization_settings ADD COLUMN country TEXT;
        COMMENT ON COLUMN public.organization_settings.country IS 'País de operación (Chile, Argentina, México, España, etc.). Usado para contexto del agente IA y facturación.';
    END IF;
END $$;
