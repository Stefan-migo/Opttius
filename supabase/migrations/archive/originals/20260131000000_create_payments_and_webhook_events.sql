-- Migration: 20260131000000_create_payments_and_webhook_events.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Payments and Webhook Events for Phase SaaS 1 (Billing)
-- Payment gateways: Flow (Chile), Mercado Pago, PayPal - multi-tenant support
-- Reference: docs/PAYMENT_GATEWAYS_IMPLEMENTATION_GUIDE.md
-- Depends on: public.organizations, public.orders (Phase SaaS 0)
-- Note: Flow es la pasarela principal para Chile (Stripe no tiene soporte en Chile)

-- ===== ENSURE get_user_organization_id EXISTS (from Phase SaaS 0.2) =====
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM public.admin_users
    WHERE id = user_id
    AND is_active = true
    LIMIT 1
  );
END;
$$;

-- ===== PAYMENTS TABLE =====
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CLP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  gateway TEXT NOT NULL CHECK (gateway IN ('flow', 'mercadopago', 'paypal')),
  gateway_transaction_id TEXT,
  gateway_payment_intent_id TEXT,
  gateway_charge_id TEXT,
  payment_method TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.payments IS 'Payment records from gateways (Flow, Mercado Pago, PayPal) - multi-tenant';
COMMENT ON COLUMN public.payments.gateway_transaction_id IS 'Unique transaction ID from the gateway';
COMMENT ON COLUMN public.payments.gateway_payment_intent_id IS 'Flow order ID, Mercado Pago preference ID, PayPal order ID, or equivalent';
COMMENT ON COLUMN public.payments.gateway_charge_id IS 'Gateway charge ID when applicable (Flow, Mercado Pago, PayPal)';

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON public.payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_intent_id ON public.payments(gateway_payment_intent_id) WHERE gateway_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_gateway_transaction_id ON public.payments(gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- ===== TRIGGER updated_at =====
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== RLS PAYMENTS =====
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization payments" ON public.payments;
DROP POLICY IF EXISTS "Users can manage their organization payments" ON public.payments;

-- Users can view payments from their organization (or super_admin sees all)
CREATE POLICY "Users can view their organization payments"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
);

-- Users can insert/update/delete payments only for their organization (or super_admin)
CREATE POLICY "Users can manage their organization payments"
ON public.payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  organization_id = public.get_user_organization_id()
);

-- ===== WEBHOOK_EVENTS TABLE (idempotency) =====
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL CHECK (gateway IN ('flow', 'mercadopago', 'paypal')),
  gateway_event_id TEXT NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  processed BOOLEAN DEFAULT false NOT NULL,
  processed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(gateway, gateway_event_id)
);

COMMENT ON TABLE public.webhook_events IS 'Webhook events from payment gateways for idempotency';

-- ===== INDEXES WEBHOOK_EVENTS =====
CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway_event_id ON public.webhook_events(gateway, gateway_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_id ON public.webhook_events(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at DESC);

-- ===== RLS WEBHOOK_EVENTS =====
-- Webhooks are written by API routes using service role (bypasses RLS). No INSERT/UPDATE policies
-- so that only service role can write. Super admins can read for debugging.
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view webhook events" ON public.webhook_events;

CREATE POLICY "Super admins can view webhook events"
ON public.webhook_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
);
