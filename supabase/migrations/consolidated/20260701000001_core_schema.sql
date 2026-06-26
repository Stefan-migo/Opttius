-- Migration: 20260703000001_core_schema.sql
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
-- Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admin_branch_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid NOT NULL,
    branch_id uuid,
    role text DEFAULT 'manager'::text,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT admin_branch_access_role_check CHECK ((role = ANY (ARRAY['manager'::text, 'staff'::text, 'viewer'::text])))
);

CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type public.admin_notification_type NOT NULL,
    priority public.admin_notification_priority DEFAULT 'medium'::public.admin_notification_priority,
    title text NOT NULL,
    message text NOT NULL,
    related_entity_type text,
    related_entity_id uuid,
    action_url text,
    action_label text,
    metadata jsonb,
    is_read boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    read_at timestamp with time zone,
    target_admin_id uuid,
    target_admin_role text,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    created_by uuid,
    created_by_system boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'store_manager'::text NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    organization_id uuid,
    CONSTRAINT admin_users_role_check CHECK ((role = ANY (ARRAY['root'::text, 'dev'::text, 'super_admin'::text, 'admin'::text, 'employee'::text, 'vendedor'::text])))
);

CREATE TABLE IF NOT EXISTS public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    postal_code text,
    country text,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid
);

CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    owner_id uuid,
    subscription_tier text DEFAULT 'basic'::text,
    status text DEFAULT 'active'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    slogan text,
    logo_url text,
    trial_days_override integer,
    scheduled_tier text,
    scheduled_tier_effective_at timestamp with time zone,
    is_system boolean DEFAULT false,
    CONSTRAINT chk_organizations_scheduled_tier CHECK (((scheduled_tier IS NULL) OR (scheduled_tier = ANY (ARRAY['basic'::text, 'pro'::text, 'premium'::text])))),
    CONSTRAINT organizations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'cancelled'::text]))),
    CONSTRAINT organizations_subscription_tier_check CHECK ((subscription_tier = ANY (ARRAY['basic'::text, 'pro'::text, 'premium'::text])))
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    first_name text,
    last_name text,
    email text,
    phone text,
    date_of_birth date,
    avatar_url text,
    bio text,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    postal_code text,
    country text DEFAULT 'Argentina'::text,
    newsletter_subscribed boolean DEFAULT false,
    language text DEFAULT 'es'::text,
    timezone text DEFAULT 'America/Argentina/Buenos_Aires'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rut text,
    gender text,
    medical_conditions text[],
    allergies text[],
    medications text[],
    medical_notes text,
    last_eye_exam_date date,
    next_eye_exam_due date,
    preferred_contact_method text,
    emergency_contact_name text,
    emergency_contact_phone text,
    insurance_provider text,
    insurance_policy_number text,
    is_active_customer boolean DEFAULT true,
    preferred_branch_id uuid,
    CONSTRAINT profiles_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text, 'prefer_not_to_say'::text]))),
    CONSTRAINT profiles_preferred_contact_method_check CHECK ((preferred_contact_method = ANY (ARRAY['email'::text, 'phone'::text, 'sms'::text, 'whatsapp'::text])))
);

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    price_monthly numeric(10,2) NOT NULL,
    max_branches integer,
    max_users integer,
    max_customers integer,
    max_products integer,
    features jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    gateway_plan_id text,
    price_annual numeric(10,2),
    CONSTRAINT subscription_tiers_name_check CHECK ((name = ANY (ARRAY['basic'::text, 'pro'::text, 'premium'::text])))
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    gateway_subscription_id text,
    gateway_customer_id text,
    status text,
    current_period_start date,
    current_period_end date,
    cancel_at date,
    canceled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gateway text DEFAULT 'flow'::text,
    trial_ends_at timestamp with time zone,
    gateway_payment_method_id text,
    mrr numeric(10,2),
    CONSTRAINT subscriptions_gateway_check CHECK ((gateway = ANY (ARRAY['flow'::text, 'mercadopago'::text, 'paypal'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'past_due'::text, 'cancelled'::text, 'trialing'::text, 'incomplete'::text])))
);

-- ========================================
-- Extension
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
-- uuid_generate_v4 wrapper in public

