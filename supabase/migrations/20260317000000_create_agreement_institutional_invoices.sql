-- Migration: Create agreement institutional invoices
-- Facturas agrupadas a instituciones al conciliar cobranza. SII-ready.

-- ===== ADD invoice_id TO agreement_institutional_balances =====
-- (FK added after creating invoices table)
ALTER TABLE public.agreement_institutional_balances
  ADD COLUMN IF NOT EXISTS invoice_id UUID;

-- ===== CREATE agreement_institutional_invoices TABLE =====
CREATE TABLE IF NOT EXISTS public.agreement_institutional_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  institution_rut TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CLP',
  document_type TEXT NOT NULL DEFAULT 'factura' CHECK (document_type = 'factura'),
  folio TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'emitted' CHECK (status IN ('draft', 'emitted', 'accepted', 'rejected', 'cancelled')),
  sii_folio TEXT,
  sii_status TEXT,
  sii_track_id TEXT,
  sii_response_data JSONB,
  sii_emission_date TIMESTAMPTZ,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  emitted_at TIMESTAMPTZ DEFAULT NOW(),
  emitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.agreement_institutional_invoices IS 'Facturas agrupadas a instituciones al conciliar cobranza';
CREATE UNIQUE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_folio ON public.agreement_institutional_invoices(folio);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_agreement_id ON public.agreement_institutional_invoices(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_branch_id ON public.agreement_institutional_invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_status ON public.agreement_institutional_invoices(status);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_created_at ON public.agreement_institutional_invoices(created_at DESC);

-- ===== CREATE agreement_institutional_invoice_balances TABLE =====
CREATE TABLE IF NOT EXISTS public.agreement_institutional_invoice_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.agreement_institutional_invoices(id) ON DELETE CASCADE,
  balance_id UUID NOT NULL REFERENCES public.agreement_institutional_balances(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  UNIQUE(balance_id)
);

COMMENT ON TABLE public.agreement_institutional_invoice_balances IS 'Relación factura-balances: qué balances incluye cada factura';
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoice_balances_invoice_id ON public.agreement_institutional_invoice_balances(invoice_id);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoice_balances_balance_id ON public.agreement_institutional_invoice_balances(balance_id);

-- ===== ADD FK invoice_id TO agreement_institutional_balances =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_agreement_institutional_balances_invoice_id'
    AND table_name = 'agreement_institutional_balances'
  ) THEN
    ALTER TABLE public.agreement_institutional_balances
      ADD CONSTRAINT fk_agreement_institutional_balances_invoice_id
      FOREIGN KEY (invoice_id) REFERENCES public.agreement_institutional_invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===== TRIGGERS =====
CREATE TRIGGER update_agreement_institutional_invoices_updated_at
  BEFORE UPDATE ON public.agreement_institutional_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== ENABLE RLS =====
ALTER TABLE public.agreement_institutional_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_institutional_invoice_balances ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====
-- Admins can view invoices via agreement
CREATE POLICY "Admins can view agreement institutional invoices"
ON public.agreement_institutional_invoices
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

-- Admins can insert invoices (via reconcile flow - service role)
CREATE POLICY "Admins can insert agreement institutional invoices"
ON public.agreement_institutional_invoices
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

-- Admins can view invoice_balances via invoice
CREATE POLICY "Admins can view agreement institutional invoice balances"
ON public.agreement_institutional_invoice_balances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agreement_institutional_invoices inv
    JOIN public.agreements a ON a.id = inv.agreement_id
    WHERE inv.id = invoice_id
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

-- Admins can insert invoice_balances (via reconcile flow)
CREATE POLICY "Admins can insert agreement institutional invoice balances"
ON public.agreement_institutional_invoice_balances
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agreement_institutional_invoices inv
    JOIN public.agreements a ON a.id = inv.agreement_id
    WHERE inv.id = invoice_id
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

-- ===== RPC: Generate folio for institutional invoices =====
CREATE OR REPLACE FUNCTION generate_agreement_institutional_invoice_folio(
  p_branch_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT := 'FAC-INST-';
  v_last_folio TEXT;
  v_next_number INTEGER;
BEGIN
  SELECT folio INTO v_last_folio
  FROM public.agreement_institutional_invoices
  WHERE branch_id = p_branch_id
    AND folio LIKE v_prefix || '%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_folio IS NOT NULL THEN
    v_next_number := CAST(SUBSTRING(v_last_folio FROM '\d+$') AS INTEGER) + 1;
  ELSE
    v_next_number := 1;
  END IF;

  RETURN v_prefix || LPAD(v_next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_agreement_institutional_invoice_folio IS 'Genera folio secuencial para facturas institucionales por sucursal';
