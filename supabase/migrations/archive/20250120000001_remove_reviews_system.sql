-- Migration: 20250120000001_remove_reviews_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Remove Reviews System
-- This migration removes all review-related tables, functions, triggers, and columns

-- Drop review-related triggers first (only if tables exist)
DO $$
BEGIN
  -- Drop trigger on product_reviews if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_reviews') THEN
    DROP TRIGGER IF EXISTS trigger_notify_admin_new_review ON public.product_reviews;
  END IF;
  
  -- Drop trigger on reviews if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    DROP TRIGGER IF EXISTS trigger_notify_admin_new_review ON public.reviews;
  END IF;
END $$;

-- Drop review-related functions
DROP FUNCTION IF EXISTS public.notify_admin_new_review();

-- Drop review-related tables (with CASCADE to handle foreign keys)
DROP TABLE IF EXISTS public.review_helpfulness CASCADE;
DROP TABLE IF EXISTS public.product_reviews CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;

-- Remove review_count column from products table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'review_count'
  ) THEN
    ALTER TABLE public.products DROP COLUMN review_count;
  END IF;
END $$;

-- Remove review-related notification types from admin_notifications
-- Note: We'll keep existing notifications but they won't be actionable
-- You may want to manually clean up old review notifications:
-- DELETE FROM admin_notifications WHERE type IN ('new_review', 'review_pending') OR related_entity_type = 'review';

-- Update admin_notifications comment to remove review reference
COMMENT ON TABLE public.admin_notifications IS 'Admin notification system for real-time alerts about orders, stock, and system events';

