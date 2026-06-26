-- Migration: 20260231000001_add_saas_payment_email_templates.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- ============================================================================
-- Migration: Add SaaS Payment Email Templates
-- Version: 20260231000001
-- Date: 2026-02-23
-- Description: Adds saas_payment_failed and saas_payment_reminder templates
--              for subscription billing cycle notifications
--              IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- Insert saas_payment_failed
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, is_default, updated_at)
VALUES (
    'saas_payment_failed',
    'Pago Fallido SaaS',
    'Acción requerida: Pago de suscripción fallido - {{organization_name}}',
    '<div style="max-width: 600px; margin: 0 auto;">
  <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 20px;">Pago fallido</h1>
  <p>Hola,</p>
  <p>No pudimos procesar el pago de tu suscripción para <strong>{{organization_name}}</strong>.</p>
  <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
    <p style="margin: 0 0 8px 0;"><strong>Factura:</strong> {{invoice_number}}</p>
    <p style="margin: 0 0 8px 0;"><strong>Monto:</strong> {{amount}} {{currency}}</p>
    <p style="margin: 0;"><strong>Vencimiento:</strong> {{due_date}}</p>
  </div>
  <p>Por favor actualiza tu método de pago para evitar la interrupción del servicio.</p>
  <p><a href="{{payment_url}}" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Actualizar Método de Pago</a></p>
  <p>Si tienes dudas, contáctanos en facturas@opttius.cl</p>
  <p>Saludos,<br>Equipo Opttius</p>
</div>',
    '["organization_name", "amount", "currency", "invoice_number", "due_date", "payment_url"]'::jsonb,
    true,
    true,
    'saas',
    NULL,
    true,
    NOW()
)
ON CONFLICT (name, type) DO UPDATE SET
    subject = EXCLUDED.subject,
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
WHERE system_email_templates.organization_id IS NULL;

-- Insert saas_payment_reminder
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, is_default, updated_at)
VALUES (
    'saas_payment_reminder',
    'Recordatorio de Pago SaaS',
    'Recordatorio: Pago de suscripción pendiente - {{organization_name}}',
    '<div style="max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1A2B23; font-size: 24px; margin-bottom: 20px;">Recordatorio de pago</h1>
  <p>Hola,</p>
  <p>Te recordamos que el pago de tu suscripción para <strong>{{organization_name}}</strong> vence pronto.</p>
  <div style="background: #F9F7F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C5A059;">
    <p style="margin: 0 0 8px 0;"><strong>Monto:</strong> {{amount}} {{currency}}</p>
    <p style="margin: 0;"><strong>Fecha de vencimiento:</strong> {{due_date}}</p>
  </div>
  <p>Realiza el pago antes de la fecha indicada para mantener tu acceso sin interrupciones.</p>
  <p><a href="{{payment_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Realizar Pago</a></p>
  <p>Si tienes dudas, contáctanos en facturas@opttius.cl</p>
  <p>Saludos,<br>Equipo Opttius</p>
</div>',
    '["organization_name", "amount", "currency", "due_date", "payment_url"]'::jsonb,
    true,
    true,
    'saas',
    NULL,
    true,
    NOW()
)
ON CONFLICT (name, type) DO UPDATE SET
    subject = EXCLUDED.subject,
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
WHERE system_email_templates.organization_id IS NULL;
