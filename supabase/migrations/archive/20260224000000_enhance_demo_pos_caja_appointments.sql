-- Migration: 20260224000000_enhance_demo_pos_caja_appointments.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Enhance Demo Óptica Mirada Clara - POS, Caja, Appointments
-- Adds: more products/stock, customer chain (prescription→quote→order→work_order), 
--       6 months POS/caja with improving sales, appointments current+next week (registered+guest).
-- Run with: supabase db push (or migration up) - NO full reset.
--
-- Org: 00000000-0000-0000-0000-000000000001
-- Branch 1: 00000000-0000-0000-0000-000000000002
-- Branch 2: 00000000-0000-0000-0000-000000000003

DO $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_1_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_branch_2_id UUID := '00000000-0000-0000-0000-000000000003'::uuid;
  marcos_cat_id UUID;
  lentes_sol_cat_id UUID;
  accesorios_cat_id UUID;
  servicios_cat_id UUID;
  demo_admin_user_id UUID;
  frame_product_id UUID;
  lens_family_id UUID;
  cust_rec RECORD;
  rx_rec RECORD;
  sess_rec RECORD;
  ord_num INTEGER;
  quote_num INTEGER;
  wo_num INTEGER;
  appt_date DATE;
  d INTEGER;
  base_sales INTEGER;
  status_list TEXT[] := ARRAY['ordered', 'sent_to_lab', 'in_progress_lab', 'ready_at_lab', 'received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered'];
