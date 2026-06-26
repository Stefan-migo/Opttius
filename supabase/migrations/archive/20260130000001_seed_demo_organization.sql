-- Migration: 20260130000001_seed_demo_organization.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Seed Demo Organization with Realistic Data (IMPROVED VERSION)
-- This migration creates a demo organization "Óptica Demo Global" with comprehensive sample data
-- for testing and onboarding purposes
-- 
-- IMPORTANT: This organization ID should be set as NEXT_PUBLIC_DEMO_ORG_ID in .env
-- UUID: 00000000-0000-0000-0000-000000000001
--
-- Improvements:
-- - Uses default system categories (marcos, lentes-de-sol, accesorios, servicios)
-- - Products have images (URLs)
-- - Products have IVA included (price_includes_tax = true)
-- - Lens families configured for Chilean optical shops
-- - Price matrices configured with realistic Chilean prices
-- - Historical cash register closures (last 30 days)
-- - Historical POS sessions (last 2-3 months)

-- ===== CREATE DEMO ORGANIZATION =====
INSERT INTO public.organizations (
  id,
  name,
  slug,
  subscription_tier,
  status,
  metadata,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Óptica Demo Global',
  'optica-demo-global',
  'premium',
  'active',
  '{"is_demo": true, "description": "Organización demo para onboarding y evaluación del sistema"}'::jsonb,
  NOW() - INTERVAL '6 months'
) ON CONFLICT (slug) DO NOTHING;

-- ===== CREATE DEMO BRANCH =====
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
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Casa Matriz',
  'DEMO-001',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Av. Providencia 1234',
  'Santiago',
  'Región Metropolitana',
  '7500000',
  'Chile',
  '+56 2 2345 6789',
  'demo@optica-demo.cl',
  true,
  NOW() - INTERVAL '6 months'
) ON CONFLICT DO NOTHING;

