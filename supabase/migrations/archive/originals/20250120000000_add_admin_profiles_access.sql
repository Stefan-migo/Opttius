-- Migration: 20250120000000_add_admin_profiles_access.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Add admin access policies for profiles table
-- This allows admins to view and manage all user profiles

-- Create policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create policy for admins to insert profiles (for manual user creation)
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create policy for admins to delete profiles (for user management)
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 'Allow admins to view all user profiles for customer management';
COMMENT ON POLICY "Admins can update all profiles" ON public.profiles IS 'Allow admins to update user profiles for customer support';
COMMENT ON POLICY "Admins can insert profiles" ON public.profiles IS 'Allow admins to create profiles for manual user creation';
COMMENT ON POLICY "Admins can delete profiles" ON public.profiles IS 'Allow admins to delete profiles for user management';
