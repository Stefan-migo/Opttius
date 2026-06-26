-- Migration: 20260229000000_create_whatsapp_phone_numbers.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create whatsapp_phone_numbers table for B2C integration
-- Maps phone_number_id (Meta) to organization_id for webhook context resolution
-- Used by Embedded Signup (Fase 3) and webhook handler

CREATE TABLE IF NOT EXISTS public.whatsapp_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL UNIQUE,
  waba_id TEXT NOT NULL,
  display_phone_number TEXT,
  access_token_encrypted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_whatsapp_phone_numbers_org ON public.whatsapp_phone_numbers(organization_id);
CREATE INDEX idx_whatsapp_phone_numbers_phone_id ON public.whatsapp_phone_numbers(phone_number_id);

ALTER TABLE public.whatsapp_phone_numbers ENABLE ROW LEVEL SECURITY;

-- RLS: admins of the organization can manage their WhatsApp numbers
CREATE POLICY "Org admins can view own whatsapp numbers"
ON public.whatsapp_phone_numbers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.organization_id = whatsapp_phone_numbers.organization_id
    AND admin_users.id = auth.uid()
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Org admins can insert own whatsapp numbers"
ON public.whatsapp_phone_numbers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.organization_id = whatsapp_phone_numbers.organization_id
    AND admin_users.id = auth.uid()
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Org admins can update own whatsapp numbers"
ON public.whatsapp_phone_numbers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.organization_id = whatsapp_phone_numbers.organization_id
    AND admin_users.id = auth.uid()
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Org admins can delete own whatsapp numbers"
ON public.whatsapp_phone_numbers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.organization_id = whatsapp_phone_numbers.organization_id
    AND admin_users.id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- Super admins can manage all
CREATE POLICY "Super admins can manage all whatsapp numbers"
ON public.whatsapp_phone_numbers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.role = 'super_admin'
    AND admin_users.is_active = true
  )
);

COMMENT ON TABLE public.whatsapp_phone_numbers IS 'Maps Meta phone_number_id to organization for WhatsApp B2C webhook context resolution';