-- ===== CREATE DEMO CUSTOMERS (25 customers) =====
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
) VALUES
('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'María', 'González', 'maria.gonzalez@email.com', '+56 9 1234 5678', '12.345.678-9', '1985-03-15', 'female', 'Av. Las Condes 456', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-01-15', '2026-01-15', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '2 years', NOW()),
('10000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Juan', 'Pérez', 'juan.perez@email.com', '+56 9 2345 6789', '13.456.789-0', '1990-07-22', 'male', 'Calle Los Rosales 789', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-10', '2026-01-10', 'phone', 'Fonasa', true, NOW() - INTERVAL '18 months', NOW()),
('10000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Ana', 'Martínez', 'ana.martinez@email.com', '+56 9 3456 7890', '14.567.890-1', '1988-11-08', 'female', 'Pasaje Los Aromos 321', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Hipermetropía', 'Presbicia'], ARRAY[]::TEXT[], '2024-12-20', '2025-12-20', 'whatsapp', 'Isapre Colmena', true, NOW() - INTERVAL '3 years', NOW()),
('10000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Carlos', 'Rodríguez', 'carlos.rodriguez@email.com', '+56 9 4567 8901', '15.678.901-2', '1975-05-30', 'male', 'Av. Vitacura 1234', 'Vitacura', 'Región Metropolitana', '7630000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2025-01-05', '2026-01-05', 'email', 'Isapre Banmédica', true, NOW() - INTERVAL '4 years', NOW()),
('10000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Laura', 'Sánchez', 'laura.sanchez@email.com', '+56 9 5678 9012', '16.789.012-3', '1992-09-14', 'female', 'Calle Los Claveles 567', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Miopía', 'Astigmatismo'], ARRAY[]::TEXT[], '2024-11-28', '2025-11-28', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 year', NOW()),
('10000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Roberto', 'López', 'roberto.lopez@email.com', '+56 9 6789 0123', '17.890.123-4', '1983-02-18', 'male', 'Av. Apoquindo 2345', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-10-15', '2025-10-15', 'phone', 'Isapre Consalud', true, NOW() - INTERVAL '2 years', NOW()),
('10000000-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Carmen', 'Fernández', 'carmen.fernandez@email.com', '+56 9 7890 1234', '18.901.234-5', '1978-12-25', 'female', 'Calle Los Olivos 890', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-09-20', '2025-09-20', 'email', 'Fonasa', true, NOW() - INTERVAL '3 years', NOW()),
('10000000-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Diego', 'Torres', 'diego.torres@email.com', '+56 9 8901 2345', '19.012.345-6', '1995-04-07', 'male', 'Pasaje Los Jazmines 456', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-08-10', '2025-08-10', 'whatsapp', 'Isapre Colmena', true, NOW() - INTERVAL '1 year', NOW()),
('10000000-0000-0000-0000-000000000009'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Patricia', 'Morales', 'patricia.morales@email.com', '+56 9 9012 3456', '20.123.456-7', '1987-08-19', 'female', 'Av. Nueva Providencia 3456', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2024-07-05', '2025-07-05', 'email', 'Isapre Banmédica', true, NOW() - INTERVAL '2 years', NOW()),
('10000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Fernando', 'Ramírez', 'fernando.ramirez@email.com', '+56 9 0123 4567', '21.234.567-8', '1981-01-31', 'male', 'Calle Los Laureles 678', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2024-06-18', '2025-06-18', 'phone', 'Fonasa', true, NOW() - INTERVAL '3 years', NOW()),
('10000000-0000-0000-0000-000000000011'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Sofía', 'Vargas', 'sofia.vargas@email.com', '+56 9 1234 5679', '22.345.678-9', '1993-06-12', 'female', 'Av. Las Condes 5678', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía', 'Astigmatismo'], ARRAY[]::TEXT[], '2024-05-22', '2025-05-22', 'whatsapp', 'Isapre Consalud', true, NOW() - INTERVAL '1 year', NOW()),
('10000000-0000-0000-0000-000000000012'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Andrés', 'Castro', 'andres.castro@email.com', '+56 9 2345 6780', '23.456.789-0', '1989-10-03', 'male', 'Calle Los Pinos 901', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-04-14', '2025-04-14', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '2 years', NOW()),
('10000000-0000-0000-0000-000000000013'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Valentina', 'Jiménez', 'valentina.jimenez@email.com', '+56 9 3456 7891', '24.567.890-1', '1991-03-27', 'female', 'Pasaje Los Eucaliptos 234', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-03-08', '2025-03-08', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 year', NOW()),
('10000000-0000-0000-0000-000000000014'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Ricardo', 'Herrera', 'ricardo.herrera@email.com', '+56 9 4567 8902', '25.678.901-2', '1976-09-09', 'male', 'Av. Vitacura 2345', 'Vitacura', 'Región Metropolitana', '7630000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-02-19', '2025-02-19', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '4 years', NOW()),
('10000000-0000-0000-0000-000000000015'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Isabel', 'Moreno', 'isabel.moreno@email.com', '+56 9 5678 9013', '26.789.012-3', '1984-12-16', 'female', 'Calle Los Cipreses 567', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Hipermetropía', 'Presbicia'], ARRAY[]::TEXT[], '2024-01-30', '2025-01-30', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '3 years', NOW()),
('10000000-0000-0000-0000-000000000016'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Gabriel', 'Ortega', 'gabriel.ortega@email.com', '+56 9 6789 0124', '27.890.123-4', '1994-07-23', 'male', 'Av. Apoquindo 3456', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2023-12-12', '2024-12-12', 'whatsapp', 'Isapre Colmena', true, NOW() - INTERVAL '1 year', NOW()),
('10000000-0000-0000-0000-000000000017'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Natalia', 'Silva', 'natalia.silva@email.com', '+56 9 7890 1235', '28.901.234-5', '1996-05-04', 'female', 'Calle Los Almendros 789', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2023-11-25', '2024-11-25', 'email', 'Fonasa', true, NOW() - INTERVAL '8 months', NOW()),
('10000000-0000-0000-0000-000000000018'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Mauricio', 'Díaz', 'mauricio.diaz@email.com', '+56 9 8901 2346', '29.012.345-6', '1980-11-11', 'male', 'Pasaje Los Robles 123', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2023-10-18', '2024-10-18', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '2 years', NOW()),
('10000000-0000-0000-0000-000000000019'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Camila', 'Ruiz', 'camila.ruiz@email.com', '+56 9 9012 3457', '30.123.456-7', '1986-02-28', 'female', 'Av. Nueva Providencia 4567', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía', 'Astigmatismo'], ARRAY[]::TEXT[], '2023-09-30', '2024-09-30', 'whatsapp', 'Isapre Consalud', true, NOW() - INTERVAL '2 years', NOW()),
('10000000-0000-0000-0000-000000000020'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Sebastián', 'Mendoza', 'sebastian.mendoza@email.com', '+56 9 0123 4568', '31.234.567-8', '1997-08-15', 'male', 'Calle Los Fresnos 345', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2023-08-22', '2024-08-22', 'sms', 'Fonasa', true, NOW() - INTERVAL '6 months', NOW()),
('10000000-0000-0000-0000-000000000021'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Daniela', 'Cruz', 'daniela.cruz@email.com', '+56 9 1234 5680', '32.345.678-9', '1992-04-20', 'female', 'Av. Las Condes 6789', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2023-07-14', '2024-07-14', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '1 year', NOW()),
('10000000-0000-0000-0000-000000000022'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Felipe', 'Guzmán', 'felipe.guzman@email.com', '+56 9 2345 6791', '33.456.789-0', '1988-01-05', 'male', 'Calle Los Tilos 456', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2023-06-26', '2024-06-26', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '2 years', NOW()),
('10000000-0000-0000-0000-000000000023'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Andrea', 'Navarro', 'andrea.navarro@email.com', '+56 9 3456 7902', '34.567.890-1', '1990-10-17', 'female', 'Pasaje Los Abedules 890', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2023-05-08', '2024-05-08', 'whatsapp', 'Fonasa', true, NOW() - INTERVAL '1 year', NOW()),
('10000000-0000-0000-0000-000000000024'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Rodrigo', 'Peña', 'rodrigo.pena@email.com', '+56 9 4567 9014', '35.678.901-2', '1979-06-29', 'male', 'Av. Vitacura 3456', 'Vitacura', 'Región Metropolitana', '7630000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2023-04-20', '2024-04-20', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '3 years', NOW()),
('10000000-0000-0000-0000-000000000025'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Paula', 'Rojas', 'paula.rojas@email.com', '+56 9 5678 9025', '36.789.012-3', '1993-12-02', 'female', 'Calle Los Sauces 234', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2023-03-12', '2024-03-12', 'sms', 'Isapre Colmena', true, NOW() - INTERVAL '1 year', NOW())
ON CONFLICT DO NOTHING;

-- ===== CREATE DEMO PRODUCTS USING DEFAULT CATEGORIES =====
-- Use existing system categories: marcos, lentes-de-sol, accesorios, servicios
DO $$
DECLARE
  marcos_cat_id UUID;
  lentes_sol_cat_id UUID;
  accesorios_cat_id UUID;
  servicios_cat_id UUID;
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
BEGIN
  -- Get default system categories (they should exist from migrations)
  SELECT id INTO marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;

  -- Insert Frame Products (Marcos) - 10 frames with images and IVA included
  INSERT INTO public.products (
    id, branch_id, organization_id, name, slug, description, price, cost_price, 
    category_id, sku, status, is_featured, price_includes_tax, featured_image,
    created_at
  ) VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, demo_branch_id, demo_org_id, 'Marco Ray-Ban RB2140', 'marco-ray-ban-rb2140', 'Marco clásico aviador de Ray-Ban. Diseño icónico con montura metálica.', 89900, 45000, marcos_cat_id, 'RB-2140-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000002'::uuid, demo_branch_id, demo_org_id, 'Marco Oakley OO9208', 'marco-oakley-oo9208', 'Marco deportivo Oakley con protección UV y diseño ergonómico.', 129900, 65000, marcos_cat_id, 'OO-9208-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000003'::uuid, demo_branch_id, demo_org_id, 'Marco Gucci GG0061', 'marco-gucci-gg0061', 'Marco de lujo Gucci con diseño moderno y acabados premium.', 249900, 125000, marcos_cat_id, 'GG-0061-BRN', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000004'::uuid, demo_branch_id, demo_org_id, 'Marco Prada PR17VS', 'marco-prada-pr17vs', 'Marco Prada con estilo elegante y diseño sofisticado.', 199900, 100000, marcos_cat_id, 'PR-17VS-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000005'::uuid, demo_branch_id, demo_org_id, 'Marco Versace VE4289', 'marco-versace-ve4289', 'Marco Versace con diseño sofisticado y detalles dorados.', 179900, 90000, marcos_cat_id, 'VE-4289-GLD', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000006'::uuid, demo_branch_id, demo_org_id, 'Marco Tom Ford TF5156', 'marco-tom-ford-tf5156', 'Marco Tom Ford estilo clásico con montura acetato.', 219900, 110000, marcos_cat_id, 'TF-5156-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000007'::uuid, demo_branch_id, demo_org_id, 'Marco Armani EA4062', 'marco-armani-ea4062', 'Marco Armani diseño contemporáneo con líneas limpias.', 159900, 80000, marcos_cat_id, 'EA-4062-BRN', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000008'::uuid, demo_branch_id, demo_org_id, 'Marco Dior DIORSTORM', 'marco-dior-diormstorm', 'Marco Dior con estilo vanguardista y diseño único.', 229900, 115000, marcos_cat_id, 'DIOR-STORM-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000009'::uuid, demo_branch_id, demo_org_id, 'Marco Persol PO3019', 'marco-persol-po3019', 'Marco Persol estilo italiano con diseño clásico.', 149900, 75000, marcos_cat_id, 'PO-3019-BLK', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000010'::uuid, demo_branch_id, demo_org_id, 'Marco Maui Jim MJ202', 'marco-maui-jim-mj202', 'Marco Maui Jim para deportes acuáticos con protección polarizada.', 139900, 70000, marcos_cat_id, 'MJ-202-BLU', 'active', false, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW() - INTERVAL '6 months')
  ON CONFLICT (slug) DO NOTHING;

  -- Insert Sunglasses (Lentes de sol) - 5 pairs with images and IVA included
  INSERT INTO public.products (
    id, branch_id, organization_id, name, slug, description, price, cost_price, 
    category_id, sku, status, is_featured, price_includes_tax, featured_image,
    created_at
  ) VALUES
  ('20000000-0000-0000-0000-000000000011'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Ray-Ban Aviator', 'gafas-sol-ray-ban-aviator', 'Gafas de sol Ray-Ban Aviator clásicas con protección UV 400.', 119900, 60000, lentes_sol_cat_id, 'RB-AVI-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000012'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Oakley Holbrook', 'gafas-sol-oakley-holbrook', 'Gafas de sol Oakley Holbrook con lentes polarizadas.', 149900, 75000, lentes_sol_cat_id, 'OO-HOL-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000013'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Gucci GG0061S', 'gafas-sol-gucci-gg0061s', 'Gafas de sol Gucci con diseño exclusivo y protección UV.', 299900, 150000, lentes_sol_cat_id, 'GG-0061S-SUN', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000014'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Prada PR17VS-SUN', 'gafas-sol-prada-pr17vs', 'Gafas de sol Prada con montura elegante y lentes degradadas.', 229900, 115000, lentes_sol_cat_id, 'PR-17VS-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000015'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Maui Jim Peahi', 'gafas-sol-maui-jim-peahi', 'Gafas de sol Maui Jim con tecnología SuperThin Glass y protección HCL.', 189900, 95000, lentes_sol_cat_id, 'MJ-PEAHI-SUN', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW() - INTERVAL '6 months')
  ON CONFLICT (slug) DO NOTHING;

  -- Insert Accessories (Accesorios) - 5 accessories with images and IVA included
  INSERT INTO public.products (
    id, branch_id, organization_id, name, slug, description, price, cost_price, 
    category_id, sku, status, price_includes_tax, featured_image, created_at
  ) VALUES
  ('20000000-0000-0000-0000-000000000016'::uuid, demo_branch_id, demo_org_id, 'Estuche Rígido Premium', 'estuche-rigido-premium', 'Estuche rígido para lentes con protección superior.', 12900, 5000, accesorios_cat_id, 'ACC-EST-RIG', 'active', true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000017'::uuid, demo_branch_id, demo_org_id, 'Paño de Limpieza Microfibra', 'pano-limpieza-microfibra', 'Paño de limpieza de microfibra suave para lentes.', 4900, 2000, accesorios_cat_id, 'ACC-PANO-MIC', 'active', true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000018'::uuid, demo_branch_id, demo_org_id, 'Líquido Limpiador para Lentes', 'liquido-limpiador-lentes', 'Líquido limpiador profesional para lentes sin alcohol.', 8900, 3500, accesorios_cat_id, 'ACC-LIQ-LIM', 'active', true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000019'::uuid, demo_branch_id, demo_org_id, 'Cordón Deportivo para Lentes', 'cordon-deportivo-lentes', 'Cordón elástico para mantener lentes durante actividades deportivas.', 14900, 6000, accesorios_cat_id, 'ACC-CORD-DEP', 'active', true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000020'::uuid, demo_branch_id, demo_org_id, 'Kit Limpieza Completo', 'kit-limpieza-completo', 'Kit completo con paño, líquido y estuche de viaje.', 24900, 10000, accesorios_cat_id, 'ACC-KIT-LIM', 'active', true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW() - INTERVAL '6 months')
  ON CONFLICT (slug) DO NOTHING;

  -- Insert Services (Servicios) - 5 services with IVA included
  INSERT INTO public.products (
    id, branch_id, organization_id, name, slug, description, price, cost_price, 
    category_id, sku, status, price_includes_tax, created_at
  ) VALUES
  ('20000000-0000-0000-0000-000000000021'::uuid, demo_branch_id, demo_org_id, 'Reparación de Marco', 'reparacion-marco', 'Servicio de reparación y ajuste de marco de lentes.', 19900, 0, servicios_cat_id, 'SERV-REP-MAR', 'active', true, NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000022'::uuid, demo_branch_id, demo_org_id, 'Montaje de Lentes', 'montaje-lentes', 'Servicio de montaje de lentes en marco existente.', 29900, 0, servicios_cat_id, 'SERV-MON-LEN', 'active', true, NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000023'::uuid, demo_branch_id, demo_org_id, 'Ajuste de Marco', 'ajuste-marco', 'Servicio de ajuste profesional de marco a medida.', 9900, 0, servicios_cat_id, 'SERV-AJU-MAR', 'active', true, NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000024'::uuid, demo_branch_id, demo_org_id, 'Examen de la Vista', 'examen-vista', 'Examen completo de la vista con optometrista.', 25000, 0, servicios_cat_id, 'SERV-EXA-VIS', 'active', true, NOW() - INTERVAL '6 months'),
  ('20000000-0000-0000-0000-000000000025'::uuid, demo_branch_id, demo_org_id, 'Consulta Optométrica', 'consulta-optometrica', 'Consulta con optometrista para evaluación visual.', 15000, 0, servicios_cat_id, 'SERV-CON-OPT', 'active', true, NOW() - INTERVAL '6 months')
  ON CONFLICT (slug) DO NOTHING;
END $$;

-- ===== CREATE DEMO PRESCRIPTIONS (10+) =====
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
) VALUES
('30000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '2025-01-15', '2026-01-15', 'REC-2025-001', 'Dr. Carlos Méndez', 'OPTO-12345', -2.50, NULL, NULL, NULL, 32.0, -2.25, NULL, NULL, NULL, 32.0, 'single_vision', 'Monofocal', 'CR39', true, true, NOW() - INTERVAL '15 days'),
('30000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '2025-01-10', '2026-01-10', 'REC-2025-002', 'Dra. Ana Silva', 'OPTO-12346', -1.75, -0.75, 180, NULL, 31.5, -1.50, -0.50, 5, NULL, 31.5, 'single_vision', 'Monofocal', 'Alto Índice 1.67', true, true, NOW() - INTERVAL '20 days'),
('30000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '2024-12-20', '2025-12-20', 'REC-2024-120', 'Dr. Roberto López', 'OPTO-12347', +0.50, NULL, NULL, +2.00, 32.5, +0.75, NULL, NULL, +2.00, 32.5, 'progressive', 'Progresivo', 'Premium', true, true, NOW() - INTERVAL '40 days'),
('30000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '2025-01-05', '2026-01-05', 'REC-2025-003', 'Dra. María González', 'OPTO-12348', -4.25, NULL, NULL, NULL, 33.0, -4.00, NULL, NULL, NULL, 33.0, 'single_vision', 'Monofocal', 'Alto Índice 1.67', true, true, NOW() - INTERVAL '25 days'),
('30000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '2024-11-28', '2025-11-28', 'REC-2024-115', 'Dr. Fernando Ramírez', 'OPTO-12349', -3.00, -1.25, 90, NULL, 31.0, -2.75, -1.00, 85, NULL, 31.0, 'single_vision', 'Monofocal', 'Alto Índice 1.67', true, true, NOW() - INTERVAL '60 days'),
('30000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '2024-10-15', '2025-10-15', 'REC-2024-098', 'Dra. Carmen Fernández', 'OPTO-12350', +1.50, NULL, NULL, NULL, 32.0, +1.75, NULL, NULL, NULL, 32.0, 'single_vision', 'Monofocal', 'CR39', true, true, NOW() - INTERVAL '75 days'),
('30000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '2024-09-20', '2025-09-20', 'REC-2024-085', 'Dr. Diego Torres', 'OPTO-12351', +0.25, NULL, NULL, +2.50, 33.5, +0.50, NULL, NULL, +2.50, 33.5, 'bifocal', 'Bifocal', 'Estándar', true, true, NOW() - INTERVAL '100 days'),
('30000000-0000-0000-0000-000000000008'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '2024-08-10', '2025-08-10', 'REC-2024-072', 'Dra. Patricia Morales', 'OPTO-12352', 0.00, -1.50, 180, NULL, 31.5, 0.00, -1.25, 175, NULL, 31.5, 'single_vision', 'Monofocal', 'CR39', true, true, NOW() - INTERVAL '140 days'),
('30000000-0000-0000-0000-000000000009'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '2024-07-05', '2025-07-05', 'REC-2024-058', 'Dr. Fernando Ramírez', 'OPTO-12353', -2.00, NULL, NULL, +1.75, 32.0, -1.75, NULL, NULL, +1.75, 32.0, 'progressive', 'Progresivo', 'Estándar', true, true, NOW() - INTERVAL '175 days'),
('30000000-0000-0000-0000-000000000010'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '2024-06-18', '2025-06-18', 'REC-2024-045', 'Dra. Ana Silva', 'OPTO-12354', +2.25, +0.75, 90, NULL, 32.5, +2.00, +0.50, 95, NULL, 32.5, 'single_vision', 'Monofocal', 'Alto Índice 1.67', true, true, NOW() - INTERVAL '190 days')
ON CONFLICT DO NOTHING;

-- ===== CREATE DEMO LENS FAMILIES (Chilean Optical Shops Reality) =====
-- Common lens families used in Chilean optical shops
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
-- Essilor families (most common in Chile)
('40000000-0000-0000-0000-000000000001'::uuid, 'Essilor Comfort', 'Essilor', 'progressive', 'high_index_1_67', 'Lente progresivo Essilor Comfort con tecnología Eyezen', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000002'::uuid, 'Essilor Varilux Comfort', 'Essilor', 'progressive', 'high_index_1_67', 'Lente progresivo Varilux Comfort de Essilor', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000003'::uuid, 'Essilor Single Vision CR39', 'Essilor', 'single_vision', 'cr39', 'Lente monofocal Essilor CR39 estándar', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000004'::uuid, 'Essilor Single Vision 1.67', 'Essilor', 'single_vision', 'high_index_1_67', 'Lente monofocal Essilor alto índice 1.67', true, NOW() - INTERVAL '6 months'),
-- Zeiss families
('40000000-0000-0000-0000-000000000005'::uuid, 'Zeiss Individual', 'Zeiss', 'progressive', 'high_index_1_67', 'Lente progresivo Zeiss Individual personalizado', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000006'::uuid, 'Zeiss Single Vision', 'Zeiss', 'single_vision', 'high_index_1_67', 'Lente monofocal Zeiss alto índice', true, NOW() - INTERVAL '6 months'),
-- Rodenstock families
('40000000-0000-0000-0000-000000000007'::uuid, 'Rodenstock Impression', 'Rodenstock', 'progressive', 'high_index_1_67', 'Lente progresivo Rodenstock Impression', true, NOW() - INTERVAL '6 months'),
-- Hoya families
('40000000-0000-0000-0000-000000000008'::uuid, 'Hoya Lifestyle', 'Hoya', 'progressive', 'high_index_1_67', 'Lente progresivo Hoya Lifestyle', true, NOW() - INTERVAL '6 months'),
('40000000-0000-0000-0000-000000000009'::uuid, 'Hoya Single Vision', 'Hoya', 'single_vision', 'cr39', 'Lente monofocal Hoya CR39', true, NOW() - INTERVAL '6 months'),
-- Bifocal families
('40000000-0000-0000-0000-000000000010'::uuid, 'Essilor Bifocal', 'Essilor', 'bifocal', 'cr39', 'Lente bifocal Essilor estándar', true, NOW() - INTERVAL '6 months')
ON CONFLICT DO NOTHING;

-- ===== CREATE DEMO LENS PRICE MATRICES (Chilean Prices) =====
-- Price matrices with realistic Chilean optical shop pricing
DO $$
DECLARE
  essilor_comfort_id UUID;
  essilor_varilux_id UUID;
  essilor_sv_cr39_id UUID;
  essilor_sv_167_id UUID;
  zeiss_individual_id UUID;
  zeiss_sv_id UUID;
  rodenstock_id UUID;
  hoya_lifestyle_id UUID;
  hoya_sv_id UUID;
  essilor_bifocal_id UUID;
BEGIN
  -- Get lens family IDs
  SELECT id INTO essilor_comfort_id FROM public.lens_families WHERE name = 'Essilor Comfort' LIMIT 1;
  SELECT id INTO essilor_varilux_id FROM public.lens_families WHERE name = 'Essilor Varilux Comfort' LIMIT 1;
  SELECT id INTO essilor_sv_cr39_id FROM public.lens_families WHERE name = 'Essilor Single Vision CR39' LIMIT 1;
  SELECT id INTO essilor_sv_167_id FROM public.lens_families WHERE name = 'Essilor Single Vision 1.67' LIMIT 1;
  SELECT id INTO zeiss_individual_id FROM public.lens_families WHERE name = 'Zeiss Individual' LIMIT 1;
  SELECT id INTO zeiss_sv_id FROM public.lens_families WHERE name = 'Zeiss Single Vision' LIMIT 1;
  SELECT id INTO rodenstock_id FROM public.lens_families WHERE name = 'Rodenstock Impression' LIMIT 1;
  SELECT id INTO hoya_lifestyle_id FROM public.lens_families WHERE name = 'Hoya Lifestyle' LIMIT 1;
  SELECT id INTO hoya_sv_id FROM public.lens_families WHERE name = 'Hoya Single Vision' LIMIT 1;
  SELECT id INTO essilor_bifocal_id FROM public.lens_families WHERE name = 'Essilor Bifocal' LIMIT 1;

  -- Essilor Comfort Progressive - Price ranges based on sphere
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (essilor_comfort_id, -6.00, -3.00, -4.00, 0.00, 159900, 80000, 'surfaced', true),
  (essilor_comfort_id, -3.00, 0.00, -4.00, 0.00, 149900, 75000, 'surfaced', true),
  (essilor_comfort_id, 0.00, 3.00, -4.00, 0.00, 149900, 75000, 'surfaced', true),
  (essilor_comfort_id, 3.00, 6.00, -4.00, 0.00, 159900, 80000, 'surfaced', true);

  -- Essilor Varilux Comfort Progressive
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (essilor_varilux_id, -6.00, -3.00, -4.00, 0.00, 199900, 100000, 'surfaced', true),
  (essilor_varilux_id, -3.00, 3.00, -4.00, 0.00, 189900, 95000, 'surfaced', true),
  (essilor_varilux_id, 3.00, 6.00, -4.00, 0.00, 199900, 100000, 'surfaced', true);

  -- Essilor Single Vision CR39
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (essilor_sv_cr39_id, -6.00, 6.00, -4.00, 0.00, 45000, 15000, 'surfaced', true);

  -- Essilor Single Vision 1.67
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (essilor_sv_167_id, -10.00, -6.00, -4.00, 0.00, 119900, 50000, 'surfaced', true),
  (essilor_sv_167_id, -6.00, 6.00, -4.00, 0.00, 109900, 45000, 'surfaced', true);

  -- Zeiss Individual Progressive
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (zeiss_individual_id, -6.00, 6.00, -4.00, 0.00, 249900, 125000, 'surfaced', true);

  -- Zeiss Single Vision
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (zeiss_sv_id, -10.00, 10.00, -4.00, 0.00, 129900, 55000, 'surfaced', true);

  -- Rodenstock Impression
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (rodenstock_id, -6.00, 6.00, -4.00, 0.00, 219900, 110000, 'surfaced', true);

  -- Hoya Lifestyle
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (hoya_lifestyle_id, -6.00, 6.00, -4.00, 0.00, 179900, 90000, 'surfaced', true);

  -- Hoya Single Vision
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (hoya_sv_id, -6.00, 6.00, -4.00, 0.00, 49000, 18000, 'surfaced', true);

  -- Essilor Bifocal
  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, base_price, cost, sourcing_type, is_active)
  VALUES
  (essilor_bifocal_id, -6.00, 6.00, -4.00, 0.00, 69000, 25000, 'surfaced', true);
END $$;

-- ===== CREATE DEMO ORDERS (5 orders) =====
INSERT INTO public.orders (
  id,
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
) VALUES
('50000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ORD-2025-001', 'delivered', 134900, 'paid', 'credit_card', 'María González', 'maria.gonzalez@email.com', 113361, 21539, 0, 'CLP', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('50000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ORD-2025-002', 'delivered', 199900, 'paid', 'debit_card', 'Juan Pérez', 'juan.perez@email.com', 168067, 31833, 0, 'CLP', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('50000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ORD-2025-003', 'delivered', 249900, 'paid', 'cash', 'Ana Martínez', 'ana.martinez@email.com', 210000, 39900, 0, 'CLP', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('50000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ORD-2025-004', 'processing', 179900, 'pending', 'installments', 'Carlos Rodríguez', 'carlos.rodriguez@email.com', 151176, 28724, 0, 'CLP', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('50000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ORD-2025-005', 'delivered', 219900, 'paid', 'credit_card', 'Laura Sánchez', 'laura.sanchez@email.com', 184790, 35110, 0, 'CLP', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ===== CREATE DEMO APPOINTMENTS (10 appointments) =====
INSERT INTO public.appointments (
  id,
  customer_id,
  branch_id,
  organization_id,
  appointment_date,
  appointment_time,
  appointment_type,
  status,
  notes,
  created_at
) VALUES
('60000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, CURRENT_DATE + INTERVAL '2 days', '10:00:00', 'eye_exam', 'scheduled', 'Primera consulta', NOW() - INTERVAL '5 days'),
('60000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, CURRENT_DATE + INTERVAL '3 days', '11:30:00', 'consultation', 'scheduled', 'Revisión de receta', NOW() - INTERVAL '4 days'),
('60000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, CURRENT_DATE + INTERVAL '5 days', '14:00:00', 'eye_exam', 'scheduled', NULL, NOW() - INTERVAL '3 days'),
('60000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, CURRENT_DATE + INTERVAL '7 days', '15:30:00', 'consultation', 'scheduled', 'Ajuste de marco', NOW() - INTERVAL '2 days'),
('60000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, CURRENT_DATE + INTERVAL '1 day', '09:00:00', 'eye_exam', 'scheduled', NULL, NOW() - INTERVAL '6 days'),
('60000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, CURRENT_DATE - INTERVAL '2 days', '10:00:00', 'eye_exam', 'completed', 'Examen completado exitosamente', NOW() - INTERVAL '10 days'),
('60000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, CURRENT_DATE - INTERVAL '5 days', '11:00:00', 'consultation', 'completed', 'Consulta completada', NOW() - INTERVAL '12 days'),
('60000000-0000-0000-0000-000000000008'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, CURRENT_DATE - INTERVAL '7 days', '14:30:00', 'eye_exam', 'completed', NULL, NOW() - INTERVAL '14 days'),
('60000000-0000-0000-0000-000000000009'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, CURRENT_DATE - INTERVAL '10 days', '16:00:00', 'consultation', 'completed', 'Revisión de lentes', NOW() - INTERVAL '17 days'),
('60000000-0000-0000-0000-000000000010'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, CURRENT_DATE - INTERVAL '15 days', '10:30:00', 'eye_exam', 'completed', NULL, NOW() - INTERVAL '22 days')
ON CONFLICT DO NOTHING;

-- ===== CREATE DEMO QUOTES (5 quotes) =====
-- Note: quotes.customer_id references profiles, not customers
-- We'll skip quotes for now as they require profile IDs which may not exist
-- Quotes can be created manually through the UI

-- ===== CREATE DEMO LAB WORK ORDERS (15 work orders) =====
-- Note: lab_work_orders.customer_id references profiles, not customers
-- Also requires frame_name, lens_type, and lens_material as NOT NULL fields
-- We'll skip lab_work_orders for now as they require profile IDs which may not exist
-- Lab work orders can be created manually through the UI

-- ===== CREATE DEMO PRODUCT BRANCH STOCK =====
-- Add stock for products in the demo branch
INSERT INTO public.product_branch_stock (
  product_id,
  branch_id,
  quantity,
  low_stock_threshold,
  updated_at
)
SELECT 
  p.id,
  '00000000-0000-0000-0000-000000000002'::uuid,
  CASE 
    WHEN p.category_id = (SELECT id FROM public.categories WHERE slug = 'marcos' LIMIT 1) THEN 15 + (random() * 10)::int
    WHEN p.category_id = (SELECT id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1) THEN 20 + (random() * 15)::int
    WHEN p.category_id = (SELECT id FROM public.categories WHERE slug = 'accesorios' LIMIT 1) THEN 50 + (random() * 30)::int
    ELSE 10
  END,
  5,
  NOW()
FROM public.products p
WHERE p.organization_id = '00000000-0000-0000-0000-000000000001'::uuid
ON CONFLICT (product_id, branch_id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = NOW();

-- ===== CREATE HISTORICAL CASH REGISTER CLOSURES (Last 30 days) =====
-- Note: This requires a demo admin user ID. We'll use a placeholder that should be replaced
-- after the admin user is created, or we can use a conditional insert
DO $$
DECLARE
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_admin_user_id UUID;
  closure_date DATE;
  i INTEGER;
BEGIN
  -- Try to get a demo admin user (will be NULL if not created yet)
  SELECT au.id INTO demo_admin_user_id 
  FROM public.admin_users au 
  WHERE au.organization_id = '00000000-0000-0000-0000-000000000001'::uuid 
  LIMIT 1;

  -- If no admin user exists, we'll skip creating closures
  -- They can be created after the admin user is set up
  IF demo_admin_user_id IS NOT NULL THEN
    -- Create closures for the last 30 days
    FOR i IN 0..29 LOOP
      closure_date := CURRENT_DATE - (i || ' days')::INTERVAL;
      
      INSERT INTO public.cash_register_closures (
        branch_id,
        closure_date,
        closed_by,
        opening_cash_amount,
        total_sales,
        total_transactions,
        cash_sales,
        debit_card_sales,
        credit_card_sales,
        installments_sales,
        other_payment_sales,
        expected_cash,
        actual_cash,
        cash_difference,
        card_machine_debit_total,
        card_machine_credit_total,
        total_subtotal,
        total_tax,
        total_discounts,
        closing_cash_amount,
        status,
        opened_at,
        closed_at,
        created_at
      ) VALUES (
        demo_branch_id,
        closure_date,
        demo_admin_user_id,
        -- Opening cash: random between 50,000 and 200,000
        50000 + (random() * 150000)::int,
        -- Total sales: random between 200,000 and 800,000
        200000 + (random() * 600000)::int,
        -- Transactions: random between 5 and 25
        5 + (random() * 20)::int,
        -- Cash sales: 30-50% of total
        (200000 + (random() * 600000)::int) * (0.3 + random() * 0.2),
        -- Debit card: 20-30% of total
        (200000 + (random() * 600000)::int) * (0.2 + random() * 0.1),
        -- Credit card: 20-40% of total
        (200000 + (random() * 600000)::int) * (0.2 + random() * 0.2),
        -- Installments: 0-10% of total
        (200000 + (random() * 600000)::int) * (random() * 0.1),
        -- Other: 0-5% of total
        (200000 + (random() * 600000)::int) * (random() * 0.05),
        -- Expected cash = opening + cash sales
        50000 + (random() * 150000)::int + (200000 + (random() * 600000)::int) * (0.3 + random() * 0.2),
        -- Actual cash (slightly different from expected)
        50000 + (random() * 150000)::int + (200000 + (random() * 600000)::int) * (0.3 + random() * 0.2) + (random() * 5000 - 2500)::int,
        -- Cash difference
        (random() * 5000 - 2500)::int,
        -- Card machine totals (should match card sales)
        (200000 + (random() * 600000)::int) * (0.2 + random() * 0.1),
        (200000 + (random() * 600000)::int) * (0.2 + random() * 0.2),
        -- Subtotal (before tax)
        (200000 + (random() * 600000)::int) / 1.19,
        -- Tax (19% IVA)
        (200000 + (random() * 600000)::int) / 1.19 * 0.19,
        -- Discounts: 0-5% of subtotal
        (200000 + (random() * 600000)::int) / 1.19 * (random() * 0.05),
        -- Closing cash = actual cash
        50000 + (random() * 150000)::int + (200000 + (random() * 600000)::int) * (0.3 + random() * 0.2) + (random() * 5000 - 2500)::int,
        'confirmed',
        (closure_date || ' 08:00:00')::TIMESTAMPTZ,
        (closure_date || ' 20:00:00')::TIMESTAMPTZ,
        (closure_date || ' 20:00:00')::TIMESTAMPTZ
      )
      ON CONFLICT (branch_id, closure_date) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- ===== CREATE HISTORICAL POS SESSIONS (Last 2-3 months) =====
DO $$
DECLARE
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_admin_user_id UUID;
  session_date DATE;
  i INTEGER;
  opening_time TIMESTAMPTZ;
  closing_time TIMESTAMPTZ;
BEGIN
  -- Try to get a demo admin user
  SELECT au.id INTO demo_admin_user_id 
  FROM public.admin_users au 
  WHERE au.organization_id = '00000000-0000-0000-0000-000000000001'::uuid 
  LIMIT 1;

  -- If admin user exists, create historical sessions
  IF demo_admin_user_id IS NOT NULL THEN
    -- Create sessions for the last 90 days (approximately 3 months)
    -- Not every day has a session, so we'll create ~60 sessions
    FOR i IN 0..89 LOOP
      -- Only create sessions on weekdays (Monday-Friday) and some Saturdays
      session_date := CURRENT_DATE - (i || ' days')::INTERVAL;
      
      -- Skip Sundays and some random days
      IF EXTRACT(DOW FROM session_date) != 0 AND random() > 0.3 THEN
        opening_time := (session_date || ' ' || (8 + (random() * 2)::int) || ':00:00')::TIMESTAMPTZ;
        closing_time := opening_time + INTERVAL '8 hours' + (random() * 2 || ' hours')::INTERVAL;
        
        INSERT INTO public.pos_sessions (
          cashier_id,
          terminal_id,
          location,
          opening_cash_amount,
          closing_cash_amount,
          opening_time,
          closing_time,
          status,
          notes,
          created_at,
          updated_at
        ) VALUES (
          demo_admin_user_id,
          'TERMINAL-001',
          'Casa Matriz',
          -- Opening cash: random between 50,000 and 150,000
          50000 + (random() * 100000)::int,
          -- Closing cash: opening + sales (random between 100,000 and 400,000)
          50000 + (random() * 100000)::int + 100000 + (random() * 300000)::int,
          opening_time,
          closing_time,
          'closed',
          CASE WHEN random() > 0.8 THEN 'Sesión normal' ELSE NULL END,
          opening_time,
          closing_time
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END $$;
