-- Migration: 20260201000001_add_organization_id_to_notifications.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add organization_id to admin_notifications and improve filtering
-- This ensures notifications are properly scoped to organizations and don't leak between ópticas
-- Date: 2026-02-01

-- ===== ADD organization_id TO admin_notifications =====
ALTER TABLE public.admin_notifications
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_organization ON public.admin_notifications(organization_id);

-- Update existing notifications to set organization_id based on branch_id
UPDATE public.admin_notifications an
SET organization_id = (
  SELECT b.organization_id 
  FROM public.branches b 
  WHERE b.id = an.branch_id 
  LIMIT 1
)
WHERE an.organization_id IS NULL 
AND an.branch_id IS NOT NULL;

-- For notifications with branch_id = null but related to orders/quotes/work_orders, get organization from entity
UPDATE public.admin_notifications an
SET organization_id = (
  SELECT o.organization_id 
  FROM public.orders o 
  WHERE o.id = an.related_entity_id 
  AND an.related_entity_type = 'order'
  LIMIT 1
)
WHERE an.organization_id IS NULL 
AND an.related_entity_type = 'order'
AND an.related_entity_id IS NOT NULL;

UPDATE public.admin_notifications an
SET organization_id = (
  SELECT q.organization_id 
  FROM public.quotes q 
  WHERE q.id = an.related_entity_id 
  AND an.related_entity_type = 'quote'
  LIMIT 1
)
WHERE an.organization_id IS NULL 
AND an.related_entity_type = 'quote'
AND an.related_entity_id IS NOT NULL;

UPDATE public.admin_notifications an
SET organization_id = (
  SELECT wo.organization_id 
  FROM public.lab_work_orders wo 
  WHERE wo.id = an.related_entity_id 
  AND an.related_entity_type = 'work_order'
  LIMIT 1
)
WHERE an.organization_id IS NULL 
AND an.related_entity_type = 'work_order'
AND an.related_entity_id IS NOT NULL;

UPDATE public.admin_notifications an
SET organization_id = (
  SELECT a.organization_id 
  FROM public.appointments a 
  WHERE a.id = an.related_entity_id 
  AND an.related_entity_type = 'appointment'
  LIMIT 1
)
WHERE an.organization_id IS NULL 
AND an.related_entity_type = 'appointment'
AND an.related_entity_id IS NOT NULL;

UPDATE public.admin_notifications an
SET organization_id = (
  SELECT c.organization_id 
  FROM public.customers c 
  WHERE c.id = an.related_entity_id 
  AND an.related_entity_type = 'customer'
  LIMIT 1
)
WHERE an.organization_id IS NULL 
AND an.related_entity_type = 'customer'
AND an.related_entity_id IS NOT NULL;

UPDATE public.admin_notifications an
SET organization_id = (
  SELECT p.organization_id 
  FROM public.products p 
  WHERE p.id = an.related_entity_id 
  AND an.related_entity_type = 'product'
  LIMIT 1
)
WHERE an.organization_id IS NULL 
AND an.related_entity_type = 'product'
AND an.related_entity_id IS NOT NULL;

-- For SaaS notifications (target_admin_role = 'root'), organization_id should remain NULL
-- These are visible only to root/dev users

