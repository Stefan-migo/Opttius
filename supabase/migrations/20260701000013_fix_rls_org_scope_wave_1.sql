-- Migration: fix_rls_org_scope_wave_1
-- Fixes security audit: customer_lens_purchases had org-blind RLS policies using
-- EXISTS(SELECT 1 FROM admin_users WHERE id = auth.uid()), letting any admin from
-- any org access data across tenant boundaries.
--
-- Design: adds denormalized organization_id column and replaces global policies
-- with org-scoped RLS following migration 12 convention.
--
-- ============================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================
-- To roll back this migration:
--
-- 1. Drop org-scoped policies:
--    DROP POLICY IF EXISTS "Admins can view customer_lens_purchases in their organization" ON customer_lens_purchases;
--    DROP POLICY IF EXISTS "Admins can insert customer_lens_purchases in their organization" ON customer_lens_purchases;
--    DROP POLICY IF EXISTS "Admins can update customer_lens_purchases in their organization" ON customer_lens_purchases;
--    DROP POLICY IF EXISTS "Admins can delete customer_lens_purchases in their organization" ON customer_lens_purchases;
--
-- 2. Re-create org-blind policies:
--    CREATE POLICY "Admins can view all lens purchases" ON customer_lens_purchases FOR SELECT
--      USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.is_active = true));
--    CREATE POLICY "Admins can insert lens purchases" ON customer_lens_purchases FOR INSERT
--      WITH CHECK (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.is_active = true));
--    CREATE POLICY "Admins can update lens purchases" ON customer_lens_purchases FOR UPDATE
--      USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.is_active = true));
--    CREATE POLICY "Admins can delete lens purchases" ON customer_lens_purchases FOR DELETE
--      USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.is_active = true));
--
-- 3. The organization_id column is non-destructive and can remain.
--    To remove it: ALTER TABLE customer_lens_purchases DROP COLUMN organization_id;
--    WARNING: Only do this if no downstream code depends on it.
-- ============================================================

-- ============================================================
-- 1. Add organization_id column (idempotent)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_lens_purchases' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE customer_lens_purchases
      ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- ============================================================
-- 2. Backfill organization_id
-- ============================================================

-- Pass 1: via orders.organization_id (primary path — orders have non-null org_id)
UPDATE customer_lens_purchases clp
  SET organization_id = o.organization_id
  FROM orders o
  WHERE clp.order_id = o.id
    AND clp.organization_id IS NULL;

-- Pass 2: via customers.organization_id (for rows with no order link)
UPDATE customer_lens_purchases clp
  SET organization_id = c.organization_id
  FROM customers c
  WHERE clp.customer_id = c.id
    AND clp.organization_id IS NULL;

-- Pass 3: fallback — first organization as last resort
UPDATE customer_lens_purchases
  SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
  WHERE organization_id IS NULL;

-- Now enforce NOT NULL (safe after backfill — will fail if organizations table is empty)
ALTER TABLE customer_lens_purchases
  ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================
-- 3. Add index
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_organization_id
  ON customer_lens_purchases(organization_id);

-- ============================================================
-- 4. Drop old org-blind RLS policies
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all lens purchases" ON customer_lens_purchases;
DROP POLICY IF EXISTS "Admins can insert lens purchases" ON customer_lens_purchases;
DROP POLICY IF EXISTS "Admins can update lens purchases" ON customer_lens_purchases;
DROP POLICY IF EXISTS "Admins can delete lens purchases" ON customer_lens_purchases;

-- ============================================================
-- 5. Create org-scoped RLS policies
-- ============================================================

ALTER TABLE customer_lens_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view customer_lens_purchases in their organization"
  ON customer_lens_purchases FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

CREATE POLICY "Admins can insert customer_lens_purchases in their organization"
  ON customer_lens_purchases FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

CREATE POLICY "Admins can update customer_lens_purchases in their organization"
  ON customer_lens_purchases FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

CREATE POLICY "Admins can delete customer_lens_purchases in their organization"
  ON customer_lens_purchases FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

-- ============================================================
-- 6. Verification assertions
-- ============================================================

DO $$
DECLARE
  v_count INTEGER;
  v_old_count INTEGER;
BEGIN
  -- Verify all 4 new policies exist
  SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE tablename = 'customer_lens_purchases'
      AND policyname LIKE '%in their organization';

  IF v_count < 4 THEN
    RAISE EXCEPTION 'customer_lens_purchases: expected 4 org-scoped policies, found %', v_count;
  END IF;

  -- Verify no old org-blind policies remain
  SELECT COUNT(*) INTO v_old_count
    FROM pg_policies
    WHERE tablename = 'customer_lens_purchases'
      AND (policyname LIKE 'Admins can view all lens purchases'
           OR policyname LIKE 'Admins can insert lens purchases'
           OR policyname LIKE 'Admins can update lens purchases'
           OR policyname LIKE 'Admins can delete lens purchases');

  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'customer_lens_purchases: % old org-blind policies still exist', v_old_count;
  END IF;

  -- Verify organization_id column exists and is NOT NULL
  SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_lens_purchases'
      AND column_name = 'organization_id' AND is_nullable = 'NO';

  IF v_count < 1 THEN
    RAISE EXCEPTION 'customer_lens_purchases: organization_id column is missing or nullable';
  END IF;

  -- Verify index exists
  SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE tablename = 'customer_lens_purchases'
      AND indexname = 'idx_customer_lens_purchases_organization_id';

  IF v_count < 1 THEN
    RAISE EXCEPTION 'customer_lens_purchases: idx_customer_lens_purchases_organization_id index not found';
  END IF;
END;
$$;
