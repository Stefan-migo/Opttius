-- Migration: 20260703000005_pos_payments.sql
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

CREATE TABLE IF NOT EXISTS public.cash_register_closures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    closure_date date DEFAULT CURRENT_DATE NOT NULL,
    closed_by uuid NOT NULL,
    opening_cash_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_sales numeric(12,2) DEFAULT 0 NOT NULL,
    total_transactions integer DEFAULT 0 NOT NULL,
    cash_sales numeric(12,2) DEFAULT 0 NOT NULL,
    debit_card_sales numeric(12,2) DEFAULT 0 NOT NULL,
    credit_card_sales numeric(12,2) DEFAULT 0 NOT NULL,
    installments_sales numeric(12,2) DEFAULT 0 NOT NULL,
    other_payment_sales numeric(12,2) DEFAULT 0 NOT NULL,
    expected_cash numeric(12,2) DEFAULT 0 NOT NULL,
    actual_cash numeric(12,2),
    cash_difference numeric(12,2) DEFAULT 0,
    card_machine_debit_total numeric(12,2) DEFAULT 0,
    card_machine_credit_total numeric(12,2) DEFAULT 0,
    card_machine_difference numeric(12,2) DEFAULT 0,
    total_subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    total_tax numeric(12,2) DEFAULT 0 NOT NULL,
    total_discounts numeric(12,2) DEFAULT 0 NOT NULL,
    closing_cash_amount numeric(12,2),
    notes text,
    discrepancies text,
    status text DEFAULT 'draft'::text,
    opened_at timestamp with time zone NOT NULL,
    closed_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pos_session_id uuid,
    field_operation_id uuid,
    CONSTRAINT cash_register_closures_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'reviewed'::text, 'closed'::text])))
);

CREATE TABLE IF NOT EXISTS public.credit_note_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    credit_note_id uuid NOT NULL,
    pos_session_id uuid,
    amount numeric(12,2) NOT NULL,
    refund_method text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.credit_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    credit_note_number text NOT NULL,
    order_id uuid,
    branch_id uuid,
    organization_id uuid,
    amount numeric(12,2) NOT NULL,
    reason text,
    refund_method text NOT NULL,
    pos_session_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT credit_notes_refund_method_check CHECK ((refund_method = ANY (ARRAY['cash'::text, 'debit'::text, 'credit'::text, 'transfer'::text])))
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    variant_id uuid,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    product_name text NOT NULL,
    variant_title text,
    sku text,
    weight numeric(8,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);

CREATE TABLE IF NOT EXISTS public.order_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    payment_reference text,
    paid_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    pos_session_id uuid,
    CONSTRAINT order_payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT order_payments_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'debit'::text, 'credit'::text, 'transfer'::text, 'check'::text])))
);

CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number text NOT NULL,
    user_id uuid,
    email text NOT NULL,
    status text DEFAULT 'pending'::text,
    payment_status text DEFAULT 'pending'::text,
    fulfillment_status text DEFAULT 'unfulfilled'::text,
    subtotal numeric(12,2) NOT NULL,
    tax_amount numeric(12,2) DEFAULT 0,
    shipping_amount numeric(12,2) DEFAULT 0,
    discount_amount numeric(12,2) DEFAULT 0,
    total_amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'ARS'::text NOT NULL,
    mp_payment_id text,
    mp_preference_id text,
    mp_payment_method text,
    mp_payment_type text,
    mp_status text,
    mp_status_detail text,
    customer_notes text,
    shipping_first_name text,
    shipping_last_name text,
    shipping_company text,
    shipping_address_1 text,
    shipping_address_2 text,
    shipping_city text,
    shipping_state text,
    shipping_postal_code text,
    shipping_country text DEFAULT 'Argentina'::text,
    shipping_phone text,
    billing_first_name text,
    billing_last_name text,
    billing_company text,
    billing_address_1 text,
    billing_address_2 text,
    billing_city text,
    billing_state text,
    billing_postal_code text,
    billing_country text DEFAULT 'Argentina'::text,
    billing_phone text,
    tracking_number text,
    carrier text,
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_pos_sale boolean DEFAULT false,
    pos_terminal_id text,
    pos_cashier_id uuid,
    pos_location text,
    payment_method_type text,
    card_machine_transaction_id text,
    card_machine_authorization_code text,
    card_machine_brand text,
    card_last_four_digits text,
    installments_count integer DEFAULT 1,
    installment_amount numeric(12,2),
    first_installment_due_date timestamp with time zone,
    sii_invoice_type text,
    sii_rut text,
    sii_business_name text,
    sii_address text,
    sii_commune text,
    sii_city text,
    sii_invoice_number text,
    sii_dte_number text,
    sii_track_id text,
    sii_status text DEFAULT 'pending'::text,
    sii_sent_at timestamp with time zone,
    sii_response jsonb,
    tax_breakdown jsonb,
    pos_session_id uuid,
    mercadopago_preference_id character varying(255),
    mercadopago_payment_id bigint,
    payment_method character varying(100),
    installments integer DEFAULT 1,
    branch_id uuid,

