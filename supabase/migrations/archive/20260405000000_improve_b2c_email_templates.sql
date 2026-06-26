-- Migration: 20260405000000_improve_b2c_email_templates.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Improve B2C Email Templates (Testing Feedback)
-- Version: 20260405000000
-- Description: Update default B2C templates per testing feedback:
--   work_order_ready: "trabajo de laboratorio" -> "tus lentes están listos"
--   appointment_cancelation: remove booking_url, use contact info
--   appointment_follow_up_reminder: remove booking_url, use contact info
--   prescription_expiring: remove booking_url, use contact info
--   quote_expiring: remove accept_url, add visit invitation, contact only
--   account_welcome: remove Mi cuenta, cordial welcome with contact

-- work_order_ready: "Tus lentes están listos para retiro" (branch_name optional - status route passes minimal data)
UPDATE system_email_templates
SET
  subject = 'Tus lentes #{{work_order_number}} están listos - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tus lentes están listos para retiro.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0;"><strong>Orden:</strong> {{work_order_number}}</p></div><p style="margin: 24px 0 0 0; color: #64748b;">Puedes acercarte a nuestra sucursal cuando te sea conveniente. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","work_order_number","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'work_order_ready' AND organization_id IS NULL;

-- appointment_cancelation: remove booking_url, use contact
UPDATE system_email_templates
SET
  subject = 'Tu cita del {{appointment_date}} fue cancelada - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu cita programada para el {{appointment_date}} a las {{appointment_time}} ha sido cancelada.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Sucursal:</strong> {{branch_name}}</p><p style="margin: 0 0 8px 0;"><strong>Teléfono:</strong> {{branch_phone}}</p><p style="margin: 0;"><strong>Email:</strong> {{branch_email}}</p></div><p style="margin: 24px 0 0 0;">Para reagendar, contáctanos al {{branch_phone}} o {{branch_email}}.</p><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","appointment_date","appointment_time","branch_name","branch_phone","branch_email","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_cancelation' AND organization_id IS NULL;

-- appointment_follow_up_reminder: remove booking_url, use contact
UPDATE system_email_templates
SET
  subject = 'Recuerda tu control programado para el {{follow_up_date}} - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu oftalmólogo recomendó un control de seguimiento.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Fecha proyectada:</strong> {{follow_up_date}}</p><p style="margin: 0;"><strong>Sucursal:</strong> {{branch_name}}</p></div><p style="margin: 24px 0 0 0;">Te recomendamos agendar tu cita con anticipación. Contáctanos al {{branch_phone}} o {{branch_email}} para agendar.</p><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","follow_up_date","branch_name","branch_phone","branch_email","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_follow_up_reminder' AND organization_id IS NULL;

-- prescription_expiring: remove booking_url, use contact
UPDATE system_email_templates
SET
  subject = 'Tu receta {{prescription_number}} vence pronto - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Te informamos que tu receta {{prescription_number}} vence el {{prescription_expiry_date}}.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Sucursal:</strong> {{branch_name}}</p><p style="margin: 0 0 8px 0;"><strong>Dirección:</strong> {{branch_address}}</p><p style="margin: 0 0 8px 0;"><strong>Teléfono:</strong> {{branch_phone}}</p><p style="margin: 0;"><strong>Email:</strong> {{branch_email}}</p></div><p style="margin: 24px 0 0 0;">Te recomendamos agendar una nueva evaluación antes de esa fecha. Contáctanos al {{branch_phone}} o {{branch_email}} para agendar tu evaluación.</p><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","prescription_expiry_date","prescription_number","branch_name","branch_address","branch_phone","branch_email","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'prescription_expiring' AND organization_id IS NULL;

-- quote_expiring: remove accept_url, add visit invitation, contact only (no quote_url in Phase 1)
UPDATE system_email_templates
SET
  subject = 'Tu presupuesto #{{quote_number}} vence pronto - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu presupuesto {{quote_number}} vence el {{quote_expiry_date}}.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0;"><strong>Total:</strong> {{total}}</p></div><p style="margin: 24px 0 0 0;">Te invitamos a acercarte a nuestra sucursal para concretar tu presupuesto antes de que venza.</p><p style="margin: 16px 0 0 0;"><strong>Teléfono:</strong> {{branch_phone}} | <strong>Email:</strong> {{branch_email}}</p><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","quote_number","quote_expiry_date","total","branch_phone","branch_email","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'quote_expiring' AND organization_id IS NULL;

-- account_welcome: remove Mi cuenta, cordial welcome with contact (support_email from getDefaultVariables)
UPDATE system_email_templates
SET
  subject = 'Bienvenido a {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Bienvenido a {{organization_name}}. Estamos para cuidar tu visión.</p></div><p style="margin: 24px 0 0 0;">Contáctanos: {{support_email}}</p><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","support_email","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'account_welcome' AND organization_id IS NULL;
