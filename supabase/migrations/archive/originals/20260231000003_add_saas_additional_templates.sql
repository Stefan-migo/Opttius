-- Migration: 20260231000003_add_saas_additional_templates.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- ============================================================================
-- Migration: Add additional SaaS email templates
-- Version: 20260231000003
-- Date: 2026-02-23
-- Description: Adds saas_onboarding, saas_maintenance, saas_feature_announcement
--              IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- saas_onboarding
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, is_default, updated_at)
VALUES (
    'saas_onboarding',
    'Onboarding SaaS',
    'Paso {{step_number}} de {{total_steps}}: {{current_step_name}} - Opttius',
    '<div style="max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1A2B23; font-size: 24px; margin-bottom: 20px;">Configura tu óptica en Opttius</h1>
  <p>Hola {{user_name}},</p>
  <p>Estás en el paso <strong>{{step_number}}</strong> de {{total_steps}}: {{current_step_name}}.</p>
  <div style="background: #F9F7F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C5A059;">
    <p style="margin: 0 0 8px 0;"><strong>Siguiente:</strong> {{next_step_name}}</p>
    <p style="margin: 0;"><a href="{{next_step_url}}" style="color: #1A2B23; font-weight: 600;">Continuar →</a></p>
  </div>
  <p><a href="{{resources_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver Recursos</a></p>
  <p>Saludos,<br>Equipo Opttius</p>
</div>',
    '["user_name", "organization_name", "step_number", "total_steps", "current_step_name", "next_step_name", "next_step_url", "resources_url"]'::jsonb,
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

-- saas_maintenance
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, is_default, updated_at)
VALUES (
    'saas_maintenance',
    'Mantenimiento Programado',
    'Mantenimiento programado - {{organization_name}}',
    '<div style="max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1A2B23; font-size: 24px; margin-bottom: 20px;">Mantenimiento programado</h1>
  <p>Hola,</p>
  <p>Te informamos que Opttius tendrá un mantenimiento programado que podría afectar el servicio.</p>
  <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
    <p style="margin: 0 0 8px 0;"><strong>Inicio:</strong> {{maintenance_start}}</p>
    <p style="margin: 0 0 8px 0;"><strong>Fin estimado:</strong> {{maintenance_end}}</p>
    <p style="margin: 0;"><strong>Servicios afectados:</strong> {{affected_services}}</p>
  </div>
  <p><a href="{{status_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver Estado del Sistema</a></p>
  <p>Saludos,<br>Equipo Opttius</p>
</div>',
    '["organization_name", "maintenance_start", "maintenance_end", "affected_services", "status_url"]'::jsonb,
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

-- saas_feature_announcement
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, is_default, updated_at)
VALUES (
    'saas_feature_announcement',
    'Nueva Función',
    'Nueva función: {{feature_name}} - Opttius',
    '<div style="max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1A2B23; font-size: 24px; margin-bottom: 20px;">Nueva función disponible</h1>
  <p>Hola,</p>
  <p>Tenemos el gusto de presentarte <strong>{{feature_name}}</strong>, disponible desde {{release_date}}.</p>
  <div style="background: #F9F7F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C5A059;">
    <p style="margin: 0;">{{feature_description}}</p>
  </div>
  <p><a href="{{feature_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Conocer más</a></p>
  <p>Saludos,<br>Equipo Opttius</p>
</div>',
    '["organization_name", "feature_name", "feature_description", "feature_url", "release_date", "docs_url"]'::jsonb,
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
