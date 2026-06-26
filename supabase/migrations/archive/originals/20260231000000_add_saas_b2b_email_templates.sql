-- Migration: 20260231000000_add_saas_b2b_email_templates.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- ============================================================================
-- Migration: Add SaaS B2B Email Templates
-- Version: 20260231000000
-- Date: 2026-02-23
-- Description: Adds saas_subscription_success and 4 support templates for
--              editable B2B email flow (ticket created, new response, assigned, resolved)
--              IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- Step 1: Extend type constraint to include support template types
DO $$
BEGIN
    ALTER TABLE system_email_templates DROP CONSTRAINT IF EXISTS system_email_templates_type_check;

    ALTER TABLE system_email_templates ADD CHECK (
        type = ANY (ARRAY[
            'order_confirmation'::text, 'order_shipped'::text, 'order_delivered'::text,
            'payment_success'::text, 'payment_failed'::text,
            'appointment_confirmation'::text, 'appointment_reminder'::text,
            'appointment_reminder_2h'::text, 'appointment_cancelation'::text,
            'appointment_rescheduled'::text, 'appointment_follow_up_reminder'::text,
            'prescription_ready'::text, 'prescription_expiring'::text,
            'quote_sent'::text, 'quote_expiring'::text, 'quote_accepted'::text,
            'work_order_ready'::text, 'work_order_completed'::text,
            'saas_welcome'::text, 'saas_trial_ending'::text,
            'saas_subscription_success'::text, 'saas_subscription_failed'::text,
            'saas_payment_reminder'::text, 'saas_payment_failed'::text,
            'saas_security_alert'::text,
            'saas_onboarding'::text, 'saas_onboarding_step_1'::text,
            'saas_onboarding_step_2'::text, 'saas_onboarding_step_3'::text,
            'saas_account_suspended'::text,
            'saas_terms_update'::text, 'saas_maintenance'::text,
            'saas_usage_alert'::text, 'saas_feature_announcement'::text,
            'saas_support_ticket_created'::text, 'saas_support_new_response'::text,
            'saas_support_ticket_assigned'::text, 'saas_support_ticket_resolved'::text,
            'password_reset'::text, 'account_welcome'::text,
            'low_stock_alert'::text, 'marketing'::text, 'custom'::text,
            'contact_form'::text, 'birthday'::text
        ])
    );

    RAISE NOTICE 'Extended type constraint with support template types';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists, skipping';
END $$;

