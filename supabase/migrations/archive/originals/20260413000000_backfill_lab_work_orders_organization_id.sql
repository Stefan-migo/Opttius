-- Migration: 20260413000000_backfill_lab_work_orders_organization_id.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Backfill organization_id on lab_work_orders from branches
-- Version: 20260413000000
-- Description: Work orders may have organization_id NULL when created via process_pos_sale
--              or POST /work-orders. This backfill ensures existing rows get organization_id
--              from their branch for correct multi-tenant behavior and delivery email triggers.

UPDATE public.lab_work_orders lwo
SET organization_id = b.organization_id
FROM public.branches b
WHERE lwo.branch_id = b.id
  AND lwo.organization_id IS NULL
  AND b.organization_id IS NOT NULL;
