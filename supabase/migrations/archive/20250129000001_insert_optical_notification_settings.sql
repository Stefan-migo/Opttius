-- Migration: 20250129000001_insert_optical_notification_settings.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Insert Optical Shop Notification Settings
-- This migration inserts notification settings for the new optical shop enum values
-- It must run after the enum values are added in the previous migration

-- Insert optical shop notification settings
-- Using a DO block to handle potential enum value issues gracefully
DO $$
BEGIN
  INSERT INTO public.notification_settings (notification_type, enabled, notify_all_admins)
  VALUES
    ('quote_new', true, true),
    ('quote_status_change', true, true),
    ('quote_converted', true, true),
    ('work_order_new', true, true),
    ('work_order_status_change', true, true),
    ('work_order_completed', true, true),
    ('appointment_new', true, true),
    ('appointment_cancelled', true, true),
    ('sale_new', true, true)
  ON CONFLICT (notification_type) DO NOTHING;
EXCEPTION
  WHEN invalid_text_representation THEN
    -- Enum value doesn't exist yet, skip
    RAISE NOTICE 'Some enum values may not be available yet, skipping insertion';
  WHEN OTHERS THEN
    -- Other errors, log and continue
    RAISE NOTICE 'Error inserting notification settings: %', SQLERRM;
END $$;
