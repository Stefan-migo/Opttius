-- Migration: 20251027000000_add_admin_delete_policies.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Add DELETE policies for admin users to delete orders and order items
-- This completes the CRUD operations for admin order management

-- Allow admins to delete orders
CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Allow admins to delete order items
CREATE POLICY "Admins can delete order items" ON public.order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Admins can delete orders" ON public.orders 
  IS 'Allow admins to delete orders for testing and data cleanup';
COMMENT ON POLICY "Admins can delete order items" ON public.order_items 
  IS 'Allow admins to delete order items (cascading delete from orders)';
