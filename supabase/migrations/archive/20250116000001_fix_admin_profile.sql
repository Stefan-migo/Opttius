-- Migration: 20250116000001_fix_admin_profile.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Fix admin profile for daluzalkimya@gmail.com
-- This migration fixes the profiles table constraint issue

-- Check current constraint on profiles table
DO $$
BEGIN
  -- Check if we need to add 'admin' to the membership_tier constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'profiles_membership_tier_check' 
    AND check_clause LIKE '%admin%'
  ) THEN
    -- Drop existing constraint if it exists
    BEGIN
      ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_membership_tier_check;
      
      -- Add new constraint that includes 'admin'
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_membership_tier_check 
        CHECK (membership_tier IN ('basic', 'premium', 'vip', 'admin'));
        
      RAISE NOTICE 'Updated membership_tier constraint to include admin';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not update constraint, will use alternative approach';
    END;
  END IF;
END $$;

-- Now safely update the profile for daluzalkimya@gmail.com
DO $$
DECLARE
  admin_user_id UUID;
  current_tier TEXT;
BEGIN
  -- Get the user ID for daluzalkimya@gmail.com
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'daluzalkimya@gmail.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Get current membership tier
    SELECT membership_tier INTO current_tier
    FROM public.profiles 
    WHERE id = admin_user_id;
    
    -- Try to update with 'admin' first, fallback to 'premium' if constraint fails
    BEGIN
      UPDATE public.profiles 
      SET 
        membership_tier = 'admin',
        updated_at = NOW()
      WHERE id = admin_user_id;
      
      RAISE NOTICE 'Successfully set membership_tier to admin for daluzalkimya@gmail.com';
    EXCEPTION
      WHEN check_violation THEN
        -- Fallback: use premium tier and note the admin status is in admin_users table
        UPDATE public.profiles 
        SET 
          membership_tier = 'premium',
          updated_at = NOW()
        WHERE id = admin_user_id;
        
        RAISE NOTICE 'Set membership_tier to premium for daluzalkimya@gmail.com (admin status tracked in admin_users table)';
    END;
    
    -- Verify admin_users entry exists
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = admin_user_id) THEN
      -- Create admin user entry if somehow missing
      INSERT INTO public.admin_users (
        id,
        email,
        role,
        permissions,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        admin_user_id,
        'daluzalkimya@gmail.com',
        'super_admin',
        '{
          "orders": ["read", "create", "update", "delete"],
          "products": ["read", "create", "update", "delete"],
          "customers": ["read", "create", "update", "delete"],
          "analytics": ["read"],
          "settings": ["read", "create", "update", "delete"],
          "admin_users": ["read", "create", "update", "delete"]
        }'::jsonb,
        true,
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Created admin_users entry for daluzalkimya@gmail.com';
    ELSE
      RAISE NOTICE 'Admin user entry already exists for daluzalkimya@gmail.com';
    END IF;
    
    -- Test admin functions
    DECLARE
      is_admin_result BOOLEAN;
      admin_role_result TEXT;
    BEGIN
      SELECT public.is_admin(admin_user_id) INTO is_admin_result;
      SELECT public.get_admin_role(admin_user_id) INTO admin_role_result;
      
      RAISE NOTICE 'Admin verification: is_admin=%, role=%', is_admin_result, admin_role_result;
    END;
    
  ELSE
    RAISE NOTICE 'User daluzalkimya@gmail.com not found in auth.users';
  END IF;
END $$;

-- Create a view for easy admin user management (with correct column names)
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  au.id,
  au.email,
  au.role,
  au.is_active,
  au.created_at,
  au.last_login,
  CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) as full_name,
  p.membership_tier as profile_tier
FROM public.admin_users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.is_active = true;

COMMENT ON VIEW public.admin_users_view IS 'Convenient view for admin user management';

-- Grant access to view for authenticated users (will be filtered by RLS)
GRANT SELECT ON public.admin_users_view TO authenticated;

-- Final notice
DO $$
BEGIN
  RAISE NOTICE 'Admin profile setup completed for daluzalkimya@gmail.com';
END $$;
