-- Migration: 20260703000007_communications.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

BEGIN;

-- ========================================
-- Tables (topological order)
-- ========================================

-- Table: email_send_events
CREATE TABLE IF NOT EXISTS public.email_send_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email_id text NOT NULL,
    event_type text NOT NULL,
    recipient text,
    subject text,
    template_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: notification_settings
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_type public.admin_notification_type NOT NULL,
    enabled boolean DEFAULT true,
    priority public.admin_notification_priority,
    notify_all_admins boolean DEFAULT true,
    notify_specific_roles text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    branch_id uuid
);

-- Table: system_email_templates
CREATE TABLE IF NOT EXISTS public.system_email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    is_system boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    category text DEFAULT 'organization'::text,
    is_default boolean DEFAULT false,
    template_group text,
    CONSTRAINT system_email_templates_category_check CHECK ((category = ANY (ARRAY['saas'::text, 'organization'::text]))),
    CONSTRAINT system_email_templates_type_check CHECK ((type = ANY (ARRAY['order_confirmation'::text, 'order_shipped'::text, 'order_delivered'::text, 'payment_success'::text, 'payment_failed'::text, 'appointment_confirmation'::text, 'appointment_reminder'::text, 'appointment_reminder_2h'::text, 'appointment_cancelation'::text, 'appointment_rescheduled'::text, 'appointment_follow_up_reminder'::text, 'prescription_ready'::text, 'prescription_expiring'::text, 'quote_sent'::text, 'quote_expiring'::text, 'quote_accepted'::text, 'work_order_ready'::text, 'work_order_completed'::text, 'work_order_delivered'::text, 'saas_welcome'::text, 'saas_trial_ending'::text, 'saas_subscription_success'::text, 'saas_subscription_failed'::text, 'saas_payment_reminder'::text, 'saas_payment_failed'::text, 'saas_security_alert'::text, 'saas_onboarding'::text, 'saas_onboarding_step_1'::text, 'saas_onboarding_step_2'::text, 'saas_onboarding_step_3'::text, 'saas_account_suspended'::text, 'saas_terms_update'::text, 'saas_maintenance'::text, 'saas_usage_alert'::text, 'saas_feature_announcement'::text, 'saas_support_ticket_created'::text, 'saas_support_new_response'::text, 'saas_support_ticket_assigned'::text, 'saas_support_ticket_resolved'::text, 'demo_approved'::text, 'demo_expiring'::text, 'demo_expired'::text, 'demo_post_meeting_followup'::text, 'password_reset'::text, 'account_welcome'::text, 'low_stock_alert'::text, 'marketing'::text, 'custom'::text, 'contact_form'::text, 'birthday'::text])))
);

-- Table: whatsapp_phone_numbers
CREATE TABLE IF NOT EXISTS public.whatsapp_phone_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    phone_number_id text NOT NULL,
    waba_id text NOT NULL,
    display_phone_number text,
    access_token_encrypted text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ========================================
-- Comments
-- ========================================

COMMENT ON TABLE public.notification_settings IS 'Configuration for enabling/disabling and customizing notification types';
COMMENT ON COLUMN public.notification_settings.organization_id IS 'Organization scope. NULL = global default.';
COMMENT ON COLUMN public.notification_settings.branch_id IS 'Branch scope. NULL = org-level or global.';

COMMENT ON TABLE public.system_email_templates IS 'Plantillas de email del sistema de gestión oftalmológica';
COMMENT ON COLUMN public.system_email_templates.template_group IS 'Group for UI display: funnel, support, etc. Null = no group.';

COMMENT ON TABLE public.whatsapp_phone_numbers IS 'Maps Meta phone_number_id to organization for WhatsApp B2C webhook context resolution';

-- ========================================
-- Row Level Security
-- ========================================

ALTER TABLE public.email_send_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_phone_numbers ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Triggers
-- ========================================

CREATE TRIGGER update_system_email_templates_updated_at BEFORE UPDATE ON public.system_email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Constraints (PK, UNIQUE)
-- ========================================

ALTER TABLE public.email_send_events
    ADD CONSTRAINT email_send_events_pkey PRIMARY KEY (id);

ALTER TABLE public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);

ALTER TABLE public.system_email_templates
    ADD CONSTRAINT system_email_templates_pkey PRIMARY KEY (id);

ALTER TABLE public.system_email_templates
    ADD CONSTRAINT system_email_templates_name_type_key UNIQUE (name, type);

ALTER TABLE public.whatsapp_phone_numbers
    ADD CONSTRAINT whatsapp_phone_numbers_pkey PRIMARY KEY (id);

ALTER TABLE public.whatsapp_phone_numbers
    ADD CONSTRAINT whatsapp_phone_numbers_phone_number_id_key UNIQUE (phone_number_id);

-- ========================================
-- Foreign Keys
-- ========================================

ALTER TABLE public.notification_settings
    ADD CONSTRAINT notification_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.notification_settings
    ADD CONSTRAINT notification_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.system_email_templates
    ADD CONSTRAINT system_email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.system_email_templates
    ADD CONSTRAINT system_email_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.whatsapp_phone_numbers
    ADD CONSTRAINT whatsapp_phone_numbers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ========================================
-- Policies
-- ========================================

CREATE POLICY "Root and dev can read email_send_events" ON public.email_send_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));
CREATE POLICY "Service role can manage email_send_events" ON public.email_send_events TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can insert notification settings" ON public.notification_settings FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))) AND (((organization_id IS NULL) AND (branch_id IS NULL) AND public.is_root_user(auth.uid())) OR ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT gub.branch_id
   FROM public.get_user_branches(auth.uid()) gub(branch_id, branch_name, branch_code, role, is_primary))))))));
