-- Migration: Seed Demo Óptica Mirada Clara - Sucursal 1 (Meses 0-4)
-- Creates organization, branch 1, and 4 months of operational data (T0 to T4).
-- Sucursal 2 is added in migration 20260223000002.
--
-- Temporal context:
--   T0 (Mes 0): CURRENT_DATE - 6 months (inicio óptica)
--   T4 (Mes 4): CURRENT_DATE - 2 months (antes de abrir sucursal 2)
--
-- Org ID: 00000000-0000-0000-0000-000000000001
-- Branch 1 ID: 00000000-0000-0000-0000-000000000002

DO $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  marcos_cat_id UUID;
  lentes_sol_cat_id UUID;
  accesorios_cat_id UUID;
  servicios_cat_id UUID;
  demo_admin_user_id UUID;
  frame_product_id UUID;
  lens_family_id UUID;
  cust_rec RECORD;
  rx_rec RECORD;
  ord_rec RECORD;
  prod_rec RECORD;
  i INTEGER;
  ord_num INTEGER;
  quote_num INTEGER;
  wo_num INTEGER;
  appt_date DATE;
  ord_date DATE;
  status_idx INTEGER;
  status_list TEXT[] := ARRAY['ordered', 'sent_to_lab', 'in_progress_lab', 'ready_at_lab', 'received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered'];
  days_back INTEGER := 120;
  total_amt INTEGER;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);

  -- Resolve demo admin (admin_users of org, or any auth user)
  SELECT id INTO demo_admin_user_id FROM public.admin_users WHERE organization_id = demo_org_id LIMIT 1;
  IF demo_admin_user_id IS NULL THEN
    SELECT id INTO demo_admin_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  -- ===== 1. ORGANIZATION =====
  INSERT INTO public.organizations (id, name, slug, subscription_tier, status, metadata, created_at)
  VALUES (demo_org_id, 'Óptica Mirada Clara', 'optica-mirada-clara', 'premium', 'active', '{"is_demo": true, "description": "Demo óptica chilena con 6 meses de operación progresiva"}'::jsonb, NOW() - INTERVAL '6 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, metadata = EXCLUDED.metadata;

  -- ===== 2. BRANCH 1 (Casa Matriz) =====
  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES (demo_branch_id, 'Casa Matriz', 'MCL-001', demo_org_id, 'Av. Providencia 1234', 'Santiago', 'Región Metropolitana', '7500000', 'Chile', '+56 2 2345 6789', 'casa@miradaclara.cl', true, NOW() - INTERVAL '6 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, email = EXCLUDED.email;

  -- ===== 3. ADMIN_BRANCH_ACCESS (si existe admin) =====
  IF demo_admin_user_id IS NOT NULL THEN
    INSERT INTO public.admin_branch_access (admin_user_id, branch_id, role, is_primary)
    VALUES (demo_admin_user_id, demo_branch_id, 'manager', true)
    ON CONFLICT (admin_user_id, branch_id) DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary;
  END IF;

  -- ===== 4. CATEGORIES =====
  SELECT id INTO marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;

  IF marcos_cat_id IS NULL OR lentes_sol_cat_id IS NULL OR accesorios_cat_id IS NULL OR servicios_cat_id IS NULL THEN
    RAISE NOTICE 'Categories not found. Ensure default categories exist. Skipping products.';
  ELSE
    -- ===== 5. LENS FAMILIES =====
    INSERT INTO public.lens_families (id, name, brand, lens_type, lens_material, description, is_active, organization_id, created_at)
    VALUES
    ('40000000-0000-0000-0000-000000000001'::uuid, 'Monofocal Básico CR-39 AR', 'Genérico', 'single_vision', 'cr39', 'Lente monofocal estándar con antirreflejo.', true, demo_org_id, NOW()),
    ('40000000-0000-0000-0000-000000000002'::uuid, 'Monofocal Policarbonato Blue Cut', 'Essilor', 'single_vision', 'polycarbonate', 'Monofocal resistente con filtro de luz azul.', true, demo_org_id, NOW()),
    ('40000000-0000-0000-0000-000000000010'::uuid, 'Progresivo Comfort Policarbonato', 'Essilor', 'progressive', 'polycarbonate', 'Progresivo Varilux Comfort.', true, demo_org_id, NOW())
    ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    SELECT lf.id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 29990, 9990, 'stock', true FROM public.lens_families lf WHERE lf.id = '40000000-0000-0000-0000-000000000001'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.lens_price_matrices lpm WHERE lpm.lens_family_id = '40000000-0000-0000-0000-000000000001'::uuid LIMIT 1);
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    SELECT lf.id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 59990, 24990, 'stock', true FROM public.lens_families lf WHERE lf.id = '40000000-0000-0000-0000-000000000002'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.lens_price_matrices lpm WHERE lpm.lens_family_id = '40000000-0000-0000-0000-000000000002'::uuid LIMIT 1);
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    SELECT lf.id, -4.00, 4.00, -2.00, 2.00, 0.75, 1.75, 189990, 79990, 'surfaced', true FROM public.lens_families lf WHERE lf.id = '40000000-0000-0000-0000-000000000010'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.lens_price_matrices lpm WHERE lpm.lens_family_id = '40000000-0000-0000-0000-000000000010'::uuid LIMIT 1);

    -- ===== 6. PRODUCTS =====
    INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, is_featured, price_includes_tax, featured_image, created_at)
    VALUES
    ('20000000-0000-0000-0000-000000000001'::uuid, demo_branch_id, demo_org_id, 'Marco Ray-Ban RB2140', 'marco-ray-ban-rb2140-mcl', 'Marco clásico aviador Ray-Ban.', 89900, 45000, marcos_cat_id, 'RB-2140-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000002'::uuid, demo_branch_id, demo_org_id, 'Marco Oakley OO9208', 'marco-oakley-oo9208-mcl', 'Marco deportivo Oakley.', 129900, 65000, marcos_cat_id, 'OO-9208-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000003'::uuid, demo_branch_id, demo_org_id, 'Marco Gucci GG0061', 'marco-gucci-gg0061-mcl', 'Marco de lujo Gucci.', 249900, 125000, marcos_cat_id, 'GG-0061-BRN', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000011'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Ray-Ban Aviator', 'gafas-sol-ray-ban-aviator-mcl', 'Gafas de sol Ray-Ban Aviator.', 119900, 60000, lentes_sol_cat_id, 'RB-AVI-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000012'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Oakley Holbrook', 'gafas-sol-oakley-holbrook-mcl', 'Gafas Oakley polarizadas.', 149900, 75000, lentes_sol_cat_id, 'OO-HOL-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000016'::uuid, demo_branch_id, demo_org_id, 'Estuche Rígido Premium', 'estuche-rigido-premium-mcl', 'Estuche rígido para lentes.', 12900, 5000, accesorios_cat_id, 'ACC-EST-RIG', 'active', true, true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000017'::uuid, demo_branch_id, demo_org_id, 'Paño de Limpieza Microfibra', 'pano-limpieza-microfibra-mcl', 'Paño microfibra para lentes.', 4900, 2000, accesorios_cat_id, 'ACC-PANO-MIC', 'active', true, true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000021'::uuid, demo_branch_id, demo_org_id, 'Reparación de Marco', 'reparacion-marco-mcl', 'Servicio de reparación de marco.', 19900, 0, servicios_cat_id, 'SERV-REP-MAR', 'active', true, true, NULL, NOW()),
    ('20000000-0000-0000-0000-000000000022'::uuid, demo_branch_id, demo_org_id, 'Montaje de Lentes', 'montaje-lentes-mcl', 'Servicio de montaje de lentes.', 29900, 0, servicios_cat_id, 'SERV-MON-LEN', 'active', true, true, NULL, NOW()),
    ('20000000-0000-0000-0000-000000000024'::uuid, demo_branch_id, demo_org_id, 'Examen de la Vista', 'examen-vista-mcl', 'Examen completo con optometrista.', 25000, 0, servicios_cat_id, 'SERV-EXA-VIS', 'active', true, true, NULL, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- ===== 7. PRODUCT BRANCH STOCK (branch 1) =====
    INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
    SELECT p.id, demo_branch_id, CASE WHEN p.category_id = marcos_cat_id THEN 15 + (random()*10)::int WHEN p.category_id = lentes_sol_cat_id THEN 20 + (random()*15)::int ELSE 30 END, 5, NOW()
    FROM public.products p WHERE p.organization_id = demo_org_id
    ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
  END IF;

  -- ===== 8. CUSTOMERS (branch 1, 22 clientes) =====
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, demo_branch_id, demo_org_id, 'María', 'González', 'maria.gonzalez@email.com', '+56 9 1234 5678', '12.345.678-9', '1985-03-15', 'female', 'Av. Las Condes 456', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-01-15', '2026-01-15', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '5 months', NOW()),
  ('10000000-0000-0000-0000-000000000002'::uuid, demo_branch_id, demo_org_id, 'Juan', 'Pérez', 'juan.perez@email.com', '+56 9 2345 6789', '13.456.789-0', '1990-07-22', 'male', 'Calle Los Rosales 789', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-10', '2026-01-10', 'phone', 'Fonasa', true, NOW() - INTERVAL '5 months', NOW()),
  ('10000000-0000-0000-0000-000000000003'::uuid, demo_branch_id, demo_org_id, 'Ana', 'Martínez', 'ana.martinez@email.com', '+56 9 3456 7890', '14.567.890-1', '1988-11-08', 'female', 'Pasaje Los Aromos 321', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Hipermetropía', 'Presbicia'], ARRAY[]::TEXT[], '2024-12-20', '2025-12-20', 'whatsapp', 'Isapre Colmena', true, NOW() - INTERVAL '4 months', NOW()),
  ('10000000-0000-0000-0000-000000000004'::uuid, demo_branch_id, demo_org_id, 'Carlos', 'Rodríguez', 'carlos.rodriguez@email.com', '+56 9 4567 8901', '15.678.901-2', '1975-05-30', 'male', 'Av. Vitacura 1234', 'Vitacura', 'Región Metropolitana', '7630000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2025-01-05', '2026-01-05', 'email', 'Isapre Banmédica', true, NOW() - INTERVAL '4 months', NOW()),
  ('10000000-0000-0000-0000-000000000005'::uuid, demo_branch_id, demo_org_id, 'Laura', 'Sánchez', 'laura.sanchez@email.com', '+56 9 5678 9012', '16.789.012-3', '1992-09-14', 'female', 'Calle Los Claveles 567', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Miopía', 'Astigmatismo'], ARRAY[]::TEXT[], '2024-11-28', '2025-11-28', 'sms', 'Fonasa', true, NOW() - INTERVAL '3 months', NOW()),
  ('10000000-0000-0000-0000-000000000006'::uuid, demo_branch_id, demo_org_id, 'Roberto', 'López', 'roberto.lopez@email.com', '+56 9 6789 0123', '17.890.123-4', '1983-02-18', 'male', 'Av. Apoquindo 2345', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-10-15', '2025-10-15', 'phone', 'Isapre Consalud', true, NOW() - INTERVAL '3 months', NOW()),
  ('10000000-0000-0000-0000-000000000007'::uuid, demo_branch_id, demo_org_id, 'Carmen', 'Fernández', 'carmen.fernandez@email.com', '+56 9 7890 1234', '18.901.234-5', '1978-12-25', 'female', 'Calle Los Olivos 890', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-09-20', '2025-09-20', 'email', 'Fonasa', true, NOW() - INTERVAL '2 months', NOW()),
  ('10000000-0000-0000-0000-000000000008'::uuid, demo_branch_id, demo_org_id, 'Diego', 'Torres', 'diego.torres@email.com', '+56 9 8901 2345', '19.012.345-6', '1995-04-07', 'male', 'Pasaje Los Jazmines 456', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-08-10', '2025-08-10', 'whatsapp', 'Isapre Colmena', true, NOW() - INTERVAL '2 months', NOW()),
  ('10000000-0000-0000-0000-000000000009'::uuid, demo_branch_id, demo_org_id, 'Patricia', 'Morales', 'patricia.morales@email.com', '+56 9 9012 3456', '20.123.456-7', '1987-08-19', 'female', 'Av. Nueva Providencia 3456', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2024-07-05', '2025-07-05', 'email', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000010'::uuid, demo_branch_id, demo_org_id, 'Fernando', 'Ramírez', 'fernando.ramirez@email.com', '+56 9 0123 4567', '21.234.567-8', '1981-01-31', 'male', 'Calle Los Laureles 678', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2024-06-18', '2025-06-18', 'phone', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  SELECT ('10000000-0000-0000-0000-' || LPAD(ser.n::text, 12, '0'))::uuid, demo_branch_id, demo_org_id, 'Cliente' || ser.n, 'Demo' || ser.n, 'cliente' || ser.n || '@email.com', '+56 9 0000 000' || ser.n, '99.999.999-' || ser.n, '1990-01-01', CASE WHEN ser.n % 2 = 0 THEN 'male' ELSE 'female' END, 'Calle Demo ' || ser.n, 'Santiago', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE + INTERVAL '1 year', 'email', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()
  FROM generate_series(11, 22) AS ser(n)
  ON CONFLICT (id) DO NOTHING;

  -- ===== 9. PRESCRIPTIONS =====
  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-MCL1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::TEXT, 3, '0'), 'Dr. Carlos Méndez', 'OPTO-12345', -1.5 - (random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), -1.5-(random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.branch_id = demo_branch_id
  AND NOT EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id LIMIT 1)
  LIMIT 22;

  -- ===== 10. SCHEDULE_SETTINGS, QUOTE_SETTINGS, POS_SETTINGS =====
  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES (demo_branch_id, demo_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"09:00","end_time":"13:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW())
  ON CONFLICT (branch_id) WHERE branch_id IS NOT NULL DO UPDATE SET slot_duration_minutes = EXCLUDED.slot_duration_minutes;

  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  SELECT demo_branch_id, demo_org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.quote_settings WHERE branch_id = demo_branch_id);

  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (demo_branch_id, 50.00, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET min_deposit_percent = EXCLUDED.min_deposit_percent;

  -- ===== 11. APPOINTMENTS (branch 1, meses 0-4, ~90 citas) =====
  FOR i IN 1..90 LOOP
    appt_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_id, demo_org_id, appt_date, ((9 + (i % 7)) || ':00:00')::time, (ARRAY['eye_exam', 'consultation', 'fitting', 'delivery', 'follow_up'])[1 + (i % 5)], CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, NULL, NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_id ORDER BY random() LIMIT 1;
    END IF;
  END LOOP;

  -- ===== 12. QUOTES (branch 1, ~30) =====
  SELECT id INTO frame_product_id FROM public.products WHERE organization_id = demo_org_id AND category_id = marcos_cat_id LIMIT 1;
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000010'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    quote_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
      VALUES (cust_rec.id, demo_branch_id, 'COT-MCL1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - (random()*days_back)::INT, CURRENT_DATE - (random()*days_back)::INT + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', 89900, lens_family_id, 'progressive', 'polycarbonate', ARRAY['anti_reflective', 'blue_light_filter'], 'progressive', 45000, 189990, 35000, 15000, 284990, 54148, 0, 339138, 'CLP', (ARRAY['draft', 'sent', 'accepted'])[1 + (quote_num % 3)], 'Presupuesto Mirada Clara', NOW() - (random()*days_back)::INT * INTERVAL '1 day')
      ON CONFLICT (quote_number) DO NOTHING;
      quote_num := quote_num + 1;
    END LOOP;
  END IF;

  -- ===== 13. LAB WORK ORDERS (branch 1, ~25) =====
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000002'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    wo_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_id LIMIT 20
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      status_idx := 1 + (random() * 8)::int;
      INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
      VALUES (cust_rec.id, demo_branch_id, 'TRB-MCL1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - (random()*days_back)::INT, rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective', 'blue_light_filter'], 'none', 65000, 59990, 35000, 15000, 30000, 169990, 32298, 0, 202288, 'CLP', status_list[status_idx], CASE status_list[status_idx] WHEN 'delivered' THEN 'paid' WHEN 'ready_for_pickup' THEN 'partial' ELSE 'pending' END, 'Trabajo Mirada Clara', NOW() - (random()*days_back)::INT * INTERVAL '1 day', NOW() - (random()*(days_back-5))::INT * INTERVAL '1 day', NOW() - (random()*(days_back-10))::INT * INTERVAL '1 day', CASE WHEN status_list[status_idx] = 'delivered' THEN NOW() - (random()*45)::INT * INTERVAL '1 day' ELSE NULL END)
      ON CONFLICT (work_order_number) DO NOTHING;
      wo_num := wo_num + 1;
    END LOOP;
  END IF;

  -- ===== 14. ORDERS (branch 1, ~70) =====
  ord_num := 1;
  FOR i IN 1..70 LOOP
    ord_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    total_amt := 80000 + (random()*200000)::int;
    INSERT INTO public.orders (branch_id, organization_id, order_number, status, total_amount, payment_status, payment_method_type, customer_name, email, subtotal, tax_amount, discount_amount, currency, is_pos_sale, pos_cashier_id, created_at, updated_at)
    SELECT demo_branch_id, demo_org_id, 'ORD-MCL1-' || TO_CHAR(ord_date, 'YYYY') || '-' || LPAD(ord_num::TEXT, 5, '0'), CASE WHEN random()>0.1 THEN 'delivered' ELSE 'processing' END, total_amt, CASE WHEN random()>0.15 THEN 'paid' ELSE 'pending' END, (ARRAY['cash', 'credit_card', 'debit_card', 'installments'])[1 + (random()*3)::int], c.first_name || ' ' || c.last_name, c.email, total_amt/1.19, total_amt/1.19*0.19, 0, 'CLP', random()>0.5, demo_admin_user_id, ord_date + INTERVAL '10 hours', ord_date + INTERVAL '10 hours'
    FROM public.customers c WHERE c.branch_id = demo_branch_id ORDER BY random() LIMIT 1
    ON CONFLICT (order_number) DO NOTHING;
    ord_num := ord_num + 1;
  END LOOP;

  -- ===== 15. ORDER_ITEMS =====
  FOR ord_rec IN SELECT o.id, o.total_amount FROM public.orders o WHERE o.branch_id = demo_branch_id AND o.organization_id = demo_org_id LIMIT 60
  LOOP
    SELECT p.id, p.name, p.sku, p.price INTO prod_rec FROM public.products p WHERE p.organization_id = demo_org_id ORDER BY random() LIMIT 1;
    IF prod_rec.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = ord_rec.id LIMIT 1) THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price, product_name, sku, created_at)
      VALUES (ord_rec.id, prod_rec.id, 1, prod_rec.price, prod_rec.price, prod_rec.name, prod_rec.sku, NOW());
    END IF;
  END LOOP;

  -- ===== 16. ORDER_PAYMENTS (para orders pagados) =====
  -- payment_method: cash, debit, credit, transfer, check (map from payment_method_type)
  INSERT INTO public.order_payments (order_id, amount, payment_method, paid_at)
  SELECT o.id, o.total_amount,
    CASE COALESCE(o.payment_method_type, 'cash')
      WHEN 'credit_card' THEN 'credit'
      WHEN 'debit_card' THEN 'debit'
      WHEN 'installments' THEN 'credit'
      ELSE 'cash'
    END,
    o.created_at
  FROM public.orders o
  WHERE o.branch_id = demo_branch_id AND o.organization_id = demo_org_id AND o.payment_status = 'paid'
  AND NOT EXISTS (SELECT 1 FROM public.order_payments op WHERE op.order_id = o.id LIMIT 1)
  LIMIT 50;

  -- ===== 17. CASH REGISTER CLOSURES + POS SESSIONS (branch 1, días laborables T0-T4) =====
  IF demo_admin_user_id IS NOT NULL THEN
    FOR i IN 0..days_back LOOP
      appt_date := (CURRENT_DATE - (i || ' days')::INTERVAL)::date;
      IF EXTRACT(DOW FROM appt_date) != 0 AND EXTRACT(DOW FROM appt_date) != 6 THEN
        INSERT INTO public.cash_register_closures (branch_id, closure_date, closed_by, opening_cash_amount, total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales, expected_cash, actual_cash, cash_difference, card_machine_debit_total, card_machine_credit_total, total_subtotal, total_tax, total_discounts, closing_cash_amount, status, opened_at, closed_at, created_at)
        VALUES (demo_branch_id, appt_date, demo_admin_user_id, 50000+(random()*150000)::int, 200000+(random()*400000)::int, 5+(random()*20)::int, (200000+(random()*400000)::int)*(0.3+random()*0.2), (200000+(random()*400000)::int)*(0.2+random()*0.1), (200000+(random()*400000)::int)*(0.2+random()*0.2), (200000+(random()*400000)::int)*(random()*0.1), 0, 50000+(random()*150000)::int, 50000+(random()*150000)::int, (random()*2000-1000)::int, (200000+(random()*400000)::int)*0.25, (200000+(random()*400000)::int)*0.3, (200000+(random()*400000)::int)/1.19, (200000+(random()*400000)::int)/1.19*0.19, 0, 50000+(random()*150000)::int, 'confirmed', (appt_date||' 08:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz)
        ON CONFLICT (branch_id, closure_date) DO NOTHING;
        INSERT INTO public.pos_sessions (cashier_id, terminal_id, location, branch_id, opening_cash_amount, closing_cash_amount, opening_time, closing_time, status, created_at, updated_at)
        SELECT demo_admin_user_id, 'TERMINAL-MCL1', 'Casa Matriz', demo_branch_id, 50000+(random()*150000)::int, 50000+(random()*150000)::int + 200000+(random()*400000)::int, (appt_date||' 08:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz, 'closed', NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM public.pos_sessions ps WHERE ps.branch_id = demo_branch_id AND ps.opening_time::date = appt_date LIMIT 1);
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON TABLE public.organizations IS 'Demo Óptica Mirada Clara: org 00000000-0000-0000-0000-000000000001, branch 1 00000000-0000-0000-0000-000000000002. Migration 20260223000002 adds branch 2.';
