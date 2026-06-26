-- Migration: 20260314000000_create_agreements_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Agreements System (Gestión de Convenios)
-- Enables B2B agreement management for optical shops: institutions, purchase orders, institutional balances

-- ===== CREATE AGREEMENTS TABLE =====
CREATE TABLE IF NOT EXISTS public.agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  agreement_type TEXT NOT NULL CHECK (agreement_type IN ('empresa', 'sindicato', 'mutual')),
  institution_name TEXT NOT NULL,
  institution_rut TEXT NOT NULL,
  representative_name TEXT,
  representative_email TEXT,
  representative_phone TEXT,
  valid_from DATE NOT NULL,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'cancelled')),
  billing_rules JSONB DEFAULT '{}'::jsonb,
  max_installments_by_product JSONB DEFAULT '{}'::jsonb,
  discount_percent DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.agreements IS 'Convenios con empresas, sindicatos o mutualidades';
COMMENT ON COLUMN public.agreements.billing_rules IS 'Reglas de facturación: copago_percent, institutional_percent, require_oc, etc.';

CREATE INDEX IF NOT EXISTS idx_agreements_organization_id ON public.agreements(organization_id);
CREATE INDEX IF NOT EXISTS idx_agreements_branch_id ON public.agreements(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agreements_status ON public.agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_institution_rut ON public.agreements(institution_rut);
CREATE INDEX IF NOT EXISTS idx_agreements_valid_until ON public.agreements(valid_until) WHERE valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agreements_agreement_type ON public.agreements(agreement_type);

-- ===== CREATE AGREEMENT_PURCHASE_ORDERS TABLE =====
CREATE TABLE IF NOT EXISTS public.agreement_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  oc_number TEXT NOT NULL,
  issued_at DATE,
  valid_until DATE,
  max_amount DECIMAL(12,2),
  used_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'expired', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(agreement_id, oc_number)
);

COMMENT ON TABLE public.agreement_purchase_orders IS 'Órdenes de compra emitidas por la institución';

CREATE INDEX IF NOT EXISTS idx_agreement_purchase_orders_agreement_id ON public.agreement_purchase_orders(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_purchase_orders_status ON public.agreement_purchase_orders(status);

-- ===== CREATE AGREEMENT_INSTITUTIONAL_BALANCES TABLE =====
CREATE TABLE IF NOT EXISTS public.agreement_institutional_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES public.agreement_purchase_orders(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.agreement_institutional_balances IS 'Saldos institucionales pendientes de cobro';

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_agreement_id ON public.agreement_institutional_balances(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_order_id ON public.agreement_institutional_balances(order_id);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_status ON public.agreement_institutional_balances(status);

-- ===== EXTEND ORDERS TABLE =====
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS agreement_id UUID REFERENCES public.agreements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.agreement_purchase_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS copago_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS institutional_amount DECIMAL(12,2);

COMMENT ON COLUMN public.orders.agreement_id IS 'Convenio aplicado a la venta';
COMMENT ON COLUMN public.orders.copago_amount IS 'Monto pagado por el trabajador en POS';
COMMENT ON COLUMN public.orders.institutional_amount IS 'Monto a cargo de la institución';

CREATE INDEX IF NOT EXISTS idx_orders_agreement_id ON public.orders(agreement_id) WHERE agreement_id IS NOT NULL;

-- ===== EXTEND LAB_WORK_ORDERS TABLE =====
ALTER TABLE public.lab_work_orders
  ADD COLUMN IF NOT EXISTS agreement_id UUID REFERENCES public.agreements(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.lab_work_orders.agreement_id IS 'Convenio de la venta asociada';

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_agreement_id ON public.lab_work_orders(agreement_id) WHERE agreement_id IS NOT NULL;

-- ===== ADD PURCHASE_ORDER_REFERENCE TO BILLING_DOCUMENTS =====
-- Conditional: billing_documents may not exist in some setups (created in 20250128000003)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_documents') THEN
    ALTER TABLE public.billing_documents ADD COLUMN IF NOT EXISTS purchase_order_reference TEXT;
    EXECUTE 'COMMENT ON COLUMN public.billing_documents.purchase_order_reference IS ''Número de OC para ReferenciaDoc en DTE''';
  END IF;
END $$;

-- ===== TRIGGERS =====
CREATE TRIGGER update_agreements_updated_at
  BEFORE UPDATE ON public.agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agreement_purchase_orders_updated_at
  BEFORE UPDATE ON public.agreement_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agreement_institutional_balances_updated_at
  BEFORE UPDATE ON public.agreement_institutional_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== ENABLE RLS =====
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_institutional_balances ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES FOR AGREEMENTS =====
-- Admins can view agreements in their org (branch_id match or org-wide agreements)
CREATE POLICY "Admins can view agreements in their org"
ON public.agreements
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    organization_id IN (
      SELECT organization_id FROM public.admin_users WHERE id = auth.uid()
    )
    AND (
      branch_id IS NULL
      OR branch_id IN (
        SELECT branch_id FROM public.admin_branch_access
        WHERE admin_user_id = auth.uid() AND branch_id IS NOT NULL
      )
    )
  )
);

-- Admins can insert agreements in their org
CREATE POLICY "Admins can insert agreements"
ON public.agreements
FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR
  (
    organization_id IN (
      SELECT organization_id FROM public.admin_users WHERE id = auth.uid()
    )
    AND (
      branch_id IS NULL
      OR branch_id IN (
        SELECT branch_id FROM public.admin_branch_access
        WHERE admin_user_id = auth.uid() AND role IN ('manager', 'staff') AND branch_id IS NOT NULL
      )
    )
  )
);

-- Admins can update agreements in their org
CREATE POLICY "Admins can update agreements"
ON public.agreements
FOR UPDATE
USING (
  public.is_super_admin(auth.uid())
  OR
  (
    organization_id IN (
      SELECT organization_id FROM public.admin_users WHERE id = auth.uid()
    )
    AND (
      branch_id IS NULL
      OR branch_id IN (
        SELECT branch_id FROM public.admin_branch_access
        WHERE admin_user_id = auth.uid() AND role IN ('manager', 'staff') AND branch_id IS NOT NULL
      )
    )
  )
);

-- Only super_admin can delete agreements (soft-delete preferred via status)
CREATE POLICY "Super admin can delete agreements"
ON public.agreements
FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- ===== RLS POLICIES FOR AGREEMENT_PURCHASE_ORDERS =====
CREATE POLICY "Admins can view purchase orders via agreement"
ON public.agreement_purchase_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agreements a
    WHERE a.id = agreement_id
    AND (
      public.is_super_admin(auth.uid())
      OR
      (
        a.organization_id IN (SELECT organization_id FROM public.admin_users WHERE id = auth.uid())
        AND (
          a.branch_id IS NULL
          OR a.branch_id IN (
            SELECT branch_id FROM public.admin_branch_access
            WHERE admin_user_id = auth.uid() AND branch_id IS NOT NULL
          )
        )
      )
    )
  )
);

