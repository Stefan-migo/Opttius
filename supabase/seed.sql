-- Seed: Óptica Mirada Clara — demo data
-- Idempotent: INSERT ... ON CONFLICT (id) DO NOTHING
-- Transactional: wrapped in BEGIN/COMMIT
-- UUIDs: fixed predictable sequence

BEGIN;

-- ============================================================================
-- Organization
-- ============================================================================
INSERT INTO public.organizations (id, name, slug, slogan, status, subscription_tier, metadata, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Óptica Mirada Clara',
  'mirada-clara',
  'Tu visión, nuestra misión',
  'active',
  'pro',
  '{"country": "CL", "currency": "CLP", "timezone": "America/Santiago"}'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Subscription Tier
-- ============================================================================
INSERT INTO public.subscription_tiers (id, name, price_monthly, max_branches, max_users, max_customers, max_products, features)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'pro',
  49900,
  5, 10, 5000, 2000,
  '{"multi_branch": true, "reports": true, "whatsapp": true, "ai_insights": true, "pos": true, "inventory": true, "appointments": true, "lens_matrices": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Subscription
-- ============================================================================
INSERT INTO public.subscriptions (id, organization_id, status, gateway, current_period_start, current_period_end, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  'active', 'flow',
  CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Branches
-- ============================================================================
INSERT INTO public.branches (id, organization_id, name, code, address_line_1, city, state, country, phone, email, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000001',
   'Casa Matriz', 'CM-001',
   'Av. Providencia 1234, Local 5',
   'Santiago', 'Santiago', 'Chile',
   '+56 2 2123 4567', 'contacto@miradaclara.cl', true),
  ('00000000-0000-0000-0000-000000000032',
   '00000000-0000-0000-0000-000000000001',
   'Sucursal Providencia', 'PROV-001',
   'Av. Nueva Providencia 5678',
   'Santiago', 'Santiago', 'Chile',
   '+56 2 2765 4321', 'providencia@miradaclara.cl', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- NOTA: Admin users y branch access se crean POST-RESET via:
--   node scripts/create-root-user.js
--   node scripts/create-demo-super-admin.js
-- ============================================================================

-- ============================================================================
-- Product Categories
-- ============================================================================
INSERT INTO public.categories (id, name, slug, description, is_system, is_default, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000061', 'Armazones',        'armazones',        'Armazones y monturas para lentes',             false, false, 1),
  ('00000000-0000-0000-0000-000000000062', 'Lentes Oftálmicos', 'lentes-oftalmicos', 'Lentes para prescripción médica',               false, false, 2),
  ('00000000-0000-0000-0000-000000000063', 'Lentes de Contacto','lentes-contacto',   'Lentes de contacto desechables y rígidos',      false, false, 3),
  ('00000000-0000-0000-0000-000000000064', 'Accesorios',       'accesorios',        'Estuches, paños, limpiadores y más',            false, false, 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Products (frames)
-- ============================================================================
INSERT INTO public.products (id, organization_id, name, slug, description, sku, price, cost_price, currency, category_id, product_type, frame_type, frame_material, frame_shape, frame_color, frame_gender, status, brand, track_inventory, low_stock_threshold, vendor, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000071',
   '00000000-0000-0000-0000-000000000001',
   'Armazón Clásico Negro', 'armazon-clasico-negro',
   'Armazón redondo clásico color negro mate. Ideal para rostros ovalados.',
   'FRM-001', 45000, 18000, 'CLP',
   '00000000-0000-0000-0000-000000000061',
   'frame', 'full_frame', 'acetate', 'round', 'Negro', 'unisex',
   'active', 'Mirada Clara', true, 3, 'Óptica Mirada Clara', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000072',
   '00000000-0000-0000-0000-000000000001',
   'Armazón Metálico Dorado', 'armazon-metalico-dorado',
   'Armazón metálico ultraliviano color dorado. Diseño semiaventurero.',
   'FRM-002', 65000, 28000, 'CLP',
   '00000000-0000-0000-0000-000000000061',
   'frame', 'semi_rimless', 'metal', 'cat_eye', 'Dorado', 'womens',
   'active', 'Mirada Clara', true, 3, 'Óptica Mirada Clara', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000073',
   '00000000-0000-0000-0000-000000000001',
   'Armazón Deportivo Azul', 'armazon-deportivo-azul',
   'Armazón deportivo flexible color azul. Ideal para actividades al aire libre.',
   'FRM-003', 55000, 22000, 'CLP',
   '00000000-0000-0000-0000-000000000061',
   'frame', 'full_frame', 'tr90', 'wrap', 'Azul', 'unisex',
   'active', 'SportVision', true, 3, 'Óptica Mirada Clara', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000074',
   '00000000-0000-0000-0000-000000000001',
   'Armazón Carey Retro', 'armazon-carey-retro',
   'Armazón estilo retro carey. Montura gruesa de acetato.',
   'FRM-004', 72000, 30000, 'CLP',
   '00000000-0000-0000-0000-000000000061',
   'frame', 'full_frame', 'acetate', 'square', 'Carey', 'unisex',
   'active', 'VintageLook', true, 3, 'Óptica Mirada Clara', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000075',
   '00000000-0000-0000-0000-000000000001',
   'Gafas de Sol Polarizadas', 'gafas-sol-polarizadas',
   'Gafas de sol con filtro polarizado y protección UV400.',
   'GFS-001', 35000, 12000, 'CLP',
   '00000000-0000-0000-0000-000000000064',
   'accessory', NULL, NULL, NULL, NULL, NULL,
   'active', 'SunBlock', true, 5, 'Óptica Mirada Clara', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Branch Stock
-- ============================================================================
INSERT INTO public.product_branch_stock (id, product_id, branch_id, quantity, reserved_quantity, low_stock_threshold)
VALUES
  -- Casa Matriz stock
  ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000031', 10, 0, 3),
  ('00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000031', 7,  1, 3),
  ('00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000073', '00000000-0000-0000-0000-000000000031', 5,  0, 3),
  ('00000000-0000-0000-0000-000000000084', '00000000-0000-0000-0000-000000000074', '00000000-0000-0000-0000-000000000031', 3,  0, 3),
  ('00000000-0000-0000-0000-000000000085', '00000000-0000-0000-0000-000000000075', '00000000-0000-0000-0000-000000000031', 15, 2, 5),
  -- Providencia stock
  ('00000000-0000-0000-0000-000000000086', '00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000032', 5,  0, 3),
  ('00000000-0000-0000-0000-000000000087', '00000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000032', 4,  0, 3),
  ('00000000-0000-0000-0000-000000000088', '00000000-0000-0000-0000-000000000075', '00000000-0000-0000-0000-000000000032', 8,  1, 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Lens Families
-- ============================================================================
INSERT INTO public.lens_families (id, organization_id, name, lens_type, lens_material, description, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000091',
    '00000000-0000-0000-0000-000000000001',
    'Monofocal Básico', 'single_vision', 'cr39',
    'Lente monofocal orgánico de alto índice. Ideal para uso diario.',
    true),
  ('00000000-0000-0000-0000-000000000092',
    '00000000-0000-0000-0000-000000000001',
    'Monofocal Premium', 'single_vision', 'polycarbonate',
    'Lente monofocal de policarbonato con protección UV. Más resistente.',
    true),
  ('00000000-0000-0000-0000-000000000093',
    '00000000-0000-0000-0000-000000000001',
    'Progresivo Digital', 'progressive', 'high_index_1_67',
    'Lente progresivo digital de alto índice. Visión nítida a todas las distancias.',
    true),
  ('00000000-0000-0000-0000-000000000094',
    '00000000-0000-0000-0000-000000000001',
    'Bifocal Clásico', 'bifocal', 'cr39',
    'Lente bifocal tradicional con línea visible.',
    true),
  ('00000000-0000-0000-0000-000000000095',
    '00000000-0000-0000-0000-000000000001',
    'Lente Ocupacional', 'single_vision', 'cr39',
    'Lente ocupacional optimizado para visión intermedia y cercana.',
    true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Lens Price Matrices
-- ============================================================================
INSERT INTO public.lens_price_matrices (id, lens_family_id, name, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active, organization_id)
VALUES
  -- Monofocal Básico — rangos esféricos
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000091', 'Monofocal Básico S-2a+2', -2.00, 2.00, -1.00, 1.00, NULL, NULL, 15000, 8000, 'stock', true, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000091', 'Monofocal Básico S-6a-2', -6.00, -2.01, -2.00, 2.00, NULL, NULL, 25000, 14000, 'stock', true, '00000000-0000-0000-0000-000000000001'),
  -- Monofocal Premium
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000092', 'Monofocal Premium S-2a+2', -2.00, 2.00, -2.00, 2.00, NULL, NULL, 35000, 18000, 'stock', true, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000092', 'Monofocal Premium S-8a-2', -8.00, -2.01, -3.00, 3.00, NULL, NULL, 55000, 32000, 'surfaced', true, '00000000-0000-0000-0000-000000000001'),
  -- Progresivo Digital
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000093', 'Progresivo Digital S-4a+4', -4.00, 4.00, -2.00, 2.00, 0.75, 3.00, 85000, 50000, 'surfaced', true, '00000000-0000-0000-0000-000000000001'),
  -- Bifocal
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000094', 'Bifocal S-4a+4', -4.00, 4.00, -2.00, 2.00, 1.00, 3.00, 45000, 25000, 'stock', true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Customers
-- ============================================================================
INSERT INTO public.customers (id, organization_id, branch_id, first_name, last_name, rut, email, phone, city, state, country, is_active, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000111',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031',
   'María', 'González', '12.345.678-9', 'maria.gonzalez@email.com', '+56 9 1234 5678',
   'Santiago', 'Santiago', 'Chile', true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000112',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031',
   'Carlos', 'Muñoz', '23.456.789-0', 'carlos.munoz@email.com', '+56 9 2345 6789',
   'Santiago', 'Santiago', 'Chile', true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000113',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031',
   'Ana', 'López', '34.567.890-1', 'ana.lopez@email.com', '+56 9 3456 7890',
   'Providencia', 'Santiago', 'Chile', true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000114',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000032',
   'Pedro', 'Ramírez', '45.678.901-2', 'pedro.ramirez@email.com', '+56 9 4567 8901',
   'Las Condes', 'Santiago', 'Chile', true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000115',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000032',
   'Sofía', 'Martínez', '56.789.012-3', 'sofia.martinez@email.com', '+56 9 5678 9012',
   'Vitacura', 'Santiago', 'Chile', true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000116',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031',
   'José', 'Torres', '67.890.123-4', 'jose.torres@email.com', '+56 9 6789 0123',
   'Ñuñoa', 'Santiago', 'Chile', true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000117',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000032',
   'Valentina', 'Díaz', '78.901.234-5', 'valentina.diaz@email.com', '+56 9 7890 1234',
   'Providencia', 'Santiago', 'Chile', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Appointments (demo)
-- ============================================================================
INSERT INTO public.appointments (id, customer_id, branch_id, organization_id, appointment_date, appointment_time, duration_minutes, appointment_type, status, notes, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000121',
   '00000000-0000-0000-0000-000000000111',
   '00000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE + 1, '10:30:00'::time, 30, 'eye_exam', 'scheduled',
   'Control anual de rutina', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000122',
   '00000000-0000-0000-0000-000000000114',
   '00000000-0000-0000-0000-000000000032',
   '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE + 2, '15:00:00'::time, 45, 'eye_exam', 'scheduled',
   'Primera consulta — revisión completa', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000123',
   '00000000-0000-0000-0000-000000000113',
   '00000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 1, '11:00:00'::time, 30, 'delivery', 'completed',
   'Retiro de lentes progresivos', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000124',
   '00000000-0000-0000-0000-000000000116',
   '00000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 3, '09:00:00'::time, 30, 'eye_exam', 'cancelled',
   NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Organization Settings
-- ============================================================================
INSERT INTO public.organization_settings (id, organization_id, business_name, business_rut, business_address, business_phone, business_email, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000131',
  '00000000-0000-0000-0000-000000000001',
  'Óptica Mirada Clara SpA',
  '76.543.210-8',
  'Av. Providencia 1234, Santiago',
  '+56 2 2123 4567',
  'contacto@miradaclara.cl',
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- POS Settings (per branch)
-- ============================================================================
INSERT INTO public.pos_settings (id, branch_id, organization_id, business_name, business_rut, business_address, business_phone, business_email, min_deposit_percent, min_deposit_amount, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000141',
   '00000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000001',
   'Óptica Mirada Clara — Casa Matriz', '76.543.210-8',
   'Av. Providencia 1234, Santiago', '+56 2 2123 4567', 'contacto@miradaclara.cl',
   50, 10000, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000142',
   '00000000-0000-0000-0000-000000000032',
   '00000000-0000-0000-0000-000000000001',
   'Óptica Mirada Clara — Providencia', '76.543.210-8',
   'Av. Nueva Providencia 5678', '+56 2 2765 4321', 'providencia@miradaclara.cl',
   50, 10000, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- System Config
-- ============================================================================
INSERT INTO public.system_config (id, config_key, config_value, description, category, is_public, value_type, organization_id)
VALUES
  ('00000000-0000-0000-0000-000000000151',
   'app_name', '"Óptica Mirada Clara"'::jsonb,
   'Nombre de la aplicación', 'general', true, 'string',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000152',
   'default_appointment_duration', '30'::jsonb,
   'Duración por defecto de citas (minutos)', 'appointments', true, 'number',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000153',
   'low_stock_alert_threshold', '5'::jsonb,
   'Umbral global para alertas de stock bajo', 'inventory', true, 'number',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000154',
   'business_hours', '{"mon_fri": "09:00-19:00", "sat": "10:00-14:00", "sun": null}'::jsonb,
   'Horario de atención', 'general', true, 'json',
   '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

COMMIT;
