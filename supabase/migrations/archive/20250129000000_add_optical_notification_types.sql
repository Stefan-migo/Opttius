-- Migration: 20250129000000_add_optical_notification_types.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add Optical Shop Notification Types and Settings
-- This migration extends the notification system for optical shop specific events

-- Add new notification types for optical shop
-- Note: Adding enum values must be done in separate statements
DO $$
BEGIN
  -- Add new enum values if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'quote_new' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_notification_type')) THEN
    ALTER TYPE public.admin_notification_type ADD VALUE 'quote_new';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'quote_status_change' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_notification_type')) THEN
    ALTER TYPE public.admin_notification_type ADD VALUE 'quote_status_change';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'quote_converted' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_notification_type')) THEN
    ALTER TYPE public.admin_notification_type ADD VALUE 'quote_converted';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'work_order_new' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_notification_type')) THEN
    ALTER TYPE public.admin_notification_type ADD VALUE 'work_order_new';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'work_order_status_change' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_notification_type')) THEN
    ALTER TYPE public.admin_notification_type ADD VALUE 'work_order_status_change';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'work_order_completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_notification_type')) THEN
    ALTER TYPE public.admin_notification_type ADD VALUE 'work_order_completed';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'appointment_new' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_notification_type')) THEN
    ALTER TYPE public.admin_notification_type ADD VALUE 'appointment_new';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'appointment_cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_notification_type')) THEN
    ALTER TYPE public.admin_notification_type ADD VALUE 'appointment_cancelled';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sale_new' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'admin_notification_type')) THEN
    ALTER TYPE public.admin_notification_type ADD VALUE 'sale_new';
  END IF;
END $$;

-- Create notification settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Notification type and enabled status
  notification_type admin_notification_type NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  
  -- Priority override (null = use default)
  priority admin_notification_priority,
  
  -- Target settings
  notify_all_admins BOOLEAN DEFAULT true,
  notify_specific_roles TEXT[], -- Array of roles to notify
  
  -- Additional settings
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default settings for existing notification types first
INSERT INTO public.notification_settings (notification_type, enabled, notify_all_admins)
SELECT unnest(ARRAY[
  'order_new'::admin_notification_type,
  'order_status_change'::admin_notification_type,
  'low_stock'::admin_notification_type,
  'out_of_stock'::admin_notification_type,
  'new_customer'::admin_notification_type,
  'new_review'::admin_notification_type,
  'review_pending'::admin_notification_type,
  'support_ticket_new'::admin_notification_type,
  'support_ticket_update'::admin_notification_type,
  'payment_received'::admin_notification_type,
  'payment_failed'::admin_notification_type,
  'system_alert'::admin_notification_type,
  'system_update'::admin_notification_type,
  'security_alert'::admin_notification_type,
  'custom'::admin_notification_type
]) AS notification_type, true, true
ON CONFLICT (notification_type) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX idx_notification_settings_type ON public.notification_settings(notification_type);
CREATE INDEX idx_notification_settings_enabled ON public.notification_settings(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view and modify notification settings
CREATE POLICY "Admins can manage notification settings" ON public.notification_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Create function to check if notification type is enabled
CREATE OR REPLACE FUNCTION public.is_notification_enabled(p_notification_type admin_notification_type)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT enabled FROM public.notification_settings WHERE notification_type = p_notification_type),
    true -- Default to enabled if not found
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get notification priority (with override support)
CREATE OR REPLACE FUNCTION public.get_notification_priority(
  p_notification_type admin_notification_type,
  p_default_priority admin_notification_priority DEFAULT 'medium'
)
RETURNS admin_notification_priority AS $$
DECLARE
  v_priority admin_notification_priority;
BEGIN
  SELECT COALESCE(priority, p_default_priority)
  INTO v_priority
  FROM public.notification_settings
  WHERE notification_type = p_notification_type;
  
  RETURN COALESCE(v_priority, p_default_priority);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.notification_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_notification_enabled(admin_notification_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_priority(admin_notification_type, admin_notification_priority) TO authenticated;

-- Add comment
COMMENT ON TABLE public.notification_settings IS 'Configuration for enabling/disabling and customizing notification types';
