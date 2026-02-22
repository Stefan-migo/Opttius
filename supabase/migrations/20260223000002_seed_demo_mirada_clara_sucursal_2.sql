-- Migration: Seed Demo Óptica Mirada Clara - Sucursal 2 (Meses 4-6)
-- Adds branch 2 and 2 months of operational data (T4 to T6).
-- Depends on migration 20260223000001 (sucursal 1).
--
-- Temporal context:
--   T4 (Mes 4): CURRENT_DATE - 2 months (apertura sucursal 2)
--   T6 (Mes 6): Hoy (ambas sucursales operando)
--
-- Branch 2 ID: 00000000-0000-0000-0000-000000000003

DO $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
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
  days_back INTEGER := 60;
  total_amt INTEGER;
  is_demo_admin BOOLEAN := false;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);

  SELECT id INTO demo_admin_user_id FROM public.admin_users WHERE organization_id = demo_org_id LIMIT 1;
  IF demo_admin_user_id IS NOT NULL THEN
    is_demo_admin := true;
  ELSE
    SELECT id INTO demo_admin_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  -- ===== 1. BRANCH 2 (Sucursal Providencia) =====
  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES (demo_branch_2_id, 'Sucursal Providencia', 'MCL-002', demo_org_id, 'Av. Apoquindo 4567', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', '+56 2 2345 6790', 'providencia@miradaclara.cl', true, NOW() - INTERVAL '2 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, email = EXCLUDED.email;

  -- ===== 2. ADMIN_BRANCH_ACCESS (branch 2) =====
  IF demo_admin_user_id IS NOT NULL THEN
    INSERT INTO public.admin_branch_access (admin_user_id, branch_id, role, is_primary)
    VALUES (demo_admin_user_id, demo_branch_2_id, 'manager', false)
    ON CONFLICT (admin_user_id, branch_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  SELECT id INTO marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;

  -- ===== 3. PRODUCT BRANCH STOCK (branch 2, mismos productos de la org) =====
  IF marcos_cat_id IS NOT NULL THEN
    INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
    SELECT p.id, demo_branch_2_id, CASE WHEN p.category_id = marcos_cat_id THEN 10 + (random()*8)::int WHEN p.category_id = lentes_sol_cat_id THEN 15 + (random()*10)::int ELSE 25 END, 5, NOW()
    FROM public.products p WHERE p.organization_id = demo_org_id
    ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
  END IF;

  -- ===== 4. CUSTOMERS (branch 2, 18 clientes) =====
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
  ('11000000-0000-0000-0000-000000000001'::uuid, demo_branch_2_id, demo_org_id, 'Elena', 'Vega', 'elena.vega@providencia.cl', '+56 9 1111 1111', '11.111.111-1', '1982-04-20', 'female', 'Av. Apoquindo 100', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-02-01', '2026-02-01', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '2 months', NOW()),
  ('11000000-0000-0000-0000-000000000002'::uuid, demo_branch_2_id, demo_org_id, 'Roberto', 'Molina', 'roberto.molina@providencia.cl', '+56 9 2222 2222', '11.222.222-2', '1978-09-15', 'male', 'Calle San Damián 200', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-11-10', '2025-11-10', 'whatsapp', 'Fonasa', true, NOW() - INTERVAL '2 months', NOW()),
  ('11000000-0000-0000-0000-000000000003'::uuid, demo_branch_2_id, demo_org_id, 'Claudia', 'Soto', 'claudia.soto@providencia.cl', '+56 9 3333 3333', '11.333.333-3', '1991-12-03', 'female', 'Av. Las Condes 300', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-20', '2026-01-20', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000004'::uuid, demo_branch_2_id, demo_org_id, 'Pablo', 'Contreras', 'pablo.contreras@providencia.cl', '+56 9 4444 4444', '11.444.444-4', '1985-06-28', 'male', 'Pasaje Los Dominicos 400', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2024-10-05', '2025-10-05', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000005'::uuid, demo_branch_2_id, demo_org_id, 'Francisca', 'Lagos', 'francisca.lagos@providencia.cl', '+56 9 5555 5555', '11.555.555-5', '1994-03-12', 'female', 'Av. Kennedy 500', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-09-15', '2025-09-15', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  SELECT ('11000000-0000-0000-0000-' || LPAD(ser.n::text, 12, '0'))::uuid, demo_branch_2_id, demo_org_id, 'ClienteProv' || ser.n, 'Demo' || ser.n, 'prov' || ser.n || '@providencia.cl', '+56 9 6666 666' || ser.n, '11.666.666-' || ser.n, '1988-01-01', CASE WHEN ser.n % 2 = 0 THEN 'female' ELSE 'male' END, 'Av. Providencia ' || (ser.n * 100), 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE + INTERVAL '1 year', 'email', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()
  FROM generate_series(6, 18) AS ser(n)
  ON CONFLICT (id) DO NOTHING;

  -- ===== 5. PRESCRIPTIONS (branch 2) =====
  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-MCL2-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::TEXT, 3, '0'), 'Dr. Carlos Méndez', 'OPTO-20000', -1.5 - (random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), -1.5-(random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.branch_id = demo_branch_2_id
  AND NOT EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id LIMIT 1)
  LIMIT 18;

  -- ===== 6. SCHEDULE_SETTINGS, QUOTE_SETTINGS, POS_SETTINGS (branch 2) =====
  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES (demo_branch_2_id, demo_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"10:00","end_time":"14:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW())
  ON CONFLICT (branch_id) WHERE branch_id IS NOT NULL DO UPDATE SET slot_duration_minutes = EXCLUDED.slot_duration_minutes;

  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  SELECT demo_branch_2_id, demo_org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.quote_settings WHERE branch_id = demo_branch_2_id);

  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (demo_branch_2_id, 50.00, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET min_deposit_percent = EXCLUDED.min_deposit_percent;

  -- ===== 7. APPOINTMENTS (branch 2, meses 4-6, ~50 citas) =====
  FOR i IN 1..50 LOOP
    appt_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_2_id, demo_org_id, appt_date, ((10 + (i % 6)) || ':00:00')::time, (ARRAY['eye_exam', 'consultation', 'fitting', 'delivery', 'follow_up'])[1 + (i % 5)], CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, 'Sucursal Providencia', NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_2_id ORDER BY random() LIMIT 1;
    END IF;
  END LOOP;

  -- ===== 8. QUOTES (branch 2, ~18) =====
  SELECT id INTO frame_product_id FROM public.products WHERE organization_id = demo_org_id AND category_id = marcos_cat_id LIMIT 1;
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000010'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    quote_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 15
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'COT-MCL2-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - (random()*days_back)::INT, CURRENT_DATE - (random()*days_back)::INT + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', 129900, lens_family_id, 'progressive', 'polycarbonate', ARRAY['anti_reflective'], 'progressive', 65000, 189990, 30000, 15000, 299990, 56998, 0, 356988, 'CLP', (ARRAY['draft', 'sent', 'accepted'])[1 + (quote_num % 3)], 'Presupuesto Providencia', NOW() - (random()*days_back)::INT * INTERVAL '1 day')
      ON CONFLICT (quote_number) DO NOTHING;
      quote_num := quote_num + 1;
    END LOOP;
  END IF;

  -- ===== 9. LAB WORK ORDERS (branch 2, ~15) =====
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000002'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    wo_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 12
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      status_idx := 1 + (random() * 8)::int;
      INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'TRB-MCL2-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - (random()*days_back)::INT, rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective'], 'none', 45000, 59990, 30000, 15000, 28000, 149990, 28498, 0, 178488, 'CLP', status_list[status_idx], CASE status_list[status_idx] WHEN 'delivered' THEN 'paid' WHEN 'ready_for_pickup' THEN 'partial' ELSE 'pending' END, 'Trabajo Providencia', NOW() - (random()*days_back)::INT * INTERVAL '1 day', NOW() - (random()*(days_back-5))::INT * INTERVAL '1 day', NOW() - (random()*(days_back-10))::INT * INTERVAL '1 day', CASE WHEN status_list[status_idx] = 'delivered' THEN NOW() - (random()*30)::INT * INTERVAL '1 day' ELSE NULL END)
      ON CONFLICT (work_order_number) DO NOTHING;
      wo_num := wo_num + 1;
    END LOOP;
  END IF;

  -- ===== 10. ORDERS (branch 2, ~35) =====
  ord_num := 1;
  FOR i IN 1..35 LOOP
    ord_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    total_amt := 70000 + (random()*180000)::int;
    INSERT INTO public.orders (branch_id, organization_id, order_number, status, total_amount, payment_status, payment_method_type, customer_name, email, subtotal, tax_amount, discount_amount, currency, is_pos_sale, pos_cashier_id, created_at, updated_at)
    SELECT demo_branch_2_id, demo_org_id, 'ORD-MCL2-' || TO_CHAR(ord_date, 'YYYY') || '-' || LPAD(ord_num::TEXT, 5, '0'), CASE WHEN random()>0.1 THEN 'delivered' ELSE 'processing' END, total_amt, CASE WHEN random()>0.12 THEN 'paid' ELSE 'pending' END, (ARRAY['cash', 'credit_card', 'debit_card'])[1 + (random()*2)::int], c.first_name || ' ' || c.last_name, c.email, total_amt/1.19, total_amt/1.19*0.19, 0, 'CLP', random()>0.5, demo_admin_user_id, ord_date + INTERVAL '11 hours', ord_date + INTERVAL '11 hours'
    FROM public.customers c WHERE c.branch_id = demo_branch_2_id ORDER BY random() LIMIT 1
    ON CONFLICT (order_number) DO NOTHING;
    ord_num := ord_num + 1;
  END LOOP;

  -- ===== 11. ORDER_ITEMS =====
  FOR ord_rec IN SELECT o.id, o.total_amount FROM public.orders o WHERE o.branch_id = demo_branch_2_id AND o.organization_id = demo_org_id LIMIT 30
  LOOP
    SELECT p.id, p.name, p.sku, p.price INTO prod_rec FROM public.products p WHERE p.organization_id = demo_org_id ORDER BY random() LIMIT 1;
    IF prod_rec.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = ord_rec.id LIMIT 1) THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price, product_name, sku, created_at)
      VALUES (ord_rec.id, prod_rec.id, 1, prod_rec.price, prod_rec.price, prod_rec.name, prod_rec.sku, NOW());
    END IF;
  END LOOP;

  -- ===== 12. ORDER_PAYMENTS =====
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
  WHERE o.branch_id = demo_branch_2_id AND o.organization_id = demo_org_id AND o.payment_status = 'paid'
  AND NOT EXISTS (SELECT 1 FROM public.order_payments op WHERE op.order_id = o.id LIMIT 1)
  LIMIT 25;

  -- ===== 13. CASH REGISTER CLOSURES + POS SESSIONS (branch 2) =====
  IF demo_admin_user_id IS NOT NULL THEN
    FOR i IN 0..days_back LOOP
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
  END IF;

  -- ===== 14. OPTICAL INTERNAL SUPPORT TICKETS (branch 2, opcional) =====
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
END;
$$;

COMMENT ON TABLE public.branches IS 'Demo Óptica Mirada Clara: branch 2 (Providencia) 00000000-0000-0000-0000-000000000003. Apertura mes 4.';
