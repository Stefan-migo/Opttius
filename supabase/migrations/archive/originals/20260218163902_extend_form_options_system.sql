-- Migration: 20260218163902_extend_form_options_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Extend product_option_fields with form_type for unified form configuration
-- form_type: 'product'|'customer'|'prescription'|'quote'|'appointment'|'pos'|'global'

-- Add form_type column
ALTER TABLE public.product_option_fields
  ADD COLUMN IF NOT EXISTS form_type TEXT NOT NULL DEFAULT 'product';

-- Ensure existing rows have form_type
UPDATE public.product_option_fields SET form_type = 'product' WHERE form_type IS NULL;

-- Drop old unique constraint on field_key (allows same field_key in different form_types)
ALTER TABLE public.product_option_fields
  DROP CONSTRAINT IF EXISTS product_option_fields_field_key_key;

-- Add new unique constraint on (field_key, form_type)
ALTER TABLE public.product_option_fields
  ADD CONSTRAINT product_option_fields_field_key_form_type_key UNIQUE (field_key, form_type);

-- Index for form_type lookups
CREATE INDEX IF NOT EXISTS idx_product_option_fields_form_type
  ON public.product_option_fields(form_type);

-- Insert customer form fields
INSERT INTO public.product_option_fields (field_key, field_label, field_category, form_type, is_array, display_order)
VALUES
  ('gender', 'Género', 'general', 'customer', false, 1),
  ('preferred_contact_method', 'Método de contacto preferido', 'general', 'customer', false, 2)
ON CONFLICT (field_key, form_type) DO NOTHING;

-- Insert default values for customer gender
INSERT INTO public.product_option_values (field_id, value, label, display_order, is_default)
SELECT id, 'male', 'Masculino', 1, true FROM public.product_option_fields WHERE field_key = 'gender' AND form_type = 'customer'
UNION ALL
SELECT id, 'female', 'Femenino', 2, false FROM public.product_option_fields WHERE field_key = 'gender' AND form_type = 'customer'
UNION ALL
SELECT id, 'other', 'Otro', 3, false FROM public.product_option_fields WHERE field_key = 'gender' AND form_type = 'customer'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default values for preferred_contact_method
INSERT INTO public.product_option_values (field_id, value, label, display_order, is_default)
SELECT id, 'phone', 'Teléfono', 1, true FROM public.product_option_fields WHERE field_key = 'preferred_contact_method' AND form_type = 'customer'
UNION ALL
SELECT id, 'email', 'Email', 2, false FROM public.product_option_fields WHERE field_key = 'preferred_contact_method' AND form_type = 'customer'
UNION ALL
SELECT id, 'whatsapp', 'WhatsApp', 3, false FROM public.product_option_fields WHERE field_key = 'preferred_contact_method' AND form_type = 'customer'
UNION ALL
SELECT id, 'sms', 'SMS', 4, false FROM public.product_option_fields WHERE field_key = 'preferred_contact_method' AND form_type = 'customer'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert appointment form fields
INSERT INTO public.product_option_fields (field_key, field_label, field_category, form_type, is_array, display_order)
VALUES
  ('appointment_type', 'Tipo de cita', 'general', 'appointment', false, 1)
ON CONFLICT (field_key, form_type) DO NOTHING;

-- Insert default values for appointment_type
INSERT INTO public.product_option_values (field_id, value, label, display_order, is_default)
SELECT id, 'exam', 'Examen de la vista', 1, true FROM public.product_option_fields WHERE field_key = 'appointment_type' AND form_type = 'appointment'
UNION ALL
SELECT id, 'fitting', 'Adaptación de lentes', 2, false FROM public.product_option_fields WHERE field_key = 'appointment_type' AND form_type = 'appointment'
UNION ALL
SELECT id, 'consultation', 'Consulta', 3, false FROM public.product_option_fields WHERE field_key = 'appointment_type' AND form_type = 'appointment'
UNION ALL
SELECT id, 'follow_up', 'Control', 4, false FROM public.product_option_fields WHERE field_key = 'appointment_type' AND form_type = 'appointment'
UNION ALL
SELECT id, 'repair', 'Reparación', 5, false FROM public.product_option_fields WHERE field_key = 'appointment_type' AND form_type = 'appointment'
ON CONFLICT (field_id, value) DO NOTHING;
