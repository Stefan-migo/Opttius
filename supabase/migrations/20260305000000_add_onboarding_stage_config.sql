-- Migration: Add onboarding stage config for dual flows (Etapa 1 Marketing)
-- Controls signup visibility and stage mode for known opticas vs organic users

INSERT INTO public.system_config (config_key, config_value, description, category, is_public, value_type)
SELECT 'signup_enabled', 'false', 'Habilita el registro público. Durante etapa 1 debe estar en false. Ópticas conocidas usan /acceso-opticas.', 'onboarding', true, 'boolean'
WHERE NOT EXISTS (SELECT 1 FROM public.system_config WHERE config_key = 'signup_enabled' AND organization_id IS NULL);

INSERT INTO public.system_config (config_key, config_value, description, category, is_public, value_type)
SELECT 'onboarding_stage_mode', 'true', 'Etapa 1: flujos duales. Cuando false, flujo normal.', 'onboarding', true, 'boolean'
WHERE NOT EXISTS (SELECT 1 FROM public.system_config WHERE config_key = 'onboarding_stage_mode' AND organization_id IS NULL);
