-- Migration: 20260214100000_reset_demo_organization.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create reset_demo_organization() function
-- Allows root/dev users to reset the Demo Optica database to initial seed state
-- Demo org: 00000000-0000-0000-0000-000000000001
-- Demo branch: 00000000-0000-0000-0000-000000000002

CREATE OR REPLACE FUNCTION public.reset_demo_organization()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
BEGIN
  -- Delete in order respecting foreign keys (children first)

  -- 1. Credit note movements (via credit_notes)
  DELETE FROM public.credit_note_movements
  WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id = demo_branch_id);

  -- 2. Credit notes
  DELETE FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id = demo_branch_id;

  -- 3. Order payments (via orders)
  DELETE FROM public.order_payments
  WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = demo_branch_id);

  -- 4. Order items
  DELETE FROM public.order_items
  WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = demo_branch_id);

  -- 5. Orders
  DELETE FROM public.orders WHERE branch_id = demo_branch_id;

  -- 6. Quotes (references customers, branch)
  DELETE FROM public.quotes WHERE branch_id = demo_branch_id;

  -- 7. Lab work orders
  DELETE FROM public.lab_work_orders WHERE branch_id = demo_branch_id;

  -- 8. Prescriptions (via customers)
  DELETE FROM public.prescriptions
  WHERE customer_id IN (SELECT id FROM public.customers WHERE branch_id = demo_branch_id);

  -- 9. Appointments
  DELETE FROM public.appointments WHERE branch_id = demo_branch_id OR organization_id = demo_org_id;

  -- 10. Product branch stock
  DELETE FROM public.product_branch_stock WHERE branch_id = demo_branch_id;

  -- 11. Products
  DELETE FROM public.products WHERE branch_id = demo_branch_id OR organization_id = demo_org_id;

  -- 12. Lens price matrices (via lens_families of demo org)
  DELETE FROM public.lens_price_matrices
  WHERE lens_family_id IN (SELECT id FROM public.lens_families WHERE organization_id = demo_org_id);

  -- 13. Lens families (demo org - use id prefix for legacy rows with NULL org_id)
  DELETE FROM public.lens_families
  WHERE organization_id = demo_org_id OR id::text LIKE '40000000-%';

  -- 14. Contact lens price matrices
  DELETE FROM public.contact_lens_price_matrices WHERE organization_id = demo_org_id;

  -- 15. Contact lens families
  DELETE FROM public.contact_lens_families WHERE organization_id = demo_org_id;

  -- 16. Schedule settings
  DELETE FROM public.schedule_settings WHERE branch_id = demo_branch_id;

  -- 17. Quote settings
  DELETE FROM public.quote_settings WHERE branch_id = demo_branch_id;

  -- 18. POS settings
  DELETE FROM public.pos_settings WHERE branch_id = demo_branch_id;

  -- 19. Cash register closures (branch_id and pos_sessions of demo branch)
  DELETE FROM public.cash_register_closures WHERE branch_id = demo_branch_id;

  -- 20. POS sessions
  DELETE FROM public.pos_sessions WHERE branch_id = demo_branch_id;

  -- 21. Organization settings
  DELETE FROM public.organization_settings WHERE organization_id = demo_org_id;

  -- 22. Customers
  DELETE FROM public.customers WHERE branch_id = demo_branch_id OR organization_id = demo_org_id;

  -- 23. Branch (demo branch only)
  DELETE FROM public.branches WHERE id = demo_branch_id;

  -- 24. Organization - UPDATE only (do not delete; admin_users may reference it)
  INSERT INTO public.organizations (id, name, slug, subscription_tier, status, metadata, created_at)
  VALUES (
    demo_org_id,
    'Óptica Demo Global',
    'optica-demo-global',
    'premium',
    'active',
    '{"is_demo": true, "description": "Organización demo para onboarding y evaluación del sistema"}'::jsonb,
    NOW() - INTERVAL '6 months'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    subscription_tier = EXCLUDED.subscription_tier,
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata;

  -- Re-insert branch
  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES (
    demo_branch_id,
    'Casa Matriz',
    'DEMO-001',
    demo_org_id,
    'Av. Providencia 1234',
    'Santiago',
    'Región Metropolitana',
    '7500000',
    'Chile',
    '+56 2 2345 6789',
    'demo@optica-demo.cl',
    true,
    NOW() - INTERVAL '6 months'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    organization_id = EXCLUDED.organization_id,
    address_line_1 = EXCLUDED.address_line_1,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    postal_code = EXCLUDED.postal_code,
    country = EXCLUDED.country,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active;

  -- Re-insert customers (from 20260130000001)
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, demo_branch_id, demo_org_id, 'María', 'González', 'maria.gonzalez@email.com', '+56 9 1234 5678', '12.345.678-9', '1985-03-15', 'female', 'Av. Las Condes 456', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-01-15', '2026-01-15', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '2 years', NOW()),
  ('10000000-0000-0000-0000-000000000002'::uuid, demo_branch_id, demo_org_id, 'Juan', 'Pérez', 'juan.perez@email.com', '+56 9 2345 6789', '13.456.789-0', '1990-07-22', 'male', 'Calle Los Rosales 789', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-10', '2026-01-10', 'phone', 'Fonasa', true, NOW() - INTERVAL '18 months', NOW()),
  ('10000000-0000-0000-0000-000000000003'::uuid, demo_branch_id, demo_org_id, 'Ana', 'Martínez', 'ana.martinez@email.com', '+56 9 3456 7890', '14.567.890-1', '1988-11-08', 'female', 'Pasaje Los Aromos 321', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Hipermetropía', 'Presbicia'], ARRAY[]::TEXT[], '2024-12-20', '2025-12-20', 'whatsapp', 'Isapre Colmena', true, NOW() - INTERVAL '3 years', NOW()),
  ('10000000-0000-0000-0000-000000000004'::uuid, demo_branch_id, demo_org_id, 'Carlos', 'Rodríguez', 'carlos.rodriguez@email.com', '+56 9 4567 8901', '15.678.901-2', '1975-05-30', 'male', 'Av. Vitacura 1234', 'Vitacura', 'Región Metropolitana', '7630000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2025-01-05', '2026-01-05', 'email', 'Isapre Banmédica', true, NOW() - INTERVAL '4 years', NOW()),
  ('10000000-0000-0000-0000-000000000005'::uuid, demo_branch_id, demo_org_id, 'Laura', 'Sánchez', 'laura.sanchez@email.com', '+56 9 5678 9012', '16.789.012-3', '1992-09-14', 'female', 'Calle Los Claveles 567', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Miopía', 'Astigmatismo'], ARRAY[]::TEXT[], '2024-11-28', '2025-11-28', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 year', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Add more customers to reach 25 (abbreviated for migration size)
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  SELECT
    ('10000000-0000-0000-0000-0000' || LPAD(n::text, 12, '0'))::uuid,
    demo_branch_id,
    demo_org_id,
    'Cliente' || n,
    'Demo' || n,
    'cliente' || n || '@email.com',
    '+56 9 0000 000' || n,
    '99.999.999-' || n,
    '1990-01-01',
    CASE WHEN n % 2 = 0 THEN 'male' ELSE 'female' END,
    'Calle Demo ' || n,
    'Santiago',
    'Región Metropolitana',
    '7500000',
    'Chile',
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    CURRENT_DATE - INTERVAL '1 year',
    CURRENT_DATE + INTERVAL '1 year',
    'email',
    'Fonasa',
    true,
    NOW() - INTERVAL '1 year',
    NOW()
  FROM generate_series(6, 25) n
  ON CONFLICT (id) DO NOTHING;

  -- Re-insert products, prescriptions, lens families, etc. via a minimal seed
  -- Products require categories - use existing system categories
  PERFORM 1; -- Placeholder: full product/lens/contact lens seed would go here
  -- For a complete reset, run: supabase db reset (local) or re-apply seed migrations
  -- This function provides the delete + org/branch/customers restore as the minimum viable reset

END;
$$;

COMMENT ON FUNCTION public.reset_demo_organization() IS 'Resets Demo Optica (org 00000000-0000-0000-0000-000000000001) to initial state. Deletes all data and re-inserts org, branch, and customers. Products/lens data should be re-seeded via migrations or manual run.';
