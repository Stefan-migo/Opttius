-- Migration: 20250116000003_fix_admin_rls.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Fix infinite recursion in admin_users RLS policies
-- This migration fixes the circular dependency in admin table policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admin users can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can view activity log" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Admin users can insert activity log" ON public.admin_activity_log;

-- Create simpler policies that don't cause recursion
-- Allow authenticated users to read their own admin record
CREATE POLICY "Users can view own admin record" ON public.admin_users
  FOR SELECT USING (id = auth.uid());

-- Allow service role to manage admin users (for admin functions)
CREATE POLICY "Service role can manage admin users" ON public.admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read admin activity logs (for audit)
CREATE POLICY "Users can view admin activity logs" ON public.admin_activity_log
  FOR SELECT USING (admin_user_id = auth.uid());

-- Allow service role to manage activity logs (for admin functions)
CREATE POLICY "Service role can manage activity logs" ON public.admin_activity_log
  FOR ALL USING (auth.role() = 'service_role');

-- Update the is_admin function to bypass RLS completely
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_exists BOOLEAN := FALSE;
BEGIN
  -- Use direct query with explicit schema to bypass RLS
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE id = $1 AND is_active = true)', 
    'public', 'admin_users') 
  INTO admin_exists 
  USING user_id;
  
  RETURN admin_exists;
END;
$$;

-- Update the get_admin_role function to bypass RLS completely
CREATE OR REPLACE FUNCTION public.get_admin_role(user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role TEXT;
BEGIN
  -- Use direct query with explicit schema to bypass RLS
  EXECUTE format('SELECT role FROM %I.%I WHERE id = $1 AND is_active = true', 
    'public', 'admin_users') 
  INTO admin_role 
  USING user_id;
  
  RETURN admin_role;
END;
$$;

-- Grant necessary permissions to authenticated users for the functions
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_activity(TEXT, TEXT, TEXT, JSONB) TO authenticated;

COMMENT ON POLICY "Users can view own admin record" ON public.admin_users IS 'Allow users to view their own admin record to avoid recursion';
COMMENT ON POLICY "Service role can manage admin users" ON public.admin_users IS 'Allow service role full access for admin functions';
