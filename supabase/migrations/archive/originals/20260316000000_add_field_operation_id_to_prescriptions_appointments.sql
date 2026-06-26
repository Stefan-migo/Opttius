-- Migration: 20260316000000_add_field_operation_id_to_prescriptions_appointments.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add field_operation_id to prescriptions and appointments
-- Enables operativo context inheritance when creating from customer page

-- ===== prescriptions =====
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS field_operation_id UUID REFERENCES public.field_operations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prescriptions_field_operation ON public.prescriptions(field_operation_id) WHERE field_operation_id IS NOT NULL;

-- ===== appointments =====
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS field_operation_id UUID REFERENCES public.field_operations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_field_operation ON public.appointments(field_operation_id) WHERE field_operation_id IS NOT NULL;
