-- Migration: add_fk_indexes
-- Adds missing B-tree indexes on foreign key columns across agreement tables.
--
-- These FKs are queried by RLS policies and JOINs but had no index coverage,
-- causing sequential scans that degrade as tables grow.
--
-- ============================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================
-- To roll back this migration:
--
--   DROP INDEX IF EXISTS public.idx_agreement_institutional_balances_purchase_order_id;
--   DROP INDEX IF EXISTS public.idx_agreement_institutional_balances_invoice_id;
--   DROP INDEX IF EXISTS public.idx_agreement_institutional_invoices_emitted_by;
--   DROP INDEX IF EXISTS public.idx_agreement_institutional_invoices_organization_id;
--   DROP INDEX IF EXISTS public.idx_agreements_created_by;
--   DROP INDEX IF EXISTS public.idx_agreements_updated_by;
--
-- Rollback is safe: zero data loss, zero downtime. DROP INDEX is MVCC-safe
-- in Postgres — concurrent queries continue using the index until they finish,
-- new queries do a sequential scan instead.
-- ============================================================

-- ============================================================
-- 1. agreement_institutional_balances FK indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_purchase_order_id
  ON public.agreement_institutional_balances USING btree (purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_invoice_id
  ON public.agreement_institutional_balances USING btree (invoice_id);

-- ============================================================
-- 2. agreement_institutional_invoices FK indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_emitted_by
  ON public.agreement_institutional_invoices USING btree (emitted_by);

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_organization_id
  ON public.agreement_institutional_invoices USING btree (organization_id);

-- ============================================================
-- 3. agreements FK indexes (created_by, updated_by only;
--    organization_id and branch_id already indexed)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_agreements_created_by
  ON public.agreements USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_agreements_updated_by
  ON public.agreements USING btree (updated_by);

-- ============================================================
-- 4. Verification assertions
-- ============================================================

DO $$
DECLARE
  v_count INTEGER;
  v_errors TEXT[] := '{}';
BEGIN
  -- Verify agreement_institutional_balances purchase_order_id index
  SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'agreement_institutional_balances'
      AND indexname = 'idx_agreement_institutional_balances_purchase_order_id';
  IF v_count < 1 THEN
    v_errors := array_append(v_errors, 'idx_agreement_institutional_balances_purchase_order_id not found');
  END IF;

  -- Verify agreement_institutional_balances invoice_id index
  SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'agreement_institutional_balances'
      AND indexname = 'idx_agreement_institutional_balances_invoice_id';
  IF v_count < 1 THEN
    v_errors := array_append(v_errors, 'idx_agreement_institutional_balances_invoice_id not found');
  END IF;

  -- Verify agreement_institutional_invoices emitted_by index
  SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'agreement_institutional_invoices'
      AND indexname = 'idx_agreement_institutional_invoices_emitted_by';
  IF v_count < 1 THEN
    v_errors := array_append(v_errors, 'idx_agreement_institutional_invoices_emitted_by not found');
  END IF;

  -- Verify agreement_institutional_invoices organization_id index
  SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'agreement_institutional_invoices'
      AND indexname = 'idx_agreement_institutional_invoices_organization_id';
  IF v_count < 1 THEN
    v_errors := array_append(v_errors, 'idx_agreement_institutional_invoices_organization_id not found');
  END IF;

  -- Verify agreements created_by index
  SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'agreements'
      AND indexname = 'idx_agreements_created_by';
  IF v_count < 1 THEN
    v_errors := array_append(v_errors, 'idx_agreements_created_by not found');
  END IF;

  -- Verify agreements updated_by index
  SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'agreements'
      AND indexname = 'idx_agreements_updated_by';
  IF v_count < 1 THEN
    v_errors := array_append(v_errors, 'idx_agreements_updated_by not found');
  END IF;

  -- Raise if any index is missing
  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION 'Missing FK indexes: %', array_to_string(v_errors, ', ');
  END IF;
END;
$$;
