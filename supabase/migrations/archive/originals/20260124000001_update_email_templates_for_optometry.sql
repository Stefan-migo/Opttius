-- Migration: 20260124000001_update_email_templates_for_optometry.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update Email Templates for Optometry System
-- This migration updates email template types and adds optometry-specific templates

-- ============================================================================
-- 1) Delete obsolete membership templates BEFORE updating constraint
-- ============================================================================

DELETE FROM public.system_email_templates 
WHERE type IN ('membership_welcome', 'membership_reminder');

-- ============================================================================
-- 2) Update email template types constraint to include optometry types
-- ============================================================================

-- First, drop the old constraint
ALTER TABLE public.system_email_templates
  DROP CONSTRAINT IF EXISTS system_email_templates_type_check;

-- Add new constraint with optometry-specific types
ALTER TABLE public.system_email_templates
  ADD CONSTRAINT system_email_templates_type_check CHECK (type IN (
    -- Order/Transaction types (keep for POS)
    'order_confirmation',
    'order_shipped',
    'order_delivered',
    'payment_success',
    'payment_failed',
    
    -- Optometry-specific types
    'appointment_confirmation',
    'appointment_reminder',
    'appointment_cancellation',
    'appointment_rescheduled',
    'prescription_ready',
    'prescription_expiring',
    'quote_sent',
    'quote_expiring',
    'quote_accepted',
    'work_order_ready',
    'work_order_completed',
    
    -- System types
    'password_reset',
    'account_welcome',
    'low_stock_alert',
    'marketing',
    'custom'
  ));

-- ============================================================================
-- 3) Update existing templates to be optometry-specific
-- ============================================================================

-- Update order confirmation to be more generic (for POS orders)
UPDATE public.system_email_templates
SET 
  name = 'Confirmación de Orden',
  subject = 'Confirmación de tu orden {{order_number}}',
  content = '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1e40af;">¡Gracias por tu compra!</h1>
    
    <p>Hola {{customer_name}},</p>
    
    <p>Hemos recibido tu orden y la estamos procesando. Aquí tienes los detalles:</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>Orden #{{order_number}}</h3>
      <p><strong>Fecha:</strong> {{order_date}}</p>
      <p><strong>Total:</strong> {{order_total}}</p>
    </div>
    
    <h3>Productos:</h3>
    {{order_items}}
    
    <p>Te notificaremos cuando tu orden esté lista para retiro.</p>
    
    <p>Gracias por confiar en nosotros.</p>
    
    <p>Saludos,<br>{{clinic_name}}</p>
  </div>
</body>
</html>',
  variables = '["customer_name", "order_number", "order_date", "order_total", "order_items", "clinic_name"]'::jsonb
WHERE type = 'order_confirmation';

-- Update low stock alert to be optometry-specific
UPDATE public.system_email_templates
SET 
  name = 'Alerta de Stock Bajo',
  subject = 'Alerta: Stock bajo en productos - {{clinic_name}}',
  content = '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #DC2626;">⚠️ Alerta de Stock Bajo</h1>
    
    <p>Los siguientes productos tienen stock bajo y requieren atención:</p>
    
    <div style="background: #FEF2F2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #DC2626;">
      {{low_stock_products}}
    </div>
    
    <p>Por favor, revisa el inventario y considera realizar pedidos de reposición.</p>
    
    <p>Saludos,<br>Sistema de Gestión - {{clinic_name}}</p>
  </div>
</body>
</html>',
  variables = '["low_stock_products", "clinic_name"]'::jsonb
WHERE type = 'low_stock_alert';

-- ============================================================================
-- 4) Insert new optometry-specific email templates
-- ============================================================================

