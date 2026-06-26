-- Migration: 20260703000004_branches_multitenancy.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

BEGIN;


-- ========================================
-- Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.organization_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    min_deposit_percent numeric(5,2) DEFAULT 50.00,
    min_deposit_amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    business_name text,
    business_rut text,
    business_address text,
    business_phone text,
    business_email text,
    logo_url text,
    header_text text,
    footer_text text,
    terms_and_conditions text,
    default_document_type text DEFAULT 'boleta'::text,
    printer_type text DEFAULT 'thermal'::text,
    printer_width_mm numeric(10,2) DEFAULT 80,
    printer_height_mm numeric(10,2) DEFAULT 297,
    auto_print_receipt boolean DEFAULT true,
    currency text,
    country text
);

CREATE TABLE IF NOT EXISTS public.system_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    config_value jsonb NOT NULL,
    description text,
    category text DEFAULT 'general'::text NOT NULL,
    is_public boolean DEFAULT false,
    is_sensitive boolean DEFAULT false,
    value_type text DEFAULT 'string'::text,
    validation_rules jsonb,
    last_modified_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    branch_id uuid,
    CONSTRAINT system_config_value_type_check CHECK ((value_type = ANY (ARRAY['string'::text, 'number'::text, 'boolean'::text, 'json'::text, 'array'::text])))
);

CREATE TABLE IF NOT EXISTS public.tier_change_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    from_tier text NOT NULL,
    to_tier text NOT NULL,
    changed_by_user_id uuid,
    source text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tier_change_audit_source_check CHECK ((source = ANY (ARRAY['root'::text, 'org_user'::text, 'checkout'::text, 'scheduled_job'::text])))
);

-- ========================================
-- Function
-- ========================================

CREATE OR REPLACE FUNCTION public.sync_agreement_customers_on_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.sync_children_organization_id_from_parent() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update all status history records for this work order
  UPDATE public.lab_work_order_status_history
  SET organization_id = NEW.organization_id
  WHERE work_order_id = NEW.id
    AND organization_id IS DISTINCT FROM NEW.organization_id;

END;
$$;

CREATE OR REPLACE FUNCTION public.sync_status_history_organization_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Set organization_id from parent work_order when inserting/updating
  IF TG_OP = 'INSERT' OR NEW.organization_id IS DISTINCT FROM (
    SELECT organization_id FROM public.lab_work_orders WHERE id = NEW.work_order_id
  ) THEN
    NEW.organization_id := (
      SELECT organization_id FROM public.lab_work_orders WHERE id = NEW.work_order_id
    );
  END IF;

-- ========================================
-- Tables
-- ========================================

-- Table: organization_settings
END;
$$;

-- ========================================
-- Trigger
-- ========================================

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Constraint
-- ========================================

ALTER TABLE public.organization_settings
    ADD CONSTRAINT organization_settings_organization_id_key UNIQUE (organization_id);

ALTER TABLE public.organization_settings
    ADD CONSTRAINT organization_settings_pkey PRIMARY KEY (id);

-- Table: system_config

ALTER TABLE public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);

ALTER TABLE public.system_config
    ADD CONSTRAINT system_config_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.system_config
    ADD CONSTRAINT system_config_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.system_config
    ADD CONSTRAINT system_config_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: tier_change_audit

ALTER TABLE public.tier_change_audit
    ADD CONSTRAINT tier_change_audit_pkey PRIMARY KEY (id);

ALTER TABLE public.tier_change_audit
    ADD CONSTRAINT tier_change_audit_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.tier_change_audit
    ADD CONSTRAINT tier_change_audit_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ========================================
-- Indexes (auto-generated from current schema)
-- ========================================

-- ========================================
-- Policy
-- ========================================

CREATE POLICY "Super admins can manage organization settings" ON public.organization_settings USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Users can view their organization settings" ON public.organization_settings FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Admin users can view all config" ON public.system_config FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

CREATE POLICY "Super admin can manage sensitive config" ON public.system_config USING (((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = 'super_admin'::text) AND (au.is_active = true)))) OR (NOT is_sensitive)));

CREATE POLICY "Root users can view tier change audit" ON public.tier_change_audit FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])) AND (admin_users.is_active = true)))));

-- ========================================
-- Rls Enable
-- ========================================

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tier_change_audit ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Index
-- ========================================

CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON public.organization_settings USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_system_config_branch_id ON public.system_config USING btree (branch_id) WHERE (branch_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_system_config_category ON public.system_config USING btree (category);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON public.system_config USING btree (config_key);

CREATE INDEX IF NOT EXISTS idx_system_config_organization_id ON public.system_config USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_tier_change_audit_created_at ON public.tier_change_audit USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tier_change_audit_organization ON public.tier_change_audit USING btree (organization_id);

-- ========================================
-- Comment
-- ========================================

-- ========================================
-- Functions
-- ========================================

COMMENT ON TABLE public.organization_settings IS 'Configuración de depósito mínimo por organización para lógica Cash-First';

COMMENT ON COLUMN public.organization_settings.min_deposit_percent IS 'Porcentaje mínimo de depósito requerido (ej: 50.00 = 50%)';

COMMENT ON COLUMN public.organization_settings.min_deposit_amount IS 'Monto mínimo fijo de depósito (opcional, se usa el mayor entre porcentaje y monto fijo)';

COMMENT ON COLUMN public.organization_settings.auto_print_receipt IS 'Configuración global: indica si se debe imprimir comprobantes automáticamente';

COMMENT ON COLUMN public.organization_settings.currency IS 'Moneda de la organización (CLP, ARS, MXN, EUR, USD, etc.). Si no se define, se infiere de teléfono/dirección/tipo de documento.';

COMMENT ON COLUMN public.organization_settings.country IS 'País de operación (Chile, Argentina, México, España, etc.). Usado para contexto del agente IA y facturación.';

COMMENT ON TABLE public.system_config IS 'Configuraciones del sistema de gestión oftalmológica';

COMMENT ON COLUMN public.system_config.organization_id IS 'Organization scope. NULL = global (super admin, applies to all).';

COMMENT ON COLUMN public.system_config.branch_id IS 'Branch scope. NULL with org_id = org-level. Set = branch-specific.';

COMMENT ON TABLE public.tier_change_audit IS 'Audit log of subscription tier changes for billing and support';

COMMIT;
