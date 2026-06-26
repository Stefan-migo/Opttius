-- Migration: 20260215100004_reset_demo_skip_missing_credit_notes.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Make reset_demo_organization skip credit_notes/credit_note_movements if tables don't exist
-- Fixes: relation "public.credit_note_movements" does not exist

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

  -- Skip credit_note tables if they don't exist (optional feature)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_notes') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_note_movements') THEN
      DELETE FROM public.credit_note_movements
      WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id IN (demo_branch_id, demo_branch_2_id));
    END IF;
    DELETE FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id IN (demo_branch_id, demo_branch_2_id);
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
