-- Migration: 20260703000006_work_orders.sql
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

CREATE TABLE IF NOT EXISTS public.lab_work_order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_id uuid NOT NULL,
    from_status text,
    to_status text NOT NULL,
    changed_at timestamp with time zone DEFAULT now(),
    changed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS public.lab_work_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_number text NOT NULL,
    work_order_date date DEFAULT CURRENT_DATE NOT NULL,
    customer_id uuid NOT NULL,
    prescription_id uuid,
    quote_id uuid,
    frame_product_id uuid,
    frame_name text NOT NULL,
    frame_brand text,
    frame_model text,
    frame_color text,
    frame_size text,
    frame_sku text,
    frame_serial_number text,
    lens_type text NOT NULL,
    lens_material text NOT NULL,
    lens_index numeric(3,2),
    lens_treatments text[] DEFAULT '{}'::text[] NOT NULL,
    lens_tint_color text,
    lens_tint_percentage integer,
    prescription_snapshot jsonb,
    lab_name text,
    lab_contact text,
    lab_order_number text,
    lab_estimated_delivery_date date,
    status text DEFAULT 'quote'::text,
    ordered_at timestamp with time zone,
    sent_to_lab_at timestamp with time zone,
    lab_started_at timestamp with time zone,
    lab_completed_at timestamp with time zone,
    received_from_lab_at timestamp with time zone,
    mounted_at timestamp with time zone,
    quality_checked_at timestamp with time zone,
    ready_at timestamp with time zone,
    delivered_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    frame_cost numeric(10,2) DEFAULT 0,
    lens_cost numeric(10,2) DEFAULT 0,
    treatments_cost numeric(10,2) DEFAULT 0,
    labor_cost numeric(10,2) DEFAULT 0,
    lab_cost numeric(10,2) DEFAULT 0,
    subtotal numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'CLP'::text,
    payment_status text DEFAULT 'pending'::text,
    payment_method text,
    deposit_amount numeric(10,2) DEFAULT 0,
    balance_amount numeric(10,2) DEFAULT 0,
    pos_order_id uuid,
    internal_notes text,
    customer_notes text,
    lab_notes text,
    quality_notes text,
    cancellation_reason text,
    created_by uuid,
    assigned_to uuid,
    lab_contact_person text,
    warranty_start_date date,
    warranty_end_date date,
    warranty_details text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    lens_family_id uuid,
    customer_own_frame boolean DEFAULT false NOT NULL,
    presbyopia_solution text DEFAULT 'none'::text,
    far_lens_family_id uuid,
    near_lens_family_id uuid,
    far_lens_cost numeric(10,2),
    near_lens_cost numeric(10,2),
    organization_id uuid,
    contact_lens_family_id uuid,
    contact_lens_rx_sphere_od numeric(5,2),
    contact_lens_rx_cylinder_od numeric(5,2),
    contact_lens_rx_axis_od integer,
    contact_lens_rx_add_od numeric(5,2),
    contact_lens_rx_base_curve_od numeric(4,2),
    contact_lens_rx_diameter_od numeric(4,2),
    contact_lens_rx_sphere_os numeric(5,2),
    contact_lens_rx_cylinder_os numeric(5,2),
    contact_lens_rx_axis_os integer,
    contact_lens_rx_add_os numeric(5,2),
    contact_lens_rx_base_curve_os numeric(4,2),
    contact_lens_rx_diameter_os numeric(4,2),
    contact_lens_quantity integer DEFAULT 1,
    contact_lens_cost numeric(10,2),
    near_frame_product_id uuid,
    near_frame_name text,
    near_frame_brand text,
    near_frame_model text,
    near_frame_color text,
    near_frame_size text,
    near_frame_sku text,
    near_frame_price numeric(10,2) DEFAULT 0,
    near_frame_price_includes_tax boolean DEFAULT false,
    near_frame_cost numeric(10,2) DEFAULT 0,
    customer_own_near_frame boolean DEFAULT false,
    field_operation_id uuid,
    operativo_batch_id uuid,
    operativo_delivered_at timestamp with time zone,
    operativo_recipient_name text,
    agreement_id uuid,
    frame_mount_type text,
    service_type text,
    lens_bezel_type text,
    vertex_distance numeric(4,1),
    lens_sourcing_type text DEFAULT 'surfaced'::text,
    CONSTRAINT lab_work_orders_frame_mount_type_check CHECK ((frame_mount_type = ANY (ARRAY['full_rim'::text, 'semi_rim'::text, 'perforated'::text]))),
    CONSTRAINT lab_work_orders_lens_bezel_type_check CHECK ((lens_bezel_type = ANY (ARRAY['v_bezel'::text, 'flat_bezel'::text, 'groove'::text]))),
    CONSTRAINT lab_work_orders_lens_sourcing_type_check CHECK ((lens_sourcing_type = ANY (ARRAY['stock'::text, 'surfaced'::text]))),
    CONSTRAINT lab_work_orders_lens_tint_percentage_check CHECK (((lens_tint_percentage >= 0) AND (lens_tint_percentage <= 100))),
    CONSTRAINT lab_work_orders_lens_type_check CHECK ((lens_type = ANY (ARRAY['single_vision'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text, 'reading'::text, 'computer'::text, 'sports'::text]))),
    CONSTRAINT lab_work_orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'refunded'::text]))),
    CONSTRAINT lab_work_orders_presbyopia_solution_check CHECK ((presbyopia_solution = ANY (ARRAY['none'::text, 'two_separate'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text]))),
    CONSTRAINT lab_work_orders_service_type_check CHECK ((service_type = ANY (ARRAY['lenses_only'::text, 'calibrated_mounted'::text]))),
    CONSTRAINT lab_work_orders_status_check CHECK ((status = ANY (ARRAY['quote'::text, 'ordered'::text, 'on_hold_payment'::text, 'sent_to_lab'::text, 'in_progress_lab'::text, 'ready_at_lab'::text, 'received_from_lab'::text, 'mounted'::text, 'quality_check'::text, 'ready_for_pickup'::text, 'delivered'::text, 'cancelled'::text, 'returned'::text])))
);

