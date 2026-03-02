-- Migration: Tier Restructure
-- Updates subscription_tiers with new limits and features per plan.
-- basic: 1/2/200/100; pro: 4/8/2000/500; premium: 20/50/∞/∞
-- New features: prescriptions, field_operations, agreements, whatsapp
-- custom_branding for all; api_access removed from basic/pro, false in premium

UPDATE public.subscription_tiers
SET
  max_branches = 1,
  max_users = 2,
  max_customers = 200,
  max_products = 100,
  features = '{
    "pos": true,
    "appointments": true,
    "quotes": true,
    "work_orders": true,
    "prescriptions": true,
    "custom_branding": true,
    "chat_ia": false,
    "advanced_analytics": false,
    "field_operations": false,
    "agreements": false,
    "whatsapp": false
  }'::jsonb
WHERE name = 'basic';

UPDATE public.subscription_tiers
SET
  max_branches = 4,
  max_users = 8,
  max_customers = 2000,
  max_products = 500,
  features = '{
    "pos": true,
    "appointments": true,
    "quotes": true,
    "work_orders": true,
    "prescriptions": true,
    "custom_branding": true,
    "chat_ia": true,
    "advanced_analytics": true,
    "field_operations": true,
    "agreements": true,
    "whatsapp": true
  }'::jsonb
WHERE name = 'pro';

UPDATE public.subscription_tiers
SET
  max_branches = 20,
  max_users = 50,
  max_customers = NULL,
  max_products = NULL,
  features = '{
    "pos": true,
    "appointments": true,
    "quotes": true,
    "work_orders": true,
    "prescriptions": true,
    "custom_branding": true,
    "chat_ia": true,
    "advanced_analytics": true,
    "field_operations": true,
    "agreements": true,
    "whatsapp": true,
    "api_access": false
  }'::jsonb
WHERE name = 'premium';