CREATE TABLE IF NOT EXISTS public.payment_gateways_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gateway_id text NOT NULL,
    name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    icon_name text,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    installment_number integer NOT NULL,
    due_date timestamp with time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    paid_amount numeric(12,2) DEFAULT 0,
    payment_status text DEFAULT 'pending'::text,
    paid_at timestamp with time zone,
    payment_method text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_installments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payment_installments_installment_number_check CHECK ((installment_number > 0)),
    CONSTRAINT payment_installments_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])))
);

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    organization_id uuid NOT NULL,
    user_id uuid,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'CLP'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    gateway text NOT NULL,
    gateway_transaction_id text,
    gateway_payment_intent_id text,
    gateway_charge_id text,
    payment_method text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    mp_preference_id text,
    mp_payment_id text,
    mp_merchant_order_id text,
    mp_payment_type text,
    mp_payment_method text,
    CONSTRAINT payments_gateway_check CHECK ((gateway = ANY (ARRAY['flow'::text, 'mercadopago'::text, 'paypal'::text, 'nowpayments'::text]))),
    CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'refunded'::text])))
);

CREATE TABLE IF NOT EXISTS public.pos_sale_idempotency (
    idempotency_key uuid NOT NULL,
    order_id uuid NOT NULL,
    work_order_id uuid,
    response_snapshot jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pos_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cashier_id uuid NOT NULL,
    terminal_id text,
    location text,
    opening_cash_amount numeric(12,2) DEFAULT 0,
    closing_cash_amount numeric(12,2),
    opening_time timestamp with time zone DEFAULT now() NOT NULL,
    closing_time timestamp with time zone,
    status text DEFAULT 'open'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reopened_at timestamp with time zone,
    reopened_by uuid,
    reopen_count integer DEFAULT 0,
    branch_id uuid,
    field_operation_id uuid,
    CONSTRAINT pos_sessions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'suspended'::text])))
);

CREATE TABLE IF NOT EXISTS public.pos_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    min_deposit_percent numeric(5,2) DEFAULT 50.00,
    min_deposit_amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    organization_id uuid,
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
    auto_print_receipt boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    pos_session_id uuid,
    transaction_type text NOT NULL,
    payment_method text NOT NULL,
    amount numeric(12,2) NOT NULL,
    change_amount numeric(12,2) DEFAULT 0,
    card_machine_transaction_id text,
    card_machine_authorization_code text,
    receipt_printed boolean DEFAULT false,
    receipt_number text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pos_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['sale'::text, 'refund'::text, 'void'::text, 'return'::text])))
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gateway text NOT NULL,
    gateway_event_id text NOT NULL,
    payment_id uuid,
    event_type text NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    processed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhook_events_gateway_check CHECK ((gateway = ANY (ARRAY['flow'::text, 'mercadopago'::text, 'paypal'::text, 'nowpayments'::text])))
);

-- ========================================
-- Function
-- ========================================

