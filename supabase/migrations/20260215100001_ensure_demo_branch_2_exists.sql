-- Migration: Ensure Demo Branch 2 (Sucursal Providencia) exists
-- The seed migration defines reset_demo_organization() which creates Branch 2,
-- but that only runs when "Reset Demo" is executed. This migration ensures
-- Branch 2 exists for existing demo deployments so the second branch appears
-- in the branch selector without requiring a full reset.
-- Demo org: 00000000-0000-0000-0000-000000000001
-- Branch 2: 00000000-0000-0000-0000-000000000003 (Sucursal Providencia)

INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
SELECT
  '00000000-0000-0000-0000-000000000003'::uuid,
  'Sucursal Providencia',
  'DEMO-002',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Av. Apoquindo 4567',
  'Las Condes',
  'Región Metropolitana',
  '7550000',
  'Chile',
  '+56 2 2345 6790',
  'providencia@optica-demo.cl',
  true,
  NOW() - INTERVAL '6 months'
WHERE EXISTS (SELECT 1 FROM public.organizations WHERE id = '00000000-0000-0000-0000-000000000001'::uuid)
AND NOT EXISTS (SELECT 1 FROM public.branches WHERE id = '00000000-0000-0000-0000-000000000003'::uuid);
