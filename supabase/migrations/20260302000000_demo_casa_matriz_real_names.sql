-- Migration: Add real names to Casa Matriz branch 1 demo customers (11-22)
-- Replaces Cliente11 Demo11, Cliente12 Demo12, etc. with real Chilean names.
-- 1) Update existing customers in DB
-- 2) Update seed_demo_mirada_clara() for future resets

-- 1) Update existing Casa Matriz customers 11-22
UPDATE public.customers SET
  first_name = v.first_name,
  last_name = v.last_name,
  email = v.email,
  phone = v.phone,
  rut = v.rut,
  address_line_1 = v.address_line_1,
  city = v.city,
  updated_at = NOW()
FROM (VALUES
  ('10000000-0000-0000-0000-000000000011'::uuid, 'Isabel', 'Fuentes', 'isabel.fuentes@email.com', '+56 9 1111 1112', '22.345.678-9', 'Av. Irarrázaval 1100', 'Ñuñoa'),
  ('10000000-0000-0000-0000-000000000012'::uuid, 'Ricardo', 'Bustamante', 'ricardo.bustamante@email.com', '+56 9 1111 1113', '22.345.678-0', 'Calle Condell 1200', 'Providencia'),
  ('10000000-0000-0000-0000-000000000013'::uuid, 'Sofía', 'Cortés', 'sofia.cortes@email.com', '+56 9 1111 1114', '22.345.678-1', 'Av. Pedro de Valdivia 1300', 'Providencia'),
  ('10000000-0000-0000-0000-000000000014'::uuid, 'Alejandro', 'Núñez', 'alejandro.nunez@email.com', '+56 9 1111 1115', '22.345.678-2', 'Calle Los Leones 1400', 'Providencia'),
  ('10000000-0000-0000-0000-000000000015'::uuid, 'Carolina', 'Pino', 'carolina.pino@email.com', '+56 9 1111 1116', '22.345.678-3', 'Av. Providencia 1500', 'Providencia'),
  ('10000000-0000-0000-0000-000000000016'::uuid, 'Luis', 'Miranda', 'luis.miranda@email.com', '+56 9 1111 1117', '22.345.678-4', 'Calle Orrego Luco 1600', 'Providencia'),
  ('10000000-0000-0000-0000-000000000017'::uuid, 'Paula', 'Salinas', 'paula.salinas@email.com', '+56 9 1111 1118', '22.345.678-5', 'Av. Tobalaba 1700', 'Las Condes'),
  ('10000000-0000-0000-0000-000000000018'::uuid, 'Miguel', 'Aravena', 'miguel.aravena@email.com', '+56 9 1111 1119', '22.345.678-6', 'Calle El Bosque 1800', 'Las Condes'),
  ('10000000-0000-0000-0000-000000000019'::uuid, 'Catalina', 'Barrera', 'catalina.barrera@email.com', '+56 9 1111 1120', '22.345.678-7', 'Av. Apoquindo 1900', 'Las Condes'),
  ('10000000-0000-0000-0000-000000000020'::uuid, 'Francisco', 'Cáceres', 'francisco.caceres@email.com', '+56 9 1111 1121', '22.345.678-8', 'Calle Alonso de Córdova 2000', 'Vitacura'),
  ('10000000-0000-0000-0000-000000000021'::uuid, 'María José', 'Orellana', 'mariajose.orellana@email.com', '+56 9 1111 1122', '22.345.678-9', 'Av. Kennedy 2100', 'Las Condes'),
  ('10000000-0000-0000-0000-000000000022'::uuid, 'Tomás', 'Gallardo', 'tomas.gallardo@email.com', '+56 9 1111 1123', '22.345.679-0', 'Calle Isidora Goyenechea 2200', 'Las Condes')
) AS v(id, first_name, last_name, email, phone, rut, address_line_1, city)
WHERE public.customers.id = v.id;

-- 2) Update seed_demo_mirada_clara() so future resets also get real names for Casa Matriz 11-22
-- (Re-run the function definition from 20260301000003 which now has real names)
CREATE OR REPLACE FUNCTION public.seed_demo_mirada_clara()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_branch_2_id UUID := '00000000-0000-0000-0000-000000000003'::uuid;
  demo_branch_1_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  marcos_cat_id UUID;
  lentes_sol_cat_id UUID;
  lentes_contacto_cat_id UUID;
  accesorios_cat_id UUID;
  servicios_cat_id UUID;
  demo_admin_user_id UUID;
  frame_product_id UUID;
  lens_family_id UUID;
  cust_rec RECORD;
  rx_rec RECORD;
  ord_rec RECORD;
  prod_rec RECORD;
  sess_rec RECORD;
  i INTEGER;
  d INTEGER;
  ord_num INTEGER;
  quote_num INTEGER;
  wo_num INTEGER;
  ticket_num INTEGER;
  appt_date DATE;
  ord_date DATE;
  status_idx INTEGER;
  status_list TEXT[] := ARRAY['ordered', 'sent_to_lab', 'in_progress_lab', 'ready_at_lab', 'received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered'];
  days_back INTEGER;
  days_back_2 INTEGER := 60;
  total_amt INTEGER;
  base_sales INTEGER;
  is_demo_admin BOOLEAN := false;