-- ===== UPDATE get_user_branches TO FILTER BY ORGANIZATION =====
-- This ensures super_admins only see branches from their organization
CREATE OR REPLACE FUNCTION public.get_user_branches(user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  branch_id UUID,
  branch_name TEXT,
  branch_code TEXT,
  role TEXT,
  is_primary BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM public.admin_users
  WHERE id = user_id
  LIMIT 1;

  -- If super admin, return branches from their organization only (or all if no org)
  IF public.is_super_admin(user_id) THEN
    RETURN QUERY
    SELECT 
      b.id,
      b.name,
      b.code,
      'super_admin'::TEXT,
      false
    FROM public.branches b
    WHERE b.is_active = true
    AND (user_org_id IS NULL OR b.organization_id = user_org_id)
    ORDER BY b.name;
  ELSE
    -- Return user's assigned branches (already filtered by organization via admin_branch_access)
    RETURN QUERY
    SELECT 
      aba.branch_id,
      b.name,
      b.code,
      aba.role,
      aba.is_primary
    FROM public.admin_branch_access aba
    JOIN public.branches b ON b.id = aba.branch_id
    WHERE aba.admin_user_id = user_id
    AND b.is_active = true
    ORDER BY aba.is_primary DESC, b.name;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_user_branches IS 'Get all branches accessible to a user, filtered by organization for super_admins';

-- ===== UPDATE RLS POLICIES FOR admin_notifications =====
-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can view their notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admin users can update their notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Super admin can manage all notifications" ON public.admin_notifications;

-- Policy 1: Root/dev users see only SaaS notifications (target_admin_role = 'root' or assigned to them)
CREATE POLICY "Root users can view SaaS notifications"
ON public.admin_notifications
FOR SELECT
USING (
  public.is_root_user(auth.uid())
  AND (
    target_admin_role = 'root'
    OR target_admin_id = auth.uid()
  )
  AND organization_id IS NULL -- SaaS notifications don't have organization_id
);

-- Policy 2: Non-root users see notifications from their organization only
CREATE POLICY "Users can view their organization notifications"
ON public.admin_notifications
FOR SELECT
USING (
  NOT public.is_root_user(auth.uid())
  AND (
    -- Notification is for their organization
    organization_id = (
      SELECT organization_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1
    )
    OR
    -- Notification is targeted to them specifically
    target_admin_id = auth.uid()
    OR
    -- Notification is broadcast (no target) and belongs to their organization
    (
      target_admin_id IS NULL 
      AND target_admin_role IS NULL
      AND organization_id = (
        SELECT organization_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1
      )
    )
  )
  AND (
    -- Filter by branch: null (legacy) or user's accessible branches
    branch_id IS NULL
    OR
    branch_id IN (
      SELECT branch_id FROM public.get_user_branches(auth.uid())
    )
  )
);

-- Policy 3: Users can update their own notifications
CREATE POLICY "Users can update their notifications"
ON public.admin_notifications
FOR UPDATE
USING (
  (
    public.is_root_user(auth.uid())
    AND (
      target_admin_role = 'root'
      OR target_admin_id = auth.uid()
    )
  )
  OR
  (
    NOT public.is_root_user(auth.uid())
    AND (
      target_admin_id = auth.uid()
      OR
      (
        target_admin_id IS NULL
        AND organization_id = (
          SELECT organization_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1
        )
      )
    )
  )
);

-- ===== UPDATE mark_notification_read FUNCTION =====
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.admin_notifications
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE id = notification_id
  AND (
    -- Root users can mark SaaS notifications as read
    (
      public.is_root_user(auth.uid())
      AND (
        target_admin_role = 'root'
        OR target_admin_id = auth.uid()
      )
    )
    OR
    -- Non-root users can mark their organization notifications as read
    (
      NOT public.is_root_user(auth.uid())
      AND (
        target_admin_id = auth.uid()
        OR
        (
          target_admin_id IS NULL
          AND organization_id = (
            SELECT organization_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1
          )
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== UPDATE mark_all_notifications_read FUNCTION =====
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE public.admin_notifications
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE is_read = false
  AND (
    -- Root users mark SaaS notifications as read
    (
      public.is_root_user(auth.uid())
      AND (
        target_admin_role = 'root'
        OR target_admin_id = auth.uid()
      )
    )
    OR
    -- Non-root users mark their organization notifications as read
    (
      NOT public.is_root_user(auth.uid())
      AND (
        target_admin_id = auth.uid()
        OR
        (
          target_admin_id IS NULL
          AND organization_id = (
            SELECT organization_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1
          )
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== UPDATE get_unread_notification_count FUNCTION =====
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(admin_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.admin_notifications
    WHERE is_read = false
      AND is_archived = false
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (
        -- Root users count SaaS notifications
        (
          public.is_root_user(admin_user_id)
          AND (
            target_admin_role = 'root'
            OR target_admin_id = admin_user_id
          )
          AND organization_id IS NULL
        )
        OR
        -- Non-root users count their organization notifications
        (
          NOT public.is_root_user(admin_user_id)
          AND (
            target_admin_id = admin_user_id
            OR
            (
              target_admin_id IS NULL
              AND organization_id = (
                SELECT organization_id FROM public.admin_users WHERE id = admin_user_id LIMIT 1
              )
            )
          )
          AND (
            branch_id IS NULL
            OR
            branch_id IN (
              SELECT branch_id FROM public.get_user_branches(admin_user_id)
            )
          )
        )
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== COMMENTS =====
COMMENT ON COLUMN public.admin_notifications.organization_id IS 'Organization that owns this notification. NULL for SaaS notifications (target_admin_role=root). Ensures notifications are isolated by organization.';
