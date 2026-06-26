-- Migration: 20260405000001_create_survey_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Customer Satisfaction Survey System
-- Version: 20260405000001
-- Description: Tables for satisfaction survey after lens delivery,
--              invitations with tokens, and RLS policies

-- Table: survey_invitations (tokens for one-time survey access)
CREATE TABLE IF NOT EXISTS public.survey_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.lab_work_orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_survey_invitations_token ON public.survey_invitations(token);
CREATE INDEX IF NOT EXISTS idx_survey_invitations_org ON public.survey_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_survey_invitations_work_order ON public.survey_invitations(work_order_id);
CREATE INDEX IF NOT EXISTS idx_survey_invitations_expires ON public.survey_invitations(expires_at) WHERE used_at IS NULL;

-- Table: customer_satisfaction_surveys (responses)
CREATE TABLE IF NOT EXISTS public.customer_satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.lab_work_orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  token_used TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_token_used ON public.customer_satisfaction_surveys(token_used);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_org ON public.customer_satisfaction_surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_created ON public.customer_satisfaction_surveys(created_at DESC);

-- RLS
ALTER TABLE public.survey_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- survey_invitations: service_role for insert (from delivery flow), no public read of full rows
CREATE POLICY "Service role can manage survey_invitations"
  ON public.survey_invitations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Org admins can view their invitations (for debugging)
CREATE POLICY "Org admins can view survey_invitations"
  ON public.survey_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.organization_id = survey_invitations.organization_id
        AND au.is_active = true
    )
  );

-- customer_satisfaction_surveys: service_role for insert (from public submit API)
CREATE POLICY "Service role can manage customer_satisfaction_surveys"
  ON public.customer_satisfaction_surveys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Org admins can view their survey responses
CREATE POLICY "Org admins can view customer_satisfaction_surveys"
  ON public.customer_satisfaction_surveys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
        AND au.organization_id = customer_satisfaction_surveys.organization_id
        AND au.is_active = true
    )
  );

COMMENT ON TABLE public.survey_invitations IS 'One-time tokens for satisfaction survey links sent after lens delivery';
COMMENT ON TABLE public.customer_satisfaction_surveys IS 'Customer satisfaction survey responses (score 1-5, optional comment)';
