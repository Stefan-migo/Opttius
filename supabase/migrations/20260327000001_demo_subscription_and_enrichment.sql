-- Migration: Demo subscription + data enrichment
-- 1. Insert subscriptions row (trialing 7 days) to fix "Período de prueba finalizado" banner
-- 2. Enrich products (13 total), customers (15 branch1, 8 branch2), prescriptions auto

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

  -- Subscription (trialing 7 days) - fixes "Período de prueba finalizado" banner
  INSERT INTO public.subscriptions (
    organization_id,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end
  )
  VALUES (
    v_org_id,
    'trialing',
    v_expires_at,
    CURRENT_DATE,
    (v_expires_at)::date
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

  -- Products (13 total - enriched) - slug must be globally unique, append org slug
  INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, is_featured, price_includes_tax, featured_image, created_at)
  VALUES
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Ray-Ban RB2140', 'marco-ray-ban-rb2140-' || v_slug, 'Marco clásico aviador Ray-Ban.', 89900, 45000, v_marcos_cat_id, 'RB-2140-BLK-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Oakley OO9208', 'marco-oakley-oo9208-' || v_slug, 'Marco deportivo Oakley.', 129900, 65000, v_marcos_cat_id, 'OO-9208-BLK-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Gucci GG0061', 'marco-gucci-gg0061-' || v_slug, 'Marco de lujo Gucci.', 249900, 125000, v_marcos_cat_id, 'GG-0061-BRN-' || v_slug, 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Vogue VG-2001', 'marco-vogue-vg2001-' || v_slug, 'Marco clásico Vogue.', 69900, 35000, v_marcos_cat_id, 'VG-2001-BLK-' || v_slug, 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Titanium Slim', 'marco-titanium-slim-' || v_slug, 'Marco ultrafino titanio.', 159900, 80000, v_marcos_cat_id, 'TI-SLIM-SLV-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Gafas de Sol Ray-Ban Aviator', 'gafas-sol-ray-ban-' || v_slug, 'Gafas de sol Ray-Ban Aviator.', 119900, 60000, v_lentes_sol_cat_id, 'RB-AVI-SUN-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Gafas de Sol Oakley Holbrook', 'gafas-sol-oakley-holbrook-' || v_slug, 'Gafas Oakley polarizadas.', 149900, 75000, v_lentes_sol_cat_id, 'OO-HOL-SUN-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Gafas de Sol Polarizadas Sport', 'gafas-sol-polarizadas-sport-' || v_slug, 'Gafas deportivas polarizadas.', 89900, 45000, v_lentes_sol_cat_id, 'SOL-SPORT-POL-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Estuche Rígido Premium', 'estuche-rigido-' || v_slug, 'Estuche rígido para lentes.', 12900, 5000, v_accesorios_cat_id, 'ACC-EST-RIG-' || v_slug, 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Paño de Limpieza Microfibra', 'pano-limpieza-microfibra-' || v_slug, 'Paño microfibra para lentes.', 4900, 2000, v_accesorios_cat_id, 'ACC-PANO-MIC-' || v_slug, 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Líquido Limpiador 120ml', 'liquido-limpiador-120ml-' || v_slug, 'Líquido limpiador para lentes.', 7900, 3000, v_accesorios_cat_id, 'ACC-LIQ-120-' || v_slug, 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Reparación de Marco', 'reparacion-marco-' || v_slug, 'Servicio de reparación de marco.', 19900, 0, v_servicios_cat_id, 'SERV-REP-MAR-' || v_slug, 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Montaje de Lentes', 'montaje-lentes-' || v_slug, 'Servicio de montaje de lentes.', 29900, 0, v_servicios_cat_id, 'SERV-MON-LEN-' || v_slug, 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Examen de la Vista', 'examen-vista-' || v_slug, 'Examen completo con optometrista.', 25000, 0, v_servicios_cat_id, 'SERV-EXA-VIS-' || v_slug, 'active', true, true, NULL, NOW());

  -- Product branch stock
  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, v_branch_1_id, 20, 5, NOW()
  FROM public.products p WHERE p.organization_id = v_org_id;
  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, v_branch_2_id, 15, 5, NOW()
  FROM public.products p WHERE p.organization_id = v_org_id;

  -- Customers branch 1 (15 total - enriched with Chilean names)
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'María', 'González', 'maria.gonzalez@demo-' || v_slug || '.cl', '+56 9 1234 5678', '12.345.678-9', '1985-03-15', 'female', 'Av. Las Condes 456', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-01-15', '2026-01-15', 'email', 'Isapre Consalud', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Juan', 'Pérez', 'juan.perez@demo-' || v_slug || '.cl', '+56 9 2345 6789', '13.456.789-0', '1990-07-22', 'male', 'Calle Los Rosales 789', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-10', '2026-01-10', 'phone', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Ana', 'Martínez', 'ana.martinez@demo-' || v_slug || '.cl', '+56 9 3456 7890', '14.567.890-1', '1988-11-08', 'female', 'Pasaje Los Aromos 321', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2024-12-20', '2025-12-20', 'whatsapp', 'Isapre Colmena', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Carlos', 'Rodríguez', 'carlos.rodriguez@demo-' || v_slug || '.cl', '+56 9 4567 8901', '15.678.901-2', '1975-05-30', 'male', 'Av. Vitacura 1234', 'Vitacura', 'Región Metropolitana', '7630000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2025-01-05', '2026-01-05', 'email', 'Isapre Banmédica', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Laura', 'Sánchez', 'laura.sanchez@demo-' || v_slug || '.cl', '+56 9 5678 9012', '16.789.012-3', '1992-09-14', 'female', 'Calle Los Claveles 567', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Miopía', 'Astigmatismo'], ARRAY[]::TEXT[], '2024-11-28', '2025-11-28', 'sms', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Roberto', 'López', 'roberto.lopez@demo-' || v_slug || '.cl', '+56 9 6789 0123', '17.890.123-4', '1983-02-18', 'male', 'Av. Apoquindo 2345', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-10-15', '2025-10-15', 'phone', 'Isapre Consalud', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Carmen', 'Fernández', 'carmen.fernandez@demo-' || v_slug || '.cl', '+56 9 7890 1234', '18.901.234-5', '1978-12-25', 'female', 'Calle Los Olivos 890', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-09-20', '2025-09-20', 'email', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Diego', 'Torres', 'diego.torres@demo-' || v_slug || '.cl', '+56 9 8901 2345', '19.012.345-6', '1995-04-07', 'male', 'Pasaje Los Jazmines 456', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-08-10', '2025-08-10', 'whatsapp', 'Isapre Colmena', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Patricia', 'Morales', 'patricia.morales@demo-' || v_slug || '.cl', '+56 9 9012 3456', '20.123.456-7', '1987-08-19', 'female', 'Av. Nueva Providencia 3456', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2024-07-05', '2025-07-05', 'email', 'Isapre Banmédica', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Fernando', 'Ramírez', 'fernando.ramirez@demo-' || v_slug || '.cl', '+56 9 0123 4567', '21.234.567-8', '1981-01-31', 'male', 'Calle Los Laureles 678', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2024-06-18', '2025-06-18', 'phone', 'Fonasa', true, NOW(), NOW());
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  SELECT gen_random_uuid(), v_branch_1_id, v_org_id, 'Cliente' || ser.n, 'Demo' || ser.n, 'cliente' || ser.n || '@demo-' || v_slug || '.cl', '+56 9 0000 000' || ser.n, '30.000.00' || (ser.n - 10) || '-1', '1990-01-01', CASE WHEN ser.n % 2 = 0 THEN 'male' ELSE 'female' END, 'Calle Demo ' || ser.n, 'Santiago', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE + INTERVAL '1 year', 'email', 'Fonasa', true, NOW(), NOW()
  FROM generate_series(11, 15) AS ser(n);

  -- Customers branch 2 (8 total - enriched)
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Elena', 'Vega', 'elena.vega@demo-' || v_slug || '.cl', '+56 9 1111 1111', '11.111.111-1', '1982-04-20', 'female', 'Av. Apoquindo 100', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-02-01', '2026-02-01', 'email', 'Isapre Consalud', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Roberto', 'Molina', 'roberto.molina@demo-' || v_slug || '.cl', '+56 9 2222 2222', '11.222.222-2', '1978-09-15', 'male', 'Calle San Damián 200', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-11-10', '2025-11-10', 'whatsapp', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Claudia', 'Soto', 'claudia.soto@demo-' || v_slug || '.cl', '+56 9 3333 3333', '11.333.333-3', '1991-12-03', 'female', 'Av. Las Condes 300', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-20', '2026-01-20', 'phone', 'Isapre Banmédica', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Pablo', 'Contreras', 'pablo.contreras@demo-' || v_slug || '.cl', '+56 9 4444 4444', '11.444.444-4', '1985-06-28', 'male', 'Pasaje Los Dominicos 400', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2024-10-05', '2025-10-05', 'email', 'Isapre Colmena', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Francisca', 'Lagos', 'francisca.lagos@demo-' || v_slug || '.cl', '+56 9 5555 5555', '11.555.555-5', '1994-03-12', 'female', 'Av. Kennedy 500', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-09-15', '2025-09-15', 'sms', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Andrés', 'Silva', 'andres.silva@demo-' || v_slug || '.cl', '+56 9 6666 6666', '11.666.666-6', '1989-07-22', 'male', 'Calle Los Leones 600', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-08-01', '2025-08-01', 'email', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Valentina', 'Rojas', 'valentina.rojas@demo-' || v_slug || '.cl', '+56 9 7777 7777', '11.777.777-7', '1993-11-15', 'female', 'Av. Providencia 700', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2024-07-10', '2025-07-10', 'whatsapp', 'Isapre Consalud', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Miguel', 'Espinoza', 'miguel.espinoza@demo-' || v_slug || '.cl', '+56 9 8888 8888', '11.888.888-8', '1980-03-08', 'male', 'Pasaje Los Plátanos 800', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-06-20', '2025-06-20', 'phone', 'Isapre Banmédica', true, NOW(), NOW());

  -- Prescriptions for customers (1 per customer, auto via SELECT)
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

COMMENT ON FUNCTION public.create_demo_organization_for_user(UUID, TEXT) IS 'Creates a dedicated 7-day demo org for a user with trialing subscription. Enriched: 13 products, 15+8 customers. demo_type: known_optica (banner on) | organic (banner off).';
