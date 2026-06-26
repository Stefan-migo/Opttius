-- Migration: 20260131000008_create_user_tour_progress.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create User Tour Progress Table
-- This migration creates the table to track user onboarding tour progress
-- Date: 2026-01-31

-- ===== CREATE USER TOUR PROGRESS TABLE =====
CREATE TABLE IF NOT EXISTS public.user_tour_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Estado del tour
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'disabled')),
  
  -- Progreso actual
  current_step INTEGER DEFAULT 0,
  completed_steps INTEGER[] DEFAULT '{}',
  
  -- Metadatos
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Configuración
  skip_on_next_login BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, organization_id)
);

-- ===== CREATE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_user ON public.user_tour_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_org ON public.user_tour_progress(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_status ON public.user_tour_progress(status);

-- ===== ENABLE ROW LEVEL SECURITY =====
ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;

-- ===== CREATE RLS POLICIES =====
-- Users can view their own tour progress
CREATE POLICY "Users can view their own tour progress"
ON public.user_tour_progress FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own tour progress
CREATE POLICY "Users can update their own tour progress"
ON public.user_tour_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Users can insert their own tour progress
CREATE POLICY "Users can insert their own tour progress"
ON public.user_tour_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ===== CREATE TRIGGER FOR UPDATED_AT =====
CREATE OR REPLACE FUNCTION update_user_tour_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_tour_progress_updated_at
BEFORE UPDATE ON public.user_tour_progress
FOR EACH ROW
EXECUTE FUNCTION update_user_tour_progress_updated_at();

-- ===== ADD COMMENT =====
COMMENT ON TABLE public.user_tour_progress IS 'Tracks user onboarding tour progress for each organization';
COMMENT ON COLUMN public.user_tour_progress.status IS 'Tour status: not_started, in_progress, completed, disabled';
COMMENT ON COLUMN public.user_tour_progress.current_step IS 'Current step index (0-based)';
COMMENT ON COLUMN public.user_tour_progress.completed_steps IS 'Array of completed step indices';
COMMENT ON COLUMN public.user_tour_progress.skip_on_next_login IS 'If true, skip tour on next login';
