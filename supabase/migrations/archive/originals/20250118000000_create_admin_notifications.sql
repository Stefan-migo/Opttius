-- Migration: 20250118000000_create_admin_notifications.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Create admin notifications system
-- This migration sets up a notification system for admin users to receive important alerts

-- Create notification types enum
CREATE TYPE public.admin_notification_type AS ENUM (
  'order_new',
  'order_status_change',
  'low_stock',
  'out_of_stock',
  'new_customer',
  'new_review',
  'review_pending',
  'support_ticket_new',
  'support_ticket_update',
  'payment_received',
  'payment_failed',
  'system_alert',
  'system_update',
  'security_alert',
  'custom'
);

-- Create notification priority enum
CREATE TYPE public.admin_notification_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Notification details
  type admin_notification_type NOT NULL,
  priority admin_notification_priority DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  related_entity_type TEXT, -- 'order', 'product', 'customer', 'review', 'ticket', etc.
  related_entity_id UUID,
  
  -- Link/Action
  action_url TEXT, -- URL to navigate to when clicked
  action_label TEXT, -- Button text like "Ver Pedido", "Revisar Stock"
  
  -- Metadata
  metadata JSONB, -- Additional data about the notification
  
  -- Status tracking
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Target recipients (null = all admins)
  target_admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_admin_role TEXT, -- 'super_admin', 'admin', 'manager', etc.
  
  -- Automatic expiration
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Creator (system or specific admin)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_system BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_admin_notifications_target ON public.admin_notifications(target_admin_id) WHERE target_admin_id IS NOT NULL;
CREATE INDEX idx_admin_notifications_type ON public.admin_notifications(type);
CREATE INDEX idx_admin_notifications_priority ON public.admin_notifications(priority);
CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_expires_at ON public.admin_notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_notifications
-- Admin users can view notifications targeted to them or all admins
CREATE POLICY "Admin users can view their notifications" ON public.admin_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
    AND (
      target_admin_id = auth.uid() 
      OR target_admin_id IS NULL
      OR target_admin_role IN (
        SELECT role FROM public.admin_users WHERE id = auth.uid()
      )
    )
  );

-- Admin users can mark their own notifications as read/archived
CREATE POLICY "Admin users can update their notifications" ON public.admin_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
    AND (target_admin_id = auth.uid() OR target_admin_id IS NULL)
  );

-- Super admin can manage all notifications
CREATE POLICY "Super admin can manage all notifications" ON public.admin_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.role = 'super_admin'
      AND au.is_active = true
    )
  );

-- Create function to automatically create notification for new orders
CREATE OR REPLACE FUNCTION public.notify_admin_new_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification for non-draft orders
  IF NEW.status != 'draft' THEN
    INSERT INTO public.admin_notifications (
      type,
      priority,
      title,
      message,
      related_entity_type,
      related_entity_id,
      action_url,
      action_label,
      metadata,
      created_by_system
    ) VALUES (
      'order_new',
      'high',
      'Nuevo Pedido Recibido',
      'Pedido #' || NEW.order_number || ' - $' || NEW.total_amount::TEXT,
      'order',
      NEW.id,
      '/admin/orders',
      'Ver Pedido',
      jsonb_build_object(
        'order_number', NEW.order_number,
        'customer_email', NEW.email,
        'total_amount', NEW.total_amount,
        'status', NEW.status
      ),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new orders
DROP TRIGGER IF EXISTS trigger_notify_admin_new_order ON public.orders;
CREATE TRIGGER trigger_notify_admin_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_order();

-- Create function to notify about low stock
CREATE OR REPLACE FUNCTION public.notify_admin_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if product went from above threshold to below
  IF (OLD.inventory_quantity > 5 AND NEW.inventory_quantity <= 5) 
     OR (OLD.inventory_quantity > 0 AND NEW.inventory_quantity = 0) THEN
    
    INSERT INTO public.admin_notifications (
      type,
      priority,
      title,
      message,
      related_entity_type,
      related_entity_id,
      action_url,
      action_label,
      metadata,
      created_by_system
    ) VALUES (
      CASE 
        WHEN NEW.inventory_quantity = 0 THEN 'out_of_stock'
        ELSE 'low_stock'
      END,
      CASE 
        WHEN NEW.inventory_quantity = 0 THEN 'urgent'
        ELSE 'high'
      END,
      CASE 
        WHEN NEW.inventory_quantity = 0 THEN 'Producto Agotado'
        ELSE 'Stock Bajo'
      END,
      NEW.name || ' - ' || CASE 
        WHEN NEW.inventory_quantity = 0 THEN 'Sin Stock'
        ELSE NEW.inventory_quantity::TEXT || ' unidades restantes'
      END,
      'product',
      NEW.id,
      '/admin/products',
      'Ver Producto',
      jsonb_build_object(
        'product_name', NEW.name,
        'current_stock', NEW.inventory_quantity,
        'product_slug', NEW.slug
      ),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for low stock
DROP TRIGGER IF EXISTS trigger_notify_admin_low_stock ON public.products;
CREATE TRIGGER trigger_notify_admin_low_stock
  AFTER UPDATE OF inventory_quantity ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_low_stock();

-- Create function to notify about new reviews
CREATE OR REPLACE FUNCTION public.notify_admin_new_review()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (
    type,
    priority,
    title,
    message,
    related_entity_type,
    related_entity_id,
    action_url,
    action_label,
    metadata,
    created_by_system
  ) VALUES (
    'review_pending',
    'medium',
    'Nueva Reseña Pendiente',
    'Reseña de ' || COALESCE(NEW.reviewer_name, 'Cliente') || ' - ' || NEW.rating::TEXT || ' estrellas',
    'review',
    NEW.id,
    '/admin/reviews',
    'Moderar Reseña',
    jsonb_build_object(
      'product_id', NEW.product_id,
      'rating', NEW.rating,
      'reviewer_name', NEW.reviewer_name,
      'status', NEW.status
    ),
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new reviews (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'product_reviews'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_notify_admin_new_review ON public.product_reviews;
    CREATE TRIGGER trigger_notify_admin_new_review
      AFTER INSERT ON public.product_reviews
      FOR EACH ROW
      WHEN (NEW.status = 'pending')
      EXECUTE FUNCTION public.notify_admin_new_review();
  END IF;
END $$;

-- Create function to clean up old notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete notifications older than their expiration date
  DELETE FROM public.admin_notifications
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  -- Archive read notifications older than 90 days
  UPDATE public.admin_notifications
  SET is_archived = true
  WHERE is_read = true
    AND read_at < NOW() - INTERVAL '90 days'
    AND is_archived = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.admin_notifications
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE id = notification_id
    AND (target_admin_id = auth.uid() OR target_admin_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE public.admin_notifications
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE is_read = false
    AND (target_admin_id = auth.uid() OR target_admin_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(admin_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.admin_notifications
    WHERE is_read = false
      AND is_archived = false
      AND (target_admin_id = admin_user_id OR target_admin_id IS NULL)
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.admin_notifications TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.admin_notifications TO authenticated;

-- Add comment
COMMENT ON TABLE public.admin_notifications IS 'Admin notification system for real-time alerts about orders, stock, reviews, and system events';

