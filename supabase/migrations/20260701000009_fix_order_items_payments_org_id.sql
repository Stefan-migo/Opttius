-- Migration: fix_order_items_payments_org_id
-- Adds denormalized organization_id to order_items and order_payments for direct
-- multi-tenant RLS enforcement, eliminating the need to join through orders.
--
-- Design: proposal.md → "keep existing branch-scoped checks for order_payments"
-- and add organization_id as an additional filter, not a replacement.

-- ============================================================
-- 1. order_items: add organization_id + org-scoped RLS
-- ============================================================

ALTER TABLE order_items
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

UPDATE order_items
  SET organization_id = orders.organization_id
  FROM orders
  WHERE order_items.order_id = orders.id;

ALTER TABLE order_items
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_organization_id
  ON order_items(organization_id);

-- Drop existing admin-scoped policies (org-blind — the vulnerability)
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
DROP POLICY IF EXISTS "Admins can insert order items" ON order_items;
DROP POLICY IF EXISTS "Admins can delete order items" ON order_items;

-- Keep "Users can view own order items" for end-user access
-- (non-admin users who placed orders)

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view order items in their organization"
  ON order_items FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can insert order items in their organization"
  ON order_items FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can update order items in their organization"
  ON order_items FOR UPDATE
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete order items in their organization"
  ON order_items FOR DELETE
  USING (organization_id = public.get_user_organization_id());

-- ============================================================
-- 2. order_payments: add organization_id + org+branch scoped RLS
-- ============================================================

ALTER TABLE order_payments
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

UPDATE order_payments
  SET organization_id = orders.organization_id
  FROM orders
  WHERE order_payments.order_id = orders.id;

ALTER TABLE order_payments
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_payments_organization_id
  ON order_payments(organization_id);

-- Drop existing branch-scoped policies (no org isolation)
DROP POLICY IF EXISTS "Admins can view order_payments in their branches" ON order_payments;
DROP POLICY IF EXISTS "Admins can insert order_payments in their branches" ON order_payments;
DROP POLICY IF EXISTS "Admins can update order_payments in their branches" ON order_payments;
DROP POLICY IF EXISTS "Admins can delete order_payments in their branches" ON order_payments;

ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

-- Recreate with org + branch scope per design
CREATE POLICY "Admins can view order_payments in their organization"
  ON order_payments FOR SELECT
  USING (
    public.is_super_admin(auth.uid()) OR (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = order_payments.order_id
        AND (o.branch_id IS NULL OR EXISTS (
          SELECT 1 FROM admin_branch_access aba
          WHERE aba.admin_user_id = auth.uid() AND aba.branch_id = o.branch_id
        ))
      )
    )
  );

CREATE POLICY "Admins can insert order_payments in their organization"
  ON order_payments FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = order_payments.order_id
        AND (o.branch_id IS NULL OR EXISTS (
          SELECT 1 FROM admin_branch_access aba
          WHERE aba.admin_user_id = auth.uid() AND aba.branch_id = o.branch_id
        ))
      )
    )
  );

CREATE POLICY "Admins can update order_payments in their organization"
  ON order_payments FOR UPDATE
  USING (
    public.is_super_admin(auth.uid()) OR (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = order_payments.order_id
        AND (o.branch_id IS NULL OR EXISTS (
          SELECT 1 FROM admin_branch_access aba
          WHERE aba.admin_user_id = auth.uid() AND aba.branch_id = o.branch_id
        ))
      )
    )
  );

CREATE POLICY "Admins can delete order_payments in their organization"
  ON order_payments FOR DELETE
  USING (
    public.is_super_admin(auth.uid()) OR (
      organization_id = public.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = order_payments.order_id
        AND (o.branch_id IS NULL OR EXISTS (
          SELECT 1 FROM admin_branch_access aba
          WHERE aba.admin_user_id = auth.uid() AND aba.branch_id = o.branch_id
        ))
      )
    )
  );