BEGIN
  PERFORM set_config('statement_timeout', '180000', true);
  days_back := 120;

  SELECT id INTO demo_admin_user_id FROM public.admin_users WHERE organization_id = demo_org_id LIMIT 1;
  IF demo_admin_user_id IS NOT NULL THEN
    is_demo_admin := true;
  ELSE
    SELECT id INTO demo_admin_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  -- ===== ORGANIZATION =====
  INSERT INTO public.organizations (id, name, slug, subscription_tier, status, metadata, created_at)
  VALUES (demo_org_id, 'Óptica Mirada Clara', 'optica-mirada-clara', 'premium', 'active', '{"is_demo": true, "description": "Demo óptica chilena con 6 meses de operación progresiva"}'::jsonb, NOW() - INTERVAL '6 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, metadata = EXCLUDED.metadata;

  -- ===== BRANCH 1 =====
  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES (demo_branch_id, 'Casa Matriz', 'MCL-001', demo_org_id, 'Av. Providencia 1234', 'Santiago', 'Región Metropolitana', '7500000', 'Chile', '+56 2 2345 6789', 'casa@miradaclara.cl', true, NOW() - INTERVAL '6 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, email = EXCLUDED.email;

  -- ===== BRANCH 2 =====
  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES (demo_branch_2_id, 'Sucursal Providencia', 'MCL-002', demo_org_id, 'Av. Apoquindo 4567', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', '+56 2 2345 6790', 'providencia@miradaclara.cl', true, NOW() - INTERVAL '2 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, email = EXCLUDED.email;

  -- ===== ADMIN_BRANCH_ACCESS =====
  IF demo_admin_user_id IS NOT NULL THEN
    INSERT INTO public.admin_branch_access (admin_user_id, branch_id, role, is_primary)
    VALUES (demo_admin_user_id, demo_branch_id, 'manager', true)
    ON CONFLICT (admin_user_id, branch_id) DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary;
    INSERT INTO public.admin_branch_access (admin_user_id, branch_id, role, is_primary)
    VALUES (demo_admin_user_id, demo_branch_2_id, 'manager', false)
    ON CONFLICT (admin_user_id, branch_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  -- ===== CATEGORIES =====
  SELECT id INTO marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO lentes_contacto_cat_id FROM public.categories WHERE slug = 'lentes-contacto' LIMIT 1;
  SELECT id INTO accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;

  IF marcos_cat_id IS NULL OR lentes_sol_cat_id IS NULL OR accesorios_cat_id IS NULL OR servicios_cat_id IS NULL THEN
    RAISE NOTICE 'Categories not found. Skipping products.';
  ELSE
    -- LENS FAMILIES
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

    -- CONTACT LENS FAMILIES
    INSERT INTO public.contact_lens_families (id, organization_id, name, brand, use_type, modality, material, packaging, base_curve, diameter, description, is_active, category_id, created_at)
    VALUES
    ('70000000-0000-0000-0000-000000000001'::uuid, demo_org_id, 'Acuvue Oasys 1-Day', 'Johnson & Johnson', 'daily', 'spherical', 'silicone_hydrogel', 'box_30', 8.50, 14.30, 'Lentes diarios hidrogel silicona. Confort y oxigenación.', true, lentes_contacto_cat_id, NOW()),
    ('70000000-0000-0000-0000-000000000002'::uuid, demo_org_id, 'Air Optix Plus HydraGlyde for Astigmatism', 'Alcon', 'monthly', 'toric', 'silicone_hydrogel', 'box_6', 8.70, 14.50, 'Lentes mensuales para astigmatismo. Hidratación prolongada.', true, lentes_contacto_cat_id, NOW())
    ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, name = EXCLUDED.name, brand = EXCLUDED.brand, category_id = EXCLUDED.category_id;
    INSERT INTO public.contact_lens_price_matrices (contact_lens_family_id, organization_id, sphere_min, sphere_max, cylinder_min, cylinder_max, axis_min, axis_max, addition_min, addition_max, base_price, cost, is_active)
    SELECT id, demo_org_id, -6.00, -0.50, 0.00, 0.00, 0, 0, 0.00, 0.00, 29990, 14990, true FROM public.contact_lens_families WHERE id = '70000000-0000-0000-0000-000000000001'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.contact_lens_price_matrices WHERE contact_lens_family_id = '70000000-0000-0000-0000-000000000001'::uuid AND sphere_min = -6.00 LIMIT 1);
    INSERT INTO public.contact_lens_price_matrices (contact_lens_family_id, organization_id, sphere_min, sphere_max, cylinder_min, cylinder_max, axis_min, axis_max, addition_min, addition_max, base_price, cost, is_active)
    SELECT id, demo_org_id, -6.00, -0.50, -1.75, -0.75, 10, 180, 0.00, 0.00, 39990, 19990, true FROM public.contact_lens_families WHERE id = '70000000-0000-0000-0000-000000000002'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.contact_lens_price_matrices WHERE contact_lens_family_id = '70000000-0000-0000-0000-000000000002'::uuid AND sphere_min = -6.00 LIMIT 1);

    -- PRODUCTS
    INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, is_featured, price_includes_tax, featured_image, created_at)
    VALUES
    ('20000000-0000-0000-0000-000000000001'::uuid, demo_branch_id, demo_org_id, 'Marco Ray-Ban RB2140', 'marco-ray-ban-rb2140-mcl', 'Marco clásico aviador Ray-Ban.', 89900, 45000, marcos_cat_id, 'RB-2140-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000002'::uuid, demo_branch_id, demo_org_id, 'Marco Oakley OO9208', 'marco-oakley-oo9208-mcl', 'Marco deportivo Oakley.', 129900, 65000, marcos_cat_id, 'OO-9208-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000003'::uuid, demo_branch_id, demo_org_id, 'Marco Gucci GG0061', 'marco-gucci-gg0061-mcl', 'Marco de lujo Gucci.', 249900, 125000, marcos_cat_id, 'GG-0061-BRN', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000004'::uuid, demo_branch_id, demo_org_id, 'Marco Vogue VG-2001', 'marco-vogue-vg2001-mcl', 'Marco clásico Vogue.', 69900, 35000, marcos_cat_id, 'VG-2001-BLK', 'active', false, true, 'https://images.unsplash.com/1511499767150?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000005'::uuid, demo_branch_id, demo_org_id, 'Marco Titanium Slim', 'marco-titanium-slim-mcl', 'Marco ultrafino titanio.', 159900, 80000, marcos_cat_id, 'TI-SLIM-SLV', 'active', true, true, 'https://images.unsplash.com/1572635196237?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000011'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Ray-Ban Aviator', 'gafas-sol-ray-ban-aviator-mcl', 'Gafas de sol Ray-Ban Aviator.', 119900, 60000, lentes_sol_cat_id, 'RB-AVI-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000012'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Oakley Holbrook', 'gafas-sol-oakley-holbrook-mcl', 'Gafas Oakley polarizadas.', 149900, 75000, lentes_sol_cat_id, 'OO-HOL-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000013'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Polarizadas Sport', 'gafas-sol-polarizadas-sport-mcl', 'Gafas deportivas polarizadas.', 89900, 45000, lentes_sol_cat_id, 'SOL-SPORT-POL', 'active', true, true, 'https://images.unsplash.com/1511499767150?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000016'::uuid, demo_branch_id, demo_org_id, 'Estuche Rígido Premium', 'estuche-rigido-premium-mcl', 'Estuche rígido para lentes.', 12900, 5000, accesorios_cat_id, 'ACC-EST-RIG', 'active', true, true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000017'::uuid, demo_branch_id, demo_org_id, 'Paño de Limpieza Microfibra', 'pano-limpieza-microfibra-mcl', 'Paño microfibra para lentes.', 4900, 2000, accesorios_cat_id, 'ACC-PANO-MIC', 'active', true, true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000018'::uuid, demo_branch_id, demo_org_id, 'Líquido Limpiador 120ml', 'liquido-limpiador-120ml-mcl', 'Líquido limpiador para lentes.', 7900, 3000, accesorios_cat_id, 'ACC-LIQ-120', 'active', true, true, NULL, NOW()),
    ('20000000-0000-0000-0000-000000000021'::uuid, demo_branch_id, demo_org_id, 'Reparación de Marco', 'reparacion-marco-mcl', 'Servicio de reparación de marco.', 19900, 0, servicios_cat_id, 'SERV-REP-MAR', 'active', true, true, NULL, NOW()),
    ('20000000-0000-0000-0000-000000000022'::uuid, demo_branch_id, demo_org_id, 'Montaje de Lentes', 'montaje-lentes-mcl', 'Servicio de montaje de lentes.', 29900, 0, servicios_cat_id, 'SERV-MON-LEN', 'active', true, true, NULL, NOW()),
    ('20000000-0000-0000-0000-000000000024'::uuid, demo_branch_id, demo_org_id, 'Examen de la Vista', 'examen-vista-mcl', 'Examen completo con optometrista.', 25000, 0, servicios_cat_id, 'SERV-EXA-VIS', 'active', true, true, NULL, NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
    SELECT p.id, demo_branch_id, CASE WHEN p.category_id = marcos_cat_id THEN 15 + (random()*10)::int WHEN p.category_id = lentes_sol_cat_id THEN 20 + (random()*15)::int ELSE 30 END, 5, NOW()
    FROM public.products p WHERE p.organization_id = demo_org_id
    ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
    INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
    SELECT p.id, demo_branch_2_id, CASE WHEN p.category_id = marcos_cat_id THEN 10 + (random()*8)::int WHEN p.category_id = lentes_sol_cat_id THEN 15 + (random()*10)::int ELSE 25 END, 5, NOW()
    FROM public.products p WHERE p.organization_id = demo_org_id
    ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
  END IF;

  -- ===== CUSTOMERS branch 1 =====
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
  ON CONFLICT (id) DO UPDATE SET branch_id = EXCLUDED.branch_id, organization_id = EXCLUDED.organization_id, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, phone = EXCLUDED.phone, rut = EXCLUDED.rut, date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, country = EXCLUDED.country, medical_conditions = EXCLUDED.medical_conditions, allergies = EXCLUDED.allergies, last_eye_exam_date = EXCLUDED.last_eye_exam_date, next_eye_exam_due = EXCLUDED.next_eye_exam_due, preferred_contact_method = EXCLUDED.preferred_contact_method, insurance_provider = EXCLUDED.insurance_provider, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at;

  -- Casa Matriz customers 11-22: real Chilean names
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
  ('10000000-0000-0000-0000-000000000011'::uuid, demo_branch_id, demo_org_id, 'Isabel', 'Fuentes', 'isabel.fuentes@email.com', '+56 9 1111 1112', '22.345.678-9', '1990-04-12', 'female', 'Av. Irarrázaval 1100', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-05-10', '2025-05-10', 'email', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000012'::uuid, demo_branch_id, demo_org_id, 'Ricardo', 'Bustamante', 'ricardo.bustamante@email.com', '+56 9 1111 1113', '22.345.678-0', '1986-08-25', 'male', 'Calle Condell 1200', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-04-18', '2025-04-18', 'whatsapp', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000013'::uuid, demo_branch_id, demo_org_id, 'Sofía', 'Cortés', 'sofia.cortes@email.com', '+56 9 1111 1114', '22.345.678-1', '1994-01-08', 'female', 'Av. Pedro de Valdivia 1300', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2024-03-22', '2025-03-22', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000014'::uuid, demo_branch_id, demo_org_id, 'Alejandro', 'Núñez', 'alejandro.nunez@email.com', '+56 9 1111 1115', '22.345.678-2', '1982-11-30', 'male', 'Calle Los Leones 1400', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2024-02-14', '2025-02-14', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000015'::uuid, demo_branch_id, demo_org_id, 'Carolina', 'Pino', 'carolina.pino@email.com', '+56 9 1111 1116', '22.345.678-3', '1996-06-17', 'female', 'Av. Providencia 1500', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-01-08', '2025-01-08', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000016'::uuid, demo_branch_id, demo_org_id, 'Luis', 'Miranda', 'luis.miranda@email.com', '+56 9 1111 1117', '22.345.678-4', '1989-03-05', 'male', 'Calle Orrego Luco 1600', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2023-12-20', '2024-12-20', 'whatsapp', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000017'::uuid, demo_branch_id, demo_org_id, 'Paula', 'Salinas', 'paula.salinas@email.com', '+56 9 1111 1118', '22.345.678-5', '1991-09-22', 'female', 'Av. Tobalaba 1700', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2023-11-15', '2024-11-15', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000018'::uuid, demo_branch_id, demo_org_id, 'Miguel', 'Aravena', 'miguel.aravena@email.com', '+56 9 1111 1119', '22.345.678-6', '1984-07-11', 'male', 'Calle El Bosque 1800', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2023-10-08', '2024-10-08', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000019'::uuid, demo_branch_id, demo_org_id, 'Catalina', 'Barrera', 'catalina.barrera@email.com', '+56 9 1111 1120', '22.345.678-7', '1993-02-28', 'female', 'Av. Apoquindo 1900', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2023-09-01', '2024-09-01', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000020'::uuid, demo_branch_id, demo_org_id, 'Francisco', 'Cáceres', 'francisco.caceres@email.com', '+56 9 1111 1121', '22.345.678-8', '1980-12-14', 'male', 'Calle Alonso de Córdova 2000', 'Vitacura', 'Región Metropolitana', '7630000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2023-08-20', '2024-08-20', 'whatsapp', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000021'::uuid, demo_branch_id, demo_org_id, 'María José', 'Orellana', 'mariajose.orellana@email.com', '+56 9 1111 1122', '22.345.678-9', '1997-05-03', 'female', 'Av. Kennedy 2100', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2023-07-12', '2024-07-12', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000022'::uuid, demo_branch_id, demo_org_id, 'Tomás', 'Gallardo', 'tomas.gallardo@email.com', '+56 9 1111 1123', '22.345.679-0', '1987-10-19', 'male', 'Calle Isidora Goyenechea 2200', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2023-06-05', '2024-06-05', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW())
  ON CONFLICT (id) DO UPDATE SET branch_id = EXCLUDED.branch_id, organization_id = EXCLUDED.organization_id, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, phone = EXCLUDED.phone, rut = EXCLUDED.rut, date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, country = EXCLUDED.country, medical_conditions = EXCLUDED.medical_conditions, allergies = EXCLUDED.allergies, last_eye_exam_date = EXCLUDED.last_eye_exam_date, next_eye_exam_due = EXCLUDED.next_eye_exam_due, preferred_contact_method = EXCLUDED.preferred_contact_method, insurance_provider = EXCLUDED.insurance_provider, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at;

  -- ===== CUSTOMERS branch 2 (Providencia) - explicit names 1-5 + real names 6-18 =====
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
  ('11000000-0000-0000-0000-000000000001'::uuid, demo_branch_2_id, demo_org_id, 'Elena', 'Vega', 'elena.vega@providencia.cl', '+56 9 1111 1111', '11.111.111-1', '1982-04-20', 'female', 'Av. Apoquindo 100', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-02-01', '2026-02-01', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '2 months', NOW()),
  ('11000000-0000-0000-0000-000000000002'::uuid, demo_branch_2_id, demo_org_id, 'Roberto', 'Molina', 'roberto.molina@providencia.cl', '+56 9 2222 2222', '11.222.222-2', '1978-09-15', 'male', 'Calle San Damián 200', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-11-10', '2025-11-10', 'whatsapp', 'Fonasa', true, NOW() - INTERVAL '2 months', NOW()),
  ('11000000-0000-0000-0000-000000000003'::uuid, demo_branch_2_id, demo_org_id, 'Claudia', 'Soto', 'claudia.soto@providencia.cl', '+56 9 3333 3333', '11.333.333-3', '1991-12-03', 'female', 'Av. Las Condes 300', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-20', '2026-01-20', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000004'::uuid, demo_branch_2_id, demo_org_id, 'Pablo', 'Contreras', 'pablo.contreras@providencia.cl', '+56 9 4444 4444', '11.444.444-4', '1985-06-28', 'male', 'Pasaje Los Dominicos 400', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2024-10-05', '2025-10-05', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000005'::uuid, demo_branch_2_id, demo_org_id, 'Francisca', 'Lagos', 'francisca.lagos@providencia.cl', '+56 9 5555 5555', '11.555.555-5', '1994-03-12', 'female', 'Av. Kennedy 500', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-09-15', '2025-09-15', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000006'::uuid, demo_branch_2_id, demo_org_id, 'Valentina', 'Rojas', 'valentina.rojas@providencia.cl', '+56 9 6666 6666', '11.666.666-6', '1993-05-18', 'female', 'Av. Providencia 600', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-08-20', '2025-08-20', 'email', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000007'::uuid, demo_branch_2_id, demo_org_id, 'Sebastián', 'Silva', 'sebastian.silva@providencia.cl', '+56 9 6666 6667', '11.666.666-7', '1989-11-03', 'male', 'Av. Providencia 700', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2024-07-15', '2025-07-15', 'whatsapp', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000008'::uuid, demo_branch_2_id, demo_org_id, 'Macarena', 'Díaz', 'macarena.diaz@providencia.cl', '+56 9 6666 6668', '11.666.666-8', '1996-02-28', 'female', 'Av. Providencia 800', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-06-10', '2025-06-10', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000009'::uuid, demo_branch_2_id, demo_org_id, 'Martín', 'Castro', 'martin.castro@providencia.cl', '+56 9 6666 6669', '11.666.666-9', '1984-09-14', 'male', 'Av. Providencia 900', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-05-22', '2025-05-22', 'email', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000010'::uuid, demo_branch_2_id, demo_org_id, 'Daniela', 'Muñoz', 'daniela.munoz@providencia.cl', '+56 9 6666 6670', '11.666.667-0', '1991-12-07', 'female', 'Av. Providencia 1000', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía', 'Astigmatismo'], ARRAY[]::TEXT[], '2024-04-18', '2025-04-18', 'whatsapp', 'Isapre Colmena', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000011'::uuid, demo_branch_2_id, demo_org_id, 'Nicolás', 'Herrera', 'nicolas.herrera@providencia.cl', '+56 9 6666 6671', '11.666.667-1', '1987-03-25', 'male', 'Av. Providencia 1100', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2024-03-30', '2025-03-30', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000012'::uuid, demo_branch_2_id, demo_org_id, 'Camila', 'Navarro', 'camila.navarro@providencia.cl', '+56 9 6666 6672', '11.666.667-2', '1994-07-11', 'female', 'Av. Providencia 1200', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-02-14', '2025-02-14', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000013'::uuid, demo_branch_2_id, demo_org_id, 'Andrés', 'Sepúlveda', 'andres.sepulveda@providencia.cl', '+56 9 6666 6673', '11.666.667-3', '1982-01-19', 'male', 'Av. Providencia 1300', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-01-08', '2025-01-08', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000014'::uuid, demo_branch_2_id, demo_org_id, 'Javiera', 'Vargas', 'javiera.vargas@providencia.cl', '+56 9 6666 6674', '11.666.667-4', '1998-10-30', 'female', 'Av. Providencia 1400', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2023-12-05', '2024-12-05', 'whatsapp', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000015'::uuid, demo_branch_2_id, demo_org_id, 'Gonzalo', 'Figueroa', 'gonzalo.figueroa@providencia.cl', '+56 9 6666 6675', '11.666.667-5', '1980-06-22', 'male', 'Av. Providencia 1500', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2023-11-20', '2024-11-20', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000016'::uuid, demo_branch_2_id, demo_org_id, 'Antonia', 'Espinoza', 'antonia.espinoza@providencia.cl', '+56 9 6666 6676', '11.666.667-6', '1995-04-09', 'female', 'Av. Providencia 1600', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2023-10-12', '2024-10-12', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000017'::uuid, demo_branch_2_id, demo_org_id, 'Felipe', 'Reyes', 'felipe.reyes@providencia.cl', '+56 9 6666 6677', '11.666.667-7', '1992-08-16', 'male', 'Av. Providencia 1700', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2023-09-28', '2024-09-28', 'whatsapp', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000018'::uuid, demo_branch_2_id, demo_org_id, 'Constanza', 'Araya', 'constanza.araya@providencia.cl', '+56 9 6666 6678', '11.666.667-8', '1986-12-01', 'female', 'Av. Providencia 1800', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Hipermetropía', 'Presbicia'], ARRAY[]::TEXT[], '2023-08-15', '2024-08-15', 'email', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW())
  ON CONFLICT (id) DO UPDATE SET branch_id = EXCLUDED.branch_id, organization_id = EXCLUDED.organization_id, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, phone = EXCLUDED.phone, rut = EXCLUDED.rut, date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, country = EXCLUDED.country, medical_conditions = EXCLUDED.medical_conditions, allergies = EXCLUDED.allergies, last_eye_exam_date = EXCLUDED.last_eye_exam_date, next_eye_exam_due = EXCLUDED.next_eye_exam_due, preferred_contact_method = EXCLUDED.preferred_contact_method, insurance_provider = EXCLUDED.insurance_provider, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at;

  -- ===== PRESCRIPTIONS =====
  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-MCL1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::TEXT, 3, '0'), 'Dr. Carlos Méndez', 'OPTO-12345', -1.5 - (random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), -1.5-(random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.branch_id = demo_branch_id
  AND NOT EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id LIMIT 1)
  LIMIT 22;
  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-MCL2-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::TEXT, 3, '0'), 'Dr. Carlos Méndez', 'OPTO-20000', -1.5 - (random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), -1.5-(random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.branch_id = demo_branch_2_id
  AND NOT EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id LIMIT 1)
  LIMIT 18;

  -- ===== SCHEDULE, QUOTE, POS SETTINGS =====
  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES (demo_branch_id, demo_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"09:00","end_time":"13:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW())
  ON CONFLICT (branch_id) WHERE branch_id IS NOT NULL DO UPDATE SET slot_duration_minutes = EXCLUDED.slot_duration_minutes;
  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES (demo_branch_2_id, demo_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"10:00","end_time":"14:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW())
  ON CONFLICT (branch_id) WHERE branch_id IS NOT NULL DO UPDATE SET slot_duration_minutes = EXCLUDED.slot_duration_minutes;
  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  SELECT demo_branch_id, demo_org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.quote_settings WHERE branch_id = demo_branch_id);
  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  SELECT demo_branch_2_id, demo_org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.quote_settings WHERE branch_id = demo_branch_2_id);
  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (demo_branch_id, 50.00, NOW(), NOW()), (demo_branch_2_id, 50.00, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET min_deposit_percent = EXCLUDED.min_deposit_percent;

  -- ===== APPOINTMENTS =====
  FOR i IN 1..90 LOOP
    appt_date := (CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day')::date;
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_id, demo_org_id, appt_date, ((9 + (i % 7)) || ':00:00')::time, (ARRAY['eye_exam', 'consultation', 'fitting', 'delivery', 'follow_up'])[1 + (i % 5)], CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, NULL, NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_id ORDER BY random() LIMIT 1;
    END IF;
  END LOOP;
  FOR i IN 1..50 LOOP
    appt_date := (CURRENT_DATE - (random() * days_back_2)::INT * INTERVAL '1 day')::date;
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_2_id, demo_org_id, appt_date, ((10 + (i % 6)) || ':00:00')::time, (ARRAY['eye_exam', 'consultation', 'fitting', 'delivery', 'follow_up'])[1 + (i % 5)], CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, 'Sucursal Providencia', NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_2_id ORDER BY random() LIMIT 1;
    END IF;
  END LOOP;

  -- ===== QUOTES =====
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
    quote_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 15
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'COT-MCL2-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - (random()*days_back_2)::INT, CURRENT_DATE - (random()*days_back_2)::INT + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', 129900, lens_family_id, 'progressive', 'polycarbonate', ARRAY['anti_reflective'], 'progressive', 65000, 189990, 30000, 15000, 299990, 56998, 0, 356988, 'CLP', (ARRAY['draft', 'sent', 'accepted'])[1 + (quote_num % 3)], 'Presupuesto Providencia', NOW() - (random()*days_back_2)::INT * INTERVAL '1 day')
      ON CONFLICT (quote_number) DO NOTHING;
      quote_num := quote_num + 1;
    END LOOP;
  END IF;

  -- ===== LAB WORK ORDERS =====
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
    wo_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 12
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      status_idx := 1 + (random() * 8)::int;
      INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'TRB-MCL2-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - (random()*days_back_2)::INT, rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective'], 'none', 45000, 59990, 30000, 15000, 28000, 149990, 28498, 0, 178488, 'CLP', status_list[status_idx], CASE status_list[status_idx] WHEN 'delivered' THEN 'paid' WHEN 'ready_for_pickup' THEN 'partial' ELSE 'pending' END, 'Trabajo Providencia', NOW() - (random()*days_back_2)::INT * INTERVAL '1 day', NOW() - (random()*(days_back_2-5))::INT * INTERVAL '1 day', NOW() - (random()*(days_back_2-10))::INT * INTERVAL '1 day', CASE WHEN status_list[status_idx] = 'delivered' THEN NOW() - (random()*30)::INT * INTERVAL '1 day' ELSE NULL END)
      ON CONFLICT (work_order_number) DO NOTHING;
      wo_num := wo_num + 1;
    END LOOP;
  END IF;

  -- ===== ORDERS =====
  ord_num := 1;
  FOR i IN 1..70 LOOP
    ord_date := (CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day')::date;
    total_amt := 80000 + (random()*200000)::int;
    INSERT INTO public.orders (branch_id, organization_id, order_number, status, total_amount, payment_status, payment_method_type, customer_name, email, subtotal, tax_amount, discount_amount, currency, is_pos_sale, pos_cashier_id, created_at, updated_at)
    SELECT demo_branch_id, demo_org_id, 'ORD-MCL1-' || TO_CHAR(ord_date, 'YYYY') || '-' || LPAD(ord_num::TEXT, 5, '0'), CASE WHEN random()>0.1 THEN 'delivered' ELSE 'processing' END, total_amt, CASE WHEN random()>0.15 THEN 'paid' ELSE 'pending' END, (ARRAY['cash', 'credit_card', 'debit_card', 'installments'])[1 + (random()*3)::int], c.first_name || ' ' || c.last_name, c.email, total_amt/1.19, total_amt/1.19*0.19, 0, 'CLP', random()>0.5, demo_admin_user_id, ord_date + INTERVAL '10 hours', ord_date + INTERVAL '10 hours'
    FROM public.customers c WHERE c.branch_id = demo_branch_id ORDER BY random() LIMIT 1
    ON CONFLICT (order_number) DO NOTHING;
    ord_num := ord_num + 1;
  END LOOP;
  ord_num := 1;
  FOR i IN 1..35 LOOP
    ord_date := (CURRENT_DATE - (random() * days_back_2)::INT * INTERVAL '1 day')::date;
    total_amt := 70000 + (random()*180000)::int;
    INSERT INTO public.orders (branch_id, organization_id, order_number, status, total_amount, payment_status, payment_method_type, customer_name, email, subtotal, tax_amount, discount_amount, currency, is_pos_sale, pos_cashier_id, created_at, updated_at)
    SELECT demo_branch_2_id, demo_org_id, 'ORD-MCL2-' || TO_CHAR(ord_date, 'YYYY') || '-' || LPAD(ord_num::TEXT, 5, '0'), CASE WHEN random()>0.1 THEN 'delivered' ELSE 'processing' END, total_amt, CASE WHEN random()>0.12 THEN 'paid' ELSE 'pending' END, (ARRAY['cash', 'credit_card', 'debit_card'])[1 + (random()*2)::int], c.first_name || ' ' || c.last_name, c.email, total_amt/1.19, total_amt/1.19*0.19, 0, 'CLP', random()>0.5, demo_admin_user_id, ord_date + INTERVAL '11 hours', ord_date + INTERVAL '11 hours'
    FROM public.customers c WHERE c.branch_id = demo_branch_2_id ORDER BY random() LIMIT 1
    ON CONFLICT (order_number) DO NOTHING;
    ord_num := ord_num + 1;
  END LOOP;

  -- ===== ORDER_ITEMS =====
  FOR ord_rec IN SELECT o.id, o.total_amount FROM public.orders o WHERE o.branch_id IN (demo_branch_id, demo_branch_2_id) AND o.organization_id = demo_org_id LIMIT 90
  LOOP
    SELECT p.id, p.name, p.sku, p.price INTO prod_rec FROM public.products p WHERE p.organization_id = demo_org_id ORDER BY random() LIMIT 1;
    IF prod_rec.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = ord_rec.id LIMIT 1) THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price, product_name, sku, created_at)
      VALUES (ord_rec.id, prod_rec.id, 1, prod_rec.price, prod_rec.price, prod_rec.name, prod_rec.sku, NOW());
    END IF;
  END LOOP;

  -- ===== ORDER_PAYMENTS =====
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
  WHERE o.branch_id IN (demo_branch_id, demo_branch_2_id) AND o.organization_id = demo_org_id AND o.payment_status = 'paid'
  AND NOT EXISTS (SELECT 1 FROM public.order_payments op WHERE op.order_id = o.id LIMIT 1);

  -- ===== CASH REGISTER CLOSURES + POS SESSIONS =====
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
    FOR i IN 0..days_back_2 LOOP
      appt_date := (CURRENT_DATE - (i || ' days')::INTERVAL)::date;
      IF EXTRACT(DOW FROM appt_date) != 0 AND EXTRACT(DOW FROM appt_date) != 6 THEN
        INSERT INTO public.cash_register_closures (branch_id, closure_date, closed_by, opening_cash_amount, total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales, expected_cash, actual_cash, cash_difference, card_machine_debit_total, card_machine_credit_total, total_subtotal, total_tax, total_discounts, closing_cash_amount, status, opened_at, closed_at, created_at)
        VALUES (demo_branch_2_id, appt_date, demo_admin_user_id, 40000+(random()*120000)::int, 150000+(random()*350000)::int, 4+(random()*18)::int, (150000+(random()*350000)::int)*(0.35+random()*0.15), (150000+(random()*350000)::int)*(0.2+random()*0.1), (150000+(random()*350000)::int)*(0.2+random()*0.15), 0, 0, 40000+(random()*120000)::int, 40000+(random()*120000)::int, (random()*1500-750)::int, (150000+(random()*350000)::int)*0.22, (150000+(random()*350000)::int)*0.25, (150000+(random()*350000)::int)/1.19, (150000+(random()*350000)::int)/1.19*0.19, 0, 40000+(random()*120000)::int, 'confirmed', (appt_date||' 09:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz)
        ON CONFLICT (branch_id, closure_date) DO NOTHING;
        INSERT INTO public.pos_sessions (cashier_id, terminal_id, location, branch_id, opening_cash_amount, closing_cash_amount, opening_time, closing_time, status, created_at, updated_at)
        SELECT demo_admin_user_id, 'TERMINAL-MCL2', 'Sucursal Providencia', demo_branch_2_id, 40000+(random()*120000)::int, 40000+(random()*120000)::int + 150000+(random()*350000)::int, (appt_date||' 09:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz, 'closed', NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM public.pos_sessions ps WHERE ps.branch_id = demo_branch_2_id AND ps.opening_time::date = appt_date LIMIT 1);
      END IF;
    END LOOP;

    FOR sess_rec IN SELECT ps.id, ps.branch_id, ps.opening_time::date AS sess_date FROM public.pos_sessions ps WHERE ps.branch_id IN (demo_branch_id, demo_branch_2_id) AND ps.status = 'closed' LIMIT 200
    LOOP
      INSERT INTO public.pos_transactions (order_id, pos_session_id, transaction_type, payment_method, amount, created_at, updated_at)
      SELECT o.id, sess_rec.id, 'sale', CASE o.payment_method_type WHEN 'credit_card' THEN 'credit' WHEN 'debit_card' THEN 'debit' ELSE 'cash' END, o.total_amount, o.created_at, o.updated_at
      FROM public.orders o
      WHERE o.branch_id = sess_rec.branch_id AND o.is_pos_sale = true AND o.payment_status = 'paid'
      AND o.created_at::date = sess_rec.sess_date
      AND NOT EXISTS (SELECT 1 FROM public.pos_transactions pt WHERE pt.order_id = o.id LIMIT 1)
      LIMIT 5;
    END LOOP;
  END IF;

  -- ===== OPTICAL INTERNAL SUPPORT TICKETS =====
  IF is_demo_admin THEN
    ticket_num := 1;
    FOR cust_rec IN SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.branch_id FROM public.customers c WHERE c.branch_id = demo_branch_2_id LIMIT 10
    LOOP
      INSERT INTO public.optical_internal_support_tickets (ticket_number, organization_id, branch_id, customer_id, customer_name, customer_email, customer_phone, created_by_user_id, subject, description, category, priority, status, created_at, updated_at)
      VALUES ('OPT-MCL2-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(ticket_num::TEXT, 4, '0'), demo_org_id, cust_rec.branch_id, cust_rec.id, cust_rec.first_name || ' ' || cust_rec.last_name, cust_rec.email, cust_rec.phone, demo_admin_user_id, 'Consulta Providencia - ' || cust_rec.first_name, 'Cliente consulta sobre entrega de lentes.', (ARRAY['lens_issue', 'frame_issue', 'delivery_issue', 'customer_complaint'])[1 + (random()*3)::int], (ARRAY['low', 'medium', 'high'])[1 + (random()*2)::int], (ARRAY['open', 'assigned', 'in_progress', 'resolved', 'closed'])[1 + (random()*4)::int], NOW() - (random()*45)::INT * INTERVAL '1 day', NOW())
      ON CONFLICT (ticket_number) DO NOTHING;
      ticket_num := ticket_num + 1;
    END LOOP;
  END IF;

  -- ===== APPOINTMENTS (guest) =====
  FOR d IN 0..13 LOOP
    appt_date := (CURRENT_DATE + (d || ' days')::INTERVAL)::date;
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (branch_id, organization_id, guest_first_name, guest_last_name, guest_rut, guest_email, guest_phone, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      VALUES 
        (demo_branch_id, demo_org_id, 'Invitado' || d, 'Demo' || d, '22.222.222-' || (d % 10), 'invitado' || d || '@test.cl', '+56 9 7777 777' || d, appt_date, ((10 + (d % 5)) || ':00:00')::time, (ARRAY['eye_exam', 'consultation', 'fitting'])[1 + (d % 3)], 'scheduled', 'Cita invitado', NOW()),
        (demo_branch_2_id, demo_org_id, 'Visitante' || d, 'Prov' || d, '33.333.333-' || (d % 10), 'visitante' || d || '@test.cl', '+56 9 8888 888' || d, appt_date, ((11 + (d % 4)) || ':00:00')::time, (ARRAY['consultation', 'fitting', 'delivery'])[1 + (d % 3)], 'scheduled', 'Cita invitado Providencia', NOW());
    END IF;
  END LOOP;
END;
$$;

