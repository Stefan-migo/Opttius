-- Migration: 20260218164027_fix_appointment_type_values.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Fix appointment_type values to match existing form (eye_exam, delivery, emergency, other)
-- Add missing values and update exam -> eye_exam for consistency with CreateAppointmentForm

-- Update exam to eye_exam if it exists
UPDATE public.product_option_values pov
SET value = 'eye_exam', label = 'Examen de la Vista'
FROM public.product_option_fields pof
WHERE pov.field_id = pof.id
  AND pof.field_key = 'appointment_type'
  AND pof.form_type = 'appointment'
  AND pov.value = 'exam';

-- Insert missing values (delivery, emergency, other) if not exist
INSERT INTO public.product_option_values (field_id, value, label, display_order, is_default)
SELECT id, 'delivery', 'Entrega de Lentes', 6, false FROM public.product_option_fields WHERE field_key = 'appointment_type' AND form_type = 'appointment'
UNION ALL
SELECT id, 'emergency', 'Emergencia', 7, false FROM public.product_option_fields WHERE field_key = 'appointment_type' AND form_type = 'appointment'
UNION ALL
SELECT id, 'other', 'Otro', 8, false FROM public.product_option_fields WHERE field_key = 'appointment_type' AND form_type = 'appointment'
ON CONFLICT (field_id, value) DO NOTHING;

-- Update consultation to be default
UPDATE public.product_option_values pov
SET is_default = true
FROM public.product_option_fields pof
WHERE pov.field_id = pof.id
  AND pof.field_key = 'appointment_type'
  AND pof.form_type = 'appointment'
  AND pov.value = 'consultation';

UPDATE public.product_option_values pov
SET is_default = false
FROM public.product_option_fields pof
WHERE pov.field_id = pof.id
  AND pof.field_key = 'appointment_type'
  AND pof.form_type = 'appointment'
  AND pov.value != 'consultation';
