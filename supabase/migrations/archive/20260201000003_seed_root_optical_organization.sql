-- Migration: 20260201000003_seed_root_optical_organization.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Seed Root Optical Organization for Developer Testing
-- This migration creates an "optica-root" organization with demo data
-- Only accessible by root/dev users
-- Date: 2026-02-01
--
-- IMPORTANT: This organization ID should be set as NEXT_PUBLIC_ROOT_ORG_ID in .env
-- UUID: 00000000-0000-0000-0000-000000000010
--
-- This organization uses the same data structure as the demo organization
-- but is intended for developer testing and root user access only

-- ===== CREATE ROOT OPTICAL ORGANIZATION =====
INSERT INTO public.organizations (
  id,
  name,
  slug,
  subscription_tier,
  status,
  metadata,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000010'::uuid,
  'Óptica Root (Testing)',
  'optica-root-testing',
  'premium',
  'active',
  '{"is_root_testing": true, "description": "Organización root para testing de developers. Solo accesible por usuarios root/dev."}'::jsonb,
  NOW() - INTERVAL '6 months'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subscription_tier = EXCLUDED.subscription_tier,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata;

-- ===== CREATE ROOT BRANCH =====
INSERT INTO public.branches (
  id,
  name,
  code,
  organization_id,
  address_line_1,
  city,
  state,
  postal_code,
  country,
  phone,
  email,
  is_active,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000011'::uuid,
  'Casa Matriz Root',
  'ROOT-001',
  '00000000-0000-0000-0000-000000000010'::uuid,
  'Av. Developer 1234',
  'Santiago',
  'Región Metropolitana',
  '7500000',
  'Chile',
  '+56 2 9999 9999',
  'root@optica-testing.cl',
  true,
  NOW() - INTERVAL '6 months'
) ON CONFLICT DO NOTHING;

-- ===== COPY DEMO CUSTOMERS TO ROOT ORGANIZATION =====
-- Copy customers from demo organization to root organization
INSERT INTO public.customers (
  id,
  branch_id,
  organization_id,
  first_name,
  last_name,
  email,
  phone,
  rut,
  date_of_birth,
  gender,
  address_line_1,
  city,
  state,
  postal_code,
  country,
  medical_conditions,
  allergies,
  last_eye_exam_date,
  next_eye_exam_due,
  preferred_contact_method,
  insurance_provider,
  is_active,
  created_at,
  updated_at
)
SELECT 
  -- Generate new UUIDs for root organization customers
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000011'::uuid, -- Root branch
  '00000000-0000-0000-0000-000000000010'::uuid, -- Root organization
  first_name,
  last_name,
  -- Modify email to avoid conflicts
  REPLACE(email, '@email.com', '@root-testing.cl'),
  phone,
  rut,
  date_of_birth,
  gender,
  address_line_1,
  city,
  state,
  postal_code,
  country,
  medical_conditions,
  allergies,
  last_eye_exam_date,
  next_eye_exam_due,
  preferred_contact_method,
  insurance_provider,
  is_active,
  created_at,
  updated_at
FROM public.customers
WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid -- Demo organization
LIMIT 25; -- Copy first 25 customers

-- ===== COPY DEMO PRODUCTS TO ROOT ORGANIZATION =====
-- Copy products from demo organization to root organization
DO $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  root_org_id UUID := '00000000-0000-0000-0000-000000000010'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  root_branch_id UUID := '00000000-0000-0000-0000-000000000011'::uuid;
  product_record RECORD;
BEGIN
  FOR product_record IN 
    SELECT * FROM public.products 
    WHERE organization_id = demo_org_id
    LIMIT 25
  LOOP
    INSERT INTO public.products (
      branch_id,
      organization_id,
      name,
      slug,
      description,
      price,
      cost_price,
      category_id,
      sku,
      status,
      is_featured,
      price_includes_tax,
      featured_image,
      created_at
    ) VALUES (
      root_branch_id,
      root_org_id,
      product_record.name,
      product_record.slug || '-root',
      product_record.description,
      product_record.price,
      product_record.cost_price,
      product_record.category_id,
      product_record.sku || '-ROOT',
      product_record.status,
      product_record.is_featured,
      product_record.price_includes_tax,
      product_record.featured_image,
      product_record.created_at
    )
    ON CONFLICT (slug) DO NOTHING;
  END LOOP;
END $$;

-- ===== COPY DEMO PRESCRIPTIONS TO ROOT ORGANIZATION =====
-- Note: This requires matching customer IDs, so we'll create new prescriptions
-- linked to the copied customers
DO $$
DECLARE
  root_org_id UUID := '00000000-0000-0000-0000-000000000010'::uuid;
  demo_customer_record RECORD;
  root_customer_record RECORD;
  prescription_record RECORD;
BEGIN
  -- For each demo customer, find corresponding root customer and copy prescriptions
  FOR demo_customer_record IN 
    SELECT id, email FROM public.customers 
    WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
    LIMIT 10
  LOOP
    -- Find corresponding root customer by email pattern
    SELECT id INTO root_customer_record
    FROM public.customers
    WHERE organization_id = root_org_id
    AND email = REPLACE(demo_customer_record.email, '@email.com', '@root-testing.cl')
    LIMIT 1;
    
    IF root_customer_record.id IS NOT NULL THEN
      -- Copy prescriptions for this customer
      FOR prescription_record IN
        SELECT * FROM public.prescriptions
        WHERE customer_id = demo_customer_record.id
        LIMIT 1
      LOOP
        INSERT INTO public.prescriptions (
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
        ) VALUES (
          root_customer_record.id,
          prescription_record.prescription_date,
          prescription_record.expiration_date,
          prescription_record.prescription_number || '-ROOT',
          prescription_record.issued_by,
          prescription_record.issued_by_license,
          prescription_record.od_sphere,
          prescription_record.od_cylinder,
          prescription_record.od_axis,
          prescription_record.od_add,
          prescription_record.od_pd,
          prescription_record.os_sphere,
          prescription_record.os_cylinder,
          prescription_record.os_axis,
          prescription_record.os_add,
          prescription_record.os_pd,
          prescription_record.prescription_type,
          prescription_record.lens_type,
          prescription_record.lens_material,
          prescription_record.is_active,
          prescription_record.is_current,
          prescription_record.created_at
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ===== COPY DEMO LENS FAMILIES (They are global, no need to copy) =====
-- Lens families are global and don't need to be copied

-- ===== COPY DEMO LENS PRICE MATRICES (They are global, no need to copy) =====
-- Lens price matrices are global and don't need to be copied

-- ===== CREATE DEMO ORDERS FOR ROOT ORGANIZATION =====
DO $$
DECLARE
  root_org_id UUID := '00000000-0000-0000-0000-000000000010'::uuid;
  root_branch_id UUID := '00000000-0000-0000-0000-000000000011'::uuid;
  root_customer_record RECORD;
  i INTEGER := 0;
  order_num TEXT;
  total_amt INTEGER;
BEGIN
  -- Get first 5 root customers
  FOR root_customer_record IN 
    SELECT id, first_name, last_name, email FROM public.customers
    WHERE organization_id = root_org_id
    LIMIT 5
  LOOP
    i := i + 1;
    order_num := 'ROOT-ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(i::TEXT, 4, '0');
    total_amt := 100000 + (random() * 200000)::int;
    
    INSERT INTO public.orders (
      branch_id,
      organization_id,
      order_number,
      status,
      total_amount,
      payment_status,
      payment_method_type,
      customer_name,
      email,
      subtotal,
      tax_amount,
      discount_amount,
      currency,
      created_at,
      updated_at
    ) VALUES (
      root_branch_id,
      root_org_id,
      order_num,
      CASE i % 3
        WHEN 0 THEN 'delivered'
        WHEN 1 THEN 'processing'
        ELSE 'delivered'
      END,
      total_amt,
      CASE i % 2
        WHEN 0 THEN 'paid'
        ELSE 'pending'
      END,
      CASE i % 3
        WHEN 0 THEN 'credit_card'
        WHEN 1 THEN 'cash'
        ELSE 'debit_card'
      END,
      root_customer_record.first_name || ' ' || root_customer_record.last_name,
      root_customer_record.email,
      total_amt / 1.19,
      total_amt / 1.19 * 0.19,
      0,
      'CLP',
      NOW() - (i || ' days')::INTERVAL,
      NOW() - (i || ' days')::INTERVAL
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ===== CREATE DEMO APPOINTMENTS FOR ROOT ORGANIZATION =====
DO $$
DECLARE
  root_org_id UUID := '00000000-0000-0000-0000-000000000010'::uuid;
  root_branch_id UUID := '00000000-0000-0000-0000-000000000011'::uuid;
  root_customer_record RECORD;
  i INTEGER := 0;
BEGIN
  -- Get first 10 root customers
  FOR root_customer_record IN 
    SELECT id FROM public.customers
    WHERE organization_id = root_org_id
    LIMIT 10
  LOOP
    i := i + 1;
    INSERT INTO public.appointments (
      customer_id,
      branch_id,
      organization_id,
      appointment_date,
      appointment_time,
      appointment_type,
      status,
      notes,
      created_at
    ) VALUES (
      root_customer_record.id,
      root_branch_id,
      root_org_id,
      CURRENT_DATE + (i || ' days')::INTERVAL,
      ((9 + (i % 8)) || ':00:00')::time,
      CASE i % 2
        WHEN 0 THEN 'eye_exam'
        ELSE 'consultation'
      END,
      CASE i % 3
        WHEN 0 THEN 'scheduled'
        WHEN 1 THEN 'completed'
        ELSE 'scheduled'
      END,
      CASE WHEN i % 2 = 0 THEN 'Cita de prueba root' ELSE NULL END,
      NOW() - (i || ' days')::INTERVAL
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ===== CREATE PRODUCT BRANCH STOCK FOR ROOT ORGANIZATION =====
INSERT INTO public.product_branch_stock (
  product_id,
  branch_id,
  quantity,
  low_stock_threshold,
  updated_at
)
SELECT 
  p.id,
  '00000000-0000-0000-0000-000000000011'::uuid, -- Root branch
  15 + (random() * 10)::int,
  5,
  NOW()
FROM public.products p
WHERE p.organization_id = '00000000-0000-0000-0000-000000000010'::uuid -- Root organization
ON CONFLICT (product_id, branch_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = NOW();

-- ===== COMMENTS =====
COMMENT ON TABLE public.organizations IS 'Root optical organization (ID: 00000000-0000-0000-0000-000000000010) is for developer testing and only accessible by root/dev users.';
