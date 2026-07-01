-- Migration: fix_payment_gateways_config_rls
-- Fixes security audit finding C10: payment_gateways_config has USING(true) SELECT policy
-- leaking gateway API keys across all organizations.
--
-- Design: adds denormalized organization_id column and replaces global policies
-- with org-scoped RLS.

-- ============================================================
-- 1. Add organization_id column (idempotent)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_gateways_config' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE payment_gateways_config
      ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Backfill existing rows with the first available organization
UPDATE payment_gateways_config
  SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
  WHERE organization_id IS NULL;

-- Now enforce NOT NULL (safe after backfill — will fail if organizations table is empty)
ALTER TABLE payment_gateways_config
  ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================
-- 2. Replace global unique index with per-org unique index
-- ============================================================

ALTER TABLE payment_gateways_config DROP CONSTRAINT IF EXISTS payment_gateways_config_gateway_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_gateways_config_org_gateway
  ON payment_gateways_config(organization_id, gateway_id);

CREATE INDEX IF NOT EXISTS idx_payment_gateways_config_organization_id
  ON payment_gateways_config(organization_id);

-- ============================================================
-- 3. Drop old global RLS policies
-- ============================================================

DROP POLICY IF EXISTS "Public read payment_gateways_config" ON payment_gateways_config;
DROP POLICY IF EXISTS "Elevated roles can manage payment_gateways_config" ON payment_gateways_config;

-- ============================================================
-- 4. Create org-scoped RLS policies
-- ============================================================

ALTER TABLE payment_gateways_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment_gateways_config in their organization"
  ON payment_gateways_config FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

CREATE POLICY "Admins can insert payment_gateways_config in their organization"
  ON payment_gateways_config FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

CREATE POLICY "Admins can update payment_gateways_config in their organization"
  ON payment_gateways_config FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

CREATE POLICY "Admins can delete payment_gateways_config in their organization"
  ON payment_gateways_config FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );
