-- ============================================================
-- EXPLAIN ANALYZE — FK Index Scan Verification
-- Phase 3.4 | PR #1 | Manual test against live DB
-- ============================================================
-- Run these queries against a database where the migration
-- 20260701000016_add_fk_indexes.sql has been applied.
--
-- Each query must show "Index Scan" (not "Seq Scan") for the
-- FK column being filtered.
-- ============================================================

-- 1. agreement_institutional_balances(purchase_order_id)
EXPLAIN ANALYZE
SELECT * FROM public.agreement_institutional_balances
WHERE purchase_order_id = '00000000-0000-0000-0000-000000000000';
-- Expected: Index Scan using idx_agreement_institutional_balances_purchase_order_id

-- 2. agreement_institutional_balances(invoice_id)
EXPLAIN ANALYZE
SELECT * FROM public.agreement_institutional_balances
WHERE invoice_id = '00000000-0000-0000-0000-000000000000';
-- Expected: Index Scan using idx_agreement_institutional_balances_invoice_id

-- 3. agreement_institutional_invoices(emitted_by)
EXPLAIN ANALYZE
SELECT * FROM public.agreement_institutional_invoices
WHERE emitted_by = '00000000-0000-0000-0000-000000000000';
-- Expected: Index Scan using idx_agreement_institutional_invoices_emitted_by

-- 4. agreement_institutional_invoices(organization_id)
EXPLAIN ANALYZE
SELECT * FROM public.agreement_institutional_invoices
WHERE organization_id = '00000000-0000-0000-0000-000000000000';
-- Expected: Index Scan using idx_agreement_institutional_invoices_organization_id

-- 5. agreements(created_by)
EXPLAIN ANALYZE
SELECT * FROM public.agreements
WHERE created_by = '00000000-0000-0000-0000-000000000000';
-- Expected: Index Scan using idx_agreements_created_by

-- 6. agreements(updated_by)
EXPLAIN ANALYZE
SELECT * FROM public.agreements
WHERE updated_by = '00000000-0000-0000-0000-000000000000';
-- Expected: Index Scan using idx_agreements_updated_by