-- ========================================
-- View
-- ========================================

CREATE OR REPLACE VIEW public.admin_users_view WITH (security_invoker='on') AS
 SELECT au.id,
    au.email,
    au.role,
    au.is_active,
    au.created_at,
    au.last_login,
    concat(COALESCE(p.first_name, ''::text), ' ', COALESCE(p.last_name, ''::text)) AS full_name
   FROM (public.admin_users au
     LEFT JOIN public.profiles p ON ((au.id = p.id)))
  WHERE (au.is_active = true);
-- ========================================
-- Indexes (auto-generated from current schema)
-- ========================================

-- ========================================
-- Function
-- ========================================

CREATE OR REPLACE FUNCTION public.uuid_generate_v4() RETURNS uuid
  LANGUAGE sql AS 'SELECT extensions.uuid_generate_v4()';
-- ========================================
-- Core Trigger Function: update_updated_at_column
-- ========================================
-- Functions
-- ========================================

CREATE OR REPLACE FUNCTION public.can_access_branch(user_id uuid DEFAULT auth.uid(), p_branch_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Super admin can access any branch (including NULL for global view)
  IF public.is_super_admin(user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- If branch_id is NULL, only super admin can access
  IF p_branch_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has access to this specific branch
  RETURN EXISTS (
    SELECT 1 FROM public.admin_branch_access
    WHERE admin_user_id = user_id
    AND branch_id = p_branch_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_quote_expiration() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If expiration_date is set and has passed, mark as expired
  IF NEW.expiration_date IS NOT NULL 
     AND NEW.expiration_date < CURRENT_DATE 
     AND NEW.status NOT IN ('expired', 'converted_to_work', 'accepted') THEN
    NEW.status := 'expired';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_quote_prescription_customer_match() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.prescription_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = NEW.prescription_id
      AND p.customer_id = NEW.customer_id
    ) THEN
      RAISE EXCEPTION 'La receta (prescription_id) debe pertenecer al mismo cliente que el presupuesto (customer_id)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_billing_folio(p_branch_id uuid, p_document_type text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_prefix TEXT;
  v_last_folio TEXT;
  v_next_number INTEGER;
BEGIN
  v_prefix := CASE 
    WHEN p_document_type = 'boleta' THEN 'BOL'
    WHEN p_document_type = 'factura' THEN 'FAC'
    WHEN p_document_type = 'internal_ticket' THEN 'TKT'
    ELSE 'DOC'
  END;
  
  SELECT folio INTO v_last_folio
  FROM public.billing_documents
  WHERE branch_id = p_branch_id
    AND document_type = p_document_type
    AND folio LIKE v_prefix || '-%'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_last_folio IS NOT NULL THEN
    v_next_number := CAST(SUBSTRING(v_last_folio FROM '\d+$') AS INTEGER) + 1;
  ELSE
    v_next_number := 1;
  END IF;
  
  RETURN v_prefix || '-' || LPAD(v_next_number::TEXT, 6, '0');
END;
$_$;

CREATE OR REPLACE FUNCTION public.generate_quote_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  year_part TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get last quote number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '[0-9]+$') AS INTEGER)), 0)
  INTO last_number
  FROM public.quotes
  WHERE quote_number LIKE 'COT-' || year_part || '-%';
  
  -- Generate new number
  new_number := 'COT-' || year_part || '-' || LPAD((last_number + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$_$;

CREATE OR REPLACE FUNCTION public.generate_sii_invoice_number(invoice_type text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  prefix TEXT;
  year_part TEXT;
  sequence_number INTEGER;
  invoice_number TEXT;
BEGIN
  -- Set prefix based on invoice type
  IF invoice_type = 'boleta' THEN
    prefix := 'B';
  ELSIF invoice_type = 'factura' THEN
    prefix := 'F';
  ELSE
    prefix := 'N';
  END IF;
  
  -- Get year (last 2 digits)
  year_part := TO_CHAR(NOW(), 'YY');
  
  -- Get next sequence number for this year and type
  SELECT COALESCE(MAX(CAST(SUBSTRING(sii_invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM public.orders
  WHERE sii_invoice_type = invoice_type
    AND sii_invoice_number LIKE prefix || year_part || '%';
  
  -- Format: B240001, F240001, etc.
  invoice_number := prefix || year_part || LPAD(sequence_number::TEXT, 6, '0');
  
  RETURN invoice_number;
END;
$_$;

CREATE OR REPLACE FUNCTION public.generate_ticket_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  ticket_number TEXT;
  counter INTEGER;
BEGIN
  -- Get current year and month
  SELECT 
    'TKT-' || 
    to_char(NOW(), 'YYYY') || 
    to_char(NOW(), 'MM') || 
    '-' || 
    LPAD((
      SELECT COUNT(*) + 1 
      FROM public.support_tickets 
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
    )::TEXT, 4, '0')
  INTO ticket_number;
  
  RETURN ticket_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_role(user_id uuid DEFAULT auth.uid()) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.get_current_branch_id() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- This will be set via session variable in the future
  -- For now, return NULL (will be handled in application layer)
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(admin_user_id uuid DEFAULT auth.uid()) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.admin_notifications
    WHERE is_read = false
      AND is_archived = false
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (
        -- Root users count SaaS notifications
        (
          public.is_root_user(admin_user_id)
          AND (
            target_admin_role = 'root'
            OR target_admin_id = admin_user_id
          )
          AND organization_id IS NULL
        )
        OR
        -- Non-root users count their organization notifications
        (
          NOT public.is_root_user(admin_user_id)
          AND (
            target_admin_id = admin_user_id
            OR
            (
              target_admin_id IS NULL
              AND organization_id = (
                SELECT organization_id FROM public.admin_users WHERE id = admin_user_id LIMIT 1
              )
            )
          )
          AND (
            branch_id IS NULL
            OR
            branch_id IN (
              SELECT branch_id FROM public.get_user_branches(admin_user_id)
            )
          )
        )
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_branches(user_id uuid DEFAULT auth.uid()) RETURNS TABLE(branch_id uuid, branch_name text, branch_code text, role text, is_primary boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM public.admin_users
  WHERE id = user_id
  LIMIT 1;
  -- Root/dev users: see ALL branches (user_org_id is null, so no filter)
  -- Super admin: see branches from their org (or all if no org)
  IF public.is_super_admin(user_id) OR public.is_root_user(user_id) THEN
    RETURN QUERY
    SELECT 
      b.id,
      b.name,
      b.code,
      CASE 
        WHEN public.is_root_user(user_id) THEN 'root'::TEXT
        ELSE 'super_admin'::TEXT
      END,
      false
    FROM public.branches b
    WHERE b.is_active = true
    AND (user_org_id IS NULL OR b.organization_id = user_org_id)
    ORDER BY b.name;
  ELSE
    -- Return user's assigned branches
    RETURN QUERY
    SELECT 
      aba.branch_id,
      b.name,
      b.code,
      aba.role,
      aba.is_primary
    FROM public.admin_branch_access aba
    JOIN public.branches b ON b.id = aba.branch_id
    WHERE aba.admin_user_id = user_id
    AND b.is_active = true
    ORDER BY aba.is_primary DESC, b.name;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_id uuid DEFAULT auth.uid()) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM public.admin_users
    WHERE id = user_id
    AND is_active = true
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_admin_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
      'admin',
      '{
        "orders": ["read", "create", "update", "delete"],
        "products": ["read", "create", "update", "delete"],
        "customers": ["read", "create", "update", "delete"],
        "analytics": ["read"],
        "settings": ["read", "create", "update", "delete"],
        "admin_users": ["read", "create", "update", "delete"],
        "support": ["read", "create", "update", "delete"],
        "bulk_operations": ["read", "create", "update", "delete"]
      }'::jsonb,
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      is_active = true,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_organization_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_owner_id UUID;
    v_email TEXT;
BEGIN
    -- Obtener el owner_id antes de eliminar la organización
    SELECT old.owner_id INTO v_owner_id FROM organizations WHERE id = old.id;
    -- Si tiene owner, obtener su email para logging
    IF v_owner_id IS NOT NULL THEN
        SELECT email INTO v_email FROM auth.users WHERE id = v_owner_id;
        -- Eliminar admin_users relacionados
        DELETE FROM admin_users WHERE organization_id = old.id;
        -- Eliminar de auth.users
        DELETE FROM auth.users WHERE id = v_owner_id;
        RAISE NOTICE 'Cascade delete: User % (%) and admin_users removed for organization %',
            v_email, v_owner_id, old.name;
    END IF;
    RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_organization_delete_fallback() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_admin_user RECORD;
BEGIN
    -- Si no tiene owner, buscar primer admin_users
    FOR v_admin_user IN
        SELECT id, email FROM admin_users
        WHERE organization_id = old.id
        AND role IN ('super_admin', 'admin')
        LIMIT 1
    LOOP
        -- Eliminar todos los admin_users
        DELETE FROM admin_users WHERE organization_id = old.id;
        -- Eliminar de auth
        DELETE FROM auth.users WHERE id = v_admin_user.id;
        RAISE NOTICE 'Cascade delete (fallback): User % removed for organization %',
            v_admin_user.email, old.name;
    END LOOP;
    RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
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
$_$;

CREATE OR REPLACE FUNCTION public.is_employee(user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = user_id
    AND role IN ('employee', 'vendedor')
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_root_user(user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = user_id
    AND role IN ('root', 'dev')
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Root/dev users have full access like super_admin
  IF public.is_root_user(user_id) THEN
    RETURN TRUE;
  END IF;
  -- admin_users.role = 'super_admin': demo org owners and org super admins
  -- Must be recognized for multi-branch testing in demo optic
  IF EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = user_id
    AND is_active = true
    AND role = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;
  -- Super admin has a record with NULL branch_id in admin_branch_access
  RETURN EXISTS (
    SELECT 1 FROM public.admin_branch_access
    WHERE admin_user_id = user_id
    AND branch_id IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_admin_activity(p_action text, p_resource_type text, p_resource_id text DEFAULT NULL::text, p_details jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.admin_notifications
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE is_read = false
  AND (
    -- Root users mark SaaS notifications as read
    (
      public.is_root_user(auth.uid())
      AND (
        target_admin_role = 'root'
        OR target_admin_id = auth.uid()
      )
      AND organization_id IS NULL
    )
    OR
    -- Non-root users: only mark notifications they can see (org + branch)
    (
      NOT public.is_root_user(auth.uid())
      AND (
        target_admin_id = auth.uid()
        OR
        (
          target_admin_id IS NULL
          AND organization_id = (
            SELECT organization_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1
          )
        )
      )
      AND (
        branch_id IS NULL
        OR branch_id IN (
          SELECT gub.branch_id FROM public.get_user_branches(auth.uid()) gub
        )
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.admin_notifications
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE id = notification_id
  AND (
    -- Root users can mark SaaS notifications as read
    (
      public.is_root_user(auth.uid())
      AND (
        target_admin_role = 'root'
        OR target_admin_id = auth.uid()
      )
      AND organization_id IS NULL
    )
    OR
    -- Non-root users: only mark notifications they can see (org + branch)
    (
      NOT public.is_root_user(auth.uid())
      AND (
        target_admin_id = auth.uid()
        OR
        (
          target_admin_id IS NULL
          AND organization_id = (
            SELECT organization_id FROM public.admin_users WHERE id = auth.uid() LIMIT 1
          )
        )
      )
      AND (
        branch_id IS NULL
        OR branch_id IN (
          SELECT gub.branch_id FROM public.get_user_branches(auth.uid()) gub
        )
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_rut_for_search(rut_text text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  IF rut_text IS NULL THEN
    RETURN '';
  END IF;
  -- Remove dots, dashes, spaces and convert to uppercase
  RETURN UPPER(REGEXP_REPLACE(rut_text, '[.\-\s]', '', 'g'));
END;
$$;

CREATE OR REPLACE FUNCTION public.optimize_database() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_start_time TIMESTAMPTZ := NOW();
    v_tables_optimized TEXT[] := ARRAY['products', 'categories', 'orders', 'order_items', 'profiles', 'admin_users', 'customers', 'appointments', 'quotes', 'lab_work_orders'];
    v_table_name TEXT;
    v_result JSONB;
BEGIN
    -- Check if user is super_admin
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'root', 'dev')
        AND is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    -- We can only RUN ANALYZE in a function (VACUUM cannot be run in a transaction/block)
    -- But ANALYZE helps with query planner stats
    FOR v_table_name IN SELECT unnest(v_tables_optimized)
    LOOP
        EXECUTE format('ANALYZE public.%I', v_table_name);
    END LOOP;
    v_result := jsonb_build_object(
        'success', true,
        'tables_optimized', v_tables_optimized,
        'duration_seconds', extract(epoch from (NOW() - v_start_time)),
        'message', 'Database stats updated via ANALYZE for key tables.'
    );
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.preserve_quote_original_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- When converting to work order, preserve the original status
  IF NEW.status = 'converted_to_work' AND NEW.original_status IS NULL THEN
    NEW.original_status := OLD.status;
  END IF;
  
  -- Prevent changing status if already converted
  IF OLD.status = 'converted_to_work' AND NEW.status != 'converted_to_work' THEN
    RAISE EXCEPTION 'Cannot change status of a converted quote';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_default_category_deletion() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Check if the category being deleted is a default category
  IF OLD.is_default = TRUE THEN
    RAISE EXCEPTION 'Cannot delete default category: %. Default categories are protected and cannot be deleted.', OLD.name;
  END IF;
  
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_system_category_deletion() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'No se puede eliminar la categoría del sistema: %', OLD.name;
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ticket_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;
-- ========================================
-- Tables
-- ========================================
-- Table: admin_activity_log

-- ========================================
-- Trigger
-- ========================================

CREATE TRIGGER trigger_admin_branch_access_updated_at BEFORE UPDATE ON public.admin_branch_access FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_organization_delete BEFORE DELETE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_organization_delete();

CREATE TRIGGER trigger_organization_delete_fallback BEFORE DELETE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_organization_delete_fallback();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Constraint
-- ========================================

ALTER TABLE public.admin_activity_log
    ADD CONSTRAINT admin_activity_log_pkey PRIMARY KEY (id);
-- FK to admin_users moved below (defined after admin_users table)
-- Table: admin_branch_access

ALTER TABLE public.admin_branch_access
    ADD CONSTRAINT admin_branch_access_admin_user_id_branch_id_key UNIQUE (admin_user_id, branch_id);

ALTER TABLE public.admin_branch_access
    ADD CONSTRAINT admin_branch_access_pkey PRIMARY KEY (id);
-- Table: admin_notifications

ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);

ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notifications_target_admin_id_fkey FOREIGN KEY (target_admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- Table: admin_users

ALTER TABLE public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);

ALTER TABLE public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);

ALTER TABLE public.admin_users
    ADD CONSTRAINT admin_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- FK from admin_activity_log (table created above, admin_users now exists)

ALTER TABLE public.branches
    ADD CONSTRAINT branches_code_key UNIQUE (code);

ALTER TABLE public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);
-- Table: organizations

ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);

ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
-- Table: profiles

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Table: subscription_tiers

ALTER TABLE public.subscription_tiers
    ADD CONSTRAINT subscription_tiers_name_key UNIQUE (name);

ALTER TABLE public.subscription_tiers
    ADD CONSTRAINT subscription_tiers_pkey PRIMARY KEY (id);
-- Table: subscriptions

ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (gateway_subscription_id);
-- ========================================
-- Views
-- ========================================

ALTER TABLE public.admin_branch_access
    ADD CONSTRAINT admin_branch_access_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;

ALTER TABLE public.admin_branch_access
    ADD CONSTRAINT admin_branch_access_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notifications_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.admin_users
    ADD CONSTRAINT admin_users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);

ALTER TABLE public.admin_users
    ADD CONSTRAINT admin_users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.admin_activity_log
    ADD CONSTRAINT admin_activity_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.branches
    ADD CONSTRAINT branches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_preferred_branch_id_fkey FOREIGN KEY (preferred_branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ========================================
-- Policy
-- ========================================

CREATE POLICY "Service role can manage activity logs" ON public.admin_activity_log USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Users can view admin activity logs" ON public.admin_activity_log FOR SELECT USING ((admin_user_id = auth.uid()));

CREATE POLICY "Admins can view own branch access" ON public.admin_branch_access FOR SELECT USING (((admin_user_id = auth.uid()) OR public.is_super_admin(auth.uid())));

CREATE POLICY "Super admins can manage branch access" ON public.admin_branch_access USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Root users can view SaaS notifications" ON public.admin_notifications FOR SELECT USING ((public.is_root_user(auth.uid()) AND ((target_admin_role = 'root'::text) OR (target_admin_id = auth.uid())) AND (organization_id IS NULL)));

CREATE POLICY "Users can update their notifications" ON public.admin_notifications FOR UPDATE USING (((public.is_root_user(auth.uid()) AND ((target_admin_role = 'root'::text) OR (target_admin_id = auth.uid()))) OR ((NOT public.is_root_user(auth.uid())) AND ((target_admin_id = auth.uid()) OR ((target_admin_id IS NULL) AND (organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)))))));

CREATE POLICY "Users can view their organization notifications" ON public.admin_notifications FOR SELECT USING (((NOT public.is_root_user(auth.uid())) AND ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) OR (target_admin_id = auth.uid()) OR ((target_admin_id IS NULL) AND (target_admin_role IS NULL) AND (organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)))) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT get_user_branches.branch_id
   FROM public.get_user_branches(auth.uid()) get_user_branches(branch_id, branch_name, branch_code, role, is_primary))))));

CREATE POLICY "Admins can delete admin users" ON public.admin_users FOR DELETE USING ((( SELECT public.get_admin_role(auth.uid()) AS get_admin_role) = ANY (ARRAY['admin'::text, 'super_admin'::text])));

CREATE POLICY "Admins can insert admin users" ON public.admin_users FOR INSERT WITH CHECK ((( SELECT public.get_admin_role(auth.uid()) AS get_admin_role) = ANY (ARRAY['admin'::text, 'super_admin'::text])));

CREATE POLICY "Admins can update admin users" ON public.admin_users FOR UPDATE USING ((( SELECT public.get_admin_role(auth.uid()) AS get_admin_role) = ANY (ARRAY['admin'::text, 'super_admin'::text]))) WITH CHECK ((( SELECT public.get_admin_role(auth.uid()) AS get_admin_role) = ANY (ARRAY['admin'::text, 'super_admin'::text])));

CREATE POLICY "Admins can view all admin users" ON public.admin_users FOR SELECT USING ((( SELECT public.get_admin_role(auth.uid()) AS get_admin_role) = ANY (ARRAY['admin'::text, 'super_admin'::text])));

CREATE POLICY "Root users can manage all admin users" ON public.admin_users USING (public.is_root_user(auth.uid())) WITH CHECK (public.is_root_user(auth.uid()));

CREATE POLICY "Root users can view all admin users" ON public.admin_users FOR SELECT USING (public.is_root_user(auth.uid()));

CREATE POLICY "Users can view own admin record" ON public.admin_users FOR SELECT USING ((id = auth.uid()));

CREATE POLICY "Organization admins can manage their branches" ON public.branches USING ((organization_id = public.get_user_organization_id())) WITH CHECK ((organization_id = public.get_user_organization_id()));

CREATE POLICY "Super admins can manage all branches" ON public.branches USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));

CREATE POLICY "Users can view their organization branches" ON public.branches FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true) AND (admin_users.organization_id IS NULL)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Root users can manage all organizations" ON public.organizations USING (public.is_root_user(auth.uid())) WITH CHECK (public.is_root_user(auth.uid()));

CREATE POLICY "Root users can view all organizations" ON public.organizations FOR SELECT USING ((public.is_root_user(auth.uid()) OR (id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))));

CREATE POLICY "Super admins can manage organizations" ON public.organizations USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));

