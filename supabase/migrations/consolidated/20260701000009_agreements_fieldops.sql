-- Migration: 20260703000009_agreements_fieldops.sql
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
-- Tables
-- ========================================

-- Table: account_activities
CREATE TABLE IF NOT EXISTS public.account_activities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    activity_type text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_activities_activity_type_check CHECK ((activity_type = ANY (ARRAY['lead_created'::text, 'demo_accessed'::text, 'organization_created'::text, 'user_invited'::text, 'user_joined'::text, 'subscription_started'::text, 'subscription_renewed'::text, 'subscription_changed'::text, 'subscription_cancelled'::text, 'support_ticket_created'::text, 'support_ticket_resolved'::text, 'email_sent'::text, 'email_opened'::text, 'email_clicked'::text, 'feature_used'::text, 'login'::text, 'logout'::text, 'note_added'::text, 'document_attached'::text, 'call_logged'::text, 'meeting_scheduled'::text, 'tier_changed'::text, 'branch_created'::text, 'branch_closed'::text, 'payment_received'::text, 'payment_failed'::text, 'workflow_triggered'::text, 'workflow_completed'::text])))
);

COMMENT ON TABLE public.account_activities IS 'Timeline unificado para Account 360° View - consolida actividades de todas las fuentes';
COMMENT ON COLUMN public.account_activities.activity_type IS 'Tipo de actividad (lead_created, login, subscription_renewed, etc.)';
COMMENT ON COLUMN public.account_activities.metadata IS 'Datos flexibles adicionales en formato JSONB';

ALTER TABLE public.account_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Root/Dev can delete account activities" ON public.account_activities FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY "Root/Dev can insert account activities" ON public.account_activities FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY "Root/Dev can view all account activities" ON public.account_activities FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));

ALTER TABLE public.account_activities
    ADD CONSTRAINT account_activities_pkey PRIMARY KEY (id);

ALTER TABLE public.account_activities
    ADD CONSTRAINT account_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.account_activities
    ADD CONSTRAINT account_activities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: account_documents
CREATE TABLE IF NOT EXISTS public.account_documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    document_type text NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size integer,
    mime_type text,
    uploaded_by uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_documents_document_type_check CHECK ((document_type = ANY (ARRAY['contract'::text, 'invoice'::text, 'identity'::text, 'proof_of_address'::text, 'note_attachment'::text, 'legal_document'::text, 'compliance_document'::text, 'other'::text])))
);

COMMENT ON TABLE public.account_documents IS 'Documentos adjuntos a cuentas de organización';
COMMENT ON COLUMN public.account_documents.file_url IS 'URL del archivo en R2 storage o CDN';

ALTER TABLE public.account_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Root/Dev can delete account documents" ON public.account_documents FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY "Root/Dev can insert account documents" ON public.account_documents FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY "Root/Dev can view account documents" ON public.account_documents FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));

CREATE TRIGGER update_account_documents_updated_at BEFORE UPDATE ON public.account_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.account_documents
    ADD CONSTRAINT account_documents_pkey PRIMARY KEY (id);

ALTER TABLE public.account_documents
    ADD CONSTRAINT account_documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.account_documents
    ADD CONSTRAINT account_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

-- Table: agreement_customers
CREATE TABLE IF NOT EXISTS public.agreement_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agreement_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    first_order_at timestamp with time zone NOT NULL,
    last_order_at timestamp with time zone NOT NULL,
    order_count integer DEFAULT 1 NOT NULL,
    total_copago numeric(12,2) DEFAULT 0 NOT NULL,
    total_institutional numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.agreement_customers IS 'Trazabilidad cliente-convenio: clientes que han comprado bajo cada convenio';

ALTER TABLE public.agreement_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view agreement customers" ON public.agreement_customers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_customers.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));

CREATE TRIGGER update_agreement_customers_updated_at BEFORE UPDATE ON public.agreement_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agreement_customers
    ADD CONSTRAINT agreement_customers_agreement_id_customer_id_key UNIQUE (agreement_id, customer_id);

ALTER TABLE public.agreement_customers
    ADD CONSTRAINT agreement_customers_pkey PRIMARY KEY (id);

ALTER TABLE public.agreement_customers
    ADD CONSTRAINT agreement_customers_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;

ALTER TABLE public.agreement_customers
    ADD CONSTRAINT agreement_customers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

-- Table: agreement_institutional_balances
CREATE TABLE IF NOT EXISTS public.agreement_institutional_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agreement_id uuid NOT NULL,
    order_id uuid NOT NULL,
    purchase_order_id uuid,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp with time zone,
    payment_reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    invoice_id uuid,
    CONSTRAINT agreement_institutional_balances_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT agreement_institutional_balances_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text])))
);

COMMENT ON TABLE public.agreement_institutional_balances IS 'Saldos institucionales pendientes de cobro';

ALTER TABLE public.agreement_institutional_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can update institutional balances" ON public.agreement_institutional_balances FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_institutional_balances.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));
CREATE POLICY "Admins can view institutional balances" ON public.agreement_institutional_balances FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_institutional_balances.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));
CREATE POLICY "Service role and admins can insert institutional balances" ON public.agreement_institutional_balances FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_institutional_balances.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));

CREATE TRIGGER update_agreement_institutional_balances_updated_at BEFORE UPDATE ON public.agreement_institutional_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agreement_institutional_balances
    ADD CONSTRAINT agreement_institutional_balances_pkey PRIMARY KEY (id);

ALTER TABLE public.agreement_institutional_balances
    ADD CONSTRAINT agreement_institutional_balances_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;

ALTER TABLE public.agreement_institutional_balances
    ADD CONSTRAINT agreement_institutional_balances_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.agreement_institutional_balances
    ADD CONSTRAINT agreement_institutional_balances_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.agreement_purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE public.agreement_institutional_balances
    ADD CONSTRAINT fk_agreement_institutional_balances_invoice_id FOREIGN KEY (invoice_id) REFERENCES public.agreement_institutional_invoices(id) ON DELETE SET NULL;

-- Table: agreement_institutional_invoice_balances
CREATE TABLE IF NOT EXISTS public.agreement_institutional_invoice_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    balance_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    CONSTRAINT agreement_institutional_invoice_balances_amount_check CHECK ((amount >= (0)::numeric))
);

COMMENT ON TABLE public.agreement_institutional_invoice_balances IS 'Relación factura-balances: qué balances incluye cada factura';

ALTER TABLE public.agreement_institutional_invoice_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert agreement institutional invoice balances" ON public.agreement_institutional_invoice_balances FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.agreement_institutional_invoices inv
     JOIN public.agreements a ON ((a.id = inv.agreement_id)))
  WHERE ((inv.id = agreement_institutional_invoice_balances.invoice_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));
CREATE POLICY "Admins can view agreement institutional invoice balances" ON public.agreement_institutional_invoice_balances FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.agreement_institutional_invoices inv
     JOIN public.agreements a ON ((a.id = inv.agreement_id)))
  WHERE ((inv.id = agreement_institutional_invoice_balances.invoice_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));

ALTER TABLE public.agreement_institutional_invoice_balances
    ADD CONSTRAINT agreement_institutional_invoice_balances_balance_id_key UNIQUE (balance_id);

ALTER TABLE public.agreement_institutional_invoice_balances
    ADD CONSTRAINT agreement_institutional_invoice_balances_pkey PRIMARY KEY (id);

ALTER TABLE public.agreement_institutional_invoice_balances
    ADD CONSTRAINT agreement_institutional_invoice_balances_balance_id_fkey FOREIGN KEY (balance_id) REFERENCES public.agreement_institutional_balances(id) ON DELETE CASCADE;

ALTER TABLE public.agreement_institutional_invoice_balances
    ADD CONSTRAINT agreement_institutional_invoice_balances_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.agreement_institutional_invoices(id) ON DELETE CASCADE;

-- Table: agreement_institutional_invoices
CREATE TABLE IF NOT EXISTS public.agreement_institutional_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agreement_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    institution_rut text NOT NULL,
    institution_name text NOT NULL,
    period_from date NOT NULL,
    period_to date NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    tax_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'CLP'::text,
    document_type text DEFAULT 'factura'::text NOT NULL,
    folio text NOT NULL,
    status text DEFAULT 'emitted'::text NOT NULL,
    sii_folio text,
    sii_status text,
    sii_track_id text,
    sii_response_data jsonb,
    sii_emission_date timestamp with time zone,
    payment_reference text,
    paid_at timestamp with time zone,
    pdf_url text,
    emitted_at timestamp with time zone DEFAULT now(),
    emitted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agreement_institutional_invoices_document_type_check CHECK ((document_type = 'factura'::text)),
    CONSTRAINT agreement_institutional_invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'emitted'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text])))
);

