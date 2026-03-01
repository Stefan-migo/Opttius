-- Migration: Add funnel email templates and template_group for grouping
-- Adds demo_approved, demo_expiring, demo_expired, demo_post_meeting_followup
-- IDEMPOTENT - safe to run multiple times

-- 1. Add template_group column if not exists
ALTER TABLE public.system_email_templates
  ADD COLUMN IF NOT EXISTS template_group TEXT;

COMMENT ON COLUMN public.system_email_templates.template_group IS 'Group for UI display: funnel, support, etc. Null = no group.';

-- 2. Extend type constraint to include funnel types
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
            'demo_approved'::text, 'demo_expiring'::text, 'demo_expired'::text, 'demo_post_meeting_followup'::text,
            'password_reset'::text, 'account_welcome'::text,
            'low_stock_alert'::text, 'marketing'::text, 'custom'::text,
            'contact_form'::text, 'birthday'::text
        ])
    );

    RAISE NOTICE 'Extended type constraint with funnel template types';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists, skipping';
END $$;

-- 3. Insert funnel email templates (content is inner body; wrapInModernLayout applied in code)
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, template_group, is_default, updated_at)
VALUES
  (
    'demo_approved',
    'Demo Aprobada',
    'Tu demo de Opttius está lista',
    '<p>Hola {{full_name}},</p>
<p>Tu solicitud de demo de Opttius ha sido <strong>aprobada</strong>.</p>
<p>Ya puedes acceder a tu entorno de demostración con tu email y contraseña actual.</p>
<p><a href="{{login_url}}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Acceder a mi demo</a></p>
<p>La demo tiene una duración de 7 días. Si tienes dudas, contáctanos a soporte@opttius.cl.</p>',
    '["full_name", "login_url"]'::jsonb,
    true,
    true,
    'saas',
    NULL,
    'funnel',
    true,
    NOW()
  ),
  (
    'demo_expiring',
    'Demo por Vencer',
    'Tu demo de Opttius vence en {{days_remaining}} {{days_label}}',
    '<p>Hola {{full_name}},</p>
<p>Tu demo de Opttius vence en <strong>{{days_remaining}} {{days_label}}</strong>.</p>
<p>¿Te gustaría agendar una reunión para conocer cómo Opttius puede ayudarte a gestionar tu óptica? Conversamos sobre tus necesidades y te mostramos las opciones de planes.</p>
<p><a href="{{meeting_url}}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Agendar reunión</a></p>
<p>Si tienes dudas, escríbenos a soporte@opttius.cl.</p>',
    '["full_name", "days_remaining", "days_label", "meeting_url"]'::jsonb,
    true,
    true,
    'saas',
    NULL,
    'funnel',
    true,
    NOW()
  ),
  (
    'demo_expired',
    'Demo Expirada',
    'Tu prueba de Opttius ha finalizado',
    '<p>Hola {{full_name}},</p>
<p>Tu prueba de Opttius ha finalizado. Esperamos que hayas podido explorar el sistema: gestión de inventario, citas, presupuestos, POS y más.</p>
<p>Si te gustaría continuar con Opttius o tienes preguntas, agenda una reunión y conversamos sobre tu óptica.</p>
<p><a href="{{meeting_url}}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Agendar reunión</a></p>
<p>También puedes escribirnos a soporte@opttius.cl.</p>',
    '["full_name", "meeting_url"]'::jsonb,
    true,
    true,
    'saas',
    NULL,
    'funnel',
    true,
    NOW()
  ),
  (
    'demo_post_meeting_followup',
    'Post-Reunión Followup',
    'Gracias por reunirte con Opttius',
    '<p>Hola {{full_name}},</p>
<p>Gracias por reunirte con nosotros. Esperamos que la conversación haya sido útil.</p>
<p>Si tienes más preguntas sobre Opttius, planes o la migración de datos, estamos aquí para ayudarte. Escríbenos a soporte@opttius.cl.</p>
<p><a href="{{app_url}}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Ver Opttius</a></p>',
    '["full_name", "app_url"]'::jsonb,
    true,
    true,
    'saas',
    NULL,
    'funnel',
    true,
    NOW()
  )
ON CONFLICT (name, type) DO UPDATE SET
  subject = EXCLUDED.subject,
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  template_group = EXCLUDED.template_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW()
WHERE system_email_templates.organization_id IS NULL;

-- 4. Set template_group for support templates (for UI grouping)
UPDATE system_email_templates
SET template_group = 'support'
WHERE type IN (
  'saas_support_ticket_created',
  'saas_support_new_response',
  'saas_support_ticket_assigned',
  'saas_support_ticket_resolved'
)
AND category = 'saas'
AND organization_id IS NULL;
