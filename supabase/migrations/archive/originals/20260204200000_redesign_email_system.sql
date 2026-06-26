-- Migration: 20260204200000_redesign_email_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Redesign Email System (SaaS & Organizations)
-- This migration separates SaaS-level emails from Organization-level emails
-- and genericizes templates to remove references to previous brands.

-- 1. Add organization_id and category to system_email_templates
ALTER TABLE public.system_email_templates
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'organization' CHECK (category IN ('saas', 'organization')),
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- 2. Update type constraint to include SaaS-level types
ALTER TABLE public.system_email_templates
DROP CONSTRAINT IF EXISTS system_email_templates_type_check;

ALTER TABLE public.system_email_templates
ADD CONSTRAINT system_email_templates_type_check CHECK (type IN (
  -- B2C / Organization Templates
  'order_confirmation', 'order_shipped', 'order_delivered', 'payment_success', 'payment_failed',
  'appointment_confirmation', 'appointment_reminder', 'appointment_cancellation', 'appointment_rescheduled',
  'prescription_ready', 'prescription_expiring', 'quote_sent', 'quote_expiring', 'quote_accepted',
  'work_order_ready', 'work_order_completed',
  
  -- B2B / SaaS Templates
  'saas_welcome', 'saas_trial_ending', 'saas_subscription_success', 'saas_subscription_failed',
  'saas_payment_reminder', 'saas_onboarding_step_1', 'saas_account_suspended',
  
  -- System / General
  'password_reset', 'account_welcome', 'low_stock_alert', 'marketing', 'custom'
));

-- 3. Mark existing templates as 'organization' and set is_default = true for system ones
UPDATE public.system_email_templates
SET category = 'organization', is_default = true
WHERE organization_id IS NULL AND is_system = true;

-- 4. Eradicate "DA LUZ CONSCIENTE" and genericize
UPDATE public.system_email_templates
SET 
  subject = REPLACE(subject, 'DA LUZ CONSCIENTE', '{{organization_name}}'),
  content = REPLACE(
    REPLACE(
      REPLACE(content, 'DA LUZ CONSCIENTE', '{{organization_name}}'),
      'info@daluzconsciente.com', '{{organization_email}}'
    ),
    'soporte@daluzconsciente.com', '{{organization_support_email}}'
  )
WHERE content LIKE '%DA LUZ CONSCIENTE%' OR subject LIKE '%DA LUZ CONSCIENTE%';

-- Also check for "Equipo DA LUZ"
UPDATE public.system_email_templates
SET content = REPLACE(content, 'Equipo DA LUZ CONSCIENTE', 'Equipo {{organization_name}}')
WHERE content LIKE '%Equipo DA LUZ CONSCIENTE%';

-- Genericize clinics too if they used clinic_name
UPDATE public.system_email_templates
SET content = REPLACE(content, '{{clinic_name}}', '{{organization_name}}'),
    variables = variables || '["organization_name"]'::jsonb
WHERE content LIKE '%{{clinic_name}}%';

-- 5. Update RLS policies to handle multi-tenancy correctly
DROP POLICY IF EXISTS "Admin users can manage email templates" ON public.system_email_templates;

-- Organizations can select their own templates OR system default templates
CREATE POLICY "Organizations can view their templates and defaults" ON public.system_email_templates
FOR SELECT USING (
  (organization_id IS NULL AND category = 'organization' AND is_active = true) OR
  (organization_id = (SELECT organization_id FROM public.admin_users WHERE id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role = 'super_admin'))
);

-- Organizations can only manage their own templates
CREATE POLICY "Organizations can manage their templates" ON public.system_email_templates
FOR ALL USING (
  (organization_id = (SELECT organization_id FROM public.admin_users WHERE id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role = 'super_admin'))
) WITH CHECK (
  (organization_id = (SELECT organization_id FROM public.admin_users WHERE id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role = 'super_admin'))
);

-- 6. Insert SaaS default templates
INSERT INTO public.system_email_templates (name, type, subject, content, variables, is_system, category, is_default) VALUES
  (
    'Bienvenida SaaS',
    'saas_welcome',
    'Bienvenido a Opttius - Transformando tu Gestión Óptica',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1e40af;">¡Bienvenido a Opttius!</h1>
    <p>Hola {{user_name}},</p>
    <p>Estamos emocionados de tenerte con nosotros. Tu cuenta para <strong>{{organization_name}}</strong> ha sido creada exitosamente.</p>
    <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Configura tu sistema en 3 pasos:</strong></p>
      <ol>
        <li>Completa el perfil de tu óptica.</li>
        <li>Crea tu primera sucursal.</li>
        <li>Agrega tus productos o servicios.</li>
      </ol>
    </div>
    <p>Si tienes alguna duda, nuestro equipo de soporte está listo para ayudarte.</p>
    <p>Saludos,<br>Equipo Opttius</p>
  </div>
</body>
</html>',
    '["user_name", "organization_name"]'::jsonb,
    true,
    'saas',
    true
  ),
  (
    'Fin de Prueba Gratuita',
    'saas_trial_ending',
    'Tu periodo de prueba en Opttius está por terminar',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #ea580c;">Tu prueba gratuita termina pronto</h1>
    <p>Hola {{user_name}},</p>
    <p>Te informamos que tu periodo de prueba para <strong>{{organization_name}}</strong> finalizará en {{days_left}} días.</p>
    <p>Para seguir disfrutando de todas las funciones de Opttius sin interrupciones, por favor elige un plan de suscripción.</p>
    <p>Saludos,<br>Equipo Opttius</p>
  </div>
</body>
</html>',
    '["user_name", "organization_name", "days_left"]'::jsonb,
    true,
    'saas',
    true
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_email_templates_org ON public.system_email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_email_templates_category ON public.system_email_templates(category);
