-- Migration: Create agreement_customers table for client-agreement traceability
-- Enables premium agreement management: filtering, badges, analytics

-- ===== CREATE AGREEMENT_CUSTOMERS TABLE =====
CREATE TABLE IF NOT EXISTS public.agreement_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  first_order_at TIMESTAMPTZ NOT NULL,
  last_order_at TIMESTAMPTZ NOT NULL,
  order_count INT NOT NULL DEFAULT 1,
  total_copago DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_institutional DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(agreement_id, customer_id)
);

COMMENT ON TABLE public.agreement_customers IS 'Trazabilidad cliente-convenio: clientes que han comprado bajo cada convenio';

CREATE INDEX IF NOT EXISTS idx_agreement_customers_agreement_id ON public.agreement_customers(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_customers_customer_id ON public.agreement_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_agreement_customers_last_order ON public.agreement_customers(last_order_at DESC);

-- ===== SYNC FUNCTION =====
CREATE OR REPLACE FUNCTION public.sync_agreement_customers_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.agreement_id IS NOT NULL AND NEW.customer_id IS NOT NULL THEN
    INSERT INTO public.agreement_customers (
      agreement_id,
      customer_id,
      first_order_at,
      last_order_at,
      order_count,
      total_copago,
      total_institutional
    )
    VALUES (
      NEW.agreement_id,
      NEW.customer_id,
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.created_at, NOW()),
      1,
      COALESCE(NEW.copago_amount, 0),
      COALESCE(NEW.institutional_amount, 0)
    )
    ON CONFLICT (agreement_id, customer_id) DO UPDATE SET
      last_order_at = GREATEST(agreement_customers.last_order_at, COALESCE(NEW.created_at, NOW())),
      order_count = agreement_customers.order_count + 1,
      total_copago = agreement_customers.total_copago + COALESCE(NEW.copago_amount, 0),
      total_institutional = agreement_customers.total_institutional + COALESCE(NEW.institutional_amount, 0),
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- ===== TRIGGER =====
CREATE TRIGGER trg_orders_agreement_customers
  AFTER INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.agreement_id IS NOT NULL AND NEW.customer_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_agreement_customers_on_order();

-- ===== TRIGGER FOR UPDATED_AT =====
CREATE TRIGGER update_agreement_customers_updated_at
  BEFORE UPDATE ON public.agreement_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== BACKFILL FROM EXISTING ORDERS =====
INSERT INTO public.agreement_customers (
  agreement_id,
  customer_id,
  first_order_at,
  last_order_at,
  order_count,
  total_copago,
  total_institutional
)
SELECT
  o.agreement_id,
  o.customer_id,
  MIN(o.created_at),
  MAX(o.created_at),
  COUNT(*)::INT,
  COALESCE(SUM(o.copago_amount), 0),
  COALESCE(SUM(o.institutional_amount), 0)
FROM public.orders o
WHERE o.agreement_id IS NOT NULL
  AND o.customer_id IS NOT NULL
GROUP BY o.agreement_id, o.customer_id
ON CONFLICT (agreement_id, customer_id) DO UPDATE SET
  first_order_at = LEAST(agreement_customers.first_order_at, EXCLUDED.first_order_at),
  last_order_at = GREATEST(agreement_customers.last_order_at, EXCLUDED.last_order_at),
  order_count = agreement_customers.order_count + EXCLUDED.order_count,
  total_copago = agreement_customers.total_copago + EXCLUDED.total_copago,
  total_institutional = agreement_customers.total_institutional + EXCLUDED.total_institutional,
  updated_at = NOW();

-- ===== ENABLE RLS =====
ALTER TABLE public.agreement_customers ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES (inherit from agreements) =====
CREATE POLICY "Admins can view agreement customers"
ON public.agreement_customers
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

-- Insert/Update via trigger (service role) - no direct admin INSERT policy needed
-- Admins read via SELECT; writes happen through process-sale -> orders trigger
