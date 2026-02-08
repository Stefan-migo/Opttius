-- Migration: Remove unwanted default categories ("Lentes", "Lentes Monofocales", "Lentes Bifocales")
-- These should not be default categories as lenses are handled via lens families/matrices

-- First, ensure they are not protected default categories
UPDATE public.categories
SET is_default = FALSE
WHERE slug IN ('lentes', 'lentes-monofocales', 'lentes-bifocales');

-- Then delete them
DELETE FROM public.categories
WHERE slug IN ('lentes', 'lentes-monofocales', 'lentes-bifocales');
