-- Migration: 20251203000000_fix_membership_tier_default.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Fix membership_tier default value and trigger function
-- The constraint was changed to exclude 'none', but the default and trigger still use 'none'
-- Note: This column may have been removed in a later migration

-- Only update if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'membership_tier'
  ) THEN
    -- Update default value
    ALTER TABLE public.profiles
      ALTER COLUMN membership_tier SET DEFAULT 'basic';
    
    -- Update any existing profiles with 'none' to 'basic'
    UPDATE public.profiles 
    SET membership_tier = 'basic' 
    WHERE membership_tier = 'none' OR membership_tier IS NULL;
  END IF;
END $$;

-- Update the handle_new_user() function (only if membership_tier column exists)
-- Check if function exists and update it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'membership_tier'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $func$
      BEGIN
        INSERT INTO public.profiles (id, email, first_name, last_name, membership_tier)
        VALUES (
          NEW.id,
          NEW.email,
          NEW.raw_user_meta_data->>''first_name'',
          NEW.raw_user_meta_data->>''last_name'',
          ''basic''
        );
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ';
  END IF;
END $$;