CREATE OR REPLACE FUNCTION public.calculate_iva(amount numeric, include_iva boolean DEFAULT true) RETURNS numeric
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF include_iva THEN
    -- If amount includes IVA, calculate the base amount
    RETURN ROUND(amount / 1.19, 2);
  ELSE
    -- If amount doesn't include IVA, calculate IVA amount
    RETURN ROUND(amount * 0.19, 2);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_order_balance(p_order_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total DECIMAL(10,2);
  v_paid DECIMAL(10,2);
BEGIN
  -- Get order total
  SELECT total_amount INTO v_total 
  FROM public.orders 
  WHERE id = p_order_id;
  
  -- If order not found, return 0
  IF v_total IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_paid 
  FROM public.order_payments 
  WHERE order_id = p_order_id;
  
  -- Return balance (total - paid, minimum 0)
  RETURN GREATEST(0, v_total - v_paid);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_credit_note_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  year_part TEXT;
  sequence_number INTEGER;
  cn_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(c.credit_note_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM public.credit_notes c
  WHERE c.credit_note_number LIKE 'NC-' || year_part || '%';
  cn_number := 'NC-' || year_part || LPAD(sequence_number::TEXT, 6, '0');
  RETURN cn_number;
END;
$_$;

CREATE OR REPLACE FUNCTION public.get_min_deposit(p_order_total numeric, p_branch_id uuid DEFAULT NULL::uuid) RETURNS numeric
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_percent DECIMAL(5,2);
  v_min_amount DECIMAL(10,2);
  v_calculated DECIMAL(10,2);
BEGIN
  -- Get settings from pos_settings (if branch_id is NULL, use first/default settings)
  SELECT 
    COALESCE(min_deposit_percent, 50.00),
    COALESCE(min_deposit_amount, 0)
  INTO v_percent, v_min_amount
  FROM public.pos_settings
  WHERE (p_branch_id IS NULL OR branch_id = p_branch_id)
  LIMIT 1;
  
  -- If no settings found, use defaults
  IF v_percent IS NULL THEN
    v_percent := 50.00;
    v_min_amount := 0;
  END IF;
  
  -- Calcular depósito por porcentaje
  v_calculated := p_order_total * (v_percent / 100);
  
  -- Retornar el mayor entre porcentaje y monto fijo
  RETURN GREATEST(v_calculated, v_min_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_pos_sale(p_payload text, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_payload JSONB;
  v_order_id UUID;
  v_order_number TEXT;
  v_work_order_id UUID;
  v_work_order_number TEXT;
  v_order JSONB;
  v_item JSONB;
  v_payment JSONB;
  v_stock JSONB;
  v_work_order JSONB;
  v_pos_tx JSONB;
  v_branch_id UUID;
  v_pos_session_id UUID;
  v_wo_num TEXT;
  v_product_id UUID;
BEGIN
  v_payload := p_payload::jsonb;

END;
$$;

CREATE OR REPLACE FUNCTION public.update_pos_session_cash(session_id uuid, cash_amount numeric) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.pos_sessions
  SET closing_cash_amount = COALESCE(closing_cash_amount, opening_cash_amount) + cash_amount,
      updated_at = NOW()
  WHERE id = session_id;
  
  RETURN TRUE;
END;
$$;

-- ========================================
-- Tables
-- ========================================

-- Table: cash_register_closures

-- ========================================
-- Trigger
-- ========================================

CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_orders_agreement_customers AFTER INSERT ON public.orders FOR EACH ROW WHEN (((new.agreement_id IS NOT NULL) AND (new.customer_id IS NOT NULL))) EXECUTE FUNCTION public.sync_agreement_customers_on_order();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_gateways_config_updated_at BEFORE UPDATE ON public.payment_gateways_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_installments_updated_at BEFORE UPDATE ON public.payment_installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_sessions_updated_at BEFORE UPDATE ON public.pos_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_settings_updated_at BEFORE UPDATE ON public.pos_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pos_transactions_updated_at BEFORE UPDATE ON public.pos_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Constraint
-- ========================================

ALTER TABLE public.cash_register_closures
    ADD CONSTRAINT cash_register_closures_pkey PRIMARY KEY (id);

ALTER TABLE public.cash_register_closures
    ADD CONSTRAINT cash_register_closures_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.cash_register_closures
    ADD CONSTRAINT cash_register_closures_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.cash_register_closures
    ADD CONSTRAINT cash_register_closures_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;

ALTER TABLE public.cash_register_closures
    ADD CONSTRAINT cash_register_closures_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;

-- Table: credit_note_movements

ALTER TABLE public.credit_note_movements
    ADD CONSTRAINT credit_note_movements_pkey PRIMARY KEY (id);

ALTER TABLE public.credit_note_movements
    ADD CONSTRAINT credit_note_movements_credit_note_id_fkey FOREIGN KEY (credit_note_id) REFERENCES public.credit_notes(id) ON DELETE CASCADE;

ALTER TABLE public.credit_note_movements
    ADD CONSTRAINT credit_note_movements_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;

-- Table: credit_notes

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_credit_note_number_key UNIQUE (credit_note_number);

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;

-- Table: order_items

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;

-- Table: order_payments

ALTER TABLE public.order_payments
    ADD CONSTRAINT order_payments_pkey PRIMARY KEY (id);

ALTER TABLE public.order_payments
    ADD CONSTRAINT order_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.order_payments
    ADD CONSTRAINT order_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_payments
    ADD CONSTRAINT order_payments_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;

-- Table: orders

ALTER TABLE public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);

ALTER TABLE public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE public.orders
    ADD CONSTRAINT orders_sii_invoice_number_key UNIQUE (sii_invoice_number);

ALTER TABLE public.orders
    ADD CONSTRAINT orders_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE SET NULL;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_pos_cashier_id_fkey FOREIGN KEY (pos_cashier_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.agreement_purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Table: payment_gateways_config

ALTER TABLE public.payment_gateways_config
    ADD CONSTRAINT payment_gateways_config_gateway_id_key UNIQUE (gateway_id);

ALTER TABLE public.payment_gateways_config
    ADD CONSTRAINT payment_gateways_config_pkey PRIMARY KEY (id);

-- Table: payment_installments

ALTER TABLE public.payment_installments
    ADD CONSTRAINT payment_installments_pkey PRIMARY KEY (id);

ALTER TABLE public.payment_installments
    ADD CONSTRAINT unique_order_installment UNIQUE (order_id, installment_number);

ALTER TABLE public.payment_installments
    ADD CONSTRAINT payment_installments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- Table: payments

ALTER TABLE public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Table: pos_sale_idempotency

ALTER TABLE public.pos_sale_idempotency
    ADD CONSTRAINT pos_sale_idempotency_pkey PRIMARY KEY (idempotency_key);

ALTER TABLE public.pos_sale_idempotency
    ADD CONSTRAINT pos_sale_idempotency_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.pos_sale_idempotency
    ADD CONSTRAINT pos_sale_idempotency_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.lab_work_orders(id) ON DELETE SET NULL;

-- Table: pos_sessions

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_pkey PRIMARY KEY (id);

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_reopened_by_fkey FOREIGN KEY (reopened_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Table: pos_settings

ALTER TABLE public.pos_settings
    ADD CONSTRAINT pos_settings_branch_id_key UNIQUE (branch_id);

ALTER TABLE public.pos_settings
    ADD CONSTRAINT pos_settings_pkey PRIMARY KEY (id);

ALTER TABLE public.pos_settings
    ADD CONSTRAINT pos_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.pos_settings
    ADD CONSTRAINT pos_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: pos_transactions

ALTER TABLE public.pos_transactions
    ADD CONSTRAINT pos_transactions_pkey PRIMARY KEY (id);

ALTER TABLE public.pos_transactions
    ADD CONSTRAINT pos_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.pos_transactions
    ADD CONSTRAINT pos_transactions_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;

-- Table: webhook_events

ALTER TABLE public.webhook_events
    ADD CONSTRAINT webhook_events_gateway_gateway_event_id_key UNIQUE (gateway, gateway_event_id);

ALTER TABLE public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);

ALTER TABLE public.webhook_events
    ADD CONSTRAINT webhook_events_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;

-- ========================================
-- Indexes (auto-generated from current schema)
-- ========================================

-- ========================================
-- Policy
-- ========================================

CREATE POLICY "Admins can insert cash register closures in their branches" ON public.cash_register_closures FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = cash_register_closures.branch_id)))) OR (closed_by = auth.uid())));