COMMENT ON TABLE public.agreement_institutional_invoices IS 'Facturas agrupadas a instituciones al conciliar cobranza';

ALTER TABLE public.agreement_institutional_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert agreement institutional invoices" ON public.agreement_institutional_invoices FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_institutional_invoices.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));
CREATE POLICY "Admins can view agreement institutional invoices" ON public.agreement_institutional_invoices FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_institutional_invoices.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));

CREATE TRIGGER update_agreement_institutional_invoices_updated_at BEFORE UPDATE ON public.agreement_institutional_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agreement_institutional_invoices
    ADD CONSTRAINT agreement_institutional_invoices_pkey PRIMARY KEY (id);

ALTER TABLE public.agreement_institutional_invoices
    ADD CONSTRAINT agreement_institutional_invoices_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;

ALTER TABLE public.agreement_institutional_invoices
    ADD CONSTRAINT agreement_institutional_invoices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.agreement_institutional_invoices
    ADD CONSTRAINT agreement_institutional_invoices_emitted_by_fkey FOREIGN KEY (emitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.agreement_institutional_invoices
    ADD CONSTRAINT agreement_institutional_invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: agreement_purchase_orders
CREATE TABLE IF NOT EXISTS public.agreement_purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agreement_id uuid NOT NULL,
    oc_number text NOT NULL,
    issued_at date,
    valid_until date,
    max_amount numeric(12,2),
    used_amount numeric(12,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agreement_purchase_orders_status_check CHECK ((status = ANY (ARRAY['active'::text, 'exhausted'::text, 'expired'::text, 'cancelled'::text])))
);

COMMENT ON TABLE public.agreement_purchase_orders IS 'Órdenes de compra emitidas por la institución';

ALTER TABLE public.agreement_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert purchase orders" ON public.agreement_purchase_orders FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_purchase_orders.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));
CREATE POLICY "Admins can update purchase orders" ON public.agreement_purchase_orders FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_purchase_orders.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));
CREATE POLICY "Admins can view purchase orders via agreement" ON public.agreement_purchase_orders FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_purchase_orders.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));

CREATE TRIGGER update_agreement_purchase_orders_updated_at BEFORE UPDATE ON public.agreement_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agreement_purchase_orders
    ADD CONSTRAINT agreement_purchase_orders_agreement_id_oc_number_key UNIQUE (agreement_id, oc_number);

ALTER TABLE public.agreement_purchase_orders
    ADD CONSTRAINT agreement_purchase_orders_pkey PRIMARY KEY (id);

ALTER TABLE public.agreement_purchase_orders
    ADD CONSTRAINT agreement_purchase_orders_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;

-- Table: agreements
CREATE TABLE IF NOT EXISTS public.agreements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid,
    name text NOT NULL,
    agreement_type text NOT NULL,
    institution_name text NOT NULL,
    institution_rut text NOT NULL,
    representative_name text,
    representative_email text,
    representative_phone text,
    valid_from date NOT NULL,
    valid_until date,
    status text DEFAULT 'active'::text NOT NULL,
    billing_rules jsonb DEFAULT '{}'::jsonb,
    max_installments_by_product jsonb DEFAULT '{}'::jsonb,
    discount_percent numeric(5,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT agreements_agreement_type_check CHECK ((agreement_type = ANY (ARRAY['empresa'::text, 'sindicato'::text, 'mutual'::text]))),
    CONSTRAINT agreements_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'expired'::text, 'cancelled'::text])))
);

COMMENT ON TABLE public.agreements IS 'Convenios con empresas, sindicatos o mutualidades';
COMMENT ON COLUMN public.agreements.billing_rules IS 'Reglas de facturación: copago_percent, institutional_percent, require_oc, etc.';

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert agreements" ON public.agreements FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])) AND (admin_branch_access.branch_id IS NOT NULL))))))));
CREATE POLICY "Admins can update agreements" ON public.agreements FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])) AND (admin_branch_access.branch_id IS NOT NULL))))))));
CREATE POLICY "Admins can view agreements in their org" ON public.agreements FOR SELECT USING ((public.is_super_admin(auth.uid()) OR ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL))))))));
CREATE POLICY "Super admin can delete agreements" ON public.agreements FOR DELETE USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agreements
    ADD CONSTRAINT agreements_pkey PRIMARY KEY (id);

ALTER TABLE public.agreements
    ADD CONSTRAINT agreements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.agreements
    ADD CONSTRAINT agreements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.agreements
    ADD CONSTRAINT agreements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.agreements
    ADD CONSTRAINT agreements_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Table: cancellation_reasons
CREATE TABLE IF NOT EXISTS public.cancellation_reasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    reason_category text NOT NULL,
    reason_detail text,
    save_offered boolean DEFAULT false,
    save_offer_type text,
    save_offer_accepted boolean DEFAULT false,
    save_offer_details text,
    cancellation_requested_at timestamp with time zone DEFAULT now(),
    cancelled_at timestamp with time zone,
    data_exported_at timestamp with time zone,
    data_export_url text,
    previous_tier text,
    previous_mrr numeric,
    days_active integer,
    total_logins integer,
    support_tickets_count integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cancellation_reasons_reason_category_check CHECK ((reason_category = ANY (ARRAY['too_expensive'::text, 'missing_features'::text, 'hard_to_use'::text, 'poor_support'::text, 'no_time'::text, 'seasonal'::text, 'switching_competitor'::text, 'closing_business'::text, 'technical_issues'::text, 'other'::text]))),
    CONSTRAINT cancellation_reasons_save_offer_type_check CHECK (((save_offer_type = ANY (ARRAY['month_free'::text, 'discount_50'::text, 'downgrade'::text, 'training'::text, 'custom'::text])) OR (save_offer_type IS NULL)))
);


ALTER TABLE public.cancellation_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY cancellation_reasons_root_full_access ON public.cancellation_reasons TO authenticated USING ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))) WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))));

ALTER TABLE public.cancellation_reasons
    ADD CONSTRAINT cancellation_reasons_pkey PRIMARY KEY (id);

ALTER TABLE public.cancellation_reasons
    ADD CONSTRAINT cancellation_reasons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: churn_signals_log
CREATE TABLE IF NOT EXISTS public.churn_signals_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    signal_type text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    action_taken text,
    action_result text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT churn_signals_log_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT churn_signals_log_signal_type_check CHECK ((signal_type = ANY (ARRAY['no_login_14d'::text, 'high_tickets_7d'::text, 'no_pos_activity_7d'::text, 'payment_past_due'::text, 'subscription_cancelled'::text])))
);


ALTER TABLE public.churn_signals_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY churn_signals_root_full_access ON public.churn_signals_log TO authenticated USING ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))) WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))));

ALTER TABLE public.churn_signals_log
    ADD CONSTRAINT churn_signals_log_pkey PRIMARY KEY (id);

ALTER TABLE public.churn_signals_log
    ADD CONSTRAINT churn_signals_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: customer_satisfaction_surveys
CREATE TABLE IF NOT EXISTS public.customer_satisfaction_surveys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    work_order_id uuid,
    customer_id uuid,
    score integer NOT NULL,
    comment text,
    token_used text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_satisfaction_surveys_score_check CHECK (((score >= 1) AND (score <= 5)))
);

COMMENT ON TABLE public.customer_satisfaction_surveys IS 'Customer satisfaction survey responses (score 1-5, optional comment)';

ALTER TABLE public.customer_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view customer_satisfaction_surveys" ON public.customer_satisfaction_surveys FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.organization_id = customer_satisfaction_surveys.organization_id) AND (au.is_active = true)))));
CREATE POLICY "Service role can manage customer_satisfaction_surveys" ON public.customer_satisfaction_surveys TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.customer_satisfaction_surveys
    ADD CONSTRAINT customer_satisfaction_surveys_pkey PRIMARY KEY (id);

ALTER TABLE public.customer_satisfaction_surveys
    ADD CONSTRAINT customer_satisfaction_surveys_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.customer_satisfaction_surveys
    ADD CONSTRAINT customer_satisfaction_surveys_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.customer_satisfaction_surveys
    ADD CONSTRAINT customer_satisfaction_surveys_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.lab_work_orders(id) ON DELETE SET NULL;

