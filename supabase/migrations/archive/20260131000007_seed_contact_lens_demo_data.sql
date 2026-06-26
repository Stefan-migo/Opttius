-- Migration: 20260131000007_seed_contact_lens_demo_data.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Seed Contact Lens Demo Data
-- This migration adds contact lens families and price matrices to the demo organization
-- IMPORTANT: This must run AFTER 20260131000005_create_contact_lenses_system.sql

-- ===== CREATE DEMO CONTACT LENS FAMILIES =====
-- Add contact lens families for demo organization
INSERT INTO public.contact_lens_families (
  id,
  organization_id,
  name,
  brand,
  use_type,
  modality,
  material,
  packaging,
  base_curve,
  diameter,
  description,
  is_active,
  created_at
) VALUES
-- Acuvue Oasys 1-Day (Diarios Esféricos)
('70000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Acuvue Oasys 1-Day', 'Johnson & Johnson', 'daily', 'spherical', 'silicone_hydrogel', 'box_30', 8.50, 14.30, 'Lentes de contacto diarios de hidrogel de silicona con tecnología HydraLuxe para confort excepcional.', true, NOW() - INTERVAL '6 months'),
-- Air Optix Plus HydraGlyde for Astigmatism (Mensuales Tóricos)
('70000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Air Optix Plus HydraGlyde for Astigmatism', 'Alcon', 'monthly', 'toric', 'silicone_hydrogel', 'box_6', 8.70, 14.50, 'Lentes de contacto mensuales de hidrogel de silicona para astigmatismo, con tecnología HydraGlyde para hidratación prolongada.', true, NOW() - INTERVAL '6 months')
ON CONFLICT DO NOTHING;

-- ===== CREATE DEMO CONTACT LENS PRICE MATRICES =====
DO $$
DECLARE
  acuvue_oasys_1day_id UUID;
  air_optix_astigmatism_id UUID;
BEGIN
  -- Get contact lens family IDs
  SELECT id INTO acuvue_oasys_1day_id FROM public.contact_lens_families WHERE name = 'Acuvue Oasys 1-Day' AND organization_id = '00000000-0000-0000-0000-000000000001'::uuid LIMIT 1;
  SELECT id INTO air_optix_astigmatism_id FROM public.contact_lens_families WHERE name = 'Air Optix Plus HydraGlyde for Astigmatism' AND organization_id = '00000000-0000-0000-0000-000000000001'::uuid LIMIT 1;

  -- Only insert matrices if families exist
  IF acuvue_oasys_1day_id IS NOT NULL THEN
    -- Acuvue Oasys 1-Day Matrices (Precios por caja de 30 lentes)
    INSERT INTO public.contact_lens_price_matrices (
      contact_lens_family_id,
      organization_id,
      sphere_min,
      sphere_max,
      cylinder_min,
      cylinder_max,
      axis_min,
      axis_max,
      addition_min,
      addition_max,
      base_price,
      cost,
      is_active
    ) VALUES
    -- Rango estándar -6.00 a -0.50 (sphere_min debe ser el más negativo)
    (acuvue_oasys_1day_id, '00000000-0000-0000-0000-000000000001'::uuid, -6.00, -0.50, 0.00, 0.00, 0, 0, 0.00, 0.00, 29990, 14990, true),
    -- Rango alto -12.00 a -6.25 (sphere_min debe ser el más negativo)
    (acuvue_oasys_1day_id, '00000000-0000-0000-0000-000000000001'::uuid, -12.00, -6.25, 0.00, 0.00, 0, 0, 0.00, 0.00, 34990, 17990, true),
    -- Rango positivo estándar 0.50 a 6.00
    (acuvue_oasys_1day_id, '00000000-0000-0000-0000-000000000001'::uuid, 0.50, 6.00, 0.00, 0.00, 0, 0, 0.00, 0.00, 29990, 14990, true),
    -- Rango positivo alto 6.25 a 8.00
    (acuvue_oasys_1day_id, '00000000-0000-0000-0000-000000000001'::uuid, 6.25, 8.00, 0.00, 0.00, 0, 0, 0.00, 0.00, 34990, 17990, true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF air_optix_astigmatism_id IS NOT NULL THEN
    -- Air Optix Plus HydraGlyde for Astigmatism Matrices (Precios por caja de 6 lentes)
    INSERT INTO public.contact_lens_price_matrices (
      contact_lens_family_id,
      organization_id,
      sphere_min,
      sphere_max,
      cylinder_min,
      cylinder_max,
      axis_min,
      axis_max,
      addition_min,
      addition_max,
      base_price,
      cost,
      is_active
    ) VALUES
    -- Esfera -6.00 a -0.50, Cilindro -1.75 a -0.75 (sphere_min y cylinder_min deben ser los más negativos)
    (air_optix_astigmatism_id, '00000000-0000-0000-0000-000000000001'::uuid, -6.00, -0.50, -1.75, -0.75, 10, 180, 0.00, 0.00, 39990, 19990, true),
    -- Esfera -6.00 a -0.50, Cilindro -2.25
    (air_optix_astigmatism_id, '00000000-0000-0000-0000-000000000001'::uuid, -6.00, -0.50, -2.25, -2.25, 10, 180, 0.00, 0.00, 44990, 22990, true),
    -- Esfera -10.00 a -6.25, Cilindro -2.25 a -0.75 (sphere_min y cylinder_min deben ser los más negativos)
    (air_optix_astigmatism_id, '00000000-0000-0000-0000-000000000001'::uuid, -10.00, -6.25, -2.25, -0.75, 10, 180, 0.00, 0.00, 49990, 24990, true),
    -- Esfera positiva 0.50 a 6.00, Cilindro -2.25 a -0.75 (cylinder_min debe ser el más negativo)
    (air_optix_astigmatism_id, '00000000-0000-0000-0000-000000000001'::uuid, 0.50, 6.00, -2.25, -0.75, 10, 180, 0.00, 0.00, 44990, 22990, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
