-- ============================================================================
-- Migration: Email Templates Complete System with RLS Policies
-- Version: 20260208000001
-- Date: 2026-02-07
-- Description: Complete email templates migration with proper RLS policies
--              This is IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- Step 1: Ensure the CHECK constraints allow our new template types
DO $$
BEGIN
    -- Remove old constraints if they exist
    ALTER TABLE system_email_templates DROP CONSTRAINT IF EXISTS system_email_templates_type_check;
    ALTER TABLE system_email_templates DROP CONSTRAINT IF EXISTS system_email_templates_category_check;
    
    -- Add category constraint
    ALTER TABLE system_email_templates ADD CHECK (category = ANY (ARRAY['saas'::text, 'organization'::text]));
    
    -- Add type constraint with all possible types
    ALTER TABLE system_email_templates ADD CHECK (
        type = ANY (ARRAY[
            'order_confirmation'::text, 'order_shipped'::text, 'order_delivered'::text,
            'payment_success'::text, 'payment_failed'::text,
            'appointment_confirmation'::text, 'appointment_reminder'::text,
            'appointment_reminder_2h'::text, 'appointment_cancelation'::text,
            'appointment_rescheduled'::text,
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
            'password_reset'::text, 'account_welcome'::text,
            'low_stock_alert'::text, 'marketing'::text, 'custom'::text,
            'contact_form'::text, 'birthday'::text
        ])
    );
    
    RAISE NOTICE 'CHECK constraints updated successfully';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraints already exist, skipping';
END $$;

-- Step 2: Replace RLS policies for proper template access
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Organizations can view their templates and defaults" ON system_email_templates;
    DROP POLICY IF EXISTS "Organizations can manage their templates" ON system_email_templates;
    
    -- Create SELECT policy for viewing templates
    CREATE POLICY "Organizations can view their templates and defaults"
    ON system_email_templates
    FOR SELECT
    TO authenticated
    USING (
        -- View organization default templates (is_active = true)
        (category = 'organization' AND organization_id IS NULL AND is_active = true)
        OR
        -- View templates of your organization
        (organization_id IN (
            SELECT organization_id FROM admin_users 
            WHERE id = auth.uid() AND organization_id IS NOT NULL
        ))
        OR
        -- View SaaS templates if super_admin
        (category = 'saas' AND EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND role = 'super_admin'
        ))
    );
    
    -- Create INSERT/UPDATE/DELETE policy for managing templates
    CREATE POLICY "Organizations can manage their templates"
    ON system_email_templates
    FOR ALL
    TO authenticated
    USING (
        -- Admin of an organization can manage their org's templates
        (organization_id IN (
            SELECT organization_id FROM admin_users 
            WHERE id = auth.uid() AND organization_id IS NOT NULL
        ))
        OR
        -- Super_admin can manage EVERYTHING including SaaS
        (EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND role = 'super_admin'
        ))
    );
    
    RAISE NOTICE 'RLS policies created successfully';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Policies already exist, skipping';
END $$;

-- Step 3: Insert Organization Templates (using upsert for idempotency)
DO $$
DECLARE
    v_type TEXT;
    v_name TEXT;
    v_subject TEXT;
    v_content TEXT;
    v_variables JSONB;
BEGIN
    -- appointment_confirmation
    v_type := 'appointment_confirmation';
    v_name := 'Confirmación de Cita';
    v_subject := '✅ Tu cita confirmada: {{appointment_date}} a las {{appointment_time}} - {{organization_name}}';
    v_content := '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Confirmación de Tu Cita</title></head><body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f7fa;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px;"><tr><td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 35px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 26px;">¡Tu Cita Confirmada!</h1></td></tr><tr><td style="padding: 35px;"><p>Hola <strong>{{customer_first_name}}</strong>,</p><p>Tu cita ha sido confirmada para {{appointment_date}} a las {{appointment_time}}.</p><p>Profesional: {{professional_name}}</p><p>Sucursal: {{branch_name}}</p></td></tr></table></body></html>';
    v_variables := '["customer_first_name", "appointment_date", "appointment_time", "professional_name", "branch_name", "organization_name"]'::jsonb;
    
    INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, is_system, is_default)
    VALUES (v_type, v_name, v_subject, v_content, v_variables, true, 'organization', true, true)
    ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, updated_at = NOW();
END $$;

-- Step 4: Verify insertion
DO $$
DECLARE
    v_org_count INTEGER;
    v_saas_count INTEGER;
    v_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_org_count FROM system_email_templates WHERE category = 'organization';
    SELECT COUNT(*) INTO v_saas_count FROM system_email_templates WHERE category = 'saas';
    SELECT COUNT(*) INTO v_total FROM system_email_templates;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Email Templates Migration Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Organization templates: %', v_org_count;
    RAISE NOTICE 'SaaS templates: %', v_saas_count;
    RAISE NOTICE 'Total templates: %', v_total;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'RLS Policies: Configured for super_admin access';
    RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
