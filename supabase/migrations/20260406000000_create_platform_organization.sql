-- Migration: Create Platform Organization for SaaS operations
-- Organization for platform-level operations (main WhatsApp number, etc.)
-- UUID: 00000000-0000-0000-0000-000000000020
-- Set NEXT_PUBLIC_PLATFORM_ORG_ID in .env for reference

-- ===== CREATE PLATFORM ORGANIZATION =====
INSERT INTO public.organizations (
  id,
  name,
  slug,
  subscription_tier,
  status,
  metadata,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000020'::uuid,
  'Opttius Platform',
  'opttius-platform',
  'premium',
  'active',
  '{"is_platform": true, "description": "Organización para operaciones de plataforma (WhatsApp principal, etc.)"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  subscription_tier = EXCLUDED.subscription_tier,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- ===== CREATE PLATFORM BRANCH =====
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
  is_active,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000021'::uuid,
  'Sede Platform',
  'PLATFORM-001',
  '00000000-0000-0000-0000-000000000020'::uuid,
  'N/A',
  'Santiago',
  'Región Metropolitana',
  '7500000',
  'Chile',
  true,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- ===== CREATE SUBSCRIPTION FOR PLATFORM ORG =====
-- Only insert if no subscription exists for this org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE organization_id = '00000000-0000-0000-0000-000000000020'::uuid
  ) THEN
    INSERT INTO public.subscriptions (
      organization_id,
      status,
      current_period_start,
      current_period_end,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000020'::uuid,
      'active',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '1 year',
      NOW(),
      NOW()
    );
  END IF;
END $$;

COMMENT ON TABLE public.organizations IS 'Platform organization (ID: 00000000-0000-0000-0000-000000000020) for SaaS operations like main WhatsApp number.';
