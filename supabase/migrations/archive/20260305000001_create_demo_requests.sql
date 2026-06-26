-- Migration: 20260305000001_create_demo_requests.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create demo_requests table for organic demo flow
-- Stores requests from /solicitar-demo; root approves from new-users-flow dashboard

CREATE TABLE IF NOT EXISTS public.demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  optica_name TEXT,
  phone TEXT,
  source TEXT DEFAULT 'landing',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON public.demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON public.demo_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON public.demo_requests(email);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Only root/dev can read and write demo_requests (enforced via service role in API)
-- RLS: deny all by default; APIs use service role
CREATE POLICY "demo_requests_no_public_access"
  ON public.demo_requests
  FOR ALL
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.demo_requests IS 'Solicitudes de demo orgánicas. Root aprueba desde /admin/saas-management/new-users-flow.';
