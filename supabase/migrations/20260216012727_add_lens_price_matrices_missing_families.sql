-- Migration: Add lens_price_matrices for families with no matrices
-- Fixes 404 errors when calculating lens prices for many lens families
-- Also expands Bifocal Flat Top addition range to cover addition=3

-- 1) Bifocal Flat Top 28mm (007): Add row for addition 2.5-4.0 (current max is 2.5)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000007',
  -4.00, 4.00, -2.00, 2.00,
  2.50, 4.00, 54990.00, 21990.00, 'surfaced', true
);

-- 2) Bifocal Invisilens Policarbonato (008)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000008',
  -6.00, 6.00, -4.00, 4.00,
  1.00, 4.00, 69990.00, 27990.00, 'surfaced', true
);

-- 3) Lectura Extendida CR-39 (015)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000015',
  -6.00, 6.00, -4.00, 4.00,
  0.75, 4.00, 39990.00, 15990.00, 'surfaced', true
);

-- 4) Monofocal Alto Índice 1.67 AR Premium (003)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000003',
  -6.00, 6.00, -4.00, 4.00,
  0.00, 0.00, 69990.00, 27990.00, 'surfaced', true
);

-- 5) Monofocal Alto Índice 1.74 AR Ultra Delgado (004)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000004',
  -6.00, 6.00, -4.00, 4.00,
  0.00, 0.00, 99990.00, 39990.00, 'surfaced', true
);

-- 6) Monofocal Antifatiga Digital (005)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000005',
  -6.00, 6.00, -4.00, 4.00,
  0.00, 0.00, 59990.00, 23990.00, 'surfaced', true
);

-- 7) Monofocal Fotocromático CR-39 (006)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000006',
  -6.00, 6.00, -4.00, 4.00,
  0.00, 0.00, 49990.00, 19990.00, 'surfaced', true
);

-- 8) Ocupacional Office Policarbonato (014)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000014',
  -6.00, 6.00, -4.00, 4.00,
  0.75, 4.00, 89990.00, 35990.00, 'surfaced', true
);

-- 9) Progresivo Digital Blue Defense (013)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000013',
  -6.00, 6.00, -4.00, 4.00,
  0.75, 4.00, 149990.00, 59990.00, 'surfaced', true
);

-- 10) Progresivo Espejado Azul 1.67 (017)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000017',
  -6.00, 6.00, -4.00, 4.00,
  0.75, 4.00, 159990.00, 63990.00, 'surfaced', true
);

-- 11) Progresivo Individualizado Alto Índice 1.67 (011)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000011',
  -6.00, 6.00, -4.00, 4.00,
  0.75, 4.00, 179990.00, 71990.00, 'surfaced', true
);

-- 12) Progresivo para Conducción 1.74 (012)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000012',
  -6.00, 6.00, -4.00, 4.00,
  0.75, 4.00, 199990.00, 79990.00, 'surfaced', true
);

-- 13) Sports Visión CR-39 Tinte Café (018)
INSERT INTO public.lens_price_matrices (
  id, lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max,
  addition_min, addition_max, base_price, cost, sourcing_type, is_active
) VALUES (
  gen_random_uuid(),
  '40000000-0000-0000-0000-000000000018',
  -6.00, 6.00, -4.00, 4.00,
  0.00, 0.00, 49990.00, 19990.00, 'surfaced', true
);
