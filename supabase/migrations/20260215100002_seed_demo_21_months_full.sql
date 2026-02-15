-- Migration: Extend demo seed to 21 months with full POS, cash register, and sidebar data
-- Adds: pos_sessions, pos_transactions, schedule_settings, quote_settings, pos_settings,
--       order_items, optical_internal_support_tickets. Extends all data to 21 months.
-- Also: fallback for closed_by when no demo admin exists (use any auth user).

-- ===== 1. Add optical_internal_support to reset_demo_organization DELETE list =====
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
  -- Delete in order respecting foreign keys (children first)
  DELETE FROM public.optical_internal_support_messages
  WHERE ticket_id IN (SELECT id FROM public.optical_internal_support_tickets WHERE organization_id = demo_org_id);

  DELETE FROM public.optical_internal_support_tickets WHERE organization_id = demo_org_id;

  DELETE FROM public.credit_note_movements
  WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id IN (demo_branch_id, demo_branch_2_id));

  DELETE FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id IN (demo_branch_id, demo_branch_2_id);

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

  -- Re-insert organization
  INSERT INTO public.organizations (id, name, slug, subscription_tier, status, metadata, created_at)
  VALUES (demo_org_id, 'Óptica Demo Global', 'optica-demo-global', 'premium', 'active', '{"is_demo": true, "description": "Organización demo para onboarding y evaluación del sistema"}'::jsonb, NOW() - INTERVAL '6 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, subscription_tier = EXCLUDED.subscription_tier, status = EXCLUDED.status, metadata = EXCLUDED.metadata;

  -- Re-insert Branch 1 (Casa Matriz)
  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES (demo_branch_id, 'Casa Matriz', 'DEMO-001', demo_org_id, 'Av. Providencia 1234', 'Santiago', 'Región Metropolitana', '7500000', 'Chile', '+56 2 2345 6789', 'demo@optica-demo.cl', true, NOW() - INTERVAL '6 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, organization_id = EXCLUDED.organization_id, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, country = EXCLUDED.country, phone = EXCLUDED.phone, email = EXCLUDED.email, is_active = EXCLUDED.is_active;

  -- Re-insert Branch 2 (Sucursal Providencia)
  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES (demo_branch_2_id, 'Sucursal Providencia', 'DEMO-002', demo_org_id, 'Av. Apoquindo 4567', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', '+56 2 2345 6790', 'providencia@optica-demo.cl', true, NOW() - INTERVAL '6 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, organization_id = EXCLUDED.organization_id, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, country = EXCLUDED.country, phone = EXCLUDED.phone, email = EXCLUDED.email, is_active = EXCLUDED.is_active;

  -- Re-insert customers (same as before)
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, demo_branch_id, demo_org_id, 'María', 'González', 'maria.gonzalez@email.com', '+56 9 1234 5678', '12.345.678-9', '1985-03-15', 'female', 'Av. Las Condes 456', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-01-15', '2026-01-15', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '2 years', NOW()),
  ('10000000-0000-0000-0000-000000000002'::uuid, demo_branch_id, demo_org_id, 'Juan', 'Pérez', 'juan.perez@email.com', '+56 9 2345 6789', '13.456.789-0', '1990-07-22', 'male', 'Calle Los Rosales 789', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-10', '2026-01-10', 'phone', 'Fonasa', true, NOW() - INTERVAL '18 months', NOW()),
  ('10000000-0000-0000-0000-000000000003'::uuid, demo_branch_id, demo_org_id, 'Ana', 'Martínez', 'ana.martinez@email.com', '+56 9 3456 7890', '14.567.890-1', '1988-11-08', 'female', 'Pasaje Los Aromos 321', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Hipermetropía', 'Presbicia'], ARRAY[]::TEXT[], '2024-12-20', '2025-12-20', 'whatsapp', 'Isapre Colmena', true, NOW() - INTERVAL '3 years', NOW()),
  ('10000000-0000-0000-0000-000000000004'::uuid, demo_branch_id, demo_org_id, 'Carlos', 'Rodríguez', 'carlos.rodriguez@email.com', '+56 9 4567 8901', '15.678.901-2', '1975-05-30', 'male', 'Av. Vitacura 1234', 'Vitacura', 'Región Metropolitana', '7630000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2025-01-05', '2026-01-05', 'email', 'Isapre Banmédica', true, NOW() - INTERVAL '4 years', NOW()),
  ('10000000-0000-0000-0000-000000000005'::uuid, demo_branch_id, demo_org_id, 'Laura', 'Sánchez', 'laura.sanchez@email.com', '+56 9 5678 9012', '16.789.012-3', '1992-09-14', 'female', 'Calle Los Claveles 567', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Miopía', 'Astigmatismo'], ARRAY[]::TEXT[], '2024-11-28', '2025-11-28', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 year', NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  SELECT ('10000000-0000-0000-0000-' || LPAD(ser.n::text, 12, '0'))::uuid, demo_branch_id, demo_org_id, 'Cliente' || ser.n, 'Demo' || ser.n, 'cliente' || ser.n || '@email.com', '+56 9 0000 000' || ser.n, '99.999.999-' || ser.n, '1990-01-01', CASE WHEN ser.n % 2 = 0 THEN 'male' ELSE 'female' END, 'Calle Demo ' || ser.n, 'Santiago', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE + INTERVAL '1 year', 'email', 'Fonasa', true, NOW() - INTERVAL '1 year', NOW()
  FROM generate_series(6, 25) AS ser(n)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
  ('11000000-0000-0000-0000-000000000001'::uuid, demo_branch_2_id, demo_org_id, 'Elena', 'Vega', 'elena.vega@providencia.cl', '+56 9 1111 1111', '11.111.111-1', '1982-04-20', 'female', 'Av. Apoquindo 100', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-02-01', '2026-02-01', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '2 years', NOW()),
  ('11000000-0000-0000-0000-000000000002'::uuid, demo_branch_2_id, demo_org_id, 'Roberto', 'Molina', 'roberto.molina@providencia.cl', '+56 9 2222 2222', '11.222.222-2', '1978-09-15', 'male', 'Calle San Damián 200', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-11-10', '2025-11-10', 'whatsapp', 'Fonasa', true, NOW() - INTERVAL '18 months', NOW()),
  ('11000000-0000-0000-0000-000000000003'::uuid, demo_branch_2_id, demo_org_id, 'Claudia', 'Soto', 'claudia.soto@providencia.cl', '+56 9 3333 3333', '11.333.333-3', '1991-12-03', 'female', 'Av. Las Condes 300', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-20', '2026-01-20', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 year', NOW()),
  ('11000000-0000-0000-0000-000000000004'::uuid, demo_branch_2_id, demo_org_id, 'Pablo', 'Contreras', 'pablo.contreras@providencia.cl', '+56 9 4444 4444', '11.444.444-4', '1985-06-28', 'male', 'Pasaje Los Dominicos 400', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2024-10-05', '2025-10-05', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '2 years', NOW()),
  ('11000000-0000-0000-0000-000000000005'::uuid, demo_branch_2_id, demo_org_id, 'Francisca', 'Lagos', 'francisca.lagos@providencia.cl', '+56 9 5555 5555', '11.555.555-5', '1994-03-12', 'female', 'Av. Kennedy 500', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-09-15', '2025-09-15', 'sms', 'Fonasa', true, NOW() - INTERVAL '8 months', NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  SELECT ('11000000-0000-0000-0000-' || LPAD(ser.n::text, 12, '0'))::uuid, demo_branch_2_id, demo_org_id, 'ClienteProv' || ser.n, 'Demo' || ser.n, 'prov' || ser.n || '@providencia.cl', '+56 9 6666 666' || ser.n, '11.666.666-' || ser.n, '1988-01-01', CASE WHEN ser.n % 2 = 0 THEN 'female' ELSE 'male' END, 'Av. Providencia ' || (ser.n * 100), 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE + INTERVAL '1 year', 'email', 'Fonasa', true, NOW() - INTERVAL '1 year', NOW()
  FROM generate_series(6, 25) AS ser(n)
  ON CONFLICT (id) DO NOTHING;

  PERFORM public.seed_demo_organization_data();
END;
$$;

-- ===== 2. Replace seed_demo_organization_data with 21-month full version =====
CREATE OR REPLACE FUNCTION public.seed_demo_organization_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_branch_2_id UUID := '00000000-0000-0000-0000-000000000003'::uuid;
  marcos_cat_id UUID;
  lentes_sol_cat_id UUID;
  accesorios_cat_id UUID;
  servicios_cat_id UUID;
  demo_admin_user_id UUID;
  mono_basico_id UUID;
  mono_poly_id UUID;
  bifocal_flat_id UUID;
  prog_basico_id UUID;
  prog_comfort_id UUID;
  mono_polarizado_id UUID;
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
  ticket_num INTEGER;
  appt_date DATE;
  ord_date DATE;
  status_idx INTEGER;
  status_list TEXT[] := ARRAY['ordered', 'sent_to_lab', 'in_progress_lab', 'ready_at_lab', 'received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered'];
  days_back INTEGER := 630;
  total_amt INTEGER;
  is_demo_admin BOOLEAN := false;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);
  SELECT id INTO marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;

  -- Demo admin from org (for support tickets FK), or any auth user (for closed_by, cashier_id)
  SELECT id INTO demo_admin_user_id FROM public.admin_users WHERE organization_id = demo_org_id LIMIT 1;
  IF demo_admin_user_id IS NOT NULL THEN
    is_demo_admin := true;
  ELSE
    SELECT id INTO demo_admin_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  -- ===== 1. LENS FAMILIES (with organization_id) =====
  INSERT INTO public.lens_families (id, name, brand, lens_type, lens_material, description, is_active, organization_id, created_at)
  VALUES
  ('40000000-0000-0000-0000-000000000001'::uuid, 'Monofocal Básico CR-39 AR', 'Genérico', 'single_vision', 'cr39', 'Lente monofocal estándar con antirreflejo básico.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000002'::uuid, 'Monofocal Policarbonato Blue Cut', 'Essilor', 'single_vision', 'polycarbonate', 'Monofocal resistente con filtro de luz azul.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000003'::uuid, 'Monofocal Alto Índice 1.67 AR Premium', 'Hoya', 'single_vision', 'high_index_1_67', 'Lente delgado para graduaciones medias-altas.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000004'::uuid, 'Monofocal Alto Índice 1.74 AR Ultra Delgado', 'Zeiss', 'single_vision', 'high_index_1_74', 'Lente ultra delgado para graduaciones muy altas.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000005'::uuid, 'Monofocal Antifatiga Digital', 'Rodenstock', 'single_vision', 'cr39', 'Lente de confort para pantallas.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000006'::uuid, 'Monofocal Fotocromático CR-39', 'Transitions', 'single_vision', 'cr39', 'Lente que se oscurece con luz UV.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000007'::uuid, 'Bifocal Flat Top 28mm CR-39', 'Genérico', 'bifocal', 'cr39', 'Bifocal económico y funcional.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000008'::uuid, 'Bifocal Invisilens Policarbonato', 'Essilor', 'bifocal', 'polycarbonate', 'Bifocal de policarbonato resistente.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000009'::uuid, 'Progresivo Básico CR-39 FreeForm', 'Genérico', 'progressive', 'cr39', 'Progresivo de entrada FreeForm.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000010'::uuid, 'Progresivo Comfort Policarbonato', 'Essilor', 'progressive', 'polycarbonate', 'Progresivo Varilux Comfort.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000011'::uuid, 'Progresivo Individualizado Alto Índice 1.67', 'Zeiss', 'progressive', 'high_index_1_67', 'Progresivo Zeiss Individual 2.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000012'::uuid, 'Progresivo para Conducción 1.74', 'Hoya', 'progressive', 'high_index_1_74', 'Progresivo optimizado para conducción.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000013'::uuid, 'Progresivo Digital Blue Defense', 'Genérico', 'progressive', 'polycarbonate', 'Progresivo con filtro azul.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000014'::uuid, 'Ocupacional Office Policarbonato', 'Rodenstock', 'computer', 'polycarbonate', 'Lente para oficina.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000015'::uuid, 'Lectura Extendida CR-39', 'Genérico', 'reading', 'cr39', 'Lente para lectura.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000016'::uuid, 'Monofocal Polarizado Gris Policarbonato', 'Genérico', 'single_vision', 'polycarbonate', 'Monofocal polarizado para sol.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000017'::uuid, 'Progresivo Espejado Azul 1.67', 'Essilor', 'progressive', 'high_index_1_67', 'Progresivo espejado para sol.', true, demo_org_id, NOW()),
  ('40000000-0000-0000-0000-000000000018'::uuid, 'Sports Visión CR-39 Tinte Café', 'Zeiss', 'sports', 'cr39', 'Lente deportivo tinte café.', true, demo_org_id, NOW())
  ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, name = EXCLUDED.name;

  -- ===== 2. LENS PRICE MATRICES =====
  SELECT id INTO mono_basico_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000001'::uuid;
  SELECT id INTO mono_poly_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000002'::uuid;
  SELECT id INTO bifocal_flat_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000007'::uuid;
  SELECT id INTO prog_basico_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000009'::uuid;
  SELECT id INTO prog_comfort_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000010'::uuid;
  SELECT id INTO mono_polarizado_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000016'::uuid;
  IF mono_basico_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (mono_basico_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 29990, 9990, 'stock', true), (mono_basico_id, -6.00, -4.25, -2.00, 2.00, 0.00, 0.00, 39990, 14990, 'surfaced', true), (mono_basico_id, 4.25, 6.00, -2.00, 2.00, 0.00, 0.00, 39990, 14990, 'surfaced', true);
  END IF;
  IF mono_poly_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (mono_poly_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 59990, 24990, 'stock', true), (mono_poly_id, -6.00, -4.25, -4.00, 4.00, 0.00, 0.00, 79990, 34990, 'surfaced', true);
  END IF;
  IF bifocal_flat_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (bifocal_flat_id, -4.00, 4.00, -2.00, 2.00, 1.00, 2.50, 49990, 19990, 'surfaced', true);
  END IF;
  IF prog_basico_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (prog_basico_id, -4.00, 4.00, -2.00, 2.00, 0.75, 1.75, 99990, 39990, 'surfaced', true), (prog_basico_id, -4.00, 4.00, -2.00, 2.00, 2.00, 3.00, 109990, 44990, 'surfaced', true);
  END IF;
  IF prog_comfort_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (prog_comfort_id, -4.00, 4.00, -2.00, 2.00, 0.75, 1.75, 189990, 79990, 'surfaced', true), (prog_comfort_id, -4.00, 4.00, -2.00, 2.00, 2.00, 3.00, 209990, 89990, 'surfaced', true);
  END IF;
  IF mono_polarizado_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (mono_polarizado_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 89990, 39990, 'surfaced', true);
  END IF;

  -- ===== 3. CONTACT LENS FAMILIES =====
  INSERT INTO public.contact_lens_families (id, organization_id, name, brand, use_type, modality, material, packaging, base_curve, diameter, description, is_active, created_at)
  VALUES ('70000000-0000-0000-0000-000000000001'::uuid, demo_org_id, 'Acuvue Oasys 1-Day', 'Johnson & Johnson', 'daily', 'spherical', 'silicone_hydrogel', 'box_30', 8.50, 14.30, 'Lentes diarios hidrogel silicona.', true, NOW()),
  ('70000000-0000-0000-0000-000000000002'::uuid, demo_org_id, 'Air Optix Plus HydraGlyde for Astigmatism', 'Alcon', 'monthly', 'toric', 'silicone_hydrogel', 'box_6', 8.70, 14.50, 'Lentes mensuales para astigmatismo.', true, NOW())
  ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;
  INSERT INTO public.contact_lens_price_matrices (contact_lens_family_id, organization_id, sphere_min, sphere_max, cylinder_min, cylinder_max, axis_min, axis_max, addition_min, addition_max, base_price, cost, is_active)
  SELECT id, demo_org_id, -6.00, -0.50, 0.00, 0.00, 0, 0, 0.00, 0.00, 29990, 14990, true FROM public.contact_lens_families WHERE id = '70000000-0000-0000-0000-000000000001'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.contact_lens_price_matrices WHERE contact_lens_family_id = '70000000-0000-0000-0000-000000000001'::uuid AND sphere_min = -6.00 LIMIT 1);
  INSERT INTO public.contact_lens_price_matrices (contact_lens_family_id, organization_id, sphere_min, sphere_max, cylinder_min, cylinder_max, axis_min, axis_max, addition_min, addition_max, base_price, cost, is_active)
  SELECT id, demo_org_id, -6.00, -0.50, -1.75, -0.75, 10, 180, 0.00, 0.00, 39990, 19990, true FROM public.contact_lens_families WHERE id = '70000000-0000-0000-0000-000000000002'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.contact_lens_price_matrices WHERE contact_lens_family_id = '70000000-0000-0000-0000-000000000002'::uuid AND sphere_min = -6.00 LIMIT 1);

  -- ===== 4. PRODUCTS =====
  IF marcos_cat_id IS NOT NULL AND lentes_sol_cat_id IS NOT NULL AND accesorios_cat_id IS NOT NULL AND servicios_cat_id IS NOT NULL THEN
    INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, is_featured, price_includes_tax, featured_image, created_at)
    VALUES ('20000000-0000-0000-0000-000000000001'::uuid, demo_branch_id, demo_org_id, 'Marco Ray-Ban RB2140', 'marco-ray-ban-rb2140', 'Marco clásico aviador Ray-Ban.', 89900, 45000, marcos_cat_id, 'RB-2140-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000002'::uuid, demo_branch_id, demo_org_id, 'Marco Oakley OO9208', 'marco-oakley-oo9208', 'Marco deportivo Oakley.', 129900, 65000, marcos_cat_id, 'OO-9208-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000003'::uuid, demo_branch_id, demo_org_id, 'Marco Gucci GG0061', 'marco-gucci-gg0061', 'Marco de lujo Gucci.', 249900, 125000, marcos_cat_id, 'GG-0061-BRN', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000004'::uuid, demo_branch_id, demo_org_id, 'Marco Prada PR17VS', 'marco-prada-pr17vs', 'Marco Prada elegante.', 199900, 100000, marcos_cat_id, 'PR-17VS-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000005'::uuid, demo_branch_id, demo_org_id, 'Marco Versace VE4289', 'marco-versace-ve4289', 'Marco Versace sofisticado.', 179900, 90000, marcos_cat_id, 'VE-4289-GLD', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000011'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Ray-Ban Aviator', 'gafas-sol-ray-ban-aviator', 'Gafas de sol Ray-Ban Aviator.', 119900, 60000, lentes_sol_cat_id, 'RB-AVI-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000012'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Oakley Holbrook', 'gafas-sol-oakley-holbrook', 'Gafas Oakley polarizadas.', 149900, 75000, lentes_sol_cat_id, 'OO-HOL-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW())
    ON CONFLICT (slug) DO NOTHING;
    INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, price_includes_tax, featured_image, created_at)
    VALUES ('20000000-0000-0000-0000-000000000016'::uuid, demo_branch_id, demo_org_id, 'Estuche Rígido Premium', 'estuche-rigido-premium', 'Estuche rígido para lentes.', 12900, 5000, accesorios_cat_id, 'ACC-EST-RIG', 'active', true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000017'::uuid, demo_branch_id, demo_org_id, 'Paño de Limpieza Microfibra', 'pano-limpieza-microfibra', 'Paño microfibra para lentes.', 4900, 2000, accesorios_cat_id, 'ACC-PANO-MIC', 'active', true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW())
    ON CONFLICT (slug) DO NOTHING;
    INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, price_includes_tax, created_at)
    VALUES ('20000000-0000-0000-0000-000000000021'::uuid, demo_branch_id, demo_org_id, 'Reparación de Marco', 'reparacion-marco', 'Servicio de reparación de marco.', 19900, 0, servicios_cat_id, 'SERV-REP-MAR', 'active', true, NOW()),
    ('20000000-0000-0000-0000-000000000022'::uuid, demo_branch_id, demo_org_id, 'Montaje de Lentes', 'montaje-lentes', 'Servicio de montaje de lentes.', 29900, 0, servicios_cat_id, 'SERV-MON-LEN', 'active', true, NOW()),
    ('20000000-0000-0000-0000-000000000024'::uuid, demo_branch_id, demo_org_id, 'Examen de la Vista', 'examen-vista', 'Examen completo con optometrista.', 25000, 0, servicios_cat_id, 'SERV-EXA-VIS', 'active', true, NOW())
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  -- ===== 5. PRODUCT BRANCH STOCK (both branches) =====
  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, demo_branch_id, CASE WHEN p.category_id = marcos_cat_id THEN 15 + (random()*10)::int WHEN p.category_id = lentes_sol_cat_id THEN 20 + (random()*15)::int ELSE 30 END, 5, NOW()
  FROM public.products p WHERE p.organization_id = demo_org_id
  ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, demo_branch_2_id, CASE WHEN p.category_id = marcos_cat_id THEN 10 + (random()*8)::int WHEN p.category_id = lentes_sol_cat_id THEN 15 + (random()*10)::int ELSE 25 END, 5, NOW()
  FROM public.products p WHERE p.organization_id = demo_org_id
  ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();

  -- ===== 6. PRESCRIPTIONS =====
  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-DEMO1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::TEXT, 3, '0'), 'Dr. Carlos Méndez', 'OPTO-12345', -1.5 - (random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), -1.5-(random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.branch_id = demo_branch_id
  AND NOT EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id LIMIT 1)
  LIMIT 25;

  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-PROV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::TEXT, 3, '0'), 'Dr. Carlos Méndez', 'OPTO-20000', -1.5 - (random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), -1.5-(random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.branch_id = demo_branch_2_id
  AND NOT EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id LIMIT 1)
  LIMIT 25;

  -- ===== 7. SCHEDULE_SETTINGS, QUOTE_SETTINGS, POS_SETTINGS (per branch) =====
  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES (demo_branch_id, demo_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"09:00","end_time":"13:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET slot_duration_minutes = EXCLUDED.slot_duration_minutes;

  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES (demo_branch_2_id, demo_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"10:00","end_time":"14:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET slot_duration_minutes = EXCLUDED.slot_duration_minutes;

  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  SELECT demo_branch_id, demo_org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.quote_settings WHERE branch_id = demo_branch_id);

  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  SELECT demo_branch_2_id, demo_org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.quote_settings WHERE branch_id = demo_branch_2_id);

  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (demo_branch_id, 50.00, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET min_deposit_percent = EXCLUDED.min_deposit_percent;

  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (demo_branch_2_id, 50.00, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET min_deposit_percent = EXCLUDED.min_deposit_percent;

  -- ===== 8. APPOINTMENTS (21 months, both branches) =====
  FOR i IN 1..250 LOOP
    appt_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_id, demo_org_id, appt_date, ((9 + (i % 7)) || ':00:00')::time, CASE i%3 WHEN 0 THEN 'eye_exam' WHEN 1 THEN 'consultation' ELSE 'adjustment' END, CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, NULL, NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_id ORDER BY random() LIMIT 1
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  FOR i IN 1..250 LOOP
    appt_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_2_id, demo_org_id, appt_date, ((10 + (i % 6)) || ':00:00')::time, CASE i%3 WHEN 0 THEN 'consultation' WHEN 1 THEN 'eye_exam' ELSE 'delivery' END, CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, 'Sucursal Providencia', NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_2_id ORDER BY random() LIMIT 1
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- ===== 9. QUOTES (both branches, more) =====
  SELECT id INTO frame_product_id FROM public.products WHERE organization_id = demo_org_id AND category_id = marcos_cat_id LIMIT 1;
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000010'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    quote_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
      VALUES (cust_rec.id, demo_branch_id, 'COT-DEMO1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - (random()*180)::INT, CURRENT_DATE - (random()*180)::INT + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', 89900, lens_family_id, 'progressive', 'polycarbonate', ARRAY['anti_reflective', 'blue_light_filter'], 'progressive', 45000, 189990, 35000, 15000, 284990, 54148, 0, 339138, 'CLP', CASE WHEN random()>0.4 THEN 'accepted' WHEN random()>0.2 THEN 'sent' ELSE 'draft' END, 'Presupuesto demo', NOW() - (random()*180)::INT)
      ON CONFLICT (quote_number) DO NOTHING;
      quote_num := quote_num + 1;
    END LOOP;
    quote_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'COT-PROV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - (random()*180)::INT, CURRENT_DATE - (random()*180)::INT + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', 129900, lens_family_id, 'progressive', 'polycarbonate', ARRAY['anti_reflective'], 'progressive', 65000, 189990, 30000, 15000, 299990, 56998, 0, 356988, 'CLP', CASE WHEN random()>0.5 THEN 'accepted' WHEN random()>0.25 THEN 'sent' ELSE 'draft' END, 'Presupuesto Providencia', NOW() - (random()*180)::INT)
      ON CONFLICT (quote_number) DO NOTHING;
      quote_num := quote_num + 1;
    END LOOP;
  END IF;

  -- ===== 10. LAB WORK ORDERS (both branches, more) =====
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000002'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    wo_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      status_idx := 1 + (random() * 8)::int;
      INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
      VALUES (cust_rec.id, demo_branch_id, 'TRB-DEMO1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - (random()*270)::INT, rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective', 'blue_light_filter'], 'none', 65000, 59990, 35000, 15000, 30000, 169990, 32298, 0, 202288, 'CLP', status_list[status_idx], CASE status_list[status_idx] WHEN 'delivered' THEN 'paid' WHEN 'ready_for_pickup' THEN 'partial' ELSE 'pending' END, 'Trabajo demo', NOW() - (random()*270)::INT, NOW() - (random()*265)::INTERVAL, NOW() - (random()*260)::INTERVAL, CASE WHEN status_list[status_idx] = 'delivered' THEN NOW() - (random()*90)::INTERVAL ELSE NULL END)
      ON CONFLICT (work_order_number) DO NOTHING;
      wo_num := wo_num + 1;
    END LOOP;
    wo_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      status_idx := 1 + (random() * 8)::int;
      INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'TRB-PROV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - (random()*270)::INT, rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective'], 'none', 45000, 59990, 30000, 15000, 28000, 149990, 28498, 0, 178488, 'CLP', status_list[status_idx], CASE status_list[status_idx] WHEN 'delivered' THEN 'paid' WHEN 'ready_for_pickup' THEN 'partial' ELSE 'pending' END, 'Trabajo Providencia', NOW() - (random()*270)::INT, NOW() - (random()*265)::INTERVAL, NOW() - (random()*260)::INTERVAL, CASE WHEN status_list[status_idx] = 'delivered' THEN NOW() - (random()*90)::INTERVAL ELSE NULL END)
      ON CONFLICT (work_order_number) DO NOTHING;
      wo_num := wo_num + 1;
    END LOOP;
  END IF;

  -- ===== 11. ORDERS (21 months, both branches, with is_pos_sale for some) =====
  ord_num := 1;
  FOR i IN 1..150 LOOP
    ord_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    total_amt := 80000 + (random()*200000)::int;
    INSERT INTO public.orders (branch_id, organization_id, order_number, status, total_amount, payment_status, payment_method_type, customer_name, email, subtotal, tax_amount, discount_amount, currency, is_pos_sale, pos_cashier_id, created_at, updated_at)
    SELECT demo_branch_id, demo_org_id, 'ORD-DEMO1-' || TO_CHAR(ord_date, 'YYYY') || '-' || LPAD(ord_num::TEXT, 5, '0'), CASE WHEN random()>0.1 THEN 'delivered' ELSE 'processing' END, total_amt, CASE WHEN random()>0.15 THEN 'paid' ELSE 'pending' END, (ARRAY['cash', 'credit_card', 'debit_card', 'installments'])[1 + (random()*3)::int], c.first_name || ' ' || c.last_name, c.email, total_amt/1.19, total_amt/1.19*0.19, 0, 'CLP', random()>0.5, demo_admin_user_id, ord_date + INTERVAL '10 hours', ord_date + INTERVAL '10 hours'
    FROM public.customers c WHERE c.branch_id = demo_branch_id ORDER BY random() LIMIT 1
    ON CONFLICT (order_number) DO NOTHING;
    ord_num := ord_num + 1;
  END LOOP;
  ord_num := 1;
  FOR i IN 1..150 LOOP
    ord_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    total_amt := 70000 + (random()*180000)::int;
    INSERT INTO public.orders (branch_id, organization_id, order_number, status, total_amount, payment_status, payment_method_type, customer_name, email, subtotal, tax_amount, discount_amount, currency, is_pos_sale, pos_cashier_id, created_at, updated_at)
    SELECT demo_branch_2_id, demo_org_id, 'ORD-PROV-' || TO_CHAR(ord_date, 'YYYY') || '-' || LPAD(ord_num::TEXT, 5, '0'), CASE WHEN random()>0.1 THEN 'delivered' ELSE 'processing' END, total_amt, CASE WHEN random()>0.12 THEN 'paid' ELSE 'pending' END, (ARRAY['cash', 'credit_card', 'debit_card'])[1 + (random()*2)::int], c.first_name || ' ' || c.last_name, c.email, total_amt/1.19, total_amt/1.19*0.19, 0, 'CLP', random()>0.5, demo_admin_user_id, ord_date + INTERVAL '11 hours', ord_date + INTERVAL '11 hours'
    FROM public.customers c WHERE c.branch_id = demo_branch_2_id ORDER BY random() LIMIT 1
    ON CONFLICT (order_number) DO NOTHING;
    ord_num := ord_num + 1;
  END LOOP;

  -- ===== 12. ORDER_ITEMS (link products to orders) =====
  FOR ord_rec IN SELECT o.id, o.total_amount FROM public.orders o WHERE o.branch_id IN (demo_branch_id, demo_branch_2_id) AND o.organization_id = demo_org_id LIMIT 100
  LOOP
    SELECT p.id, p.name, p.sku, p.price INTO prod_rec FROM public.products p WHERE p.organization_id = demo_org_id ORDER BY random() LIMIT 1;
    IF prod_rec.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = ord_rec.id LIMIT 1) THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price, product_name, sku, created_at)
      VALUES (ord_rec.id, prod_rec.id, 1, prod_rec.price, prod_rec.price, prod_rec.name, prod_rec.sku, NOW());
    END IF;
  END LOOP;

  -- ===== 13. CASH REGISTER CLOSURES + POS SESSIONS (6 months to avoid timeout; ~130 days each branch) =====
  IF demo_admin_user_id IS NOT NULL THEN
    FOR i IN 0..179 LOOP
      appt_date := (CURRENT_DATE - (i || ' days')::INTERVAL)::date;
      IF EXTRACT(DOW FROM appt_date) != 0 AND EXTRACT(DOW FROM appt_date) != 6 THEN
        INSERT INTO public.cash_register_closures (branch_id, closure_date, closed_by, opening_cash_amount, total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales, expected_cash, actual_cash, cash_difference, card_machine_debit_total, card_machine_credit_total, total_subtotal, total_tax, total_discounts, closing_cash_amount, status, opened_at, closed_at, created_at)
        VALUES (demo_branch_id, appt_date, demo_admin_user_id, 50000+(random()*150000)::int, 200000+(random()*400000)::int, 5+(random()*20)::int, (200000+(random()*400000)::int)*(0.3+random()*0.2), (200000+(random()*400000)::int)*(0.2+random()*0.1), (200000+(random()*400000)::int)*(0.2+random()*0.2), (200000+(random()*400000)::int)*(random()*0.1), 0, 50000+(random()*150000)::int, 50000+(random()*150000)::int, (random()*2000-1000)::int, (200000+(random()*400000)::int)*0.25, (200000+(random()*400000)::int)*0.3, (200000+(random()*400000)::int)/1.19, (200000+(random()*400000)::int)/1.19*0.19, 0, 50000+(random()*150000)::int, 'confirmed', (appt_date||' 08:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz)
        ON CONFLICT (branch_id, closure_date) DO NOTHING;
        INSERT INTO public.cash_register_closures (branch_id, closure_date, closed_by, opening_cash_amount, total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales, expected_cash, actual_cash, cash_difference, card_machine_debit_total, card_machine_credit_total, total_subtotal, total_tax, total_discounts, closing_cash_amount, status, opened_at, closed_at, created_at)
        VALUES (demo_branch_2_id, appt_date, demo_admin_user_id, 40000+(random()*120000)::int, 150000+(random()*350000)::int, 4+(random()*18)::int, (150000+(random()*350000)::int)*(0.35+random()*0.15), (150000+(random()*350000)::int)*(0.2+random()*0.1), (150000+(random()*350000)::int)*(0.2+random()*0.15), 0, 0, 40000+(random()*120000)::int, 40000+(random()*120000)::int, (random()*1500-750)::int, (150000+(random()*350000)::int)*0.22, (150000+(random()*350000)::int)*0.25, (150000+(random()*350000)::int)/1.19, (150000+(random()*350000)::int)/1.19*0.19, 0, 40000+(random()*120000)::int, 'confirmed', (appt_date||' 09:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz)
        ON CONFLICT (branch_id, closure_date) DO NOTHING;
        INSERT INTO public.pos_sessions (cashier_id, terminal_id, location, branch_id, opening_cash_amount, closing_cash_amount, opening_time, closing_time, status, created_at, updated_at)
        VALUES (demo_admin_user_id, 'TERMINAL-DEMO1', 'Casa Matriz', demo_branch_id, 50000+(random()*150000)::int, 50000+(random()*150000)::int + 200000+(random()*400000)::int, (appt_date||' 08:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz, 'closed', NOW(), NOW());
        INSERT INTO public.pos_sessions (cashier_id, terminal_id, location, branch_id, opening_cash_amount, closing_cash_amount, opening_time, closing_time, status, created_at, updated_at)
        VALUES (demo_admin_user_id, 'TERMINAL-PROV', 'Sucursal Providencia', demo_branch_2_id, 40000+(random()*120000)::int, 40000+(random()*120000)::int + 150000+(random()*350000)::int, (appt_date||' 09:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz, 'closed', NOW(), NOW());
      END IF;
    END LOOP;
  END IF;

  -- ===== 14. OPTICAL INTERNAL SUPPORT TICKETS (both branches; requires admin_users FK) =====
  IF is_demo_admin THEN
    ticket_num := 1;
    FOR cust_rec IN SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.branch_id FROM public.customers c WHERE c.branch_id = demo_branch_id LIMIT 15
    LOOP
      INSERT INTO public.optical_internal_support_tickets (ticket_number, organization_id, branch_id, customer_id, customer_name, customer_email, customer_phone, created_by_user_id, subject, description, category, priority, status, created_at, updated_at)
      VALUES ('OPT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(ticket_num::TEXT, 4, '0'), demo_org_id, cust_rec.branch_id, cust_rec.id, cust_rec.first_name || ' ' || cust_rec.last_name, cust_rec.email, cust_rec.phone, demo_admin_user_id, 'Consulta sobre lentes - ' || cust_rec.first_name, 'Cliente consulta sobre ajuste de armazón y limpieza de lentes.', (ARRAY['lens_issue', 'frame_issue', 'delivery_issue', 'customer_complaint'])[1 + (random()*3)::int], (ARRAY['low', 'medium', 'high'])[1 + (random()*2)::int], (ARRAY['open', 'assigned', 'in_progress', 'resolved', 'closed'])[1 + (random()*4)::int], NOW() - (random()*90)::INT, NOW())
      ON CONFLICT (ticket_number) DO NOTHING;
      ticket_num := ticket_num + 1;
    END LOOP;
    FOR cust_rec IN SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.branch_id FROM public.customers c WHERE c.branch_id = demo_branch_2_id LIMIT 15
    LOOP
      INSERT INTO public.optical_internal_support_tickets (ticket_number, organization_id, branch_id, customer_id, customer_name, customer_email, customer_phone, created_by_user_id, subject, description, category, priority, status, created_at, updated_at)
      VALUES ('OPT-PROV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(ticket_num::TEXT, 4, '0'), demo_org_id, cust_rec.branch_id, cust_rec.id, cust_rec.first_name || ' ' || cust_rec.last_name, cust_rec.email, cust_rec.phone, demo_admin_user_id, 'Problema con entrega - ' || cust_rec.first_name, 'Cliente reporta retraso en entrega de lentes.', (ARRAY['delivery_issue', 'quality_issue', 'customer_complaint'])[1 + (random()*2)::int], (ARRAY['medium', 'high'])[1 + (random()*1)::int], (ARRAY['open', 'resolved', 'closed'])[1 + (random()*2)::int], NOW() - (random()*60)::INT, NOW())
      ON CONFLICT (ticket_number) DO NOTHING;
      ticket_num := ticket_num + 1;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.seed_demo_organization_data() IS 'Seeds demo organization with 21 months of operational data: lens families, products, appointments, quotes, lab work orders, orders, order_items, cash register closures, pos_sessions, schedule/quote/pos settings, and optical support tickets for both branches.';