CREATE POLICY "Admins can update cash register closures in their branches" ON public.cash_register_closures FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = cash_register_closures.branch_id)))) OR ((closed_by = auth.uid()) AND (status = 'draft'::text))));

CREATE POLICY "Admins can view cash register closures in their branches" ON public.cash_register_closures FOR SELECT USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = cash_register_closures.branch_id))))));

CREATE POLICY "Admins can manage credit_note_movements" ON public.credit_note_movements USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can manage credit_notes" ON public.credit_notes USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can delete order items" ON public.order_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can insert order items" ON public.order_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));

CREATE POLICY "Admins can delete order_payments in their branches" ON public.order_payments FOR DELETE USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_payments.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));

CREATE POLICY "Admins can insert order_payments in their branches" ON public.order_payments FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_payments.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));

CREATE POLICY "Admins can update order_payments in their branches" ON public.order_payments FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_payments.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));

CREATE POLICY "Admins can view order_payments in their branches" ON public.order_payments FOR SELECT USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_payments.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));

CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can insert orders" ON public.orders FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can insert orders in their branches" ON public.orders FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = orders.branch_id)))))));

CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can update orders in their branches" ON public.orders FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = orders.branch_id)))))));

CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can manage their organization orders" ON public.orders USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their organization orders" ON public.orders FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Elevated roles can manage payment_gateways_config" ON public.payment_gateways_config USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['super_admin'::text, 'root'::text, 'dev'::text])) AND (admin_users.is_active = true)))));

