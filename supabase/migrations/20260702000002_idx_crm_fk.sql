-- Migration: 20260702000002_idx_crm_fk.sql
-- Description: FK indexes for CRM tables (customers, prescriptions, appointments, surveys)
-- Phase: 1 (Performance — Indexes)
-- Spec: S-003
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_customers_created_by;
--   DROP INDEX IF EXISTS public.idx_customers_updated_by;
--   DROP INDEX IF EXISTS public.idx_prescriptions_created_by;
--   DROP INDEX IF EXISTS public.idx_customer_lens_purchases_product_id;
--   DROP INDEX IF EXISTS public.idx_customer_satisfaction_surveys_customer_id;
--   DROP INDEX IF EXISTS public.idx_customer_satisfaction_surveys_work_order_id;
--   DROP INDEX IF EXISTS public.idx_survey_invitations_customer_id;

BEGIN;

CREATE INDEX IF NOT EXISTS idx_customers_created_by
  ON public.customers(created_by);

CREATE INDEX IF NOT EXISTS idx_customers_updated_by
  ON public.customers(updated_by);

CREATE INDEX IF NOT EXISTS idx_prescriptions_created_by
  ON public.prescriptions(created_by);

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_product_id
  ON public.customer_lens_purchases(product_id);

CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_customer_id
  ON public.customer_satisfaction_surveys(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_work_order_id
  ON public.customer_satisfaction_surveys(work_order_id);

CREATE INDEX IF NOT EXISTS idx_survey_invitations_customer_id
  ON public.survey_invitations(customer_id);

COMMIT;
