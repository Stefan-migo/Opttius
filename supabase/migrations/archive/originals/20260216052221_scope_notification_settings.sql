-- Migration: 20260216052221_scope_notification_settings.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Scope notification_settings by organization and branch
-- Each org/branch can have its own notification configuration. Resolution: branch > org > global.
-- Date: 2026-02-16

-- ===== ADD organization_id AND branch_id =====
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

-- Ensure existing rows are global (NULL, NULL)
UPDATE public.notification_settings
SET organization_id = NULL, branch_id = NULL
WHERE organization_id IS NULL AND branch_id IS NULL;

-- ===== DROP OLD UNIQUE, ADD NEW CONSTRAINTS =====
ALTER TABLE public.notification_settings
DROP CONSTRAINT IF EXISTS notification_settings_notification_type_key;

-- One global row per notification_type (org=NULL, branch=NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_global
ON public.notification_settings (notification_type)
WHERE organization_id IS NULL AND branch_id IS NULL;

-- One org-level row per (org, type) when branch is NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_org
ON public.notification_settings (organization_id, notification_type)
WHERE organization_id IS NOT NULL AND branch_id IS NULL;

-- One branch-level row per (org, branch, type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_branch
ON public.notification_settings (organization_id, branch_id, notification_type)
WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_settings_org_id ON public.notification_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_branch_id ON public.notification_settings(branch_id);

-- ===== UPDATE RLS =====
DROP POLICY IF EXISTS "Admins can manage notification settings" ON public.notification_settings;

-- Admins see: global settings + their org settings + their branch settings
CREATE POLICY "Admins can view notification settings"
ON public.notification_settings FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)
  AND (
    (organization_id IS NULL AND branch_id IS NULL)
    OR organization_id = (SELECT organization_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1)
  )
);

-- Admins can insert: global (root only), their org, or their branches
CREATE POLICY "Admins can insert notification settings"
ON public.notification_settings FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)
  AND (
    (organization_id IS NULL AND branch_id IS NULL AND public.is_root_user(auth.uid()))
    OR (
      organization_id = (SELECT organization_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1)
      AND (
        branch_id IS NULL
        OR branch_id IN (SELECT gub.branch_id FROM public.get_user_branches(auth.uid()) gub)
      )
    )
  )
);

CREATE POLICY "Admins can update notification settings"
ON public.notification_settings FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)
  AND (
    (organization_id IS NULL AND branch_id IS NULL AND public.is_root_user(auth.uid()))
    OR (
      organization_id = (SELECT organization_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1)
      AND (
        branch_id IS NULL
        OR branch_id IN (SELECT gub.branch_id FROM public.get_user_branches(auth.uid()) gub)
      )
    )
  )
);

-- ===== NEW FUNCTIONS: Resolution branch > org > global =====
CREATE OR REPLACE FUNCTION public.get_notification_setting_effective(
  p_notification_type admin_notification_type,
  p_organization_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (enabled BOOLEAN, priority admin_notification_priority)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ns.enabled, ns.priority
  FROM public.notification_settings ns
  WHERE ns.notification_type = p_notification_type
  AND (
    (p_branch_id IS NOT NULL AND ns.organization_id = p_organization_id AND ns.branch_id = p_branch_id)
    OR (p_branch_id IS NULL AND p_organization_id IS NOT NULL AND ns.organization_id = p_organization_id AND ns.branch_id IS NULL)
    OR (ns.organization_id IS NULL AND ns.branch_id IS NULL)
  )
  ORDER BY
    CASE WHEN ns.branch_id IS NOT NULL THEN 1
         WHEN ns.organization_id IS NOT NULL THEN 2
         ELSE 3 END
  LIMIT 1;
END;
$$;

-- Overload: is_notification_enabled with org/branch (resolution: branch > org > global)
CREATE OR REPLACE FUNCTION public.is_notification_enabled(
  p_notification_type admin_notification_type,
  p_organization_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT COALESCE((SELECT eff.enabled FROM public.get_notification_setting_effective(p_notification_type, p_organization_id, p_branch_id) eff LIMIT 1), true)
  INTO v_enabled;
  RETURN v_enabled;
END;
$$;

-- Overload: get_notification_priority with org/branch
CREATE OR REPLACE FUNCTION public.get_notification_priority(
  p_notification_type admin_notification_type,
  p_default_priority admin_notification_priority DEFAULT 'medium',
  p_organization_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS admin_notification_priority
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_priority admin_notification_priority;
BEGIN
  SELECT COALESCE(eff.priority, p_default_priority)
  INTO v_priority
  FROM public.get_notification_setting_effective(p_notification_type, p_organization_id, p_branch_id) eff
  LIMIT 1;
  RETURN COALESCE(v_priority, p_default_priority);
END;
$$;

-- Preserve backward compatibility: 2-arg version of is_notification_enabled (global only)
CREATE OR REPLACE FUNCTION public.is_notification_enabled(p_notification_type admin_notification_type)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_notification_enabled(p_notification_type, NULL::UUID, NULL::UUID);
END;
$$;

-- Preserve backward compatibility: 2-arg version of get_notification_priority (global only)
CREATE OR REPLACE FUNCTION public.get_notification_priority(
  p_notification_type admin_notification_type,
  p_default_priority admin_notification_priority DEFAULT 'medium'
)
RETURNS admin_notification_priority
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_notification_priority(p_notification_type, p_default_priority, NULL::UUID, NULL::UUID);
END;
$$;

COMMENT ON COLUMN public.notification_settings.organization_id IS 'Organization scope. NULL = global default.';
COMMENT ON COLUMN public.notification_settings.branch_id IS 'Branch scope. NULL = org-level or global.';
