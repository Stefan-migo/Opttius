-- Migration: 20260702000004_idx_products_lenses_fk.sql
-- Description: FK indexes for products and lenses tables
-- (products, product_variants, categories, lens_*, contact_lens_*, cart_items)
-- Phase: 1 (Performance — Indexes)
-- Spec: S-003
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_cart_items_variant_id;
--   DROP INDEX IF EXISTS public.idx_contact_lens_encargos_created_by;
--   DROP INDEX IF EXISTS public.idx_lens_catalog_products_lens_product_id;
--   DROP INDEX IF EXISTS public.idx_lens_catalog_products_mapped_design_id;
--   DROP INDEX IF EXISTS public.idx_lens_catalog_products_mapped_material_id;
--   DROP INDEX IF EXISTS public.idx_lens_price_matrices_organization_id;
--   DROP INDEX IF EXISTS public.idx_lens_products_category_id;

BEGIN;

-- cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id
  ON public.cart_items(variant_id);

-- contact_lens_encargos
CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_created_by
  ON public.contact_lens_encargos(created_by);

-- lens_catalog_products
CREATE INDEX IF NOT EXISTS idx_lens_catalog_products_lens_product_id
  ON public.lens_catalog_products(lens_product_id);

CREATE INDEX IF NOT EXISTS idx_lens_catalog_products_mapped_design_id
  ON public.lens_catalog_products(mapped_design_id);

CREATE INDEX IF NOT EXISTS idx_lens_catalog_products_mapped_material_id
  ON public.lens_catalog_products(mapped_material_id);

-- lens_price_matrices
CREATE INDEX IF NOT EXISTS idx_lens_price_matrices_organization_id
  ON public.lens_price_matrices(organization_id);

-- lens_products
CREATE INDEX IF NOT EXISTS idx_lens_products_category_id
  ON public.lens_products(category_id);

COMMIT;