CREATE POLICY "Admins can insert purchase orders"
ON public.agreement_purchase_orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agreements a
    WHERE a.id = agreement_id
    AND (
      public.is_super_admin(auth.uid())
      OR
      (
        a.organization_id IN (SELECT organization_id FROM public.admin_users WHERE id = auth.uid())
        AND (
          a.branch_id IS NULL
          OR a.branch_id IN (
            SELECT branch_id FROM public.admin_branch_access
            WHERE admin_user_id = auth.uid() AND role IN ('manager', 'staff') AND branch_id IS NOT NULL
          )
        )
      )
    )
  )
);

CREATE POLICY "Admins can update purchase orders"
ON public.agreement_purchase_orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.agreements a
    WHERE a.id = agreement_id
    AND (
      public.is_super_admin(auth.uid())
      OR
      (
        a.organization_id IN (SELECT organization_id FROM public.admin_users WHERE id = auth.uid())
        AND (
          a.branch_id IS NULL
          OR a.branch_id IN (
            SELECT branch_id FROM public.admin_branch_access
            WHERE admin_user_id = auth.uid() AND role IN ('manager', 'staff') AND branch_id IS NOT NULL
          )
        )
      )
    )
  )
);

-- ===== RLS POLICIES FOR AGREEMENT_INSTITUTIONAL_BALANCES =====
CREATE POLICY "Admins can view institutional balances"
ON public.agreement_institutional_balances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agreements a
    WHERE a.id = agreement_id
    AND (
      public.is_super_admin(auth.uid())
      OR
      (
        a.organization_id IN (SELECT organization_id FROM public.admin_users WHERE id = auth.uid())
        AND (
          a.branch_id IS NULL
          OR a.branch_id IN (
            SELECT branch_id FROM public.admin_branch_access
            WHERE admin_user_id = auth.uid() AND branch_id IS NOT NULL
          )
        )
      )
    )
  )
);

CREATE POLICY "Admins can update institutional balances"
ON public.agreement_institutional_balances
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.agreements a
    WHERE a.id = agreement_id
    AND (
      public.is_super_admin(auth.uid())
      OR
      (
        a.organization_id IN (SELECT organization_id FROM public.admin_users WHERE id = auth.uid())
        AND (
          a.branch_id IS NULL
          OR a.branch_id IN (
            SELECT branch_id FROM public.admin_branch_access
            WHERE admin_user_id = auth.uid() AND role IN ('manager', 'staff') AND branch_id IS NOT NULL
          )
        )
      )
    )
  )
);

-- INSERT policy: balances are created by process-sale (service role), not by admin directly
-- Allow insert for admins when creating via API (process-sale uses service role)
CREATE POLICY "Service role and admins can insert institutional balances"
ON public.agreement_institutional_balances
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agreements a
    WHERE a.id = agreement_id
    AND (
      public.is_super_admin(auth.uid())
      OR
      (
        a.organization_id IN (SELECT organization_id FROM public.admin_users WHERE id = auth.uid())
        AND (
          a.branch_id IS NULL
          OR a.branch_id IN (
            SELECT branch_id FROM public.admin_branch_access
            WHERE admin_user_id = auth.uid() AND branch_id IS NOT NULL
          )
        )
      )
    )
  )
);
