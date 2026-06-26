-- Migration: 20251023000000_add_admin_orders_access.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Add admin access policies for orders table
-- This allows admins to create and manage all orders

-- Create policy for admins to view all orders
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create policy for admins to insert orders (for manual order creation)
CREATE POLICY "Admins can insert orders" ON public.orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create policy for admins to update all orders
CREATE POLICY "Admins can update all orders" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create policy for admins to view all order items
CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create policy for admins to insert order items
CREATE POLICY "Admins can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Admins can view all orders" ON public.orders IS 'Allow admins to view all orders for order management';
COMMENT ON POLICY "Admins can insert orders" ON public.orders IS 'Allow admins to create manual orders';
COMMENT ON POLICY "Admins can update all orders" ON public.orders IS 'Allow admins to update order status and details';
COMMENT ON POLICY "Admins can view all order items" ON public.order_items IS 'Allow admins to view all order items';
COMMENT ON POLICY "Admins can insert order items" ON public.order_items IS 'Allow admins to add items to manual orders';