-- Table: drivers
CREATE TABLE IF NOT EXISTS public.drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    license_number text NOT NULL,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.drivers IS 'Drivers for internal order transportation';

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage drivers in their organization" ON public.drivers USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))) WITH CHECK ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
CREATE POLICY "Admins can view drivers in their organization" ON public.drivers FOR SELECT USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_license_number_key UNIQUE (license_number);

ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);

ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: field_operations
CREATE TABLE IF NOT EXISTS public.field_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    scheduled_date date NOT NULL,
    location text,
    branch_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT field_operations_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'prepared'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE public.field_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their organization field operations" ON public.field_operations USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id())));
CREATE POLICY "Users can view their organization field operations" ON public.field_operations FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id())));

ALTER TABLE public.field_operations
    ADD CONSTRAINT field_operations_pkey PRIMARY KEY (id);

ALTER TABLE public.field_operations
    ADD CONSTRAINT field_operations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.field_operations
    ADD CONSTRAINT field_operations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.field_operations
    ADD CONSTRAINT field_operations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- Table: internal_order_items
CREATE TABLE IF NOT EXISTS public.internal_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    internal_order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT internal_order_items_quantity_check CHECK ((quantity > 0))
);

COMMENT ON TABLE public.internal_order_items IS 'Items included in internal orders';

ALTER TABLE public.internal_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage internal order items in their organization" ON public.internal_order_items USING ((EXISTS ( SELECT 1
   FROM public.internal_orders io
  WHERE ((io.id = internal_order_items.internal_order_id) AND (io.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.internal_orders io
  WHERE ((io.id = internal_order_items.internal_order_id) AND (io.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))))));
CREATE POLICY "Admins can view internal order items in their organization" ON public.internal_order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.internal_orders io
  WHERE ((io.id = internal_order_items.internal_order_id) AND (io.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))))));

ALTER TABLE public.internal_order_items
    ADD CONSTRAINT internal_order_items_pkey PRIMARY KEY (id);

ALTER TABLE public.internal_order_items
    ADD CONSTRAINT internal_order_items_internal_order_id_fkey FOREIGN KEY (internal_order_id) REFERENCES public.internal_orders(id) ON DELETE CASCADE;

ALTER TABLE public.internal_order_items
    ADD CONSTRAINT internal_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

-- Table: internal_order_status_history
CREATE TABLE IF NOT EXISTS public.internal_order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    internal_order_id uuid NOT NULL,
    status text NOT NULL,
    notes text,
    changed_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT internal_order_status_history_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_transit'::text, 'delivered'::text, 'cancelled'::text])))
);

COMMENT ON TABLE public.internal_order_status_history IS 'History of status changes for internal orders';

ALTER TABLE public.internal_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can create status history in their organization" ON public.internal_order_status_history FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.internal_orders io
  WHERE ((io.id = internal_order_status_history.internal_order_id) AND (io.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))))) AND (changed_by = auth.uid())));
CREATE POLICY "Admins can view status history in their organization" ON public.internal_order_status_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.internal_orders io
  WHERE ((io.id = internal_order_status_history.internal_order_id) AND (io.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))))));

ALTER TABLE public.internal_order_status_history
    ADD CONSTRAINT internal_order_status_history_pkey PRIMARY KEY (id);

ALTER TABLE public.internal_order_status_history
    ADD CONSTRAINT internal_order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;

ALTER TABLE public.internal_order_status_history
    ADD CONSTRAINT internal_order_status_history_internal_order_id_fkey FOREIGN KEY (internal_order_id) REFERENCES public.internal_orders(id) ON DELETE CASCADE;

-- Table: internal_orders
CREATE TABLE IF NOT EXISTS public.internal_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    origin_branch_id uuid NOT NULL,
    destination_branch_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    priority text DEFAULT 'medium'::text,
    scheduled_date date,
    actual_delivery_date date,
    notes text,
    created_by uuid NOT NULL,
    assigned_driver_id uuid,
    assigned_vehicle_id uuid,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_different_branches CHECK ((origin_branch_id <> destination_branch_id)),
    CONSTRAINT chk_valid_dates CHECK (((scheduled_date IS NULL) OR (actual_delivery_date IS NULL) OR (scheduled_date <= actual_delivery_date))),
    CONSTRAINT internal_orders_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT internal_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_transit'::text, 'delivered'::text, 'cancelled'::text])))
);

COMMENT ON TABLE public.internal_orders IS 'Internal orders for branch-to-branch transfers';

ALTER TABLE public.internal_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage internal orders in their organization" ON public.internal_orders USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))) WITH CHECK ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
CREATE POLICY "Admins can view internal orders in their organization" ON public.internal_orders FOR SELECT USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE TRIGGER log_internal_order_status_changes AFTER UPDATE OF status ON public.internal_orders FOR EACH ROW EXECUTE FUNCTION public.log_internal_order_status_change();

CREATE TRIGGER update_internal_orders_updated_at BEFORE UPDATE ON public.internal_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_order_number_key UNIQUE (order_number);

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_pkey PRIMARY KEY (id);

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_assigned_driver_id_fkey FOREIGN KEY (assigned_driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_assigned_vehicle_id_fkey FOREIGN KEY (assigned_vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_destination_branch_id_fkey FOREIGN KEY (destination_branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_origin_branch_id_fkey FOREIGN KEY (origin_branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;

-- Table: inventory_movements
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    quantity_change integer NOT NULL,
    movement_type text NOT NULL,
    reference_type text,
    reference_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_movements_movement_type_check CHECK ((movement_type = ANY (ARRAY['sale'::text, 'adjustment'::text, 'receipt'::text, 'transfer'::text, 'refund'::text])))
);


ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert inventory movements" ON public.inventory_movements FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
CREATE POLICY "Admins can view inventory movements" ON public.inventory_movements FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

ALTER TABLE public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);

ALTER TABLE public.inventory_movements
    ADD CONSTRAINT inventory_movements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_movements
    ADD CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Table: inventory_transfer_items
CREATE TABLE IF NOT EXISTS public.inventory_transfer_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_transfer_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.inventory_transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create transfer items" ON public.inventory_transfer_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.inventory_transfers
  WHERE ((inventory_transfers.id = inventory_transfer_items.transfer_id) AND (inventory_transfers.organization_id = public.get_user_organization_id())))));
CREATE POLICY "Users can delete transfer items" ON public.inventory_transfer_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.inventory_transfers
  WHERE ((inventory_transfers.id = inventory_transfer_items.transfer_id) AND (inventory_transfers.organization_id = public.get_user_organization_id())))));
CREATE POLICY "Users can view transfer items" ON public.inventory_transfer_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.inventory_transfers
  WHERE ((inventory_transfers.id = inventory_transfer_items.transfer_id) AND (inventory_transfers.organization_id = public.get_user_organization_id())))));

ALTER TABLE public.inventory_transfer_items
    ADD CONSTRAINT inventory_transfer_items_pkey PRIMARY KEY (id);

ALTER TABLE public.inventory_transfer_items
    ADD CONSTRAINT inventory_transfer_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_transfer_items
    ADD CONSTRAINT inventory_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.inventory_transfers(id) ON DELETE CASCADE;

-- Table: inventory_transfers
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    origin_branch_id uuid NOT NULL,
    destination_branch_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    confirmed_by uuid,
    CONSTRAINT inventory_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'cancelled'::text])))
);


ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create transfers in their org" ON public.inventory_transfers FOR INSERT WITH CHECK ((organization_id = public.get_user_organization_id()));
CREATE POLICY "Users can update transfers in their org" ON public.inventory_transfers FOR UPDATE USING ((organization_id = public.get_user_organization_id()));
CREATE POLICY "Users can view transfers in their org" ON public.inventory_transfers FOR SELECT USING ((organization_id = public.get_user_organization_id()));

ALTER TABLE public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_pkey PRIMARY KEY (id);

ALTER TABLE public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_destination_branch_id_fkey FOREIGN KEY (destination_branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_transfers
    ADD CONSTRAINT inventory_transfers_origin_branch_id_fkey FOREIGN KEY (origin_branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- Table: lead_activities
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lead_id uuid NOT NULL,
    activity_type text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT valid_activity_type CHECK ((activity_type = ANY (ARRAY['lead_created'::text, 'email_sent'::text, 'email_opened'::text, 'email_clicked'::text, 'email_bounced'::text, 'demo_accessed'::text, 'demo_login'::text, 'meeting_scheduled'::text, 'meeting_completed'::text, 'meeting_cancelled'::text, 'call_logged'::text, 'note_added'::text, 'stage_changed'::text, 'stage_changed_positive'::text, 'stage_changed_negative'::text, 'first_contact'::text, 'score_updated'::text, 'assigned'::text, 'outbound_call'::text, 'pricing_sent'::text, 'proposal_viewed'::text, 'manual_email_sent'::text])))
);

COMMENT ON TABLE public.lead_activities IS 'Historial de actividades para leads y demo requests';

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_activities_root_full_access ON public.lead_activities TO authenticated USING ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))) WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))));

