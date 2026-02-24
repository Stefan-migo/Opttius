-- Migration: Allow viewing inactive email templates
-- Admins need to see all templates (active and inactive) to toggle them.
-- The previous policy only showed organization defaults when is_active = true,
-- causing deactivated templates to disappear from the list.
-- Date: 2026-02-27

DROP POLICY IF EXISTS "Organizations can view their templates and defaults" ON system_email_templates;

CREATE POLICY "Organizations can view their templates and defaults"
ON system_email_templates
FOR SELECT
TO authenticated
USING (
    -- View organization default templates (active or inactive - admins manage them)
    (category = 'organization' AND organization_id IS NULL)
    OR
    -- View templates of your organization
    (organization_id IN (
        SELECT organization_id FROM admin_users 
        WHERE id = auth.uid() AND organization_id IS NOT NULL
    ))
    OR
    -- View SaaS templates if super_admin
    (category = 'saas' AND public.is_super_admin(auth.uid()))
);
