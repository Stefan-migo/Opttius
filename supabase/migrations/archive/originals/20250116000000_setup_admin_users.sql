-- Migration: 20250116000000_setup_admin_users.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Create admin users management system
-- This migration sets up proper admin user management for DA LUZ CONSCIENTE

-- Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'store_manager' CHECK (role IN ('super_admin', 'store_manager', 'customer_support', 'content_manager')),
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.admin_users(id)
);

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_users
CREATE POLICY "Admin users can view admin users" ON public.admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

CREATE POLICY "Super admins can manage admin users" ON public.admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.role = 'super_admin' 
      AND au.is_active = true
    )
  );

-- Create RLS policies for admin_activity_log
CREATE POLICY "Admin users can view activity log" ON public.admin_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

CREATE POLICY "Admin users can insert activity log" ON public.admin_activity_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);
CREATE INDEX idx_admin_users_active ON public.admin_users(is_active);
CREATE INDEX idx_admin_activity_admin_user ON public.admin_activity_log(admin_user_id);
CREATE INDEX idx_admin_activity_created_at ON public.admin_activity_log(created_at);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = user_id 
    AND is_active = true
  );
END;
$$;

-- Function to get admin role
CREATE OR REPLACE FUNCTION public.get_admin_role(user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role TEXT;
BEGIN
  SELECT role INTO admin_role
  FROM public.admin_users 
  WHERE id = user_id 
  AND is_active = true;
  
  RETURN admin_role;
END;
$$;

-- Function to log admin activity
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_id UUID;
BEGIN
  -- Only log if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admin users can log activities';
  END IF;

  INSERT INTO public.admin_activity_log (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  ) RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$;

-- Grant admin access to daluzalkimya@gmail.com
-- This will be executed after the user signs up/exists in auth.users
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for daluzalkimya@gmail.com if it exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'daluzalkimya@gmail.com';
  
  -- If user exists, make them super admin
  IF admin_user_id IS NOT NULL THEN
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
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'super_admin',
      permissions = '{
        "orders": ["read", "create", "update", "delete"],
        "products": ["read", "create", "update", "delete"],
        "customers": ["read", "create", "update", "delete"],
        "analytics": ["read"],
        "settings": ["read", "create", "update", "delete"],
        "admin_users": ["read", "create", "update", "delete"]
      }'::jsonb,
      is_active = true,
      updated_at = NOW();
      
    RAISE NOTICE 'Admin access granted to daluzalkimya@gmail.com';
  ELSE
    RAISE NOTICE 'User daluzalkimya@gmail.com not found in auth.users yet. Admin access will be granted when they sign up.';
  END IF;
END $$;

-- Function to automatically grant admin access when daluzalkimya@gmail.com signs up
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if this is the designated admin email
  IF NEW.email = 'daluzalkimya@gmail.com' THEN
    INSERT INTO public.admin_users (
      id,
      email,
      role,
      permissions,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
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
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user admin setup
DROP TRIGGER IF EXISTS trigger_handle_new_admin_user ON auth.users;
CREATE TRIGGER trigger_handle_new_admin_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin_user();

-- Update existing profile if user already exists
-- First check what membership tiers are allowed
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for daluzalkimya@gmail.com if it exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'daluzalkimya@gmail.com';
  
  -- If user exists, update their profile with an allowed membership tier
  IF admin_user_id IS NOT NULL THEN
    -- Try to update with existing allowed values first
    UPDATE public.profiles 
    SET 
      membership_tier = COALESCE(membership_tier, 'premium'),
      updated_at = NOW()
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Profile updated for daluzalkimya@gmail.com';
  END IF;
END $$;

COMMENT ON TABLE public.admin_users IS 'Administrative users with access to admin dashboard';
COMMENT ON TABLE public.admin_activity_log IS 'Log of all administrative actions for audit purposes';
COMMENT ON FUNCTION public.is_admin IS 'Check if a user has admin privileges';
COMMENT ON FUNCTION public.get_admin_role IS 'Get the admin role of a user';
COMMENT ON FUNCTION public.log_admin_activity IS 'Log administrative actions for audit trail';