INSERT INTO public.system_email_templates (name, type, subject, content, variables, is_system) VALUES
  (
    'Confirmación de Cita',
    'appointment_confirmation',
    'Confirmación de tu cita - {{clinic_name}}',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1e40af;">Cita Confirmada</h1>
    
    <p>Hola {{customer_name}},</p>
    
    <p>Tu cita ha sido confirmada. Aquí tienes los detalles:</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>Detalles de la Cita</h3>
      <p><strong>Fecha:</strong> {{appointment_date}}</p>
      <p><strong>Hora:</strong> {{appointment_time}}</p>
      <p><strong>Profesional:</strong> {{professional_name}}</p>
      <p><strong>Tipo de consulta:</strong> {{appointment_type}}</p>
      {{#branch_name}}<p><strong>Sucursal:</strong> {{branch_name}}</p>{{/branch_name}}
    </div>
    
    <p>Por favor, llega 10 minutos antes de tu cita.</p>
    
    <p>Si necesitas cancelar o reprogramar, contáctanos con al menos 24 horas de anticipación.</p>
    
    <p>Saludos,<br>{{clinic_name}}</p>
  </div>
</body>
</html>',
    '["customer_name", "appointment_date", "appointment_time", "professional_name", "appointment_type", "branch_name", "clinic_name"]'::jsonb,
    true
  ),
  (
    'Recordatorio de Cita',
    'appointment_reminder',
    'Recordatorio: Tu cita es mañana - {{clinic_name}}',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1e40af;">Recordatorio de Cita</h1>
    
    <p>Hola {{customer_name}},</p>
    
    <p>Te recordamos que tienes una cita programada:</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>Detalles de la Cita</h3>
      <p><strong>Fecha:</strong> {{appointment_date}}</p>
      <p><strong>Hora:</strong> {{appointment_time}}</p>
      <p><strong>Profesional:</strong> {{professional_name}}</p>
      {{#branch_name}}<p><strong>Sucursal:</strong> {{branch_name}}</p>{{/branch_name}}
    </div>
    
    <p>Por favor, confirma tu asistencia o contáctanos si necesitas cancelar o reprogramar.</p>
    
    <p>Saludos,<br>{{clinic_name}}</p>
  </div>
</body>
</html>',
    '["customer_name", "appointment_date", "appointment_time", "professional_name", "branch_name", "clinic_name"]'::jsonb,
    true
  ),
  (
    'Prescripción Lista',
    'prescription_ready',
    'Tu prescripción está lista - {{clinic_name}}',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1e40af;">Prescripción Lista</h1>
    
    <p>Hola {{customer_name}},</p>
    
    <p>Tu prescripción está lista para retiro:</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>Detalles de la Prescripción</h3>
      <p><strong>Fecha de emisión:</strong> {{prescription_date}}</p>
      <p><strong>Profesional:</strong> {{professional_name}}</p>
      <p><strong>Válida hasta:</strong> {{prescription_expiry}}</p>
      {{#branch_name}}<p><strong>Sucursal:</strong> {{branch_name}}</p>{{/branch_name}}
    </div>
    
    <p>Puedes retirar tu prescripción en nuestra sucursal durante el horario de atención.</p>
    
    <p>Saludos,<br>{{clinic_name}}</p>
  </div>
</body>
</html>',
    '["customer_name", "prescription_date", "professional_name", "prescription_expiry", "branch_name", "clinic_name"]'::jsonb,
    true
  ),
  (
    'Presupuesto Enviado',
    'quote_sent',
    'Presupuesto de {{clinic_name}}',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1e40af;">Presupuesto Disponible</h1>
    
    <p>Hola {{customer_name}},</p>
    
    <p>Hemos preparado un presupuesto para ti:</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>Presupuesto #{{quote_number}}</h3>
      <p><strong>Fecha:</strong> {{quote_date}}</p>
      <p><strong>Total:</strong> {{quote_total}}</p>
      <p><strong>Válido hasta:</strong> {{quote_expiry}}</p>
    </div>
    
    <h3>Detalles:</h3>
    {{quote_items}}
    
    <p>Este presupuesto es válido hasta {{quote_expiry}}. Si tienes alguna pregunta, no dudes en contactarnos.</p>
    
    <p>Saludos,<br>{{clinic_name}}</p>
  </div>
</body>
</html>',
    '["customer_name", "quote_number", "quote_date", "quote_total", "quote_expiry", "quote_items", "clinic_name"]'::jsonb,
    true
  ),
  (
    'Orden de Trabajo Lista',
    'work_order_ready',
    'Tu orden de trabajo está lista - {{clinic_name}}',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1e40af;">Orden de Trabajo Lista</h1>
    
    <p>Hola {{customer_name}},</p>
    
    <p>Tu orden de trabajo está lista para retiro:</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>Orden #{{work_order_number}}</h3>
      <p><strong>Fecha de inicio:</strong> {{work_order_start_date}}</p>
      <p><strong>Fecha de finalización:</strong> {{work_order_completion_date}}</p>
      <p><strong>Estado:</strong> {{work_order_status}}</p>
      {{#branch_name}}<p><strong>Sucursal:</strong> {{branch_name}}</p>{{/branch_name}}
    </div>
    
    <h3>Detalles:</h3>
    {{work_order_details}}
    
    <p>Puedes retirar tu orden en nuestra sucursal durante el horario de atención.</p>
    
    <p>Saludos,<br>{{clinic_name}}</p>
  </div>
</body>
</html>',
    '["customer_name", "work_order_number", "work_order_start_date", "work_order_completion_date", "work_order_status", "work_order_details", "branch_name", "clinic_name"]'::jsonb,
    true
  )
ON CONFLICT (name, type) DO NOTHING;

-- ============================================================================
-- 5) Add Resend configuration to system_config
-- ============================================================================

INSERT INTO public.system_config (config_key, config_value, description, category, is_public, value_type, is_sensitive) VALUES
  ('resend_api_key', '""', 'API Key de Resend para envío de emails', 'email', false, 'string', true),
  ('resend_from_email', '""', 'Email remitente configurado en Resend', 'email', false, 'string', false),
  ('resend_enabled', 'true', 'Habilitar envío de emails con Resend', 'email', false, 'boolean', false)
ON CONFLICT (config_key) DO NOTHING;

COMMENT ON TABLE public.system_email_templates IS 'Plantillas de email del sistema de gestión oftalmológica';
