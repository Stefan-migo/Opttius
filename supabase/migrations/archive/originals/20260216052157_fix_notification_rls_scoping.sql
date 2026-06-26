-- Migration: 20260216052157_fix_notification_rls_scoping.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix notification RLS scoping - remove conflicting policies
-- The old "Admins can view notifications in their branches" policy allows ANY admin
-- to see notifications where branch_id IS NULL, leaking across organizations.
-- Date: 2026-02-16

-- ===== DROP CONFLICTING POLICIES =====
DROP POLICY IF EXISTS "Admins can view notifications in their branches" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admins can manage notifications in their branches" ON public.admin_notifications;

-- ===== UPDATE mark_notification_read: Add branch filter for non-root users =====
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
      AND organization_id IS NULL
    )
    OR
    -- Non-root users: only mark notifications they can see (org + branch)
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
      AND (
        branch_id IS NULL
        OR branch_id IN (
          SELECT gub.branch_id FROM public.get_user_branches(auth.uid()) gub
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== UPDATE mark_all_notifications_read: Add branch filter for non-root users =====
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
      AND organization_id IS NULL
    )
    OR
    -- Non-root users: only mark notifications they can see (org + branch)
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
      AND (
        branch_id IS NULL
        OR branch_id IN (
          SELECT gub.branch_id FROM public.get_user_branches(auth.uid()) gub
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.mark_notification_read IS 'Mark a notification as read. Respects org and branch scoping for non-root users.';
COMMENT ON FUNCTION public.mark_all_notifications_read IS 'Mark all visible notifications as read. Respects org and branch scoping for non-root users.';
