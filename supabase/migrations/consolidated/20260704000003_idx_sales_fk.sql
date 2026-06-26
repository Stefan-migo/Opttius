-- Migration: 20260704000003_idx_sales_fk
-- Description: FK indexes for sales tables (orders, quotes, order_items, order_payments, quote_settings)
-- Phase: 1 (Performance — Indexes)
-- Spec: S-003
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_orders_purchase_order_id;
--   DROP INDEX IF EXISTS public.idx_order_items_variant_id;
--   DROP INDEX IF EXISTS public.idx_order_payments_created_by;
--   DROP INDEX IF EXISTS public.idx_quote_settings_updated_by;
--   DROP INDEX IF EXISTS public.idx_quotes_created_by;
--   DROP INDEX IF EXISTS public.idx_quotes_far_lens_product_id;
--   DROP INDEX IF EXISTS public.idx_quotes_lens_product_id;
--   DROP INDEX IF EXISTS public.idx_quotes_lens_supplier_id;
--   DROP INDEX IF EXISTS public.idx_quotes_near_lens_product_id;
--   DROP INDEX IF EXISTS public.idx_quotes_sent_by;

BEGIN;

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_purchase_order_id
  ON public.orders(purchase_order_id);

-- order_items
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id
  ON public.order_items(variant_id);

-- order_payments
CREATE INDEX IF NOT EXISTS idx_order_payments_created_by
  ON public.order_payments(created_by);

-- quote_settings
CREATE INDEX IF NOT EXISTS idx_quote_settings_updated_by
  ON public.quote_settings(updated_by);

-- quotes (6 FK columns without index)
CREATE INDEX IF NOT EXISTS idx_quotes_created_by
  ON public.quotes(created_by);

CREATE INDEX IF NOT EXISTS idx_quotes_far_lens_product_id
  ON public.quotes(far_lens_product_id);

CREATE INDEX IF NOT EXISTS idx_quotes_lens_product_id
  ON public.quotes(lens_product_id);

CREATE INDEX IF NOT EXISTS idx_quotes_lens_supplier_id
  ON public.quotes(lens_supplier_id);

CREATE INDEX IF NOT EXISTS idx_quotes_near_lens_product_id
  ON public.quotes(near_lens_product_id);

CREATE INDEX IF NOT EXISTS idx_quotes_sent_by
  ON public.quotes(sent_by);

COMMIT;
