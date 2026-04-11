-- Migration: Create saas_audit_log table
-- Tracks all actions performed by root/dev users in SaaS Management

CREATE TABLE IF NOT EXISTS public.saas_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  target_name TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_saas_audit_log_user_id ON saas_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_saas_audit_log_created_at ON saas_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_audit_log_target ON saas_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_saas_audit_log_action ON saas_audit_log(action);

-- RLS (service role only for writes, readable by root/dev)
ALTER TABLE public.saas_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "saas_audit_log_service_role_full_access"
  ON public.saas_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users with root/dev role to read
CREATE POLICY "saas_audit_log_root_read"
  ON public.saas_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()
      AND role IN ('root', 'dev')
    )
  );

-- Comments
COMMENT ON TABLE public.saas_audit_log IS 'Audit log for SaaS Management actions performed by root/dev users';
COMMENT ON COLUMN public.saas_audit_log.user_id IS 'ID of user who performed the action';
COMMENT ON COLUMN public.saas_audit_log.user_email IS 'Email of user who performed the action (cached)';
COMMENT ON COLUMN public.saas_audit_log.action IS 'Type of action: create, update, delete, suspend, activate, cancel, change_tier';
COMMENT ON COLUMN public.saas_audit_log.target_type IS 'Type of resource: organization, subscription, tier, user';
COMMENT ON COLUMN public.saas_audit_log.target_id IS 'ID of the affected resource';
COMMENT ON COLUMN public.saas_audit_log.target_name IS 'Name of the affected resource (cached)';
COMMENT ON COLUMN public.saas_audit_log.old_value IS 'Previous state of the resource';
COMMENT ON COLUMN public.saas_audit_log.new_value IS 'New state of the resource';
COMMENT ON COLUMN public.saas_audit_log.ip_address IS 'IP address of the user';
COMMENT ON COLUMN public.saas_audit_log.user_agent IS 'User agent string';
