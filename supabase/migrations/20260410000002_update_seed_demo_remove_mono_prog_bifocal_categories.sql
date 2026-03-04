-- Migration: Update seed_demo_organization_data to remove mono/prog/bifocal category references.
-- lens_type is the source of truth. Map single_vision, bifocal, progressive to lectura_cat_id.

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
  lectura_cat_id UUID;
  ocupacional_cat_id UUID;
  deportivo_cat_id UUID;
  lentes_contacto_cat_id UUID;
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
  days_back INTEGER := 365;
  total_amt INTEGER;
  is_demo_admin BOOLEAN := false;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);
  SELECT id INTO marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;
  SELECT id INTO lectura_cat_id FROM public.categories WHERE slug = 'lectura' LIMIT 1;
  SELECT id INTO ocupacional_cat_id FROM public.categories WHERE slug = 'ocupacional' LIMIT 1;
  SELECT id INTO deportivo_cat_id FROM public.categories WHERE slug = 'deportivo' LIMIT 1;
  SELECT id INTO lentes_contacto_cat_id FROM public.categories WHERE slug = 'lentes-contacto' LIMIT 1;

  -- Demo admin from org (for support tickets FK), or any auth user (for closed_by, cashier_id)
  SELECT id INTO demo_admin_user_id FROM public.admin_users WHERE organization_id = demo_org_id LIMIT 1;
  IF demo_admin_user_id IS NOT NULL THEN
    is_demo_admin := true;
  ELSE
    SELECT id INTO demo_admin_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  -- ===== 1. LENS FAMILIES (with category_id: lectura for single_vision/bifocal/progressive, ocupacional for computer, deportivo for sports) =====
  INSERT INTO public.lens_families (id, name, brand, lens_type, lens_material, description, is_active, organization_id, category_id, created_at)
  VALUES
  ('40000000-0000-0000-0000-000000000001'::uuid, 'Monofocal Básico CR-39 AR', 'Genérico', 'single_vision', 'cr39', 'Lente monofocal estándar con antirreflejo básico.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000002'::uuid, 'Monofocal Policarbonato Blue Cut', 'Essilor', 'single_vision', 'polycarbonate', 'Monofocal resistente con filtro de luz azul.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000003'::uuid, 'Monofocal Alto Índice 1.67 AR Premium', 'Hoya', 'single_vision', 'high_index_1_67', 'Lente delgado para graduaciones medias-altas.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000004'::uuid, 'Monofocal Alto Índice 1.74 AR Ultra Delgado', 'Zeiss', 'single_vision', 'high_index_1_74', 'Lente ultra delgado para graduaciones muy altas.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000005'::uuid, 'Monofocal Antifatiga Digital', 'Rodenstock', 'single_vision', 'cr39', 'Lente de confort para pantallas.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000006'::uuid, 'Monofocal Fotocromático CR-39', 'Transitions', 'single_vision', 'cr39', 'Lente que se oscurece con luz UV.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000007'::uuid, 'Bifocal Flat Top 28mm CR-39', 'Genérico', 'bifocal', 'cr39', 'Bifocal económico y funcional.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000008'::uuid, 'Bifocal Invisilens Policarbonato', 'Essilor', 'bifocal', 'polycarbonate', 'Bifocal de policarbonato resistente.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000009'::uuid, 'Progresivo Básico CR-39 FreeForm', 'Genérico', 'progressive', 'cr39', 'Progresivo de entrada FreeForm.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000010'::uuid, 'Progresivo Comfort Policarbonato', 'Essilor', 'progressive', 'polycarbonate', 'Progresivo Varilux Comfort.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000011'::uuid, 'Progresivo Individualizado Alto Índice 1.67', 'Zeiss', 'progressive', 'high_index_1_67', 'Progresivo Zeiss Individual 2.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000012'::uuid, 'Progresivo para Conducción 1.74', 'Hoya', 'progressive', 'high_index_1_74', 'Progresivo optimizado para conducción.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000013'::uuid, 'Progresivo Digital Blue Defense', 'Genérico', 'progressive', 'polycarbonate', 'Progresivo con filtro azul.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000014'::uuid, 'Ocupacional Office Policarbonato', 'Rodenstock', 'computer', 'polycarbonate', 'Lente para oficina.', true, demo_org_id, ocupacional_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000015'::uuid, 'Lectura Extendida CR-39', 'Genérico', 'reading', 'cr39', 'Lente para lectura.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000016'::uuid, 'Monofocal Polarizado Gris Policarbonato', 'Genérico', 'single_vision', 'polycarbonate', 'Monofocal polarizado para sol.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000017'::uuid, 'Progresivo Espejado Azul 1.67', 'Essilor', 'progressive', 'high_index_1_67', 'Progresivo espejado para sol.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000018'::uuid, 'Sports Visión CR-39 Tinte Café', 'Zeiss', 'sports', 'cr39', 'Lente deportivo tinte café.', true, demo_org_id, deportivo_cat_id, NOW())
  ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, name = EXCLUDED.name, category_id = EXCLUDED.category_id;

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

  -- ===== 3. CONTACT LENS FAMILIES (with category_id) =====
  INSERT INTO public.contact_lens_families (id, organization_id, name, brand, use_type, modality, material, packaging, base_curve, diameter, description, is_active, category_id, created_at)
  VALUES ('70000000-0000-0000-0000-000000000001'::uuid, demo_org_id, 'Acuvue Oasys 1-Day', 'Johnson & Johnson', 'daily', 'spherical', 'silicone_hydrogel', 'box_30', 8.50, 14.30, 'Lentes diarios hidrogel silicona.', true, lentes_contacto_cat_id, NOW()),
  ('70000000-0000-0000-0000-000000000002'::uuid, demo_org_id, 'Air Optix Plus HydraGlyde for Astigmatism', 'Alcon', 'monthly', 'toric', 'silicone_hydrogel', 'box_6', 8.70, 14.50, 'Lentes mensuales para astigmatismo.', true, lentes_contacto_cat_id, NOW())
  ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, category_id = EXCLUDED.category_id;
  INSERT INTO public.contact_lens_price_matrices (contact_lens_family_id, organization_id, sphere_min, sphere_max, cylinder_min, cylinder_max, axis_min, axis_max, addition_min, addition_max, base_price, cost, is_active)
  SELECT id, demo_org_id, -6.00, -0.50, 0.00, 0.00, 0, 0, 0.00, 0.00, 29990, 14990, true FROM public.contact_lens_families WHERE id = '70000000-0000-0000-0000-000000000001'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.contact_lens_price_matrices WHERE contact_lens_family_id = '70000000-0000-0000-0000-000000000001'::uuid AND sphere_min = -6.00 LIMIT 1);
  INSERT INTO public.contact_lens_price_matrices (contact_lens_family_id, organization_id, sphere_min, sphere_max, cylinder_min, cylinder_max, axis_min, axis_max, addition_min, addition_max, base_price, cost, is_active)
  SELECT id, demo_org_id, -6.00, -0.50, -1.75, -0.75, 10, 180, 0.00, 0.00, 39990, 19990, true FROM public.contact_lens_families WHERE id = '70000000-0000-0000-0000-000000000002'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.contact_lens_price_matrices WHERE contact_lens_family_id = '70000000-0000-0000-0000-000000000002'::uuid AND sphere_min = -6.00 LIMIT 1);

  -- ===== 3b. Backfill category_id for existing demo families (lectura for single_vision/bifocal/progressive, ocupacional for computer, deportivo for sports) =====
  UPDATE public.lens_families SET category_id = lectura_cat_id WHERE organization_id = demo_org_id AND category_id IS NULL AND lens_type IN ('single_vision', 'bifocal', 'progressive');
  UPDATE public.lens_families SET category_id = lectura_cat_id WHERE organization_id = demo_org_id AND category_id IS NULL AND lens_type = 'reading';
  UPDATE public.lens_families SET category_id = ocupacional_cat_id WHERE organization_id = demo_org_id AND category_id IS NULL AND lens_type = 'computer';
  UPDATE public.lens_families SET category_id = deportivo_cat_id WHERE organization_id = demo_org_id AND category_id IS NULL AND lens_type = 'sports';
  UPDATE public.contact_lens_families SET category_id = lentes_contacto_cat_id WHERE organization_id = demo_org_id AND category_id IS NULL;

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

  -- ===== 5. PRODUCT BRANCH STOCK =====
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

  -- ===== 7. SCHEDULE_SETTINGS, QUOTE_SETTINGS, POS_SETTINGS =====
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
  VALUES (demo_branch_id, 50.00, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET min_deposit_percent = EXCLUDED.min_deposit_percent;

  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (demo_branch_2_id, 50.00, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET min_deposit_percent = EXCLUDED.min_deposit_percent;

  -- ===== 8. APPOINTMENTS (12 months, both branches) =====
  FOR i IN 1..250 LOOP
    appt_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_id, demo_org_id, appt_date, ((9 + (i % 7)) || ':00:00')::time, CASE i%3 WHEN 0 THEN 'eye_exam' WHEN 1 THEN 'consultation' ELSE 'fitting' END, CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, NULL, NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_id ORDER BY random() LIMIT 1;
    END IF;
  END LOOP;
  FOR i IN 1..250 LOOP
    appt_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_2_id, demo_org_id, appt_date, ((10 + (i % 6)) || ':00:00')::time, CASE i%3 WHEN 0 THEN 'consultation' WHEN 1 THEN 'eye_exam' ELSE 'delivery' END, CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, 'Sucursal Providencia', NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_2_id ORDER BY random() LIMIT 1;
    END IF;
  END LOOP;

  -- ===== 9. QUOTES =====
  SELECT id INTO frame_product_id FROM public.products WHERE organization_id = demo_org_id AND category_id = marcos_cat_id LIMIT 1;
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000010'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    quote_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
      VALUES (cust_rec.id, demo_branch_id, 'COT-DEMO1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - (random()*180)::INT, CURRENT_DATE - (random()*180)::INT + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', 89900, lens_family_id, 'progressive', 'polycarbonate', ARRAY['anti_reflective', 'blue_light_filter'], 'progressive', 45000, 189990, 35000, 15000, 284990, 54148, 0, 339138, 'CLP', CASE WHEN random()>0.4 THEN 'accepted' WHEN random()>0.2 THEN 'sent' ELSE 'draft' END, 'Presupuesto demo', NOW() - ((random()*180)::INT * INTERVAL '1 day'))
      ON CONFLICT (quote_number) DO NOTHING;
      quote_num := quote_num + 1;
    END LOOP;
    quote_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'COT-PROV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - (random()*180)::INT, CURRENT_DATE - (random()*180)::INT + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', 129900, lens_family_id, 'progressive', 'polycarbonate', ARRAY['anti_reflective'], 'progressive', 65000, 189990, 30000, 15000, 299990, 56998, 0, 356988, 'CLP', CASE WHEN random()>0.5 THEN 'accepted' WHEN random()>0.25 THEN 'sent' ELSE 'draft' END, 'Presupuesto Providencia', NOW() - ((random()*180)::INT * INTERVAL '1 day'))
      ON CONFLICT (quote_number) DO NOTHING;
      quote_num := quote_num + 1;
    END LOOP;
  END IF;

  -- ===== 10. LAB WORK ORDERS =====
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000002'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    wo_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      status_idx := 1 + (random() * 8)::int;
      INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
      VALUES (cust_rec.id, demo_branch_id, 'TRB-DEMO1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - (random()*270)::INT, rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective', 'blue_light_filter'], 'none', 65000, 59990, 35000, 15000, 30000, 169990, 32298, 0, 202288, 'CLP', status_list[status_idx], CASE status_list[status_idx] WHEN 'delivered' THEN 'paid' WHEN 'ready_for_pickup' THEN 'partial' ELSE 'pending' END, 'Trabajo demo', NOW() - ((random()*270)::INT * INTERVAL '1 day'), NOW() - ((random()*265)::INT * INTERVAL '1 day'), NOW() - ((random()*260)::INT * INTERVAL '1 day'), CASE WHEN status_list[status_idx] = 'delivered' THEN NOW() - ((random()*90)::INT * INTERVAL '1 day') ELSE NULL END)
      ON CONFLICT (work_order_number) DO NOTHING;
      wo_num := wo_num + 1;
    END LOOP;
    wo_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      status_idx := 1 + (random() * 8)::int;
      INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'TRB-PROV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - (random()*270)::INT, rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective'], 'none', 45000, 59990, 30000, 15000, 28000, 149990, 28498, 0, 178488, 'CLP', status_list[status_idx], CASE status_list[status_idx] WHEN 'delivered' THEN 'paid' WHEN 'ready_for_pickup' THEN 'partial' ELSE 'pending' END, 'Trabajo Providencia', NOW() - ((random()*270)::INT * INTERVAL '1 day'), NOW() - ((random()*265)::INT * INTERVAL '1 day'), NOW() - ((random()*260)::INT * INTERVAL '1 day'), CASE WHEN status_list[status_idx] = 'delivered' THEN NOW() - ((random()*90)::INT * INTERVAL '1 day') ELSE NULL END)
      ON CONFLICT (work_order_number) DO NOTHING;
      wo_num := wo_num + 1;
    END LOOP;
  END IF;

  -- ===== 11. ORDERS (12 months, both branches) =====
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

  -- ===== 12. ORDER_ITEMS =====
  FOR ord_rec IN SELECT o.id, o.total_amount FROM public.orders o WHERE o.branch_id IN (demo_branch_id, demo_branch_2_id) AND o.organization_id = demo_org_id LIMIT 100
  LOOP
    SELECT p.id, p.name, p.sku, p.price INTO prod_rec FROM public.products p WHERE p.organization_id = demo_org_id ORDER BY random() LIMIT 1;
    IF prod_rec.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = ord_rec.id LIMIT 1) THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price, product_name, sku, created_at)
      VALUES (ord_rec.id, prod_rec.id, 1, prod_rec.price, prod_rec.price, prod_rec.name, prod_rec.sku, NOW());
    END IF;
  END LOOP;

  -- ===== 13. CASH REGISTER CLOSURES + POS SESSIONS (12 months, ~130 weekdays each branch) =====
  IF demo_admin_user_id IS NOT NULL THEN
    FOR i IN 0..130 LOOP
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

  -- ===== 14. OPTICAL INTERNAL SUPPORT TICKETS =====
  -- Schema: created_by_user_id (not created_by), description NOT NULL, category NOT NULL
  IF demo_admin_user_id IS NOT NULL AND is_demo_admin THEN
    ticket_num := 1;
    FOR i IN 1..8 LOOP
      INSERT INTO public.optical_internal_support_tickets (organization_id, branch_id, ticket_number, subject, description, category, priority, status, created_by_user_id, created_at, updated_at)
      VALUES (demo_org_id, demo_branch_id, 'TKT-DEMO1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(ticket_num::TEXT, 4, '0'), 'Ticket demo ' || ticket_num, 'Consulta de soporte interno demo ' || ticket_num, (ARRAY['lens_issue', 'frame_issue', 'delivery_issue', 'customer_complaint'])[1 + (i % 4)], (ARRAY['low', 'medium', 'high'])[1 + (i % 3)], CASE WHEN i <= 2 THEN 'open' WHEN i <= 5 THEN 'in_progress' ELSE 'resolved' END, demo_admin_user_id, NOW() - (i || ' days')::INTERVAL, NOW());
      ticket_num := ticket_num + 1;
    END LOOP;
    ticket_num := 1;
    FOR i IN 1..6 LOOP
      INSERT INTO public.optical_internal_support_tickets (organization_id, branch_id, ticket_number, subject, description, category, priority, status, created_by_user_id, created_at, updated_at)
      VALUES (demo_org_id, demo_branch_2_id, 'TKT-PROV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(ticket_num::TEXT, 4, '0'), 'Ticket Providencia ' || ticket_num, 'Consulta de soporte sucursal Providencia ' || ticket_num, (ARRAY['lens_issue', 'frame_issue', 'delivery_issue', 'customer_complaint'])[1 + (i % 4)], (ARRAY['low', 'medium'])[1 + (i % 2)], CASE WHEN i <= 2 THEN 'open' ELSE 'resolved' END, demo_admin_user_id, NOW() - (i || ' days')::INTERVAL, NOW());
      ticket_num := ticket_num + 1;
    END LOOP;
  END IF;
END;
$$;
