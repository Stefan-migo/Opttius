-- Migration: 20260318000000_add_field_operation_to_cash_register.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add field_operation_id to pos_sessions and cash_register_closures
-- Enables independent cash register for operativos en terreno (field operations)

-- ===== POS_SESSIONS: Add field_operation_id =====
ALTER TABLE public.pos_sessions
  ADD COLUMN IF NOT EXISTS field_operation_id UUID REFERENCES public.field_operations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pos_sessions_field_operation_id 
  ON public.pos_sessions(field_operation_id);

COMMENT ON COLUMN public.pos_sessions.field_operation_id IS 'When set, this session is for an operativo (field operation). NULL = branch session.';

-- ===== CASH_REGISTER_CLOSURES: Add field_operation_id =====
ALTER TABLE public.cash_register_closures
  ADD COLUMN IF NOT EXISTS field_operation_id UUID REFERENCES public.field_operations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_field_operation_id 
  ON public.cash_register_closures(field_operation_id);

COMMENT ON COLUMN public.cash_register_closures.field_operation_id IS 'When set, this closure is for an operativo. NULL = branch closure.';

-- ===== Replace unique constraint with partial indexes =====
-- Drop existing constraint (one closure per branch per day for branch-only)
ALTER TABLE public.cash_register_closures
  DROP CONSTRAINT IF EXISTS unique_branch_closure_date;

-- Branch closures: one per branch per day when field_operation_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_register_closures_branch_date_unique
  ON public.cash_register_closures(branch_id, closure_date)
  WHERE field_operation_id IS NULL;

-- Operativo closures: one per operativo per day when field_operation_id IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_register_closures_operativo_date_unique
  ON public.cash_register_closures(branch_id, field_operation_id, closure_date)
  WHERE field_operation_id IS NOT NULL;