ALTER TABLE public.lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);

ALTER TABLE public.lead_activities
    ADD CONSTRAINT lead_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.lead_activities
    ADD CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.demo_requests(id) ON DELETE CASCADE;

-- Table: lead_email_communications
CREATE TABLE IF NOT EXISTS public.lead_email_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    gmail_message_id text NOT NULL,
    thread_id text,
    from_email text NOT NULL,
    to_email text NOT NULL,
    subject text DEFAULT '(Sin asunto)'::text NOT NULL,
    body_text text,
    sent_at timestamp with time zone NOT NULL,
    is_read boolean DEFAULT false,
    labels jsonb DEFAULT '[]'::jsonb,
    synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.lead_email_communications IS 'Emails sincronizados desde Gmail para leads/solicitudes de demo';
COMMENT ON COLUMN public.lead_email_communications.lead_id IS 'Referencia al lead (demo_requests)';
COMMENT ON COLUMN public.lead_email_communications.gmail_message_id IS 'ID único del mensaje en Gmail';
COMMENT ON COLUMN public.lead_email_communications.thread_id IS 'ID del hilo de conversación en Gmail';
COMMENT ON COLUMN public.lead_email_communications.from_email IS 'Remitente del email';
COMMENT ON COLUMN public.lead_email_communications.to_email IS 'Destinatario del email';
COMMENT ON COLUMN public.lead_email_communications.body_text IS 'Cuerpo del email en texto plano';
COMMENT ON COLUMN public.lead_email_communications.labels IS 'Etiquetas de Gmail (UNREAD, INBOX, etc.)';
COMMENT ON COLUMN public.lead_email_communications.synced_at IS 'Fecha de última sincronización con Gmail';

ALTER TABLE public.lead_email_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only root/dev can read lead email communications" ON public.lead_email_communications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY "Service role only can insert lead email communications" ON public.lead_email_communications FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY "Service role only can update lead email communications" ON public.lead_email_communications FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));

ALTER TABLE public.lead_email_communications
    ADD CONSTRAINT lead_email_communications_gmail_message_id_key UNIQUE (gmail_message_id);

ALTER TABLE public.lead_email_communications
    ADD CONSTRAINT lead_email_communications_pkey PRIMARY KEY (id);

ALTER TABLE public.lead_email_communications
    ADD CONSTRAINT lead_email_communications_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.demo_requests(id) ON DELETE CASCADE;

-- Table: lead_scoring_demographic_rules
CREATE TABLE IF NOT EXISTS public.lead_scoring_demographic_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_type text NOT NULL,
    rule_value text NOT NULL,
    points integer NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lead_scoring_demographic_rules_rule_type_check CHECK ((rule_type = ANY (ARRAY['company_size'::text, 'revenue_range'::text, 'has_system'::text, 'patients_month'::text, 'business_focus'::text, 'contact_role'::text, 'region'::text])))
);


ALTER TABLE public.lead_scoring_demographic_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_scoring_demographic_rules_root_full_access ON public.lead_scoring_demographic_rules TO authenticated USING ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))) WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))));

ALTER TABLE public.lead_scoring_demographic_rules
    ADD CONSTRAINT lead_scoring_demographic_rules_pkey PRIMARY KEY (id);

ALTER TABLE public.lead_scoring_demographic_rules
    ADD CONSTRAINT lead_scoring_demographic_rules_rule_type_rule_value_key UNIQUE (rule_type, rule_value);

-- Table: lead_scoring_logs
CREATE TABLE IF NOT EXISTS public.lead_scoring_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lead_id uuid NOT NULL,
    activity_type text NOT NULL,
    points_before integer NOT NULL,
    points_after integer NOT NULL,
    change_reason text,
    calculated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.lead_scoring_logs IS 'Registro de cambios en el score de leads';

ALTER TABLE public.lead_scoring_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_scoring_logs_root_full_access ON public.lead_scoring_logs TO authenticated USING ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))) WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))));

ALTER TABLE public.lead_scoring_logs
    ADD CONSTRAINT lead_scoring_logs_pkey PRIMARY KEY (id);

ALTER TABLE public.lead_scoring_logs
    ADD CONSTRAINT lead_scoring_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.demo_requests(id) ON DELETE CASCADE;

-- Table: lead_scoring_rules
CREATE TABLE IF NOT EXISTS public.lead_scoring_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    activity_type text NOT NULL,
    points integer NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.lead_scoring_rules IS 'Reglas de puntuación para scoring de leads';

ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_scoring_rules_root_full_access ON public.lead_scoring_rules TO authenticated USING ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))) WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))));

ALTER TABLE public.lead_scoring_rules
    ADD CONSTRAINT lead_scoring_rules_activity_type_key UNIQUE (activity_type);

ALTER TABLE public.lead_scoring_rules
    ADD CONSTRAINT lead_scoring_rules_pkey PRIMARY KEY (id);

-- Table: operativo_mobile_stock
CREATE TABLE IF NOT EXISTS public.operativo_mobile_stock (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_operation_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT operativo_mobile_stock_quantity_check CHECK ((quantity >= 0)),
    CONSTRAINT operativo_mobile_stock_reserved_quantity_check CHECK ((reserved_quantity >= 0))
);


ALTER TABLE public.operativo_mobile_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage operativo mobile stock via field operation" ON public.operativo_mobile_stock USING ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_mobile_stock.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_mobile_stock.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id()))))));
CREATE POLICY "Users can view operativo mobile stock via field operation" ON public.operativo_mobile_stock FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_mobile_stock.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id()))))));

ALTER TABLE public.operativo_mobile_stock
    ADD CONSTRAINT operativo_mobile_stock_field_operation_id_product_id_key UNIQUE (field_operation_id, product_id);

ALTER TABLE public.operativo_mobile_stock
    ADD CONSTRAINT operativo_mobile_stock_pkey PRIMARY KEY (id);

ALTER TABLE public.operativo_mobile_stock
    ADD CONSTRAINT operativo_mobile_stock_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE CASCADE;

ALTER TABLE public.operativo_mobile_stock
    ADD CONSTRAINT operativo_mobile_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

-- Table: operativo_sync_queue
CREATE TABLE IF NOT EXISTS public.operativo_sync_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id text NOT NULL,
    field_operation_id uuid NOT NULL,
    entity_type text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    synced_at timestamp with time zone,
    CONSTRAINT operativo_sync_queue_entity_type_check CHECK ((entity_type = ANY (ARRAY['customer'::text, 'prescription'::text, 'lab_work_order'::text, 'payment'::text]))),
    CONSTRAINT operativo_sync_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'syncing'::text, 'synced'::text, 'failed'::text])))
);


ALTER TABLE public.operativo_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage operativo sync queue via field operation" ON public.operativo_sync_queue USING ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_sync_queue.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_sync_queue.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id()))))));
CREATE POLICY "Users can view operativo sync queue via field operation" ON public.operativo_sync_queue FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_sync_queue.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id()))))));

ALTER TABLE public.operativo_sync_queue
    ADD CONSTRAINT operativo_sync_queue_pkey PRIMARY KEY (id);

ALTER TABLE public.operativo_sync_queue
    ADD CONSTRAINT operativo_sync_queue_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE CASCADE;

-- Table: referrals
CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_name text NOT NULL,
    referrer_email text NOT NULL,
    referrer_phone text,
    referred_name text NOT NULL,
    referred_email text NOT NULL,
    referred_phone text,
    referred_optica_name text,
    status text DEFAULT 'pending'::text NOT NULL,
    reward_type text DEFAULT 'month_free'::text,
    reward_status text DEFAULT 'pending'::text,
    reward_details jsonb DEFAULT '{}'::jsonb,
    notes text,
    source text DEFAULT 'referral_page'::text,
    converted_demo_request_id uuid,
    converted_organization_id uuid,
    converted_at timestamp with time zone,
    reward_delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT referrals_reward_status_check CHECK ((reward_status = ANY (ARRAY['pending'::text, 'approved'::text, 'delivered'::text, 'cancelled'::text]))),
    CONSTRAINT referrals_reward_type_check CHECK ((reward_type = ANY (ARRAY['month_free'::text, 'discount_50'::text, 'custom'::text]))),
    CONSTRAINT referrals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'contacted'::text, 'demo_requested'::text, 'converted'::text, 'rewarded'::text, 'expired'::text, 'cancelled'::text])))
);


ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY referrals_public_insert ON public.referrals FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY referrals_root_full_access ON public.referrals TO authenticated USING ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))) WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))));