CREATE POLICY "Public read payment_gateways_config" ON public.payment_gateways_config FOR SELECT USING (true);

CREATE POLICY "Admins can manage installments" ON public.payment_installments USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Users can manage their organization payments" ON public.payments USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id())));

CREATE POLICY "Users can view their organization payments" ON public.payments FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id())));

CREATE POLICY "Admins can insert pos_sale_idempotency in their branches" ON public.pos_sale_idempotency FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = pos_sale_idempotency.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));

CREATE POLICY "Admins can view pos_sale_idempotency in their branches" ON public.pos_sale_idempotency FOR SELECT USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = pos_sale_idempotency.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));

CREATE POLICY "Admins can insert pos_sessions in their branches" ON public.pos_sessions FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = pos_sessions.branch_id))))) OR (cashier_id = auth.uid())));

CREATE POLICY "Admins can manage POS sessions" ON public.pos_sessions USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can update pos_sessions in their branches" ON public.pos_sessions FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = pos_sessions.branch_id))))) OR (cashier_id = auth.uid())));

CREATE POLICY "Admins can view pos_sessions in their branches" ON public.pos_sessions FOR SELECT USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = pos_sessions.branch_id))))) OR (cashier_id = auth.uid())));

CREATE POLICY "Admins can manage pos settings in their branches" ON public.pos_settings USING ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = pos_settings.branch_id)))));

CREATE POLICY "Admins can manage pos_settings" ON public.pos_settings USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Admins can view pos settings in their branches" ON public.pos_settings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = pos_settings.branch_id)))));

CREATE POLICY "Super admins can manage all pos settings" ON public.pos_settings USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all pos settings" ON public.pos_settings FOR SELECT USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view pos_settings" ON public.pos_settings FOR SELECT USING (((branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid()))) OR (organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Admins can manage POS transactions" ON public.pos_transactions USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Super admins can view webhook events" ON public.webhook_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));

-- ========================================
-- Rls Enable
-- ========================================

ALTER TABLE public.cash_register_closures ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.credit_note_movements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_gateways_config ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pos_sale_idempotency ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Index
-- ========================================

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_branch_id ON public.cash_register_closures USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_closed_by ON public.cash_register_closures USING btree (closed_by);

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_date ON public.cash_register_closures USING btree (closure_date DESC);

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_field_operation_id ON public.cash_register_closures USING btree (field_operation_id);

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_pos_session_id ON public.cash_register_closures USING btree (pos_session_id);

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_status ON public.cash_register_closures USING btree (status);

CREATE INDEX IF NOT EXISTS idx_credit_note_movements_credit_note_id ON public.credit_note_movements USING btree (credit_note_id);

CREATE INDEX IF NOT EXISTS idx_credit_note_movements_pos_session_id ON public.credit_note_movements USING btree (pos_session_id);

CREATE INDEX IF NOT EXISTS idx_credit_notes_branch_id ON public.credit_notes USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_credit_notes_created_by ON public.credit_notes USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_credit_notes_order_id ON public.credit_notes USING btree (order_id);

