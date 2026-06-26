-- Migration: 20260307000000_demo_funnel_stages.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Demo funnel stages - extend demo_requests for sales pipeline tracking
-- Enables full funnel management: demo_active -> demo_expiring -> demo_expired -> meeting -> conversion

-- 1. Add funnel_stage and tracking columns
ALTER TABLE public.demo_requests
  ADD COLUMN IF NOT EXISTS funnel_stage TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS demo_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS meeting_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meeting_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_type TEXT,
  ADD COLUMN IF NOT EXISTS offer_details JSONB,
  ADD COLUMN IF NOT EXISTS conversion_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_email_sent TEXT,
  ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2. Add CHECK for funnel_stage
ALTER TABLE public.demo_requests
  DROP CONSTRAINT IF EXISTS demo_requests_funnel_stage_check;

ALTER TABLE public.demo_requests
  ADD CONSTRAINT demo_requests_funnel_stage_check
  CHECK (funnel_stage IN (
    'pending', 'approved', 'rejected', 'demo_expiring', 'demo_expired',
    'meeting_scheduled', 'post_meeting', 'negotiation', 'migration', 'converted', 'lost'
  ));

-- 3. Backfill existing approved records
UPDATE public.demo_requests
SET
  funnel_stage = 'approved',
  demo_started_at = COALESCE(reviewed_at, created_at),
  demo_expires_at = COALESCE(reviewed_at, created_at) + INTERVAL '7 days',
  last_contact_at = COALESCE(reviewed_at, created_at)
WHERE status = 'approved'
  AND (funnel_stage IS NULL OR funnel_stage = 'pending');

-- 4. Sync funnel_stage for rejected
UPDATE public.demo_requests
SET funnel_stage = 'rejected'
WHERE status = 'rejected' AND (funnel_stage IS NULL OR funnel_stage != 'rejected');

-- 5. Create index for funnel queries
CREATE INDEX IF NOT EXISTS idx_demo_requests_funnel_stage ON public.demo_requests(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_demo_requests_demo_expires_at ON public.demo_requests(demo_expires_at)
  WHERE demo_expires_at IS NOT NULL;

COMMENT ON COLUMN public.demo_requests.funnel_stage IS 'Sales funnel stage: pending, approved, demo_expiring, demo_expired, meeting_scheduled, post_meeting, negotiation, migration, converted, rejected, lost';
COMMENT ON COLUMN public.demo_requests.demo_started_at IS 'When demo was approved and started';
COMMENT ON COLUMN public.demo_requests.demo_expires_at IS 'When demo expires (7 days from approval)';
COMMENT ON COLUMN public.demo_requests.meeting_url IS 'URL for virtual meeting (Google Meet, Zoom, etc.)';
COMMENT ON COLUMN public.demo_requests.last_email_sent IS 'Last automated email type sent: demo_expiring, demo_expired, post_meeting_followup';

-- 6. Add global meeting URL config for funnel emails (default CTA link)
INSERT INTO public.system_config (config_key, config_value, description, category, is_public, value_type)
SELECT
  'demo_funnel_meeting_url',
  '"https://calendly.com/opttius"'::jsonb,
  'URL para agendar reunión con prospectos de demo (Google Meet, Zoom, Calendly). Usado en emails de funnel.',
  'saas',
  false,
  'string'
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_config
  WHERE config_key = 'demo_funnel_meeting_url' AND organization_id IS NULL
);