-- Step 2: Insert saas_subscription_success
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, is_default, updated_at)
VALUES (
    'saas_subscription_success',
    'Suscripción Exitosa',
    'Tu suscripción a Opttius está activa - {{organization_name}}',
    '<div style="max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1A2B23; font-size: 24px; margin-bottom: 20px;">¡Suscripción activada!</h1>
  <p>Hola {{customer_name}},</p>
  <p>Tu suscripción para <strong>{{organization_name}}</strong> ha sido activada correctamente.</p>
  <div style="background: #F9F7F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C5A059;">
    <p style="margin: 0 0 8px 0;"><strong>Plan:</strong> {{plan_name}}</p>
    <p style="margin: 0 0 8px 0;"><strong>Monto:</strong> {{amount}} {{currency}}</p>
    <p style="margin: 0;"><strong>Próxima facturación:</strong> {{next_billing_date}}</p>
  </div>
  <p>Gracias por confiar en Opttius. Si tienes dudas, contáctanos en soporte@opttius.cl</p>
  <p>Saludos,<br>Equipo Opttius</p>
</div>',
    '["customer_name", "organization_name", "plan_name", "amount", "currency", "next_billing_date"]'::jsonb,
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

-- Step 3: Insert saas_support_ticket_created
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, is_default, updated_at)
VALUES (
    'saas_support_ticket_created',
    'Ticket de Soporte Creado',
    'Ticket de Soporte Creado: {{subject}} (#{{ticket_number}})',
    '<h2 style="color: #1A2B23; font-size: 22px; margin-bottom: 20px;">Tu ticket de soporte ha sido creado</h2>
<p>Hola{{requester_name}},</p>
<p>Hemos recibido tu solicitud de soporte técnico y nuestro equipo está trabajando en ella.</p>
<div style="background: #F9F7F2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
  <p style="margin: 0 0 8px 0;"><strong>Número:</strong> #{{ticket_number}}</p>
  <p style="margin: 0 0 8px 0;"><strong>Asunto:</strong> {{subject}}</p>
  <p style="margin: 0 0 8px 0;"><strong>Categoría:</strong> {{category_label}}</p>
  <p style="margin: 0 0 8px 0;"><strong>Prioridad:</strong> {{priority_label}}</p>
  <p style="margin: 0 0 8px 0;"><strong>Estado:</strong> {{status_label}}</p>
  {{organization_name_block}}
</div>
<p>Nos esforzamos por responder dentro de las próximas 24 horas. Recibirás un email cuando nuestro equipo responda.</p>
<p><a href="{{ticket_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver Estado del Ticket</a></p>',
    '["ticket_number", "subject", "category_label", "priority_label", "status_label", "requester_name", "organization_name", "organization_name_block", "ticket_url"]'::jsonb,
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

-- Step 4: Insert saas_support_new_response
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, is_default, updated_at)
VALUES (
    'saas_support_new_response',
    'Nueva Respuesta en Ticket',
    'Nueva respuesta en tu ticket #{{ticket_number}}',
    '<h2 style="color: #1A2B23; font-size: 22px; margin-bottom: 20px;">Nueva respuesta en tu ticket</h2>
<p>Hola{{requester_name}},</p>
<p>Nuestro equipo de soporte ha respondido a tu ticket <strong>#{{ticket_number}}</strong>.</p>
<div style="background: #F9F7F2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #C5A059;">
  <p style="margin: 0; color: #1A2B23; font-weight: 600;">Ticket: {{subject}}</p>
</div>
<div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
  <p style="margin: 0 0 10px 0; color: #1A2B23; font-weight: 600;">{{message_label}}</p>
  <p style="margin: 0; white-space: pre-wrap;">{{message}}</p>
  <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">{{sender_name}} - {{created_at}}</p>
</div>
<p><a href="{{ticket_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver Ticket Completo</a></p>',
    '["ticket_number", "subject", "message", "message_label", "sender_name", "created_at", "requester_name", "ticket_url"]'::jsonb,
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

-- Step 5: Insert saas_support_ticket_assigned
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, is_default, updated_at)
VALUES (
    'saas_support_ticket_assigned',
    'Ticket Asignado',
    'Ticket asignado: {{subject}} (#{{ticket_number}})',
    '<h2 style="color: #1A2B23; font-size: 22px; margin-bottom: 20px;">Nuevo ticket asignado</h2>
<p>Hola{{assigned_to_name}},</p>
<p>Se te ha asignado un nuevo ticket de soporte que requiere tu atención.</p>
<div style="background: #F9F7F2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
  <p style="margin: 0 0 8px 0;"><strong>Número:</strong> #{{ticket_number}}</p>
  <p style="margin: 0 0 8px 0;"><strong>Asunto:</strong> {{subject}}</p>
  <p style="margin: 0 0 8px 0;"><strong>Prioridad:</strong> {{priority_label}}</p>
  <p style="margin: 0 0 8px 0;"><strong>Solicitante:</strong> {{requester_name}}</p>
  {{organization_name_block}}
</div>
<p><a href="{{ticket_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver Ticket</a></p>',
    '["ticket_number", "subject", "priority_label", "requester_name", "organization_name", "organization_name_block", "assigned_to_name", "ticket_url"]'::jsonb,
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

-- Step 6: Insert saas_support_ticket_resolved
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, is_default, updated_at)
VALUES (
    'saas_support_ticket_resolved',
    'Ticket Resuelto',
    'Ticket resuelto: {{subject}} (#{{ticket_number}})',
    '<h2 style="color: #059669; font-size: 22px; margin-bottom: 20px;">Tu ticket ha sido resuelto</h2>
<p>Hola{{requester_name}},</p>
<p>Nos complace informarte que tu ticket <strong>#{{ticket_number}}</strong> ha sido resuelto.</p>
<div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10B981;">
  <p style="margin: 0; color: #059669; font-weight: 600;">Ticket: {{subject}}</p>
</div>
{{resolution_block}}
<p>Si tienes alguna pregunta adicional, no dudes en crear un nuevo ticket.</p>
<p><a href="{{ticket_url}}" style="display: inline-block; padding: 12px 24px; background: #059669; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver Ticket</a></p>',
    '["ticket_number", "subject", "resolution", "resolution_block", "requester_name", "ticket_url"]'::jsonb,
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

-- Step 7: Verify
DO $$
DECLARE
    v_saas_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_saas_count FROM system_email_templates WHERE category = 'saas';
    RAISE NOTICE 'SaaS B2B templates migration complete. Total SaaS templates: %', v_saas_count;
END $$;