CREATE POLICY "Admins can update notification settings" ON public.notification_settings FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))) AND (((organization_id IS NULL) AND (branch_id IS NULL) AND public.is_root_user(auth.uid())) OR ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT gub.branch_id
   FROM public.get_user_branches(auth.uid()) gub(branch_id, branch_name, branch_code, role, is_primary))))))));
CREATE POLICY "Admins can view notification settings" ON public.notification_settings FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))) AND (((organization_id IS NULL) AND (branch_id IS NULL)) OR (organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)))));

CREATE POLICY "Organizations can manage their templates" ON public.system_email_templates TO authenticated USING (((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.organization_id IS NOT NULL)))) OR public.is_super_admin(auth.uid())));
CREATE POLICY "Organizations can view their templates and defaults" ON public.system_email_templates FOR SELECT TO authenticated USING ((((category = 'organization'::text) AND (organization_id IS NULL)) OR (organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.organization_id IS NOT NULL)))) OR ((category = 'saas'::text) AND public.is_super_admin(auth.uid()))));

CREATE POLICY "Org admins can delete own whatsapp numbers" ON public.whatsapp_phone_numbers FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.organization_id = whatsapp_phone_numbers.organization_id) AND (admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
CREATE POLICY "Org admins can insert own whatsapp numbers" ON public.whatsapp_phone_numbers FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.organization_id = whatsapp_phone_numbers.organization_id) AND (admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
CREATE POLICY "Org admins can update own whatsapp numbers" ON public.whatsapp_phone_numbers FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.organization_id = whatsapp_phone_numbers.organization_id) AND (admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
CREATE POLICY "Org admins can view own whatsapp numbers" ON public.whatsapp_phone_numbers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.organization_id = whatsapp_phone_numbers.organization_id) AND (admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));
CREATE POLICY "Super admins can manage all whatsapp numbers" ON public.whatsapp_phone_numbers USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));

-- ========================================
-- Functions
-- ========================================

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_notification_priority(p_notification_type public.admin_notification_type, p_default_priority public.admin_notification_priority DEFAULT 'medium'::public.admin_notification_priority) RETURNS public.admin_notification_priority
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN public.get_notification_priority(p_notification_type, p_default_priority, NULL::UUID, NULL::UUID);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_notification_priority(p_notification_type public.admin_notification_type, p_default_priority public.admin_notification_priority DEFAULT 'medium'::public.admin_notification_priority, p_organization_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid) RETURNS public.admin_notification_priority
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_priority admin_notification_priority;
BEGIN
  SELECT COALESCE(eff.priority, p_default_priority)
  INTO v_priority
  FROM public.get_notification_setting_effective(p_notification_type, p_organization_id, p_branch_id) eff
  LIMIT 1;
  RETURN COALESCE(v_priority, p_default_priority);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_notification_setting_effective(p_notification_type public.admin_notification_type, p_organization_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid) RETURNS TABLE(enabled boolean, priority public.admin_notification_priority)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT ns.enabled, ns.priority
  FROM public.notification_settings ns
  WHERE ns.notification_type = p_notification_type
  AND (
    (p_branch_id IS NOT NULL AND ns.organization_id = p_organization_id AND ns.branch_id = p_branch_id)
    OR (p_branch_id IS NULL AND p_organization_id IS NOT NULL AND ns.organization_id = p_organization_id AND ns.branch_id IS NULL)
    OR (ns.organization_id IS NULL AND ns.branch_id IS NULL)
  )
  ORDER BY
    CASE WHEN ns.branch_id IS NOT NULL THEN 1
         WHEN ns.organization_id IS NOT NULL THEN 2
         ELSE 3 END
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_notification_enabled(p_notification_type public.admin_notification_type) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN public.is_notification_enabled(p_notification_type, NULL::UUID, NULL::UUID);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_notification_enabled(p_notification_type public.admin_notification_type, p_organization_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT COALESCE((SELECT eff.enabled FROM public.get_notification_setting_effective(p_notification_type, p_organization_id, p_branch_id) eff LIMIT 1), true)
  INTO v_enabled;
  RETURN v_enabled;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admin_low_stock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.notify_admin_new_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $func$
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
$func$;

-- ========================================
-- Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_email_send_events_created_at ON public.email_send_events USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_events_email_id ON public.email_send_events USING btree (email_id);
CREATE INDEX IF NOT EXISTS idx_email_send_events_event_type ON public.email_send_events USING btree (event_type);
CREATE INDEX IF NOT EXISTS idx_notification_settings_branch_id ON public.notification_settings USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_enabled ON public.notification_settings USING btree (enabled) WHERE (enabled = true);
CREATE INDEX IF NOT EXISTS idx_notification_settings_org_id ON public.notification_settings USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON public.notification_settings USING btree (notification_type);
CREATE INDEX IF NOT EXISTS idx_system_email_templates_active ON public.system_email_templates USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_system_email_templates_category ON public.system_email_templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_system_email_templates_org ON public.system_email_templates USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_system_email_templates_type ON public.system_email_templates USING btree (type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_numbers_org ON public.whatsapp_phone_numbers USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_numbers_phone_id ON public.whatsapp_phone_numbers USING btree (phone_number_id);

COMMIT;
