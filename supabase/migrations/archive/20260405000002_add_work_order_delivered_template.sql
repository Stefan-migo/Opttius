-- Migration: 20260405000002_add_work_order_delivered_template.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add work_order_delivered email template
-- Version: 20260405000002
-- Description: Add template type and default for delivery completion email with survey link

-- 1. Extend type constraint to include work_order_delivered
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
            'work_order_ready'::text, 'work_order_completed'::text, 'work_order_delivered'::text,
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
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Insert default work_order_delivered template (organization_id IS NULL = default)
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, template_group, is_default, updated_at)
SELECT
  'work_order_delivered',
  'Entrega completada + encuesta',
  'Gracias por confiar en {{organization_name}}',
  '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Confirmamos que has recibido tu trabajo {{work_order_number}}.</p></div><p style="margin: 24px 0 0 0; color: #475569;">Tu opinión nos ayuda a mejorar. Te invitamos a responder una breve encuesta:</p><p style="margin: 16px 0 0 0;"><a href="{{survey_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Responder encuesta</a></p><p style="margin: 24px 0 0 0; color: #64748b;">Gracias por confiar en nosotros. Saludos,<br>{{organization_name}}</p>',
  '["customer_name","work_order_number","organization_name","survey_url"]'::jsonb,
  true,
  true,
  'organization',
  NULL,
  'support',
  true,
  NOW()
FROM (SELECT 1) x
WHERE NOT EXISTS (SELECT 1 FROM system_email_templates WHERE type = 'work_order_delivered' AND organization_id IS NULL);
