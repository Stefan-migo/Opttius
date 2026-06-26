-- Migration: 20260131000002_improve_demo_seed_data.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Improve Demo Seed Data
-- This migration improves the demo organization seed with:
-- 1. Updated lens families and matrices based on Chilean market research
-- 2. Ensures all customers have at least one prescription
-- 3. Creates demo quotes (presupuestos)
-- 4. Creates demo lab work orders (trabajos)

-- ===== UPDATE LENS FAMILIES WITH REALISTIC CHILEAN MARKET DATA =====
-- Delete existing matrices first (they will be recreated)
DELETE FROM public.lens_price_matrices WHERE lens_family_id IN (
  SELECT id FROM public.lens_families WHERE id::TEXT LIKE '40000000-%'
);

-- Delete and recreate lens families with updated data
DELETE FROM public.lens_families WHERE id::TEXT LIKE '40000000-%';

INSERT INTO public.lens_families (
  id,
  name,
  brand,
  lens_type,
  lens_material,
  description,
  is_active,
  created_at
) VALUES
-- Monofocales (Single Vision)
('40000000-0000-0000-0000-000000000001'::uuid, 'Monofocal Básico CR-39 AR', 'Genérico', 'single_vision', 'cr39', 'Lente monofocal estándar con antirreflejo básico. Económico.', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000002'::uuid, 'Monofocal Policarbonato Blue Cut', 'Essilor', 'single_vision', 'polycarbonate', 'Monofocal resistente a impactos con filtro de luz azul.', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000003'::uuid, 'Monofocal Alto Índice 1.67 AR Premium', 'Hoya', 'single_vision', 'high_index_1_67', 'Lente delgado para graduaciones medias-altas, antirreflejo avanzado.', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000004'::uuid, 'Monofocal Alto Índice 1.74 AR Ultra Delgado', 'Zeiss', 'single_vision', 'high_index_1_74', 'Lente ultra delgado para graduaciones muy altas, máxima estética.', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000005'::uuid, 'Monofocal Antifatiga Digital', 'Rodenstock', 'single_vision', 'cr39', 'Lente de confort con ligera adición para reducir fatiga visual en pantallas.', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000006'::uuid, 'Monofocal Fotocromático CR-39', 'Transitions', 'single_vision', 'cr39', 'Lente que se oscurece con la luz UV (ej. Transitions Classic).', true, NOW() - INTERVAL '6 months'),
-- Bifocales
('40000000-0000-0000-0000-000000000007'::uuid, 'Bifocal Flat Top 28mm CR-39', 'Genérico', 'bifocal', 'cr39', 'Bifocal con segmento de lectura visible, económico y funcional.', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000008'::uuid, 'Bifocal Invisilens Policarbonato', 'Essilor', 'bifocal', 'polycarbonate', 'Bifocal de policarbonato, resistente, con segmento poco visible.', true, NOW() - INTERVAL '6 months'),
-- Progresivos (Progressive)
('40000000-0000-0000-0000-000000000009'::uuid, 'Progresivo Básico CR-39 FreeForm', 'Genérico', 'progressive', 'cr39', 'Progresivo de entrada, tecnología FreeForm básica, buena relación calidad/precio.', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000010'::uuid, 'Progresivo Comfort Policarbonato', 'Essilor', 'progressive', 'polycarbonate', 'Progresivo de gama media-alta, amplia zona de visión, resistente. (Ej. Varilux Comfort)', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000011'::uuid, 'Progresivo Individualizado Alto Índice 1.67', 'Zeiss', 'progressive', 'high_index_1_67', 'Progresivo de alta gama, personalizado según parámetros de montura y paciente. (Ej. Individual 2)', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000012'::uuid, 'Progresivo para Conducción 1.74', 'Hoya', 'progressive', 'high_index_1_74', 'Progresivo optimizado para conducción, campo de visión lejano y lateral amplio. (Ej. Hoyalux ID MyStyle V+)', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000013'::uuid, 'Progresivo Digital Blue Defense', 'Genérico', 'progressive', 'polycarbonate', 'Progresivo con filtro azul y campos optimizados para uso digital.', true, NOW() - INTERVAL '6 months'),
-- Ocupacionales/Computadora
('40000000-0000-0000-0000-000000000014'::uuid, 'Ocupacional Office Policarbonato', 'Rodenstock', 'computer', 'polycarbonate', 'Lente para oficina, visión clara de cerca e intermedia. (Ej. Ergo)', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000015'::uuid, 'Lectura Extendida CR-39', 'Genérico', 'reading', 'cr39', 'Lente para lectura y distancias cortas, con mayor profundidad de campo.', true, NOW() - INTERVAL '6 months'),
-- Lentes Ópticos de Sol
('40000000-0000-0000-0000-000000000016'::uuid, 'Monofocal Polarizado Gris Policarbonato', 'Genérico', 'single_vision', 'polycarbonate', 'Monofocal con filtro polarizado, ideal para conducción y deportes náuticos.', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000017'::uuid, 'Progresivo Espejado Azul 1.67', 'Essilor', 'progressive', 'high_index_1_67', 'Progresivo con tinte y espejado azul para lentes de sol con graduación.', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000018'::uuid, 'Sports Visión CR-39 Tinte Café', 'Zeiss', 'sports', 'cr39', 'Lente deportivo con tinte café, mejora contraste.', true, NOW() - INTERVAL '6 months')
ON CONFLICT DO NOTHING;

-- ===== CREATE REALISTIC PRICE MATRICES FOR CHILEAN MARKET =====
DO $$
DECLARE
  mono_basico_cr39_id UUID;
  mono_poly_blue_id UUID;
  mono_167_id UUID;
  mono_174_id UUID;
  mono_antifatiga_id UUID;
  mono_fotocrom_id UUID;
  bifocal_flat_id UUID;
  bifocal_invisilens_id UUID;
  prog_basico_cr39_id UUID;
  prog_comfort_poly_id UUID;
  prog_indiv_167_id UUID;
  prog_conduccion_174_id UUID;
  prog_digital_id UUID;
  ocupacional_office_id UUID;
  lectura_extendida_id UUID;
  mono_polarizado_id UUID;
  prog_espejado_id UUID;
  sports_tinte_id UUID;
BEGIN
  -- Get lens family IDs
  SELECT id INTO mono_basico_cr39_id FROM public.lens_families WHERE name = 'Monofocal Básico CR-39 AR' LIMIT 1;
  SELECT id INTO mono_poly_blue_id FROM public.lens_families WHERE name = 'Monofocal Policarbonato Blue Cut' LIMIT 1;
  SELECT id INTO mono_167_id FROM public.lens_families WHERE name = 'Monofocal Alto Índice 1.67 AR Premium' LIMIT 1;
  SELECT id INTO mono_174_id FROM public.lens_families WHERE name = 'Monofocal Alto Índice 1.74 AR Ultra Delgado' LIMIT 1;
  SELECT id INTO mono_antifatiga_id FROM public.lens_families WHERE name = 'Monofocal Antifatiga Digital' LIMIT 1;
  SELECT id INTO mono_fotocrom_id FROM public.lens_families WHERE name = 'Monofocal Fotocromático CR-39' LIMIT 1;
  SELECT id INTO bifocal_flat_id FROM public.lens_families WHERE name = 'Bifocal Flat Top 28mm CR-39' LIMIT 1;
  SELECT id INTO bifocal_invisilens_id FROM public.lens_families WHERE name = 'Bifocal Invisilens Policarbonato' LIMIT 1;
  SELECT id INTO prog_basico_cr39_id FROM public.lens_families WHERE name = 'Progresivo Básico CR-39 FreeForm' LIMIT 1;
  SELECT id INTO prog_comfort_poly_id FROM public.lens_families WHERE name = 'Progresivo Comfort Policarbonato' LIMIT 1;
  SELECT id INTO prog_indiv_167_id FROM public.lens_families WHERE name = 'Progresivo Individualizado Alto Índice 1.67' LIMIT 1;
  SELECT id INTO prog_conduccion_174_id FROM public.lens_families WHERE name = 'Progresivo para Conducción 1.74' LIMIT 1;
  SELECT id INTO prog_digital_id FROM public.lens_families WHERE name = 'Progresivo Digital Blue Defense' LIMIT 1;
  SELECT id INTO ocupacional_office_id FROM public.lens_families WHERE name = 'Ocupacional Office Policarbonato' LIMIT 1;
  SELECT id INTO lectura_extendida_id FROM public.lens_families WHERE name = 'Lectura Extendida CR-39' LIMIT 1;
  SELECT id INTO mono_polarizado_id FROM public.lens_families WHERE name = 'Monofocal Polarizado Gris Policarbonato' LIMIT 1;
  SELECT id INTO prog_espejado_id FROM public.lens_families WHERE name = 'Progresivo Espejado Azul 1.67' LIMIT 1;
  SELECT id INTO sports_tinte_id FROM public.lens_families WHERE name = 'Sports Visión CR-39 Tinte Café' LIMIT 1;

  -- Monofocal Básico CR-39 AR
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (mono_basico_cr39_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 29990, 9990, 'stock', true),
  (mono_basico_cr39_id, -6.00, -4.25, -2.00, 2.00, 0.00, 0.00, 39990, 14990, 'surfaced', true),
  (mono_basico_cr39_id, 4.25, 6.00, -2.00, 2.00, 0.00, 0.00, 39990, 14990, 'surfaced', true),
  (mono_basico_cr39_id, -8.00, -6.25, -4.00, 4.00, 0.00, 0.00, 59990, 24990, 'surfaced', true),
  (mono_basico_cr39_id, 6.25, 8.00, -4.00, 4.00, 0.00, 0.00, 59990, 24990, 'surfaced', true);

  -- Monofocal Policarbonato Blue Cut
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (mono_poly_blue_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 59990, 24990, 'stock', true),
  (mono_poly_blue_id, -6.00, -4.25, -4.00, 4.00, 0.00, 0.00, 79990, 34990, 'surfaced', true),
  (mono_poly_blue_id, 4.25, 6.00, -4.00, 4.00, 0.00, 0.00, 79990, 34990, 'surfaced', true);

  -- Bifocal Flat Top 28mm CR-39
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (bifocal_flat_id, -4.00, 4.00, -2.00, 2.00, 1.00, 2.50, 49990, 19990, 'surfaced', true),
  (bifocal_flat_id, -6.00, -4.25, -4.00, 4.00, 1.00, 3.00, 69990, 29990, 'surfaced', true),
  (bifocal_flat_id, 4.25, 6.00, -4.00, 4.00, 1.00, 3.00, 69990, 29990, 'surfaced', true);

  -- Progresivo Básico CR-39 FreeForm
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (prog_basico_cr39_id, -4.00, 4.00, -2.00, 2.00, 0.75, 1.75, 99990, 39990, 'surfaced', true),
  (prog_basico_cr39_id, -4.00, 4.00, -2.00, 2.00, 2.00, 3.00, 109990, 44990, 'surfaced', true),
  (prog_basico_cr39_id, -6.00, -4.25, -4.00, 4.00, 0.75, 3.50, 129990, 59990, 'surfaced', true),
  (prog_basico_cr39_id, 4.25, 6.00, -4.00, 4.00, 0.75, 3.50, 129990, 59990, 'surfaced', true);

  -- Progresivo Comfort Policarbonato
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (prog_comfort_poly_id, -4.00, 4.00, -2.00, 2.00, 0.75, 1.75, 189990, 79990, 'surfaced', true),
  (prog_comfort_poly_id, -4.00, 4.00, -2.00, 2.00, 2.00, 3.00, 209990, 89990, 'surfaced', true),
  (prog_comfort_poly_id, -8.00, 6.00, -4.00, 4.00, 0.75, 3.50, 249990, 109990, 'surfaced', true);

  -- Monofocal Polarizado Gris Policarbonato
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (mono_polarizado_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 89990, 39990, 'surfaced', true),
  (mono_polarizado_id, -6.00, -4.25, -4.00, 4.00, 0.00, 0.00, 109990, 49990, 'surfaced', true),
  (mono_polarizado_id, 4.25, 6.00, -4.00, 4.00, 0.00, 0.00, 109990, 49990, 'surfaced', true);
END $$;

-- ===== ENSURE ALL CUSTOMERS HAVE AT LEAST ONE PRESCRIPTION =====
-- Add prescriptions for customers that don't have any
INSERT INTO public.prescriptions (
  id,
  customer_id,
  prescription_date,
  expiration_date,
  prescription_number,
  issued_by,
  issued_by_license,
  od_sphere,
  od_cylinder,
  od_axis,
  od_add,
  od_pd,
  os_sphere,
  os_cylinder,
  os_axis,
  os_add,
  os_pd,
  prescription_type,
  lens_type,
  lens_material,
  is_active,
  is_current,
  created_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '335 days',
  'REC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER () + 10)::TEXT, 3, '0'),
  'Dr. Carlos Méndez',
  'OPTO-' || (12345 + ROW_NUMBER() OVER ()),
  CASE WHEN random() > 0.5 THEN -1.0 - (random() * 2.0) ELSE 0.5 + (random() * 2.0) END,
  CASE WHEN random() > 0.7 THEN -0.5 - (random() * 1.0) ELSE NULL END,
  CASE WHEN random() > 0.7 THEN (random() * 180)::INT ELSE NULL END,
  NULL,
  31.5 + (random() * 2.0),
  CASE WHEN random() > 0.5 THEN -1.0 - (random() * 2.0) ELSE 0.5 + (random() * 2.0) END,
  CASE WHEN random() > 0.7 THEN -0.5 - (random() * 1.0) ELSE NULL END,
  CASE WHEN random() > 0.7 THEN (random() * 180)::INT ELSE NULL END,
  NULL,
  31.5 + (random() * 2.0),
  'single_vision',
  'Monofocal',
  'CR39',
  true,
  false,
  NOW() - INTERVAL '30 days'
FROM public.customers c
WHERE c.organization_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.prescriptions p 
    WHERE p.customer_id = c.id
  )
LIMIT 15;

-- ===== CREATE DEMO QUOTES (PRESUPUESTOS) =====
DO $$
DECLARE
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  customer_rec RECORD;
  prescription_rec RECORD;
  frame_product_id UUID;
  lens_family_id UUID;
  quote_num INTEGER := 1;
BEGIN
  -- Get a frame product
  SELECT id INTO frame_product_id FROM public.products 
  WHERE organization_id = demo_org_id 
  AND category_id = (SELECT id FROM public.categories WHERE slug = 'marcos' LIMIT 1)
  LIMIT 1;

  -- Get a lens family (Progresivo Comfort)
  SELECT id INTO lens_family_id FROM public.lens_families 
  WHERE name = 'Progresivo Comfort Policarbonato' LIMIT 1;

  -- Create quotes for customers with prescriptions
  FOR customer_rec IN 
    SELECT DISTINCT c.id, c.first_name, c.last_name
    FROM public.customers c
    INNER JOIN public.prescriptions p ON p.customer_id = c.id
    WHERE c.organization_id = demo_org_id
    LIMIT 10
  LOOP
    -- Get the most recent prescription for this customer
    SELECT * INTO prescription_rec FROM public.prescriptions
    WHERE customer_id = customer_rec.id
    ORDER BY prescription_date DESC
    LIMIT 1;

    -- Create quote
    INSERT INTO public.quotes (
      id,
      customer_id,
      branch_id,
      quote_number,
      quote_date,
      expiration_date,
      prescription_id,
      frame_product_id,
      frame_name,
      frame_brand,
      frame_model,
      frame_color,
      frame_size,
      frame_sku,
      frame_price,
      lens_family_id,
      lens_type,
      lens_material,
      lens_treatments,
      presbyopia_solution,
      frame_cost,
      lens_cost,
      treatments_cost,
      labor_cost,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      currency,
      status,
      notes,
      created_at
    ) VALUES (
      gen_random_uuid(),
      customer_rec.id,
      demo_branch_id,
      'COT-2025-' || LPAD(quote_num::TEXT, 3, '0'),
      CURRENT_DATE - (random() * 30)::INT * INTERVAL '1 day',
      CURRENT_DATE - (random() * 30)::INT * INTERVAL '1 day' + INTERVAL '30 days',
      prescription_rec.id,
      frame_product_id,
      'Marco Ray-Ban RB2140',
      'Ray-Ban',
      'RB2140',
      'Negro',
      '58-14-140',
      'RB-2140-BLK',
      89900,
      lens_family_id,
      'progressive',
      'polycarbonate',
      ARRAY['anti_reflective', 'blue_light_filter'],
      CASE 
        WHEN prescription_rec.od_add IS NOT NULL OR prescription_rec.os_add IS NOT NULL THEN 'progressive'
        ELSE 'none'
      END,
      45000, -- frame_cost
      189990, -- lens_cost (from matrix)
      35000, -- treatments_cost
      15000, -- labor_cost
      284990, -- subtotal
      54148, -- tax_amount (19% IVA)
      0, -- discount_amount
      339138, -- total_amount
      'CLP',
      CASE 
        WHEN random() > 0.6 THEN 'sent'
        WHEN random() > 0.3 THEN 'accepted'
        ELSE 'draft'
      END,
      'Presupuesto generado automáticamente para demo',
      NOW() - (random() * 30)::INT * INTERVAL '1 day'
    );

    quote_num := quote_num + 1;
  END LOOP;
END $$;

-- ===== CREATE DEMO LAB WORK ORDERS (TRABAJOS) =====
DO $$
DECLARE
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  customer_rec RECORD;
  prescription_rec RECORD;
  quote_rec RECORD;
  frame_product_id UUID;
  lens_family_id UUID;
  work_order_num INTEGER := 1;
  status_list TEXT[] := ARRAY['ordered', 'sent_to_lab', 'in_progress_lab', 'ready_at_lab', 'received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered'];
  status_weights INTEGER[] := ARRAY[1, 1, 2, 2, 2, 2, 1, 2, 3]; -- More weight to middle statuses
  selected_status TEXT;
  status_idx INTEGER;
BEGIN
  -- Get a frame product
  SELECT id INTO frame_product_id FROM public.products 
  WHERE organization_id = demo_org_id 
  AND category_id = (SELECT id FROM public.categories WHERE slug = 'marcos' LIMIT 1)
  LIMIT 1;

  -- Get a lens family (Monofocal Policarbonato Blue Cut)
  SELECT id INTO lens_family_id FROM public.lens_families 
  WHERE name = 'Monofocal Policarbonato Blue Cut' LIMIT 1;

  -- Create work orders for customers with prescriptions
  FOR customer_rec IN 
    SELECT DISTINCT c.id, c.first_name, c.last_name
    FROM public.customers c
    INNER JOIN public.prescriptions p ON p.customer_id = c.id
    WHERE c.organization_id = demo_org_id
    LIMIT 8
  LOOP
    -- Get the most recent prescription for this customer
    SELECT * INTO prescription_rec FROM public.prescriptions
    WHERE customer_id = customer_rec.id
    ORDER BY prescription_date DESC
    LIMIT 1;

    -- Select a random status weighted towards middle statuses
    status_idx := (SELECT floor(random() * array_length(status_weights, 1))::INT + 1);
    selected_status := status_list[status_idx];

    -- Create work order
    INSERT INTO public.lab_work_orders (
      id,
      customer_id,
      branch_id,
      work_order_number,
      work_order_date,
      prescription_id,
      frame_product_id,
      frame_name,
      frame_brand,
      frame_model,
      frame_color,
      frame_size,
      frame_sku,
      lens_family_id,
      lens_type,
      lens_material,
      lens_treatments,
      presbyopia_solution,
      frame_cost,
      lens_cost,
      treatments_cost,
      labor_cost,
      lab_cost,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      currency,
      status,
      payment_status,
      internal_notes,
      created_at,
      ordered_at,
      sent_to_lab_at,
      lab_started_at,
      lab_completed_at,
      received_from_lab_at,
      mounted_at,
      quality_checked_at,
      ready_at,
      delivered_at
    ) VALUES (
      gen_random_uuid(),
      customer_rec.id,
      demo_branch_id,
      'TRB-2025-' || LPAD(work_order_num::TEXT, 3, '0'),
      CURRENT_DATE - (random() * 60)::INT * INTERVAL '1 day',
      prescription_rec.id,
      frame_product_id,
      'Marco Oakley OO9208',
      'Oakley',
      'OO9208',
      'Negro',
      '60-16-145',
      'OO-9208-BLK',
      lens_family_id,
      'single_vision',
      'polycarbonate',
      ARRAY['anti_reflective', 'blue_light_filter'],
      'none',
      65000, -- frame_cost
      59990, -- lens_cost (from matrix)
      35000, -- treatments_cost
      15000, -- labor_cost
      30000, -- lab_cost
      169990, -- subtotal
      32298, -- tax_amount (19% IVA)
      0, -- discount_amount
      202288, -- total_amount
      'CLP',
      selected_status,
      CASE 
        WHEN selected_status = 'delivered' THEN 'paid'
        WHEN selected_status IN ('ready_for_pickup', 'mounted') THEN 'partial'
        ELSE 'pending'
      END,
      'Trabajo generado automáticamente para demo',
      NOW() - (random() * 60)::INT * INTERVAL '1 day',
      CASE WHEN selected_status IN ('sent_to_lab', 'in_progress_lab', 'ready_at_lab', 'received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered') THEN NOW() - (random() * 55)::INT * INTERVAL '1 day' ELSE NULL END,
      CASE WHEN selected_status IN ('sent_to_lab', 'in_progress_lab', 'ready_at_lab', 'received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered') THEN NOW() - (random() * 50)::INT * INTERVAL '1 day' ELSE NULL END,
      CASE WHEN selected_status IN ('in_progress_lab', 'ready_at_lab', 'received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered') THEN NOW() - (random() * 45)::INT * INTERVAL '1 day' ELSE NULL END,
      CASE WHEN selected_status IN ('ready_at_lab', 'received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered') THEN NOW() - (random() * 40)::INT * INTERVAL '1 day' ELSE NULL END,
      CASE WHEN selected_status IN ('received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered') THEN NOW() - (random() * 35)::INT * INTERVAL '1 day' ELSE NULL END,
      CASE WHEN selected_status IN ('mounted', 'quality_check', 'ready_for_pickup', 'delivered') THEN NOW() - (random() * 30)::INT * INTERVAL '1 day' ELSE NULL END,
      CASE WHEN selected_status IN ('quality_check', 'ready_for_pickup', 'delivered') THEN NOW() - (random() * 25)::INT * INTERVAL '1 day' ELSE NULL END,
      CASE WHEN selected_status IN ('ready_for_pickup', 'delivered') THEN NOW() - (random() * 20)::INT * INTERVAL '1 day' ELSE NULL END,
      CASE WHEN selected_status = 'delivered' THEN NOW() - (random() * 15)::INT * INTERVAL '1 day' ELSE NULL END
    );

    work_order_num := work_order_num + 1;
  END LOOP;
END $$;