CREATE TABLE IF NOT EXISTS public.quote_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    treatment_prices jsonb DEFAULT '{"tint": 15000, "anti_fog": 8000, "polarized": 25000, "photochromic": 35000, "uv_protection": 10000, "anti_reflective": 15000, "blue_light_filter": 20000, "scratch_resistant": 12000}'::jsonb,
    lens_type_base_costs jsonb DEFAULT '{"sports": 40000, "bifocal": 45000, "reading": 25000, "computer": 35000, "trifocal": 55000, "progressive": 60000, "single_vision": 30000}'::jsonb,
    lens_material_multipliers jsonb DEFAULT '{"cr39": 1.0, "glass": 0.9, "trivex": 1.3, "polycarbonate": 1.2, "high_index_1_67": 1.5, "high_index_1_74": 2.0}'::jsonb,
    default_labor_cost numeric(10,2) DEFAULT 15000,
    default_tax_percentage numeric(5,2) DEFAULT 19.0,
    default_expiration_days integer DEFAULT 30,
    default_margin_percentage numeric(5,2) DEFAULT 0,
    volume_discounts jsonb DEFAULT '[]'::jsonb,
    currency text DEFAULT 'CLP'::text,
    terms_and_conditions text,
    notes_template text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    branch_id uuid,
    labor_cost_includes_tax boolean DEFAULT true,
    lens_cost_includes_tax boolean DEFAULT true,
    treatments_cost_includes_tax boolean DEFAULT true,
    organization_id uuid,
    use_treatments_table boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    quote_number text NOT NULL,
    quote_date date DEFAULT CURRENT_DATE NOT NULL,
    expiration_date date,
    prescription_id uuid,
    frame_product_id uuid,
    frame_name text,
    frame_brand text,
    frame_model text,
    frame_color text,
    frame_size text,
    frame_sku text,
    frame_price numeric(10,2) DEFAULT 0,
    lens_type text,
    lens_material text,
    lens_index numeric(3,2),
    lens_treatments text[],
    lens_tint_color text,
    lens_tint_percentage integer,
    frame_cost numeric(10,2) DEFAULT 0,
    lens_cost numeric(10,2) DEFAULT 0,
    treatments_cost numeric(10,2) DEFAULT 0,
    labor_cost numeric(10,2) DEFAULT 0,
    subtotal numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    discount_percentage numeric(5,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'CLP'::text,
    status text DEFAULT 'draft'::text,
    notes text,
    customer_notes text,
    terms_and_conditions text,
    converted_to_work_order_id uuid,
    created_by uuid,
    sent_by uuid,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    original_status text,
    branch_id uuid,
    lens_family_id uuid,
    customer_own_frame boolean DEFAULT false NOT NULL,
    near_frame_product_id uuid,
    near_frame_name text,
    near_frame_brand text,
    near_frame_model text,
    near_frame_color text,
    near_frame_size text,
    near_frame_sku text,
    near_frame_price numeric(10,2) DEFAULT 0,
    near_frame_price_includes_tax boolean DEFAULT false,
    near_frame_cost numeric(10,2) DEFAULT 0,
    customer_own_near_frame boolean DEFAULT false,
    presbyopia_solution text DEFAULT 'none'::text,
    far_lens_family_id uuid,
    near_lens_family_id uuid,
    far_lens_cost numeric(10,2),
    near_lens_cost numeric(10,2),
    organization_id uuid,
    contact_lens_family_id uuid,
    contact_lens_rx_sphere_od numeric(5,2),
    contact_lens_rx_cylinder_od numeric(5,2),
    contact_lens_rx_axis_od integer,
    contact_lens_rx_add_od numeric(5,2),
    contact_lens_rx_base_curve_od numeric(4,2),
    contact_lens_rx_diameter_od numeric(4,2),
    contact_lens_rx_sphere_os numeric(5,2),
    contact_lens_rx_cylinder_os numeric(5,2),
    contact_lens_rx_axis_os integer,
    contact_lens_rx_add_os numeric(5,2),
    contact_lens_rx_base_curve_os numeric(4,2),
    contact_lens_rx_diameter_os numeric(4,2),
    contact_lens_quantity integer DEFAULT 1,
    contact_lens_cost numeric(10,2),
    contact_lens_price numeric(10,2),
    field_operation_id uuid,
    lens_sourcing_type text DEFAULT 'surfaced'::text,
    lens_product_id uuid,
    lens_supplier_id uuid,
    lens_cost_supplier numeric(10,2),
    far_lens_product_id uuid,
    near_lens_product_id uuid,
    CONSTRAINT quotes_lens_sourcing_type_check CHECK ((lens_sourcing_type = ANY (ARRAY['stock'::text, 'surfaced'::text]))),
    CONSTRAINT quotes_lens_tint_percentage_check CHECK (((lens_tint_percentage >= 0) AND (lens_tint_percentage <= 100))),
    CONSTRAINT quotes_lens_type_check CHECK (((lens_type IS NULL) OR (lens_type = ANY (ARRAY['single_vision'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text, 'reading'::text, 'computer'::text, 'sports'::text, 'occupational'::text, 'specialty'::text, 'Lentes de contacto'::text])))),
    CONSTRAINT quotes_presbyopia_solution_check CHECK ((presbyopia_solution = ANY (ARRAY['none'::text, 'two_separate'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text]))),
    CONSTRAINT quotes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'converted_to_work'::text])))
);