CREATE INDEX IF NOT EXISTS idx_credit_notes_organization_id ON public.credit_notes USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items USING btree (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items USING btree (product_id);

CREATE INDEX IF NOT EXISTS idx_order_payments_created_by ON public.order_payments USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_order_payments_date ON public.order_payments USING btree (paid_at);

CREATE INDEX IF NOT EXISTS idx_order_payments_method ON public.order_payments USING btree (payment_method);

CREATE INDEX IF NOT EXISTS idx_order_payments_order ON public.order_payments USING btree (order_id);

CREATE INDEX IF NOT EXISTS idx_order_payments_pos_session_id ON public.order_payments USING btree (pos_session_id);

CREATE INDEX IF NOT EXISTS idx_order_payments_session_date ON public.order_payments USING btree (pos_session_id, paid_at) WHERE (pos_session_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_orders_agreement_id ON public.orders USING btree (agreement_id) WHERE (agreement_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_orders_branch ON public.orders USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_orders_branch_folio ON public.orders USING btree (branch_id, internal_folio);

CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_document_type ON public.orders USING btree (document_type);

CREATE INDEX IF NOT EXISTS idx_orders_field_operation ON public.orders USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_orders_internal_folio ON public.orders USING btree (internal_folio);

CREATE INDEX IF NOT EXISTS idx_orders_is_pos_sale ON public.orders USING btree (is_pos_sale);

CREATE INDEX IF NOT EXISTS idx_orders_mp_payment ON public.orders USING btree (mp_payment_id);

CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders USING btree (order_number);

CREATE INDEX IF NOT EXISTS idx_orders_org ON public.orders USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_orders_payment_method_type ON public.orders USING btree (payment_method_type);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders USING btree (payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_pos_cashier ON public.orders USING btree (pos_cashier_id);

CREATE INDEX IF NOT EXISTS idx_orders_pos_session_id ON public.orders USING btree (pos_session_id) WHERE (pos_session_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_orders_sii_folio ON public.orders USING btree (sii_folio);

CREATE INDEX IF NOT EXISTS idx_orders_sii_invoice_number ON public.orders USING btree (sii_invoice_number);

CREATE INDEX IF NOT EXISTS idx_orders_sii_status ON public.orders USING btree (sii_status);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders USING btree (status);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_payment_installments_due_date ON public.payment_installments USING btree (due_date);

CREATE INDEX IF NOT EXISTS idx_payment_installments_order ON public.payment_installments USING btree (order_id);

CREATE INDEX IF NOT EXISTS idx_payment_installments_status ON public.payment_installments USING btree (payment_status);

CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_intent_id ON public.payments USING btree (gateway_payment_intent_id) WHERE (gateway_payment_intent_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_payments_gateway_transaction_id ON public.payments USING btree (gateway_transaction_id) WHERE (gateway_transaction_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON public.payments USING btree (mp_payment_id);

CREATE INDEX IF NOT EXISTS idx_payments_mp_preference_id ON public.payments USING btree (mp_preference_id);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments USING btree (order_id) WHERE (order_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON public.payments USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments USING btree (status);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments USING btree (user_id) WHERE (user_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_pos_sale_idempotency_created_at ON public.pos_sale_idempotency USING btree (created_at);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_branch_id ON public.pos_sessions USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_cashier ON public.pos_sessions USING btree (cashier_id);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_field_operation_id ON public.pos_sessions USING btree (field_operation_id);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_opening_time ON public.pos_sessions USING btree (opening_time DESC);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_reopened_by ON public.pos_sessions USING btree (reopened_by);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON public.pos_sessions USING btree (status);

CREATE INDEX IF NOT EXISTS idx_pos_settings_branch_id ON public.pos_settings USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_created ON public.pos_transactions USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_order ON public.pos_transactions USING btree (order_id);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_session ON public.pos_transactions USING btree (pos_session_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway_event_id ON public.webhook_events USING btree (gateway, gateway_event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_id ON public.webhook_events USING btree (payment_id) WHERE (payment_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events USING btree (processed) WHERE (processed = false);

-- ========================================
-- Comment
-- ========================================

-- ========================================
-- Functions
-- ========================================

COMMENT ON TABLE public.cash_register_closures IS 'Cierres de caja diarios por sucursal. Permite cuadrar ventas con efectivo y tarjetas.';

COMMENT ON COLUMN public.cash_register_closures.expected_cash IS 'Efectivo esperado: monto inicial + ventas en efectivo';

COMMENT ON COLUMN public.cash_register_closures.actual_cash IS 'Efectivo físico contado al cerrar la caja';

COMMENT ON COLUMN public.cash_register_closures.cash_difference IS 'Diferencia entre efectivo esperado y real (actual - expected)';

COMMENT ON COLUMN public.cash_register_closures.pos_session_id IS 'References the POS session that was closed in this cash register closure';

COMMENT ON COLUMN public.cash_register_closures.field_operation_id IS 'When set, this closure is for an operativo. NULL = branch closure.';

COMMENT ON TABLE public.credit_note_movements IS 'Credit note movements linked to POS sessions for caja reconciliation';

COMMENT ON TABLE public.credit_notes IS 'Credit notes for order cancellations and refunds - integrates with Caja';

COMMENT ON TABLE public.order_payments IS 'Registro de pagos reales realizados sobre órdenes';

COMMENT ON COLUMN public.order_payments.amount IS 'Monto del pago (debe ser positivo)';

COMMENT ON COLUMN public.order_payments.payment_method IS 'Método de pago: cash (efectivo), debit (débito), credit (crédito), transfer (transferencia), check (cheque)';

COMMENT ON COLUMN public.order_payments.payment_reference IS 'Referencia del pago (número de transacción, cheque, etc.)';

COMMENT ON COLUMN public.order_payments.pos_session_id IS 'Sesión de caja (POS) en la que se realizó este pago. NULL para pagos realizados fuera de sesión.';

COMMENT ON COLUMN public.orders.currency IS 'Currency used for the transaction (e.g., ARS).';

COMMENT ON COLUMN public.orders.is_pos_sale IS 'Indicates if this order was created through POS';

COMMENT ON COLUMN public.orders.sii_invoice_type IS 'SII invoice type: boleta (B2C) or factura (B2B)';

COMMENT ON COLUMN public.orders.sii_rut IS 'Customer RUT (Chilean tax ID)';

COMMENT ON COLUMN public.orders.sii_dte_number IS 'DTE (Documento Tributario Electrónico) number from SII';

COMMENT ON COLUMN public.orders.sii_status IS 'Estado del documento en el SII: pending, accepted, rejected';

COMMENT ON COLUMN public.orders.pos_session_id IS 'References the POS session (cash register session) when this order was created';

COMMENT ON COLUMN public.orders.mercadopago_preference_id IS 'Mercado Pago preference ID generated at the start of the checkout process.';

COMMENT ON COLUMN public.orders.mercadopago_payment_id IS 'Mercado Pago payment ID received after a successful payment.';

COMMENT ON COLUMN public.orders.payment_method IS 'The payment method chosen by the customer (e.g., credit_card, rapipago).';

COMMENT ON COLUMN public.orders.installments IS 'Number of installments for credit card payments.';

COMMENT ON COLUMN public.orders.branch_id IS 'Sucursal donde se realizó la orden';

COMMENT ON COLUMN public.orders.document_type IS 'Tipo de documento: internal_ticket (Shadow Billing), boleta_electronica, factura_electronica';

COMMENT ON COLUMN public.orders.internal_folio IS 'Folio interno secuencial por sucursal (ej: TKT-000001)';

COMMENT ON COLUMN public.orders.sii_folio IS 'Folio fiscal del SII (solo para documentos fiscales)';

COMMENT ON COLUMN public.orders.pdf_url IS 'URL del PDF del documento generado';

COMMENT ON COLUMN public.orders.cancellation_reason IS 'Reason for cancelling the order, documented by admin';

COMMENT ON COLUMN public.orders.customer_name IS 'Nombre completo del cliente para identificación rápida en ventas POS. Puede ser de cliente registrado o no registrado.';

COMMENT ON COLUMN public.orders.organization_id IS 'Organization that owns this order. Used for multi-tenant data isolation.';

COMMENT ON COLUMN public.orders.agreement_id IS 'Convenio aplicado a la venta';

COMMENT ON COLUMN public.orders.copago_amount IS 'Monto pagado por el trabajador en POS';

COMMENT ON COLUMN public.orders.institutional_amount IS 'Monto a cargo de la institución';

COMMENT ON TABLE public.payment_installments IS 'Tracks installment payments for orders';

COMMENT ON TABLE public.payments IS 'Payment records from gateways (Flow, Mercado Pago, PayPal, NOWPayments) - multi-tenant';

COMMENT ON COLUMN public.payments.gateway_transaction_id IS 'Unique transaction ID from the gateway';

COMMENT ON COLUMN public.payments.gateway_payment_intent_id IS 'Flow order ID, Mercado Pago preference ID, PayPal order ID, or equivalent';

COMMENT ON COLUMN public.payments.gateway_charge_id IS 'Gateway charge ID when applicable (Flow, Mercado Pago, PayPal, NOWPayments)';

COMMENT ON COLUMN public.payments.mp_preference_id IS 'ID de la preferencia de MercadoPago';

COMMENT ON COLUMN public.payments.mp_payment_id IS 'ID del pago en MercadoPago';

COMMENT ON COLUMN public.payments.mp_merchant_order_id IS 'ID de la orden comercial en MercadoPago';

COMMENT ON COLUMN public.payments.mp_payment_type IS 'Tipo de pago (credit_card, debit_card, ticket, bank_transfer, etc.)';

COMMENT ON COLUMN public.payments.mp_payment_method IS 'Método de pago específico (visa, mastercard, redlink, etc.)';

COMMENT ON TABLE public.pos_sale_idempotency IS 'Stores successful POS sale results by idempotency key to prevent duplicates on retry';

COMMENT ON TABLE public.pos_sessions IS 'Tracks POS cash register sessions';

COMMENT ON COLUMN public.pos_sessions.reopened_at IS 'Timestamp when the POS session was reopened';

COMMENT ON COLUMN public.pos_sessions.reopened_by IS 'User ID who reopened the session';

COMMENT ON COLUMN public.pos_sessions.reopen_count IS 'Number of times this session has been reopened';

COMMENT ON COLUMN public.pos_sessions.branch_id IS 'Sucursal donde se realiza la sesión de caja.';

COMMENT ON COLUMN public.pos_sessions.field_operation_id IS 'When set, this session is for an operativo (field operation). NULL = branch session.';

COMMENT ON TABLE public.pos_settings IS 'Configuración del POS por sucursal, incluyendo depósito mínimo personalizable';

COMMENT ON COLUMN public.pos_settings.min_deposit_percent IS 'Porcentaje mínimo de depósito requerido (ej: 50.00 = 50%)';

COMMENT ON COLUMN public.pos_settings.min_deposit_amount IS 'Monto mínimo fijo de depósito (opcional, se usa el mayor entre porcentaje y monto fijo)';

COMMENT ON COLUMN public.pos_settings.auto_print_receipt IS 'Indica si se debe imprimir el comprobante automáticamente después de cada venta';

COMMENT ON TABLE public.pos_transactions IS 'Detailed transaction log for POS operations';

COMMENT ON TABLE public.webhook_events IS 'Webhook events from payment gateways for idempotency';

-- ========================================
-- Other
-- ========================================

document_type text,
    internal_folio text,
    sii_folio text,
    pdf_url text,
    cancellation_reason text,
    customer_name text,
    organization_id uuid,
    customer_id uuid,
    agreement_id uuid,
    purchase_order_id uuid,
    copago_amount numeric(12,2),
    institutional_amount numeric(12,2),
    field_operation_id uuid,
    CONSTRAINT orders_document_type_check CHECK ((document_type = ANY (ARRAY['internal_ticket'::text, 'boleta_electronica'::text, 'factura_electronica'::text, 'internal_ticket_cancelled'::text]))),
    CONSTRAINT orders_fulfillment_status_check CHECK ((fulfillment_status = ANY (ARRAY['unfulfilled'::text, 'partial'::text, 'fulfilled'::text]))),
    CONSTRAINT orders_payment_method_type_check CHECK ((payment_method_type = ANY (ARRAY['cash'::text, 'debit_card'::text, 'credit_card'::text, 'installments'::text, 'transfer'::text, 'check'::text, 'mercadopago'::text, 'other'::text, 'deposit'::text, 'card'::text]))),
    CONSTRAINT orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text, 'partially_refunded'::text, 'partial'::text, 'on_hold_payment'::text]))),
    CONSTRAINT orders_sii_invoice_type_check CHECK ((sii_invoice_type = ANY (ARRAY['boleta'::text, 'factura'::text, 'none'::text]))),
    CONSTRAINT orders_sii_status_check CHECK ((sii_status = ANY (ARRAY['pending'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text])))
);

COMMIT;
