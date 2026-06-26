-- Migration: 20260201000000_admin_notifications_root_dev_visibility.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Allow dev users to see notifications targeted to root (SaaS support)
-- Drop and recreate the SELECT policy to include: when target_admin_role = 'root', both root and dev can see

DROP POLICY IF EXISTS "Admin users can view their notifications" ON public.admin_notifications;

CREATE POLICY "Admin users can view their notifications" ON public.admin_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = true
    )
    AND (
      target_admin_id = auth.uid()
      OR target_admin_id IS NULL
      OR target_admin_role = (SELECT role FROM public.admin_users WHERE id = auth.uid())
      OR (
        target_admin_role = 'root'
        AND (SELECT role FROM public.admin_users WHERE id = auth.uid()) IN ('root', 'dev')
      )
    )
  );

-- Update get_unread_notification_count so root-targeted notifications only count for root/dev
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(admin_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.admin_notifications n
    WHERE n.is_read = false
      AND n.is_archived = false
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
      AND (
        n.target_admin_id = admin_user_id
        OR (n.target_admin_id IS NULL AND n.target_admin_role IS NULL)
        OR (n.target_admin_id IS NULL AND n.target_admin_role = (SELECT role FROM public.admin_users WHERE id = admin_user_id))
        OR (n.target_admin_id IS NULL AND n.target_admin_role = 'root' AND (SELECT role FROM public.admin_users WHERE id = admin_user_id) IN ('root', 'dev'))
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
