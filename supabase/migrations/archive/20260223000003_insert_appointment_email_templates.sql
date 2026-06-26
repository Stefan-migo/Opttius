-- Migration: 20260223000003_insert_appointment_email_templates.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Insert default email templates for appointment_rescheduled and appointment_follow_up_reminder
-- Date: 2026-02-23

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM system_email_templates WHERE type = 'appointment_rescheduled' AND organization_id IS NULL) THEN
    INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, created_at, updated_at)
    VALUES (
      'appointment_rescheduled',
      'Cita Reprogramada',
      'Tu cita fue reprogramada - {{organization_name}}',
      '<p>Hola {{customer_first_name}},</p><p>Tu cita ha sido reprogramada.</p><p><strong>Fecha anterior:</strong> {{old_appointment_date}} a las {{old_appointment_time}}</p><p><strong>Nueva fecha:</strong> {{appointment_date}} a las {{appointment_time}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Si tienes alguna pregunta, contáctanos al {{branch_phone}}.</p><p>Saludos,<br>{{organization_name}}</p>',
      '["customer_name","customer_first_name","appointment_date","appointment_time","old_appointment_date","old_appointment_time","branch_name","branch_phone","organization_name"]'::jsonb,
      true, true, 'organization',
      NOW(), NOW()
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM system_email_templates WHERE type = 'appointment_follow_up_reminder' AND organization_id IS NULL) THEN
    INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, created_at, updated_at)
    VALUES (
      'appointment_follow_up_reminder',
      'Recordatorio de Control',
      'Recuerda tu control programado para el {{follow_up_date}} - {{organization_name}}',
      '<p>Hola {{customer_first_name}},</p><p>Tu oftalmólogo recomendó un control de seguimiento.</p><p><strong>Fecha proyectada:</strong> {{follow_up_date}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Te recomendamos agendar tu cita con anticipación para asegurar disponibilidad.</p><p>Contáctanos al {{branch_phone}} para reservar tu horario.</p><p>Saludos,<br>{{organization_name}}</p>',
      '["customer_name","customer_first_name","follow_up_date","branch_name","branch_phone","organization_name"]'::jsonb,
      true, true, 'organization',
      NOW(), NOW()
    );
  END IF;
END $$;