BEGIN
  PERFORM set_config('statement_timeout', '180000', true);

  SELECT id INTO demo_admin_user_id FROM public.admin_users WHERE organization_id = demo_org_id LIMIT 1;
  IF demo_admin_user_id IS NULL THEN
    SELECT id INTO demo_admin_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  SELECT id INTO marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;

  IF marcos_cat_id IS NULL OR lentes_sol_cat_id IS NULL OR accesorios_cat_id IS NULL OR servicios_cat_id IS NULL THEN
    RAISE NOTICE 'Categories not found. Skipping product enhancements.';
  ELSE
    -- ===== 1. ADD MISSING PRODUCTS (5 marcos, 3 lentes sol, 3 accesorios, 3 servicios) =====
    INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, is_featured, price_includes_tax, featured_image, created_at)
    VALUES
    ('20000000-0000-0000-0000-000000000004'::uuid, demo_branch_1_id, demo_org_id, 'Marco Vogue VG-2001', 'marco-vogue-vg2001-mcl', 'Marco clásico Vogue.', 69900, 35000, marcos_cat_id, 'VG-2001-BLK', 'active', false, true, 'https://images.unsplash.com/1511499767150?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000005'::uuid, demo_branch_1_id, demo_org_id, 'Marco Titanium Slim', 'marco-titanium-slim-mcl', 'Marco ultrafino titanio.', 159900, 80000, marcos_cat_id, 'TI-SLIM-SLV', 'active', true, true, 'https://images.unsplash.com/1572635196237?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000013'::uuid, demo_branch_1_id, demo_org_id, 'Gafas de Sol Polarizadas Sport', 'gafas-sol-polarizadas-sport-mcl', 'Gafas deportivas polarizadas.', 89900, 45000, lentes_sol_cat_id, 'SOL-SPORT-POL', 'active', true, true, 'https://images.unsplash.com/1511499767150?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000018'::uuid, demo_branch_1_id, demo_org_id, 'Líquido Limpiador 120ml', 'liquido-limpiador-120ml-mcl', 'Líquido limpiador para lentes.', 7900, 3000, accesorios_cat_id, 'ACC-LIQ-120', 'active', true, true, NULL, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- ===== 2. ENSURE MINIMUM STOCK PER BRANCH (5 marcos, 3 lentes sol, 3 accesorios, 3 servicios) =====
    UPDATE public.product_branch_stock pbs
    SET quantity = GREATEST(pbs.quantity, 
      CASE 
        WHEN p.category_id = marcos_cat_id THEN 5
        WHEN p.category_id = lentes_sol_cat_id THEN 3
        WHEN p.category_id = accesorios_cat_id THEN 3
        WHEN p.category_id = servicios_cat_id THEN 3
        ELSE 3
      END),
      updated_at = NOW()
    FROM public.products p
    WHERE pbs.product_id = p.id AND p.organization_id = demo_org_id
    AND pbs.branch_id IN (demo_branch_1_id, demo_branch_2_id);

    -- Insert stock for new products if missing
    INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
    SELECT p.id, b.id, 
      CASE WHEN p.category_id = marcos_cat_id THEN 8 WHEN p.category_id = lentes_sol_cat_id THEN 5 ELSE 10 END, 
      5, NOW()
    FROM public.products p
    CROSS JOIN (SELECT demo_branch_1_id AS id UNION ALL SELECT demo_branch_2_id) b
    WHERE p.organization_id = demo_org_id AND p.id IN ('20000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000013'::uuid, '20000000-0000-0000-0000-000000000018'::uuid)
    ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = GREATEST(product_branch_stock.quantity, EXCLUDED.quantity), updated_at = NOW();
  END IF;

  -- ===== 3. CUSTOMER CHAIN: Each customer has 1 prescription, 1 quote, 1 order (POS), 1 lab_work_order, 1 appointment =====
  SELECT id INTO frame_product_id FROM public.products WHERE organization_id = demo_org_id AND category_id = marcos_cat_id LIMIT 1;
  SELECT id INTO lens_family_id FROM public.lens_families WHERE organization_id = demo_org_id LIMIT 1;

  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    FOR cust_rec IN 
      SELECT c.id, c.branch_id, c.first_name, c.last_name, c.email, c.organization_id 
      FROM public.customers c 
      WHERE c.organization_id = demo_org_id
    LOOP
      -- Prescription (if missing)
      IF NOT EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = cust_rec.id LIMIT 1) THEN
        INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
        VALUES (cust_rec.id, CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '305 days', 'REC-ENH-' || SUBSTRING(cust_rec.id::text, 1, 8), 'Dr. Carlos Méndez', 'OPTO-12345', -1.25, -0.25, 90, NULL, 32.0, -1.25, -0.25, 90, NULL, 32.0, 'single_vision', 'Monofocal', 'CR39', true, true, NOW());
      END IF;

      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      IF rx_rec.id IS NOT NULL THEN
        -- Quote (if missing)
        IF NOT EXISTS (SELECT 1 FROM public.quotes q WHERE q.customer_id = cust_rec.id LIMIT 1) THEN
          quote_num := (SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 FROM public.quotes WHERE branch_id = cust_rec.branch_id);
          INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
          VALUES (cust_rec.id, cust_rec.branch_id, 'COT-ENH-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', 89900, lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective'], 'none', 45000, 59990, 25000, 15000, 179990, 34198, 0, 214188, 'CLP', 'accepted', 'Presupuesto demo completo', NOW())
          ON CONFLICT (quote_number) DO NOTHING;
        END IF;

        -- Lab work order (if missing) - Cash-First: paid or partial
        IF NOT EXISTS (SELECT 1 FROM public.lab_work_orders lwo WHERE lwo.customer_id = cust_rec.id LIMIT 1) THEN
          wo_num := (SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 FROM public.lab_work_orders WHERE branch_id = cust_rec.branch_id);
          INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
          VALUES (cust_rec.id, cust_rec.branch_id, 'TRB-ENH-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - INTERVAL '15 days', rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective'], 'none', 65000, 59990, 25000, 15000, 30000, 169990, 32298, 0, 202288, 'CLP', status_list[3 + (random()*4)::int], 'paid', 'Trabajo demo Cash-First', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '10 days', CASE WHEN random()>0.5 THEN NOW() - INTERVAL '3 days' ELSE NULL END)
          ON CONFLICT (work_order_number) DO NOTHING;
        END IF;
      END IF;

      -- Order (POS sale) - if customer has no order
      IF NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.customer_id = cust_rec.id AND o.branch_id = cust_rec.branch_id LIMIT 1) THEN
        ord_num := (SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 FROM public.orders WHERE branch_id = cust_rec.branch_id);
        INSERT INTO public.orders (branch_id, organization_id, customer_id, order_number, status, total_amount, payment_status, payment_method_type, customer_name, email, subtotal, tax_amount, discount_amount, currency, is_pos_sale, pos_cashier_id, created_at, updated_at)
        VALUES (cust_rec.branch_id, demo_org_id, cust_rec.id, 'ORD-ENH-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(ord_num::TEXT, 5, '0'), 'delivered', 120000, 'paid', (ARRAY['cash', 'debit_card', 'credit_card'])[1 + (random()*2)::int], cust_rec.first_name || ' ' || cust_rec.last_name, cust_rec.email, 100840, 19160, 0, 'CLP', true, demo_admin_user_id, CURRENT_DATE - INTERVAL '7 days' + INTERVAL '10 hours', CURRENT_DATE - INTERVAL '7 days' + INTERVAL '10 hours')
        ON CONFLICT (order_number) DO NOTHING;
      END IF;

      -- Appointment (if missing)
      IF NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.customer_id = cust_rec.id LIMIT 1) THEN
        INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
        VALUES (cust_rec.id, cust_rec.branch_id, demo_org_id, CURRENT_DATE - INTERVAL '20 days', '10:00:00', 'eye_exam', 'completed', 'Cita demo', NOW() - INTERVAL '20 days');
      END IF;
    END LOOP;

    -- Order items for new orders
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price, product_name, sku, created_at)
    SELECT o.id, p.id, 1, p.price, p.price, p.name, p.sku, NOW()
    FROM public.orders o
    JOIN public.products p ON p.organization_id = o.organization_id AND p.category_id IN (marcos_cat_id, accesorios_cat_id, servicios_cat_id)
    WHERE o.branch_id IN (demo_branch_1_id, demo_branch_2_id) AND o.organization_id = demo_org_id
    AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id LIMIT 1)
    ORDER BY random() LIMIT 1;

    -- Order payments for paid orders
    INSERT INTO public.order_payments (order_id, amount, payment_method, paid_at)
    SELECT o.id, o.total_amount, CASE COALESCE(o.payment_method_type, 'cash') WHEN 'credit_card' THEN 'credit' WHEN 'debit_card' THEN 'debit' ELSE 'cash' END, o.created_at
    FROM public.orders o
    WHERE o.branch_id IN (demo_branch_1_id, demo_branch_2_id) AND o.organization_id = demo_org_id AND o.payment_status = 'paid'
    AND NOT EXISTS (SELECT 1 FROM public.order_payments op WHERE op.order_id = o.id LIMIT 1);
  END IF;

  -- ===== 4. POS & CAJA: 6 months with improving sales (only if admin exists) =====
  IF demo_admin_user_id IS NOT NULL THEN
    FOR d IN 0..180 LOOP
      appt_date := (CURRENT_DATE - (d || ' days')::INTERVAL)::date;
      IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 5 THEN
        -- Sales improve over time: older = less, recent = more
        base_sales := 150000 + (180 - d) * 800 + (random() * 60000)::int;
        -- Branch 1: 6 months
        INSERT INTO public.cash_register_closures (branch_id, closure_date, closed_by, opening_cash_amount, total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales, expected_cash, actual_cash, cash_difference, card_machine_debit_total, card_machine_credit_total, total_subtotal, total_tax, total_discounts, closing_cash_amount, status, opened_at, closed_at, created_at)
        VALUES (demo_branch_1_id, appt_date, demo_admin_user_id, 50000, base_sales, 8 + (random()*15)::int, (base_sales * 4/10)::int, (base_sales * 3/10)::int, (base_sales * 25/100)::int, (base_sales * 5/100)::int, 0, 50000, (50000 + base_sales * 4/10)::int, (random()*2000-1000)::int, (base_sales * 3/10)::int, (base_sales * 25/100)::int, (base_sales/1.19)::numeric(12,2), (base_sales/1.19*0.19)::numeric(12,2), 0, (50000 + base_sales * 4/10)::int, 'confirmed', (appt_date||' 08:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz)
        ON CONFLICT (branch_id, closure_date) DO NOTHING;

        INSERT INTO public.pos_sessions (cashier_id, terminal_id, location, branch_id, opening_cash_amount, closing_cash_amount, opening_time, closing_time, status, created_at, updated_at)
        SELECT demo_admin_user_id, 'TERMINAL-MCL1', 'Casa Matriz', demo_branch_1_id, 50000, (50000 + base_sales)::int, (appt_date||' 08:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz, 'closed', NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM public.pos_sessions ps WHERE ps.branch_id = demo_branch_1_id AND ps.opening_time::date = appt_date LIMIT 1);

        -- Branch 2: only last 60 days (opened 2 months ago)
        IF d <= 60 THEN
          INSERT INTO public.cash_register_closures (branch_id, closure_date, closed_by, opening_cash_amount, total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales, expected_cash, actual_cash, cash_difference, card_machine_debit_total, card_machine_credit_total, total_subtotal, total_tax, total_discounts, closing_cash_amount, status, opened_at, closed_at, created_at)
          VALUES (demo_branch_2_id, appt_date, demo_admin_user_id, 40000, (base_sales * 6/10)::int, 5 + (random()*10)::int, (base_sales * 4/10 * 6/10)::int, (base_sales * 3/10 * 6/10)::int, (base_sales * 25/100 * 6/10)::int, 0, 0, 40000, (40000 + base_sales * 4/10 * 6/10)::int, (random()*1500-750)::int, (base_sales * 3/10 * 6/10)::int, (base_sales * 25/100 * 6/10)::int, (base_sales * 6/10/1.19)::numeric(12,2), (base_sales * 6/10/1.19*0.19)::numeric(12,2), 0, (40000 + base_sales * 4/10 * 6/10)::int, 'confirmed', (appt_date||' 09:00:00')::timestamptz, (appt_date||' 18:30:00')::timestamptz, (appt_date||' 18:30:00')::timestamptz)
          ON CONFLICT (branch_id, closure_date) DO NOTHING;

          INSERT INTO public.pos_sessions (cashier_id, terminal_id, location, branch_id, opening_cash_amount, closing_cash_amount, opening_time, closing_time, status, created_at, updated_at)
          SELECT demo_admin_user_id, 'TERMINAL-MCL2', 'Sucursal Providencia', demo_branch_2_id, 40000, (40000 + base_sales * 6/10)::int, (appt_date||' 09:00:00')::timestamptz, (appt_date||' 18:30:00')::timestamptz, 'closed', NOW(), NOW()
          WHERE NOT EXISTS (SELECT 1 FROM public.pos_sessions ps WHERE ps.branch_id = demo_branch_2_id AND ps.opening_time::date = appt_date LIMIT 1);
        END IF;
      END IF;
    END LOOP;

    -- pos_transactions for paid POS orders (link to session)
    FOR sess_rec IN SELECT ps.id, ps.branch_id, ps.opening_time::date AS sess_date FROM public.pos_sessions ps WHERE ps.branch_id IN (demo_branch_1_id, demo_branch_2_id) AND ps.status = 'closed' LIMIT 200
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

  -- ===== 5. APPOINTMENTS: Current week + Next week (registered + guest) =====
  FOR d IN 0..13 LOOP
    appt_date := CURRENT_DATE + (d || ' days')::INTERVAL;
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      -- Registered customers
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, c.branch_id, demo_org_id, appt_date, ((9 + (d % 6)) || ':00:00')::time, (ARRAY['eye_exam', 'consultation', 'fitting', 'delivery', 'follow_up'])[1 + (d % 5)], CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, 'Semana actual/siguiente', NOW()
      FROM public.customers c WHERE c.organization_id = demo_org_id ORDER BY random() LIMIT 2;

      -- Guest appointments (no customer_id)
      INSERT INTO public.appointments (branch_id, organization_id, guest_first_name, guest_last_name, guest_rut, guest_email, guest_phone, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      VALUES 
        (demo_branch_1_id, demo_org_id, 'Invitado' || d, 'Demo' || d, '22.222.222-' || (d % 10), 'invitado' || d || '@test.cl', '+56 9 7777 777' || d, appt_date, ((10 + (d % 5)) || ':00:00')::time, (ARRAY['eye_exam', 'consultation', 'fitting'])[1 + (d % 3)], 'scheduled', 'Cita invitado', NOW()),
        (demo_branch_2_id, demo_org_id, 'Visitante' || d, 'Prov' || d, '33.333.333-' || (d % 10), 'visitante' || d || '@test.cl', '+56 9 8888 888' || d, appt_date, ((11 + (d % 4)) || ':00:00')::time, (ARRAY['consultation', 'fitting', 'delivery'])[1 + (d % 3)], 'scheduled', 'Cita invitado Providencia', NOW());
    END IF;
  END LOOP;
END;
$$;
