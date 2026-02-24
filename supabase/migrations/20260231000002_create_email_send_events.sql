-- ============================================================================
-- Migration: Create email_send_events table for Resend webhook events
-- Version: 20260231000002
-- Date: 2026-02-23
-- Description: Stores email delivery, open, click events from Resend webhooks
--              for metrics and analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_send_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  recipient TEXT,
  subject TEXT,
  template_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_send_events_email_id ON public.email_send_events(email_id);
CREATE INDEX IF NOT EXISTS idx_email_send_events_event_type ON public.email_send_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_send_events_created_at ON public.email_send_events(created_at DESC);

-- RLS: Only root/dev can read (via service role for webhook writes)
ALTER TABLE public.email_send_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage email_send_events"
  ON public.email_send_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Root and dev can read email_send_events"
  ON public.email_send_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND role IN ('root', 'dev')
    )
  );