-- ========================================
-- Function
-- ========================================

CREATE OR REPLACE FUNCTION public.check_and_expire_quotes() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Call expire_quotes function
  PERFORM expire_quotes();
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_quotes() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update quotes that have passed their expiration date and are not already expired or converted
  UPDATE public.quotes
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    expiration_date IS NOT NULL
    AND expiration_date < CURRENT_DATE
    AND status NOT IN ('expired', 'converted_to_work', 'accepted')
    AND status != 'expired'; -- Double check to avoid unnecessary updates
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_work_order_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  year_part TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get last work order number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM '[0-9]+$') AS INTEGER)), 0)
  INTO last_number
  FROM public.lab_work_orders
  WHERE work_order_number LIKE 'TRB-' || year_part || '-%';
  
  -- Generate new number
  new_number := 'TRB-' || year_part || '-' || LPAD((last_number + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$_$;

CREATE OR REPLACE FUNCTION public.update_work_order_status(p_work_order_id uuid, p_new_status text, p_changed_by uuid, p_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM public.lab_work_orders
  WHERE id = p_work_order_id;
  
  -- Update work order
  UPDATE public.lab_work_orders
  SET 
    status = p_new_status,
    updated_at = NOW(),
    -- Update specific date fields based on status
    ordered_at = CASE WHEN p_new_status = 'ordered' THEN NOW() ELSE ordered_at END,
    sent_to_lab_at = CASE WHEN p_new_status = 'sent_to_lab' THEN NOW() ELSE sent_to_lab_at END,
    lab_started_at = CASE WHEN p_new_status = 'in_progress_lab' THEN NOW() ELSE lab_started_at END,
    lab_completed_at = CASE WHEN p_new_status = 'ready_at_lab' THEN NOW() ELSE lab_completed_at END,
    received_from_lab_at = CASE WHEN p_new_status = 'received_from_lab' THEN NOW() ELSE received_from_lab_at END,
    mounted_at = CASE WHEN p_new_status = 'mounted' THEN NOW() ELSE mounted_at END,
    quality_checked_at = CASE WHEN p_new_status = 'quality_check' THEN NOW() ELSE quality_checked_at END,
    ready_at = CASE WHEN p_new_status = 'ready_for_pickup' THEN NOW() ELSE ready_at END,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_work_order_id;
  
  -- Create history entry
  INSERT INTO public.lab_work_order_status_history (
    work_order_id,
    from_status,
    to_status,
    changed_by,
    notes
  ) VALUES (
    p_work_order_id,
    v_old_status,
    p_new_status,
    p_changed_by,
    p_notes
  );
END;
$$;

-- ========================================
-- Tables
-- ========================================

-- Table: lab_work_order_status_history

-- ========================================
-- Trigger
-- ========================================

CREATE TRIGGER sync_organization_id_on_status_history_insert BEFORE INSERT ON public.lab_work_order_status_history FOR EACH ROW EXECUTE FUNCTION public.sync_status_history_organization_id();

CREATE TRIGGER sync_organization_id_on_status_history_update BEFORE UPDATE OF work_order_id ON public.lab_work_order_status_history FOR EACH ROW WHEN ((new.work_order_id IS DISTINCT FROM old.work_order_id)) EXECUTE FUNCTION public.sync_status_history_organization_id();

CREATE TRIGGER sync_organization_id_from_parent_work_order AFTER UPDATE OF organization_id ON public.lab_work_orders FOR EACH ROW WHEN ((new.organization_id IS DISTINCT FROM old.organization_id)) EXECUTE FUNCTION public.sync_children_organization_id_from_parent();

CREATE TRIGGER update_lab_work_orders_updated_at BEFORE UPDATE ON public.lab_work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quote_settings_updated_at BEFORE UPDATE ON public.quote_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER check_quote_prescription_customer BEFORE INSERT OR UPDATE OF prescription_id, customer_id ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.check_quote_prescription_customer_match();

CREATE TRIGGER trigger_check_quote_expiration BEFORE INSERT OR UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.check_quote_expiration();

CREATE TRIGGER trigger_preserve_quote_original_status BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.preserve_quote_original_status();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Constraint
-- ========================================

ALTER TABLE public.lab_work_order_status_history
    ADD CONSTRAINT lab_work_order_status_history_pkey PRIMARY KEY (id);

ALTER TABLE public.lab_work_order_status_history
    ADD CONSTRAINT lab_work_order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);

ALTER TABLE public.lab_work_order_status_history
    ADD CONSTRAINT lab_work_order_status_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.lab_work_order_status_history
    ADD CONSTRAINT lab_work_order_status_history_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.lab_work_orders(id) ON DELETE CASCADE;

-- Table: lab_work_orders

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_pkey PRIMARY KEY (id);

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_work_order_number_key UNIQUE (work_order_number);

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE SET NULL;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id) ON DELETE SET NULL;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_far_lens_family_id_fkey FOREIGN KEY (far_lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_frame_product_id_fkey FOREIGN KEY (frame_product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_lens_family_id_fkey FOREIGN KEY (lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_near_frame_product_id_fkey FOREIGN KEY (near_frame_product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_near_lens_family_id_fkey FOREIGN KEY (near_lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_pos_order_id_fkey FOREIGN KEY (pos_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE SET NULL;

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;

-- Table: quote_settings

ALTER TABLE public.quote_settings
    ADD CONSTRAINT quote_settings_pkey PRIMARY KEY (id);

ALTER TABLE public.quote_settings
    ADD CONSTRAINT quote_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.quote_settings
    ADD CONSTRAINT quote_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.quote_settings
    ADD CONSTRAINT quote_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- Table: quotes

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_far_lens_family_id_fkey FOREIGN KEY (far_lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_far_lens_product_id_fkey FOREIGN KEY (far_lens_product_id) REFERENCES public.lens_products(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_frame_product_id_fkey FOREIGN KEY (frame_product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_lens_family_id_fkey FOREIGN KEY (lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_lens_product_id_fkey FOREIGN KEY (lens_product_id) REFERENCES public.lens_products(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_lens_supplier_id_fkey FOREIGN KEY (lens_supplier_id) REFERENCES public.lens_suppliers(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_near_frame_product_id_fkey FOREIGN KEY (near_frame_product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_near_lens_family_id_fkey FOREIGN KEY (near_lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_near_lens_product_id_fkey FOREIGN KEY (near_lens_product_id) REFERENCES public.lens_products(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE SET NULL;

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES auth.users(id);

-- ========================================
-- Indexes (auto-generated from current schema)
-- ========================================

-- ========================================
-- Policy
-- ========================================

CREATE POLICY "Users can view their organization status history" ON public.lab_work_order_status_history FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Admins can create work orders" ON public.lab_work_orders FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can delete work orders" ON public.lab_work_orders FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can manage work orders in their branches" ON public.lab_work_orders USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL)));

CREATE POLICY "Admins can update work orders" ON public.lab_work_orders FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can view work orders in their branches" ON public.lab_work_orders FOR SELECT USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid()))) OR (branch_id IS NULL)));

CREATE POLICY "Users can manage their organization lab work orders" ON public.lab_work_orders USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Users can view their organization lab work orders" ON public.lab_work_orders FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Admins can manage quote settings in their branches" ON public.quote_settings USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL)));

CREATE POLICY "Admins can manage quote_settings" ON public.quote_settings USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Users can view quote_settings" ON public.quote_settings FOR SELECT USING (((branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid()))) OR (organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Admins can create quotes" ON public.quotes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can delete quotes" ON public.quotes FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can update quotes" ON public.quotes FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Users can manage their organization quotes" ON public.quotes USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Users can view their organization quotes" ON public.quotes FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

-- ========================================
-- Rls Enable
-- ========================================

ALTER TABLE public.lab_work_order_status_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_work_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Index
-- ========================================

CREATE INDEX IF NOT EXISTS idx_lab_work_order_status_history_changed_by ON public.lab_work_order_status_history USING btree (changed_by);

CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON public.lab_work_order_status_history USING btree (changed_at);

CREATE INDEX IF NOT EXISTS idx_status_history_org ON public.lab_work_order_status_history USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_status_history_work_order_id ON public.lab_work_order_status_history USING btree (work_order_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_agreement_id ON public.lab_work_orders USING btree (agreement_id) WHERE (agreement_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_assigned_to ON public.lab_work_orders USING btree (assigned_to);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_branch ON public.lab_work_orders USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_contact_lens_family ON public.lab_work_orders USING btree (contact_lens_family_id) WHERE (contact_lens_family_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_created_at ON public.lab_work_orders USING btree (created_at);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_created_by ON public.lab_work_orders USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_customer_id ON public.lab_work_orders USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_far_lens_family_id ON public.lab_work_orders USING btree (far_lens_family_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_field_operation ON public.lab_work_orders USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_frame_mount_type ON public.lab_work_orders USING btree (frame_mount_type) WHERE (frame_mount_type IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_lens_family_id ON public.lab_work_orders USING btree (lens_family_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_near_frame_product_id ON public.lab_work_orders USING btree (near_frame_product_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_near_lens_family_id ON public.lab_work_orders USING btree (near_lens_family_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_org ON public.lab_work_orders USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_presbyopia_solution ON public.lab_work_orders USING btree (presbyopia_solution);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_prescription_id ON public.lab_work_orders USING btree (prescription_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_quote_id ON public.lab_work_orders USING btree (quote_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_service_type ON public.lab_work_orders USING btree (service_type) WHERE (service_type IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_status ON public.lab_work_orders USING btree (status);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_work_order_number ON public.lab_work_orders USING btree (work_order_number);

CREATE INDEX IF NOT EXISTS idx_quote_settings_branch ON public.quote_settings USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_quote_settings_branch_id ON public.quote_settings USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_quote_settings_updated_by ON public.quote_settings USING btree (updated_by);

CREATE INDEX IF NOT EXISTS idx_quotes_branch ON public.quotes USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_quotes_contact_lens_family ON public.quotes USING btree (contact_lens_family_id) WHERE (contact_lens_family_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes USING btree (created_at);

CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON public.quotes USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_quotes_far_lens_family_id ON public.quotes USING btree (far_lens_family_id);

CREATE INDEX IF NOT EXISTS idx_quotes_field_operation ON public.quotes USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_quotes_lens_family_id ON public.quotes USING btree (lens_family_id);

CREATE INDEX IF NOT EXISTS idx_quotes_near_frame_product_id ON public.quotes USING btree (near_frame_product_id);

CREATE INDEX IF NOT EXISTS idx_quotes_near_lens_family_id ON public.quotes USING btree (near_lens_family_id);

CREATE INDEX IF NOT EXISTS idx_quotes_org ON public.quotes USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_quotes_presbyopia_solution ON public.quotes USING btree (presbyopia_solution);

CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON public.quotes USING btree (quote_number);

CREATE INDEX IF NOT EXISTS idx_quotes_sent_by ON public.quotes USING btree (sent_by);

CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes USING btree (status);

-- ========================================
-- Comment
-- ========================================

-- ========================================
-- Functions
-- ========================================

COMMENT ON TABLE public.lab_work_order_status_history IS 'Historial de cambios de estado de trabajos';

COMMENT ON COLUMN public.lab_work_order_status_history.organization_id IS 'Organization that owns this status history record. Used for multi-tenant data isolation.';

COMMENT ON TABLE public.lab_work_orders IS 'Órdenes de trabajo para lentes (trabajos enviados al laboratorio)';

COMMENT ON COLUMN public.lab_work_orders.customer_id IS 'References customers table, not profiles. Customers are branch-specific.';

COMMENT ON COLUMN public.lab_work_orders.lens_family_id IS 'Referencia a la familia de lentes usada para calcular el precio (opcional)';

COMMENT ON COLUMN public.lab_work_orders.customer_own_frame IS 'Indica si el cliente trae su propio marco (solo recambio de cristales)';

COMMENT ON COLUMN public.lab_work_orders.presbyopia_solution IS 'Solución para presbicia: none, two_separate, bifocal, trifocal, progressive';

COMMENT ON COLUMN public.lab_work_orders.far_lens_family_id IS 'Familia de lentes para visión lejana (cuando presbyopia_solution = two_separate)';

COMMENT ON COLUMN public.lab_work_orders.near_lens_family_id IS 'Familia de lentes para visión cercana (cuando presbyopia_solution = two_separate)';

COMMENT ON COLUMN public.lab_work_orders.far_lens_cost IS 'Costo del lente de lejos (cuando presbyopia_solution = two_separate)';

COMMENT ON COLUMN public.lab_work_orders.near_lens_cost IS 'Costo del lente de cerca (cuando presbyopia_solution = two_separate)';

COMMENT ON COLUMN public.lab_work_orders.organization_id IS 'Organization that owns this work order. Used for multi-tenant data isolation.';

COMMENT ON COLUMN public.lab_work_orders.contact_lens_family_id IS 'Referencia a la familia de lentes de contacto para el trabajo';

COMMENT ON COLUMN public.lab_work_orders.contact_lens_quantity IS 'Cantidad de cajas de lentes de contacto';

COMMENT ON COLUMN public.lab_work_orders.near_frame_product_id IS 'Referencia al producto marco de cerca (presbyopia_solution = two_separate)';

COMMENT ON COLUMN public.lab_work_orders.near_frame_name IS 'Nombre del marco de cerca';

COMMENT ON COLUMN public.lab_work_orders.near_frame_brand IS 'Marca del marco de cerca';

COMMENT ON COLUMN public.lab_work_orders.near_frame_model IS 'Modelo del marco de cerca';

COMMENT ON COLUMN public.lab_work_orders.near_frame_color IS 'Color del marco de cerca';

COMMENT ON COLUMN public.lab_work_orders.near_frame_size IS 'Tamaño del marco de cerca';

COMMENT ON COLUMN public.lab_work_orders.near_frame_sku IS 'SKU del marco de cerca';

COMMENT ON COLUMN public.lab_work_orders.near_frame_price IS 'Precio de venta del marco de cerca';

COMMENT ON COLUMN public.lab_work_orders.near_frame_price_includes_tax IS 'Indica si el precio del marco de cerca incluye IVA';

COMMENT ON COLUMN public.lab_work_orders.near_frame_cost IS 'Costo interno del marco de cerca';

COMMENT ON COLUMN public.lab_work_orders.customer_own_near_frame IS 'Indica si el cliente trae su propio marco de cerca';

COMMENT ON COLUMN public.lab_work_orders.agreement_id IS 'Convenio de la venta asociada';

COMMENT ON COLUMN public.lab_work_orders.frame_mount_type IS 'Tipo de montura: full_rim (aro completo), semi_rim (ranurado), perforated (perforado)';

COMMENT ON COLUMN public.lab_work_orders.service_type IS 'Tipo de servicio: lenses_only (solo cristales), calibrated_mounted (calibrado y montaje)';

COMMENT ON COLUMN public.lab_work_orders.lens_bezel_type IS 'Tipo de bisel: v_bezel (en V), flat_bezel (plano), groove (ranura)';

COMMENT ON COLUMN public.lab_work_orders.vertex_distance IS 'Distancia vértice (VD) en mm - importante para progresivos';

COMMENT ON COLUMN public.lab_work_orders.lens_sourcing_type IS 'Tipo de sourcing del lente: stock (entrega inmediata) o surfaced (tallado a pedido)';

COMMENT ON TABLE public.quote_settings IS 'Configuración de precios y parámetros para el sistema de presupuestos';

COMMENT ON COLUMN public.quote_settings.treatment_prices IS 'Precios de tratamientos adicionales (solo coatings: anti_reflective, blue_light_filter, uv_protection, scratch_resistant, anti_fog, tint). Polarizado y Fotocromático ahora son familias de lentes.';

COMMENT ON COLUMN public.quote_settings.lens_type_base_costs IS 'Costos base de tipos de lentes (en CLP)';

COMMENT ON COLUMN public.quote_settings.lens_material_multipliers IS 'Multiplicadores de costo según material de lente';

COMMENT ON COLUMN public.quote_settings.default_labor_cost IS 'Costo de mano de obra por defecto para montaje';

COMMENT ON COLUMN public.quote_settings.default_tax_percentage IS 'Porcentaje de impuesto por defecto (IVA Chile)';

COMMENT ON COLUMN public.quote_settings.default_expiration_days IS 'Días de validez por defecto para presupuestos';

COMMENT ON COLUMN public.quote_settings.volume_discounts IS 'Descuentos por volumen: [{min_amount: 100000, discount_percentage: 5}]';

COMMENT ON COLUMN public.quote_settings.branch_id IS 'Sucursal a la que pertenece esta configuración. NULL para configuración global (por defecto).';

COMMENT ON COLUMN public.quote_settings.labor_cost_includes_tax IS 'Indica si el costo de mano de obra ya incluye IVA. TRUE por defecto (IVA incluido).';

COMMENT ON COLUMN public.quote_settings.lens_cost_includes_tax IS 'Indica si el costo de lentes ya incluye IVA. TRUE por defecto (IVA incluido).';

COMMENT ON COLUMN public.quote_settings.treatments_cost_includes_tax IS 'Indica si el costo de tratamientos ya incluye IVA. TRUE por defecto (IVA incluido).';

COMMENT ON TABLE public.quotes IS 'Presupuestos para trabajos de lentes';

COMMENT ON COLUMN public.quotes.customer_id IS 'References customers table, not profiles. Customers are branch-specific.';

COMMENT ON COLUMN public.quotes.lens_type IS 'Tipo de lente: óptico (single_vision, progressive, occupational, etc.) o Lentes de contacto';

COMMENT ON COLUMN public.quotes.original_status IS 'Preserves the original status before conversion to work order';

COMMENT ON COLUMN public.quotes.lens_family_id IS 'Referencia a la familia de lentes usada para calcular el precio (opcional)';

COMMENT ON COLUMN public.quotes.customer_own_frame IS 'Indica si el cliente trae su propio marco (solo recambio de cristales)';

COMMENT ON COLUMN public.quotes.near_frame_product_id IS 'Referencia al producto marco de cerca (cuando presbyopia_solution = two_separate)';

COMMENT ON COLUMN public.quotes.near_frame_name IS 'Nombre del marco de cerca';

COMMENT ON COLUMN public.quotes.near_frame_brand IS 'Marca del marco de cerca';

COMMENT ON COLUMN public.quotes.near_frame_model IS 'Modelo del marco de cerca';

COMMENT ON COLUMN public.quotes.near_frame_color IS 'Color del marco de cerca';

COMMENT ON COLUMN public.quotes.near_frame_size IS 'Tamaño del marco de cerca';

COMMENT ON COLUMN public.quotes.near_frame_sku IS 'SKU del marco de cerca';

COMMENT ON COLUMN public.quotes.near_frame_price IS 'Precio de venta del marco de cerca';

COMMENT ON COLUMN public.quotes.near_frame_price_includes_tax IS 'Indica si el precio del marco de cerca incluye IVA';

COMMENT ON COLUMN public.quotes.near_frame_cost IS 'Costo interno del marco de cerca';

COMMENT ON COLUMN public.quotes.customer_own_near_frame IS 'Indica si el cliente trae su propio marco de cerca (solo recambio de cristales)';

COMMENT ON COLUMN public.quotes.presbyopia_solution IS 'Solución para presbicia: none, two_separate, bifocal, trifocal, progressive';

COMMENT ON COLUMN public.quotes.far_lens_family_id IS 'Familia de lentes para visión lejana (cuando presbyopia_solution = two_separate)';

COMMENT ON COLUMN public.quotes.near_lens_family_id IS 'Familia de lentes para visión cercana (cuando presbyopia_solution = two_separate)';

COMMENT ON COLUMN public.quotes.far_lens_cost IS 'Costo del lente de lejos (cuando presbyopia_solution = two_separate)';

COMMENT ON COLUMN public.quotes.near_lens_cost IS 'Costo del lente de cerca (cuando presbyopia_solution = two_separate)';

COMMENT ON COLUMN public.quotes.organization_id IS 'Organization that owns this quote. Used for multi-tenant data isolation.';

COMMENT ON COLUMN public.quotes.contact_lens_family_id IS 'Referencia a la familia de lentes de contacto seleccionada';

COMMENT ON COLUMN public.quotes.contact_lens_quantity IS 'Cantidad de cajas de lentes de contacto';

COMMENT ON COLUMN public.quotes.contact_lens_cost IS 'Costo total de lentes de contacto';

COMMENT ON COLUMN public.quotes.contact_lens_price IS 'Precio total de lentes de contacto (precio por caja * cantidad)';

COMMIT;
