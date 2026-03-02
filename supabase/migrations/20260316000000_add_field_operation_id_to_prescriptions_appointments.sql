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