ALTER TABLE public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);

ALTER TABLE public.referrals
    ADD CONSTRAINT referrals_referrer_email_referred_email_key UNIQUE (referrer_email, referred_email);

ALTER TABLE public.referrals
    ADD CONSTRAINT referrals_converted_demo_request_id_fkey FOREIGN KEY (converted_demo_request_id) REFERENCES public.demo_requests(id) ON DELETE SET NULL;

ALTER TABLE public.referrals
    ADD CONSTRAINT referrals_converted_organization_id_fkey FOREIGN KEY (converted_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Table: survey_invitations
CREATE TABLE IF NOT EXISTS public.survey_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    organization_id uuid NOT NULL,
    work_order_id uuid NOT NULL,
    customer_id uuid,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.survey_invitations IS 'One-time tokens for satisfaction survey links sent after lens delivery';

ALTER TABLE public.survey_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view survey_invitations" ON public.survey_invitations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.organization_id = survey_invitations.organization_id) AND (au.is_active = true)))));
CREATE POLICY "Service role can manage survey_invitations" ON public.survey_invitations TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.survey_invitations
    ADD CONSTRAINT survey_invitations_pkey PRIMARY KEY (id);

ALTER TABLE public.survey_invitations
    ADD CONSTRAINT survey_invitations_token_key UNIQUE (token);

ALTER TABLE public.survey_invitations
    ADD CONSTRAINT survey_invitations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.survey_invitations
    ADD CONSTRAINT survey_invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.survey_invitations
    ADD CONSTRAINT survey_invitations_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.lab_work_orders(id) ON DELETE CASCADE;

-- Table: vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plate_number text NOT NULL,
    model text,
    capacity integer DEFAULT 0,
    is_active boolean DEFAULT true,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vehicles_capacity_check CHECK ((capacity >= 0))
);

COMMENT ON TABLE public.vehicles IS 'Vehicles used for internal order transportation';

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vehicles in their organization" ON public.vehicles USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))) WITH CHECK ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
CREATE POLICY "Admins can view vehicles in their organization" ON public.vehicles FOR SELECT USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);

ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_plate_number_key UNIQUE (plate_number);

ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: workflow_definitions
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    trigger_type text NOT NULL,
    trigger_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workflow_definitions_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['manual'::text, 'on_create'::text, 'on_status_change'::text, 'on_date'::text, 'on_health_score'::text, 'on_inactivity'::text])))
);

COMMENT ON TABLE public.workflow_definitions IS 'Definiciones de workflows/playbooks automatizados';
COMMENT ON COLUMN public.workflow_definitions.trigger_type IS 'Tipo de trigger: manual, on_create (org creada), on_status_change, on_date, on_health_score, on_inactivity';
COMMENT ON COLUMN public.workflow_definitions.is_system IS 'Si es true, es un workflow del sistema y no puede eliminarse';
COMMENT ON COLUMN public.workflow_definitions.steps IS 'Array de pasos: [{step: 1, type: "delay"|"email"|"task"|"webhook"|"condition"|"notification", config: {...}}]';

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Root/Dev can delete workflow definitions" ON public.workflow_definitions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])) AND (workflow_definitions.is_system = false)))));
CREATE POLICY "Root/Dev can insert workflow definitions" ON public.workflow_definitions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY "Root/Dev can update workflow definitions" ON public.workflow_definitions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY "Root/Dev can view workflow definitions" ON public.workflow_definitions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));

CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON public.workflow_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_pkey PRIMARY KEY (id);

ALTER TABLE public.workflow_definitions
    ADD CONSTRAINT workflow_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

-- Table: workflow_executions
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    workflow_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    current_step integer DEFAULT 1 NOT NULL,
    total_steps integer DEFAULT 0 NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    error_message text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_resume_at timestamp with time zone,
    CONSTRAINT workflow_executions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'waiting'::text, 'completed'::text, 'paused'::text, 'cancelled'::text, 'failed'::text])))
);

COMMENT ON TABLE public.workflow_executions IS 'Instancias de ejecución de workflows';
COMMENT ON COLUMN public.workflow_executions.status IS 'Estado: pending, running, completed, paused, cancelled, failed';
COMMENT ON COLUMN public.workflow_executions.context IS 'Variables de contexto para esta ejecución';
COMMENT ON COLUMN public.workflow_executions.scheduled_resume_at IS 'Fecha programada para reanudar ejecución (delay steps)';

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Root/Dev can insert workflow executions" ON public.workflow_executions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY "Root/Dev can update workflow executions" ON public.workflow_executions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY "Root/Dev can view workflow executions" ON public.workflow_executions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));

CREATE TRIGGER update_workflow_executions_updated_at BEFORE UPDATE ON public.workflow_executions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.workflow_executions
    ADD CONSTRAINT workflow_executions_pkey PRIMARY KEY (id);

ALTER TABLE public.workflow_executions
    ADD CONSTRAINT workflow_executions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.workflow_executions
    ADD CONSTRAINT workflow_executions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.workflow_executions
    ADD CONSTRAINT workflow_executions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflow_definitions(id) ON DELETE CASCADE;

-- ========================================
-- Views
-- ========================================

-- View: account_health_scores
CREATE OR REPLACE VIEW public.account_health_scores AS
 SELECT o.id AS organization_id,
    o.name AS organization_name,
    o.slug AS organization_slug,
    o.subscription_tier,
    o.status AS organization_status,
    o.created_at AS organization_created_at,
    COALESCE(((
        CASE
            WHEN (( SELECT max(admin_users.last_login) AS max
               FROM public.admin_users
              WHERE (admin_users.organization_id = o.id)) > (now() - '7 days'::interval)) THEN 20
            ELSE 0
        END +
        CASE
            WHEN (( SELECT max(admin_users.last_login) AS max
               FROM public.admin_users
              WHERE (admin_users.organization_id = o.id)) > (now() - '30 days'::interval)) THEN 15
            ELSE 0
        END) + LEAST((COALESCE(( SELECT count(*) AS count
           FROM (public.admin_activity_log a
             JOIN public.admin_users au ON ((a.admin_user_id = au.id)))
          WHERE ((au.organization_id = o.id) AND (a.created_at > (now() - '30 days'::interval)))), (0)::bigint) / 10), (5)::bigint)), (0)::bigint) AS engagement_score,
    COALESCE(
        CASE
            WHEN (COALESCE(( SELECT count(*) AS count
               FROM public.saas_support_tickets
              WHERE ((saas_support_tickets.organization_id = o.id) AND (saas_support_tickets.status <> ALL (ARRAY['resolved'::text, 'closed'::text])))), (0)::bigint) = 0) THEN (30)::bigint
            ELSE GREATEST((30 - (COALESCE(( SELECT count(*) AS count
               FROM public.saas_support_tickets
              WHERE ((saas_support_tickets.organization_id = o.id) AND (saas_support_tickets.status <> ALL (ARRAY['resolved'::text, 'closed'::text])))), (0)::bigint) * 10)), (0)::bigint)
        END, (30)::bigint) AS support_score,
    COALESCE(
        CASE
            WHEN (s.status = 'active'::text) THEN 30
            WHEN (s.status = 'trialing'::text) THEN 20
            WHEN (s.status = 'past_due'::text) THEN 10
            WHEN (s.status = 'cancelled'::text) THEN 0
            ELSE 15
        END, 15) AS financial_score,
    COALESCE(((
        CASE
            WHEN (( SELECT max(admin_users.last_login) AS max
               FROM public.admin_users
              WHERE (admin_users.organization_id = o.id)) > (now() - '7 days'::interval)) THEN 20
            ELSE 0
        END +
        CASE
            WHEN (( SELECT max(admin_users.last_login) AS max
               FROM public.admin_users
              WHERE (admin_users.organization_id = o.id)) > (now() - '30 days'::interval)) THEN 15
            ELSE 0
        END) + LEAST((COALESCE(( SELECT count(*) AS count
           FROM (public.admin_activity_log a
             JOIN public.admin_users au ON ((a.admin_user_id = au.id)))
          WHERE ((au.organization_id = o.id) AND (a.created_at > (now() - '30 days'::interval)))), (0)::bigint) / 10), (5)::bigint)), (0)::bigint) AS total_score,
        CASE
            WHEN (COALESCE(((
            CASE
                WHEN (( SELECT max(admin_users.last_login) AS max
                   FROM public.admin_users
                  WHERE (admin_users.organization_id = o.id)) > (now() - '7 days'::interval)) THEN 20
                ELSE 0
            END +
            CASE
                WHEN (( SELECT max(admin_users.last_login) AS max
                   FROM public.admin_users
                  WHERE (admin_users.organization_id = o.id)) > (now() - '30 days'::interval)) THEN 15
                ELSE 0
            END) + LEAST((COALESCE(( SELECT count(*) AS count
               FROM (public.admin_activity_log a
                 JOIN public.admin_users au ON ((a.admin_user_id = au.id)))
              WHERE ((au.organization_id = o.id) AND (a.created_at > (now() - '30 days'::interval)))), (0)::bigint) / 10), (5)::bigint)), (0)::bigint) >= 80) THEN 'healthy'::text
            WHEN (COALESCE(((
            CASE
                WHEN (( SELECT max(admin_users.last_login) AS max
                   FROM public.admin_users
                  WHERE (admin_users.organization_id = o.id)) > (now() - '7 days'::interval)) THEN 20
                ELSE 0
            END +
            CASE
                WHEN (( SELECT max(admin_users.last_login) AS max
                   FROM public.admin_users
                  WHERE (admin_users.organization_id = o.id)) > (now() - '30 days'::interval)) THEN 15
                ELSE 0
            END) + LEAST((COALESCE(( SELECT count(*) AS count
               FROM (public.admin_activity_log a
                 JOIN public.admin_users au ON ((a.admin_user_id = au.id)))
              WHERE ((au.organization_id = o.id) AND (a.created_at > (now() - '30 days'::interval)))), (0)::bigint) / 10), (5)::bigint)), (0)::bigint) >= 50) THEN 'at_risk'::text
            ELSE 'critical'::text
        END AS risk_level,
    ( SELECT count(*) AS count
           FROM public.admin_users
          WHERE (admin_users.organization_id = o.id)) AS total_users,
    ( SELECT count(*) AS count
           FROM public.branches
          WHERE (branches.organization_id = o.id)) AS total_branches,
    ( SELECT count(*) AS count
           FROM public.customers
          WHERE (customers.organization_id = o.id)) AS total_customers,
    ( SELECT max(admin_users.last_login) AS max
           FROM public.admin_users
          WHERE (admin_users.organization_id = o.id)) AS last_login,
    ( SELECT count(*) AS count
           FROM public.saas_support_tickets
          WHERE ((saas_support_tickets.organization_id = o.id) AND (saas_support_tickets.status <> ALL (ARRAY['resolved'::text, 'closed'::text])))) AS open_tickets,
    s.status AS subscription_status,
    s.current_period_end AS subscription_renewal_date,
    NULL::numeric AS mrr
   FROM (public.organizations o
     LEFT JOIN public.subscriptions s ON (((s.organization_id = o.id) AND (s.status = ANY (ARRAY['active'::text, 'trialing'::text, 'past_due'::text])))))
  WHERE (o.status <> 'cancelled'::text);

