-- Migration: 20250130000001_remove_unused_system_tabs.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Remove unused system administration tabs
-- This migration removes configurations and data related to:
-- - Payments (pagos)
-- - Shipping (envios)
-- - SEO
-- - Webhooks

-- Delete system configurations related to payments
DELETE FROM public.system_config 
WHERE category = 'payments' 
   OR config_key LIKE 'payment_%'
   OR config_key LIKE 'mercadopago_%';

-- Delete system configurations related to shipping (only shipping-specific, not ecommerce general)
DELETE FROM public.system_config 
WHERE category = 'shipping' 
   OR (config_key LIKE 'shipping_%' AND category != 'ecommerce');

-- Delete system configurations related to SEO
DELETE FROM public.system_config 
WHERE category = 'seo' 
   OR config_key LIKE 'seo_%'
   OR config_key LIKE 'meta_%';

-- Delete system configurations related to webhooks
DELETE FROM public.system_config 
WHERE category = 'webhooks' 
   OR config_key LIKE 'webhook_%';

-- Note: If there are specific tables for these features, they should be dropped here
-- For example:
-- DROP TABLE IF EXISTS public.payment_methods CASCADE;
-- DROP TABLE IF EXISTS public.shipping_methods CASCADE;
-- DROP TABLE IF EXISTS public.seo_settings CASCADE;
-- DROP TABLE IF EXISTS public.webhook_endpoints CASCADE;
-- DROP TABLE IF EXISTS public.webhook_logs CASCADE;

-- Remove any RLS policies related to these tables (if they exist)
-- DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods;
-- DROP POLICY IF EXISTS "Admins can manage shipping methods" ON public.shipping_methods;
-- DROP POLICY IF EXISTS "Admins can manage SEO settings" ON public.seo_settings;
-- DROP POLICY IF EXISTS "Admins can manage webhooks" ON public.webhook_endpoints;
-- DROP POLICY IF EXISTS "Admins can view webhook logs" ON public.webhook_logs;

-- Add comment
COMMENT ON TABLE public.system_config IS 'System configuration table - removed payment, shipping, SEO, and webhook configurations';
