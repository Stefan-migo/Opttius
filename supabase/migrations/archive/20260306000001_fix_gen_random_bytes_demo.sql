-- Migration: 20260306000001_fix_gen_random_bytes_demo.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix gen_random_bytes - use md5+random (no pgcrypto dependency)
-- gen_random_bytes requires pgcrypto; use built-in alternatives for local Supabase compatibility

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

  -- Ensure default categories exist (idempotent, for fresh DBs or missing seeds)
  INSERT INTO public.categories (name, slug, description, is_active, sort_order)
  VALUES
    ('Marcos', 'marcos', 'Armazones y marcos para lentes', true, 1),
    ('Lentes de sol', 'lentes-de-sol', 'Lentes de sol y gafas de sol', true, 2),
    ('Accesorios', 'accesorios', 'Accesorios para lentes y cuidado', true, 3),
    ('Servicios', 'servicios', 'Servicios de óptica y reparación', true, 4)
  ON CONFLICT (slug) DO NOTHING;

  v_org_id := gen_random_uuid();
  v_branch_1_id := gen_random_uuid();
  v_branch_2_id := gen_random_uuid();
  -- Use md5+random instead of gen_random_bytes (no pgcrypto needed)
  v_slug := 'demo-' || substr(md5(random()::text || gen_random_uuid()::text), 1, 8);
  v_expires_at := NOW() + INTERVAL '7 days';

  -- Categories (global)
  SELECT id INTO v_marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO v_lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO v_accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO v_servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;

  IF v_marcos_cat_id IS NULL OR v_lentes_sol_cat_id IS NULL OR v_accesorios_cat_id IS NULL OR v_servicios_cat_id IS NULL THEN
    RAISE EXCEPTION 'Categories not found. Run system migrations first.';
  END IF;

  -- Organization
  INSERT INTO public.organizations (id, name, slug, subscription_tier, status, metadata, created_at)
  VALUES (
    v_org_id,
    'Óptica Demo',
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

  -- Branches (code must be globally unique, append org slug)
  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES
    (v_branch_1_id, 'Casa Matriz', 'DEMO-001-' || v_slug, v_org_id, 'Av. Providencia 1234', 'Santiago', 'Región Metropolitana', '7500000', 'Chile', '+56 2 2345 6789', 'demo@optica.cl', true, NOW()),
    (v_branch_2_id, 'Sucursal Providencia', 'DEMO-002-' || v_slug, v_org_id, 'Av. Apoquindo 4567', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', '+56 2 2345 6790', 'providencia@optica.cl', true, NOW());

  -- Lens families
  v_lf1_id := gen_random_uuid();
  v_lf2_id := gen_random_uuid();
  v_lf3_id := gen_random_uuid();
  INSERT INTO public.lens_families (id, name, brand, lens_type, lens_material, description, is_active, organization_id, created_at)
  VALUES
    (v_lf1_id, 'Monofocal Básico CR-39 AR', 'Genérico', 'single_vision', 'cr39', 'Lente monofocal estándar con antirreflejo.', true, v_org_id, NOW()),
    (v_lf2_id, 'Monofocal Policarbonato Blue Cut', 'Essilor', 'single_vision', 'polycarbonate', 'Monofocal resistente con filtro de luz azul.', true, v_org_id, NOW()),
    (v_lf3_id, 'Progresivo Comfort Policarbonato', 'Essilor', 'progressive', 'polycarbonate', 'Progresivo Varilux Comfort.', true, v_org_id, NOW());

  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
  VALUES
    (v_lf1_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 29990, 9990, 'stock', true),
    (v_lf2_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 59990, 24990, 'stock', true),
    (v_lf3_id, -4.00, 4.00, -2.00, 2.00, 0.75, 1.75, 189990, 79990, 'surfaced', true);

  -- Products (reduced set) - slug must be globally unique, append org slug
  INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, is_featured, price_includes_tax, featured_image, created_at)
  VALUES
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Ray-Ban RB2140', 'marco-ray-ban-rb2140-' || v_slug, 'Marco clásico aviador Ray-Ban.', 89900, 45000, v_marcos_cat_id, 'RB-2140-BLK-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Oakley OO9208', 'marco-oakley-oo9208-' || v_slug, 'Marco deportivo Oakley.', 129900, 65000, v_marcos_cat_id, 'OO-9208-BLK-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Gafas de Sol Ray-Ban Aviator', 'gafas-sol-ray-ban-' || v_slug, 'Gafas de sol Ray-Ban Aviator.', 119900, 60000, v_lentes_sol_cat_id, 'RB-AVI-SUN-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Estuche Rígido Premium', 'estuche-rigido-' || v_slug, 'Estuche rígido para lentes.', 12900, 5000, v_accesorios_cat_id, 'ACC-EST-RIG-' || v_slug, 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Montaje de Lentes', 'montaje-lentes-' || v_slug, 'Servicio de montaje de lentes.', 29900, 0, v_servicios_cat_id, 'SERV-MON-LEN-' || v_slug, 'active', true, true, NULL, NOW());

  -- Product branch stock
  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, v_branch_1_id, 20, 5, NOW()
  FROM public.products p WHERE p.organization_id = v_org_id;
  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, v_branch_2_id, 15, 5, NOW()
  FROM public.products p WHERE p.organization_id = v_org_id;

  -- Customers (5 per branch)
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'María', 'González', 'maria.gonzalez@demo.cl', '+56 9 1234 5678', '12.345.678-9', '1985-03-15', 'female', 'Av. Las Condes 456', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-01-15', '2026-01-15', 'email', 'Isapre Consalud', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Juan', 'Pérez', 'juan.perez@demo.cl', '+56 9 2345 6789', '13.456.789-0', '1990-07-22', 'male', 'Calle Los Rosales 789', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-10', '2026-01-10', 'phone', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Ana', 'Martínez', 'ana.martinez@demo.cl', '+56 9 3456 7890', '14.567.890-1', '1988-11-08', 'female', 'Pasaje Los Aromos 321', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2024-12-20', '2025-12-20', 'whatsapp', 'Isapre Colmena', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Elena', 'Vega', 'elena.vega@demo.cl', '+56 9 1111 1111', '11.111.111-1', '1982-04-20', 'female', 'Av. Apoquindo 100', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-02-01', '2026-02-01', 'email', 'Isapre Consalud', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Roberto', 'Molina', 'roberto.molina@demo.cl', '+56 9 2222 2222', '11.222.222-2', '1978-09-15', 'male', 'Calle San Damián 200', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-11-10', '2025-11-10', 'whatsapp', 'Fonasa', true, NOW(), NOW());

  -- Prescriptions for customers (use md5 instead of gen_random_bytes)
  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-DEMO-' || substr(md5(random()::text || c.id::text), 1, 8) || '-' || substr(c.id::text, 1, 8), 'Dr. Demo', 'OPTO-00000', -1.5, -0.5, 90, NULL, 32.0, -1.5, -0.5, 90, NULL, 32.0, 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.organization_id = v_org_id;

  -- Schedule, quote, pos settings
  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES
    (v_branch_1_id, v_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"09:00","end_time":"13:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW()),
    (v_branch_2_id, v_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"10:00","end_time":"14:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW());
  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  VALUES (v_branch_1_id, v_org_id, NOW(), NOW()), (v_branch_2_id, v_org_id, NOW(), NOW());
  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (v_branch_1_id, 50.00, NOW(), NOW()), (v_branch_2_id, 50.00, NOW(), NOW());

  -- Admin user and branch access
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

COMMENT ON FUNCTION public.create_demo_organization_for_user(UUID, TEXT) IS 'Creates a dedicated 7-day demo org for a user. Ensures categories exist. demo_type: known_optica (banner on) | organic (banner off).';
