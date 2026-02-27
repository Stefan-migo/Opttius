-- Migration: Create ai_usage_log table for AI/LLM token usage tracking
-- Used by /api/admin/ai/usage and lib/ai/usage-logger for cost monitoring

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  endpoint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.ai_usage_log IS 'Logs LLM token usage per organization for cost monitoring and analytics';
COMMENT ON COLUMN public.ai_usage_log.organization_id IS 'Organization that incurred the usage';
COMMENT ON COLUMN public.ai_usage_log.provider IS 'LLM provider (openai, anthropic, google, deepseek, etc.)';
COMMENT ON COLUMN public.ai_usage_log.model IS 'Model identifier (e.g. gpt-4o, claude-3-5-sonnet)';
COMMENT ON COLUMN public.ai_usage_log.prompt_tokens IS 'Input tokens consumed';
COMMENT ON COLUMN public.ai_usage_log.completion_tokens IS 'Output tokens consumed';
COMMENT ON COLUMN public.ai_usage_log.endpoint IS 'Optional endpoint or context (e.g. chat, insights)';

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_id ON public.ai_usage_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON public.ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_created ON public.ai_usage_log(organization_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- SELECT: Admins can read their organization's usage; super_admin/root/dev can read all
CREATE POLICY "Admins can read their org ai_usage_log"
ON public.ai_usage_log
FOR SELECT
USING (
  organization_id = public.get_user_organization_id()
  OR EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND is_active = true
    AND role IN ('super_admin', 'root', 'dev')
  )
);

-- INSERT: Admins can insert for their org; super_admin/root/dev can insert for any org (cron, etc.)
CREATE POLICY "Admins can insert ai_usage_log for their org"
ON public.ai_usage_log
FOR INSERT
WITH CHECK (
  (
    organization_id = public.get_user_organization_id()
    AND public.get_user_organization_id() IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND is_active = true
    AND role IN ('super_admin', 'root', 'dev')
  )
);