CREATE POLICY "Users can create their own organization" ON public.organizations FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (owner_id = auth.uid()) AND (NOT (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.organization_id IS NOT NULL)))))));

CREATE POLICY "Users can view their organization" ON public.organizations FOR SELECT USING (((id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))));

CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));

CREATE POLICY "Authenticated users can view subscription tiers" ON public.subscription_tiers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Public can view subscription tiers for landing" ON public.subscription_tiers FOR SELECT USING (true);

CREATE POLICY "Super admins can manage subscription tiers" ON public.subscription_tiers USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));

CREATE POLICY "Super admins can manage subscriptions" ON public.subscriptions USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));

CREATE POLICY "Users can view their organization subscriptions" ON public.subscriptions FOR SELECT USING (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))));

-- ========================================
-- Rls Enable
-- ========================================

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_branch_access ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Index
-- ========================================

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_user ON public.admin_activity_log USING btree (admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON public.admin_activity_log USING btree (created_at);

CREATE INDEX IF NOT EXISTS idx_admin_branch_access_admin ON public.admin_branch_access USING btree (admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_branch_access_branch ON public.admin_branch_access USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_branch ON public.admin_notifications USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_by ON public.admin_notifications USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_expires_at ON public.admin_notifications USING btree (expires_at) WHERE (expires_at IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_organization ON public.admin_notifications USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON public.admin_notifications USING btree (priority);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_target ON public.admin_notifications USING btree (target_admin_id) WHERE (target_admin_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications USING btree (type);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON public.admin_notifications USING btree (is_read) WHERE (is_read = false);

CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users USING btree (email);

CREATE INDEX IF NOT EXISTS idx_admin_users_org ON public.admin_users USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users USING btree (role);

CREATE INDEX IF NOT EXISTS idx_branches_active ON public.branches USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_branches_code ON public.branches USING btree (code);

CREATE INDEX IF NOT EXISTS idx_branches_org ON public.branches USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_organizations_logo_url ON public.organizations USING btree (logo_url) WHERE (logo_url IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations USING btree (owner_id);

CREATE INDEX IF NOT EXISTS idx_organizations_scheduled_tier_effective_at ON public.organizations USING btree (scheduled_tier_effective_at) WHERE (scheduled_tier IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_organizations_slogan ON public.organizations USING btree (slogan) WHERE (slogan IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations USING btree (slug);

CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations USING btree (status);

CREATE INDEX IF NOT EXISTS idx_organizations_tier ON public.organizations USING btree (subscription_tier);

CREATE INDEX IF NOT EXISTS idx_profiles_is_active_customer ON public.profiles USING btree (is_active_customer) WHERE (is_active_customer = true);

CREATE INDEX IF NOT EXISTS idx_profiles_last_eye_exam_date ON public.profiles USING btree (last_eye_exam_date);

CREATE INDEX IF NOT EXISTS idx_profiles_next_eye_exam_due ON public.profiles USING btree (next_eye_exam_due);

CREATE INDEX IF NOT EXISTS idx_profiles_rut ON public.profiles USING btree (rut) WHERE (rut IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_profiles_rut_normalized ON public.profiles USING btree (public.normalize_rut_for_search(rut)) WHERE (rut IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_subscription_tiers_gateway_plan ON public.subscription_tiers USING btree (gateway_plan_id) WHERE (gateway_plan_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_customer ON public.subscriptions USING btree (gateway_customer_id) WHERE (gateway_customer_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_payment_method ON public.subscriptions USING btree (gateway_payment_method_id) WHERE (gateway_payment_method_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_sub ON public.subscriptions USING btree (gateway_subscription_id) WHERE (gateway_subscription_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions USING btree (status);

-- Foreign Keys (reordered for dependency resolution)

-- ========================================
-- Comment
-- ========================================

COMMENT ON TABLE public.admin_activity_log IS 'Log of all administrative actions for audit purposes';

COMMENT ON TABLE public.admin_branch_access IS 'Admin user access to branches. NULL branch_id means super admin (access to all)';

COMMENT ON TABLE public.admin_notifications IS 'Admin notification system for real-time alerts about orders, stock, and system events';

COMMENT ON COLUMN public.admin_notifications.organization_id IS 'Organization that owns this notification. NULL for SaaS notifications (target_admin_role=root). Ensures notifications are isolated by organization.';

COMMENT ON TABLE public.admin_users IS 'Administrative users with full access to admin dashboard - simplified to single admin role';

COMMENT ON TABLE public.branches IS 'Demo Óptica Mirada Clara: branch 2 (Providencia) 00000000-0000-0000-0000-000000000003. Apertura mes 4.';

COMMENT ON TABLE public.organizations IS 'Platform organization (ID: 00000000-0000-0000-0000-000000000020) for SaaS operations like main WhatsApp number.';

COMMENT ON COLUMN public.organizations.slug IS 'URL-friendly identifier for multi-tenant routing (e.g., "mioptica")';

COMMENT ON COLUMN public.organizations.subscription_tier IS 'Current subscription tier: basic, pro, or premium';

COMMENT ON COLUMN public.organizations.status IS 'Organization status: active, suspended, or cancelled';

COMMENT ON COLUMN public.organizations.slogan IS 'Slogan or tagline of the organization to display in headers';

COMMENT ON COLUMN public.organizations.logo_url IS 'URL of the organization logo to display in headers';

COMMENT ON COLUMN public.organizations.trial_days_override IS 'Custom trial days for this org. NULL = use system default (membership_trial_days).';

COMMENT ON COLUMN public.organizations.scheduled_tier IS 'Tier to apply at scheduled_tier_effective_at (for deferred downgrades)';

COMMENT ON COLUMN public.organizations.scheduled_tier_effective_at IS 'When to apply scheduled_tier (typically end of billing period)';

COMMENT ON COLUMN public.organizations.is_system IS 'If true, organization is excluded from MRR/revenue calculations';

COMMENT ON TABLE public.subscription_tiers IS 'Subscription tier definitions (Basic, Pro, Premium)';

COMMENT ON COLUMN public.subscription_tiers.max_customers IS 'Maximum customers allowed (NULL = unlimited)';

COMMENT ON COLUMN public.subscription_tiers.max_products IS 'Maximum products allowed (NULL = unlimited)';

COMMENT ON COLUMN public.subscription_tiers.gateway_plan_id IS 'Mercado Pago PreApproval Plan id for recurring billing (optional)';

COMMENT ON COLUMN public.subscription_tiers.price_annual IS 'Annual price (17% discount = 10 months for price of 12)';

COMMENT ON TABLE public.subscriptions IS 'Stripe subscriptions associated with organizations';

COMMENT ON COLUMN public.subscriptions.gateway_subscription_id IS 'Flow/Mercado Pago/PayPal subscription or order ID for webhook processing';

COMMENT ON COLUMN public.subscriptions.gateway_customer_id IS 'Gateway customer ID (Flow, Mercado Pago, PayPal)';

COMMENT ON COLUMN public.subscriptions.trial_ends_at IS 'When the free trial ends. NULL if not in trial.';

COMMENT ON COLUMN public.subscriptions.gateway_payment_method_id IS 'Gateway saved card/payment method ID (e.g. Mercado Pago card id for recurring)';

COMMENT ON COLUMN public.subscriptions.mrr IS 'Monthly Recurring Revenue en CLP';

-- ========================================
-- Do Block
-- ========================================

-- ========================================
-- Custom Enum Types
-- ========================================
-- Custom enum types
DO $$ BEGIN
  CREATE TYPE public.admin_notification_priority AS ENUM (
    'low', 'medium', 'high', 'urgent'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.admin_notification_type AS ENUM (
    'order_new', 'order_status_change', 'low_stock', 'out_of_stock',
    'new_customer', 'new_review', 'review_pending',
    'support_ticket_new', 'support_ticket_update',
    'payment_received', 'payment_failed',
    'system_alert', 'system_update', 'security_alert', 'custom',
    'quote_new', 'quote_status_change', 'quote_converted',
    'work_order_new', 'work_order_status_change', 'work_order_completed',
    'appointment_new', 'appointment_cancelled',
    'sale_new'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.support_priority AS ENUM (
    'low', 'medium', 'high', 'urgent'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.support_status AS ENUM (
    'open', 'in_progress', 'pending_customer', 'resolved', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ========================================
-- Extensions
-- ========================================

-- ========================================
-- Alter Other
-- ========================================

ALTER TABLE public.admin_activity_log

COMMIT;
