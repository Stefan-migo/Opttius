-- Migration: 20260701000001_rls_nurture_campaigns
-- Description: Enable RLS on nurture_* tables (4 tables) with service_role-only policies.
-- These tables are dead (0 TypeScript references) and have no organization_id column.
-- Rollback:
--   DROP POLICY IF EXISTS service_role_only_nurture_campaigns ON public.nurture_campaigns;
--   DROP POLICY IF EXISTS service_role_only_nurture_campaign_emails ON public.nurture_campaign_emails;
--   DROP POLICY IF EXISTS service_role_only_nurture_log ON public.nurture_log;
--   DROP POLICY IF EXISTS service_role_only_nurture_queue ON public.nurture_queue;
--   ALTER TABLE public.nurture_campaigns DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.nurture_campaign_emails DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.nurture_log DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.nurture_queue DISABLE ROW LEVEL SECURITY;

BEGIN;

-- T-001: RLS on nurture_campaigns
ALTER TABLE public.nurture_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_nurture_campaigns"
  ON public.nurture_campaigns
  FOR ALL
  USING (auth.role() = 'service_role');

-- T-002: RLS on nurture_campaign_emails
ALTER TABLE public.nurture_campaign_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_nurture_campaign_emails"
  ON public.nurture_campaign_emails
  FOR ALL
  USING (auth.role() = 'service_role');

-- T-003: RLS on nurture_log
ALTER TABLE public.nurture_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_nurture_log"
  ON public.nurture_log
  FOR ALL
  USING (auth.role() = 'service_role');

-- T-004: RLS on nurture_queue
ALTER TABLE public.nurture_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_nurture_queue"
  ON public.nurture_queue
  FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
