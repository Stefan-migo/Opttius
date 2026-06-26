-- Migration: 20260124000000_update_system_config_for_optometry.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update System Config for Optometry/Ophthalmology System
-- This migration removes obsolete generic business configurations and adds
-- optometry-specific configurations

-- ============================================================================
-- 1) Remove obsolete configurations (ecommerce, membership)
-- ============================================================================

DELETE FROM public.system_config 
WHERE config_key IN (
  'shipping_cost',
  'free_shipping_threshold',
  'membership_trial_days',
  'membership_reminder_days'
);

-- ============================================================================
-- 2) Update existing configurations to be optometry-specific
-- ============================================================================

-- Update site description to be optometry-specific
UPDATE public.system_config
SET 
  config_value = '"Sistema de gestión para ópticas y centros oftalmológicos"',
  description = 'Descripción del sistema de gestión oftalmológica'
WHERE config_key = 'site_description';

-- Update site name if needed (keep generic or update to clinic name)
-- UPDATE public.system_config
-- SET config_value = '"Tu Óptica"'
-- WHERE config_key = 'site_name';

-- Update contact information descriptions
UPDATE public.system_config
SET description = 'Email de contacto principal de la óptica'
WHERE config_key = 'contact_email';

UPDATE public.system_config
SET description = 'Email de soporte al cliente de la óptica'
WHERE config_key = 'support_email';

UPDATE public.system_config
SET description = 'Número de teléfono principal de la óptica'
WHERE config_key = 'phone_number';

UPDATE public.system_config
SET description = 'Dirección física de la óptica'
WHERE config_key = 'address';

-- Update currency and tax to be more relevant (Chile uses CLP and 19% IVA)
UPDATE public.system_config
SET 
  config_value = '"CLP"',
  description = 'Moneda por defecto del sistema (CLP para Chile)'
WHERE config_key = 'currency';

-- Update tax rate to Chile's IVA (19%)
UPDATE public.system_config
SET 
  config_value = '19.0',
  description = 'Tasa de impuesto (IVA) - 19% para Chile'
WHERE config_key = 'tax_rate';

-- ============================================================================
-- 3) Add new optometry-specific configurations
-- ============================================================================

INSERT INTO public.system_config (config_key, config_value, description, category, is_public, value_type) VALUES
  -- Optometry Business Settings
  ('clinic_name', '""', 'Nombre de la clínica/óptica', 'general', true, 'string'),
  ('clinic_rut', '""', 'RUT de la clínica/óptica', 'general', false, 'string'),
  ('clinic_specialty', '"Óptica y Oftalmología"', 'Especialidad de la clínica', 'general', true, 'string'),
  
  -- Appointment Settings
  ('appointment_duration_minutes', '30', 'Duración por defecto de las citas en minutos', 'appointments', false, 'number'),
  ('appointment_advance_days', '30', 'Días de anticipación para agendar citas', 'appointments', false, 'number'),
  ('appointment_reminder_hours', '24', 'Horas antes de la cita para enviar recordatorio', 'appointments', false, 'number'),
  ('appointment_cancellation_hours', '2', 'Horas mínimas antes de la cita para cancelar', 'appointments', false, 'number'),
  
  -- Prescription Settings
  ('prescription_validity_days', '365', 'Días de validez de una receta', 'prescriptions', false, 'number'),
  ('prescription_reminder_days', '90', 'Días antes del vencimiento para recordar receta', 'prescriptions', false, 'number'),
  ('auto_calculate_prescription', 'true', 'Calcular automáticamente valores de prescripción', 'prescriptions', false, 'boolean'),
  
  -- Lens Settings
  ('default_lens_warranty_months', '12', 'Garantía por defecto de lentes en meses', 'lenses', false, 'number'),
  ('lens_processing_days', '7', 'Días de procesamiento estándar para lentes', 'lenses', false, 'number'),
  ('urgent_lens_processing_days', '3', 'Días de procesamiento para lentes urgentes', 'lenses', false, 'number'),
  
  -- Work Order Settings
  ('work_order_auto_numbering', 'true', 'Numeración automática de órdenes de trabajo', 'work_orders', false, 'boolean'),
  ('work_order_prefix', '"OT-"', 'Prefijo para números de orden de trabajo', 'work_orders', false, 'string'),
  ('work_order_default_status', '"pending"', 'Estado por defecto de nuevas órdenes', 'work_orders', false, 'string'),
  
  -- Quote Settings
  ('quote_validity_days', '30', 'Días de validez de un presupuesto', 'quotes', false, 'number'),
  ('quote_auto_expire', 'true', 'Expirar presupuestos automáticamente', 'quotes', false, 'boolean'),
  ('quote_reminder_days', '7', 'Días antes del vencimiento para recordar presupuesto', 'quotes', false, 'number'),
  
  -- Inventory Settings (keep but update descriptions)
  ('low_stock_threshold', '5', 'Umbral para alertas de stock bajo de productos', 'inventory', false, 'number'),
  ('auto_low_stock_alerts', 'true', 'Enviar alertas automáticas de stock bajo', 'inventory', false, 'boolean'),
  ('inventory_auto_reorder', 'false', 'Reorden automático de inventario', 'inventory', false, 'boolean'),
  
  -- Branch Settings
  ('multi_branch_enabled', 'true', 'Habilitar gestión multi-sucursal', 'branches', false, 'boolean'),
  ('branch_stock_isolation', 'true', 'Aislar inventario por sucursal', 'branches', false, 'boolean'),
  
  -- System Settings (keep existing)
  ('maintenance_mode', 'false', 'Activar modo mantenimiento', 'system', false, 'boolean'),
  ('maintenance_message', '"Estamos realizando mejoras en el sistema. Volveremos pronto."', 'Mensaje durante mantenimiento', 'system', false, 'string'),
  ('max_upload_size', '10485760', 'Tamaño máximo de archivo (bytes)', 'system', false, 'number'),
  ('session_timeout', '3600', 'Tiempo de sesión en segundos', 'system', false, 'number'),
  
  -- Email Settings (keep existing SMTP settings)
  ('smtp_host', '""', 'Servidor SMTP para emails', 'email', false, 'string'),
  ('smtp_port', '587', 'Puerto SMTP', 'email', false, 'number'),
  ('smtp_username', '""', 'Usuario SMTP', 'email', false, 'string'),
  ('smtp_password', '""', 'Contraseña SMTP', 'email', false, 'string'),
  ('email_from_name', '""', 'Nombre del remitente de emails', 'email', false, 'string'),
  ('email_from_address', '""', 'Dirección de email del remitente', 'email', false, 'string')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 4) Update category names in existing configs (if needed)
-- ============================================================================

-- Change 'ecommerce' category to 'business' for remaining configs
UPDATE public.system_config
SET category = 'business'
WHERE category = 'ecommerce';

-- ============================================================================
-- 5) Add comments for documentation
-- ============================================================================

COMMENT ON TABLE public.system_config IS 'Configuraciones del sistema de gestión oftalmológica';
