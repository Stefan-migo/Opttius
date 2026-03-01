-- Migration: Create tier_change_audit table for tracking tier changes
-- Enables audit trail: who changed what tier, when, and from which source

CREATE TABLE IF NOT EXISTS public.tier_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_tier TEXT NOT NULL,
  to_tier TEXT NOT NULL,
  changed_by_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('root', 'org_user', 'checkout', 'scheduled_job')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tier_change_audit_organization
  ON public.tier_change_audit(organization_id);

CREATE INDEX IF NOT EXISTS idx_tier_change_audit_created_at
  ON public.tier_change_audit(created_at DESC);

ALTER TABLE public.tier_change_audit ENABLE ROW LEVEL SECURITY;

-- Only root/dev can read audit (SaaS management)
CREATE POLICY "Root users can view tier change audit"
ON public.tier_change_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND role IN ('root', 'dev') AND is_active = true
  )
);

-- Service role inserts (no policy for INSERT - API uses service role)
COMMENT ON TABLE public.tier_change_audit IS 'Audit log of subscription tier changes for billing and support';