-- ========================================
-- Functions
-- ========================================
CREATE OR REPLACE FUNCTION public.apply_lead_score_decay() RETURNS TABLE(lead_id uuid, old_score integer, new_score integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_lead RECORD;
    v_new_score INT;
    v_old_score INT;
BEGIN
    FOR v_lead IN 
        SELECT id, lead_score, last_activity_at
        FROM demo_requests
        WHERE 
            lead_score > 0 
            AND (
                (last_activity_at IS NOT NULL AND last_activity_at < NOW() - INTERVAL '14 days')
                OR 
                (last_activity_at IS NULL AND created_at < NOW() - INTERVAL '14 days')
            )
            AND funnel_stage NOT IN ('converted', 'lost', 'rejected')
    LOOP
        v_old_score := v_lead.lead_score;
        v_new_score := GREATEST(0, v_old_score - GREATEST(1, v_old_score / 5));
        
        UPDATE demo_requests 
        SET lead_score = v_new_score,
            score_last_calculated_at = NOW(),
            priority_level = CASE 
                WHEN v_new_score > 80 THEN 'hot'
                WHEN v_new_score >= 40 THEN 'warm'
                WHEN v_new_score > 0 THEN 'cold'
                ELSE 'at_risk'
            END
        WHERE id = v_lead.id;
        
        INSERT INTO lead_scoring_logs (lead_id, activity_type, points_before, points_after, change_reason)
        VALUES (v_lead.id, 'score_decay', v_old_score, v_new_score, 'Score decay por inactividad > 14 días');
        
        lead_id := v_lead.id;
        old_score := v_old_score;
        new_score := v_new_score;
        RETURN NEXT;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_demographic_score(p_lead_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_score INT := 0;
    v_lead RECORD;
BEGIN
    SELECT 
        company_size,
        estimated_monthly_revenue,
        has_existing_system,
        estimated_monthly_patients,
        business_focus,
        contact_role,
        location_region
    INTO v_lead
    FROM demo_requests 
    WHERE id = p_lead_id;

    -- Score for company size
    IF v_lead.company_size = 'large' THEN v_score := v_score + 20;
    ELSIF v_lead.company_size = 'medium' THEN v_score := v_score + 10;
    ELSIF v_lead.company_size = 'small' THEN v_score := v_score + 5;
    END IF;

    -- Score for revenue
    IF v_lead.estimated_monthly_revenue = 'high' THEN v_score := v_score + 25;
    ELSIF v_lead.estimated_monthly_revenue = 'medium' THEN v_score := v_score + 15;
    ELSIF v_lead.estimated_monthly_revenue = 'low' THEN v_score := v_score + 5;
    END IF;

    -- Score for having no existing system
    IF v_lead.has_existing_system = false THEN v_score := v_score + 15;
    END IF;

    -- Score for estimated patients
    IF v_lead.estimated_monthly_patients = 'high' THEN v_score := v_score + 20;
    ELSIF v_lead.estimated_monthly_patients = 'medium' THEN v_score := v_score + 10;
    END IF;

    RETURN v_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_lead_score(p_lead_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_score INT := 0;
    v_activity_type TEXT;
    v_rule_points INT;
    v_demographic_score INT := 0;
BEGIN
    -- PARTE 1: Activity-based scoring (existente)
    FOR v_activity_type IN 
        SELECT activity_type FROM lead_activities WHERE lead_id = p_lead_id
    LOOP
        SELECT COALESCE(points, 0) INTO v_rule_points 
        FROM lead_scoring_rules 
        WHERE activity_type = v_activity_type AND is_active = true;
        
        v_score := v_score + v_rule_points;
    END LOOP;
    
    -- PARTE 2: Demographic scoring (nuevo)
    v_demographic_score := calculate_demographic_score(p_lead_id);
    v_score := v_score + v_demographic_score;
    
    v_score := GREATEST(v_score, 0);
    
    RETURN v_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_churn_signals() RETURNS TABLE(organization_id uuid, org_name text, signal_type text, severity text, details jsonb)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_org RECORD;
    v_last_login TIMESTAMPTZ;
    v_ticket_count INT;
    v_wo_count INT;
    v_sub_status TEXT;
BEGIN
    FOR v_org IN SELECT id, name FROM public.organizations WHERE status = 'active'
    LOOP
        SELECT MAX(last_login) INTO v_last_login FROM public.admin_users WHERE organization_id = v_org.id;
        IF v_last_login IS NOT NULL AND v_last_login < NOW() - INTERVAL '14 days' THEN
            organization_id := v_org.id; org_name := v_org.name; signal_type := 'no_login_14d'; severity := 'high';
            details := jsonb_build_object('last_login', v_last_login, 'days_since_last_login', EXTRACT(DAY FROM NOW() - v_last_login)::INT);
            RETURN NEXT;
        END IF;
        SELECT COUNT(*) INTO v_ticket_count FROM public.support_tickets st
        WHERE st.branch_id IN (SELECT id FROM public.branches WHERE organization_id = v_org.id)
        AND st.created_at > NOW() - INTERVAL '7 days';
        IF v_ticket_count > 3 THEN
            organization_id := v_org.id; org_name := v_org.name; signal_type := 'high_tickets_7d'; severity := 'medium';
            details := jsonb_build_object('ticket_count', v_ticket_count, 'period_days', 7);
            RETURN NEXT;
        END IF;
        SELECT COUNT(*) INTO v_wo_count FROM public.lab_work_orders WHERE organization_id = v_org.id AND created_at > NOW() - INTERVAL '7 days';
        IF v_wo_count = 0 THEN
            organization_id := v_org.id; org_name := v_org.name; signal_type := 'no_pos_activity_7d'; severity := 'medium';
            details := jsonb_build_object('days_without_activity', 7);
            RETURN NEXT;
        END IF;
        SELECT COALESCE(status, 'active') INTO v_sub_status FROM public.subscriptions WHERE organization_id = v_org.id LIMIT 1;
        IF v_sub_status IN ('past_due', 'incomplete', 'unpaid') THEN
            organization_id := v_org.id; org_name := v_org.name; signal_type := 'payment_past_due'; severity := 'critical';
            details := jsonb_build_object('subscription_status', v_sub_status);
            RETURN NEXT;
        END IF;
        IF v_sub_status = 'canceled' THEN
            organization_id := v_org.id; org_name := v_org.name; signal_type := 'subscription_cancelled'; severity := 'critical';
            details := jsonb_build_object('subscription_status', 'canceled');
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_hot_leads_without_contact() RETURNS TABLE(lead_id uuid, lead_name text, lead_email text, optica_name text, current_score integer, hours_since_last_contact integer, assigned_to_name text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.id,
        dr.full_name,
        dr.email,
        dr.optica_name,
        dr.lead_score,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(dr.last_contact_at, dr.created_at))) / 3600::INT AS hours_since_last_contact,
        au.full_name AS assigned_to_name
    FROM demo_requests dr
    LEFT JOIN admin_users au ON dr.assigned_to = au.id
    WHERE 
        dr.priority_level = 'hot'
        AND dr.funnel_stage NOT IN ('converted', 'lost', 'rejected')
        AND COALESCE(dr.last_contact_at, dr.created_at) < NOW() - INTERVAL '4 hours'
    ORDER BY hours_since_last_contact DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_stale_leads() RETURNS TABLE(lead_id uuid, lead_name text, lead_email text, optica_name text, days_inactive integer, current_score integer, current_stage text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.id,
        dr.full_name,
        dr.email,
        dr.optica_name,
        EXTRACT(DAY FROM NOW() - COALESCE(dr.last_activity_at, dr.created_at))::INT AS days_inactive,
        dr.lead_score,
        dr.funnel_stage
    FROM demo_requests dr
    WHERE 
        dr.funnel_stage NOT IN ('converted', 'lost', 'rejected')
        AND COALESCE(dr.last_activity_at, dr.created_at) < NOW() - INTERVAL '7 days'
    ORDER BY days_inactive DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_agreement_institutional_invoice_folio(p_branch_id uuid) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
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
$$;

CREATE OR REPLACE FUNCTION public.generate_internal_order_number(org_id uuid) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  prefix TEXT;
  next_number INTEGER;
  order_number TEXT;
BEGIN
  -- Get organization prefix (first 3 letters of organization name)
  SELECT UPPER(LEFT(name, 3)) INTO prefix
  FROM public.organizations
  WHERE id = org_id;
  
  -- Get next sequence number for this organization
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM LENGTH(prefix) + 2) AS INTEGER)), 0) + 1 INTO next_number
  FROM public.internal_orders
  WHERE organization_id = org_id
  AND order_number LIKE prefix || '-%';
  
  -- Generate order number (e.g., OPT-0001)
  order_number := prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN order_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_optical_internal_ticket_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  date_prefix TEXT;
  random_suffix TEXT;
  ticket_num TEXT;
