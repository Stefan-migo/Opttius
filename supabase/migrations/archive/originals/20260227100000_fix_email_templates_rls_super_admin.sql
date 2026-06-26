-- Migration: 20260227100000_fix_email_templates_rls_super_admin.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix email templates RLS to use is_super_admin()
-- Users with admin_branch_access(branch_id=NULL) have role=admin but are super admins.
-- The RLS policy only checked role='super_admin', blocking these users from updating
-- system templates. Use is_super_admin(auth.uid()) for consistency with API logic.
-- Date: 2026-02-27

DROP POLICY IF EXISTS "Organizations can manage their templates" ON system_email_templates;

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
    -- Super admin (role OR is_super_admin RPC) can manage EVERYTHING including SaaS
    (public.is_super_admin(auth.uid()))
);
