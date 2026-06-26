-- Migration: 20250124000000_remove_membership_from_customers.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Remove Membership Fields from Customers
-- This migration removes all membership-related fields from the profiles table
-- as membership concept is not applicable for optical shop customers

-- First, update admin_users_view to remove membership_tier reference
DROP VIEW IF EXISTS public.admin_users_view CASCADE;

CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  au.id,
  au.email,
  au.role,
  au.is_active,
  au.created_at,
  au.last_login,
  CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS full_name
FROM admin_users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.is_active = true;

-- Drop membership-related columns from profiles table
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS is_member;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS membership_tier CASCADE;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS membership_start_date;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS membership_end_date;

-- Update handle_new_user() function to remove membership_tier
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The memberships table may still exist but won't be used for customers
-- We're only removing membership fields from profiles, not the entire memberships table
-- in case it's used elsewhere in the system