BEGIN
  -- Format: OPT-YYYYMMDD-XXXXX
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5));
  ticket_num := 'OPT-' || date_prefix || '-' || random_suffix;
  
  -- Ensure uniqueness (retry if collision)
  WHILE EXISTS (SELECT 1 FROM public.optical_internal_support_tickets WHERE ticket_number = ticket_num) LOOP
    random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || RANDOM()::TEXT) FROM 1 FOR 5));
    ticket_num := 'OPT-' || date_prefix || '-' || random_suffix;
  END LOOP;
  
  RETURN ticket_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_churn_stats() RETURNS TABLE(total_active_orgs integer, at_risk_orgs integer, signals_last_7d integer, cancellations_last_30d integer, top_cancellation_reason text)
    LANGUAGE plpgsql
    AS $$
DECLARE v_top_reason TEXT;
BEGIN
    SELECT reason_category INTO v_top_reason FROM public.cancellation_reasons
    WHERE created_at > NOW() - INTERVAL '90 days'
    GROUP BY reason_category ORDER BY COUNT(*) DESC LIMIT 1;
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.organizations WHERE status = 'active')::INT,
        (SELECT COUNT(DISTINCT organization_id) FROM public.churn_signals_log WHERE resolved_at IS NULL)::INT,
        (SELECT COUNT(*) FROM public.churn_signals_log WHERE created_at > NOW() - INTERVAL '7 days')::INT,
        (SELECT COUNT(*) FROM public.cancellation_reasons WHERE created_at > NOW() - INTERVAL '30 days')::INT,
        COALESCE(v_top_reason, 'N/A')::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referral_stats(p_referrer_email text DEFAULT NULL::text) RETURNS TABLE(total_referrals integer, pending_referrals integer, converted_referrals integer, rewarded_referrals integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INT,
        COUNT(*) FILTER (WHERE status = 'pending')::INT,
        COUNT(*) FILTER (WHERE status = 'converted')::INT,
        COUNT(*) FILTER (WHERE reward_status = 'delivered')::INT
    FROM public.referrals
    WHERE (p_referrer_email IS NULL OR referrer_email = p_referrer_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_demo_request_activity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_activity_type TEXT;
    v_description TEXT;
BEGIN
    -- Detect stage changes
    IF NEW.funnel_stage IS DISTINCT FROM OLD.funnel_stage THEN
        -- Determine if positive or negative change
        IF NEW.funnel_stage IN ('converted', 'won') OR 
           (NEW.funnel_stage = 'negotiation' AND OLD.funnel_stage IN ('meeting_scheduled', 'post_meeting')) OR
           (NEW.funnel_stage = 'post_meeting' AND OLD.funnel_stage = 'meeting_scheduled') OR
           (NEW.funnel_stage = 'meeting_scheduled' AND OLD.funnel_stage IN ('approved', 'demo_expiring', 'demo_active')) THEN
            v_activity_type := 'stage_changed_positive';
        ELSIF NEW.funnel_stage IN ('lost', 'rejected', 'demo_expired') THEN
            v_activity_type := 'stage_changed_negative';
        ELSE
            v_activity_type := 'stage_changed';
        END IF;
        
        v_description := 'Cambió de etapa: ' || COALESCE(OLD.funnel_stage, 'null') || ' → ' || COALESCE(NEW.funnel_stage, 'null');
        
        PERFORM record_lead_activity(
            NEW.id,
            v_activity_type,
            v_description,
            JSONB_BUILD_OBJECT('old_stage', OLD.funnel_stage, 'new_stage', NEW.funnel_stage)
        );
    END IF;
    
    -- Record first contact
    IF NEW.first_contact_at IS DISTINCT FROM OLD.first_contact_at AND NEW.first_contact_at IS NOT NULL THEN
        PERFORM record_lead_activity(
            NEW.id,
            'first_contact',
            'Primer contacto registrado'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_churn_signal(p_organization_id uuid, p_signal_type text, p_severity text, p_details jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE v_existing_id UUID; v_new_id UUID;
BEGIN
    SELECT id INTO v_existing_id FROM public.churn_signals_log
    WHERE organization_id = p_organization_id AND signal_type = p_signal_type AND resolved_at IS NULL;
    IF v_existing_id IS NOT NULL THEN RETURN v_existing_id; END IF;
    INSERT INTO public.churn_signals_log (organization_id, signal_type, severity, details)
    VALUES (p_organization_id, p_signal_type, p_severity, p_details) RETURNING id INTO v_new_id;
    RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_internal_order_status_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only log when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.internal_order_status_history (
      internal_order_id,
      status,
      notes,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.status,
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_lead_activity(p_lead_id uuid, p_activity_type text, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_created_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_activity_id UUID;
    v_old_score INT;
BEGIN
    -- Get old score
    SELECT lead_score INTO v_old_score FROM demo_requests WHERE id = p_lead_id;
    
    -- Insert activity
    INSERT INTO lead_activities (lead_id, activity_type, description, metadata, created_by)
    VALUES (p_lead_id, p_activity_type, p_description, p_metadata, p_created_by)
    RETURNING id INTO v_activity_id;
    
    -- Update score
    PERFORM update_lead_score_and_priority(p_lead_id);
    
    -- Log the score change
    INSERT INTO lead_scoring_logs (lead_id, activity_type, points_before, points_after, change_reason)
    SELECT 
        p_lead_id, 
        p_activity_type, 
        v_old_score, 
        lead_score, 
        p_description
    FROM demo_requests 
    WHERE id = p_lead_id;
    
    RETURN v_activity_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_optical_internal_ticket_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_optical_internal_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_lead_score_and_priority(p_lead_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_new_score INT;
    v_old_score INT;
    v_old_priority TEXT;
    v_priority TEXT;
    v_old_mql_at TIMESTAMPTZ;
    v_old_sql_at TIMESTAMPTZ;
BEGIN
    SELECT lead_score, priority_level, mql_at, sql_at 
    INTO v_old_score, v_old_priority, v_old_mql_at, v_old_sql_at
    FROM demo_requests WHERE id = p_lead_id;
    
    v_new_score := calculate_lead_score(p_lead_id);
    
    IF v_new_score > 80 THEN
        v_priority := 'hot';
    ELSIF v_new_score >= 40 THEN
        v_priority := 'warm';
    ELSIF v_new_score > 0 THEN
        v_priority := 'cold';
    ELSE
        v_priority := 'at_risk';
    END IF;
    
    UPDATE demo_requests 
    SET 
        lead_score = v_new_score,
        priority_level = v_priority,
        score_last_calculated_at = NOW(),
        last_activity_at = NOW(),
        mql_at = CASE 
            WHEN v_new_score > 30 AND v_old_mql_at IS NULL THEN NOW()
            ELSE mql_at
        END,
        sql_at = CASE 
            WHEN v_new_score > 60 AND v_old_sql_at IS NULL THEN NOW()
            ELSE sql_at
        END
    WHERE id = p_lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_optical_internal_ticket_timestamps() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update the parent ticket's last_response_at, first_response_at, and response_time_minutes
  UPDATE public.optical_internal_support_tickets t
  SET 
    last_response_at = NOW(),
    first_response_at = COALESCE(t.first_response_at, NOW()),
    response_time_minutes = CASE 
      WHEN t.first_response_at IS NULL THEN 
        ROUND(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 60)::INTEGER 
      ELSE t.response_time_minutes 
    END,
    updated_at = NOW()
  WHERE t.id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;

-- ========================================
-- Indexes (auto-generated from current schema)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_account_activities_created_at ON public.account_activities USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_activities_created_by ON public.account_activities USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_account_activities_org_id ON public.account_activities USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_account_activities_type ON public.account_activities USING btree (activity_type);
CREATE INDEX IF NOT EXISTS idx_account_documents_org_id ON public.account_documents USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_account_documents_type ON public.account_documents USING btree (document_type);
CREATE INDEX IF NOT EXISTS idx_account_documents_uploaded_by ON public.account_documents USING btree (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_agreement_customers_agreement_id ON public.agreement_customers USING btree (agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_customers_customer_id ON public.agreement_customers USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_agreement_customers_last_order ON public.agreement_customers USING btree (last_order_at DESC);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_agreement_id ON public.agreement_institutional_balances USING btree (agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_order_id ON public.agreement_institutional_balances USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_status ON public.agreement_institutional_balances USING btree (status);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoice_balances_balance_id ON public.agreement_institutional_invoice_balances USING btree (balance_id);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoice_balances_invoice_id ON public.agreement_institutional_invoice_balances USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_agreement_id ON public.agreement_institutional_invoices USING btree (agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_branch_id ON public.agreement_institutional_invoices USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_created_at ON public.agreement_institutional_invoices USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_emitted_by ON public.agreement_institutional_invoices USING btree (emitted_by);
CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_status ON public.agreement_institutional_invoices USING btree (status);
CREATE INDEX IF NOT EXISTS idx_agreement_purchase_orders_agreement_id ON public.agreement_purchase_orders USING btree (agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_purchase_orders_status ON public.agreement_purchase_orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_agreements_agreement_type ON public.agreements USING btree (agreement_type);
CREATE INDEX IF NOT EXISTS idx_agreements_branch_id ON public.agreements USING btree (branch_id) WHERE (branch_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_agreements_created_by ON public.agreements USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_agreements_institution_rut ON public.agreements USING btree (institution_rut);
CREATE INDEX IF NOT EXISTS idx_agreements_organization_id ON public.agreements USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON public.agreements USING btree (status);
CREATE INDEX IF NOT EXISTS idx_agreements_updated_by ON public.agreements USING btree (updated_by);
CREATE INDEX IF NOT EXISTS idx_agreements_valid_until ON public.agreements USING btree (valid_until) WHERE (valid_until IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_created ON public.cancellation_reasons USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_org ON public.cancellation_reasons USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_reason ON public.cancellation_reasons USING btree (reason_category);
CREATE INDEX IF NOT EXISTS idx_churn_signals_created ON public.churn_signals_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_churn_signals_org ON public.churn_signals_log USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_churn_signals_type ON public.churn_signals_log USING btree (signal_type);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_created ON public.customer_satisfaction_surveys USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_org ON public.customer_satisfaction_surveys USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_drivers_active ON public.drivers USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_org ON public.drivers USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_field_operations_branch ON public.field_operations USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_field_operations_created_by ON public.field_operations USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_field_operations_organization ON public.field_operations USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_field_operations_scheduled_date ON public.field_operations USING btree (scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_field_operations_status ON public.field_operations USING btree (status);
CREATE INDEX IF NOT EXISTS idx_internal_order_items_order ON public.internal_order_items USING btree (internal_order_id);
CREATE INDEX IF NOT EXISTS idx_internal_order_items_product ON public.internal_order_items USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_internal_order_status_history_created ON public.internal_order_status_history USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_order_status_history_order ON public.internal_order_status_history USING btree (internal_order_id);
CREATE INDEX IF NOT EXISTS idx_internal_orders_created_by ON public.internal_orders USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_internal_orders_destination ON public.internal_orders USING btree (destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_internal_orders_org ON public.internal_orders USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_internal_orders_origin ON public.internal_orders USING btree (origin_branch_id);
CREATE INDEX IF NOT EXISTS idx_internal_orders_priority ON public.internal_orders USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_internal_orders_scheduled_date ON public.internal_orders USING btree (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_internal_orders_status ON public.internal_orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch ON public.inventory_movements USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by ON public.inventory_movements USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements USING btree (movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transfer_items_product ON public.inventory_transfer_items USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfer_items_transfer ON public.inventory_transfer_items USING btree (transfer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_confirmed_by ON public.inventory_transfers USING btree (confirmed_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_created_by ON public.inventory_transfers USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_dest ON public.inventory_transfers USING btree (destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_org ON public.inventory_transfers USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_origin ON public.inventory_transfers USING btree (origin_branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_status ON public.inventory_transfers USING btree (status);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON public.lead_activities USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_by ON public.lead_activities USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities USING btree (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON public.lead_activities USING btree (activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_email_communications_from_email ON public.lead_email_communications USING btree (from_email);
CREATE INDEX IF NOT EXISTS idx_lead_email_communications_gmail_message_id ON public.lead_email_communications USING btree (gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_lead_email_communications_lead_id ON public.lead_email_communications USING btree (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_email_communications_sent_at ON public.lead_email_communications USING btree (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_email_communications_thread_id ON public.lead_email_communications USING btree (thread_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_logs_created_at ON public.lead_scoring_logs USING btree (calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_logs_lead_id ON public.lead_scoring_logs USING btree (lead_id);
CREATE INDEX IF NOT EXISTS idx_operativo_mobile_stock_field_operation ON public.operativo_mobile_stock USING btree (field_operation_id);
CREATE INDEX IF NOT EXISTS idx_operativo_mobile_stock_product ON public.operativo_mobile_stock USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_operativo_sync_queue_field_operation ON public.operativo_sync_queue USING btree (field_operation_id);
CREATE INDEX IF NOT EXISTS idx_operativo_sync_queue_status ON public.operativo_sync_queue USING btree (status);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON public.referrals USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_email ON public.referrals USING btree (referred_email);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_email ON public.referrals USING btree (referrer_email);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals USING btree (status);
CREATE INDEX IF NOT EXISTS idx_survey_invitations_expires ON public.survey_invitations USING btree (expires_at) WHERE (used_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_survey_invitations_org ON public.survey_invitations USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_survey_invitations_token ON public.survey_invitations USING btree (token);
CREATE INDEX IF NOT EXISTS idx_survey_invitations_work_order ON public.survey_invitations USING btree (work_order_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON public.vehicles USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_vehicles_org ON public.vehicles USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_active ON public.workflow_definitions USING btree (is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_trigger ON public.workflow_definitions USING btree (trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_org ON public.workflow_executions USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_scheduled_resume ON public.workflow_executions USING btree (scheduled_resume_at) WHERE ((status = 'waiting'::text) AND (scheduled_resume_at IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON public.workflow_executions USING btree (workflow_id);

COMMIT;
