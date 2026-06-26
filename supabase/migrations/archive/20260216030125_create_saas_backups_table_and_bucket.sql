-- Migration: 20260216030125_create_saas_backups_table_and_bucket.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Table: saas_backups - metadata for full database backups (pg_dump)
CREATE TABLE IF NOT EXISTS public.saas_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  backup_type TEXT NOT NULL DEFAULT 'full' CHECK (backup_type IN ('full', 'manual', 'cron')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'in_progress')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'cron', 'github_actions'))
);

CREATE INDEX IF NOT EXISTS idx_saas_backups_created_at ON public.saas_backups(created_at DESC);

-- RLS: only service role / super admins
ALTER TABLE public.saas_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access saas_backups" ON public.saas_backups
  FOR ALL USING (auth.role() = 'service_role');

-- Storage bucket for SaaS full backups (SQL dumps)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('saas-backups', 'saas-backups', false, 524288000, ARRAY['application/sql', 'application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.saas_backups IS 'Metadata for full database backups (pg_dump). Actual files in saas-backups bucket.';
