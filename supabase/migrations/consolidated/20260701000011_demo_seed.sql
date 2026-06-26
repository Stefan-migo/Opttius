-- Migration: 20260703000011_demo_seed.sql
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

CREATE TABLE IF NOT EXISTS public.demo_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    full_name text,
    optica_name text,
    phone text,
    source text DEFAULT 'landing'::text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    organization_id uuid,
    metadata jsonb,
    funnel_stage text DEFAULT 'pending'::text,
    demo_started_at timestamp with time zone,
    demo_expires_at timestamp with time zone,
    meeting_url text,
    meeting_scheduled_at timestamp with time zone,
    meeting_completed_at timestamp with time zone,
    offer_sent_at timestamp with time zone,
    offer_type text,
    offer_details jsonb,
    conversion_date timestamp with time zone,
    lost_reason text,
    notes text,
    last_contact_at timestamp with time zone,
    last_email_sent text,
    last_email_sent_at timestamp with time zone,
    login_count integer DEFAULT 0,
    last_login_at timestamp with time zone,
    lead_score integer DEFAULT 0,
    priority_level text DEFAULT 'cold'::text,
    score_last_calculated_at timestamp with time zone,
    assigned_to uuid,
    next_followup_at timestamp with time zone,
    first_contact_at timestamp with time zone,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    company_size text,
    location_city text,
    location_region text,
    estimated_monthly_revenue text,
    has_existing_system boolean DEFAULT false,
    existing_system_type text,
    estimated_monthly_patients text,
    business_focus text,
    contact_role text,
    mql_at timestamp with time zone,
    sql_at timestamp with time zone,
    last_activity_at timestamp with time zone,
    CONSTRAINT demo_requests_funnel_stage_check CHECK ((funnel_stage = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'demo_expiring'::text, 'demo_expired'::text, 'meeting_scheduled'::text, 'post_meeting'::text, 'negotiation'::text, 'migration'::text, 'converted'::text, 'lost'::text]))),
    CONSTRAINT demo_requests_priority_level_check CHECK ((priority_level = ANY (ARRAY['hot'::text, 'warm'::text, 'cold'::text, 'at_risk'::text]))),
    CONSTRAINT demo_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

-- ========================================
-- Comments
-- ========================================

COMMENT ON TABLE public.demo_requests IS 'Solicitudes de demo organicas. Root aprueba desde /admin/saas-management/new-users-flow.';
COMMENT ON COLUMN public.demo_requests.funnel_stage IS 'Sales funnel stage: pending, approved, demo_expiring, demo_expired, meeting_scheduled, post_meeting, negotiation, migration, converted, rejected, lost';
COMMENT ON COLUMN public.demo_requests.demo_started_at IS 'When demo was approved and started';
COMMENT ON COLUMN public.demo_requests.demo_expires_at IS 'When demo expires (7 days from approval)';
COMMENT ON COLUMN public.demo_requests.meeting_url IS 'URL for virtual meeting (Google Meet, Zoom, etc.)';
COMMENT ON COLUMN public.demo_requests.last_email_sent IS 'Last automated email type sent: demo_expiring, demo_expired, post_meeting_followup';
COMMENT ON COLUMN public.demo_requests.lead_score IS 'Puntuacion automatica del lead basada en actividades';
COMMENT ON COLUMN public.demo_requests.priority_level IS 'Nivel de prioridad: hot, warm, cold, at_risk';
COMMENT ON COLUMN public.demo_requests.score_last_calculated_at IS 'Ultima vez que se calculo el score';
COMMENT ON COLUMN public.demo_requests.assigned_to IS 'Usuario asignado a este lead';
COMMENT ON COLUMN public.demo_requests.next_followup_at IS 'Fecha del proximo follow-up requerido';

-- ========================================
-- Row Level Security
-- ========================================

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Triggers
-- ========================================

CREATE TRIGGER trigger_demo_request_activity AFTER UPDATE ON public.demo_requests FOR EACH ROW EXECUTE FUNCTION public.handle_demo_request_activity();

-- ========================================
-- Constraints (PK, UNIQUE, FK)
-- ========================================

ALTER TABLE public.demo_requests
    ADD CONSTRAINT demo_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.demo_requests
    ADD CONSTRAINT demo_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id);

ALTER TABLE public.demo_requests
    ADD CONSTRAINT demo_requests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.demo_requests
    ADD CONSTRAINT demo_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ========================================
-- Policies
-- ========================================

CREATE POLICY demo_requests_no_public_access ON public.demo_requests USING (false) WITH CHECK (false);

-- ========================================
-- Functions
-- ========================================

CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(p_email text) RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_demo_organizations()
RETURNS TABLE(deleted_org_id UUID, deleted_org_slug TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_branch_ids UUID[];
  v_org_id UUID;
  v_slug TEXT;
  global_demo_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  PERFORM set_config('statement_timeout', '300000', true);

  FOR v_org IN
    SELECT id, slug
    FROM public.organizations
    WHERE (metadata->>'is_demo')::boolean = true
      AND id != global_demo_id
      AND metadata->>'expires_at' IS NOT NULL
      AND (metadata->>'expires_at')::timestamptz < NOW()
  LOOP
    v_org_id := v_org.id;
    v_slug := v_org.slug;

    SELECT ARRAY_AGG(id) INTO v_branch_ids
    FROM public.branches
    WHERE organization_id = v_org_id;

    DELETE FROM public.optical_internal_support_messages
    WHERE ticket_id IN (SELECT id FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id);
    DELETE FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id;

    DELETE FROM public.credit_note_movements
    WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));

    DELETE FROM public.order_payments
    WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.pos_transactions
    WHERE pos_session_id IN (SELECT id FROM public.pos_sessions WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.order_items
    WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.quotes WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.lab_work_orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.prescriptions
    WHERE customer_id IN (SELECT id FROM public.customers WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.appointments WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.product_branch_stock WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.products WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.lens_price_matrices
    WHERE lens_family_id IN (SELECT id FROM public.lens_families WHERE organization_id = v_org_id);
    DELETE FROM public.lens_families WHERE organization_id = v_org_id;
    DELETE FROM public.contact_lens_price_matrices WHERE organization_id = v_org_id;
    DELETE FROM public.contact_lens_families WHERE organization_id = v_org_id;
    DELETE FROM public.schedule_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.quote_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.pos_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.cash_register_closures WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.pos_sessions WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.organization_settings WHERE organization_id = v_org_id;
    DELETE FROM public.admin_notifications WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.ai_insights WHERE organization_id = v_org_id;
    DELETE FROM public.customers WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.admin_branch_access WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.subscriptions WHERE organization_id = v_org_id;
    UPDATE public.admin_users SET organization_id = NULL WHERE organization_id = v_org_id;
    DELETE FROM public.branches WHERE organization_id = v_org_id;
    DELETE FROM public.organizations WHERE id = v_org_id;

    deleted_org_id := v_org_id;
    deleted_org_slug := v_slug;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_demo_organization_for_user(
  p_user_id UUID,
  p_demo_type TEXT DEFAULT 'known_optica'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_branch_1_id UUID;
  v_branch_2_id UUID;
  v_slug TEXT;
  v_marcos_cat_id UUID;
  v_lentes_sol_cat_id UUID;
  v_accesorios_cat_id UUID;
  v_servicios_cat_id UUID;
  v_lf1_id UUID;
  v_lf2_id UUID;
  v_lf3_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);

  v_org_id := gen_random_uuid();
  v_branch_1_id := gen_random_uuid();
  v_branch_2_id := gen_random_uuid();
  v_slug := 'demo-' || encode(gen_random_bytes(4), 'hex');
  v_expires_at := NOW() + INTERVAL '7 days';

  SELECT id INTO v_marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO v_lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO v_accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO v_servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;

  IF v_marcos_cat_id IS NULL OR v_lentes_sol_cat_id IS NULL OR v_accesorios_cat_id IS NULL OR v_servicios_cat_id IS NULL THEN
    RAISE EXCEPTION 'Categories not found. Run system migrations first.';
  END IF;

  INSERT INTO public.organizations (id, name, slug, subscription_tier, status, metadata, created_at)
  VALUES (
    v_org_id,
    'Optica Demo',
    v_slug,
    'premium',
    'active',
    jsonb_build_object(
      'is_demo', true,
      'demo_type', p_demo_type,
      'owner_user_id', p_user_id,
      'expires_at', v_expires_at
    ),
    NOW()
  );

  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES
    (v_branch_1_id, 'Casa Matriz', 'DEMO-001', v_org_id, 'Av. Providencia 1234', 'Santiago', 'Region Metropolitana', '7500000', 'Chile', '+56 2 2345 6789', 'demo@optica.cl', true, NOW()),
    (v_branch_2_id, 'Sucursal Providencia', 'DEMO-002', v_org_id, 'Av. Apoquindo 4567', 'Las Condes', 'Region Metropolitana', '7550000', 'Chile', '+56 2 2345 6790', 'providencia@optica.cl', true, NOW());

  v_lf1_id := gen_random_uuid();
  v_lf2_id := gen_random_uuid();
  v_lf3_id := gen_random_uuid();
  INSERT INTO public.lens_families (id, name, brand, lens_type, lens_material, description, is_active, organization_id, created_at)
  VALUES
    (v_lf1_id, 'Monofocal Basico CR-39 AR', 'Generico', 'single_vision', 'cr39', 'Lente monofocal estandar con antirreflejo.', true, v_org_id, NOW()),
    (v_lf2_id, 'Monofocal Policarbonato Blue Cut', 'Essilor', 'single_vision', 'polycarbonate', 'Monofocal resistente con filtro de luz azul.', true, v_org_id, NOW()),
    (v_lf3_id, 'Progresivo Comfort Policarbonato', 'Essilor', 'progressive', 'polycarbonate', 'Progresivo Varilux Comfort.', true, v_org_id, NOW());

  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
  VALUES
    (v_lf1_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 29990, 9990, 'stock', true),
    (v_lf2_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 59990, 24990, 'stock', true),
    (v_lf3_id, -4.00, 4.00, -2.00, 2.00, 0.75, 1.75, 189990, 79990, 'surfaced', true);

  INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, is_featured, price_includes_tax, featured_image, created_at)
  VALUES
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Ray-Ban RB2140', 'marco-ray-ban-rb2140', 'Marco clasico aviador Ray-Ban.', 89900, 45000, v_marcos_cat_id, 'RB-2140-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Oakley OO9208', 'marco-oakley-oo9208', 'Marco deportivo Oakley.', 129900, 65000, v_marcos_cat_id, 'OO-9208-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Gafas de Sol Ray-Ban Aviator', 'gafas-de-sol-ray-ban', 'Gafas de sol Ray-Ban Aviator.', 119900, 60000, v_lentes_sol_cat_id, 'RB-AVI-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Estuche Rigido Premium', 'estuche-rigido', 'Estuche rigido para lentes.', 12900, 5000, v_accesorios_cat_id, 'ACC-EST-RIG', 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Montaje de Lentes', 'montaje-lentes', 'Servicio de montaje de lentes.', 29900, 0, v_servicios_cat_id, 'SERV-MON-LEN', 'active', true, true, NULL, NOW());

  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, v_branch_1_id, 20, 5, NOW()
  FROM public.products p WHERE p.organization_id = v_org_id;
  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, v_branch_2_id, 15, 5, NOW()
  FROM public.products p WHERE p.organization_id = v_org_id;

  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, is_active, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Maria', 'Gonzalez', 'maria.gonzalez@demo.cl', '+56 9 1234 5678', '12.345.678-9', '1985-03-15', 'female', 'Av. Las Condes 456', 'Las Condes', 'Region Metropolitana', '7550000', 'Chile', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Juan', 'Perez', 'juan.perez@demo.cl', '+56 9 2345 6789', '13.456.789-0', '1990-07-22', 'male', 'Calle Los Rosales 789', 'Providencia', 'Region Metropolitana', '7500000', 'Chile', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Elena', 'Vega', 'elena.vega@demo.cl', '+56 9 1111 1111', '11.111.111-1', '1982-04-20', 'female', 'Av. Apoquindo 100', 'Las Condes', 'Region Metropolitana', '7550000', 'Chile', true, NOW(), NOW());

  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-DEMO-' || encode(gen_random_bytes(4), 'hex') || '-' || substr(c.id::text, 1, 8), 'Dr. Demo', 'OPTO-00000', -1.5, -0.5, 90, NULL, 32.0, -1.5, -0.5, 90, NULL, 32.0, 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.organization_id = v_org_id;

  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES
    (v_branch_1_id, v_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"09:00","end_time":"13:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW()),
    (v_branch_2_id, v_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"10:00","end_time":"14:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW());

  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  VALUES (v_branch_1_id, v_org_id, NOW(), NOW()), (v_branch_2_id, v_org_id, NOW(), NOW());

  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (v_branch_1_id, 50.00, NOW(), NOW()), (v_branch_2_id, 50.00, NOW(), NOW());

  INSERT INTO public.admin_users (id, email, role, organization_id, is_active)
  SELECT p_user_id, u.email, 'super_admin', v_org_id, true
  FROM auth.users u WHERE u.id = p_user_id
  ON CONFLICT (id) DO UPDATE SET organization_id = v_org_id, role = 'super_admin', is_active = true;

  DELETE FROM public.admin_branch_access WHERE admin_user_id = p_user_id;
  INSERT INTO public.admin_branch_access (admin_user_id, branch_id, role, is_primary)
  VALUES
    (p_user_id, v_branch_1_id, 'manager', true),
    (p_user_id, v_branch_2_id, 'manager', false);

  RETURN v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_demo_request_and_org(
  p_request_id UUID
)
RETURNS TABLE(deleted_request_id UUID, deleted_org_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_branch_ids UUID[];
  v_request_id UUID;
  global_demo_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);

  SELECT organization_id INTO v_org_id
  FROM public.demo_requests
  WHERE id = p_request_id;

  IF v_org_id IS NOT NULL AND v_org_id != global_demo_id THEN
    SELECT ARRAY_AGG(id) INTO v_branch_ids
    FROM public.branches
    WHERE organization_id = v_org_id;

    DELETE FROM public.optical_internal_support_messages
    WHERE ticket_id IN (SELECT id FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id);
    DELETE FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id;

    DELETE FROM public.credit_note_movements
    WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));

    DELETE FROM public.order_payments
    WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.pos_transactions
    WHERE pos_session_id IN (SELECT id FROM public.pos_sessions WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.order_items
    WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.quotes WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.lab_work_orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.prescriptions
    WHERE customer_id IN (SELECT id FROM public.customers WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.appointments WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.product_branch_stock WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.products WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.lens_price_matrices
    WHERE lens_family_id IN (SELECT id FROM public.lens_families WHERE organization_id = v_org_id);
    DELETE FROM public.lens_families WHERE organization_id = v_org_id;
    DELETE FROM public.contact_lens_price_matrices WHERE organization_id = v_org_id;
    DELETE FROM public.contact_lens_families WHERE organization_id = v_org_id;
    DELETE FROM public.schedule_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.quote_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.pos_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.cash_register_closures WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.pos_sessions WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.organization_settings WHERE organization_id = v_org_id;
    DELETE FROM public.admin_notifications WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.ai_insights WHERE organization_id = v_org_id;
    DELETE FROM public.customers WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.admin_branch_access WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.subscriptions WHERE organization_id = v_org_id;
    UPDATE public.admin_users SET organization_id = NULL WHERE organization_id = v_org_id;
    DELETE FROM public.branches WHERE organization_id = v_org_id;
    DELETE FROM public.organizations WHERE id = v_org_id;
  END IF;

  DELETE FROM public.demo_requests WHERE id = p_request_id;
  v_request_id := p_request_id;

  deleted_request_id := v_request_id;
  deleted_org_id := v_org_id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_demo_organization()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_branch_2_id UUID := '00000000-0000-0000-0000-000000000003'::uuid;
BEGIN
  DELETE FROM public.optical_internal_support_messages
  WHERE ticket_id IN (SELECT id FROM public.optical_internal_support_tickets WHERE organization_id = demo_org_id);
  DELETE FROM public.optical_internal_support_tickets WHERE organization_id = demo_org_id;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_notes') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_note_movements') THEN
      DELETE FROM public.credit_note_movements
      WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id IN (demo_branch_id, demo_branch_2_id));
    END IF;
    DELETE FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id IN (demo_branch_id, demo_branch_2_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internal_orders') THEN
    DELETE FROM public.internal_order_status_history
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = demo_org_id);
    DELETE FROM public.internal_order_items
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = demo_org_id);
    DELETE FROM public.internal_orders WHERE organization_id = demo_org_id;
  END IF;

  DELETE FROM public.order_payments
  WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id));
  DELETE FROM public.pos_transactions
  WHERE pos_session_id IN (SELECT id FROM public.pos_sessions WHERE branch_id IN (demo_branch_id, demo_branch_2_id));
  DELETE FROM public.order_items
  WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id));
  DELETE FROM public.orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.quotes WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.lab_work_orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.prescriptions
  WHERE customer_id IN (SELECT id FROM public.customers WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id);
  DELETE FROM public.appointments WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id;
  DELETE FROM public.product_branch_stock WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.products WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id;
  DELETE FROM public.lens_price_matrices
  WHERE lens_family_id IN (SELECT id FROM public.lens_families WHERE organization_id = demo_org_id);
  DELETE FROM public.lens_families
  WHERE organization_id = demo_org_id OR id::text LIKE '40000000-%';
  DELETE FROM public.contact_lens_price_matrices WHERE organization_id = demo_org_id;
  DELETE FROM public.contact_lens_families WHERE organization_id = demo_org_id;
  DELETE FROM public.schedule_settings WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.quote_settings WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.pos_settings WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.cash_register_closures WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.pos_sessions WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.organization_settings WHERE organization_id = demo_org_id;
  DELETE FROM public.customers WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id;
  DELETE FROM public.branches WHERE id IN (demo_branch_id, demo_branch_2_id);

  PERFORM public.seed_demo_mirada_clara();
END;
$$;

-- ========================================
-- Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON public.demo_requests USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_demo_expires_at ON public.demo_requests USING btree (demo_expires_at) WHERE (demo_expires_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON public.demo_requests USING btree (email);
CREATE INDEX IF NOT EXISTS idx_demo_requests_funnel_stage ON public.demo_requests USING btree (funnel_stage);
CREATE INDEX IF NOT EXISTS idx_demo_requests_reviewed_by ON public.demo_requests USING btree (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON public.demo_requests USING btree (status);

COMMIT;
