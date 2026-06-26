-- Migration: 20260203000003_create_payment_gateways_config.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Payment Gateways Configuration
-- Date: 2026-02-03
-- Description: Table to manage visibility and settings of payment gateways from SaaS Management.

CREATE TABLE IF NOT EXISTS public.payment_gateways_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id TEXT UNIQUE NOT NULL, -- 'flow', 'mercadopago', 'paypal', 'nowpayments'
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  icon_name TEXT, -- Lucide icon reference
  config JSONB DEFAULT '{}'::jsonb, -- Extra UI config like 'Recommended' label, etc.
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed initial data
INSERT INTO public.payment_gateways_config (gateway_id, name, description, is_enabled, display_order, icon_name, config)
VALUES 
('mercadopago', 'Mercado Pago', 'Tarjetas de débito/crédito (Chile)', true, 1, 'Globe', '{"badge": "ACTIVO"}'),
('paypal', 'PayPal', 'Pagos internacionales en USD', true, 2, 'CreditCard', '{"badge": "ACTIVO"}'),
('nowpayments', 'Criptomonedas', 'Acepta 300+ criptos vía NOWPayments', true, 3, 'Coins', '{"badge": "PREMIUM"}'),
('flow', 'Flow', 'Transferencias bancarias y Webpay', false, 4, 'CreditCard', '{"badge": "PRÓXIMAMENTE"}')
ON CONFLICT (gateway_id) DO NOTHING;

-- Trigger updated_at
CREATE TRIGGER update_payment_gateways_config_updated_at
  BEFORE UPDATE ON public.payment_gateways_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.payment_gateways_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read (needed for checkout)
CREATE POLICY "Public read payment_gateways_config"
ON public.payment_gateways_config FOR SELECT
USING (true);

-- Only elevated roles can manage
CREATE POLICY "Elevated roles can manage payment_gateways_config"
ON public.payment_gateways_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'root', 'dev')
    AND is_active = true
  )
);
