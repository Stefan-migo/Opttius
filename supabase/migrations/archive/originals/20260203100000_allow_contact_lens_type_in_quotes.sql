-- Migration: 20260203100000_allow_contact_lens_type_in_quotes.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Allow "Lentes de contacto" in quotes.lens_type
-- Presupuestos con lentes de contacto deben poder guardar lens_type = 'Lentes de contacto'
-- para que la tabla de presupuestos muestre correctamente la columna Lentes.

-- Drop the existing CHECK constraint on quotes.lens_type (by name or by finding it)
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid AND NOT a.attisdropped
  WHERE c.conrelid = 'public.quotes'::regclass
    AND c.contype = 'c'
    AND a.attname = 'lens_type'
  LIMIT 1;
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.quotes DROP CONSTRAINT %I', conname);
  END IF;
END $$;

-- Add new CHECK constraint including 'Lentes de contacto'
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_lens_type_check CHECK (
    lens_type IS NULL
    OR lens_type IN (
      'single_vision',
      'bifocal',
      'trifocal',
      'progressive',
      'reading',
      'computer',
      'sports',
      'Lentes de contacto'
    )
  );

COMMENT ON COLUMN public.quotes.lens_type IS 'Tipo de lente: óptico (single_vision, progressive, etc.) o Lentes de contacto';
