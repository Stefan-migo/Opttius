-- Migration: 20260401000001_add_name_to_lens_matrices.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add name column to lens_price_matrices and contact_lens_price_matrices
-- Allows human-readable labels: Rango base, Alta miopía, Fallback, etc.

-- lens_price_matrices
ALTER TABLE public.lens_price_matrices
  ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN public.lens_price_matrices.name IS 'Etiqueta legible: Rango base, Alta miopía, Fallback, etc.';

-- contact_lens_price_matrices
ALTER TABLE public.contact_lens_price_matrices
  ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN public.contact_lens_price_matrices.name IS 'Etiqueta legible para la matriz.';
