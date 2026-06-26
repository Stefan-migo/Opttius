-- Migration: 20260131000004_create_ai_insights.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create AI Insights System
-- Phase AI Implementation: Create schema for AI-powered contextual insights
-- This migration implements the foundation for AI insights widgets

-- ===== CREATE AI_INSIGHTS TABLE =====
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Contexto del insight
  section TEXT NOT NULL CHECK (section IN ('dashboard', 'inventory', 'clients', 'pos', 'analytics')),
  type TEXT NOT NULL CHECK (type IN ('warning', 'opportunity', 'info', 'neutral')),
  
  -- Contenido
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  message TEXT NOT NULL CHECK (char_length(message) <= 500),
  
  -- Acción sugerida
  action_label TEXT CHECK (action_label IS NULL OR char_length(action_label) <= 50),
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Estado y prioridad
  is_dismissed BOOLEAN DEFAULT FALSE NOT NULL,
  priority INTEGER DEFAULT 5 NOT NULL,
  
  -- Feedback del usuario
  feedback_score INTEGER CHECK (feedback_score IS NULL OR (feedback_score >= 1 AND feedback_score <= 5))
);

-- Add constraint separately if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_insights_priority_check'
  ) THEN
    ALTER TABLE public.ai_insights
    ADD CONSTRAINT ai_insights_priority_check CHECK (priority >= 1 AND priority <= 10);
  END IF;
END $$;

-- ===== CREATE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_ai_insights_org_section ON public.ai_insights(organization_id, section);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON public.ai_insights(priority DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_dismissed ON public.ai_insights(is_dismissed) WHERE is_dismissed = FALSE;
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON public.ai_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON public.ai_insights(type);

-- ===== ENABLE ROW LEVEL SECURITY =====
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- ===== CREATE RLS POLICIES =====

-- Policy: Users can view insights for their organization
CREATE POLICY "Users can view insights for their org"
ON public.ai_insights FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
    LIMIT 1
  )
  OR
  -- Super admins can view all insights
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
);

-- Policy: Admins can manage insights for their organization
CREATE POLICY "Admins can manage insights for their org"
ON public.ai_insights FOR ALL
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
    LIMIT 1
  )
  OR
  -- Super admins can manage all insights
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
    LIMIT 1
  )
  OR
  -- Super admins can manage all insights
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
);

-- ===== CREATE FUNCTION TO UPDATE UPDATED_AT =====
CREATE OR REPLACE FUNCTION public.update_ai_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== CREATE TRIGGER FOR UPDATED_AT =====
CREATE TRIGGER update_ai_insights_updated_at
BEFORE UPDATE ON public.ai_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_insights_updated_at();

-- ===== COMMENTS =====
COMMENT ON TABLE public.ai_insights IS 'AI-generated contextual insights for different sections of the application';
COMMENT ON COLUMN public.ai_insights.section IS 'Section where the insight is displayed: dashboard, inventory, clients, pos, analytics';
COMMENT ON COLUMN public.ai_insights.type IS 'Type of insight: warning, opportunity, info, neutral';
COMMENT ON COLUMN public.ai_insights.priority IS 'Priority from 1 (low) to 10 (critical)';
COMMENT ON COLUMN public.ai_insights.metadata IS 'Additional data for pre-filling forms or actions';
COMMENT ON COLUMN public.ai_insights.feedback_score IS 'User feedback rating from 1 to 5 stars';
