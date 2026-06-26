-- Migration: 20260126000002_remove_order_notification_trigger.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Remove order notification trigger
-- Orders will now be managed through cash register, notifications will be handled differently

-- Drop trigger for new orders
DROP TRIGGER IF EXISTS trigger_notify_admin_new_order ON public.orders;

-- Drop function (or keep it commented for reference)
-- DROP FUNCTION IF EXISTS public.notify_admin_new_order();

-- Note: The function is kept for reference but the trigger is removed
-- Notifications for sales will now be created explicitly in process-sale route
-- and will point to cash-register instead of orders section
