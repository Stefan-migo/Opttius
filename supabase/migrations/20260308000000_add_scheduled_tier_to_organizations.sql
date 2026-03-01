-- Migration: Add scheduled_tier and scheduled_tier_effective_at to organizations
-- Enables deferred tier downgrades: change takes effect at end of billing period

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS scheduled_tier TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_tier_effective_at TIMESTAMPTZ;

-- Constraint: scheduled_tier must be valid tier name when set
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS chk_organizations_scheduled_tier;

ALTER TABLE public.organizations
  ADD CONSTRAINT chk_organizations_scheduled_tier
  CHECK (
    scheduled_tier IS NULL
    OR scheduled_tier IN ('basic', 'pro', 'premium')
  );

CREATE INDEX IF NOT EXISTS idx_organizations_scheduled_tier_effective_at
  ON public.organizations(scheduled_tier_effective_at)
  WHERE scheduled_tier IS NOT NULL;

COMMENT ON COLUMN public.organizations.scheduled_tier IS 'Tier to apply at scheduled_tier_effective_at (for deferred downgrades)';
COMMENT ON COLUMN public.organizations.scheduled_tier_effective_at IS 'When to apply scheduled_tier (typically end of billing period)';
