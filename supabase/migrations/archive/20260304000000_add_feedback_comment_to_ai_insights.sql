-- Migration: 20260304000000_add_feedback_comment_to_ai_insights.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Add feedback_comment column to ai_insights for qualitative feedback
ALTER TABLE public.ai_insights
ADD COLUMN IF NOT EXISTS feedback_comment TEXT;

COMMENT ON COLUMN public.ai_insights.feedback_comment IS 'Optional free-text comment from user when giving feedback (max 500 chars)';
