-- Migration: Create opticas_access_tokens for dynamic access links
-- Tokens for /acceso-opticas?token=XXX; root generates from config, revocable, expiring

CREATE TABLE IF NOT EXISTS public.opticas_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  label TEXT
);

CREATE INDEX IF NOT EXISTS idx_opticas_access_tokens_token ON public.opticas_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_opticas_access_tokens_expires ON public.opticas_access_tokens(expires_at);

ALTER TABLE public.opticas_access_tokens ENABLE ROW LEVEL SECURITY;

-- Only service_role (APIs root) can manage; no public access
CREATE POLICY "opticas_tokens_no_public"
  ON public.opticas_access_tokens FOR ALL USING (false) WITH CHECK (false);

COMMENT ON TABLE public.opticas_access_tokens IS 'Dynamic tokens for /acceso-opticas. Root generates from SaaS config. Revocable, expiring.';
