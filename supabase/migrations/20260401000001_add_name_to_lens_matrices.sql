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
