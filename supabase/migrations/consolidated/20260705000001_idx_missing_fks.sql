-- Migration: 20260705000001_idx_missing_fks
-- Description: Add indexes for 6 FKs missed during Phase 1 index creation
-- Rollback: DROP INDEX IF EXISTS idx_agreement_institutional_invoices_organization_id;
--           DROP INDEX IF EXISTS idx_lab_work_orders_frame_product_id;
--           DROP INDEX IF EXISTS idx_lens_products_catalog_product_id;
--           DROP INDEX IF EXISTS idx_optical_internal_support_tickets_related_order_id;
--           DROP INDEX IF EXISTS idx_quotes_prescription_id;
--           DROP INDEX IF EXISTS idx_quotes_frame_product_id;

BEGIN;

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_organization_id
  ON public.agreement_institutional_invoices(organization_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_frame_product_id
  ON public.lab_work_orders(frame_product_id);

CREATE INDEX IF NOT EXISTS idx_lens_products_catalog_product_id
  ON public.lens_products(catalog_product_id);

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_related_order_id
  ON public.optical_internal_support_tickets(related_order_id);

CREATE INDEX IF NOT EXISTS idx_quotes_prescription_id
  ON public.quotes(prescription_id);

CREATE INDEX IF NOT EXISTS idx_quotes_frame_product_id
  ON public.quotes(frame_product_id);

CREATE INDEX IF NOT EXISTS idx_appointments_created_by
  ON public.appointments(created_by);

CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_branch_id
  ON public.contact_lens_encargos(branch_id);

COMMIT;
