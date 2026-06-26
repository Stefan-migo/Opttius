-- Migration: 20260701000000_schema_complete.sql
-- Description: Consolidated schema from pg_dump -- all 98 tables, 108 functions, 77 triggers
-- Generated: 2026-06-25
-- Rollback: Use supabase db reset
--

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Extensions (enable if not present)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;











-- Name: admin_notification_priority; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.admin_notification_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


-- Name: admin_notification_type; Type: TYPE; Schema: public; Owner: -

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
    'custom',
    'quote_new',
    'quote_status_change',
    'quote_converted',
    'work_order_new',
    'work_order_status_change',
    'work_order_completed',
    'appointment_new',
    'appointment_cancelled',
    'sale_new'
);


-- Name: support_priority; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.support_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


-- Name: support_status; Type: TYPE; Schema: public; Owner: -

CREATE TYPE public.support_status AS ENUM (
    'open',
    'in_progress',
    'pending_customer',
    'resolved',
    'closed'
);


-- Name: archive_old_telemetry_data(date); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.archive_old_telemetry_data(archive_before_date date DEFAULT (CURRENT_DATE - '1 year'::interval)) RETURNS TABLE(archived_count bigint, archive_date date)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    archived_rows BIGINT;
BEGIN
    -- This would typically move data to an archive table
    -- For now, we'll just count what would be archived
    
    SELECT COUNT(*) INTO archived_rows
    FROM public.telemetry_events 
    WHERE created_at < archive_before_date;
    
    RETURN QUERY SELECT archived_rows, archive_before_date;
    
    RAISE NOTICE 'Would archive % events older than %', archived_rows, archive_before_date;
END;
$$;


-- Name: calculate_contact_lens_price(uuid, numeric, numeric, integer, numeric, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.calculate_contact_lens_price(p_contact_lens_family_id uuid, p_sphere numeric, p_cylinder numeric DEFAULT 0, p_axis integer DEFAULT NULL::integer, p_addition numeric DEFAULT NULL::numeric, p_organization_id uuid DEFAULT NULL::uuid) RETURNS TABLE(price numeric, cost numeric, base_curve numeric, diameter numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    clpm.base_price AS price,
    clpm.cost,
    clf.base_curve,
    clf.diameter
  FROM public.contact_lens_price_matrices clpm
  JOIN public.contact_lens_families clf ON clf.id = clpm.contact_lens_family_id
  WHERE clpm.contact_lens_family_id = p_contact_lens_family_id
    AND (p_organization_id IS NULL OR clpm.organization_id = p_organization_id)
    AND p_sphere BETWEEN clpm.sphere_min AND clpm.sphere_max
    AND p_cylinder BETWEEN clpm.cylinder_min AND clpm.cylinder_max
    AND (p_axis IS NULL OR (p_axis BETWEEN clpm.axis_min AND clpm.axis_max))
    AND (p_addition IS NULL OR (p_addition BETWEEN clpm.addition_min AND clpm.addition_max))
    AND clpm.is_active = TRUE
    AND clf.is_active = TRUE
  ORDER BY
    clpm.base_price ASC -- O alguna otra lógica si hay solapamiento (ej. más específico gana)
  LIMIT 1;
END;
$$;


-- Name: FUNCTION calculate_contact_lens_price(p_contact_lens_family_id uuid, p_sphere numeric, p_cylinder numeric, p_axis integer, p_addition numeric, p_organization_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: calculate_iva(numeric, boolean); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.calculate_iva(amount numeric, include_iva boolean DEFAULT true) RETURNS numeric
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF include_iva THEN
    -- If amount includes IVA, calculate the base amount
    RETURN ROUND(amount / 1.19, 2);
  ELSE
    -- If amount doesn't include IVA, calculate IVA amount
    RETURN ROUND(amount * 0.19, 2);
  END IF;
END;
$$;


-- Name: calculate_lead_score(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.calculate_lead_score(p_lead_id uuid) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_score INT := 0;
    v_activity_type TEXT;
    v_rule_points INT;
BEGIN
    -- Get all activities for this lead
    FOR v_activity_type IN 
        SELECT activity_type FROM lead_activities WHERE lead_id = p_lead_id
    LOOP
        -- Get the rule points (use 0 if no rule exists)
        SELECT COALESCE(points, 0) INTO v_rule_points 
        FROM lead_scoring_rules 
        WHERE activity_type = v_activity_type AND is_active = true;
        
        v_score := v_score + v_rule_points;
    END LOOP;
    
    -- Ensure score doesn't go below 0
    v_score := GREATEST(v_score, 0);
    
    RETURN v_score;
END;
$$;


-- Name: calculate_lens_price(uuid, numeric, numeric, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.calculate_lens_price(p_lens_family_id uuid, p_sphere numeric, p_cylinder numeric DEFAULT 0, p_sourcing_type text DEFAULT NULL::text) RETURNS TABLE(price numeric, sourcing_type text, cost numeric)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    lpm.base_price,
    lpm.sourcing_type,
    lpm.cost
  FROM public.lens_price_matrices lpm
  JOIN public.lens_families lf ON lf.id = lpm.lens_family_id
  WHERE lpm.lens_family_id = p_lens_family_id
    AND p_sphere BETWEEN lpm.sphere_min AND lpm.sphere_max
    AND p_cylinder BETWEEN lpm.cylinder_min AND lpm.cylinder_max
    AND lpm.is_active = TRUE
    AND lf.is_active = TRUE
    AND (p_sourcing_type IS NULL OR lpm.sourcing_type = p_sourcing_type)
  ORDER BY
    CASE WHEN p_sourcing_type IS NULL AND lpm.sourcing_type = 'stock' THEN 0 ELSE 1 END,
    lpm.base_price ASC
  LIMIT 1;
END;
$$;


-- Name: calculate_lens_price(uuid, numeric, numeric, numeric, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.calculate_lens_price(p_lens_family_id uuid, p_sphere numeric, p_cylinder numeric DEFAULT 0, p_addition numeric DEFAULT NULL::numeric, p_sourcing_type text DEFAULT NULL::text) RETURNS TABLE(price numeric, sourcing_type text, cost numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    lpm.base_price AS price,
    lpm.sourcing_type,
    lpm.cost
  FROM public.lens_price_matrices lpm
  JOIN public.lens_families lf ON lf.id = lpm.lens_family_id
  WHERE lpm.lens_family_id = p_lens_family_id
    AND p_sphere BETWEEN lpm.sphere_min AND lpm.sphere_max
    AND p_cylinder BETWEEN lpm.cylinder_min AND lpm.cylinder_max
    AND (
      p_addition IS NULL 
      OR (p_addition BETWEEN lpm.addition_min AND lpm.addition_max)
    )
    AND lpm.is_active = TRUE
    AND lf.is_active = TRUE
    AND (p_sourcing_type IS NULL OR lpm.sourcing_type = p_sourcing_type)
  ORDER BY
    CASE WHEN p_sourcing_type IS NULL AND lpm.sourcing_type = 'stock' THEN 0 ELSE 1 END,
    lpm.base_price ASC
  LIMIT 1;
END;
$$;


-- Name: FUNCTION calculate_lens_price(p_lens_family_id uuid, p_sphere numeric, p_cylinder numeric, p_addition numeric, p_sourcing_type text); Type: COMMENT; Schema: public; Owner: -



-- Name: calculate_order_balance(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.calculate_order_balance(p_order_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total DECIMAL(10,2);
  v_paid DECIMAL(10,2);
BEGIN
  -- Get order total
  SELECT total_amount INTO v_total 
  FROM public.orders 
  WHERE id = p_order_id;
  
  -- If order not found, return 0
  IF v_total IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_paid 
  FROM public.order_payments 
  WHERE order_id = p_order_id;
  
  -- Return balance (total - paid, minimum 0)
  RETURN GREATEST(0, v_total - v_paid);
END;
$$;


-- Name: FUNCTION calculate_order_balance(p_order_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: calculate_treatments_total(text[], text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.calculate_treatments_total(p_treatment_keys text[], p_lens_material text DEFAULT 'cr39'::text) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total DECIMAL(10,2) := 0;
  v_treatment_key TEXT;
BEGIN
  IF p_treatment_keys IS NULL OR array_length(p_treatment_keys, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH v_treatment_key IN ARRAY p_treatment_keys
  LOOP
    v_total := v_total + public.get_treatment_price(v_treatment_key, p_lens_material);
  END LOOP;

  RETURN v_total;
END;
$$;


-- Name: can_access_branch(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.can_access_branch(user_id uuid DEFAULT auth.uid(), p_branch_id uuid DEFAULT NULL::uuid) RETURNS boolean
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


-- Name: FUNCTION can_access_branch(user_id uuid, p_branch_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: check_and_expire_quotes(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.check_and_expire_quotes() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Call expire_quotes function
  PERFORM expire_quotes();
END;
$$;


-- Name: FUNCTION check_and_expire_quotes(); Type: COMMENT; Schema: public; Owner: -



-- Name: check_appointment_availability(date, time without time zone, integer, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.check_appointment_availability(p_date date, p_time time without time zone, p_duration_minutes integer DEFAULT 30, p_appointment_id uuid DEFAULT NULL::uuid, p_staff_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_settings RECORD;
  v_day_name TEXT;
  v_day_config JSONB;
  v_start_time TIME;
  v_end_time TIME;
  v_lunch_start TIME;
  v_lunch_end TIME;
  v_end_appointment_time TIME;
  v_conflicts INTEGER;
  v_appointment_timestamp TIMESTAMPTZ;
  v_min_advance_timestamp TIMESTAMPTZ;
BEGIN
  -- Log function call
  PERFORM log_debug('check_appointment_availability called with: date=' || p_date || ', time=' || p_time || ', duration=' || p_duration_minutes || ', branch_id=' || COALESCE(p_branch_id::TEXT, 'NULL'));

  -- Get schedule settings with fallback logic:
  -- 1. If branch_id provided, try to get branch-specific settings
  -- 2. If not found, fallback to global settings (branch_id IS NULL)
  -- 3. If still not found, use any available settings as last resort
  IF p_branch_id IS NOT NULL THEN
    -- First try to get branch-specific settings
    SELECT * INTO v_settings 
    FROM public.schedule_settings 
    WHERE branch_id = p_branch_id 
    LIMIT 1;
    
    -- If branch-specific settings not found, try global settings
    IF v_settings IS NULL THEN
      SELECT * INTO v_settings 
      FROM public.schedule_settings 
      WHERE branch_id IS NULL 
      LIMIT 1;
      PERFORM log_debug('Branch settings not found, using global settings');
    END IF;
    
    -- If still not found, use any available settings as last resort
    IF v_settings IS NULL THEN
      SELECT * INTO v_settings 
      FROM public.schedule_settings 
      LIMIT 1;
      PERFORM log_debug('Global settings not found, using any available settings');
    END IF;
  ELSE
    -- No branch specified, try global settings first
    SELECT * INTO v_settings 
    FROM public.schedule_settings 
    WHERE branch_id IS NULL 
    LIMIT 1;
    
    -- If no global settings, use any available settings
    IF v_settings IS NULL THEN
      SELECT * INTO v_settings 
      FROM public.schedule_settings 
      LIMIT 1;
    END IF;
  END IF;
  
  -- If no settings found at all, return FALSE
  IF v_settings IS NULL THEN
    PERFORM log_debug('No schedule settings found at all, returning FALSE');
    RETURN FALSE;
  END IF;

  PERFORM log_debug('Found settings, working_hours=' || COALESCE(v_settings.working_hours::TEXT, 'NULL'));

  -- Use TRIM to ensure day name matches working_hours JSONB keys
  v_day_name := LOWER(TRIM(TO_CHAR(p_date, 'Day')));
  PERFORM log_debug('Day name: ' || v_day_name);
  
  v_day_config := v_settings.working_hours->v_day_name;
  PERFORM log_debug('Day config: ' || COALESCE(v_day_config::TEXT, 'NULL'));
  
  -- Check if day is enabled
  IF v_day_config IS NULL OR NOT (v_day_config->>'enabled')::BOOLEAN THEN
    PERFORM log_debug('Day not enabled or config is NULL, returning FALSE');
    RETURN FALSE;
  END IF;

  -- Check if date is blocked
  IF v_settings.blocked_dates IS NOT NULL AND p_date = ANY(v_settings.blocked_dates) THEN
    PERFORM log_debug('Date is blocked, returning FALSE');
    RETURN FALSE;
  END IF;

  -- Get working hours
  v_start_time := (v_day_config->>'start_time')::TIME;
  v_end_time := (v_day_config->>'end_time')::TIME;
  v_lunch_start := CASE WHEN v_day_config->>'lunch_start' IS NOT NULL 
    THEN (v_day_config->>'lunch_start')::TIME ELSE NULL END;
  v_lunch_end := CASE WHEN v_day_config->>'lunch_end' IS NOT NULL 
    THEN (v_day_config->>'lunch_end')::TIME ELSE NULL END;

  PERFORM log_debug('Working hours: ' || v_start_time || ' - ' || v_end_time);
  PERFORM log_debug('Lunch: ' || COALESCE(v_lunch_start::TEXT, 'NULL') || ' - ' || COALESCE(v_lunch_end::TEXT, 'NULL'));

  -- Check if time is within working hours
  v_end_appointment_time := p_time + (p_duration_minutes || ' minutes')::INTERVAL;
  
  PERFORM log_debug('Checking time: ' || p_time || ', end=' || v_end_appointment_time);
  
  IF p_time < v_start_time THEN
    PERFORM log_debug('Time before start, returning FALSE');
    RETURN FALSE;
  END IF;
  
  IF v_end_appointment_time > v_end_time THEN
    PERFORM log_debug('End time after working hours end, returning FALSE');
    RETURN FALSE;
  END IF;

  -- Check if overlaps with lunch break
  IF v_lunch_start IS NOT NULL AND v_lunch_end IS NOT NULL THEN
    IF (p_time < v_lunch_end AND v_end_appointment_time > v_lunch_start) THEN
      PERFORM log_debug('Overlaps with lunch, returning FALSE');
      RETURN FALSE;
    END IF;
  END IF;

  -- Check for conflicts with existing appointments (filter by branch_id)
  SELECT COUNT(*) INTO v_conflicts
  FROM public.appointments a
  WHERE a.appointment_date = p_date
    AND a.status IN ('scheduled', 'confirmed')
    AND (p_appointment_id IS NULL OR a.id != p_appointment_id)
    AND (
      -- Appointment starts during this slot
      (a.appointment_time < v_end_appointment_time
       AND (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL) > p_time)
    )
    AND (p_staff_id IS NULL OR a.assigned_to = p_staff_id)
    AND (p_branch_id IS NULL OR a.branch_id = p_branch_id); -- Filter by branch

  PERFORM log_debug('Conflicts found: ' || v_conflicts);

  IF v_conflicts > 0 THEN
    RETURN FALSE;
  END IF;

  -- Check minimum advance booking (only if it's today)
  IF v_settings.min_advance_booking_hours > 0 AND p_date = CURRENT_DATE THEN
    v_appointment_timestamp := (p_date || ' ' || p_time)::TIMESTAMPTZ;
    v_min_advance_timestamp := NOW() + (v_settings.min_advance_booking_hours || ' hours')::INTERVAL;
    
    PERFORM log_debug('Checking minimum advance: appointment=' || v_appointment_timestamp || ', min_required=' || v_min_advance_timestamp);
    
    IF v_appointment_timestamp < v_min_advance_timestamp THEN
      PERFORM log_debug('Before minimum advance time, returning FALSE');
      RETURN FALSE;
    END IF;
  END IF;

  -- Check if date is in the past
  IF p_date < CURRENT_DATE THEN
    PERFORM log_debug('Date is in the past, returning FALSE');
    RETURN FALSE;
  END IF;

  PERFORM log_debug('Slot is available, returning TRUE');
  RETURN TRUE;
END;
$$;


-- Name: FUNCTION check_appointment_availability(p_date date, p_time time without time zone, p_duration_minutes integer, p_appointment_id uuid, p_staff_id uuid, p_branch_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: check_contact_lens_availability(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.check_contact_lens_availability(p_product_id uuid, p_branch_id uuid, p_quantity integer) RETURNS TABLE(is_available boolean, current_stock integer, requested_quantity integer)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN COALESCE(pbs.available_quantity, 0) >= p_quantity THEN TRUE
      ELSE FALSE
    END AS is_available,
    COALESCE(pbs.available_quantity, 0) AS current_stock,
    p_quantity AS requested_quantity
  FROM product_branch_stock pbs
  WHERE pbs.product_id = p_product_id
    AND pbs.branch_id = p_branch_id;
END;
$$;


-- Name: check_contact_lens_stock(uuid, uuid, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.check_contact_lens_stock(p_contact_lens_family_id uuid, p_branch_id uuid, p_sphere numeric, p_cylinder numeric DEFAULT 0) RETURNS TABLE(available boolean, quantity integer, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH stock_match AS (
    SELECT 
      cli.quantity,
      cli.min_stock_threshold
    FROM contact_lens_inventory cli
    WHERE cli.contact_lens_family_id = p_contact_lens_family_id
      AND cli.branch_id = p_branch_id
      AND cli.is_active = TRUE
      AND p_sphere >= cli.sphere_min
      AND p_sphere <= cli.sphere_max
      AND p_cylinder >= cli.cylinder_min
      AND p_cylinder <= cli.cylinder_max
    ORDER BY 
      (p_sphere - cli.sphere_min) + (p_cylinder - cli.cylinder_min) ASC
    LIMIT 1
  )
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM stock_match WHERE quantity > 0) THEN TRUE
      ELSE FALSE
    END,
    COALESCE((SELECT quantity FROM stock_match LIMIT 1), 0),
    CASE 
      WHEN EXISTS (SELECT 1 FROM stock_match WHERE quantity > 0) THEN 
        'Stock disponible'
      WHEN EXISTS (SELECT 1 FROM stock_match WHERE quantity <= 0 AND quantity >= 0) THEN
        'Sin stock - Se puede solicitar encargo'
      ELSE
        'Graduación no disponible en stock'
    END;
END;
$$;


-- Name: check_quote_expiration(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.check_quote_expiration() RETURNS trigger
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


-- Name: FUNCTION check_quote_expiration(); Type: COMMENT; Schema: public; Owner: -



-- Name: check_quote_prescription_customer_match(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.check_quote_prescription_customer_match() RETURNS trigger
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


-- Name: cleanup_expired_demo_organizations(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.cleanup_expired_demo_organizations() RETURNS TABLE(deleted_org_id uuid, deleted_org_slug text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_org RECORD;
  v_branch_ids UUID[];
  v_org_id UUID;
  v_slug TEXT;
  global_demo_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  PERFORM set_config('statement_timeout', '300000', true);

  FOR v_org IN
    SELECT id, slug
    FROM public.organizations
    WHERE (metadata->>'is_demo')::boolean = true
      AND id != global_demo_id
      AND metadata->>'expires_at' IS NOT NULL
      AND (metadata->>'expires_at')::timestamptz < NOW()
  LOOP
    v_org_id := v_org.id;
    v_slug := v_org.slug;

    SELECT ARRAY_AGG(id) INTO v_branch_ids
    FROM public.branches
    WHERE organization_id = v_org_id;

    -- Delete in order respecting FKs (children first)
    DELETE FROM public.optical_internal_support_messages
    WHERE ticket_id IN (SELECT id FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id);
    DELETE FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id;

    DELETE FROM public.credit_note_movements
    WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));

    DELETE FROM public.order_payments
    WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.pos_transactions
    WHERE pos_session_id IN (SELECT id FROM public.pos_sessions WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.order_items
    WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.quotes WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.lab_work_orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.prescriptions
    WHERE customer_id IN (SELECT id FROM public.customers WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.appointments WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    -- internal_orders has ON DELETE RESTRICT on branch_id; must delete before branches
    DELETE FROM public.internal_order_status_history
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = v_org_id);
    DELETE FROM public.internal_order_items
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = v_org_id);
    DELETE FROM public.internal_orders WHERE organization_id = v_org_id;
    DELETE FROM public.product_branch_stock WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.products WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.lens_price_matrices
    WHERE lens_family_id IN (SELECT id FROM public.lens_families WHERE organization_id = v_org_id);
    DELETE FROM public.lens_families WHERE organization_id = v_org_id;
    DELETE FROM public.contact_lens_price_matrices WHERE organization_id = v_org_id;
    DELETE FROM public.contact_lens_families WHERE organization_id = v_org_id;
    DELETE FROM public.schedule_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.quote_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.pos_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.cash_register_closures WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.pos_sessions WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.organization_settings WHERE organization_id = v_org_id;
    DELETE FROM public.admin_notifications WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.ai_insights WHERE organization_id = v_org_id;
    DELETE FROM public.customers WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.admin_branch_access WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.subscriptions WHERE organization_id = v_org_id;
    UPDATE public.admin_users SET organization_id = NULL WHERE organization_id = v_org_id;
    DELETE FROM public.branches WHERE organization_id = v_org_id;
    DELETE FROM public.organizations WHERE id = v_org_id;

    deleted_org_id := v_org_id;
    deleted_org_slug := v_slug;
    RETURN NEXT;
  END LOOP;
END;
$$;


-- Name: FUNCTION cleanup_expired_demo_organizations(); Type: COMMENT; Schema: public; Owner: -



-- Name: cleanup_old_notifications(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.cleanup_old_notifications() RETURNS void
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


-- Name: cleanup_old_telemetry_data(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.cleanup_old_telemetry_data() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    org_record RECORD;
    retention_days INTEGER;
BEGIN
    -- Get retention settings for each organization
    FOR org_record IN 
        SELECT tc.organization_id, COALESCE(tc.retention_days, 90) as days
        FROM public.telemetry_config tc
    LOOP
        retention_days := org_record.days;
        
        -- Delete old events for this organization
        DELETE FROM public.telemetry_events 
        WHERE organization_id = org_record.organization_id 
        AND created_at < NOW() - INTERVAL '1 day' * retention_days;
        
        -- Delete old aggregates (keep longer for historical analysis)
        DELETE FROM public.telemetry_aggregates 
        WHERE organization_id = org_record.organization_id 
        AND date < CURRENT_DATE - INTERVAL '1 year';
        
        RAISE NOTICE 'Cleaned up telemetry data for organization %: removed events older than % days', 
            org_record.organization_id, retention_days;
    END LOOP;
END;
$$;


-- Name: collect_system_health_metrics(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.collect_system_health_metrics() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Clear old metrics (keep last 30 days)
  DELETE FROM public.system_health_metrics 
  WHERE collected_at < NOW() - INTERVAL '30 days';
  
  -- Collect database metrics
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'database_size_mb',
    pg_database_size(current_database()) / 1024.0 / 1024.0,
    'megabytes',
    'database';
    
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'active_connections',
    count(*),
    'count',
    'database'
  FROM pg_stat_activity 
  WHERE state = 'active';
  
  -- Collect business metrics
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'total_products',
    count(*),
    'count',
    'business'
  FROM public.products 
  WHERE status = 'active';
  
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'total_orders_today',
    count(*),
    'count',
    'business'
  FROM public.orders 
  WHERE created_at >= CURRENT_DATE;
  
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'total_customers',
    count(*),
    'count',
    'business'
  FROM public.profiles;
  
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'low_stock_products',
    count(*),
    'count',
    'inventory'
  FROM public.products 
  WHERE inventory_quantity <= 5 AND track_inventory = true;
  
END;
$$;


-- Name: FUNCTION collect_system_health_metrics(); Type: COMMENT; Schema: public; Owner: -



-- Name: create_demo_organization_for_user(uuid, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.create_demo_organization_for_user(p_user_id uuid, p_demo_type text DEFAULT 'known_optica'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_org_id UUID;
  v_branch_1_id UUID;
  v_branch_2_id UUID;
  v_slug TEXT;
  v_marcos_cat_id UUID;
  v_lentes_sol_cat_id UUID;
  v_accesorios_cat_id UUID;
  v_servicios_cat_id UUID;
  v_lf1_id UUID;
  v_lf2_id UUID;
  v_lf3_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);

  -- Ensure default categories exist (idempotent, for fresh DBs or missing seeds)
  INSERT INTO public.categories (name, slug, description, is_active, sort_order)
  VALUES
    ('Marcos', 'marcos', 'Armazones y marcos para lentes', true, 1),
    ('Lentes de sol', 'lentes-de-sol', 'Lentes de sol y gafas de sol', true, 2),
    ('Accesorios', 'accesorios', 'Accesorios para lentes y cuidado', true, 3),
    ('Servicios', 'servicios', 'Servicios de óptica y reparación', true, 4)
  ON CONFLICT (slug) DO NOTHING;

  v_org_id := gen_random_uuid();
  v_branch_1_id := gen_random_uuid();
  v_branch_2_id := gen_random_uuid();
  v_slug := 'demo-' || substr(md5(random()::text || gen_random_uuid()::text), 1, 8);
  v_expires_at := NOW() + INTERVAL '7 days';

  -- Categories (global)
  SELECT id INTO v_marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO v_lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO v_accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO v_servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;

  IF v_marcos_cat_id IS NULL OR v_lentes_sol_cat_id IS NULL OR v_accesorios_cat_id IS NULL OR v_servicios_cat_id IS NULL THEN
    RAISE EXCEPTION 'Categories not found. Run system migrations first.';
  END IF;

  -- Organization
  INSERT INTO public.organizations (id, name, slug, subscription_tier, status, metadata, created_at)
  VALUES (
    v_org_id,
    'Óptica Demo',
    v_slug,
    'premium',
    'active',
    jsonb_build_object(
      'is_demo', true,
      'demo_type', p_demo_type,
      'owner_user_id', p_user_id,
      'expires_at', v_expires_at
    ),
    NOW()
  );

  -- Subscription (trialing 7 days) - fixes "Período de prueba finalizado" banner
  INSERT INTO public.subscriptions (
    organization_id,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end
  )
  VALUES (
    v_org_id,
    'trialing',
    v_expires_at,
    CURRENT_DATE,
    (v_expires_at)::date
  );

  -- Branches (code must be globally unique, append org slug)
  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES
    (v_branch_1_id, 'Casa Matriz', 'DEMO-001-' || v_slug, v_org_id, 'Av. Providencia 1234', 'Santiago', 'Región Metropolitana', '7500000', 'Chile', '+56 2 2345 6789', 'demo@optica.cl', true, NOW()),
    (v_branch_2_id, 'Sucursal Providencia', 'DEMO-002-' || v_slug, v_org_id, 'Av. Apoquindo 4567', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', '+56 2 2345 6790', 'providencia@optica.cl', true, NOW());

  -- Lens families
  v_lf1_id := gen_random_uuid();
  v_lf2_id := gen_random_uuid();
  v_lf3_id := gen_random_uuid();
  INSERT INTO public.lens_families (id, name, brand, lens_type, lens_material, description, is_active, organization_id, created_at)
  VALUES
    (v_lf1_id, 'Monofocal Básico CR-39 AR', 'Genérico', 'single_vision', 'cr39', 'Lente monofocal estándar con antirreflejo.', true, v_org_id, NOW()),
    (v_lf2_id, 'Monofocal Policarbonato Blue Cut', 'Essilor', 'single_vision', 'polycarbonate', 'Monofocal resistente con filtro de luz azul.', true, v_org_id, NOW()),
    (v_lf3_id, 'Progresivo Comfort Policarbonato', 'Essilor', 'progressive', 'polycarbonate', 'Progresivo Varilux Comfort.', true, v_org_id, NOW());

  INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
  VALUES
    (v_lf1_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 29990, 9990, 'stock', true),
    (v_lf2_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 59990, 24990, 'stock', true),
    (v_lf3_id, -4.00, 4.00, -2.00, 2.00, 0.75, 1.75, 189990, 79990, 'surfaced', true);

  -- Products (13 total - enriched) - slug must be globally unique, append org slug
  INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, is_featured, price_includes_tax, featured_image, created_at)
  VALUES
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Ray-Ban RB2140', 'marco-ray-ban-rb2140-' || v_slug, 'Marco clásico aviador Ray-Ban.', 89900, 45000, v_marcos_cat_id, 'RB-2140-BLK-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Oakley OO9208', 'marco-oakley-oo9208-' || v_slug, 'Marco deportivo Oakley.', 129900, 65000, v_marcos_cat_id, 'OO-9208-BLK-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Gucci GG0061', 'marco-gucci-gg0061-' || v_slug, 'Marco de lujo Gucci.', 249900, 125000, v_marcos_cat_id, 'GG-0061-BRN-' || v_slug, 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Vogue VG-2001', 'marco-vogue-vg2001-' || v_slug, 'Marco clásico Vogue.', 69900, 35000, v_marcos_cat_id, 'VG-2001-BLK-' || v_slug, 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Marco Titanium Slim', 'marco-titanium-slim-' || v_slug, 'Marco ultrafino titanio.', 159900, 80000, v_marcos_cat_id, 'TI-SLIM-SLV-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Gafas de Sol Ray-Ban Aviator', 'gafas-sol-ray-ban-' || v_slug, 'Gafas de sol Ray-Ban Aviator.', 119900, 60000, v_lentes_sol_cat_id, 'RB-AVI-SUN-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Gafas de Sol Oakley Holbrook', 'gafas-sol-oakley-holbrook-' || v_slug, 'Gafas Oakley polarizadas.', 149900, 75000, v_lentes_sol_cat_id, 'OO-HOL-SUN-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Gafas de Sol Polarizadas Sport', 'gafas-sol-polarizadas-sport-' || v_slug, 'Gafas deportivas polarizadas.', 89900, 45000, v_lentes_sol_cat_id, 'SOL-SPORT-POL-' || v_slug, 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Estuche Rígido Premium', 'estuche-rigido-' || v_slug, 'Estuche rígido para lentes.', 12900, 5000, v_accesorios_cat_id, 'ACC-EST-RIG-' || v_slug, 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Paño de Limpieza Microfibra', 'pano-limpieza-microfibra-' || v_slug, 'Paño microfibra para lentes.', 4900, 2000, v_accesorios_cat_id, 'ACC-PANO-MIC-' || v_slug, 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Líquido Limpiador 120ml', 'liquido-limpiador-120ml-' || v_slug, 'Líquido limpiador para lentes.', 7900, 3000, v_accesorios_cat_id, 'ACC-LIQ-120-' || v_slug, 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Reparación de Marco', 'reparacion-marco-' || v_slug, 'Servicio de reparación de marco.', 19900, 0, v_servicios_cat_id, 'SERV-REP-MAR-' || v_slug, 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Montaje de Lentes', 'montaje-lentes-' || v_slug, 'Servicio de montaje de lentes.', 29900, 0, v_servicios_cat_id, 'SERV-MON-LEN-' || v_slug, 'active', true, true, NULL, NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Examen de la Vista', 'examen-vista-' || v_slug, 'Examen completo con optometrista.', 25000, 0, v_servicios_cat_id, 'SERV-EXA-VIS-' || v_slug, 'active', true, true, NULL, NOW());

  -- Product branch stock
  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, v_branch_1_id, 20, 5, NOW()
  FROM public.products p WHERE p.organization_id = v_org_id;
  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, v_branch_2_id, 15, 5, NOW()
  FROM public.products p WHERE p.organization_id = v_org_id;

  -- Customers branch 1 (15 total - enriched with Chilean names)
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'María', 'González', 'maria.gonzalez@demo-' || v_slug || '.cl', '+56 9 1234 5678', '12.345.678-9', '1985-03-15', 'female', 'Av. Las Condes 456', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-01-15', '2026-01-15', 'email', 'Isapre Consalud', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Juan', 'Pérez', 'juan.perez@demo-' || v_slug || '.cl', '+56 9 2345 6789', '13.456.789-0', '1990-07-22', 'male', 'Calle Los Rosales 789', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-10', '2026-01-10', 'phone', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Ana', 'Martínez', 'ana.martinez@demo-' || v_slug || '.cl', '+56 9 3456 7890', '14.567.890-1', '1988-11-08', 'female', 'Pasaje Los Aromos 321', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2024-12-20', '2025-12-20', 'whatsapp', 'Isapre Colmena', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Carlos', 'Rodríguez', 'carlos.rodriguez@demo-' || v_slug || '.cl', '+56 9 4567 8901', '15.678.901-2', '1975-05-30', 'male', 'Av. Vitacura 1234', 'Vitacura', 'Región Metropolitana', '7630000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2025-01-05', '2026-01-05', 'email', 'Isapre Banmédica', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Laura', 'Sánchez', 'laura.sanchez@demo-' || v_slug || '.cl', '+56 9 5678 9012', '16.789.012-3', '1992-09-14', 'female', 'Calle Los Claveles 567', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Miopía', 'Astigmatismo'], ARRAY[]::TEXT[], '2024-11-28', '2025-11-28', 'sms', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Roberto', 'López', 'roberto.lopez@demo-' || v_slug || '.cl', '+56 9 6789 0123', '17.890.123-4', '1983-02-18', 'male', 'Av. Apoquindo 2345', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-10-15', '2025-10-15', 'phone', 'Isapre Consalud', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Carmen', 'Fernández', 'carmen.fernandez@demo-' || v_slug || '.cl', '+56 9 7890 1234', '18.901.234-5', '1978-12-25', 'female', 'Calle Los Olivos 890', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-09-20', '2025-09-20', 'email', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Diego', 'Torres', 'diego.torres@demo-' || v_slug || '.cl', '+56 9 8901 2345', '19.012.345-6', '1995-04-07', 'male', 'Pasaje Los Jazmines 456', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-08-10', '2025-08-10', 'whatsapp', 'Isapre Colmena', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Patricia', 'Morales', 'patricia.morales@demo-' || v_slug || '.cl', '+56 9 9012 3456', '20.123.456-7', '1987-08-19', 'female', 'Av. Nueva Providencia 3456', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2024-07-05', '2025-07-05', 'email', 'Isapre Banmédica', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_1_id, v_org_id, 'Fernando', 'Ramírez', 'fernando.ramirez@demo-' || v_slug || '.cl', '+56 9 0123 4567', '21.234.567-8', '1981-01-31', 'male', 'Calle Los Laureles 678', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2024-06-18', '2025-06-18', 'phone', 'Fonasa', true, NOW(), NOW());
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  SELECT gen_random_uuid(), v_branch_1_id, v_org_id, 'Cliente' || ser.n, 'Demo' || ser.n, 'cliente' || ser.n || '@demo-' || v_slug || '.cl', '+56 9 0000 000' || ser.n, '30.000.00' || (ser.n - 10) || '-1', '1990-01-01', CASE WHEN ser.n % 2 = 0 THEN 'male' ELSE 'female' END, 'Calle Demo ' || ser.n, 'Santiago', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE + INTERVAL '1 year', 'email', 'Fonasa', true, NOW(), NOW()
  FROM generate_series(11, 15) AS ser(n);

  -- Customers branch 2 (8 total - enriched)
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Elena', 'Vega', 'elena.vega@demo-' || v_slug || '.cl', '+56 9 1111 1111', '11.111.111-1', '1982-04-20', 'female', 'Av. Apoquindo 100', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-02-01', '2026-02-01', 'email', 'Isapre Consalud', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Roberto', 'Molina', 'roberto.molina@demo-' || v_slug || '.cl', '+56 9 2222 2222', '11.222.222-2', '1978-09-15', 'male', 'Calle San Damián 200', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-11-10', '2025-11-10', 'whatsapp', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Claudia', 'Soto', 'claudia.soto@demo-' || v_slug || '.cl', '+56 9 3333 3333', '11.333.333-3', '1991-12-03', 'female', 'Av. Las Condes 300', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-20', '2026-01-20', 'phone', 'Isapre Banmédica', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Pablo', 'Contreras', 'pablo.contreras@demo-' || v_slug || '.cl', '+56 9 4444 4444', '11.444.444-4', '1985-06-28', 'male', 'Pasaje Los Dominicos 400', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2024-10-05', '2025-10-05', 'email', 'Isapre Colmena', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Francisca', 'Lagos', 'francisca.lagos@demo-' || v_slug || '.cl', '+56 9 5555 5555', '11.555.555-5', '1994-03-12', 'female', 'Av. Kennedy 500', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-09-15', '2025-09-15', 'sms', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Andrés', 'Silva', 'andres.silva@demo-' || v_slug || '.cl', '+56 9 6666 6666', '11.666.666-6', '1989-07-22', 'male', 'Calle Los Leones 600', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-08-01', '2025-08-01', 'email', 'Fonasa', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Valentina', 'Rojas', 'valentina.rojas@demo-' || v_slug || '.cl', '+56 9 7777 7777', '11.777.777-7', '1993-11-15', 'female', 'Av. Providencia 700', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2024-07-10', '2025-07-10', 'whatsapp', 'Isapre Consalud', true, NOW(), NOW()),
    (gen_random_uuid(), v_branch_2_id, v_org_id, 'Miguel', 'Espinoza', 'miguel.espinoza@demo-' || v_slug || '.cl', '+56 9 8888 8888', '11.888.888-8', '1980-03-08', 'male', 'Pasaje Los Plátanos 800', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-06-20', '2025-06-20', 'phone', 'Isapre Banmédica', true, NOW(), NOW());

  -- Prescriptions for customers (1 per customer, auto via SELECT)
  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-DEMO-' || substr(md5(random()::text || c.id::text), 1, 8) || '-' || substr(c.id::text, 1, 8), 'Dr. Demo', 'OPTO-00000', -1.5, -0.5, 90, NULL, 32.0, -1.5, -0.5, 90, NULL, 32.0, 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.organization_id = v_org_id;

  -- Schedule, quote, pos settings
  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES
    (v_branch_1_id, v_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"09:00","end_time":"13:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW()),
    (v_branch_2_id, v_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"10:00","end_time":"14:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW());
  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  VALUES (v_branch_1_id, v_org_id, NOW(), NOW()), (v_branch_2_id, v_org_id, NOW(), NOW());
  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (v_branch_1_id, 50.00, NOW(), NOW()), (v_branch_2_id, 50.00, NOW(), NOW());

  -- Admin user and branch access
  INSERT INTO public.admin_users (id, email, role, organization_id, is_active)
  SELECT p_user_id, u.email, 'super_admin', v_org_id, true
  FROM auth.users u WHERE u.id = p_user_id
  ON CONFLICT (id) DO UPDATE SET organization_id = v_org_id, role = 'super_admin', is_active = true;

  DELETE FROM public.admin_branch_access WHERE admin_user_id = p_user_id;
  INSERT INTO public.admin_branch_access (admin_user_id, branch_id, role, is_primary)
  VALUES
    (p_user_id, v_branch_1_id, 'manager', true),
    (p_user_id, v_branch_2_id, 'manager', false);

  RETURN v_org_id;
END;
$$;


-- Name: FUNCTION create_demo_organization_for_user(p_user_id uuid, p_demo_type text); Type: COMMENT; Schema: public; Owner: -



-- Name: create_lens_family_full(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.create_lens_family_full(p_family_data jsonb, p_matrices_data jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_family_id uuid;
  v_matrices jsonb;
  v_lens_type text;
  v_addition_min decimal := 0;
  v_addition_max decimal := 4.0;
BEGIN
  -- Insert Lens Family
  INSERT INTO public.lens_families (
    name,
    brand,
    lens_type,
    lens_material,
    description,
    is_active,
    organization_id
  ) VALUES (
    (p_family_data->>'name')::text,
    (p_family_data->>'brand')::text,
    (p_family_data->>'lens_type')::text,
    (p_family_data->>'lens_material')::text,
    (p_family_data->>'description')::text,
    COALESCE((p_family_data->>'is_active')::boolean, true),
    (p_family_data->>'organization_id')::uuid
  ) RETURNING id, lens_type INTO v_family_id, v_lens_type;

  -- Use default matrices if p_matrices_data is empty, null, or []
  IF p_matrices_data IS NULL OR jsonb_array_length(COALESCE(p_matrices_data, '[]'::jsonb)) = 0 THEN
    -- Monofocal: addition 0-0; progressive/bifocal/reading/computer/sports: 0-4
    IF v_lens_type = 'single_vision' THEN
      v_addition_min := 0;
      v_addition_max := 0;
    END IF;

    -- Rango base
    INSERT INTO public.lens_price_matrices (
      lens_family_id, name, sphere_min, sphere_max, cylinder_min, cylinder_max,
      addition_min, addition_max, base_price, cost, sourcing_type, is_active
    ) VALUES (
      v_family_id, 'Rango base', -6, 6, -4, 0,
      v_addition_min, v_addition_max, 0, 0, 'surfaced', true
    );

    -- Fallback
    INSERT INTO public.lens_price_matrices (
      lens_family_id, name, sphere_min, sphere_max, cylinder_min, cylinder_max,
      addition_min, addition_max, base_price, cost, sourcing_type, is_active
    ) VALUES (
      v_family_id, 'Fallback', -20, 20, -8, 0,
      0, 4, 999999, 999999, 'surfaced', true
    );
  ELSE
    -- Iterate over provided matrices
    FOR v_matrices IN SELECT * FROM jsonb_array_elements(p_matrices_data)
    LOOP
      INSERT INTO public.lens_price_matrices (
        lens_family_id,
        name,
        sphere_min,
        sphere_max,
        cylinder_min,
        cylinder_max,
        addition_min,
        addition_max,
        base_price,
        cost,
        sourcing_type,
        is_active
      ) VALUES (
        v_family_id,
        (v_matrices->>'name')::text,
        (v_matrices->>'sphere_min')::decimal,
        (v_matrices->>'sphere_max')::decimal,
        (v_matrices->>'cylinder_min')::decimal,
        (v_matrices->>'cylinder_max')::decimal,
        COALESCE((v_matrices->>'addition_min')::decimal, 0),
        COALESCE((v_matrices->>'addition_max')::decimal, 4.0),
        (v_matrices->>'base_price')::decimal,
        (v_matrices->>'cost')::decimal,
        COALESCE((v_matrices->>'sourcing_type')::text, 'surfaced'),
        COALESCE((v_matrices->>'is_active')::boolean, true)
      );
    END LOOP;
  END IF;

  RETURN json_build_object('id', v_family_id);
END;
$$;


-- Name: decrement_inventory(uuid, integer); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.decrement_inventory(product_id uuid, quantity integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Get current inventory
  SELECT inventory_quantity INTO current_stock
  FROM public.products
  WHERE id = product_id;
  
  IF current_stock IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update inventory
  UPDATE public.products
  SET inventory_quantity = GREATEST(0, current_stock - quantity),
      updated_at = NOW()
  WHERE id = product_id;
  
  RETURN TRUE;
END;
$$;


-- Name: delete_campaign_cascade(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.delete_campaign_cascade(p_campaign_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ BEGIN DELETE FROM leads WHERE campaign_id = p_campaign_id; DELETE FROM enrichment_audit WHERE campaign_id = p_campaign_id; DELETE FROM campaigns WHERE id = p_campaign_id; END; $$;


-- Name: delete_demo_request_and_org(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.delete_demo_request_and_org(p_request_id uuid) RETURNS TABLE(deleted_request_id uuid, deleted_org_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_org_id UUID;
  v_branch_ids UUID[];
  v_request_id UUID;
  global_demo_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);

  SELECT organization_id INTO v_org_id
  FROM public.demo_requests
  WHERE id = p_request_id;

  IF v_org_id IS NOT NULL AND v_org_id != global_demo_id THEN
    SELECT ARRAY_AGG(id) INTO v_branch_ids
    FROM public.branches
    WHERE organization_id = v_org_id;

    -- Delete in order respecting FKs
    DELETE FROM public.optical_internal_support_messages
    WHERE ticket_id IN (SELECT id FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id);
    DELETE FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id;

    -- credit_notes: skip if tables don't exist (optional feature)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_notes') THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_note_movements') THEN
        DELETE FROM public.credit_note_movements
        WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
      END IF;
      DELETE FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    END IF;

    -- Agreements: institutional balances (before orders), then purchase orders, then agreements
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agreement_institutional_balances') THEN
      DELETE FROM public.agreement_institutional_balances
      WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    END IF;

    -- Billing (before orders)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_document_items') THEN
      DELETE FROM public.billing_document_items
      WHERE billing_document_id IN (SELECT id FROM public.billing_documents WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_documents') THEN
      DELETE FROM public.billing_documents WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    END IF;

    DELETE FROM public.order_payments
    WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.pos_transactions
    WHERE pos_session_id IN (SELECT id FROM public.pos_sessions WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.order_items
    WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.quotes WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.lab_work_orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.prescriptions
    WHERE customer_id IN (SELECT id FROM public.customers WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.appointments WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));

    -- Agreements: agreement_customers (before agreements, references both)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agreement_customers') THEN
      DELETE FROM public.agreement_customers
      WHERE agreement_id IN (
        SELECT id FROM public.agreements
        WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]))
      );
    END IF;

    -- Agreements: purchase orders and agreements (after orders)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agreement_purchase_orders') THEN
      DELETE FROM public.agreement_purchase_orders
      WHERE agreement_id IN (
        SELECT id FROM public.agreements
        WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]))
      );
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agreements') THEN
      DELETE FROM public.agreements
      WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    END IF;

    -- internal_orders has ON DELETE RESTRICT on branch_id; must delete before branches
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internal_orders') THEN
      DELETE FROM public.internal_order_status_history
      WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = v_org_id);
      DELETE FROM public.internal_order_items
      WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = v_org_id);
      DELETE FROM public.internal_orders WHERE organization_id = v_org_id;
    END IF;

    -- Org-scoped tables (before products/branches)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tier_change_audit') THEN
      DELETE FROM public.tier_change_audit WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_usage_log') THEN
      DELETE FROM public.ai_usage_log WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telemetry_events') THEN
      DELETE FROM public.telemetry_events WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telemetry_aggregates') THEN
      DELETE FROM public.telemetry_aggregates WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telemetry_config') THEN
      DELETE FROM public.telemetry_config WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_phone_numbers') THEN
      DELETE FROM public.whatsapp_phone_numbers WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tour_progress') THEN
      DELETE FROM public.user_tour_progress WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_config') THEN
      DELETE FROM public.system_config WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    END IF;

    DELETE FROM public.product_branch_stock WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.products WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.lens_price_matrices
    WHERE lens_family_id IN (SELECT id FROM public.lens_families WHERE organization_id = v_org_id);
    DELETE FROM public.lens_families WHERE organization_id = v_org_id;
    DELETE FROM public.contact_lens_price_matrices WHERE organization_id = v_org_id;
    DELETE FROM public.contact_lens_families WHERE organization_id = v_org_id;
    DELETE FROM public.schedule_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.quote_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.pos_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.cash_register_closures WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.pos_sessions WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.organization_settings WHERE organization_id = v_org_id;
    DELETE FROM public.admin_notifications WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.ai_insights WHERE organization_id = v_org_id;
    DELETE FROM public.customers WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.admin_branch_access WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.subscriptions WHERE organization_id = v_org_id;
    UPDATE public.admin_users SET organization_id = NULL WHERE organization_id = v_org_id;
    DELETE FROM public.branches WHERE organization_id = v_org_id;
    DELETE FROM public.organizations WHERE id = v_org_id;
  END IF;

  DELETE FROM public.demo_requests WHERE id = p_request_id;
  v_request_id := p_request_id;

  deleted_request_id := v_request_id;
  deleted_org_id := v_org_id;
  RETURN NEXT;
END;
$$;


-- Name: FUNCTION delete_demo_request_and_org(p_request_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: expire_quotes(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.expire_quotes() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update quotes that have passed their expiration date and are not already expired or converted
  UPDATE public.quotes
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    expiration_date IS NOT NULL
    AND expiration_date < CURRENT_DATE
    AND status NOT IN ('expired', 'converted_to_work', 'accepted')
    AND status != 'expired'; -- Double check to avoid unnecessary updates
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$;


-- Name: FUNCTION expire_quotes(); Type: COMMENT; Schema: public; Owner: -



-- Name: generate_agreement_institutional_invoice_folio(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.generate_agreement_institutional_invoice_folio(p_branch_id uuid) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_prefix TEXT := 'FAC-INST-';
  v_last_folio TEXT;
  v_next_number INTEGER;
BEGIN
  SELECT folio INTO v_last_folio
  FROM public.agreement_institutional_invoices
  WHERE branch_id = p_branch_id
    AND folio LIKE v_prefix || '%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_folio IS NOT NULL THEN
    v_next_number := CAST(SUBSTRING(v_last_folio FROM '\d+$') AS INTEGER) + 1;
  ELSE
    v_next_number := 1;
  END IF;

  RETURN v_prefix || LPAD(v_next_number::TEXT, 6, '0');
END;
$_$;


-- Name: FUNCTION generate_agreement_institutional_invoice_folio(p_branch_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: generate_billing_folio(uuid, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.generate_billing_folio(p_branch_id uuid, p_document_type text) RETURNS text
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


-- Name: FUNCTION generate_billing_folio(p_branch_id uuid, p_document_type text); Type: COMMENT; Schema: public; Owner: -



-- Name: generate_contact_lens_sku(text, text, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.generate_contact_lens_sku(brand text, name text, org_id uuid) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_brand_code TEXT;
  v_name_code TEXT;
  v_org_code TEXT;
  v_random_suffix TEXT;
BEGIN
  -- Código de marca (3 primeras letras, sin espacios)
  v_brand_code := UPPER(REPLACE(LEFT(brand, 3), ' ', ''));
  IF v_brand_code IS NULL OR v_brand_code = '' THEN
    v_brand_code := 'CL'; -- Default para lentes de contacto
  END IF;
  
  -- Código de nombre (3 primeras letras)
  v_name_code := UPPER(REPLACE(LEFT(name, 3), ' ', ''));
  IF v_name_code IS NULL OR v_name_code = '' THEN
    v_name_code := 'LEN';
  END IF;
  
  -- Código de organización (últimos 4 caracteres del UUID)
  v_org_code := UPPER(RIGHT(org_id::TEXT, 4));
  
  -- Sufijo aleatorio para unicidad
  v_random_suffix := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  RETURN v_brand_code || '-' || v_name_code || '-' || v_org_code || '-' || v_random_suffix;
END;
$$;


-- Name: generate_credit_note_number(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.generate_credit_note_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  year_part TEXT;
  sequence_number INTEGER;
  cn_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(c.credit_note_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM public.credit_notes c
  WHERE c.credit_note_number LIKE 'NC-' || year_part || '%';
  cn_number := 'NC-' || year_part || LPAD(sequence_number::TEXT, 6, '0');
  RETURN cn_number;
END;
$_$;


-- Name: FUNCTION generate_credit_note_number(); Type: COMMENT; Schema: public; Owner: -



-- Name: generate_internal_order_number(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.generate_internal_order_number(org_id uuid) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  prefix TEXT;
  next_number INTEGER;
  order_number TEXT;
BEGIN
  -- Get organization prefix (first 3 letters of organization name)
  SELECT UPPER(LEFT(name, 3)) INTO prefix
  FROM public.organizations
  WHERE id = org_id;
  
  -- Get next sequence number for this organization
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM LENGTH(prefix) + 2) AS INTEGER)), 0) + 1 INTO next_number
  FROM public.internal_orders
  WHERE organization_id = org_id
  AND order_number LIKE prefix || '-%';
  
  -- Generate order number (e.g., OPT-0001)
  order_number := prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN order_number;
END;
$$;


-- Name: FUNCTION generate_internal_order_number(org_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: generate_optical_internal_ticket_number(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.generate_optical_internal_ticket_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  date_prefix TEXT;
  random_suffix TEXT;
  ticket_num TEXT;
BEGIN
  -- Format: OPT-YYYYMMDD-XXXXX
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5));
  ticket_num := 'OPT-' || date_prefix || '-' || random_suffix;
  
  -- Ensure uniqueness (retry if collision)
  WHILE EXISTS (SELECT 1 FROM public.optical_internal_support_tickets WHERE ticket_number = ticket_num) LOOP
    random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || RANDOM()::TEXT) FROM 1 FOR 5));
    ticket_num := 'OPT-' || date_prefix || '-' || random_suffix;
  END LOOP;
  
  RETURN ticket_num;
END;
$$;


-- Name: FUNCTION generate_optical_internal_ticket_number(); Type: COMMENT; Schema: public; Owner: -



-- Name: generate_quote_number(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.generate_quote_number() RETURNS text
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


-- Name: generate_saas_ticket_number(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.generate_saas_ticket_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  date_prefix TEXT;
  random_suffix TEXT;
  ticket_num TEXT;
BEGIN
  -- Format: SAAS-YYYYMMDD-XXXXX
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5));
  ticket_num := 'SAAS-' || date_prefix || '-' || random_suffix;
  
  -- Ensure uniqueness (retry if collision)
  WHILE EXISTS (SELECT 1 FROM public.saas_support_tickets WHERE ticket_number = ticket_num) LOOP
    random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || RANDOM()::TEXT) FROM 1 FOR 5));
    ticket_num := 'SAAS-' || date_prefix || '-' || random_suffix;
  END LOOP;
  
  RETURN ticket_num;
END;
$$;


-- Name: FUNCTION generate_saas_ticket_number(); Type: COMMENT; Schema: public; Owner: -



-- Name: generate_sii_invoice_number(text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.generate_sii_invoice_number(invoice_type text) RETURNS text
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


-- Name: generate_ticket_number(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.generate_ticket_number() RETURNS text
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


-- Name: generate_work_order_number(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.generate_work_order_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  year_part TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get last work order number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM '[0-9]+$') AS INTEGER)), 0)
  INTO last_number
  FROM public.lab_work_orders
  WHERE work_order_number LIKE 'TRB-' || year_part || '-%';
  
  -- Generate new number
  new_number := 'TRB-' || year_part || '-' || LPAD((last_number + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$_$;


-- Name: get_admin_role(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_admin_role(user_id uuid DEFAULT auth.uid()) RETURNS text
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


-- Name: FUNCTION get_admin_role(user_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: get_auth_user_id_by_email(text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_auth_user_id_by_email(p_email text) RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;
$$;


-- Name: FUNCTION get_auth_user_id_by_email(p_email text); Type: COMMENT; Schema: public; Owner: -



-- Name: get_available_time_slots(date, integer, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_available_time_slots(p_date date, p_duration_minutes integer DEFAULT 30, p_staff_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid) RETURNS TABLE(time_slot time without time zone, available boolean)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_settings RECORD;
  v_day_name TEXT;
  v_day_config JSONB;
  v_start_time TIME;
  v_end_time TIME;
  v_lunch_start TIME;
  v_lunch_end TIME;
  v_current_time TIME;
  v_slot_duration INTEGER;
  v_appointment RECORD;
  v_is_available BOOLEAN;
  v_now TIMESTAMP;
BEGIN
  -- Get schedule settings with fallback logic (same as check_appointment_availability)
  IF p_branch_id IS NOT NULL THEN
    -- First try to get branch-specific settings
    SELECT * INTO v_settings 
    FROM public.schedule_settings 
    WHERE branch_id = p_branch_id 
    LIMIT 1;
    
    -- If branch-specific settings not found, try global settings
    IF v_settings IS NULL THEN
      SELECT * INTO v_settings 
      FROM public.schedule_settings 
      WHERE branch_id IS NULL 
      LIMIT 1;
    END IF;
    
    -- If still not found, use any available settings as last resort
    IF v_settings IS NULL THEN
      SELECT * INTO v_settings 
      FROM public.schedule_settings 
      LIMIT 1;
    END IF;
  ELSE
    -- No branch specified, try global settings first
    SELECT * INTO v_settings 
    FROM public.schedule_settings 
    WHERE branch_id IS NULL 
    LIMIT 1;
    
    -- If no global settings, use any available settings
    IF v_settings IS NULL THEN
      SELECT * INTO v_settings 
      FROM public.schedule_settings 
      LIMIT 1;
    END IF;
  END IF;
  
  IF v_settings IS NULL THEN
    -- Return empty if no settings configured
    RETURN;
  END IF;

  v_slot_duration := COALESCE(v_settings.slot_duration_minutes, 15);
  v_now := NOW();

  -- Use TRIM to ensure day name matches working_hours JSONB keys
  v_day_name := LOWER(TRIM(TO_CHAR(p_date, 'Day')));
  v_day_config := v_settings.working_hours->v_day_name;
  
  -- Check if day is enabled
  IF v_day_config IS NULL OR NOT (v_day_config->>'enabled')::BOOLEAN THEN
    RETURN;
  END IF;

  -- Check if date is blocked
  IF v_settings.blocked_dates IS NOT NULL AND p_date = ANY(v_settings.blocked_dates) THEN
    RETURN;
  END IF;

  -- Get working hours
  v_start_time := (v_day_config->>'start_time')::TIME;
  v_end_time := (v_day_config->>'end_time')::TIME;
  v_lunch_start := CASE WHEN v_day_config->>'lunch_start' IS NOT NULL 
    THEN (v_day_config->>'lunch_start')::TIME ELSE NULL END;
  v_lunch_end := CASE WHEN v_day_config->>'lunch_end' IS NOT NULL 
    THEN (v_day_config->>'lunch_end')::TIME ELSE NULL END;

  -- Generate time slots
  v_current_time := v_start_time;
  
  WHILE v_current_time < v_end_time LOOP
    v_is_available := TRUE;
    
    -- Check if slot is during lunch break
    IF v_lunch_start IS NOT NULL AND v_lunch_end IS NOT NULL THEN
      IF v_current_time >= v_lunch_start AND v_current_time < v_lunch_end THEN
        v_is_available := FALSE;
      END IF;
    END IF;
    
    -- Check if slot conflicts with existing appointments (filter by branch_id)
    IF v_is_available THEN
      SELECT EXISTS(
        SELECT 1 FROM public.appointments a
        WHERE a.appointment_date = p_date
          AND a.status IN ('scheduled', 'confirmed')
          AND (
            -- Appointment starts during this slot
            (a.appointment_time <= v_current_time 
             AND (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL) > v_current_time)
            OR
            -- Appointment overlaps with this slot
            (a.appointment_time < (v_current_time + (p_duration_minutes || ' minutes')::INTERVAL)
             AND (a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL) > v_current_time)
          )
          AND (p_staff_id IS NULL OR a.assigned_to = p_staff_id)
          AND (p_branch_id IS NULL OR a.branch_id = p_branch_id) -- Filter by branch
      ) INTO v_is_available;
      
      v_is_available := NOT v_is_available;
    END IF;
    
    -- Check minimum advance booking (only if > 0 and it's today)
    -- If min_advance_booking_hours = 0, allow immediate bookings
    IF v_is_available AND v_settings.min_advance_booking_hours > 0 AND p_date = CURRENT_DATE THEN
      IF (p_date || ' ' || v_current_time)::TIMESTAMP < 
         (v_now + (v_settings.min_advance_booking_hours || ' hours')::INTERVAL) THEN
        v_is_available := FALSE;
      END IF;
    END IF;
    
    -- Check maximum advance booking
    IF v_is_available AND v_settings.max_advance_booking_days > 0 THEN
      IF p_date > (CURRENT_DATE + (v_settings.max_advance_booking_days || ' days')::INTERVAL) THEN
        v_is_available := FALSE;
      END IF;
    END IF;
    
    RETURN QUERY SELECT v_current_time, v_is_available;
    
    -- Move to next slot
    v_current_time := v_current_time + (v_slot_duration || ' minutes')::INTERVAL;
  END LOOP;
END;
$$;


-- Name: FUNCTION get_available_time_slots(p_date date, p_duration_minutes integer, p_staff_id uuid, p_branch_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: get_current_branch_id(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_current_branch_id() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- This will be set via session variable in the future
  -- For now, return NULL (will be handled in application layer)
  RETURN NULL;
END;
$$;


-- Name: FUNCTION get_current_branch_id(); Type: COMMENT; Schema: public; Owner: -



-- Name: get_current_prescription(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_current_prescription(customer_uuid uuid) RETURNS TABLE(id uuid, prescription_date date, expiration_date date, od_sphere numeric, od_cylinder numeric, od_axis integer, os_sphere numeric, os_cylinder numeric, os_axis integer)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.prescription_date,
    p.expiration_date,
    p.od_sphere,
    p.od_cylinder,
    p.od_axis,
    p.os_sphere,
    p.os_cylinder,
    p.os_axis
  FROM public.prescriptions p
  WHERE p.customer_id = customer_uuid
    AND p.is_current = TRUE
    AND p.is_active = TRUE
  ORDER BY p.prescription_date DESC
  LIMIT 1;
END;
$$;


-- Name: get_min_deposit(numeric, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_min_deposit(p_order_total numeric, p_branch_id uuid DEFAULT NULL::uuid) RETURNS numeric
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_percent DECIMAL(5,2);
  v_min_amount DECIMAL(10,2);
  v_calculated DECIMAL(10,2);
BEGIN
  -- Get settings from pos_settings (if branch_id is NULL, use first/default settings)
  SELECT 
    COALESCE(min_deposit_percent, 50.00),
    COALESCE(min_deposit_amount, 0)
  INTO v_percent, v_min_amount
  FROM public.pos_settings
  WHERE (p_branch_id IS NULL OR branch_id = p_branch_id)
  LIMIT 1;
  
  -- If no settings found, use defaults
  IF v_percent IS NULL THEN
    v_percent := 50.00;
    v_min_amount := 0;
  END IF;
  
  -- Calcular depósito por porcentaje
  v_calculated := p_order_total * (v_percent / 100);
  
  -- Retornar el mayor entre porcentaje y monto fijo
  RETURN GREATEST(v_calculated, v_min_amount);
END;
$$;


-- Name: FUNCTION get_min_deposit(p_order_total numeric, p_branch_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: get_notification_priority(public.admin_notification_type, public.admin_notification_priority); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_notification_priority(p_notification_type public.admin_notification_type, p_default_priority public.admin_notification_priority DEFAULT 'medium'::public.admin_notification_priority) RETURNS public.admin_notification_priority
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN public.get_notification_priority(p_notification_type, p_default_priority, NULL::UUID, NULL::UUID);
END;
$$;


-- Name: get_notification_priority(public.admin_notification_type, public.admin_notification_priority, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_notification_priority(p_notification_type public.admin_notification_type, p_default_priority public.admin_notification_priority DEFAULT 'medium'::public.admin_notification_priority, p_organization_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid) RETURNS public.admin_notification_priority
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


-- Name: get_notification_setting_effective(public.admin_notification_type, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_notification_setting_effective(p_notification_type public.admin_notification_type, p_organization_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid) RETURNS TABLE(enabled boolean, priority public.admin_notification_priority)
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


-- Name: get_product_stock(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_product_stock(p_product_id uuid, p_branch_id uuid) RETURNS TABLE(quantity integer, reserved_quantity integer, available_quantity integer, low_stock_threshold integer, reorder_point integer, is_low_stock boolean)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pbs.quantity,
    pbs.reserved_quantity,
    pbs.available_quantity,
    pbs.low_stock_threshold,
    pbs.reorder_point,
    (pbs.available_quantity <= pbs.low_stock_threshold) as is_low_stock
  FROM public.product_branch_stock pbs
  WHERE pbs.product_id = p_product_id
    AND pbs.branch_id = p_branch_id;
  
  -- If no record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 5, NULL, false;
  END IF;
END;
$$;


-- Name: FUNCTION get_product_stock(p_product_id uuid, p_branch_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: get_telemetry_stats(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_telemetry_stats(org_id uuid DEFAULT NULL::uuid) RETURNS TABLE(organization_id uuid, total_events bigint, unique_users bigint, date_range text, storage_size_mb numeric)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(te.organization_id, org_id) as organization_id,
        COUNT(*) as total_events,
        COUNT(DISTINCT te.user_id) as unique_users,
        CONCAT(
            TO_CHAR(MIN(te.created_at), 'YYYY-MM-DD'), 
            ' to ', 
            TO_CHAR(MAX(te.created_at), 'YYYY-MM-DD')
        ) as date_range,
        ROUND(pg_total_relation_size('telemetry_events'::regclass) / 1024.0 / 1024.0, 2) as storage_size_mb
    FROM public.telemetry_events te
    WHERE (org_id IS NULL OR te.organization_id = org_id)
    GROUP BY COALESCE(te.organization_id, org_id);
END;
$$;


-- Name: get_treatment_price(text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_treatment_price(p_treatment_key text, p_lens_material text DEFAULT 'cr39'::text) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_price DECIMAL(10,2);
  v_treatment RECORD;
BEGIN
  SELECT * INTO v_treatment
  FROM treatments
  WHERE treatment_key = p_treatment_key AND is_active = true;

  IF v_treatment IS NULL THEN
    RETURN 0;
  END IF;

  -- Verificar si hay override por material
  IF v_treatment.price_override IS NOT NULL THEN
    IF v_treatment.price_override->>p_lens_material IS NOT NULL THEN
      RETURN (v_treatment.price_override->>p_lens_material)::DECIMAL(10,2);
    END IF;
  END IF;

  RETURN v_treatment.default_price;
END;
$$;


-- Name: get_unread_notification_count(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_unread_notification_count(admin_user_id uuid DEFAULT auth.uid()) RETURNS integer
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


-- Name: get_upcoming_appointments(uuid, integer); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_upcoming_appointments(customer_uuid uuid, days_ahead integer DEFAULT 30) RETURNS TABLE(id uuid, appointment_date date, appointment_time time without time zone, appointment_type text, status text, notes text)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.appointment_type,
    a.status,
    a.notes
  FROM public.appointments a
  WHERE a.customer_id = customer_uuid
    AND a.appointment_date >= CURRENT_DATE
    AND a.appointment_date <= CURRENT_DATE + (days_ahead || ' days')::INTERVAL
    AND a.status IN ('scheduled', 'confirmed')
  ORDER BY a.appointment_date ASC, a.appointment_time ASC;
END;
$$;


-- Name: get_user_branches(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_user_branches(user_id uuid DEFAULT auth.uid()) RETURNS TABLE(branch_id uuid, branch_name text, branch_code text, role text, is_primary boolean)
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


-- Name: FUNCTION get_user_branches(user_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: get_user_organization_id(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.get_user_organization_id(user_id uuid DEFAULT auth.uid()) RETURNS uuid
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


-- Name: FUNCTION get_user_organization_id(user_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: handle_demo_request_activity(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.handle_demo_request_activity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_activity_type TEXT;
    v_description TEXT;
BEGIN
    -- Detect stage changes
    IF NEW.funnel_stage IS DISTINCT FROM OLD.funnel_stage THEN
        -- Determine if positive or negative change
        IF NEW.funnel_stage IN ('converted', 'won') OR 
           (NEW.funnel_stage = 'negotiation' AND OLD.funnel_stage IN ('meeting_scheduled', 'post_meeting')) OR
           (NEW.funnel_stage = 'post_meeting' AND OLD.funnel_stage = 'meeting_scheduled') OR
           (NEW.funnel_stage = 'meeting_scheduled' AND OLD.funnel_stage IN ('approved', 'demo_expiring', 'demo_active')) THEN
            v_activity_type := 'stage_changed_positive';
        ELSIF NEW.funnel_stage IN ('lost', 'rejected', 'demo_expired') THEN
            v_activity_type := 'stage_changed_negative';
        ELSE
            v_activity_type := 'stage_changed';
        END IF;
        
        v_description := 'Cambió de etapa: ' || COALESCE(OLD.funnel_stage, 'null') || ' → ' || COALESCE(NEW.funnel_stage, 'null');
        
        PERFORM record_lead_activity(
            NEW.id,
            v_activity_type,
            v_description,
            JSONB_BUILD_OBJECT('old_stage', OLD.funnel_stage, 'new_stage', NEW.funnel_stage)
        );
    END IF;
    
    -- Record first contact
    IF NEW.first_contact_at IS DISTINCT FROM OLD.first_contact_at AND NEW.first_contact_at IS NOT NULL THEN
        PERFORM record_lead_activity(
            NEW.id,
            'first_contact',
            'Primer contacto registrado'
        );
    END IF;
    
    RETURN NEW;
END;
$$;


-- Name: handle_new_admin_user(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.handle_new_admin_user() RETURNS trigger
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


-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.handle_new_user() RETURNS trigger
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


-- Name: FUNCTION handle_new_user(); Type: COMMENT; Schema: public; Owner: -



-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid()) RETURNS boolean
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


-- Name: FUNCTION is_admin(user_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: is_employee(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.is_employee(user_id uuid DEFAULT auth.uid()) RETURNS boolean
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


-- Name: FUNCTION is_employee(user_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: is_notification_enabled(public.admin_notification_type); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.is_notification_enabled(p_notification_type public.admin_notification_type) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN public.is_notification_enabled(p_notification_type, NULL::UUID, NULL::UUID);
END;
$$;


-- Name: is_notification_enabled(public.admin_notification_type, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.is_notification_enabled(p_notification_type public.admin_notification_type, p_organization_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid) RETURNS boolean
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


-- Name: is_root_user(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.is_root_user(user_id uuid DEFAULT auth.uid()) RETURNS boolean
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


-- Name: FUNCTION is_root_user(user_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.is_super_admin(user_id uuid DEFAULT auth.uid()) RETURNS boolean
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


-- Name: FUNCTION is_super_admin(user_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: log_admin_activity(text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.log_admin_activity(p_action text, p_resource_type text, p_resource_id text DEFAULT NULL::text, p_details jsonb DEFAULT NULL::jsonb) RETURNS uuid
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


-- Name: FUNCTION log_admin_activity(p_action text, p_resource_type text, p_resource_id text, p_details jsonb); Type: COMMENT; Schema: public; Owner: -



-- Name: log_debug(text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.log_debug(message text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RAISE NOTICE '%', message;
END;
$$;


-- Name: log_internal_order_status_change(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.log_internal_order_status_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only log when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.internal_order_status_history (
      internal_order_id,
      status,
      notes,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.status,
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;


-- Name: FUNCTION log_internal_order_status_change(); Type: COMMENT; Schema: public; Owner: -



-- Name: mark_all_notifications_read(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.mark_all_notifications_read() RETURNS void
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


-- Name: FUNCTION mark_all_notifications_read(); Type: COMMENT; Schema: public; Owner: -



-- Name: mark_notification_read(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.mark_notification_read(notification_id uuid) RETURNS void
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


-- Name: FUNCTION mark_notification_read(notification_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: normalize_rut_for_search(text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.normalize_rut_for_search(rut_text text) RETURNS text
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


-- Name: notify_admin_low_stock(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.notify_admin_low_stock() RETURNS trigger
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


-- Name: notify_admin_new_order(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.notify_admin_new_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
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
$_$;


-- Name: optimize_database(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.optimize_database() RETURNS jsonb
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


-- Name: FUNCTION optimize_database(); Type: COMMENT; Schema: public; Owner: -



-- Name: preserve_quote_original_status(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.preserve_quote_original_status() RETURNS trigger
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


-- Name: prevent_default_category_deletion(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.prevent_default_category_deletion() RETURNS trigger
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


-- Name: prevent_system_category_deletion(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.prevent_system_category_deletion() RETURNS trigger
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


-- Name: FUNCTION prevent_system_category_deletion(); Type: COMMENT; Schema: public; Owner: -



-- Name: process_pos_sale(text, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.process_pos_sale(p_payload text, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_payload JSONB;
  v_order_id UUID;
  v_order_number TEXT;
  v_work_order_id UUID;
  v_work_order_number TEXT;
  v_order JSONB;
  v_item JSONB;
  v_payment JSONB;
  v_stock JSONB;
  v_work_order JSONB;
  v_pos_tx JSONB;
  v_branch_id UUID;
  v_pos_session_id UUID;
  v_wo_num TEXT;
  v_product_id UUID;
BEGIN
  v_payload := p_payload::jsonb;

  -- Extract order data
  v_order := (v_payload->>'order')::jsonb;
  v_branch_id := (v_order->>'branch_id')::uuid;
  v_pos_session_id := (v_order->>'pos_session_id')::uuid;

  -- 1. Insert order
  INSERT INTO public.orders (
    order_number,
    email,
    status,
    payment_status,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    currency,
    mp_payment_method,
    branch_id,
    organization_id,
    field_operation_id,
    is_pos_sale,
    pos_session_id,
    pos_cashier_id,
    customer_name,
    billing_first_name,
    billing_last_name,
    sii_rut,
    sii_business_name,
    customer_id,
    agreement_id,
    purchase_order_id,
    copago_amount,
    institutional_amount
  ) VALUES (
    v_order->>'order_number',
    COALESCE(v_order->>'email', 'venta@pos.local'),
    COALESCE(v_order->>'status', 'processing'),
    COALESCE(v_order->>'payment_status', 'paid'),
    (v_order->>'subtotal')::decimal,
    COALESCE((v_order->>'tax_amount')::decimal, 0),
    COALESCE((v_order->>'discount_amount')::decimal, 0),
    (v_order->>'total_amount')::decimal,
    COALESCE(v_order->>'currency', 'CLP'),
    v_order->>'mp_payment_method',
    v_branch_id,
    (v_order->>'organization_id')::uuid,
    (v_order->>'field_operation_id')::uuid,
    true,
    v_pos_session_id,
    p_user_id,
    v_order->>'customer_name',
    v_order->>'billing_first_name',
    v_order->>'billing_last_name',
    v_order->>'sii_rut',
    v_order->>'sii_business_name',
    (v_order->>'customer_id')::uuid,
    (v_order->>'agreement_id')::uuid,
    (v_order->>'purchase_order_id')::uuid,
    (v_order->>'copago_amount')::decimal,
    (v_order->>'institutional_amount')::decimal
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- 2. Insert order_items (product_id NULL for temp IDs: lens-, frame-manual-, treatments-, labor-)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_payload->'order_items')
  LOOP
    BEGIN
      IF v_item->>'product_id' IS NULL OR v_item->>'product_id' = '' THEN
        v_product_id := NULL;
      ELSIF v_item->>'product_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        v_product_id := (v_item->>'product_id')::uuid;
      ELSE
        v_product_id := NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_product_id := NULL;
    END;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      total_price,
      sku
    ) VALUES (
      v_order_id,
      v_product_id,
      COALESCE(v_item->>'product_name', 'Producto'),
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::decimal,
      (v_item->>'total_price')::decimal,
      v_item->>'sku'
    );
  END LOOP;

  -- 3. Insert order_payments
  FOR v_payment IN SELECT * FROM jsonb_array_elements(v_payload->'order_payments')
  LOOP
    INSERT INTO public.order_payments (
      order_id,
      amount,
      payment_method,
      pos_session_id,
      payment_reference,
      created_by,
      notes
    ) VALUES (
      v_order_id,
      (v_payment->>'amount')::decimal,
      v_payment->>'payment_method',
      v_pos_session_id,
      v_payment->>'payment_reference',
      p_user_id,
      v_payment->>'notes'
    );
  END LOOP;

  -- 4. Stock reduction
  FOR v_stock IN SELECT * FROM jsonb_array_elements(COALESCE(v_payload->'stock_reductions', '[]'::jsonb))
  LOOP
    PERFORM update_product_stock(
      (v_stock->>'product_id')::uuid,
      (v_stock->>'branch_id')::uuid,
      -((v_stock->>'quantity')::int),
      false,
      'sale',
      'order',
      v_order_id,
      p_user_id
    );
  END LOOP;

  -- 5. Lab work order (if provided)
  v_work_order := v_payload->'work_order';
  IF v_work_order IS NOT NULL AND v_work_order != 'null'::jsonb THEN
    v_wo_num := generate_work_order_number();
    INSERT INTO public.lab_work_orders (
      work_order_number,
      branch_id,
      field_operation_id,
      operativo_batch_id,
      customer_id,
      prescription_id,
      quote_id,
      frame_product_id,
      frame_name,
      frame_brand,
      frame_model,
      frame_color,
      frame_size,
      frame_sku,
      lens_family_id,
      lens_type,
      lens_material,
      lens_index,
      lens_treatments,
      lens_tint_color,
      lens_tint_percentage,
      presbyopia_solution,
      far_lens_family_id,
      near_lens_family_id,
      far_lens_cost,
      near_lens_cost,
      contact_lens_family_id,
      contact_lens_quantity,
      contact_lens_cost,
      frame_cost,
      lens_cost,
      treatments_cost,
      labor_cost,
      lab_cost,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      currency,
      status,
      payment_status,
      deposit_amount,
      balance_amount,
      pos_order_id,
      agreement_id,
      internal_notes,
      assigned_to,
      created_by
    ) VALUES (
      v_wo_num,
      v_branch_id,
      (v_work_order->>'field_operation_id')::uuid,
      (v_work_order->>'field_operation_id')::uuid,
      (v_work_order->>'customer_id')::uuid,
      (v_work_order->>'prescription_id')::uuid,
      (v_work_order->>'quote_id')::uuid,
      (v_work_order->>'frame_product_id')::uuid,
      COALESCE(v_work_order->>'frame_name', 'Marco'),
      v_work_order->>'frame_brand',
      v_work_order->>'frame_model',
      v_work_order->>'frame_color',
      v_work_order->>'frame_size',
      v_work_order->>'frame_sku',
      (v_work_order->>'lens_family_id')::uuid,
      COALESCE(v_work_order->>'lens_type', 'single_vision'),
      COALESCE(v_work_order->>'lens_material', 'cr39'),
      (v_work_order->>'lens_index')::decimal,
      COALESCE(
        (SELECT array_agg(x::text) FROM jsonb_array_elements_text(COALESCE(v_work_order->'lens_treatments', '[]'::jsonb)) x),
        '{}'
      ),
      v_work_order->>'lens_tint_color',
      (v_work_order->>'lens_tint_percentage')::int,
      COALESCE(v_work_order->>'presbyopia_solution', 'none'),
      (v_work_order->>'far_lens_family_id')::uuid,
      (v_work_order->>'near_lens_family_id')::uuid,
      (v_work_order->>'far_lens_cost')::decimal,
      (v_work_order->>'near_lens_cost')::decimal,
      (v_work_order->>'contact_lens_family_id')::uuid,
      (v_work_order->>'contact_lens_quantity')::int,
      (v_work_order->>'contact_lens_cost')::decimal,
      (v_work_order->>'frame_cost')::decimal,
      (v_work_order->>'lens_cost')::decimal,
      (v_work_order->>'treatments_cost')::decimal,
      (v_work_order->>'labor_cost')::decimal,
      COALESCE((v_work_order->>'lab_cost')::decimal, 0),
      (v_work_order->>'subtotal')::decimal,
      (v_work_order->>'tax_amount')::decimal,
      COALESCE((v_work_order->>'discount_amount')::decimal, 0),
      (v_work_order->>'total_amount')::decimal,
      COALESCE(v_work_order->>'currency', 'CLP'),
      v_work_order->>'status',
      v_work_order->>'payment_status',
      (v_work_order->>'deposit_amount')::decimal,
      (v_work_order->>'balance_amount')::decimal,
      v_order_id,
      (v_work_order->>'agreement_id')::uuid,
      v_work_order->>'internal_notes',
      p_user_id,
      p_user_id
    )
    RETURNING id, work_order_number INTO v_work_order_id, v_work_order_number;
  END IF;

  -- 6. Insert pos_transaction
  v_pos_tx := v_payload->'pos_transaction';
  IF v_pos_tx IS NOT NULL AND v_pos_session_id IS NOT NULL THEN
    INSERT INTO public.pos_transactions (
      order_id,
      pos_session_id,
      transaction_type,
      payment_method,
      amount,
      change_amount,
      notes
    ) VALUES (
      v_order_id,
      v_pos_session_id,
      'sale',
      v_pos_tx->>'payment_method',
      (v_pos_tx->>'amount')::decimal,
      (v_pos_tx->>'change_amount')::decimal,
      v_pos_tx->>'notes'
    );
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'work_order_id', v_work_order_id,
    'work_order_number', v_work_order_number
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$_$;


-- Name: FUNCTION process_pos_sale(p_payload text, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: record_lead_activity(uuid, text, text, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.record_lead_activity(p_lead_id uuid, p_activity_type text, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_created_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_activity_id UUID;
    v_old_score INT;
BEGIN
    -- Get old score
    SELECT lead_score INTO v_old_score FROM demo_requests WHERE id = p_lead_id;
    
    -- Insert activity
    INSERT INTO lead_activities (lead_id, activity_type, description, metadata, created_by)
    VALUES (p_lead_id, p_activity_type, p_description, p_metadata, p_created_by)
    RETURNING id INTO v_activity_id;
    
    -- Update score
    PERFORM update_lead_score_and_priority(p_lead_id);
    
    -- Log the score change
    INSERT INTO lead_scoring_logs (lead_id, activity_type, points_before, points_after, change_reason)
    SELECT 
        p_lead_id, 
        p_activity_type, 
        v_old_score, 
        lead_score, 
        p_description
    FROM demo_requests 
    WHERE id = p_lead_id;
    
    RETURN v_activity_id;
END;
$$;


-- Name: reduce_contact_lens_stock(uuid, uuid, numeric, numeric, integer); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.reduce_contact_lens_stock(p_contact_lens_family_id uuid, p_branch_id uuid, p_sphere numeric, p_cylinder numeric, p_quantity integer DEFAULT 1) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  -- Find matching inventory and reduce
  UPDATE contact_lens_inventory cli
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  WHERE cli.contact_lens_family_id = p_contact_lens_family_id
    AND cli.branch_id = p_branch_id
    AND cli.is_active = TRUE
    AND p_sphere >= cli.sphere_min
    AND p_sphere <= cli.sphere_max
    AND p_cylinder >= cli.cylinder_min
    AND p_cylinder <= cli.cylinder_max
    AND quantity >= p_quantity
  RETURNING id INTO v_updated;
  
  RETURN v_updated;
END;
$$;


-- Name: reset_demo_organization(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.reset_demo_organization() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_branch_2_id UUID := '00000000-0000-0000-0000-000000000003'::uuid;
BEGIN
  -- Delete in order respecting foreign keys (children first)
  DELETE FROM public.optical_internal_support_messages
  WHERE ticket_id IN (SELECT id FROM public.optical_internal_support_tickets WHERE organization_id = demo_org_id);
  DELETE FROM public.optical_internal_support_tickets WHERE organization_id = demo_org_id;

  -- credit_notes: skip if tables don't exist (optional feature)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_notes') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_note_movements') THEN
      DELETE FROM public.credit_note_movements
      WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id IN (demo_branch_id, demo_branch_2_id));
    END IF;
    DELETE FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id IN (demo_branch_id, demo_branch_2_id);
  END IF;

  -- internal_orders: ON DELETE RESTRICT on branches - must delete before branches
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internal_orders') THEN
    DELETE FROM public.internal_order_status_history
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = demo_org_id);
    DELETE FROM public.internal_order_items
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = demo_org_id);
    DELETE FROM public.internal_orders WHERE organization_id = demo_org_id;
  END IF;

  DELETE FROM public.order_payments
  WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id));
  DELETE FROM public.pos_transactions
  WHERE pos_session_id IN (SELECT id FROM public.pos_sessions WHERE branch_id IN (demo_branch_id, demo_branch_2_id));
  DELETE FROM public.order_items
  WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id));
  DELETE FROM public.orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.quotes WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.lab_work_orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.prescriptions
  WHERE customer_id IN (SELECT id FROM public.customers WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id);
  DELETE FROM public.appointments WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id;
  DELETE FROM public.product_branch_stock WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.products WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id;
  DELETE FROM public.lens_price_matrices
  WHERE lens_family_id IN (SELECT id FROM public.lens_families WHERE organization_id = demo_org_id);
  DELETE FROM public.lens_families
  WHERE organization_id = demo_org_id OR id::text LIKE '40000000-%';
  DELETE FROM public.contact_lens_price_matrices WHERE organization_id = demo_org_id;
  DELETE FROM public.contact_lens_families WHERE organization_id = demo_org_id;
  DELETE FROM public.schedule_settings WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.quote_settings WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.pos_settings WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.cash_register_closures WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.pos_sessions WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.organization_settings WHERE organization_id = demo_org_id;
  DELETE FROM public.customers WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id;
  DELETE FROM public.branches WHERE id IN (demo_branch_id, demo_branch_2_id);

  -- Re-seed with Óptica Mirada Clara
  PERFORM public.seed_demo_mirada_clara();
END;
$$;


-- Name: FUNCTION reset_demo_organization(); Type: COMMENT; Schema: public; Owner: -



-- Name: schedule_telemetry_cleanup(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.schedule_telemetry_cleanup() RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    -- This function can be called by a cron job or scheduled task
    -- Example: SELECT schedule_telemetry_cleanup();
    
    PERFORM cleanup_old_telemetry_data();
    
    RAISE NOTICE 'Telemetry cleanup completed at %', NOW();
END;
$$;


-- Name: search_customers_by_rut(text, uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.search_customers_by_rut(rut_search_term text, p_branch_id uuid DEFAULT NULL::uuid, p_branch_ids uuid[] DEFAULT NULL::uuid[]) RETURNS TABLE(id uuid, first_name text, last_name text, email text, phone text, rut text)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.rut
  FROM public.customers c
  WHERE normalize_rut_for_search(c.rut) LIKE '%' || normalize_rut_for_search(rut_search_term) || '%'
    AND (
      p_branch_id IS NULL AND p_branch_ids IS NULL
      OR (p_branch_id IS NOT NULL AND c.branch_id = p_branch_id)
      OR (p_branch_ids IS NOT NULL AND c.branch_id = ANY(p_branch_ids))
    )
  ORDER BY c.first_name, c.last_name
  LIMIT 20;
END;
$$;


-- Name: FUNCTION search_customers_by_rut(rut_search_term text, p_branch_id uuid, p_branch_ids uuid[]); Type: COMMENT; Schema: public; Owner: -



-- Name: search_embeddings(public.vector, double precision, integer, text[], uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.search_embeddings(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10, filter_source_types text[] DEFAULT NULL::text[], filter_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, source_type text, source_id uuid, content text, similarity double precision, metadata jsonb, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.source_type,
    e.source_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity,
    e.metadata,
    e.created_at
  FROM public.embeddings e
  WHERE 
    e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
    AND (filter_source_types IS NULL OR e.source_type = ANY(filter_source_types))
    AND (filter_user_id IS NULL OR e.user_id = filter_user_id OR e.user_id IS NULL)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- Name: FUNCTION search_embeddings(query_embedding public.vector, match_threshold double precision, match_count integer, filter_source_types text[], filter_user_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: search_embeddings_small(public.vector, double precision, integer, text[], uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.search_embeddings_small(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10, filter_source_types text[] DEFAULT NULL::text[], filter_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, source_type text, source_id uuid, content text, similarity double precision, metadata jsonb, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.source_type,
    e.source_id,
    e.content,
    1 - (e.embedding_small <=> query_embedding) as similarity,
    e.metadata,
    e.created_at
  FROM public.embeddings e
  WHERE 
    e.embedding_small IS NOT NULL
    AND 1 - (e.embedding_small <=> query_embedding) > match_threshold
    AND (filter_source_types IS NULL OR e.source_type = ANY(filter_source_types))
    AND (filter_user_id IS NULL OR e.user_id = filter_user_id OR e.user_id IS NULL)
  ORDER BY e.embedding_small <=> query_embedding
  LIMIT match_count;
END;
$$;


-- Name: FUNCTION search_embeddings_small(query_embedding public.vector, match_threshold double precision, match_count integer, filter_source_types text[], filter_user_id uuid); Type: COMMENT; Schema: public; Owner: -



-- Name: search_frames_by_measurements(integer, integer, integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.search_frames_by_measurements(min_lens_width integer DEFAULT NULL::integer, max_lens_width integer DEFAULT NULL::integer, min_bridge_width integer DEFAULT NULL::integer, max_bridge_width integer DEFAULT NULL::integer, min_temple_length integer DEFAULT NULL::integer, max_temple_length integer DEFAULT NULL::integer) RETURNS TABLE(id uuid, name text, frame_measurements jsonb)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.frame_measurements
  FROM public.products p
  WHERE p.product_type = 'frame'
    AND p.frame_measurements IS NOT NULL
    AND (min_lens_width IS NULL OR (p.frame_measurements->>'lens_width')::INTEGER >= min_lens_width)
    AND (max_lens_width IS NULL OR (p.frame_measurements->>'lens_width')::INTEGER <= max_lens_width)
    AND (min_bridge_width IS NULL OR (p.frame_measurements->>'bridge_width')::INTEGER >= min_bridge_width)
    AND (max_bridge_width IS NULL OR (p.frame_measurements->>'bridge_width')::INTEGER <= max_bridge_width)
    AND (min_temple_length IS NULL OR (p.frame_measurements->>'temple_length')::INTEGER >= min_temple_length)
    AND (max_temple_length IS NULL OR (p.frame_measurements->>'temple_length')::INTEGER <= max_temple_length);
END;
$$;


-- Name: search_memory_facts(public.vector, uuid, double precision, integer, integer); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.search_memory_facts(query_embedding public.vector, target_user_id uuid, match_threshold double precision DEFAULT 0.6, match_count integer DEFAULT 5, min_importance integer DEFAULT 1) RETURNS TABLE(id uuid, fact_type text, category text, content text, importance integer, similarity double precision, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.fact_type,
    m.category,
    m.content,
    m.importance,
    1 - (m.embedding <=> query_embedding) as similarity,
    m.created_at
  FROM public.memory_facts m
  WHERE 
    m.user_id = target_user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
    AND m.importance >= min_importance
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
  ORDER BY 
    m.importance DESC,
    m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- Name: FUNCTION search_memory_facts(query_embedding public.vector, target_user_id uuid, match_threshold double precision, match_count integer, min_importance integer); Type: COMMENT; Schema: public; Owner: -



-- Name: seed_demo_mirada_clara(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.seed_demo_mirada_clara() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_branch_2_id UUID := '00000000-0000-0000-0000-000000000003'::uuid;
  demo_branch_1_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  marcos_cat_id UUID;
  lentes_sol_cat_id UUID;
  lentes_contacto_cat_id UUID;
  accesorios_cat_id UUID;
  servicios_cat_id UUID;
  demo_admin_user_id UUID;
  frame_product_id UUID;
  lens_family_id UUID;
  cust_rec RECORD;
  rx_rec RECORD;
  ord_rec RECORD;
  prod_rec RECORD;
  sess_rec RECORD;
  i INTEGER;
  d INTEGER;
  ord_num INTEGER;
  quote_num INTEGER;
  wo_num INTEGER;
  ticket_num INTEGER;
  appt_date DATE;
  ord_date DATE;
  status_idx INTEGER;
  status_list TEXT[] := ARRAY['ordered', 'sent_to_lab', 'in_progress_lab', 'ready_at_lab', 'received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered'];
  days_back INTEGER;
  days_back_2 INTEGER := 60;
  total_amt INTEGER;
  base_sales INTEGER;
  is_demo_admin BOOLEAN := false;
BEGIN
  PERFORM set_config('statement_timeout', '180000', true);
  days_back := 120;

  SELECT id INTO demo_admin_user_id FROM public.admin_users WHERE organization_id = demo_org_id LIMIT 1;
  IF demo_admin_user_id IS NOT NULL THEN
    is_demo_admin := true;
  ELSE
    SELECT id INTO demo_admin_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  -- ===== ORGANIZATION =====
  INSERT INTO public.organizations (id, name, slug, subscription_tier, status, metadata, created_at)
  VALUES (demo_org_id, 'Óptica Mirada Clara', 'optica-mirada-clara', 'premium', 'active', '{"is_demo": true, "description": "Demo óptica chilena con 6 meses de operación progresiva"}'::jsonb, NOW() - INTERVAL '6 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, metadata = EXCLUDED.metadata;

  -- ===== BRANCH 1 =====
  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES (demo_branch_id, 'Casa Matriz', 'MCL-001', demo_org_id, 'Av. Providencia 1234', 'Santiago', 'Región Metropolitana', '7500000', 'Chile', '+56 2 2345 6789', 'casa@miradaclara.cl', true, NOW() - INTERVAL '6 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, email = EXCLUDED.email;

  -- ===== BRANCH 2 =====
  INSERT INTO public.branches (id, name, code, organization_id, address_line_1, city, state, postal_code, country, phone, email, is_active, created_at)
  VALUES (demo_branch_2_id, 'Sucursal Providencia', 'MCL-002', demo_org_id, 'Av. Apoquindo 4567', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', '+56 2 2345 6790', 'providencia@miradaclara.cl', true, NOW() - INTERVAL '2 months')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, email = EXCLUDED.email;

  -- ===== ADMIN_BRANCH_ACCESS =====
  IF demo_admin_user_id IS NOT NULL THEN
    INSERT INTO public.admin_branch_access (admin_user_id, branch_id, role, is_primary)
    VALUES (demo_admin_user_id, demo_branch_id, 'manager', true)
    ON CONFLICT (admin_user_id, branch_id) DO UPDATE SET role = EXCLUDED.role, is_primary = EXCLUDED.is_primary;
    INSERT INTO public.admin_branch_access (admin_user_id, branch_id, role, is_primary)
    VALUES (demo_admin_user_id, demo_branch_2_id, 'manager', false)
    ON CONFLICT (admin_user_id, branch_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  -- ===== CATEGORIES =====
  SELECT id INTO marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO lentes_contacto_cat_id FROM public.categories WHERE slug = 'lentes-contacto' LIMIT 1;
  SELECT id INTO accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;

  IF marcos_cat_id IS NULL OR lentes_sol_cat_id IS NULL OR accesorios_cat_id IS NULL OR servicios_cat_id IS NULL THEN
    RAISE NOTICE 'Categories not found. Skipping products.';
  ELSE
    -- LENS FAMILIES
    INSERT INTO public.lens_families (id, name, brand, lens_type, lens_material, description, is_active, organization_id, created_at)
    VALUES
    ('40000000-0000-0000-0000-000000000001'::uuid, 'Monofocal Básico CR-39 AR', 'Genérico', 'single_vision', 'cr39', 'Lente monofocal estándar con antirreflejo.', true, demo_org_id, NOW()),
    ('40000000-0000-0000-0000-000000000002'::uuid, 'Monofocal Policarbonato Blue Cut', 'Essilor', 'single_vision', 'polycarbonate', 'Monofocal resistente con filtro de luz azul.', true, demo_org_id, NOW()),
    ('40000000-0000-0000-0000-000000000010'::uuid, 'Progresivo Comfort Policarbonato', 'Essilor', 'progressive', 'polycarbonate', 'Progresivo Varilux Comfort.', true, demo_org_id, NOW())
    ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    SELECT lf.id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 29990, 9990, 'stock', true FROM public.lens_families lf WHERE lf.id = '40000000-0000-0000-0000-000000000001'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.lens_price_matrices lpm WHERE lpm.lens_family_id = '40000000-0000-0000-0000-000000000001'::uuid LIMIT 1);
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    SELECT lf.id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 59990, 24990, 'stock', true FROM public.lens_families lf WHERE lf.id = '40000000-0000-0000-0000-000000000002'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.lens_price_matrices lpm WHERE lpm.lens_family_id = '40000000-0000-0000-0000-000000000002'::uuid LIMIT 1);
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    SELECT lf.id, -4.00, 4.00, -2.00, 2.00, 0.75, 1.75, 189990, 79990, 'surfaced', true FROM public.lens_families lf WHERE lf.id = '40000000-0000-0000-0000-000000000010'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.lens_price_matrices lpm WHERE lpm.lens_family_id = '40000000-0000-0000-0000-000000000010'::uuid LIMIT 1);

    -- CONTACT LENS FAMILIES
    INSERT INTO public.contact_lens_families (id, organization_id, name, brand, use_type, modality, material, packaging, base_curve, diameter, description, is_active, category_id, created_at)
    VALUES
    ('70000000-0000-0000-0000-000000000001'::uuid, demo_org_id, 'Acuvue Oasys 1-Day', 'Johnson & Johnson', 'daily', 'spherical', 'silicone_hydrogel', 'box_30', 8.50, 14.30, 'Lentes diarios hidrogel silicona. Confort y oxigenación.', true, lentes_contacto_cat_id, NOW()),
    ('70000000-0000-0000-0000-000000000002'::uuid, demo_org_id, 'Air Optix Plus HydraGlyde for Astigmatism', 'Alcon', 'monthly', 'toric', 'silicone_hydrogel', 'box_6', 8.70, 14.50, 'Lentes mensuales para astigmatismo. Hidratación prolongada.', true, lentes_contacto_cat_id, NOW())
    ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, name = EXCLUDED.name, brand = EXCLUDED.brand, category_id = EXCLUDED.category_id;
    INSERT INTO public.contact_lens_price_matrices (contact_lens_family_id, organization_id, sphere_min, sphere_max, cylinder_min, cylinder_max, axis_min, axis_max, addition_min, addition_max, base_price, cost, is_active)
    SELECT id, demo_org_id, -6.00, -0.50, 0.00, 0.00, 0, 0, 0.00, 0.00, 29990, 14990, true FROM public.contact_lens_families WHERE id = '70000000-0000-0000-0000-000000000001'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.contact_lens_price_matrices WHERE contact_lens_family_id = '70000000-0000-0000-0000-000000000001'::uuid AND sphere_min = -6.00 LIMIT 1);
    INSERT INTO public.contact_lens_price_matrices (contact_lens_family_id, organization_id, sphere_min, sphere_max, cylinder_min, cylinder_max, axis_min, axis_max, addition_min, addition_max, base_price, cost, is_active)
    SELECT id, demo_org_id, -6.00, -0.50, -1.75, -0.75, 10, 180, 0.00, 0.00, 39990, 19990, true FROM public.contact_lens_families WHERE id = '70000000-0000-0000-0000-000000000002'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.contact_lens_price_matrices WHERE contact_lens_family_id = '70000000-0000-0000-0000-000000000002'::uuid AND sphere_min = -6.00 LIMIT 1);

    -- PRODUCTS
    INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, is_featured, price_includes_tax, featured_image, created_at)
    VALUES
    ('20000000-0000-0000-0000-000000000001'::uuid, demo_branch_id, demo_org_id, 'Marco Ray-Ban RB2140', 'marco-ray-ban-rb2140-mcl', 'Marco clásico aviador Ray-Ban.', 89900, 45000, marcos_cat_id, 'RB-2140-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000002'::uuid, demo_branch_id, demo_org_id, 'Marco Oakley OO9208', 'marco-oakley-oo9208-mcl', 'Marco deportivo Oakley.', 129900, 65000, marcos_cat_id, 'OO-9208-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000003'::uuid, demo_branch_id, demo_org_id, 'Marco Gucci GG0061', 'marco-gucci-gg0061-mcl', 'Marco de lujo Gucci.', 249900, 125000, marcos_cat_id, 'GG-0061-BRN', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000004'::uuid, demo_branch_id, demo_org_id, 'Marco Vogue VG-2001', 'marco-vogue-vg2001-mcl', 'Marco clásico Vogue.', 69900, 35000, marcos_cat_id, 'VG-2001-BLK', 'active', false, true, 'https://images.unsplash.com/1511499767150?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000005'::uuid, demo_branch_id, demo_org_id, 'Marco Titanium Slim', 'marco-titanium-slim-mcl', 'Marco ultrafino titanio.', 159900, 80000, marcos_cat_id, 'TI-SLIM-SLV', 'active', true, true, 'https://images.unsplash.com/1572635196237?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000011'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Ray-Ban Aviator', 'gafas-sol-ray-ban-aviator-mcl', 'Gafas de sol Ray-Ban Aviator.', 119900, 60000, lentes_sol_cat_id, 'RB-AVI-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000012'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Oakley Holbrook', 'gafas-sol-oakley-holbrook-mcl', 'Gafas Oakley polarizadas.', 149900, 75000, lentes_sol_cat_id, 'OO-HOL-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000013'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Polarizadas Sport', 'gafas-sol-polarizadas-sport-mcl', 'Gafas deportivas polarizadas.', 89900, 45000, lentes_sol_cat_id, 'SOL-SPORT-POL', 'active', true, true, 'https://images.unsplash.com/1511499767150?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000016'::uuid, demo_branch_id, demo_org_id, 'Estuche Rígido Premium', 'estuche-rigido-premium-mcl', 'Estuche rígido para lentes.', 12900, 5000, accesorios_cat_id, 'ACC-EST-RIG', 'active', true, true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000017'::uuid, demo_branch_id, demo_org_id, 'Paño de Limpieza Microfibra', 'pano-limpieza-microfibra-mcl', 'Paño microfibra para lentes.', 4900, 2000, accesorios_cat_id, 'ACC-PANO-MIC', 'active', true, true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000018'::uuid, demo_branch_id, demo_org_id, 'Líquido Limpiador 120ml', 'liquido-limpiador-120ml-mcl', 'Líquido limpiador para lentes.', 7900, 3000, accesorios_cat_id, 'ACC-LIQ-120', 'active', true, true, NULL, NOW()),
    ('20000000-0000-0000-0000-000000000021'::uuid, demo_branch_id, demo_org_id, 'Reparación de Marco', 'reparacion-marco-mcl', 'Servicio de reparación de marco.', 19900, 0, servicios_cat_id, 'SERV-REP-MAR', 'active', true, true, NULL, NOW()),
    ('20000000-0000-0000-0000-000000000022'::uuid, demo_branch_id, demo_org_id, 'Montaje de Lentes', 'montaje-lentes-mcl', 'Servicio de montaje de lentes.', 29900, 0, servicios_cat_id, 'SERV-MON-LEN', 'active', true, true, NULL, NOW()),
    ('20000000-0000-0000-0000-000000000024'::uuid, demo_branch_id, demo_org_id, 'Examen de la Vista', 'examen-vista-mcl', 'Examen completo con optometrista.', 25000, 0, servicios_cat_id, 'SERV-EXA-VIS', 'active', true, true, NULL, NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
    SELECT p.id, demo_branch_id, CASE WHEN p.category_id = marcos_cat_id THEN 15 + (random()*10)::int WHEN p.category_id = lentes_sol_cat_id THEN 20 + (random()*15)::int ELSE 30 END, 5, NOW()
    FROM public.products p WHERE p.organization_id = demo_org_id
    ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
    INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
    SELECT p.id, demo_branch_2_id, CASE WHEN p.category_id = marcos_cat_id THEN 10 + (random()*8)::int WHEN p.category_id = lentes_sol_cat_id THEN 15 + (random()*10)::int ELSE 25 END, 5, NOW()
    FROM public.products p WHERE p.organization_id = demo_org_id
    ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
  END IF;

  -- ===== CUSTOMERS branch 1 =====
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, demo_branch_id, demo_org_id, 'María', 'González', 'maria.gonzalez@email.com', '+56 9 1234 5678', '12.345.678-9', '1985-03-15', 'female', 'Av. Las Condes 456', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-01-15', '2026-01-15', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '5 months', NOW()),
  ('10000000-0000-0000-0000-000000000002'::uuid, demo_branch_id, demo_org_id, 'Juan', 'Pérez', 'juan.perez@email.com', '+56 9 2345 6789', '13.456.789-0', '1990-07-22', 'male', 'Calle Los Rosales 789', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-10', '2026-01-10', 'phone', 'Fonasa', true, NOW() - INTERVAL '5 months', NOW()),
  ('10000000-0000-0000-0000-000000000003'::uuid, demo_branch_id, demo_org_id, 'Ana', 'Martínez', 'ana.martinez@email.com', '+56 9 3456 7890', '14.567.890-1', '1988-11-08', 'female', 'Pasaje Los Aromos 321', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Hipermetropía', 'Presbicia'], ARRAY[]::TEXT[], '2024-12-20', '2025-12-20', 'whatsapp', 'Isapre Colmena', true, NOW() - INTERVAL '4 months', NOW()),
  ('10000000-0000-0000-0000-000000000004'::uuid, demo_branch_id, demo_org_id, 'Carlos', 'Rodríguez', 'carlos.rodriguez@email.com', '+56 9 4567 8901', '15.678.901-2', '1975-05-30', 'male', 'Av. Vitacura 1234', 'Vitacura', 'Región Metropolitana', '7630000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2025-01-05', '2026-01-05', 'email', 'Isapre Banmédica', true, NOW() - INTERVAL '4 months', NOW()),
  ('10000000-0000-0000-0000-000000000005'::uuid, demo_branch_id, demo_org_id, 'Laura', 'Sánchez', 'laura.sanchez@email.com', '+56 9 5678 9012', '16.789.012-3', '1992-09-14', 'female', 'Calle Los Claveles 567', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Miopía', 'Astigmatismo'], ARRAY[]::TEXT[], '2024-11-28', '2025-11-28', 'sms', 'Fonasa', true, NOW() - INTERVAL '3 months', NOW()),
  ('10000000-0000-0000-0000-000000000006'::uuid, demo_branch_id, demo_org_id, 'Roberto', 'López', 'roberto.lopez@email.com', '+56 9 6789 0123', '17.890.123-4', '1983-02-18', 'male', 'Av. Apoquindo 2345', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-10-15', '2025-10-15', 'phone', 'Isapre Consalud', true, NOW() - INTERVAL '3 months', NOW()),
  ('10000000-0000-0000-0000-000000000007'::uuid, demo_branch_id, demo_org_id, 'Carmen', 'Fernández', 'carmen.fernandez@email.com', '+56 9 7890 1234', '18.901.234-5', '1978-12-25', 'female', 'Calle Los Olivos 890', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-09-20', '2025-09-20', 'email', 'Fonasa', true, NOW() - INTERVAL '2 months', NOW()),
  ('10000000-0000-0000-0000-000000000008'::uuid, demo_branch_id, demo_org_id, 'Diego', 'Torres', 'diego.torres@email.com', '+56 9 8901 2345', '19.012.345-6', '1995-04-07', 'male', 'Pasaje Los Jazmines 456', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-08-10', '2025-08-10', 'whatsapp', 'Isapre Colmena', true, NOW() - INTERVAL '2 months', NOW()),
  ('10000000-0000-0000-0000-000000000009'::uuid, demo_branch_id, demo_org_id, 'Patricia', 'Morales', 'patricia.morales@email.com', '+56 9 9012 3456', '20.123.456-7', '1987-08-19', 'female', 'Av. Nueva Providencia 3456', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2024-07-05', '2025-07-05', 'email', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000010'::uuid, demo_branch_id, demo_org_id, 'Fernando', 'Ramírez', 'fernando.ramirez@email.com', '+56 9 0123 4567', '21.234.567-8', '1981-01-31', 'male', 'Calle Los Laureles 678', 'La Reina', 'Región Metropolitana', '7850000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2024-06-18', '2025-06-18', 'phone', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW())
  ON CONFLICT (id) DO UPDATE SET branch_id = EXCLUDED.branch_id, organization_id = EXCLUDED.organization_id, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, phone = EXCLUDED.phone, rut = EXCLUDED.rut, date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, country = EXCLUDED.country, medical_conditions = EXCLUDED.medical_conditions, allergies = EXCLUDED.allergies, last_eye_exam_date = EXCLUDED.last_eye_exam_date, next_eye_exam_due = EXCLUDED.next_eye_exam_due, preferred_contact_method = EXCLUDED.preferred_contact_method, insurance_provider = EXCLUDED.insurance_provider, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at;

  -- Casa Matriz customers 11-22: real Chilean names
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
  ('10000000-0000-0000-0000-000000000011'::uuid, demo_branch_id, demo_org_id, 'Isabel', 'Fuentes', 'isabel.fuentes@email.com', '+56 9 1111 1112', '22.345.678-9', '1990-04-12', 'female', 'Av. Irarrázaval 1100', 'Ñuñoa', 'Región Metropolitana', '7750000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-05-10', '2025-05-10', 'email', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000012'::uuid, demo_branch_id, demo_org_id, 'Ricardo', 'Bustamante', 'ricardo.bustamante@email.com', '+56 9 1111 1113', '22.345.678-0', '1986-08-25', 'male', 'Calle Condell 1200', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-04-18', '2025-04-18', 'whatsapp', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000013'::uuid, demo_branch_id, demo_org_id, 'Sofía', 'Cortés', 'sofia.cortes@email.com', '+56 9 1111 1114', '22.345.678-1', '1994-01-08', 'female', 'Av. Pedro de Valdivia 1300', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2024-03-22', '2025-03-22', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000014'::uuid, demo_branch_id, demo_org_id, 'Alejandro', 'Núñez', 'alejandro.nunez@email.com', '+56 9 1111 1115', '22.345.678-2', '1982-11-30', 'male', 'Calle Los Leones 1400', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2024-02-14', '2025-02-14', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000015'::uuid, demo_branch_id, demo_org_id, 'Carolina', 'Pino', 'carolina.pino@email.com', '+56 9 1111 1116', '22.345.678-3', '1996-06-17', 'female', 'Av. Providencia 1500', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-01-08', '2025-01-08', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000016'::uuid, demo_branch_id, demo_org_id, 'Luis', 'Miranda', 'luis.miranda@email.com', '+56 9 1111 1117', '22.345.678-4', '1989-03-05', 'male', 'Calle Orrego Luco 1600', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2023-12-20', '2024-12-20', 'whatsapp', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000017'::uuid, demo_branch_id, demo_org_id, 'Paula', 'Salinas', 'paula.salinas@email.com', '+56 9 1111 1118', '22.345.678-5', '1991-09-22', 'female', 'Av. Tobalaba 1700', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2023-11-15', '2024-11-15', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000018'::uuid, demo_branch_id, demo_org_id, 'Miguel', 'Aravena', 'miguel.aravena@email.com', '+56 9 1111 1119', '22.345.678-6', '1984-07-11', 'male', 'Calle El Bosque 1800', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2023-10-08', '2024-10-08', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000019'::uuid, demo_branch_id, demo_org_id, 'Catalina', 'Barrera', 'catalina.barrera@email.com', '+56 9 1111 1120', '22.345.678-7', '1993-02-28', 'female', 'Av. Apoquindo 1900', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2023-09-01', '2024-09-01', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000020'::uuid, demo_branch_id, demo_org_id, 'Francisco', 'Cáceres', 'francisco.caceres@email.com', '+56 9 1111 1121', '22.345.678-8', '1980-12-14', 'male', 'Calle Alonso de Córdova 2000', 'Vitacura', 'Región Metropolitana', '7630000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2023-08-20', '2024-08-20', 'whatsapp', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000021'::uuid, demo_branch_id, demo_org_id, 'María José', 'Orellana', 'mariajose.orellana@email.com', '+56 9 1111 1122', '22.345.678-9', '1997-05-03', 'female', 'Av. Kennedy 2100', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2023-07-12', '2024-07-12', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('10000000-0000-0000-0000-000000000022'::uuid, demo_branch_id, demo_org_id, 'Tomás', 'Gallardo', 'tomas.gallardo@email.com', '+56 9 1111 1123', '22.345.679-0', '1987-10-19', 'male', 'Calle Isidora Goyenechea 2200', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2023-06-05', '2024-06-05', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW())
  ON CONFLICT (id) DO UPDATE SET branch_id = EXCLUDED.branch_id, organization_id = EXCLUDED.organization_id, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, phone = EXCLUDED.phone, rut = EXCLUDED.rut, date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, country = EXCLUDED.country, medical_conditions = EXCLUDED.medical_conditions, allergies = EXCLUDED.allergies, last_eye_exam_date = EXCLUDED.last_eye_exam_date, next_eye_exam_due = EXCLUDED.next_eye_exam_due, preferred_contact_method = EXCLUDED.preferred_contact_method, insurance_provider = EXCLUDED.insurance_provider, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at;

  -- ===== CUSTOMERS branch 2 (Providencia) - explicit names 1-5 + real names 6-18 =====
  INSERT INTO public.customers (id, branch_id, organization_id, first_name, last_name, email, phone, rut, date_of_birth, gender, address_line_1, city, state, postal_code, country, medical_conditions, allergies, last_eye_exam_date, next_eye_exam_due, preferred_contact_method, insurance_provider, is_active, created_at, updated_at)
  VALUES
  ('11000000-0000-0000-0000-000000000001'::uuid, demo_branch_2_id, demo_org_id, 'Elena', 'Vega', 'elena.vega@providencia.cl', '+56 9 1111 1111', '11.111.111-1', '1982-04-20', 'female', 'Av. Apoquindo 100', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2025-02-01', '2026-02-01', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '2 months', NOW()),
  ('11000000-0000-0000-0000-000000000002'::uuid, demo_branch_2_id, demo_org_id, 'Roberto', 'Molina', 'roberto.molina@providencia.cl', '+56 9 2222 2222', '11.222.222-2', '1978-09-15', 'male', 'Calle San Damián 200', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-11-10', '2025-11-10', 'whatsapp', 'Fonasa', true, NOW() - INTERVAL '2 months', NOW()),
  ('11000000-0000-0000-0000-000000000003'::uuid, demo_branch_2_id, demo_org_id, 'Claudia', 'Soto', 'claudia.soto@providencia.cl', '+56 9 3333 3333', '11.333.333-3', '1991-12-03', 'female', 'Av. Las Condes 300', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2025-01-20', '2026-01-20', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000004'::uuid, demo_branch_2_id, demo_org_id, 'Pablo', 'Contreras', 'pablo.contreras@providencia.cl', '+56 9 4444 4444', '11.444.444-4', '1985-06-28', 'male', 'Pasaje Los Dominicos 400', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2024-10-05', '2025-10-05', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000005'::uuid, demo_branch_2_id, demo_org_id, 'Francisca', 'Lagos', 'francisca.lagos@providencia.cl', '+56 9 5555 5555', '11.555.555-5', '1994-03-12', 'female', 'Av. Kennedy 500', 'Las Condes', 'Región Metropolitana', '7550000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-09-15', '2025-09-15', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000006'::uuid, demo_branch_2_id, demo_org_id, 'Valentina', 'Rojas', 'valentina.rojas@providencia.cl', '+56 9 6666 6666', '11.666.666-6', '1993-05-18', 'female', 'Av. Providencia 600', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-08-20', '2025-08-20', 'email', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000007'::uuid, demo_branch_2_id, demo_org_id, 'Sebastián', 'Silva', 'sebastian.silva@providencia.cl', '+56 9 6666 6667', '11.666.666-7', '1989-11-03', 'male', 'Av. Providencia 700', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2024-07-15', '2025-07-15', 'whatsapp', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000008'::uuid, demo_branch_2_id, demo_org_id, 'Macarena', 'Díaz', 'macarena.diaz@providencia.cl', '+56 9 6666 6668', '11.666.666-8', '1996-02-28', 'female', 'Av. Providencia 800', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2024-06-10', '2025-06-10', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000009'::uuid, demo_branch_2_id, demo_org_id, 'Martín', 'Castro', 'martin.castro@providencia.cl', '+56 9 6666 6669', '11.666.666-9', '1984-09-14', 'male', 'Av. Providencia 900', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-05-22', '2025-05-22', 'email', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000010'::uuid, demo_branch_2_id, demo_org_id, 'Daniela', 'Muñoz', 'daniela.munoz@providencia.cl', '+56 9 6666 6670', '11.666.667-0', '1991-12-07', 'female', 'Av. Providencia 1000', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía', 'Astigmatismo'], ARRAY[]::TEXT[], '2024-04-18', '2025-04-18', 'whatsapp', 'Isapre Colmena', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000011'::uuid, demo_branch_2_id, demo_org_id, 'Nicolás', 'Herrera', 'nicolas.herrera@providencia.cl', '+56 9 6666 6671', '11.666.667-1', '1987-03-25', 'male', 'Av. Providencia 1100', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Hipermetropía'], ARRAY[]::TEXT[], '2024-03-30', '2025-03-30', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000012'::uuid, demo_branch_2_id, demo_org_id, 'Camila', 'Navarro', 'camila.navarro@providencia.cl', '+56 9 6666 6672', '11.666.667-2', '1994-07-11', 'female', 'Av. Providencia 1200', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2024-02-14', '2025-02-14', 'email', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000013'::uuid, demo_branch_2_id, demo_org_id, 'Andrés', 'Sepúlveda', 'andres.sepulveda@providencia.cl', '+56 9 6666 6673', '11.666.667-3', '1982-01-19', 'male', 'Av. Providencia 1300', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Presbicia'], ARRAY[]::TEXT[], '2024-01-08', '2025-01-08', 'phone', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000014'::uuid, demo_branch_2_id, demo_org_id, 'Javiera', 'Vargas', 'javiera.vargas@providencia.cl', '+56 9 6666 6674', '11.666.667-4', '1998-10-30', 'female', 'Av. Providencia 1400', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Astigmatismo'], ARRAY[]::TEXT[], '2023-12-05', '2024-12-05', 'whatsapp', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000015'::uuid, demo_branch_2_id, demo_org_id, 'Gonzalo', 'Figueroa', 'gonzalo.figueroa@providencia.cl', '+56 9 6666 6675', '11.666.667-5', '1980-06-22', 'male', 'Av. Providencia 1500', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía', 'Presbicia'], ARRAY[]::TEXT[], '2023-11-20', '2024-11-20', 'email', 'Isapre Colmena', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000016'::uuid, demo_branch_2_id, demo_org_id, 'Antonia', 'Espinoza', 'antonia.espinoza@providencia.cl', '+56 9 6666 6676', '11.666.667-6', '1995-04-09', 'female', 'Av. Providencia 1600', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY[]::TEXT[], ARRAY[]::TEXT[], '2023-10-12', '2024-10-12', 'sms', 'Fonasa', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000017'::uuid, demo_branch_2_id, demo_org_id, 'Felipe', 'Reyes', 'felipe.reyes@providencia.cl', '+56 9 6666 6677', '11.666.667-7', '1992-08-16', 'male', 'Av. Providencia 1700', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Miopía'], ARRAY[]::TEXT[], '2023-09-28', '2024-09-28', 'whatsapp', 'Isapre Consalud', true, NOW() - INTERVAL '1 month', NOW()),
  ('11000000-0000-0000-0000-000000000018'::uuid, demo_branch_2_id, demo_org_id, 'Constanza', 'Araya', 'constanza.araya@providencia.cl', '+56 9 6666 6678', '11.666.667-8', '1986-12-01', 'female', 'Av. Providencia 1800', 'Providencia', 'Región Metropolitana', '7500000', 'Chile', ARRAY['Hipermetropía', 'Presbicia'], ARRAY[]::TEXT[], '2023-08-15', '2024-08-15', 'email', 'Isapre Banmédica', true, NOW() - INTERVAL '1 month', NOW())
  ON CONFLICT (id) DO UPDATE SET branch_id = EXCLUDED.branch_id, organization_id = EXCLUDED.organization_id, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, phone = EXCLUDED.phone, rut = EXCLUDED.rut, date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender, address_line_1 = EXCLUDED.address_line_1, city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, country = EXCLUDED.country, medical_conditions = EXCLUDED.medical_conditions, allergies = EXCLUDED.allergies, last_eye_exam_date = EXCLUDED.last_eye_exam_date, next_eye_exam_due = EXCLUDED.next_eye_exam_due, preferred_contact_method = EXCLUDED.preferred_contact_method, insurance_provider = EXCLUDED.insurance_provider, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at;

  -- ===== PRESCRIPTIONS =====
  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-MCL1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::TEXT, 3, '0'), 'Dr. Carlos Méndez', 'OPTO-12345', -1.5 - (random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), -1.5-(random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.branch_id = demo_branch_id
  AND NOT EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id LIMIT 1)
  LIMIT 22;
  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-MCL2-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::TEXT, 3, '0'), 'Dr. Carlos Méndez', 'OPTO-20000', -1.5 - (random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), -1.5-(random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.branch_id = demo_branch_2_id
  AND NOT EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id LIMIT 1)
  LIMIT 18;

  -- ===== SCHEDULE, QUOTE, POS SETTINGS =====
  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES (demo_branch_id, demo_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"09:00","end_time":"13:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW())
  ON CONFLICT (branch_id) WHERE branch_id IS NOT NULL DO UPDATE SET slot_duration_minutes = EXCLUDED.slot_duration_minutes;
  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES (demo_branch_2_id, demo_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"10:00","end_time":"14:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW())
  ON CONFLICT (branch_id) WHERE branch_id IS NOT NULL DO UPDATE SET slot_duration_minutes = EXCLUDED.slot_duration_minutes;
  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  SELECT demo_branch_id, demo_org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.quote_settings WHERE branch_id = demo_branch_id);
  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  SELECT demo_branch_2_id, demo_org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.quote_settings WHERE branch_id = demo_branch_2_id);
  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (demo_branch_id, 50.00, NOW(), NOW()), (demo_branch_2_id, 50.00, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET min_deposit_percent = EXCLUDED.min_deposit_percent;

  -- ===== APPOINTMENTS =====
  FOR i IN 1..90 LOOP
    appt_date := (CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day')::date;
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_id, demo_org_id, appt_date, ((9 + (i % 7)) || ':00:00')::time, (ARRAY['eye_exam', 'consultation', 'fitting', 'delivery', 'follow_up'])[1 + (i % 5)], CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, NULL, NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_id ORDER BY random() LIMIT 1;
    END IF;
  END LOOP;
  FOR i IN 1..50 LOOP
    appt_date := (CURRENT_DATE - (random() * days_back_2)::INT * INTERVAL '1 day')::date;
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_2_id, demo_org_id, appt_date, ((10 + (i % 6)) || ':00:00')::time, (ARRAY['eye_exam', 'consultation', 'fitting', 'delivery', 'follow_up'])[1 + (i % 5)], CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, 'Sucursal Providencia', NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_2_id ORDER BY random() LIMIT 1;
    END IF;
  END LOOP;

  -- ===== QUOTES =====
  SELECT id INTO frame_product_id FROM public.products WHERE organization_id = demo_org_id AND category_id = marcos_cat_id LIMIT 1;
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000010'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    quote_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
      VALUES (cust_rec.id, demo_branch_id, 'COT-MCL1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - (random()*days_back)::INT, CURRENT_DATE - (random()*days_back)::INT + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', 89900, lens_family_id, 'progressive', 'polycarbonate', ARRAY['anti_reflective', 'blue_light_filter'], 'progressive', 45000, 189990, 35000, 15000, 284990, 54148, 0, 339138, 'CLP', (ARRAY['draft', 'sent', 'accepted'])[1 + (quote_num % 3)], 'Presupuesto Mirada Clara', NOW() - (random()*days_back)::INT * INTERVAL '1 day')
      ON CONFLICT (quote_number) DO NOTHING;
      quote_num := quote_num + 1;
    END LOOP;
    quote_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 15
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'COT-MCL2-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - (random()*days_back_2)::INT, CURRENT_DATE - (random()*days_back_2)::INT + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', 129900, lens_family_id, 'progressive', 'polycarbonate', ARRAY['anti_reflective'], 'progressive', 65000, 189990, 30000, 15000, 299990, 56998, 0, 356988, 'CLP', (ARRAY['draft', 'sent', 'accepted'])[1 + (quote_num % 3)], 'Presupuesto Providencia', NOW() - (random()*days_back_2)::INT * INTERVAL '1 day')
      ON CONFLICT (quote_number) DO NOTHING;
      quote_num := quote_num + 1;
    END LOOP;
  END IF;

  -- ===== LAB WORK ORDERS =====
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000002'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    wo_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_id LIMIT 20
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      status_idx := 1 + (random() * 8)::int;
      INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
      VALUES (cust_rec.id, demo_branch_id, 'TRB-MCL1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - (random()*days_back)::INT, rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective', 'blue_light_filter'], 'none', 65000, 59990, 35000, 15000, 30000, 169990, 32298, 0, 202288, 'CLP', status_list[status_idx], CASE status_list[status_idx] WHEN 'delivered' THEN 'paid' WHEN 'ready_for_pickup' THEN 'partial' ELSE 'pending' END, 'Trabajo Mirada Clara', NOW() - (random()*days_back)::INT * INTERVAL '1 day', NOW() - (random()*(days_back-5))::INT * INTERVAL '1 day', NOW() - (random()*(days_back-10))::INT * INTERVAL '1 day', CASE WHEN status_list[status_idx] = 'delivered' THEN NOW() - (random()*45)::INT * INTERVAL '1 day' ELSE NULL END)
      ON CONFLICT (work_order_number) DO NOTHING;
      wo_num := wo_num + 1;
    END LOOP;
    wo_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 12
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      status_idx := 1 + (random() * 8)::int;
      INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'TRB-MCL2-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - (random()*days_back_2)::INT, rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective'], 'none', 45000, 59990, 30000, 15000, 28000, 149990, 28498, 0, 178488, 'CLP', status_list[status_idx], CASE status_list[status_idx] WHEN 'delivered' THEN 'paid' WHEN 'ready_for_pickup' THEN 'partial' ELSE 'pending' END, 'Trabajo Providencia', NOW() - (random()*days_back_2)::INT * INTERVAL '1 day', NOW() - (random()*(days_back_2-5))::INT * INTERVAL '1 day', NOW() - (random()*(days_back_2-10))::INT * INTERVAL '1 day', CASE WHEN status_list[status_idx] = 'delivered' THEN NOW() - (random()*30)::INT * INTERVAL '1 day' ELSE NULL END)
      ON CONFLICT (work_order_number) DO NOTHING;
      wo_num := wo_num + 1;
    END LOOP;
  END IF;

  -- ===== ORDERS =====
  ord_num := 1;
  FOR i IN 1..70 LOOP
    ord_date := (CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day')::date;
    total_amt := 80000 + (random()*200000)::int;
    INSERT INTO public.orders (branch_id, organization_id, order_number, status, total_amount, payment_status, payment_method_type, customer_name, email, subtotal, tax_amount, discount_amount, currency, is_pos_sale, pos_cashier_id, created_at, updated_at)
    SELECT demo_branch_id, demo_org_id, 'ORD-MCL1-' || TO_CHAR(ord_date, 'YYYY') || '-' || LPAD(ord_num::TEXT, 5, '0'), CASE WHEN random()>0.1 THEN 'delivered' ELSE 'processing' END, total_amt, CASE WHEN random()>0.15 THEN 'paid' ELSE 'pending' END, (ARRAY['cash', 'credit_card', 'debit_card', 'installments'])[1 + (random()*3)::int], c.first_name || ' ' || c.last_name, c.email, total_amt/1.19, total_amt/1.19*0.19, 0, 'CLP', random()>0.5, demo_admin_user_id, ord_date + INTERVAL '10 hours', ord_date + INTERVAL '10 hours'
    FROM public.customers c WHERE c.branch_id = demo_branch_id ORDER BY random() LIMIT 1
    ON CONFLICT (order_number) DO NOTHING;
    ord_num := ord_num + 1;
  END LOOP;
  ord_num := 1;
  FOR i IN 1..35 LOOP
    ord_date := (CURRENT_DATE - (random() * days_back_2)::INT * INTERVAL '1 day')::date;
    total_amt := 70000 + (random()*180000)::int;
    INSERT INTO public.orders (branch_id, organization_id, order_number, status, total_amount, payment_status, payment_method_type, customer_name, email, subtotal, tax_amount, discount_amount, currency, is_pos_sale, pos_cashier_id, created_at, updated_at)
    SELECT demo_branch_2_id, demo_org_id, 'ORD-MCL2-' || TO_CHAR(ord_date, 'YYYY') || '-' || LPAD(ord_num::TEXT, 5, '0'), CASE WHEN random()>0.1 THEN 'delivered' ELSE 'processing' END, total_amt, CASE WHEN random()>0.12 THEN 'paid' ELSE 'pending' END, (ARRAY['cash', 'credit_card', 'debit_card'])[1 + (random()*2)::int], c.first_name || ' ' || c.last_name, c.email, total_amt/1.19, total_amt/1.19*0.19, 0, 'CLP', random()>0.5, demo_admin_user_id, ord_date + INTERVAL '11 hours', ord_date + INTERVAL '11 hours'
    FROM public.customers c WHERE c.branch_id = demo_branch_2_id ORDER BY random() LIMIT 1
    ON CONFLICT (order_number) DO NOTHING;
    ord_num := ord_num + 1;
  END LOOP;

  -- ===== ORDER_ITEMS =====
  FOR ord_rec IN SELECT o.id, o.total_amount FROM public.orders o WHERE o.branch_id IN (demo_branch_id, demo_branch_2_id) AND o.organization_id = demo_org_id LIMIT 90
  LOOP
    SELECT p.id, p.name, p.sku, p.price INTO prod_rec FROM public.products p WHERE p.organization_id = demo_org_id ORDER BY random() LIMIT 1;
    IF prod_rec.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = ord_rec.id LIMIT 1) THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price, product_name, sku, created_at)
      VALUES (ord_rec.id, prod_rec.id, 1, prod_rec.price, prod_rec.price, prod_rec.name, prod_rec.sku, NOW());
    END IF;
  END LOOP;

  -- ===== ORDER_PAYMENTS =====
  INSERT INTO public.order_payments (order_id, amount, payment_method, paid_at)
  SELECT o.id, o.total_amount,
    CASE COALESCE(o.payment_method_type, 'cash')
      WHEN 'credit_card' THEN 'credit'
      WHEN 'debit_card' THEN 'debit'
      WHEN 'installments' THEN 'credit'
      ELSE 'cash'
    END,
    o.created_at
  FROM public.orders o
  WHERE o.branch_id IN (demo_branch_id, demo_branch_2_id) AND o.organization_id = demo_org_id AND o.payment_status = 'paid'
  AND NOT EXISTS (SELECT 1 FROM public.order_payments op WHERE op.order_id = o.id LIMIT 1);

  -- ===== CASH REGISTER CLOSURES + POS SESSIONS =====
  IF demo_admin_user_id IS NOT NULL THEN
    FOR i IN 0..days_back LOOP
      appt_date := (CURRENT_DATE - (i || ' days')::INTERVAL)::date;
      IF EXTRACT(DOW FROM appt_date) != 0 AND EXTRACT(DOW FROM appt_date) != 6 THEN
        INSERT INTO public.cash_register_closures (branch_id, closure_date, closed_by, opening_cash_amount, total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales, expected_cash, actual_cash, cash_difference, card_machine_debit_total, card_machine_credit_total, total_subtotal, total_tax, total_discounts, closing_cash_amount, status, opened_at, closed_at, created_at)
        VALUES (demo_branch_id, appt_date, demo_admin_user_id, 50000+(random()*150000)::int, 200000+(random()*400000)::int, 5+(random()*20)::int, (200000+(random()*400000)::int)*(0.3+random()*0.2), (200000+(random()*400000)::int)*(0.2+random()*0.1), (200000+(random()*400000)::int)*(0.2+random()*0.2), (200000+(random()*400000)::int)*(random()*0.1), 0, 50000+(random()*150000)::int, 50000+(random()*150000)::int, (random()*2000-1000)::int, (200000+(random()*400000)::int)*0.25, (200000+(random()*400000)::int)*0.3, (200000+(random()*400000)::int)/1.19, (200000+(random()*400000)::int)/1.19*0.19, 0, 50000+(random()*150000)::int, 'confirmed', (appt_date||' 08:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz)
        ON CONFLICT (branch_id, closure_date) DO NOTHING;
        INSERT INTO public.pos_sessions (cashier_id, terminal_id, location, branch_id, opening_cash_amount, closing_cash_amount, opening_time, closing_time, status, created_at, updated_at)
        SELECT demo_admin_user_id, 'TERMINAL-MCL1', 'Casa Matriz', demo_branch_id, 50000+(random()*150000)::int, 50000+(random()*150000)::int + 200000+(random()*400000)::int, (appt_date||' 08:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz, 'closed', NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM public.pos_sessions ps WHERE ps.branch_id = demo_branch_id AND ps.opening_time::date = appt_date LIMIT 1);
      END IF;
    END LOOP;
    FOR i IN 0..days_back_2 LOOP
      appt_date := (CURRENT_DATE - (i || ' days')::INTERVAL)::date;
      IF EXTRACT(DOW FROM appt_date) != 0 AND EXTRACT(DOW FROM appt_date) != 6 THEN
        INSERT INTO public.cash_register_closures (branch_id, closure_date, closed_by, opening_cash_amount, total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales, expected_cash, actual_cash, cash_difference, card_machine_debit_total, card_machine_credit_total, total_subtotal, total_tax, total_discounts, closing_cash_amount, status, opened_at, closed_at, created_at)
        VALUES (demo_branch_2_id, appt_date, demo_admin_user_id, 40000+(random()*120000)::int, 150000+(random()*350000)::int, 4+(random()*18)::int, (150000+(random()*350000)::int)*(0.35+random()*0.15), (150000+(random()*350000)::int)*(0.2+random()*0.1), (150000+(random()*350000)::int)*(0.2+random()*0.15), 0, 0, 40000+(random()*120000)::int, 40000+(random()*120000)::int, (random()*1500-750)::int, (150000+(random()*350000)::int)*0.22, (150000+(random()*350000)::int)*0.25, (150000+(random()*350000)::int)/1.19, (150000+(random()*350000)::int)/1.19*0.19, 0, 40000+(random()*120000)::int, 'confirmed', (appt_date||' 09:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz)
        ON CONFLICT (branch_id, closure_date) DO NOTHING;
        INSERT INTO public.pos_sessions (cashier_id, terminal_id, location, branch_id, opening_cash_amount, closing_cash_amount, opening_time, closing_time, status, created_at, updated_at)
        SELECT demo_admin_user_id, 'TERMINAL-MCL2', 'Sucursal Providencia', demo_branch_2_id, 40000+(random()*120000)::int, 40000+(random()*120000)::int + 150000+(random()*350000)::int, (appt_date||' 09:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz, 'closed', NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM public.pos_sessions ps WHERE ps.branch_id = demo_branch_2_id AND ps.opening_time::date = appt_date LIMIT 1);
      END IF;
    END LOOP;

    FOR sess_rec IN SELECT ps.id, ps.branch_id, ps.opening_time::date AS sess_date FROM public.pos_sessions ps WHERE ps.branch_id IN (demo_branch_id, demo_branch_2_id) AND ps.status = 'closed' LIMIT 200
    LOOP
      INSERT INTO public.pos_transactions (order_id, pos_session_id, transaction_type, payment_method, amount, created_at, updated_at)
      SELECT o.id, sess_rec.id, 'sale', CASE o.payment_method_type WHEN 'credit_card' THEN 'credit' WHEN 'debit_card' THEN 'debit' ELSE 'cash' END, o.total_amount, o.created_at, o.updated_at
      FROM public.orders o
      WHERE o.branch_id = sess_rec.branch_id AND o.is_pos_sale = true AND o.payment_status = 'paid'
      AND o.created_at::date = sess_rec.sess_date
      AND NOT EXISTS (SELECT 1 FROM public.pos_transactions pt WHERE pt.order_id = o.id LIMIT 1)
      LIMIT 5;
    END LOOP;
  END IF;

  -- ===== OPTICAL INTERNAL SUPPORT TICKETS =====
  IF is_demo_admin THEN
    ticket_num := 1;
    FOR cust_rec IN SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.branch_id FROM public.customers c WHERE c.branch_id = demo_branch_2_id LIMIT 10
    LOOP
      INSERT INTO public.optical_internal_support_tickets (ticket_number, organization_id, branch_id, customer_id, customer_name, customer_email, customer_phone, created_by_user_id, subject, description, category, priority, status, created_at, updated_at)
      VALUES ('OPT-MCL2-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(ticket_num::TEXT, 4, '0'), demo_org_id, cust_rec.branch_id, cust_rec.id, cust_rec.first_name || ' ' || cust_rec.last_name, cust_rec.email, cust_rec.phone, demo_admin_user_id, 'Consulta Providencia - ' || cust_rec.first_name, 'Cliente consulta sobre entrega de lentes.', (ARRAY['lens_issue', 'frame_issue', 'delivery_issue', 'customer_complaint'])[1 + (random()*3)::int], (ARRAY['low', 'medium', 'high'])[1 + (random()*2)::int], (ARRAY['open', 'assigned', 'in_progress', 'resolved', 'closed'])[1 + (random()*4)::int], NOW() - (random()*45)::INT * INTERVAL '1 day', NOW())
      ON CONFLICT (ticket_number) DO NOTHING;
      ticket_num := ticket_num + 1;
    END LOOP;
  END IF;

  -- ===== APPOINTMENTS (guest) =====
  FOR d IN 0..13 LOOP
    appt_date := (CURRENT_DATE + (d || ' days')::INTERVAL)::date;
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (branch_id, organization_id, guest_first_name, guest_last_name, guest_rut, guest_email, guest_phone, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      VALUES 
        (demo_branch_id, demo_org_id, 'Invitado' || d, 'Demo' || d, '22.222.222-' || (d % 10), 'invitado' || d || '@test.cl', '+56 9 7777 777' || d, appt_date, ((10 + (d % 5)) || ':00:00')::time, (ARRAY['eye_exam', 'consultation', 'fitting'])[1 + (d % 3)], 'scheduled', 'Cita invitado', NOW()),
        (demo_branch_2_id, demo_org_id, 'Visitante' || d, 'Prov' || d, '33.333.333-' || (d % 10), 'visitante' || d || '@test.cl', '+56 9 8888 888' || d, appt_date, ((11 + (d % 4)) || ':00:00')::time, (ARRAY['consultation', 'fitting', 'delivery'])[1 + (d % 3)], 'scheduled', 'Cita invitado Providencia', NOW());
    END IF;
  END LOOP;
END;
$$;


-- Name: FUNCTION seed_demo_mirada_clara(); Type: COMMENT; Schema: public; Owner: -



-- Name: seed_demo_organization_data(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.seed_demo_organization_data() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_branch_2_id UUID := '00000000-0000-0000-0000-000000000003'::uuid;
  marcos_cat_id UUID;
  lentes_sol_cat_id UUID;
  accesorios_cat_id UUID;
  servicios_cat_id UUID;
  lectura_cat_id UUID;
  ocupacional_cat_id UUID;
  deportivo_cat_id UUID;
  lentes_contacto_cat_id UUID;
  demo_admin_user_id UUID;
  mono_basico_id UUID;
  mono_poly_id UUID;
  bifocal_flat_id UUID;
  prog_basico_id UUID;
  prog_comfort_id UUID;
  mono_polarizado_id UUID;
  frame_product_id UUID;
  lens_family_id UUID;
  cust_rec RECORD;
  rx_rec RECORD;
  ord_rec RECORD;
  prod_rec RECORD;
  i INTEGER;
  ord_num INTEGER;
  quote_num INTEGER;
  wo_num INTEGER;
  ticket_num INTEGER;
  appt_date DATE;
  ord_date DATE;
  status_idx INTEGER;
  status_list TEXT[] := ARRAY['ordered', 'sent_to_lab', 'in_progress_lab', 'ready_at_lab', 'received_from_lab', 'mounted', 'quality_check', 'ready_for_pickup', 'delivered'];
  days_back INTEGER := 365;
  total_amt INTEGER;
  is_demo_admin BOOLEAN := false;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);
  SELECT id INTO marcos_cat_id FROM public.categories WHERE slug = 'marcos' LIMIT 1;
  SELECT id INTO lentes_sol_cat_id FROM public.categories WHERE slug = 'lentes-de-sol' LIMIT 1;
  SELECT id INTO accesorios_cat_id FROM public.categories WHERE slug = 'accesorios' LIMIT 1;
  SELECT id INTO servicios_cat_id FROM public.categories WHERE slug = 'servicios' LIMIT 1;
  SELECT id INTO lectura_cat_id FROM public.categories WHERE slug = 'lectura' LIMIT 1;
  SELECT id INTO ocupacional_cat_id FROM public.categories WHERE slug = 'ocupacional' LIMIT 1;
  SELECT id INTO deportivo_cat_id FROM public.categories WHERE slug = 'deportivo' LIMIT 1;
  SELECT id INTO lentes_contacto_cat_id FROM public.categories WHERE slug = 'lentes-contacto' LIMIT 1;

  -- Demo admin from org (for support tickets FK), or any auth user (for closed_by, cashier_id)
  SELECT id INTO demo_admin_user_id FROM public.admin_users WHERE organization_id = demo_org_id LIMIT 1;
  IF demo_admin_user_id IS NOT NULL THEN
    is_demo_admin := true;
  ELSE
    SELECT id INTO demo_admin_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  -- ===== 1. LENS FAMILIES (with category_id: lectura for single_vision/bifocal/progressive, ocupacional for computer, deportivo for sports) =====
  INSERT INTO public.lens_families (id, name, brand, lens_type, lens_material, description, is_active, organization_id, category_id, created_at)
  VALUES
  ('40000000-0000-0000-0000-000000000001'::uuid, 'Monofocal Básico CR-39 AR', 'Genérico', 'single_vision', 'cr39', 'Lente monofocal estándar con antirreflejo básico.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000002'::uuid, 'Monofocal Policarbonato Blue Cut', 'Essilor', 'single_vision', 'polycarbonate', 'Monofocal resistente con filtro de luz azul.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000003'::uuid, 'Monofocal Alto Índice 1.67 AR Premium', 'Hoya', 'single_vision', 'high_index_1_67', 'Lente delgado para graduaciones medias-altas.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000004'::uuid, 'Monofocal Alto Índice 1.74 AR Ultra Delgado', 'Zeiss', 'single_vision', 'high_index_1_74', 'Lente ultra delgado para graduaciones muy altas.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000005'::uuid, 'Monofocal Antifatiga Digital', 'Rodenstock', 'single_vision', 'cr39', 'Lente de confort para pantallas.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000006'::uuid, 'Monofocal Fotocromático CR-39', 'Transitions', 'single_vision', 'cr39', 'Lente que se oscurece con luz UV.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000007'::uuid, 'Bifocal Flat Top 28mm CR-39', 'Genérico', 'bifocal', 'cr39', 'Bifocal económico y funcional.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000008'::uuid, 'Bifocal Invisilens Policarbonato', 'Essilor', 'bifocal', 'polycarbonate', 'Bifocal de policarbonato resistente.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000009'::uuid, 'Progresivo Básico CR-39 FreeForm', 'Genérico', 'progressive', 'cr39', 'Progresivo de entrada FreeForm.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000010'::uuid, 'Progresivo Comfort Policarbonato', 'Essilor', 'progressive', 'polycarbonate', 'Progresivo Varilux Comfort.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000011'::uuid, 'Progresivo Individualizado Alto Índice 1.67', 'Zeiss', 'progressive', 'high_index_1_67', 'Progresivo Zeiss Individual 2.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000012'::uuid, 'Progresivo para Conducción 1.74', 'Hoya', 'progressive', 'high_index_1_74', 'Progresivo optimizado para conducción.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000013'::uuid, 'Progresivo Digital Blue Defense', 'Genérico', 'progressive', 'polycarbonate', 'Progresivo con filtro azul.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000014'::uuid, 'Ocupacional Office Policarbonato', 'Rodenstock', 'computer', 'polycarbonate', 'Lente para oficina.', true, demo_org_id, ocupacional_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000015'::uuid, 'Lectura Extendida CR-39', 'Genérico', 'reading', 'cr39', 'Lente para lectura.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000016'::uuid, 'Monofocal Polarizado Gris Policarbonato', 'Genérico', 'single_vision', 'polycarbonate', 'Monofocal polarizado para sol.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000017'::uuid, 'Progresivo Espejado Azul 1.67', 'Essilor', 'progressive', 'high_index_1_67', 'Progresivo espejado para sol.', true, demo_org_id, lectura_cat_id, NOW()),
  ('40000000-0000-0000-0000-000000000018'::uuid, 'Sports Visión CR-39 Tinte Café', 'Zeiss', 'sports', 'cr39', 'Lente deportivo tinte café.', true, demo_org_id, deportivo_cat_id, NOW())
  ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, name = EXCLUDED.name, category_id = EXCLUDED.category_id;

  -- ===== 2. LENS PRICE MATRICES =====
  SELECT id INTO mono_basico_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000001'::uuid;
  SELECT id INTO mono_poly_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000002'::uuid;
  SELECT id INTO bifocal_flat_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000007'::uuid;
  SELECT id INTO prog_basico_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000009'::uuid;
  SELECT id INTO prog_comfort_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000010'::uuid;
  SELECT id INTO mono_polarizado_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000016'::uuid;
  IF mono_basico_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (mono_basico_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 29990, 9990, 'stock', true), (mono_basico_id, -6.00, -4.25, -2.00, 2.00, 0.00, 0.00, 39990, 14990, 'surfaced', true), (mono_basico_id, 4.25, 6.00, -2.00, 2.00, 0.00, 0.00, 39990, 14990, 'surfaced', true);
  END IF;
  IF mono_poly_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (mono_poly_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 59990, 24990, 'stock', true), (mono_poly_id, -6.00, -4.25, -4.00, 4.00, 0.00, 0.00, 79990, 34990, 'surfaced', true);
  END IF;
  IF bifocal_flat_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (bifocal_flat_id, -4.00, 4.00, -2.00, 2.00, 1.00, 2.50, 49990, 19990, 'surfaced', true);
  END IF;
  IF prog_basico_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (prog_basico_id, -4.00, 4.00, -2.00, 2.00, 0.75, 1.75, 99990, 39990, 'surfaced', true), (prog_basico_id, -4.00, 4.00, -2.00, 2.00, 2.00, 3.00, 109990, 44990, 'surfaced', true);
  END IF;
  IF prog_comfort_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (prog_comfort_id, -4.00, 4.00, -2.00, 2.00, 0.75, 1.75, 189990, 79990, 'surfaced', true), (prog_comfort_id, -4.00, 4.00, -2.00, 2.00, 2.00, 3.00, 209990, 89990, 'surfaced', true);
  END IF;
  IF mono_polarizado_id IS NOT NULL THEN
    INSERT INTO public.lens_price_matrices (lens_family_id, sphere_min, sphere_max, cylinder_min, cylinder_max, addition_min, addition_max, base_price, cost, sourcing_type, is_active)
    VALUES (mono_polarizado_id, -4.00, 4.00, -2.00, 2.00, 0.00, 0.00, 89990, 39990, 'surfaced', true);
  END IF;

  -- ===== 3. CONTACT LENS FAMILIES (with category_id) =====
  INSERT INTO public.contact_lens_families (id, organization_id, name, brand, use_type, modality, material, packaging, base_curve, diameter, description, is_active, category_id, created_at)
  VALUES ('70000000-0000-0000-0000-000000000001'::uuid, demo_org_id, 'Acuvue Oasys 1-Day', 'Johnson & Johnson', 'daily', 'spherical', 'silicone_hydrogel', 'box_30', 8.50, 14.30, 'Lentes diarios hidrogel silicona.', true, lentes_contacto_cat_id, NOW()),
  ('70000000-0000-0000-0000-000000000002'::uuid, demo_org_id, 'Air Optix Plus HydraGlyde for Astigmatism', 'Alcon', 'monthly', 'toric', 'silicone_hydrogel', 'box_6', 8.70, 14.50, 'Lentes mensuales para astigmatismo.', true, lentes_contacto_cat_id, NOW())
  ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, category_id = EXCLUDED.category_id;
  INSERT INTO public.contact_lens_price_matrices (contact_lens_family_id, organization_id, sphere_min, sphere_max, cylinder_min, cylinder_max, axis_min, axis_max, addition_min, addition_max, base_price, cost, is_active)
  SELECT id, demo_org_id, -6.00, -0.50, 0.00, 0.00, 0, 0, 0.00, 0.00, 29990, 14990, true FROM public.contact_lens_families WHERE id = '70000000-0000-0000-0000-000000000001'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.contact_lens_price_matrices WHERE contact_lens_family_id = '70000000-0000-0000-0000-000000000001'::uuid AND sphere_min = -6.00 LIMIT 1);
  INSERT INTO public.contact_lens_price_matrices (contact_lens_family_id, organization_id, sphere_min, sphere_max, cylinder_min, cylinder_max, axis_min, axis_max, addition_min, addition_max, base_price, cost, is_active)
  SELECT id, demo_org_id, -6.00, -0.50, -1.75, -0.75, 10, 180, 0.00, 0.00, 39990, 19990, true FROM public.contact_lens_families WHERE id = '70000000-0000-0000-0000-000000000002'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.contact_lens_price_matrices WHERE contact_lens_family_id = '70000000-0000-0000-0000-000000000002'::uuid AND sphere_min = -6.00 LIMIT 1);

  -- ===== 3b. Backfill category_id for existing demo families (lectura for single_vision/bifocal/progressive, ocupacional for computer, deportivo for sports) =====
  UPDATE public.lens_families SET category_id = lectura_cat_id WHERE organization_id = demo_org_id AND category_id IS NULL AND lens_type IN ('single_vision', 'bifocal', 'progressive');
  UPDATE public.lens_families SET category_id = lectura_cat_id WHERE organization_id = demo_org_id AND category_id IS NULL AND lens_type = 'reading';
  UPDATE public.lens_families SET category_id = ocupacional_cat_id WHERE organization_id = demo_org_id AND category_id IS NULL AND lens_type = 'computer';
  UPDATE public.lens_families SET category_id = deportivo_cat_id WHERE organization_id = demo_org_id AND category_id IS NULL AND lens_type = 'sports';
  UPDATE public.contact_lens_families SET category_id = lentes_contacto_cat_id WHERE organization_id = demo_org_id AND category_id IS NULL;

  -- ===== 4. PRODUCTS =====
  IF marcos_cat_id IS NOT NULL AND lentes_sol_cat_id IS NOT NULL AND accesorios_cat_id IS NOT NULL AND servicios_cat_id IS NOT NULL THEN
    INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, is_featured, price_includes_tax, featured_image, created_at)
    VALUES ('20000000-0000-0000-0000-000000000001'::uuid, demo_branch_id, demo_org_id, 'Marco Ray-Ban RB2140', 'marco-ray-ban-rb2140', 'Marco clásico aviador Ray-Ban.', 89900, 45000, marcos_cat_id, 'RB-2140-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000002'::uuid, demo_branch_id, demo_org_id, 'Marco Oakley OO9208', 'marco-oakley-oo9208', 'Marco deportivo Oakley.', 129900, 65000, marcos_cat_id, 'OO-9208-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000003'::uuid, demo_branch_id, demo_org_id, 'Marco Gucci GG0061', 'marco-gucci-gg0061', 'Marco de lujo Gucci.', 249900, 125000, marcos_cat_id, 'GG-0061-BRN', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000004'::uuid, demo_branch_id, demo_org_id, 'Marco Prada PR17VS', 'marco-prada-pr17vs', 'Marco Prada elegante.', 199900, 100000, marcos_cat_id, 'PR-17VS-BLK', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000005'::uuid, demo_branch_id, demo_org_id, 'Marco Versace VE4289', 'marco-versace-ve4289', 'Marco Versace sofisticado.', 179900, 90000, marcos_cat_id, 'VE-4289-GLD', 'active', false, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000011'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Ray-Ban Aviator', 'gafas-sol-ray-ban-aviator', 'Gafas de sol Ray-Ban Aviator.', 119900, 60000, lentes_sol_cat_id, 'RB-AVI-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000012'::uuid, demo_branch_id, demo_org_id, 'Gafas de Sol Oakley Holbrook', 'gafas-sol-oakley-holbrook', 'Gafas Oakley polarizadas.', 149900, 75000, lentes_sol_cat_id, 'OO-HOL-SUN', 'active', true, true, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', NOW())
    ON CONFLICT (slug) DO NOTHING;
    INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, price_includes_tax, featured_image, created_at)
    VALUES ('20000000-0000-0000-0000-000000000016'::uuid, demo_branch_id, demo_org_id, 'Estuche Rígido Premium', 'estuche-rigido-premium', 'Estuche rígido para lentes.', 12900, 5000, accesorios_cat_id, 'ACC-EST-RIG', 'active', true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW()),
    ('20000000-0000-0000-0000-000000000017'::uuid, demo_branch_id, demo_org_id, 'Paño de Limpieza Microfibra', 'pano-limpieza-microfibra', 'Paño microfibra para lentes.', 4900, 2000, accesorios_cat_id, 'ACC-PANO-MIC', 'active', true, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400', NOW())
    ON CONFLICT (slug) DO NOTHING;
    INSERT INTO public.products (id, branch_id, organization_id, name, slug, description, price, cost_price, category_id, sku, status, price_includes_tax, created_at)
    VALUES ('20000000-0000-0000-0000-000000000021'::uuid, demo_branch_id, demo_org_id, 'Reparación de Marco', 'reparacion-marco', 'Servicio de reparación de marco.', 19900, 0, servicios_cat_id, 'SERV-REP-MAR', 'active', true, NOW()),
    ('20000000-0000-0000-0000-000000000022'::uuid, demo_branch_id, demo_org_id, 'Montaje de Lentes', 'montaje-lentes', 'Servicio de montaje de lentes.', 29900, 0, servicios_cat_id, 'SERV-MON-LEN', 'active', true, NOW()),
    ('20000000-0000-0000-0000-000000000024'::uuid, demo_branch_id, demo_org_id, 'Examen de la Vista', 'examen-vista', 'Examen completo con optometrista.', 25000, 0, servicios_cat_id, 'SERV-EXA-VIS', 'active', true, NOW())
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  -- ===== 5. PRODUCT BRANCH STOCK =====
  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, demo_branch_id, CASE WHEN p.category_id = marcos_cat_id THEN 15 + (random()*10)::int WHEN p.category_id = lentes_sol_cat_id THEN 20 + (random()*15)::int ELSE 30 END, 5, NOW()
  FROM public.products p WHERE p.organization_id = demo_org_id
  ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
  INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold, updated_at)
  SELECT p.id, demo_branch_2_id, CASE WHEN p.category_id = marcos_cat_id THEN 10 + (random()*8)::int WHEN p.category_id = lentes_sol_cat_id THEN 15 + (random()*10)::int ELSE 25 END, 5, NOW()
  FROM public.products p WHERE p.organization_id = demo_org_id
  ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();

  -- ===== 6. PRESCRIPTIONS =====
  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-DEMO1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::TEXT, 3, '0'), 'Dr. Carlos Méndez', 'OPTO-12345', -1.5 - (random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), -1.5-(random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.branch_id = demo_branch_id
  AND NOT EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id LIMIT 1)
  LIMIT 25;

  INSERT INTO public.prescriptions (customer_id, prescription_date, expiration_date, prescription_number, issued_by, issued_by_license, od_sphere, od_cylinder, od_axis, od_add, od_pd, os_sphere, os_cylinder, os_axis, os_add, os_pd, prescription_type, lens_type, lens_material, is_active, is_current, created_at)
  SELECT c.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'REC-PROV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::TEXT, 3, '0'), 'Dr. Carlos Méndez', 'OPTO-20000', -1.5 - (random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), -1.5-(random()*1.5), CASE WHEN random()>0.7 THEN -0.5-(random()*0.5) ELSE NULL END, CASE WHEN random()>0.7 THEN (random()*180)::INT ELSE NULL END, NULL, 31.5+(random()*2), 'single_vision', 'Monofocal', 'CR39', true, true, NOW()
  FROM public.customers c WHERE c.branch_id = demo_branch_2_id
  AND NOT EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.customer_id = c.id LIMIT 1)
  LIMIT 25;

  -- ===== 7. SCHEDULE_SETTINGS, QUOTE_SETTINGS, POS_SETTINGS =====
  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES (demo_branch_id, demo_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"09:00","end_time":"13:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW())
  ON CONFLICT (branch_id) WHERE branch_id IS NOT NULL DO UPDATE SET slot_duration_minutes = EXCLUDED.slot_duration_minutes;

  INSERT INTO public.schedule_settings (branch_id, organization_id, slot_duration_minutes, default_appointment_duration, buffer_time_minutes, working_hours, min_advance_booking_hours, max_advance_booking_days, created_at, updated_at)
  VALUES (demo_branch_2_id, demo_org_id, 15, 30, 5, '{"monday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"tuesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"wednesday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"thursday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"friday":{"enabled":true,"start_time":"09:00","end_time":"18:00"},"saturday":{"enabled":true,"start_time":"10:00","end_time":"14:00"},"sunday":{"enabled":false,"start_time":"09:00","end_time":"13:00"}}'::jsonb, 2, 90, NOW(), NOW())
  ON CONFLICT (branch_id) WHERE branch_id IS NOT NULL DO UPDATE SET slot_duration_minutes = EXCLUDED.slot_duration_minutes;

  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  SELECT demo_branch_id, demo_org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.quote_settings WHERE branch_id = demo_branch_id);

  INSERT INTO public.quote_settings (branch_id, organization_id, created_at, updated_at)
  SELECT demo_branch_2_id, demo_org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.quote_settings WHERE branch_id = demo_branch_2_id);

  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (demo_branch_id, 50.00, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET min_deposit_percent = EXCLUDED.min_deposit_percent;

  INSERT INTO public.pos_settings (branch_id, min_deposit_percent, created_at, updated_at)
  VALUES (demo_branch_2_id, 50.00, NOW(), NOW())
  ON CONFLICT (branch_id) DO UPDATE SET min_deposit_percent = EXCLUDED.min_deposit_percent;

  -- ===== 8. APPOINTMENTS (12 months, both branches) =====
  FOR i IN 1..250 LOOP
    appt_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_id, demo_org_id, appt_date, ((9 + (i % 7)) || ':00:00')::time, CASE i%3 WHEN 0 THEN 'eye_exam' WHEN 1 THEN 'consultation' ELSE 'fitting' END, CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, NULL, NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_id ORDER BY random() LIMIT 1;
    END IF;
  END LOOP;
  FOR i IN 1..250 LOOP
    appt_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    IF EXTRACT(DOW FROM appt_date) BETWEEN 1 AND 6 THEN
      INSERT INTO public.appointments (customer_id, branch_id, organization_id, appointment_date, appointment_time, appointment_type, status, notes, created_at)
      SELECT c.id, demo_branch_2_id, demo_org_id, appt_date, ((10 + (i % 6)) || ':00:00')::time, CASE i%3 WHEN 0 THEN 'consultation' WHEN 1 THEN 'eye_exam' ELSE 'delivery' END, CASE WHEN appt_date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END, 'Sucursal Providencia', NOW() - (i || ' days')::INTERVAL
      FROM public.customers c WHERE c.branch_id = demo_branch_2_id ORDER BY random() LIMIT 1;
    END IF;
  END LOOP;

  -- ===== 9. QUOTES =====
  SELECT id INTO frame_product_id FROM public.products WHERE organization_id = demo_org_id AND category_id = marcos_cat_id LIMIT 1;
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000010'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    quote_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
      VALUES (cust_rec.id, demo_branch_id, 'COT-DEMO1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - (random()*180)::INT, CURRENT_DATE - (random()*180)::INT + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', 89900, lens_family_id, 'progressive', 'polycarbonate', ARRAY['anti_reflective', 'blue_light_filter'], 'progressive', 45000, 189990, 35000, 15000, 284990, 54148, 0, 339138, 'CLP', CASE WHEN random()>0.4 THEN 'accepted' WHEN random()>0.2 THEN 'sent' ELSE 'draft' END, 'Presupuesto demo', NOW() - ((random()*180)::INT * INTERVAL '1 day'))
      ON CONFLICT (quote_number) DO NOTHING;
      quote_num := quote_num + 1;
    END LOOP;
    quote_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      INSERT INTO public.quotes (customer_id, branch_id, quote_number, quote_date, expiration_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, created_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'COT-PROV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(quote_num::TEXT, 4, '0'), CURRENT_DATE - (random()*180)::INT, CURRENT_DATE - (random()*180)::INT + INTERVAL '30 days', rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', 129900, lens_family_id, 'progressive', 'polycarbonate', ARRAY['anti_reflective'], 'progressive', 65000, 189990, 30000, 15000, 299990, 56998, 0, 356988, 'CLP', CASE WHEN random()>0.5 THEN 'accepted' WHEN random()>0.25 THEN 'sent' ELSE 'draft' END, 'Presupuesto Providencia', NOW() - ((random()*180)::INT * INTERVAL '1 day'))
      ON CONFLICT (quote_number) DO NOTHING;
      quote_num := quote_num + 1;
    END LOOP;
  END IF;

  -- ===== 10. LAB WORK ORDERS =====
  SELECT id INTO lens_family_id FROM public.lens_families WHERE id = '40000000-0000-0000-0000-000000000002'::uuid;
  IF frame_product_id IS NOT NULL AND lens_family_id IS NOT NULL THEN
    wo_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      status_idx := 1 + (random() * 8)::int;
      INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
      VALUES (cust_rec.id, demo_branch_id, 'TRB-DEMO1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - (random()*270)::INT, rx_rec.id, frame_product_id, 'Marco Oakley OO9208', 'Oakley', 'OO9208', 'Negro', '60-16-145', 'OO-9208-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective', 'blue_light_filter'], 'none', 65000, 59990, 35000, 15000, 30000, 169990, 32298, 0, 202288, 'CLP', status_list[status_idx], CASE status_list[status_idx] WHEN 'delivered' THEN 'paid' WHEN 'ready_for_pickup' THEN 'partial' ELSE 'pending' END, 'Trabajo demo', NOW() - ((random()*270)::INT * INTERVAL '1 day'), NOW() - ((random()*265)::INT * INTERVAL '1 day'), NOW() - ((random()*260)::INT * INTERVAL '1 day'), CASE WHEN status_list[status_idx] = 'delivered' THEN NOW() - ((random()*90)::INT * INTERVAL '1 day') ELSE NULL END)
      ON CONFLICT (work_order_number) DO NOTHING;
      wo_num := wo_num + 1;
    END LOOP;
    wo_num := 1;
    FOR cust_rec IN SELECT c.id FROM public.customers c INNER JOIN public.prescriptions p ON p.customer_id = c.id WHERE c.branch_id = demo_branch_2_id LIMIT 25
    LOOP
      SELECT * INTO rx_rec FROM public.prescriptions WHERE customer_id = cust_rec.id ORDER BY prescription_date DESC LIMIT 1;
      status_idx := 1 + (random() * 8)::int;
      INSERT INTO public.lab_work_orders (customer_id, branch_id, work_order_number, work_order_date, prescription_id, frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, lens_family_id, lens_type, lens_material, lens_treatments, presbyopia_solution, frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost, subtotal, tax_amount, discount_amount, total_amount, currency, status, payment_status, internal_notes, created_at, ordered_at, sent_to_lab_at, delivered_at)
      VALUES (cust_rec.id, demo_branch_2_id, 'TRB-PROV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(wo_num::TEXT, 4, '0'), CURRENT_DATE - (random()*270)::INT, rx_rec.id, frame_product_id, 'Marco Ray-Ban RB2140', 'Ray-Ban', 'RB2140', 'Negro', '58-14-140', 'RB-2140-BLK', lens_family_id, 'single_vision', 'polycarbonate', ARRAY['anti_reflective'], 'none', 45000, 59990, 30000, 15000, 28000, 149990, 28498, 0, 178488, 'CLP', status_list[status_idx], CASE status_list[status_idx] WHEN 'delivered' THEN 'paid' WHEN 'ready_for_pickup' THEN 'partial' ELSE 'pending' END, 'Trabajo Providencia', NOW() - ((random()*270)::INT * INTERVAL '1 day'), NOW() - ((random()*265)::INT * INTERVAL '1 day'), NOW() - ((random()*260)::INT * INTERVAL '1 day'), CASE WHEN status_list[status_idx] = 'delivered' THEN NOW() - ((random()*90)::INT * INTERVAL '1 day') ELSE NULL END)
      ON CONFLICT (work_order_number) DO NOTHING;
      wo_num := wo_num + 1;
    END LOOP;
  END IF;

  -- ===== 11. ORDERS (12 months, both branches) =====
  ord_num := 1;
  FOR i IN 1..150 LOOP
    ord_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    total_amt := 80000 + (random()*200000)::int;
    INSERT INTO public.orders (branch_id, organization_id, order_number, status, total_amount, payment_status, payment_method_type, customer_name, email, subtotal, tax_amount, discount_amount, currency, is_pos_sale, pos_cashier_id, created_at, updated_at)
    SELECT demo_branch_id, demo_org_id, 'ORD-DEMO1-' || TO_CHAR(ord_date, 'YYYY') || '-' || LPAD(ord_num::TEXT, 5, '0'), CASE WHEN random()>0.1 THEN 'delivered' ELSE 'processing' END, total_amt, CASE WHEN random()>0.15 THEN 'paid' ELSE 'pending' END, (ARRAY['cash', 'credit_card', 'debit_card', 'installments'])[1 + (random()*3)::int], c.first_name || ' ' || c.last_name, c.email, total_amt/1.19, total_amt/1.19*0.19, 0, 'CLP', random()>0.5, demo_admin_user_id, ord_date + INTERVAL '10 hours', ord_date + INTERVAL '10 hours'
    FROM public.customers c WHERE c.branch_id = demo_branch_id ORDER BY random() LIMIT 1
    ON CONFLICT (order_number) DO NOTHING;
    ord_num := ord_num + 1;
  END LOOP;
  ord_num := 1;
  FOR i IN 1..150 LOOP
    ord_date := CURRENT_DATE - (random() * days_back)::INT * INTERVAL '1 day';
    total_amt := 70000 + (random()*180000)::int;
    INSERT INTO public.orders (branch_id, organization_id, order_number, status, total_amount, payment_status, payment_method_type, customer_name, email, subtotal, tax_amount, discount_amount, currency, is_pos_sale, pos_cashier_id, created_at, updated_at)
    SELECT demo_branch_2_id, demo_org_id, 'ORD-PROV-' || TO_CHAR(ord_date, 'YYYY') || '-' || LPAD(ord_num::TEXT, 5, '0'), CASE WHEN random()>0.1 THEN 'delivered' ELSE 'processing' END, total_amt, CASE WHEN random()>0.12 THEN 'paid' ELSE 'pending' END, (ARRAY['cash', 'credit_card', 'debit_card'])[1 + (random()*2)::int], c.first_name || ' ' || c.last_name, c.email, total_amt/1.19, total_amt/1.19*0.19, 0, 'CLP', random()>0.5, demo_admin_user_id, ord_date + INTERVAL '11 hours', ord_date + INTERVAL '11 hours'
    FROM public.customers c WHERE c.branch_id = demo_branch_2_id ORDER BY random() LIMIT 1
    ON CONFLICT (order_number) DO NOTHING;
    ord_num := ord_num + 1;
  END LOOP;

  -- ===== 12. ORDER_ITEMS =====
  FOR ord_rec IN SELECT o.id, o.total_amount FROM public.orders o WHERE o.branch_id IN (demo_branch_id, demo_branch_2_id) AND o.organization_id = demo_org_id LIMIT 100
  LOOP
    SELECT p.id, p.name, p.sku, p.price INTO prod_rec FROM public.products p WHERE p.organization_id = demo_org_id ORDER BY random() LIMIT 1;
    IF prod_rec.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = ord_rec.id LIMIT 1) THEN
      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price, product_name, sku, created_at)
      VALUES (ord_rec.id, prod_rec.id, 1, prod_rec.price, prod_rec.price, prod_rec.name, prod_rec.sku, NOW());
    END IF;
  END LOOP;

  -- ===== 13. CASH REGISTER CLOSURES + POS SESSIONS (12 months, ~130 weekdays each branch) =====
  IF demo_admin_user_id IS NOT NULL THEN
    FOR i IN 0..130 LOOP
      appt_date := (CURRENT_DATE - (i || ' days')::INTERVAL)::date;
      IF EXTRACT(DOW FROM appt_date) != 0 AND EXTRACT(DOW FROM appt_date) != 6 THEN
        INSERT INTO public.cash_register_closures (branch_id, closure_date, closed_by, opening_cash_amount, total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales, expected_cash, actual_cash, cash_difference, card_machine_debit_total, card_machine_credit_total, total_subtotal, total_tax, total_discounts, closing_cash_amount, status, opened_at, closed_at, created_at)
        VALUES (demo_branch_id, appt_date, demo_admin_user_id, 50000+(random()*150000)::int, 200000+(random()*400000)::int, 5+(random()*20)::int, (200000+(random()*400000)::int)*(0.3+random()*0.2), (200000+(random()*400000)::int)*(0.2+random()*0.1), (200000+(random()*400000)::int)*(0.2+random()*0.2), (200000+(random()*400000)::int)*(random()*0.1), 0, 50000+(random()*150000)::int, 50000+(random()*150000)::int, (random()*2000-1000)::int, (200000+(random()*400000)::int)*0.25, (200000+(random()*400000)::int)*0.3, (200000+(random()*400000)::int)/1.19, (200000+(random()*400000)::int)/1.19*0.19, 0, 50000+(random()*150000)::int, 'confirmed', (appt_date||' 08:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz)
        ON CONFLICT (branch_id, closure_date) DO NOTHING;
        INSERT INTO public.cash_register_closures (branch_id, closure_date, closed_by, opening_cash_amount, total_sales, total_transactions, cash_sales, debit_card_sales, credit_card_sales, installments_sales, other_payment_sales, expected_cash, actual_cash, cash_difference, card_machine_debit_total, card_machine_credit_total, total_subtotal, total_tax, total_discounts, closing_cash_amount, status, opened_at, closed_at, created_at)
        VALUES (demo_branch_2_id, appt_date, demo_admin_user_id, 40000+(random()*120000)::int, 150000+(random()*350000)::int, 4+(random()*18)::int, (150000+(random()*350000)::int)*(0.35+random()*0.15), (150000+(random()*350000)::int)*(0.2+random()*0.1), (150000+(random()*350000)::int)*(0.2+random()*0.15), 0, 0, 40000+(random()*120000)::int, 40000+(random()*120000)::int, (random()*1500-750)::int, (150000+(random()*350000)::int)*0.22, (150000+(random()*350000)::int)*0.25, (150000+(random()*350000)::int)/1.19, (150000+(random()*350000)::int)/1.19*0.19, 0, 40000+(random()*120000)::int, 'confirmed', (appt_date||' 09:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz)
        ON CONFLICT (branch_id, closure_date) DO NOTHING;
        INSERT INTO public.pos_sessions (cashier_id, terminal_id, location, branch_id, opening_cash_amount, closing_cash_amount, opening_time, closing_time, status, created_at, updated_at)
        VALUES (demo_admin_user_id, 'TERMINAL-DEMO1', 'Casa Matriz', demo_branch_id, 50000+(random()*150000)::int, 50000+(random()*150000)::int + 200000+(random()*400000)::int, (appt_date||' 08:00:00')::timestamptz, (appt_date||' 20:00:00')::timestamptz, 'closed', NOW(), NOW());
        INSERT INTO public.pos_sessions (cashier_id, terminal_id, location, branch_id, opening_cash_amount, closing_cash_amount, opening_time, closing_time, status, created_at, updated_at)
        VALUES (demo_admin_user_id, 'TERMINAL-PROV', 'Sucursal Providencia', demo_branch_2_id, 40000+(random()*120000)::int, 40000+(random()*120000)::int + 150000+(random()*350000)::int, (appt_date||' 09:00:00')::timestamptz, (appt_date||' 19:00:00')::timestamptz, 'closed', NOW(), NOW());
      END IF;
    END LOOP;
  END IF;

  -- ===== 14. OPTICAL INTERNAL SUPPORT TICKETS =====
  -- Schema: created_by_user_id (not created_by), description NOT NULL, category NOT NULL
  IF demo_admin_user_id IS NOT NULL AND is_demo_admin THEN
    ticket_num := 1;
    FOR i IN 1..8 LOOP
      INSERT INTO public.optical_internal_support_tickets (organization_id, branch_id, ticket_number, subject, description, category, priority, status, created_by_user_id, created_at, updated_at)
      VALUES (demo_org_id, demo_branch_id, 'TKT-DEMO1-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(ticket_num::TEXT, 4, '0'), 'Ticket demo ' || ticket_num, 'Consulta de soporte interno demo ' || ticket_num, (ARRAY['lens_issue', 'frame_issue', 'delivery_issue', 'customer_complaint'])[1 + (i % 4)], (ARRAY['low', 'medium', 'high'])[1 + (i % 3)], CASE WHEN i <= 2 THEN 'open' WHEN i <= 5 THEN 'in_progress' ELSE 'resolved' END, demo_admin_user_id, NOW() - (i || ' days')::INTERVAL, NOW());
      ticket_num := ticket_num + 1;
    END LOOP;
    ticket_num := 1;
    FOR i IN 1..6 LOOP
      INSERT INTO public.optical_internal_support_tickets (organization_id, branch_id, ticket_number, subject, description, category, priority, status, created_by_user_id, created_at, updated_at)
      VALUES (demo_org_id, demo_branch_2_id, 'TKT-PROV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(ticket_num::TEXT, 4, '0'), 'Ticket Providencia ' || ticket_num, 'Consulta de soporte sucursal Providencia ' || ticket_num, (ARRAY['lens_issue', 'frame_issue', 'delivery_issue', 'customer_complaint'])[1 + (i % 4)], (ARRAY['low', 'medium'])[1 + (i % 2)], CASE WHEN i <= 2 THEN 'open' ELSE 'resolved' END, demo_admin_user_id, NOW() - (i || ' days')::INTERVAL, NOW());
      ticket_num := ticket_num + 1;
    END LOOP;
  END IF;
END;
$$;


-- Name: FUNCTION seed_demo_organization_data(); Type: COMMENT; Schema: public; Owner: -



-- Name: set_optical_internal_ticket_number(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.set_optical_internal_ticket_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_optical_internal_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;


-- Name: set_saas_ticket_number(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.set_saas_ticket_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_saas_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;


-- Name: set_ticket_number(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.set_ticket_number() RETURNS trigger
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


-- Name: sync_agreement_customers_on_order(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.sync_agreement_customers_on_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.agreement_id IS NOT NULL AND NEW.customer_id IS NOT NULL THEN
    INSERT INTO public.agreement_customers (
      agreement_id,
      customer_id,
      first_order_at,
      last_order_at,
      order_count,
      total_copago,
      total_institutional
    )
    VALUES (
      NEW.agreement_id,
      NEW.customer_id,
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.created_at, NOW()),
      1,
      COALESCE(NEW.copago_amount, 0),
      COALESCE(NEW.institutional_amount, 0)
    )
    ON CONFLICT (agreement_id, customer_id) DO UPDATE SET
      last_order_at = GREATEST(agreement_customers.last_order_at, COALESCE(NEW.created_at, NOW())),
      order_count = agreement_customers.order_count + 1,
      total_copago = agreement_customers.total_copago + COALESCE(NEW.copago_amount, 0),
      total_institutional = agreement_customers.total_institutional + COALESCE(NEW.institutional_amount, 0),
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


-- Name: update_ai_insights_updated_at(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_ai_insights_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- Name: update_billing_documents_updated_at(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_billing_documents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- Name: update_chat_session_stats(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_chat_session_stats() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.chat_sessions
  SET 
    message_count = (
      SELECT COUNT(*) 
      FROM public.chat_messages 
      WHERE session_id = NEW.session_id
    ),
    last_message_preview = CASE 
      WHEN NEW.role = 'user' OR NEW.role = 'assistant' THEN
        LEFT(NEW.content, 100)
      ELSE
        last_message_preview
    END
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;


-- Name: update_chat_session_updated_at(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_chat_session_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.chat_sessions
  SET updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;


-- Name: update_contact_lens_encargos_updated_at(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_contact_lens_encargos_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- Name: update_embeddings_updated_at(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_embeddings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- Name: update_lead_score_and_priority(uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_lead_score_and_priority(p_lead_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_new_score INT;
    v_old_score INT;
    v_priority TEXT;
BEGIN
    -- Get old score
    SELECT lead_score INTO v_old_score FROM demo_requests WHERE id = p_lead_id;
    
    -- Calculate new score
    v_new_score := calculate_lead_score(p_lead_id);
    
    -- Determine priority based on score
    IF v_new_score > 50 THEN
        v_priority := 'hot';
    ELSIF v_new_score >= 25 THEN
        v_priority := 'warm';
    ELSIF v_new_score > 0 THEN
        v_priority := 'cold';
    ELSE
        v_priority := 'at_risk';
    END IF;
    
    -- Update the demo_request
    UPDATE demo_requests 
    SET 
        lead_score = v_new_score,
        priority_level = v_priority,
        score_last_calculated_at = NOW()
    WHERE id = p_lead_id;
END;
$$;


-- Name: update_optical_internal_ticket_timestamps(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_optical_internal_ticket_timestamps() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update the parent ticket's last_response_at, first_response_at, and response_time_minutes
  UPDATE public.optical_internal_support_tickets t
  SET 
    last_response_at = NOW(),
    first_response_at = COALESCE(t.first_response_at, NOW()),
    response_time_minutes = CASE 
      WHEN t.first_response_at IS NULL THEN 
        ROUND(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 60)::INTEGER 
      ELSE t.response_time_minutes 
    END,
    updated_at = NOW()
  WHERE t.id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;


-- Name: FUNCTION update_optical_internal_ticket_timestamps(); Type: COMMENT; Schema: public; Owner: -



-- Name: update_pos_session_cash(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_pos_session_cash(session_id uuid, cash_amount numeric) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.pos_sessions
  SET closing_cash_amount = COALESCE(closing_cash_amount, opening_cash_amount) + cash_amount,
      updated_at = NOW()
  WHERE id = session_id;
  
  RETURN TRUE;
END;
$$;


-- Name: update_product_option_fields_updated_at(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_product_option_fields_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- Name: update_product_option_values_updated_at(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_product_option_values_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- Name: update_product_stock(uuid, uuid, integer, boolean, text, text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_product_stock(p_product_id uuid, p_branch_id uuid, p_quantity_change integer, p_reserve boolean DEFAULT false, p_movement_type text DEFAULT NULL::text, p_reference_type text DEFAULT NULL::text, p_reference_id uuid DEFAULT NULL::uuid, p_created_by uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_quantity INTEGER;
  v_current_reserved INTEGER;
  v_movement_type TEXT;
BEGIN
  v_movement_type := COALESCE(NULLIF(TRIM(p_movement_type), ''), 'adjustment');
  IF v_movement_type NOT IN ('sale', 'adjustment', 'receipt', 'transfer', 'refund') THEN
    v_movement_type := 'adjustment';
  END IF;

  SELECT quantity, reserved_quantity
  INTO v_current_quantity, v_current_reserved
  FROM public.product_branch_stock
  WHERE product_id = p_product_id
    AND branch_id = p_branch_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.product_branch_stock (
      product_id,
      branch_id,
      quantity,
      reserved_quantity,
      low_stock_threshold,
      last_stock_movement
    ) VALUES (
      p_product_id,
      p_branch_id,
      CASE WHEN p_reserve THEN 0 ELSE GREATEST(0, p_quantity_change) END,
      CASE WHEN p_reserve THEN GREATEST(0, p_quantity_change) ELSE 0 END,
      5,
      NOW()
    )
    ON CONFLICT (product_id, branch_id) DO NOTHING;
    
    IF NOT p_reserve AND p_quantity_change != 0 THEN
      INSERT INTO public.inventory_movements (
        product_id, branch_id, quantity_change, movement_type,
        reference_type, reference_id, created_by
      ) VALUES (
        p_product_id, p_branch_id, p_quantity_change, v_movement_type,
        p_reference_type, p_reference_id, p_created_by
      );
    END IF;
    RETURN TRUE;
  END IF;
  
  IF p_reserve THEN
    UPDATE public.product_branch_stock
    SET 
      reserved_quantity = GREATEST(0, v_current_reserved + p_quantity_change),
      last_stock_movement = NOW(),
      updated_at = NOW()
    WHERE product_id = p_product_id
      AND branch_id = p_branch_id;
  ELSE
    UPDATE public.product_branch_stock
    SET 
      quantity = GREATEST(0, v_current_quantity + p_quantity_change),
      last_stock_movement = NOW(),
      updated_at = NOW()
    WHERE product_id = p_product_id
      AND branch_id = p_branch_id;

    IF p_quantity_change != 0 THEN
      INSERT INTO public.inventory_movements (
        product_id, branch_id, quantity_change, movement_type,
        reference_type, reference_id, created_by
      ) VALUES (
        p_product_id, p_branch_id, p_quantity_change, v_movement_type,
        p_reference_type, p_reference_id, p_created_by
      );
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;


-- Name: update_stock_movement_timestamp(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_stock_movement_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only update if quantity or reserved_quantity actually changed
  IF (OLD.quantity IS DISTINCT FROM NEW.quantity) OR 
     (OLD.reserved_quantity IS DISTINCT FROM NEW.reserved_quantity) THEN
    NEW.last_stock_movement = NOW();
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- Name: update_ticket_timestamps(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_ticket_timestamps() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update the parent ticket's last_response_at
  UPDATE public.support_tickets 
  SET 
    last_response_at = NOW(),
    first_response_at = COALESCE(first_response_at, NOW()),
    updated_at = NOW()
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;


-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- Name: update_user_tour_progress_updated_at(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_user_tour_progress_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- Name: update_work_order_status(uuid, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.update_work_order_status(p_work_order_id uuid, p_new_status text, p_changed_by uuid, p_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM public.lab_work_orders
  WHERE id = p_work_order_id;
  
  -- Update work order
  UPDATE public.lab_work_orders
  SET 
    status = p_new_status,
    updated_at = NOW(),
    -- Update specific date fields based on status
    ordered_at = CASE WHEN p_new_status = 'ordered' THEN NOW() ELSE ordered_at END,
    sent_to_lab_at = CASE WHEN p_new_status = 'sent_to_lab' THEN NOW() ELSE sent_to_lab_at END,
    lab_started_at = CASE WHEN p_new_status = 'in_progress_lab' THEN NOW() ELSE lab_started_at END,
    lab_completed_at = CASE WHEN p_new_status = 'ready_at_lab' THEN NOW() ELSE lab_completed_at END,
    received_from_lab_at = CASE WHEN p_new_status = 'received_from_lab' THEN NOW() ELSE received_from_lab_at END,
    mounted_at = CASE WHEN p_new_status = 'mounted' THEN NOW() ELSE mounted_at END,
    quality_checked_at = CASE WHEN p_new_status = 'quality_check' THEN NOW() ELSE quality_checked_at END,
    ready_at = CASE WHEN p_new_status = 'ready_for_pickup' THEN NOW() ELSE ready_at END,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_work_order_id;
  
  -- Create history entry
  INSERT INTO public.lab_work_order_status_history (
    work_order_id,
    from_status,
    to_status,
    changed_by,
    notes
  ) VALUES (
    p_work_order_id,
    v_old_status,
    p_new_status,
    p_changed_by,
    p_notes
  );
END;
$$;


-- Name: uuid_generate_v4(); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$SELECT extensions.uuid_generate_v4()$$;


-- Name: validate_treatment_compatibility(text[], text, text); Type: FUNCTION; Schema: public; Owner: -

CREATE FUNCTION public.validate_treatment_compatibility(p_treatment_keys text[], p_lens_material text DEFAULT 'cr39'::text, p_lens_type text DEFAULT 'single_vision'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_conflicts JSONB := '[]'::JSONB;
  v_warnings JSONB := '[]'::JSONB;
  v_valid BOOLEAN := true;
  v_treatment RECORD;
  v_excluded_treatment TEXT;
  v_treatment_key TEXT;
BEGIN
  -- Si no hay tratamientos, es válido
  IF p_treatment_keys IS NULL OR array_length(p_treatment_keys, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'valid', true,
      'conflicts', '[]'::JSONB,
      'warnings', '[]'::JSONB
    );
  END IF;

  -- Por cada tratamiento seleccionado
  FOREACH v_treatment_key IN ARRAY p_treatment_keys
  LOOP
    -- Obtener datos del tratamiento
    SELECT * INTO v_treatment
    FROM treatments
    WHERE treatment_key = v_treatment_key AND is_active = true;

    IF v_treatment IS NULL THEN
      CONTINUE;
    END IF;

    -- 1. Validar incompatibilidades con otros tratamientos
    IF v_treatment.exclusions->>'excludes' IS NOT NULL THEN
      FOR v_excluded_treatment IN SELECT jsonb_array_elements_text((v_treatment.exclusions->>'excludes')::jsonb)
      LOOP
        IF v_excluded_treatment = ANY(p_treatment_keys) THEN
          v_valid := false;
          v_conflicts := v_conflicts || jsonb_build_array(
            jsonb_build_object(
              'treatment', v_treatment_key,
              'conflicts_with', v_excluded_treatment,
              'message', 'El tratamiento ' || v_treatment.name || ' es incompatible con ' || v_excluded_treatment
            )
          );
        END IF;
      END LOOP;
    END IF;

    -- 2. Validar incompatibilidad con material
    IF v_treatment.exclusions->>'incompatible_with_material' IS NOT NULL AND v_treatment.exclusions->>'incompatible_with_material' != '' THEN
      IF p_lens_material = ANY(SELECT jsonb_array_elements_text((v_treatment.exclusions->>'incompatible_with_material')::jsonb)) THEN
        v_valid := false;
        v_conflicts := v_conflicts || jsonb_build_array(
          jsonb_build_object(
            'treatment', v_treatment_key,
            'conflicts_with_material', p_lens_material,
            'message', 'El tratamiento ' || v_treatment.name || ' no es compatible con material ' || p_lens_material
          )
        );
      END IF;
    END IF;

    -- 3. Validar compatibilidad con tipo de lente
    IF v_treatment.lens_type_compatibility IS NOT NULL THEN
      IF p_lens_type != 'ALL' AND NOT (p_lens_type = ANY(v_treatment.lens_type_compatibility)) THEN
        v_warnings := v_warnings || jsonb_build_array(
          jsonb_build_object(
            'treatment', v_treatment_key,
            'warning', 'El tratamiento ' || v_treatment.name || ' puede no ser compatible con lentes ' || p_lens_type
          )
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', v_valid,
    'conflicts', v_conflicts,
    'warnings', v_warnings
  );
END;
$$;




-- Name: admin_activity_log; Type: TABLE; Schema: public; Owner: -

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


-- Name: TABLE admin_activity_log; Type: COMMENT; Schema: public; Owner: -



-- Name: admin_branch_access; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.admin_branch_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid NOT NULL,
    branch_id uuid,
    role text DEFAULT 'manager'::text,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_branch_access_role_check CHECK ((role = ANY (ARRAY['manager'::text, 'staff'::text, 'viewer'::text])))
);


-- Name: TABLE admin_branch_access; Type: COMMENT; Schema: public; Owner: -



-- Name: admin_notifications; Type: TABLE; Schema: public; Owner: -

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


-- Name: TABLE admin_notifications; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN admin_notifications.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: admin_users; Type: TABLE; Schema: public; Owner: -

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


-- Name: TABLE admin_users; Type: COMMENT; Schema: public; Owner: -



-- Name: CONSTRAINT admin_users_role_check ON admin_users; Type: COMMENT; Schema: public; Owner: -



-- Name: profiles; Type: TABLE; Schema: public; Owner: -

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


-- Name: admin_users_view; Type: VIEW; Schema: public; Owner: -

CREATE VIEW public.admin_users_view WITH (security_invoker='on') AS
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


-- Name: VIEW admin_users_view; Type: COMMENT; Schema: public; Owner: -



-- Name: agreement_customers; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.agreement_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agreement_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    first_order_at timestamp with time zone NOT NULL,
    last_order_at timestamp with time zone NOT NULL,
    order_count integer DEFAULT 1 NOT NULL,
    total_copago numeric(12,2) DEFAULT 0 NOT NULL,
    total_institutional numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: TABLE agreement_customers; Type: COMMENT; Schema: public; Owner: -



-- Name: agreement_institutional_balances; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.agreement_institutional_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agreement_id uuid NOT NULL,
    order_id uuid NOT NULL,
    purchase_order_id uuid,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp with time zone,
    payment_reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    invoice_id uuid,
    CONSTRAINT agreement_institutional_balances_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT agreement_institutional_balances_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text])))
);


-- Name: TABLE agreement_institutional_balances; Type: COMMENT; Schema: public; Owner: -



-- Name: agreement_institutional_invoice_balances; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.agreement_institutional_invoice_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    balance_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    CONSTRAINT agreement_institutional_invoice_balances_amount_check CHECK ((amount >= (0)::numeric))
);


-- Name: TABLE agreement_institutional_invoice_balances; Type: COMMENT; Schema: public; Owner: -



-- Name: agreement_institutional_invoices; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.agreement_institutional_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agreement_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    institution_rut text NOT NULL,
    institution_name text NOT NULL,
    period_from date NOT NULL,
    period_to date NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    tax_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'CLP'::text,
    document_type text DEFAULT 'factura'::text NOT NULL,
    folio text NOT NULL,
    status text DEFAULT 'emitted'::text NOT NULL,
    sii_folio text,
    sii_status text,
    sii_track_id text,
    sii_response_data jsonb,
    sii_emission_date timestamp with time zone,
    payment_reference text,
    paid_at timestamp with time zone,
    pdf_url text,
    emitted_at timestamp with time zone DEFAULT now(),
    emitted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agreement_institutional_invoices_document_type_check CHECK ((document_type = 'factura'::text)),
    CONSTRAINT agreement_institutional_invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'emitted'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text])))
);


-- Name: TABLE agreement_institutional_invoices; Type: COMMENT; Schema: public; Owner: -



-- Name: agreement_purchase_orders; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.agreement_purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agreement_id uuid NOT NULL,
    oc_number text NOT NULL,
    issued_at date,
    valid_until date,
    max_amount numeric(12,2),
    used_amount numeric(12,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agreement_purchase_orders_status_check CHECK ((status = ANY (ARRAY['active'::text, 'exhausted'::text, 'expired'::text, 'cancelled'::text])))
);


-- Name: TABLE agreement_purchase_orders; Type: COMMENT; Schema: public; Owner: -



-- Name: agreements; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.agreements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid,
    name text NOT NULL,
    agreement_type text NOT NULL,
    institution_name text NOT NULL,
    institution_rut text NOT NULL,
    representative_name text,
    representative_email text,
    representative_phone text,
    valid_from date NOT NULL,
    valid_until date,
    status text DEFAULT 'active'::text NOT NULL,
    billing_rules jsonb DEFAULT '{}'::jsonb,
    max_installments_by_product jsonb DEFAULT '{}'::jsonb,
    discount_percent numeric(5,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT agreements_agreement_type_check CHECK ((agreement_type = ANY (ARRAY['empresa'::text, 'sindicato'::text, 'mutual'::text]))),
    CONSTRAINT agreements_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'expired'::text, 'cancelled'::text])))
);


-- Name: TABLE agreements; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN agreements.billing_rules; Type: COMMENT; Schema: public; Owner: -



-- Name: ai_insights; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.ai_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid NOT NULL,
    section text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_label text,
    action_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_dismissed boolean DEFAULT false NOT NULL,
    priority integer DEFAULT 5 NOT NULL,
    feedback_score integer,
    feedback_comment text,
    CONSTRAINT ai_insights_action_label_check CHECK (((action_label IS NULL) OR (char_length(action_label) <= 50))),
    CONSTRAINT ai_insights_feedback_score_check CHECK (((feedback_score IS NULL) OR ((feedback_score >= 1) AND (feedback_score <= 5)))),
    CONSTRAINT ai_insights_message_check CHECK ((char_length(message) <= 500)),
    CONSTRAINT ai_insights_priority_check CHECK (((priority >= 1) AND (priority <= 10))),
    CONSTRAINT ai_insights_section_check CHECK ((section = ANY (ARRAY['dashboard'::text, 'inventory'::text, 'clients'::text, 'pos'::text, 'analytics'::text]))),
    CONSTRAINT ai_insights_title_check CHECK ((char_length(title) <= 100)),
    CONSTRAINT ai_insights_type_check CHECK ((type = ANY (ARRAY['warning'::text, 'opportunity'::text, 'info'::text, 'neutral'::text])))
);


-- Name: TABLE ai_insights; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_insights.section; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_insights.type; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_insights.metadata; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_insights.priority; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_insights.feedback_score; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_insights.feedback_comment; Type: COMMENT; Schema: public; Owner: -



-- Name: ai_usage_log; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    endpoint text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: TABLE ai_usage_log; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_usage_log.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_usage_log.provider; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_usage_log.model; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_usage_log.prompt_tokens; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_usage_log.completion_tokens; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN ai_usage_log.endpoint; Type: COMMENT; Schema: public; Owner: -



-- Name: appointments; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    appointment_date date NOT NULL,
    appointment_time time without time zone NOT NULL,
    duration_minutes integer DEFAULT 30,
    appointment_type text,
    status text DEFAULT 'scheduled'::text,
    assigned_to uuid,
    created_by uuid,
    notes text,
    reason text,
    outcome text,
    follow_up_required boolean DEFAULT false,
    follow_up_date date,
    prescription_id uuid,
    order_id uuid,
    reminder_sent boolean DEFAULT false,
    reminder_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    guest_first_name text,
    guest_last_name text,
    guest_rut text,
    guest_email text,
    guest_phone text,
    branch_id uuid,
    organization_id uuid,
    field_operation_id uuid,
    CONSTRAINT appointments_appointment_type_check CHECK ((appointment_type = ANY (ARRAY['eye_exam'::text, 'consultation'::text, 'fitting'::text, 'delivery'::text, 'repair'::text, 'follow_up'::text, 'emergency'::text, 'other'::text]))),
    CONSTRAINT appointments_customer_or_guest_check CHECK (((customer_id IS NOT NULL) OR ((guest_first_name IS NOT NULL) AND (guest_last_name IS NOT NULL) AND (guest_rut IS NOT NULL)))),
    CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])))
);


-- Name: TABLE appointments; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN appointments.customer_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN appointments.guest_first_name; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN appointments.guest_last_name; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN appointments.guest_rut; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN appointments.guest_email; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN appointments.guest_phone; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN appointments.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: branches; Type: TABLE; Schema: public; Owner: -

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


-- Name: TABLE branches; Type: COMMENT; Schema: public; Owner: -



-- Name: cart_items; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.cart_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    session_id text,
    product_id uuid NOT NULL,
    variant_id uuid,
    quantity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT cart_user_or_session CHECK (((user_id IS NOT NULL) OR (session_id IS NOT NULL)))
);


-- Name: cash_register_closures; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.cash_register_closures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    closure_date date DEFAULT CURRENT_DATE NOT NULL,
    closed_by uuid NOT NULL,
    opening_cash_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_sales numeric(12,2) DEFAULT 0 NOT NULL,
    total_transactions integer DEFAULT 0 NOT NULL,
    cash_sales numeric(12,2) DEFAULT 0 NOT NULL,
    debit_card_sales numeric(12,2) DEFAULT 0 NOT NULL,
    credit_card_sales numeric(12,2) DEFAULT 0 NOT NULL,
    installments_sales numeric(12,2) DEFAULT 0 NOT NULL,
    other_payment_sales numeric(12,2) DEFAULT 0 NOT NULL,
    expected_cash numeric(12,2) DEFAULT 0 NOT NULL,
    actual_cash numeric(12,2),
    cash_difference numeric(12,2) DEFAULT 0,
    card_machine_debit_total numeric(12,2) DEFAULT 0,
    card_machine_credit_total numeric(12,2) DEFAULT 0,
    card_machine_difference numeric(12,2) DEFAULT 0,
    total_subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    total_tax numeric(12,2) DEFAULT 0 NOT NULL,
    total_discounts numeric(12,2) DEFAULT 0 NOT NULL,
    closing_cash_amount numeric(12,2),
    notes text,
    discrepancies text,
    status text DEFAULT 'draft'::text,
    opened_at timestamp with time zone NOT NULL,
    closed_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pos_session_id uuid,
    field_operation_id uuid,
    CONSTRAINT cash_register_closures_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'reviewed'::text, 'closed'::text])))
);


-- Name: TABLE cash_register_closures; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN cash_register_closures.expected_cash; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN cash_register_closures.actual_cash; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN cash_register_closures.cash_difference; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN cash_register_closures.pos_session_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN cash_register_closures.field_operation_id; Type: COMMENT; Schema: public; Owner: -



-- Name: categories; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    image_url text,
    parent_id uuid,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    is_default boolean DEFAULT false
);


-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN categories.is_system; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN categories.is_default; Type: COMMENT; Schema: public; Owner: -



-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    tool_calls jsonb,
    tool_results jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb,
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['system'::text, 'user'::text, 'assistant'::text, 'tool'::text])))
);


-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    provider text NOT NULL,
    model text NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    config jsonb,
    message_count integer DEFAULT 0,
    last_message_preview text,
    metadata jsonb,
    organization_id uuid,
    CONSTRAINT chk_chat_sessions_user_or_whatsapp CHECK (((user_id IS NOT NULL) OR ((metadata IS NOT NULL) AND ((metadata ->> 'channel'::text) = 'whatsapp'::text))))
);


-- Name: COLUMN chat_sessions.metadata; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN chat_sessions.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: contact_lens_encargos; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.contact_lens_encargos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    customer_id uuid,
    customer_name text,
    customer_rut text,
    customer_phone text,
    customer_email text,
    contact_lens_family_id uuid NOT NULL,
    family_name text NOT NULL,
    family_brand text,
    sphere_od numeric(5,2) NOT NULL,
    cylinder_od numeric(5,2) DEFAULT 0,
    axis_od integer,
    add_od numeric(5,2),
    base_curve_od numeric(5,2),
    diameter_od numeric(5,2),
    sphere_os numeric(5,2) NOT NULL,
    cylinder_os numeric(5,2) DEFAULT 0,
    axis_os integer,
    add_os numeric(5,2),
    base_curve_os numeric(5,2),
    diameter_os numeric(5,2),
    quantity integer DEFAULT 1 NOT NULL,
    estimated_price numeric(12,2),
    cost numeric(12,2),
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    expected_arrival_date date,
    arrival_notification_sent boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contact_lens_encargos_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'ordered'::text, 'arrived'::text, 'delivered'::text, 'cancelled'::text])))
);


-- Name: contact_lens_families; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.contact_lens_families (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    brand text,
    description text,
    use_type text NOT NULL,
    modality text NOT NULL,
    material text,
    packaging text NOT NULL,
    base_curve numeric(4,2),
    diameter numeric(4,2),
    organization_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category_id uuid,
    CONSTRAINT contact_lens_families_material_check CHECK ((material = ANY (ARRAY['silicone_hydrogel'::text, 'hydrogel'::text, 'rigid_gas_permeable'::text]))),
    CONSTRAINT contact_lens_families_modality_check CHECK ((modality = ANY (ARRAY['spherical'::text, 'toric'::text, 'multifocal'::text, 'cosmetic'::text]))),
    CONSTRAINT contact_lens_families_packaging_check CHECK ((packaging = ANY (ARRAY['box_30'::text, 'box_6'::text, 'box_3'::text, 'bottle'::text]))),
    CONSTRAINT contact_lens_families_use_type_check CHECK ((use_type = ANY (ARRAY['daily'::text, 'bi_weekly'::text, 'monthly'::text, 'extended_wear'::text])))
);


-- Name: TABLE contact_lens_families; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN contact_lens_families.use_type; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN contact_lens_families.modality; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN contact_lens_families.packaging; Type: COMMENT; Schema: public; Owner: -



-- Name: contact_lens_inventory; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.contact_lens_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_lens_family_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    sphere_min numeric(5,2) NOT NULL,
    sphere_max numeric(5,2) NOT NULL,
    cylinder_min numeric(5,2) DEFAULT 0,
    cylinder_max numeric(5,2) DEFAULT 0,
    quantity integer DEFAULT 0 NOT NULL,
    min_stock_threshold integer DEFAULT 3,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_cylinder_range CHECK ((cylinder_min <= cylinder_max)),
    CONSTRAINT valid_quantity CHECK ((quantity >= 0)),
    CONSTRAINT valid_sphere_range CHECK ((sphere_min <= sphere_max))
);


-- Name: TABLE contact_lens_inventory; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN contact_lens_inventory.sphere_min; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN contact_lens_inventory.sphere_max; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN contact_lens_inventory.quantity; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN contact_lens_inventory.min_stock_threshold; Type: COMMENT; Schema: public; Owner: -



-- Name: contact_lens_price_matrices; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.contact_lens_price_matrices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_lens_family_id uuid NOT NULL,
    sphere_min numeric(5,2) NOT NULL,
    sphere_max numeric(5,2) NOT NULL,
    cylinder_min numeric(5,2) DEFAULT 0,
    cylinder_max numeric(5,2) DEFAULT 0,
    axis_min integer DEFAULT 0,
    axis_max integer DEFAULT 180,
    addition_min numeric(5,2) DEFAULT 0,
    addition_max numeric(5,2) DEFAULT 4.0,
    base_price numeric(10,2) NOT NULL,
    cost numeric(10,2) NOT NULL,
    organization_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    CONSTRAINT valid_cl_addition_range CHECK ((addition_min <= addition_max)),
    CONSTRAINT valid_cl_axis_range CHECK (((axis_min >= 0) AND (axis_max <= 180) AND (axis_min <= axis_max))),
    CONSTRAINT valid_cl_cylinder_range CHECK ((cylinder_min <= cylinder_max)),
    CONSTRAINT valid_cl_sphere_range CHECK ((sphere_min <= sphere_max))
);


-- Name: TABLE contact_lens_price_matrices; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN contact_lens_price_matrices.base_price; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN contact_lens_price_matrices.cost; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN contact_lens_price_matrices.name; Type: COMMENT; Schema: public; Owner: -



-- Name: credit_note_movements; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.credit_note_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    credit_note_id uuid NOT NULL,
    pos_session_id uuid,
    amount numeric(12,2) NOT NULL,
    refund_method text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: TABLE credit_note_movements; Type: COMMENT; Schema: public; Owner: -



-- Name: credit_notes; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.credit_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    credit_note_number text NOT NULL,
    order_id uuid,
    branch_id uuid,
    organization_id uuid,
    amount numeric(12,2) NOT NULL,
    reason text,
    refund_method text NOT NULL,
    pos_session_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT credit_notes_refund_method_check CHECK ((refund_method = ANY (ARRAY['cash'::text, 'debit'::text, 'credit'::text, 'transfer'::text])))
);


-- Name: TABLE credit_notes; Type: COMMENT; Schema: public; Owner: -



-- Name: customer_lens_purchases; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.customer_lens_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    order_id uuid,
    prescription_id uuid,
    product_id uuid,
    product_name text NOT NULL,
    product_type text,
    purchase_date date DEFAULT CURRENT_DATE NOT NULL,
    quantity integer DEFAULT 1,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    lens_type text,
    lens_material text,
    lens_index numeric(3,2),
    coatings text[],
    tint text,
    frame_brand text,
    frame_model text,
    frame_color text,
    frame_size text,
    prescription_used jsonb,
    status text DEFAULT 'ordered'::text,
    delivery_date date,
    warranty_start_date date,
    warranty_end_date date,
    warranty_details text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_lens_purchases_product_type_check CHECK ((product_type = ANY (ARRAY['frame'::text, 'lens'::text, 'accessory'::text, 'service'::text]))),
    CONSTRAINT customer_lens_purchases_status_check CHECK ((status = ANY (ARRAY['ordered'::text, 'in_progress'::text, 'ready'::text, 'delivered'::text, 'cancelled'::text])))
);


-- Name: TABLE customer_lens_purchases; Type: COMMENT; Schema: public; Owner: -



-- Name: customer_satisfaction_surveys; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.customer_satisfaction_surveys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    work_order_id uuid,
    customer_id uuid,
    score integer NOT NULL,
    comment text,
    token_used text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_satisfaction_surveys_score_check CHECK (((score >= 1) AND (score <= 5)))
);


-- Name: TABLE customer_satisfaction_surveys; Type: COMMENT; Schema: public; Owner: -



-- Name: customers; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    rut text,
    date_of_birth date,
    gender text,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    postal_code text,
    country text DEFAULT 'Chile'::text,
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
    is_active boolean DEFAULT true,
    notes text,
    tags text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    organization_id uuid,
    field_operation_id uuid,
    CONSTRAINT customers_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text, 'prefer_not_to_say'::text]))),
    CONSTRAINT customers_preferred_contact_method_check CHECK ((preferred_contact_method = ANY (ARRAY['email'::text, 'phone'::text, 'sms'::text, 'whatsapp'::text])))
);


-- Name: TABLE customers; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN customers.branch_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN customers.email; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN customers.rut; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN customers.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: demo_requests; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.demo_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    full_name text,
    optica_name text,
    phone text,
    source text DEFAULT 'landing'::text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    organization_id uuid,
    metadata jsonb,
    funnel_stage text DEFAULT 'pending'::text,
    demo_started_at timestamp with time zone,
    demo_expires_at timestamp with time zone,
    meeting_url text,
    meeting_scheduled_at timestamp with time zone,
    meeting_completed_at timestamp with time zone,
    offer_sent_at timestamp with time zone,
    offer_type text,
    offer_details jsonb,
    conversion_date timestamp with time zone,
    lost_reason text,
    notes text,
    last_contact_at timestamp with time zone,
    last_email_sent text,
    last_email_sent_at timestamp with time zone,
    login_count integer DEFAULT 0,
    last_login_at timestamp with time zone,
    lead_score integer DEFAULT 0,
    priority_level text DEFAULT 'cold'::text,
    score_last_calculated_at timestamp with time zone,
    assigned_to uuid,
    next_followup_at timestamp with time zone,
    first_contact_at timestamp with time zone,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    CONSTRAINT demo_requests_funnel_stage_check CHECK ((funnel_stage = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'demo_expiring'::text, 'demo_expired'::text, 'meeting_scheduled'::text, 'post_meeting'::text, 'negotiation'::text, 'migration'::text, 'converted'::text, 'lost'::text]))),
    CONSTRAINT demo_requests_priority_level_check CHECK ((priority_level = ANY (ARRAY['hot'::text, 'warm'::text, 'cold'::text, 'at_risk'::text]))),
    CONSTRAINT demo_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


-- Name: TABLE demo_requests; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN demo_requests.funnel_stage; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN demo_requests.demo_started_at; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN demo_requests.demo_expires_at; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN demo_requests.meeting_url; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN demo_requests.last_email_sent; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN demo_requests.lead_score; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN demo_requests.priority_level; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN demo_requests.score_last_calculated_at; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN demo_requests.assigned_to; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN demo_requests.next_followup_at; Type: COMMENT; Schema: public; Owner: -



-- Name: drivers; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    license_number text NOT NULL,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: TABLE drivers; Type: COMMENT; Schema: public; Owner: -



-- Name: email_send_events; Type: TABLE; Schema: public; Owner: -

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


-- Name: embeddings; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    content text NOT NULL,
    embedding public.vector(768),
    embedding_small public.vector(384),
    embedding_provider text NOT NULL,
    user_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: TABLE embeddings; Type: COMMENT; Schema: public; Owner: -



-- Name: field_operations; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.field_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    scheduled_date date NOT NULL,
    location text,
    branch_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT field_operations_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'prepared'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


-- Name: internal_order_items; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.internal_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    internal_order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT internal_order_items_quantity_check CHECK ((quantity > 0))
);


-- Name: TABLE internal_order_items; Type: COMMENT; Schema: public; Owner: -



-- Name: internal_order_status_history; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.internal_order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    internal_order_id uuid NOT NULL,
    status text NOT NULL,
    notes text,
    changed_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT internal_order_status_history_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_transit'::text, 'delivered'::text, 'cancelled'::text])))
);


-- Name: TABLE internal_order_status_history; Type: COMMENT; Schema: public; Owner: -



-- Name: internal_orders; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.internal_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    origin_branch_id uuid NOT NULL,
    destination_branch_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    priority text DEFAULT 'medium'::text,
    scheduled_date date,
    actual_delivery_date date,
    notes text,
    created_by uuid NOT NULL,
    assigned_driver_id uuid,
    assigned_vehicle_id uuid,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_different_branches CHECK ((origin_branch_id <> destination_branch_id)),
    CONSTRAINT chk_valid_dates CHECK (((scheduled_date IS NULL) OR (actual_delivery_date IS NULL) OR (scheduled_date <= actual_delivery_date))),
    CONSTRAINT internal_orders_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT internal_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_transit'::text, 'delivered'::text, 'cancelled'::text])))
);


-- Name: TABLE internal_orders; Type: COMMENT; Schema: public; Owner: -



-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    quantity_change integer NOT NULL,
    movement_type text NOT NULL,
    reference_type text,
    reference_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_movements_movement_type_check CHECK ((movement_type = ANY (ARRAY['sale'::text, 'adjustment'::text, 'receipt'::text, 'transfer'::text, 'refund'::text])))
);


-- Name: lab_work_order_status_history; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.lab_work_order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_id uuid NOT NULL,
    from_status text,
    to_status text NOT NULL,
    changed_at timestamp with time zone DEFAULT now(),
    changed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


-- Name: TABLE lab_work_order_status_history; Type: COMMENT; Schema: public; Owner: -



-- Name: lab_work_orders; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.lab_work_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_order_number text NOT NULL,
    work_order_date date DEFAULT CURRENT_DATE NOT NULL,
    customer_id uuid NOT NULL,
    prescription_id uuid,
    quote_id uuid,
    frame_product_id uuid,
    frame_name text NOT NULL,
    frame_brand text,
    frame_model text,
    frame_color text,
    frame_size text,
    frame_sku text,
    frame_serial_number text,
    lens_type text NOT NULL,
    lens_material text NOT NULL,
    lens_index numeric(3,2),
    lens_treatments text[] DEFAULT '{}'::text[] NOT NULL,
    lens_tint_color text,
    lens_tint_percentage integer,
    prescription_snapshot jsonb,
    lab_name text,
    lab_contact text,
    lab_order_number text,
    lab_estimated_delivery_date date,
    status text DEFAULT 'quote'::text,
    ordered_at timestamp with time zone,
    sent_to_lab_at timestamp with time zone,
    lab_started_at timestamp with time zone,
    lab_completed_at timestamp with time zone,
    received_from_lab_at timestamp with time zone,
    mounted_at timestamp with time zone,
    quality_checked_at timestamp with time zone,
    ready_at timestamp with time zone,
    delivered_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    frame_cost numeric(10,2) DEFAULT 0,
    lens_cost numeric(10,2) DEFAULT 0,
    treatments_cost numeric(10,2) DEFAULT 0,
    labor_cost numeric(10,2) DEFAULT 0,
    lab_cost numeric(10,2) DEFAULT 0,
    subtotal numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'CLP'::text,
    payment_status text DEFAULT 'pending'::text,
    payment_method text,
    deposit_amount numeric(10,2) DEFAULT 0,
    balance_amount numeric(10,2) DEFAULT 0,
    pos_order_id uuid,
    internal_notes text,
    customer_notes text,
    lab_notes text,
    quality_notes text,
    cancellation_reason text,
    created_by uuid,
    assigned_to uuid,
    lab_contact_person text,
    warranty_start_date date,
    warranty_end_date date,
    warranty_details text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    lens_family_id uuid,
    customer_own_frame boolean DEFAULT false NOT NULL,
    presbyopia_solution text DEFAULT 'none'::text,
    far_lens_family_id uuid,
    near_lens_family_id uuid,
    far_lens_cost numeric(10,2),
    near_lens_cost numeric(10,2),
    organization_id uuid,
    contact_lens_family_id uuid,
    contact_lens_rx_sphere_od numeric(5,2),
    contact_lens_rx_cylinder_od numeric(5,2),
    contact_lens_rx_axis_od integer,
    contact_lens_rx_add_od numeric(5,2),
    contact_lens_rx_base_curve_od numeric(4,2),
    contact_lens_rx_diameter_od numeric(4,2),
    contact_lens_rx_sphere_os numeric(5,2),
    contact_lens_rx_cylinder_os numeric(5,2),
    contact_lens_rx_axis_os integer,
    contact_lens_rx_add_os numeric(5,2),
    contact_lens_rx_base_curve_os numeric(4,2),
    contact_lens_rx_diameter_os numeric(4,2),
    contact_lens_quantity integer DEFAULT 1,
    contact_lens_cost numeric(10,2),
    near_frame_product_id uuid,
    near_frame_name text,
    near_frame_brand text,
    near_frame_model text,
    near_frame_color text,
    near_frame_size text,
    near_frame_sku text,
    near_frame_price numeric(10,2) DEFAULT 0,
    near_frame_price_includes_tax boolean DEFAULT false,
    near_frame_cost numeric(10,2) DEFAULT 0,
    customer_own_near_frame boolean DEFAULT false,
    field_operation_id uuid,
    operativo_batch_id uuid,
    operativo_delivered_at timestamp with time zone,
    operativo_recipient_name text,
    agreement_id uuid,
    lens_sourcing_type text DEFAULT 'surfaced'::text,
    CONSTRAINT lab_work_orders_lens_sourcing_type_check CHECK ((lens_sourcing_type = ANY (ARRAY['stock'::text, 'surfaced'::text]))),
    CONSTRAINT lab_work_orders_lens_tint_percentage_check CHECK (((lens_tint_percentage >= 0) AND (lens_tint_percentage <= 100))),
    CONSTRAINT lab_work_orders_lens_type_check CHECK ((lens_type = ANY (ARRAY['single_vision'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text, 'reading'::text, 'computer'::text, 'sports'::text]))),
    CONSTRAINT lab_work_orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'refunded'::text]))),
    CONSTRAINT lab_work_orders_presbyopia_solution_check CHECK ((presbyopia_solution = ANY (ARRAY['none'::text, 'two_separate'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text]))),
    CONSTRAINT lab_work_orders_status_check CHECK ((status = ANY (ARRAY['quote'::text, 'ordered'::text, 'on_hold_payment'::text, 'sent_to_lab'::text, 'in_progress_lab'::text, 'ready_at_lab'::text, 'received_from_lab'::text, 'mounted'::text, 'quality_check'::text, 'ready_for_pickup'::text, 'delivered'::text, 'cancelled'::text, 'returned'::text])))
);


-- Name: TABLE lab_work_orders; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.customer_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.lens_family_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.customer_own_frame; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.presbyopia_solution; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.far_lens_family_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_lens_family_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.far_lens_cost; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_lens_cost; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.contact_lens_family_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.contact_lens_quantity; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_frame_product_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_frame_name; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_frame_brand; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_frame_model; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_frame_color; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_frame_size; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_frame_sku; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_frame_price; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_frame_price_includes_tax; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.near_frame_cost; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.customer_own_near_frame; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.agreement_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lab_work_orders.lens_sourcing_type; Type: COMMENT; Schema: public; Owner: -



-- Name: CONSTRAINT lab_work_orders_status_check ON lab_work_orders; Type: COMMENT; Schema: public; Owner: -



-- Name: lead_activities; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.lead_activities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lead_id uuid NOT NULL,
    activity_type text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT valid_activity_type CHECK ((activity_type = ANY (ARRAY['lead_created'::text, 'email_sent'::text, 'email_opened'::text, 'email_clicked'::text, 'email_bounced'::text, 'demo_accessed'::text, 'demo_login'::text, 'meeting_scheduled'::text, 'meeting_completed'::text, 'meeting_cancelled'::text, 'call_logged'::text, 'note_added'::text, 'stage_changed'::text, 'score_updated'::text, 'assigned'::text, 'outbound_call'::text, 'pricing_sent'::text, 'proposal_viewed'::text, 'manual_email_sent'::text])))
);


-- Name: TABLE lead_activities; Type: COMMENT; Schema: public; Owner: -



-- Name: lead_scoring_logs; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.lead_scoring_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lead_id uuid NOT NULL,
    activity_type text NOT NULL,
    points_before integer NOT NULL,
    points_after integer NOT NULL,
    change_reason text,
    calculated_at timestamp with time zone DEFAULT now()
);


-- Name: TABLE lead_scoring_logs; Type: COMMENT; Schema: public; Owner: -



-- Name: lead_scoring_rules; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.lead_scoring_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    activity_type text NOT NULL,
    points integer NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


-- Name: TABLE lead_scoring_rules; Type: COMMENT; Schema: public; Owner: -



-- Name: lens_families; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.lens_families (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    brand text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    lens_type text NOT NULL,
    lens_material text NOT NULL,
    organization_id uuid,
    category_id uuid,
    is_stock_available boolean DEFAULT false,
    stock_sphere_min numeric(5,2) DEFAULT '-10.00'::numeric,
    stock_sphere_max numeric(5,2) DEFAULT 10.00,
    stock_cylinder_min numeric(5,2) DEFAULT '-4.00'::numeric,
    stock_cylinder_max numeric(5,2) DEFAULT 4.00,
    CONSTRAINT lens_families_lens_material_check CHECK ((lens_material = ANY (ARRAY['cr39'::text, 'polycarbonate'::text, 'high_index_1_67'::text, 'high_index_1_74'::text, 'trivex'::text, 'glass'::text]))),
    CONSTRAINT lens_families_lens_type_check CHECK ((lens_type = ANY (ARRAY['single_vision'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text, 'reading'::text, 'computer'::text, 'sports'::text])))
);


-- Name: TABLE lens_families; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lens_families.lens_type; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lens_families.lens_material; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lens_families.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lens_families.is_stock_available; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lens_families.stock_sphere_min; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lens_families.stock_sphere_max; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lens_families.stock_cylinder_min; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lens_families.stock_cylinder_max; Type: COMMENT; Schema: public; Owner: -



-- Name: lens_price_matrices; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.lens_price_matrices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lens_family_id uuid NOT NULL,
    sphere_min numeric(5,2) NOT NULL,
    sphere_max numeric(5,2) NOT NULL,
    base_price numeric(10,2) NOT NULL,
    sourcing_type text DEFAULT 'surfaced'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cylinder_min numeric(5,2) NOT NULL,
    cylinder_max numeric(5,2) NOT NULL,
    cost numeric(10,2) NOT NULL,
    addition_min numeric(5,2) DEFAULT 0,
    addition_max numeric(5,2) DEFAULT 4.0,
    organization_id uuid,
    name text,
    CONSTRAINT lens_price_matrices_sourcing_type_check CHECK ((sourcing_type = ANY (ARRAY['stock'::text, 'surfaced'::text]))),
    CONSTRAINT lens_price_matrices_valid_cylinder_range CHECK ((cylinder_min <= cylinder_max)),
    CONSTRAINT lens_price_matrices_valid_sphere_range CHECK ((sphere_min <= sphere_max)),
    CONSTRAINT valid_addition_range CHECK ((addition_min <= addition_max)),
    CONSTRAINT valid_sphere_range CHECK ((sphere_min <= sphere_max))
);


-- Name: TABLE lens_price_matrices; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lens_price_matrices.sourcing_type; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN lens_price_matrices.name; Type: COMMENT; Schema: public; Owner: -



-- Name: memory_facts; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.memory_facts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    fact_type text NOT NULL,
    category text,
    content text NOT NULL,
    importance integer DEFAULT 5,
    embedding public.vector(768),
    embedding_small public.vector(384),
    embedding_provider text,
    source_session_id uuid,
    source_message_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    last_accessed_at timestamp with time zone DEFAULT now(),
    CONSTRAINT memory_facts_importance_check CHECK (((importance >= 1) AND (importance <= 10)))
);


-- Name: TABLE memory_facts; Type: COMMENT; Schema: public; Owner: -



-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -

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


-- Name: TABLE notification_settings; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN notification_settings.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN notification_settings.branch_id; Type: COMMENT; Schema: public; Owner: -



-- Name: operativo_mobile_stock; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.operativo_mobile_stock (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_operation_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT operativo_mobile_stock_quantity_check CHECK ((quantity >= 0)),
    CONSTRAINT operativo_mobile_stock_reserved_quantity_check CHECK ((reserved_quantity >= 0))
);


-- Name: operativo_sync_queue; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.operativo_sync_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id text NOT NULL,
    field_operation_id uuid NOT NULL,
    entity_type text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    synced_at timestamp with time zone,
    CONSTRAINT operativo_sync_queue_entity_type_check CHECK ((entity_type = ANY (ARRAY['customer'::text, 'prescription'::text, 'lab_work_order'::text, 'payment'::text]))),
    CONSTRAINT operativo_sync_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'syncing'::text, 'synced'::text, 'failed'::text])))
);


-- Name: optical_internal_support_messages; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.optical_internal_support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    message text NOT NULL,
    is_internal boolean DEFAULT false,
    sender_id uuid,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    sender_role text,
    attachments jsonb DEFAULT '[]'::jsonb,
    message_type text DEFAULT 'message'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT optical_internal_support_messages_message_type_check CHECK ((message_type = ANY (ARRAY['message'::text, 'note'::text, 'status_change'::text, 'assignment'::text, 'resolution'::text])))
);


-- Name: TABLE optical_internal_support_messages; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN optical_internal_support_messages.is_internal; Type: COMMENT; Schema: public; Owner: -



-- Name: optical_internal_support_tickets; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.optical_internal_support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number text NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid,
    customer_id uuid,
    customer_name text,
    customer_email text,
    customer_phone text,
    related_order_id uuid,
    related_work_order_id uuid,
    related_appointment_id uuid,
    related_quote_id uuid,
    created_by_user_id uuid,
    created_by_name text,
    created_by_role text,
    subject text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    assigned_to uuid,
    assigned_at timestamp with time zone,
    resolution text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    resolution_notes text,
    first_response_at timestamp with time zone,
    last_response_at timestamp with time zone,
    response_time_minutes integer,
    resolution_time_minutes integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT optical_internal_support_tickets_category_check CHECK ((category = ANY (ARRAY['lens_issue'::text, 'frame_issue'::text, 'prescription_issue'::text, 'delivery_issue'::text, 'payment_issue'::text, 'appointment_issue'::text, 'customer_complaint'::text, 'quality_issue'::text, 'other'::text]))),
    CONSTRAINT optical_internal_support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT optical_internal_support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'assigned'::text, 'in_progress'::text, 'waiting_customer'::text, 'resolved'::text, 'closed'::text])))
);


-- Name: TABLE optical_internal_support_tickets; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN optical_internal_support_tickets.ticket_number; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN optical_internal_support_tickets.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN optical_internal_support_tickets.branch_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN optical_internal_support_tickets.customer_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN optical_internal_support_tickets.created_by_user_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN optical_internal_support_tickets.resolution_notes; Type: COMMENT; Schema: public; Owner: -



-- Name: opticas_access_tokens; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.opticas_access_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    label text
);


-- Name: TABLE opticas_access_tokens; Type: COMMENT; Schema: public; Owner: -



-- Name: order_items; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    variant_id uuid,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    product_name text NOT NULL,
    variant_title text,
    sku text,
    weight numeric(8,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


-- Name: order_payments; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.order_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    payment_reference text,
    paid_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    pos_session_id uuid,
    CONSTRAINT order_payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT order_payments_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'debit'::text, 'credit'::text, 'transfer'::text, 'check'::text])))
);


-- Name: TABLE order_payments; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN order_payments.amount; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN order_payments.payment_method; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN order_payments.payment_reference; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN order_payments.pos_session_id; Type: COMMENT; Schema: public; Owner: -



-- Name: orders; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number text NOT NULL,
    user_id uuid,
    email text NOT NULL,
    status text DEFAULT 'pending'::text,
    payment_status text DEFAULT 'pending'::text,
    fulfillment_status text DEFAULT 'unfulfilled'::text,
    subtotal numeric(12,2) NOT NULL,
    tax_amount numeric(12,2) DEFAULT 0,
    shipping_amount numeric(12,2) DEFAULT 0,
    discount_amount numeric(12,2) DEFAULT 0,
    total_amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'ARS'::text NOT NULL,
    mp_payment_id text,
    mp_preference_id text,
    mp_payment_method text,
    mp_payment_type text,
    mp_status text,
    mp_status_detail text,
    customer_notes text,
    shipping_first_name text,
    shipping_last_name text,
    shipping_company text,
    shipping_address_1 text,
    shipping_address_2 text,
    shipping_city text,
    shipping_state text,
    shipping_postal_code text,
    shipping_country text DEFAULT 'Argentina'::text,
    shipping_phone text,
    billing_first_name text,
    billing_last_name text,
    billing_company text,
    billing_address_1 text,
    billing_address_2 text,
    billing_city text,
    billing_state text,
    billing_postal_code text,
    billing_country text DEFAULT 'Argentina'::text,
    billing_phone text,
    tracking_number text,
    carrier text,
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_pos_sale boolean DEFAULT false,
    pos_terminal_id text,
    pos_cashier_id uuid,
    pos_location text,
    payment_method_type text,
    card_machine_transaction_id text,
    card_machine_authorization_code text,
    card_machine_brand text,
    card_last_four_digits text,
    installments_count integer DEFAULT 1,
    installment_amount numeric(12,2),
    first_installment_due_date timestamp with time zone,
    sii_invoice_type text,
    sii_rut text,
    sii_business_name text,
    sii_address text,
    sii_commune text,
    sii_city text,
    sii_invoice_number text,
    sii_dte_number text,
    sii_track_id text,
    sii_status text DEFAULT 'pending'::text,
    sii_sent_at timestamp with time zone,
    sii_response jsonb,
    tax_breakdown jsonb,
    pos_session_id uuid,
    mercadopago_preference_id character varying(255),
    mercadopago_payment_id bigint,
    payment_method character varying(100),
    installments integer DEFAULT 1,
    branch_id uuid,
    document_type text,
    internal_folio text,
    sii_folio text,
    pdf_url text,
    cancellation_reason text,
    customer_name text,
    organization_id uuid,
    customer_id uuid,
    agreement_id uuid,
    purchase_order_id uuid,
    copago_amount numeric(12,2),
    institutional_amount numeric(12,2),
    field_operation_id uuid,
    CONSTRAINT orders_document_type_check CHECK ((document_type = ANY (ARRAY['internal_ticket'::text, 'boleta_electronica'::text, 'factura_electronica'::text, 'internal_ticket_cancelled'::text]))),
    CONSTRAINT orders_fulfillment_status_check CHECK ((fulfillment_status = ANY (ARRAY['unfulfilled'::text, 'partial'::text, 'fulfilled'::text]))),
    CONSTRAINT orders_payment_method_type_check CHECK ((payment_method_type = ANY (ARRAY['cash'::text, 'debit_card'::text, 'credit_card'::text, 'installments'::text, 'transfer'::text, 'check'::text, 'mercadopago'::text, 'other'::text, 'deposit'::text, 'card'::text]))),
    CONSTRAINT orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text, 'partially_refunded'::text, 'partial'::text, 'on_hold_payment'::text]))),
    CONSTRAINT orders_sii_invoice_type_check CHECK ((sii_invoice_type = ANY (ARRAY['boleta'::text, 'factura'::text, 'none'::text]))),
    CONSTRAINT orders_sii_status_check CHECK ((sii_status = ANY (ARRAY['pending'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text])))
);


-- Name: COLUMN orders.currency; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.is_pos_sale; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.sii_invoice_type; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.sii_rut; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.sii_dte_number; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.sii_status; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.pos_session_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.mercadopago_preference_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.mercadopago_payment_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.payment_method; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.installments; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.branch_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.document_type; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.internal_folio; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.sii_folio; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.pdf_url; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.cancellation_reason; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.customer_name; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.agreement_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.copago_amount; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN orders.institutional_amount; Type: COMMENT; Schema: public; Owner: -



-- Name: CONSTRAINT orders_payment_method_type_check ON orders; Type: COMMENT; Schema: public; Owner: -



-- Name: CONSTRAINT orders_payment_status_check ON orders; Type: COMMENT; Schema: public; Owner: -



-- Name: organization_settings; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.organization_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    min_deposit_percent numeric(5,2) DEFAULT 50.00,
    min_deposit_amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    business_name text,
    business_rut text,
    business_address text,
    business_phone text,
    business_email text,
    logo_url text,
    header_text text,
    footer_text text,
    terms_and_conditions text,
    default_document_type text DEFAULT 'boleta'::text,
    printer_type text DEFAULT 'thermal'::text,
    printer_width_mm numeric(10,2) DEFAULT 80,
    printer_height_mm numeric(10,2) DEFAULT 297,
    auto_print_receipt boolean DEFAULT true,
    currency text,
    country text
);


-- Name: TABLE organization_settings; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organization_settings.min_deposit_percent; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organization_settings.min_deposit_amount; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organization_settings.auto_print_receipt; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organization_settings.currency; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organization_settings.country; Type: COMMENT; Schema: public; Owner: -



-- Name: organizations; Type: TABLE; Schema: public; Owner: -

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
    CONSTRAINT chk_organizations_scheduled_tier CHECK (((scheduled_tier IS NULL) OR (scheduled_tier = ANY (ARRAY['basic'::text, 'pro'::text, 'premium'::text])))),
    CONSTRAINT organizations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'cancelled'::text]))),
    CONSTRAINT organizations_subscription_tier_check CHECK ((subscription_tier = ANY (ARRAY['basic'::text, 'pro'::text, 'premium'::text])))
);


-- Name: TABLE organizations; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organizations.slug; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organizations.subscription_tier; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organizations.status; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organizations.slogan; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organizations.logo_url; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organizations.trial_days_override; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organizations.scheduled_tier; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN organizations.scheduled_tier_effective_at; Type: COMMENT; Schema: public; Owner: -



-- Name: payment_gateways_config; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.payment_gateways_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gateway_id text NOT NULL,
    name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    icon_name text,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: payment_installments; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.payment_installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    installment_number integer NOT NULL,
    due_date timestamp with time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    paid_amount numeric(12,2) DEFAULT 0,
    payment_status text DEFAULT 'pending'::text,
    paid_at timestamp with time zone,
    payment_method text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_installments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payment_installments_installment_number_check CHECK ((installment_number > 0)),
    CONSTRAINT payment_installments_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])))
);


-- Name: TABLE payment_installments; Type: COMMENT; Schema: public; Owner: -



-- Name: payments; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    organization_id uuid NOT NULL,
    user_id uuid,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'CLP'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    gateway text NOT NULL,
    gateway_transaction_id text,
    gateway_payment_intent_id text,
    gateway_charge_id text,
    payment_method text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    mp_preference_id text,
    mp_payment_id text,
    mp_merchant_order_id text,
    mp_payment_type text,
    mp_payment_method text,
    CONSTRAINT payments_gateway_check CHECK ((gateway = ANY (ARRAY['flow'::text, 'mercadopago'::text, 'paypal'::text, 'nowpayments'::text]))),
    CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'refunded'::text])))
);


-- Name: TABLE payments; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN payments.gateway_transaction_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN payments.gateway_payment_intent_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN payments.gateway_charge_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN payments.mp_preference_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN payments.mp_payment_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN payments.mp_merchant_order_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN payments.mp_payment_type; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN payments.mp_payment_method; Type: COMMENT; Schema: public; Owner: -



-- Name: pos_sale_idempotency; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.pos_sale_idempotency (
    idempotency_key uuid NOT NULL,
    order_id uuid NOT NULL,
    work_order_id uuid,
    response_snapshot jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: TABLE pos_sale_idempotency; Type: COMMENT; Schema: public; Owner: -



-- Name: pos_sessions; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.pos_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cashier_id uuid NOT NULL,
    terminal_id text,
    location text,
    opening_cash_amount numeric(12,2) DEFAULT 0,
    closing_cash_amount numeric(12,2),
    opening_time timestamp with time zone DEFAULT now() NOT NULL,
    closing_time timestamp with time zone,
    status text DEFAULT 'open'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reopened_at timestamp with time zone,
    reopened_by uuid,
    reopen_count integer DEFAULT 0,
    branch_id uuid,
    field_operation_id uuid,
    CONSTRAINT pos_sessions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'suspended'::text])))
);


-- Name: TABLE pos_sessions; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN pos_sessions.reopened_at; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN pos_sessions.reopened_by; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN pos_sessions.reopen_count; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN pos_sessions.branch_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN pos_sessions.field_operation_id; Type: COMMENT; Schema: public; Owner: -



-- Name: pos_settings; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.pos_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    min_deposit_percent numeric(5,2) DEFAULT 50.00,
    min_deposit_amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    organization_id uuid,
    business_name text,
    business_rut text,
    business_address text,
    business_phone text,
    business_email text,
    logo_url text,
    header_text text,
    footer_text text,
    terms_and_conditions text,
    default_document_type text DEFAULT 'boleta'::text,
    printer_type text DEFAULT 'thermal'::text,
    printer_width_mm numeric(10,2) DEFAULT 80,
    printer_height_mm numeric(10,2) DEFAULT 297,
    auto_print_receipt boolean DEFAULT true
);


-- Name: TABLE pos_settings; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN pos_settings.min_deposit_percent; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN pos_settings.min_deposit_amount; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN pos_settings.auto_print_receipt; Type: COMMENT; Schema: public; Owner: -



-- Name: pos_transactions; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    pos_session_id uuid,
    transaction_type text NOT NULL,
    payment_method text NOT NULL,
    amount numeric(12,2) NOT NULL,
    change_amount numeric(12,2) DEFAULT 0,
    card_machine_transaction_id text,
    card_machine_authorization_code text,
    receipt_printed boolean DEFAULT false,
    receipt_number text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pos_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['sale'::text, 'refund'::text, 'void'::text, 'return'::text])))
);


-- Name: TABLE pos_transactions; Type: COMMENT; Schema: public; Owner: -



-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    prescription_date date DEFAULT CURRENT_DATE NOT NULL,
    expiration_date date,
    prescription_number text,
    issued_by text,
    issued_by_license text,
    od_sphere numeric(5,2),
    od_cylinder numeric(5,2),
    od_axis integer,
    od_add numeric(5,2),
    od_pd numeric(4,1),
    od_near_pd numeric(4,1),
    os_sphere numeric(5,2),
    os_cylinder numeric(5,2),
    os_axis integer,
    os_add numeric(5,2),
    os_pd numeric(4,1),
    os_near_pd numeric(4,1),
    frame_pd numeric(4,1),
    height_segmentation numeric(4,1),
    prescription_type text,
    lens_type text,
    lens_material text,
    prism_od text,
    prism_os text,
    tint_od text,
    tint_os text,
    coatings text[],
    notes text,
    observations text,
    recommendations text,
    is_active boolean DEFAULT true,
    is_current boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    organization_id uuid,
    branch_id uuid,
    field_operation_id uuid,
    CONSTRAINT prescriptions_od_axis_check CHECK (((od_axis >= 0) AND (od_axis <= 180))),
    CONSTRAINT prescriptions_os_axis_check CHECK (((os_axis >= 0) AND (os_axis <= 180))),
    CONSTRAINT prescriptions_prescription_type_check CHECK ((prescription_type = ANY (ARRAY['single_vision'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text, 'reading'::text, 'computer'::text, 'sports'::text])))
);


-- Name: TABLE prescriptions; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN prescriptions.customer_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN prescriptions.od_sphere; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN prescriptions.od_axis; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN prescriptions.od_pd; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN prescriptions.os_sphere; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN prescriptions.os_axis; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN prescriptions.os_pd; Type: COMMENT; Schema: public; Owner: -



-- Name: product_branch_stock; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.product_branch_stock (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0 NOT NULL,
    low_stock_threshold integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    available_quantity integer GENERATED ALWAYS AS (GREATEST(0, (quantity - COALESCE(reserved_quantity, 0)))) STORED,
    reorder_point integer,
    last_stock_movement timestamp with time zone
);


-- Name: TABLE product_branch_stock; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN product_branch_stock.quantity; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN product_branch_stock.reserved_quantity; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN product_branch_stock.low_stock_threshold; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN product_branch_stock.available_quantity; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN product_branch_stock.reorder_point; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN product_branch_stock.last_stock_movement; Type: COMMENT; Schema: public; Owner: -



-- Name: product_option_fields; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.product_option_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_key text NOT NULL,
    field_label text NOT NULL,
    field_category text NOT NULL,
    is_array boolean DEFAULT false,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    form_type text DEFAULT 'product'::text NOT NULL
);


-- Name: product_option_values; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.product_option_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_id uuid NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


-- Name: product_variants; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.product_variants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    title text NOT NULL,
    sku text,
    price numeric(10,2) NOT NULL,
    compare_at_price numeric(10,2),
    cost_price numeric(10,2),
    inventory_quantity integer DEFAULT 0,
    weight numeric(8,2),
    barcode text,
    image_url text,
    option1 text,
    option2 text,
    option3 text,
    "position" integer DEFAULT 0,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: products; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    short_description text,
    price numeric(10,2) NOT NULL,
    compare_at_price numeric(10,2),
    cost_price numeric(10,2),
    currency text DEFAULT 'ARS'::text NOT NULL,
    sku text,
    barcode text,
    weight numeric(8,2),
    dimensions jsonb,
    track_inventory boolean DEFAULT true,
    inventory_quantity integer DEFAULT 0,
    inventory_policy text DEFAULT 'deny'::text,
    low_stock_threshold integer DEFAULT 5,
    featured_image text,
    gallery jsonb,
    video_url text,
    meta_title text,
    meta_description text,
    search_keywords text[],
    ingredients jsonb,
    skin_type text[],
    benefits text[],
    usage_instructions text,
    precautions text,
    certifications text[],
    shelf_life_months integer,
    category_id uuid,
    tags text[],
    collections text[],
    vendor text DEFAULT 'ALKIMYA DA LUZ'::text,
    status text DEFAULT 'draft'::text,
    is_featured boolean DEFAULT false,
    is_digital boolean DEFAULT false,
    requires_shipping boolean DEFAULT true,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_type text DEFAULT 'frame'::text,
    optical_category text,
    frame_type text,
    frame_material text,
    frame_measurements jsonb,
    frame_shape text,
    frame_color text,
    frame_colors text[],
    frame_brand text,
    frame_model text,
    frame_sku text,
    frame_gender text,
    frame_age_group text,
    frame_features text[],
    frame_size text,
    lens_type text,
    lens_material text,
    prescription_available boolean DEFAULT false,
    prescription_range jsonb,
    lens_coatings text[],
    lens_index numeric(3,2),
    uv_protection text,
    blue_light_filter boolean DEFAULT false,
    blue_light_filter_percentage integer,
    photochromic boolean DEFAULT false,
    photochromic_tint_levels jsonb,
    lens_tint_options text[],
    brand text,
    manufacturer text,
    model_number text,
    warranty_months integer,
    warranty_details text,
    compatible_with text[],
    requires_prescription boolean DEFAULT false,
    is_customizable boolean DEFAULT false,
    package_characteristics text,
    branch_id uuid,
    price_includes_tax boolean DEFAULT false,
    organization_id uuid,
    contact_lens_family_id uuid,
    CONSTRAINT products_frame_age_group_check CHECK ((frame_age_group = ANY (ARRAY['adult'::text, 'youth'::text, 'kids'::text, 'senior'::text]))),
    CONSTRAINT products_frame_gender_check CHECK ((frame_gender = ANY (ARRAY['mens'::text, 'womens'::text, 'unisex'::text, 'kids'::text, 'youth'::text]))),
    CONSTRAINT products_frame_material_check CHECK ((frame_material = ANY (ARRAY['acetate'::text, 'metal'::text, 'titanium'::text, 'stainless_steel'::text, 'aluminum'::text, 'carbon_fiber'::text, 'wood'::text, 'horn'::text, 'plastic'::text, 'tr90'::text, 'monel'::text, 'beta_titanium'::text]))),
    CONSTRAINT products_frame_shape_check CHECK ((frame_shape = ANY (ARRAY['round'::text, 'square'::text, 'rectangular'::text, 'oval'::text, 'cat_eye'::text, 'aviator'::text, 'browline'::text, 'geometric'::text, 'shield'::text, 'wrap'::text, 'sport'::text]))),
    CONSTRAINT products_frame_size_check CHECK ((frame_size = ANY (ARRAY['narrow'::text, 'medium'::text, 'wide'::text, 'extra_wide'::text]))),
    CONSTRAINT products_frame_type_check CHECK ((frame_type = ANY (ARRAY['full_frame'::text, 'half_frame'::text, 'rimless'::text, 'semi_rimless'::text, 'browline'::text, 'cat_eye'::text, 'aviator'::text, 'round'::text, 'square'::text, 'rectangular'::text, 'oval'::text, 'geometric'::text]))),
    CONSTRAINT products_inventory_policy_check CHECK ((inventory_policy = ANY (ARRAY['continue'::text, 'deny'::text]))),
    CONSTRAINT products_lens_material_check CHECK ((lens_material = ANY (ARRAY['cr39'::text, 'polycarbonate'::text, 'high_index_1_67'::text, 'high_index_1_74'::text, 'trivex'::text, 'glass'::text, 'photochromic'::text]))),
    CONSTRAINT products_lens_type_check CHECK ((lens_type = ANY (ARRAY['single_vision'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text, 'reading'::text, 'computer'::text, 'driving'::text, 'sports'::text, 'photochromic'::text, 'polarized'::text]))),
    CONSTRAINT products_optical_category_check CHECK ((optical_category = ANY (ARRAY['sunglasses'::text, 'prescription_glasses'::text, 'reading_glasses'::text, 'safety_glasses'::text, 'contact_lenses'::text, 'accessories'::text, 'services'::text]))),
    CONSTRAINT products_product_type_check CHECK ((product_type = ANY (ARRAY['frame'::text, 'lens'::text, 'accessory'::text, 'service'::text, 'contact_lens'::text]))),
    CONSTRAINT products_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]))),
    CONSTRAINT products_uv_protection_check CHECK ((uv_protection = ANY (ARRAY['none'::text, 'uv400'::text, 'uv380'::text, 'uv350'::text])))
);


-- Name: COLUMN products.track_inventory; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN products.inventory_quantity; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN products.low_stock_threshold; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN products.product_type; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN products.frame_measurements; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN products.prescription_range; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN products.lens_index; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN products.package_characteristics; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN products.branch_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN products.price_includes_tax; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN products.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN products.contact_lens_family_id; Type: COMMENT; Schema: public; Owner: -



-- Name: CONSTRAINT products_product_type_check ON products; Type: COMMENT; Schema: public; Owner: -



-- Name: products_with_stock; Type: VIEW; Schema: public; Owner: -

CREATE VIEW public.products_with_stock WITH (security_invoker='on') AS
 SELECT id,
    name,
    slug,
    description,
    short_description,
    price,
    compare_at_price,
    cost_price,
    currency,
    sku,
    barcode,
    weight,
    dimensions,
    track_inventory,
    inventory_quantity,
    inventory_policy,
    low_stock_threshold,
    featured_image,
    gallery,
    video_url,
    meta_title,
    meta_description,
    search_keywords,
    ingredients,
    skin_type,
    benefits,
    usage_instructions,
    precautions,
    certifications,
    shelf_life_months,
    category_id,
    tags,
    collections,
    vendor,
    status,
    is_featured,
    is_digital,
    requires_shipping,
    published_at,
    created_at,
    updated_at,
    product_type,
    optical_category,
    frame_type,
    frame_material,
    frame_measurements,
    frame_shape,
    frame_color,
    frame_colors,
    frame_brand,
    frame_model,
    frame_sku,
    frame_gender,
    frame_age_group,
    frame_features,
    frame_size,
    lens_type,
    lens_material,
    prescription_available,
    prescription_range,
    lens_coatings,
    lens_index,
    uv_protection,
    blue_light_filter,
    blue_light_filter_percentage,
    photochromic,
    photochromic_tint_levels,
    lens_tint_options,
    brand,
    manufacturer,
    model_number,
    warranty_months,
    warranty_details,
    compatible_with,
    requires_prescription,
    is_customizable,
    package_characteristics,
    branch_id,
    price_includes_tax,
    organization_id,
    COALESCE(( SELECT sum(pbs.quantity) AS sum
           FROM public.product_branch_stock pbs
          WHERE (pbs.product_id = p.id)), (0)::bigint) AS total_inventory_quantity,
    COALESCE(( SELECT sum(pbs.available_quantity) AS sum
           FROM public.product_branch_stock pbs
          WHERE (pbs.product_id = p.id)), (0)::bigint) AS total_available_quantity
   FROM public.products p;


-- Name: quote_settings; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.quote_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    treatment_prices jsonb DEFAULT '{"tint": 15000, "anti_fog": 8000, "polarized": 25000, "photochromic": 35000, "uv_protection": 10000, "anti_reflective": 15000, "blue_light_filter": 20000, "scratch_resistant": 12000}'::jsonb,
    lens_type_base_costs jsonb DEFAULT '{"sports": 40000, "bifocal": 45000, "reading": 25000, "computer": 35000, "trifocal": 55000, "progressive": 60000, "single_vision": 30000}'::jsonb,
    lens_material_multipliers jsonb DEFAULT '{"cr39": 1.0, "glass": 0.9, "trivex": 1.3, "polycarbonate": 1.2, "high_index_1_67": 1.5, "high_index_1_74": 2.0}'::jsonb,
    default_labor_cost numeric(10,2) DEFAULT 15000,
    default_tax_percentage numeric(5,2) DEFAULT 19.0,
    default_expiration_days integer DEFAULT 30,
    default_margin_percentage numeric(5,2) DEFAULT 0,
    volume_discounts jsonb DEFAULT '[]'::jsonb,
    currency text DEFAULT 'CLP'::text,
    terms_and_conditions text,
    notes_template text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    branch_id uuid,
    labor_cost_includes_tax boolean DEFAULT true,
    lens_cost_includes_tax boolean DEFAULT true,
    treatments_cost_includes_tax boolean DEFAULT true,
    organization_id uuid,
    use_treatments_table boolean DEFAULT false
);


-- Name: TABLE quote_settings; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quote_settings.treatment_prices; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quote_settings.lens_type_base_costs; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quote_settings.lens_material_multipliers; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quote_settings.default_labor_cost; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quote_settings.default_tax_percentage; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quote_settings.default_expiration_days; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quote_settings.volume_discounts; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quote_settings.branch_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quote_settings.labor_cost_includes_tax; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quote_settings.lens_cost_includes_tax; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quote_settings.treatments_cost_includes_tax; Type: COMMENT; Schema: public; Owner: -



-- Name: quotes; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    quote_number text NOT NULL,
    quote_date date DEFAULT CURRENT_DATE NOT NULL,
    expiration_date date,
    prescription_id uuid,
    frame_product_id uuid,
    frame_name text,
    frame_brand text,
    frame_model text,
    frame_color text,
    frame_size text,
    frame_sku text,
    frame_price numeric(10,2) DEFAULT 0,
    lens_type text,
    lens_material text,
    lens_index numeric(3,2),
    lens_treatments text[],
    lens_tint_color text,
    lens_tint_percentage integer,
    frame_cost numeric(10,2) DEFAULT 0,
    lens_cost numeric(10,2) DEFAULT 0,
    treatments_cost numeric(10,2) DEFAULT 0,
    labor_cost numeric(10,2) DEFAULT 0,
    subtotal numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    discount_percentage numeric(5,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'CLP'::text,
    status text DEFAULT 'draft'::text,
    notes text,
    customer_notes text,
    terms_and_conditions text,
    converted_to_work_order_id uuid,
    created_by uuid,
    sent_by uuid,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    original_status text,
    branch_id uuid,
    lens_family_id uuid,
    customer_own_frame boolean DEFAULT false NOT NULL,
    near_frame_product_id uuid,
    near_frame_name text,
    near_frame_brand text,
    near_frame_model text,
    near_frame_color text,
    near_frame_size text,
    near_frame_sku text,
    near_frame_price numeric(10,2) DEFAULT 0,
    near_frame_price_includes_tax boolean DEFAULT false,
    near_frame_cost numeric(10,2) DEFAULT 0,
    customer_own_near_frame boolean DEFAULT false,
    presbyopia_solution text DEFAULT 'none'::text,
    far_lens_family_id uuid,
    near_lens_family_id uuid,
    far_lens_cost numeric(10,2),
    near_lens_cost numeric(10,2),
    organization_id uuid,
    contact_lens_family_id uuid,
    contact_lens_rx_sphere_od numeric(5,2),
    contact_lens_rx_cylinder_od numeric(5,2),
    contact_lens_rx_axis_od integer,
    contact_lens_rx_add_od numeric(5,2),
    contact_lens_rx_base_curve_od numeric(4,2),
    contact_lens_rx_diameter_od numeric(4,2),
    contact_lens_rx_sphere_os numeric(5,2),
    contact_lens_rx_cylinder_os numeric(5,2),
    contact_lens_rx_axis_os integer,
    contact_lens_rx_add_os numeric(5,2),
    contact_lens_rx_base_curve_os numeric(4,2),
    contact_lens_rx_diameter_os numeric(4,2),
    contact_lens_quantity integer DEFAULT 1,
    contact_lens_cost numeric(10,2),
    contact_lens_price numeric(10,2),
    field_operation_id uuid,
    lens_sourcing_type text DEFAULT 'surfaced'::text,
    CONSTRAINT quotes_lens_sourcing_type_check CHECK ((lens_sourcing_type = ANY (ARRAY['stock'::text, 'surfaced'::text]))),
    CONSTRAINT quotes_lens_tint_percentage_check CHECK (((lens_tint_percentage >= 0) AND (lens_tint_percentage <= 100))),
    CONSTRAINT quotes_lens_type_check CHECK (((lens_type IS NULL) OR (lens_type = ANY (ARRAY['single_vision'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text, 'reading'::text, 'computer'::text, 'sports'::text, 'Lentes de contacto'::text])))),
    CONSTRAINT quotes_presbyopia_solution_check CHECK ((presbyopia_solution = ANY (ARRAY['none'::text, 'two_separate'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text]))),
    CONSTRAINT quotes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'converted_to_work'::text])))
);


-- Name: TABLE quotes; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.customer_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.lens_type; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.original_status; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.lens_family_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.customer_own_frame; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_frame_product_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_frame_name; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_frame_brand; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_frame_model; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_frame_color; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_frame_size; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_frame_sku; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_frame_price; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_frame_price_includes_tax; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_frame_cost; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.customer_own_near_frame; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.presbyopia_solution; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.far_lens_family_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_lens_family_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.far_lens_cost; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.near_lens_cost; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.contact_lens_family_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.contact_lens_quantity; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.contact_lens_cost; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN quotes.contact_lens_price; Type: COMMENT; Schema: public; Owner: -



-- Name: saas_audit_log; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.saas_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_email text,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id uuid,
    target_name text,
    old_value jsonb,
    new_value jsonb,
    ip_address text,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


-- Name: TABLE saas_audit_log; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_audit_log.user_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_audit_log.user_email; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_audit_log.action; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_audit_log.target_type; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_audit_log.target_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_audit_log.target_name; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_audit_log.old_value; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_audit_log.new_value; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_audit_log.ip_address; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_audit_log.user_agent; Type: COMMENT; Schema: public; Owner: -



-- Name: saas_backups; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.saas_backups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    filename text NOT NULL,
    storage_path text NOT NULL,
    size_bytes bigint DEFAULT 0 NOT NULL,
    backup_type text DEFAULT 'full'::text NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    source text DEFAULT 'manual'::text,
    CONSTRAINT saas_backups_backup_type_check CHECK ((backup_type = ANY (ARRAY['full'::text, 'manual'::text, 'cron'::text]))),
    CONSTRAINT saas_backups_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'cron'::text, 'github_actions'::text]))),
    CONSTRAINT saas_backups_status_check CHECK ((status = ANY (ARRAY['completed'::text, 'failed'::text, 'in_progress'::text])))
);


-- Name: TABLE saas_backups; Type: COMMENT; Schema: public; Owner: -



-- Name: saas_support_messages; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.saas_support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    message text NOT NULL,
    is_internal boolean DEFAULT false,
    is_from_customer boolean DEFAULT false,
    sender_id uuid,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    message_type text DEFAULT 'message'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT saas_support_messages_message_type_check CHECK ((message_type = ANY (ARRAY['message'::text, 'note'::text, 'status_change'::text, 'assignment'::text, 'resolution'::text])))
);


-- Name: TABLE saas_support_messages; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_support_messages.is_internal; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_support_messages.is_from_customer; Type: COMMENT; Schema: public; Owner: -



-- Name: saas_support_templates; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.saas_support_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text,
    content text NOT NULL,
    category text,
    variables jsonb DEFAULT '[]'::jsonb,
    usage_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: TABLE saas_support_templates; Type: COMMENT; Schema: public; Owner: -



-- Name: saas_support_tickets; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.saas_support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number text NOT NULL,
    organization_id uuid,
    created_by_user_id uuid,
    requester_email text NOT NULL,
    requester_name text,
    requester_role text,
    subject text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    assigned_to uuid,
    assigned_at timestamp with time zone,
    resolution text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    first_response_at timestamp with time zone,
    last_response_at timestamp with time zone,
    response_time_minutes integer,
    resolution_time_minutes integer,
    customer_satisfaction_rating integer,
    customer_feedback text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT saas_support_tickets_category_check CHECK ((category = ANY (ARRAY['technical'::text, 'billing'::text, 'feature_request'::text, 'bug_report'::text, 'account'::text, 'other'::text]))),
    CONSTRAINT saas_support_tickets_customer_satisfaction_rating_check CHECK (((customer_satisfaction_rating >= 1) AND (customer_satisfaction_rating <= 5))),
    CONSTRAINT saas_support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT saas_support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'assigned'::text, 'in_progress'::text, 'waiting_customer'::text, 'resolved'::text, 'closed'::text])))
);


-- Name: TABLE saas_support_tickets; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_support_tickets.ticket_number; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_support_tickets.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_support_tickets.created_by_user_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_support_tickets.requester_email; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN saas_support_tickets.requester_role; Type: COMMENT; Schema: public; Owner: -



-- Name: schedule_settings; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.schedule_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_duration_minutes integer DEFAULT 15,
    default_appointment_duration integer DEFAULT 30,
    buffer_time_minutes integer DEFAULT 0,
    working_hours jsonb DEFAULT '{"friday": {"enabled": true, "end_time": "18:00", "lunch_end": null, "start_time": "09:00", "lunch_start": null}, "monday": {"enabled": true, "end_time": "18:00", "lunch_end": null, "start_time": "09:00", "lunch_start": null}, "sunday": {"enabled": false, "end_time": "13:00", "lunch_end": null, "start_time": "09:00", "lunch_start": null}, "tuesday": {"enabled": true, "end_time": "18:00", "lunch_end": null, "start_time": "09:00", "lunch_start": null}, "saturday": {"enabled": false, "end_time": "13:00", "lunch_end": null, "start_time": "09:00", "lunch_start": null}, "thursday": {"enabled": true, "end_time": "18:00", "lunch_end": null, "start_time": "09:00", "lunch_start": null}, "wednesday": {"enabled": true, "end_time": "18:00", "lunch_end": null, "start_time": "09:00", "lunch_start": null}}'::jsonb,
    blocked_dates date[] DEFAULT '{}'::date[],
    min_advance_booking_hours integer DEFAULT 2,
    max_advance_booking_days integer DEFAULT 90,
    staff_specific_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    branch_id uuid,
    organization_id uuid,
    CONSTRAINT schedule_settings_buffer_time_minutes_check CHECK ((buffer_time_minutes >= 0)),
    CONSTRAINT schedule_settings_default_appointment_duration_check CHECK ((default_appointment_duration > 0)),
    CONSTRAINT schedule_settings_max_advance_booking_days_check CHECK ((max_advance_booking_days > 0)),
    CONSTRAINT schedule_settings_min_advance_booking_hours_check CHECK ((min_advance_booking_hours >= 0)),
    CONSTRAINT schedule_settings_slot_duration_minutes_check CHECK ((slot_duration_minutes > 0))
);


-- Name: TABLE schedule_settings; Type: COMMENT; Schema: public; Owner: -



-- Name: subscription_tiers; Type: TABLE; Schema: public; Owner: -

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
    CONSTRAINT subscription_tiers_name_check CHECK ((name = ANY (ARRAY['basic'::text, 'pro'::text, 'premium'::text])))
);


-- Name: TABLE subscription_tiers; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN subscription_tiers.max_customers; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN subscription_tiers.max_products; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN subscription_tiers.gateway_plan_id; Type: COMMENT; Schema: public; Owner: -



-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -

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
    CONSTRAINT subscriptions_gateway_check CHECK ((gateway = ANY (ARRAY['flow'::text, 'mercadopago'::text, 'paypal'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'past_due'::text, 'cancelled'::text, 'trialing'::text, 'incomplete'::text])))
);


-- Name: TABLE subscriptions; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN subscriptions.gateway_subscription_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN subscriptions.gateway_customer_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN subscriptions.trial_ends_at; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN subscriptions.gateway_payment_method_id; Type: COMMENT; Schema: public; Owner: -



-- Name: support_categories; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.support_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid
);


-- Name: TABLE support_categories; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN support_categories.branch_id; Type: COMMENT; Schema: public; Owner: -



-- Name: support_messages; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    message text NOT NULL,
    is_internal boolean DEFAULT false,
    is_from_customer boolean DEFAULT false,
    sender_id uuid,
    sender_name text,
    sender_email text,
    attachments jsonb,
    message_type text DEFAULT 'message'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_messages_message_type_check CHECK ((message_type = ANY (ARRAY['message'::text, 'note'::text, 'status_change'::text, 'assignment'::text])))
);


-- Name: TABLE support_messages; Type: COMMENT; Schema: public; Owner: -



-- Name: support_templates; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.support_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text,
    content text NOT NULL,
    category_id uuid,
    variables jsonb,
    usage_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: TABLE support_templates; Type: COMMENT; Schema: public; Owner: -



-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number text NOT NULL,
    customer_id uuid,
    customer_email text NOT NULL,
    customer_name text,
    subject text NOT NULL,
    description text NOT NULL,
    category_id uuid,
    priority public.support_priority DEFAULT 'medium'::public.support_priority,
    status public.support_status DEFAULT 'open'::public.support_status,
    assigned_to uuid,
    assigned_at timestamp with time zone,
    order_id uuid,
    resolution text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    first_response_at timestamp with time zone,
    last_response_at timestamp with time zone,
    customer_satisfaction_rating integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT support_tickets_customer_satisfaction_rating_check CHECK (((customer_satisfaction_rating >= 1) AND (customer_satisfaction_rating <= 5)))
);


-- Name: TABLE support_tickets; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN support_tickets.branch_id; Type: COMMENT; Schema: public; Owner: -



-- Name: support_ticket_stats; Type: VIEW; Schema: public; Owner: -

CREATE VIEW public.support_ticket_stats WITH (security_invoker='on') AS
 SELECT count(*) AS total_tickets,
    count(*) FILTER (WHERE (status = 'open'::public.support_status)) AS open_tickets,
    count(*) FILTER (WHERE (status = 'in_progress'::public.support_status)) AS in_progress_tickets,
    count(*) FILTER (WHERE (status = 'pending_customer'::public.support_status)) AS pending_customer_tickets,
    count(*) FILTER (WHERE (status = 'resolved'::public.support_status)) AS resolved_tickets,
    count(*) FILTER (WHERE (status = 'closed'::public.support_status)) AS closed_tickets,
    count(*) FILTER (WHERE (priority = 'urgent'::public.support_priority)) AS urgent_tickets,
    count(*) FILTER (WHERE (priority = 'high'::public.support_priority)) AS high_priority_tickets,
    count(*) FILTER (WHERE (created_at >= (CURRENT_DATE - '7 days'::interval))) AS tickets_this_week,
    count(*) FILTER (WHERE (created_at >= (CURRENT_DATE - '30 days'::interval))) AS tickets_this_month,
    avg((EXTRACT(epoch FROM (resolved_at - created_at)) / (3600)::numeric)) FILTER (WHERE (resolved_at IS NOT NULL)) AS avg_resolution_time_hours
   FROM public.support_tickets;


-- Name: VIEW support_ticket_stats; Type: COMMENT; Schema: public; Owner: -



-- Name: survey_invitations; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.survey_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    organization_id uuid NOT NULL,
    work_order_id uuid NOT NULL,
    customer_id uuid,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: TABLE survey_invitations; Type: COMMENT; Schema: public; Owner: -



-- Name: system_config; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.system_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    config_value jsonb NOT NULL,
    description text,
    category text DEFAULT 'general'::text NOT NULL,
    is_public boolean DEFAULT false,
    is_sensitive boolean DEFAULT false,
    value_type text DEFAULT 'string'::text,
    validation_rules jsonb,
    last_modified_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    branch_id uuid,
    CONSTRAINT system_config_value_type_check CHECK ((value_type = ANY (ARRAY['string'::text, 'number'::text, 'boolean'::text, 'json'::text, 'array'::text])))
);


-- Name: TABLE system_config; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN system_config.organization_id; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN system_config.branch_id; Type: COMMENT; Schema: public; Owner: -



-- Name: system_email_templates; Type: TABLE; Schema: public; Owner: -

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


-- Name: TABLE system_email_templates; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN system_email_templates.template_group; Type: COMMENT; Schema: public; Owner: -



-- Name: system_health_metrics; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.system_health_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric(12,4) NOT NULL,
    metric_unit text,
    category text DEFAULT 'general'::text NOT NULL,
    subcategory text,
    threshold_warning numeric(12,4),
    threshold_critical numeric(12,4),
    is_healthy boolean DEFAULT true,
    metadata jsonb,
    collected_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval)
);


-- Name: TABLE system_health_metrics; Type: COMMENT; Schema: public; Owner: -



-- Name: system_maintenance_log; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.system_maintenance_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_type text NOT NULL,
    task_name text NOT NULL,
    status text DEFAULT 'pending'::text,
    description text,
    parameters jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_seconds integer,
    result_data jsonb,
    error_message text,
    executed_by uuid,
    automated boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT system_maintenance_log_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT system_maintenance_log_task_type_check CHECK ((task_type = ANY (ARRAY['backup'::text, 'cleanup'::text, 'migration'::text, 'optimization'::text, 'security_scan'::text, 'health_check'::text, 'update'::text, 'custom'::text])))
);


-- Name: TABLE system_maintenance_log; Type: COMMENT; Schema: public; Owner: -



-- Name: telemetry_aggregates; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.telemetry_aggregates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    date date NOT NULL,
    period text NOT NULL,
    total_events bigint DEFAULT 0,
    unique_users bigint DEFAULT 0,
    unique_sessions bigint DEFAULT 0,
    feature_usage jsonb,
    avg_response_time numeric,
    error_rate numeric,
    page_views jsonb,
    CONSTRAINT telemetry_aggregates_period_check CHECK ((period = ANY (ARRAY['hourly'::text, 'daily'::text, 'weekly'::text, 'monthly'::text])))
);


-- Name: telemetry_config; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.telemetry_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    enabled boolean DEFAULT true,
    sampling_rate numeric(3,2) DEFAULT 1.00,
    retention_days integer DEFAULT 90,
    anonymize_ip boolean DEFAULT true,
    exclude_sensitive_paths text[],
    track_page_views boolean DEFAULT true,
    track_feature_usage boolean DEFAULT true,
    track_performance boolean DEFAULT true,
    track_errors boolean DEFAULT true,
    CONSTRAINT telemetry_config_sampling_rate_check CHECK (((sampling_rate >= (0)::numeric) AND (sampling_rate <= (1)::numeric)))
);


-- Name: telemetry_events; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    event_type text NOT NULL,
    event_name text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    organization_id uuid,
    session_id text,
    payload jsonb,
    user_agent text,
    ip_address inet,
    device_type text,
    browser text,
    os text,
    screen_size text,
    page_url text,
    referrer text,
    duration integer,
    performance_data jsonb,
    processed boolean DEFAULT false,
    processed_at timestamp with time zone
);


-- Name: tier_change_audit; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.tier_change_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    from_tier text NOT NULL,
    to_tier text NOT NULL,
    changed_by_user_id uuid,
    source text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tier_change_audit_source_check CHECK ((source = ANY (ARRAY['root'::text, 'org_user'::text, 'checkout'::text, 'scheduled_job'::text])))
);


-- Name: TABLE tier_change_audit; Type: COMMENT; Schema: public; Owner: -



-- Name: treatments; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    treatment_key text NOT NULL,
    description text,
    category text,
    treatment_type text DEFAULT 'lab_applied'::text NOT NULL,
    applied_in text DEFAULT 'local_lab'::text,
    material_compatibility text[] DEFAULT ARRAY['cr39'::text, 'polycarbonate'::text, 'high_index_1_67'::text, 'high_index_1_74'::text, 'trivex'::text, 'glass'::text],
    lens_type_compatibility text[] DEFAULT ARRAY['single_vision'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text, 'reading'::text, 'computer'::text, 'sports'::text],
    default_price numeric(10,2) NOT NULL,
    price_override jsonb,
    exclusions jsonb DEFAULT '{"excludes": [], "requires": [], "incompatible_with_material": []}'::jsonb,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT treatments_applied_in_check CHECK ((applied_in = ANY (ARRAY['factory'::text, 'local_lab'::text, 'both'::text]))),
    CONSTRAINT treatments_category_check CHECK ((category = ANY (ARRAY['coating'::text, 'tint'::text, 'protection'::text, 'finish'::text]))),
    CONSTRAINT treatments_treatment_type_check CHECK ((treatment_type = ANY (ARRAY['included'::text, 'lab_applied'::text, 'both'::text])))
);


-- Name: user_tour_progress; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.user_tour_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    status text DEFAULT 'not_started'::text,
    current_step integer DEFAULT 0,
    completed_steps integer[] DEFAULT '{}'::integer[],
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    last_accessed_at timestamp with time zone DEFAULT now(),
    skip_on_next_login boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_tour_progress_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'disabled'::text])))
);


-- Name: TABLE user_tour_progress; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN user_tour_progress.status; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN user_tour_progress.current_step; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN user_tour_progress.completed_steps; Type: COMMENT; Schema: public; Owner: -



-- Name: COLUMN user_tour_progress.skip_on_next_login; Type: COMMENT; Schema: public; Owner: -



-- Name: vehicles; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plate_number text NOT NULL,
    model text,
    capacity integer DEFAULT 0,
    is_active boolean DEFAULT true,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vehicles_capacity_check CHECK ((capacity >= 0))
);


-- Name: TABLE vehicles; Type: COMMENT; Schema: public; Owner: -



-- Name: webhook_events; Type: TABLE; Schema: public; Owner: -

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gateway text NOT NULL,
    gateway_event_id text NOT NULL,
    payment_id uuid,
    event_type text NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    processed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhook_events_gateway_check CHECK ((gateway = ANY (ARRAY['flow'::text, 'mercadopago'::text, 'paypal'::text, 'nowpayments'::text])))
);


-- Name: TABLE webhook_events; Type: COMMENT; Schema: public; Owner: -



-- Name: whatsapp_phone_numbers; Type: TABLE; Schema: public; Owner: -

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


-- Name: TABLE whatsapp_phone_numbers; Type: COMMENT; Schema: public; Owner: -



-- Name: admin_activity_log admin_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_activity_log
    ADD CONSTRAINT admin_activity_log_pkey PRIMARY KEY (id);


-- Name: admin_branch_access admin_branch_access_admin_user_id_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_branch_access
    ADD CONSTRAINT admin_branch_access_admin_user_id_branch_id_key UNIQUE (admin_user_id, branch_id);


-- Name: admin_branch_access admin_branch_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_branch_access
    ADD CONSTRAINT admin_branch_access_pkey PRIMARY KEY (id);


-- Name: admin_notifications admin_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);


-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


-- Name: agreement_customers agreement_customers_agreement_id_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_customers
    ADD CONSTRAINT agreement_customers_agreement_id_customer_id_key UNIQUE (agreement_id, customer_id);


-- Name: agreement_customers agreement_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_customers
    ADD CONSTRAINT agreement_customers_pkey PRIMARY KEY (id);


-- Name: agreement_institutional_balances agreement_institutional_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_balances
    ADD CONSTRAINT agreement_institutional_balances_pkey PRIMARY KEY (id);


-- Name: agreement_institutional_invoice_balances agreement_institutional_invoice_balances_balance_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_invoice_balances
    ADD CONSTRAINT agreement_institutional_invoice_balances_balance_id_key UNIQUE (balance_id);


-- Name: agreement_institutional_invoice_balances agreement_institutional_invoice_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_invoice_balances
    ADD CONSTRAINT agreement_institutional_invoice_balances_pkey PRIMARY KEY (id);


-- Name: agreement_institutional_invoices agreement_institutional_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_invoices
    ADD CONSTRAINT agreement_institutional_invoices_pkey PRIMARY KEY (id);


-- Name: agreement_purchase_orders agreement_purchase_orders_agreement_id_oc_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_purchase_orders
    ADD CONSTRAINT agreement_purchase_orders_agreement_id_oc_number_key UNIQUE (agreement_id, oc_number);


-- Name: agreement_purchase_orders agreement_purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_purchase_orders
    ADD CONSTRAINT agreement_purchase_orders_pkey PRIMARY KEY (id);


-- Name: agreements agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreements
    ADD CONSTRAINT agreements_pkey PRIMARY KEY (id);


-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);


-- Name: ai_usage_log ai_usage_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.ai_usage_log
    ADD CONSTRAINT ai_usage_log_pkey PRIMARY KEY (id);


-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


-- Name: branches branches_code_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.branches
    ADD CONSTRAINT branches_code_key UNIQUE (code);


-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


-- Name: cash_register_closures cash_register_closures_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.cash_register_closures
    ADD CONSTRAINT cash_register_closures_pkey PRIMARY KEY (id);


-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


-- Name: contact_lens_encargos contact_lens_encargos_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_pkey PRIMARY KEY (id);


-- Name: contact_lens_families contact_lens_families_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_families
    ADD CONSTRAINT contact_lens_families_pkey PRIMARY KEY (id);


-- Name: contact_lens_inventory contact_lens_inventory_contact_lens_family_id_branch_id_sph_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_inventory
    ADD CONSTRAINT contact_lens_inventory_contact_lens_family_id_branch_id_sph_key UNIQUE (contact_lens_family_id, branch_id, sphere_min, sphere_max, cylinder_min, cylinder_max);


-- Name: contact_lens_inventory contact_lens_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_inventory
    ADD CONSTRAINT contact_lens_inventory_pkey PRIMARY KEY (id);


-- Name: contact_lens_price_matrices contact_lens_price_matrices_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_price_matrices
    ADD CONSTRAINT contact_lens_price_matrices_pkey PRIMARY KEY (id);


-- Name: credit_note_movements credit_note_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.credit_note_movements
    ADD CONSTRAINT credit_note_movements_pkey PRIMARY KEY (id);


-- Name: credit_notes credit_notes_credit_note_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_credit_note_number_key UNIQUE (credit_note_number);


-- Name: credit_notes credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);


-- Name: customer_lens_purchases customer_lens_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customer_lens_purchases
    ADD CONSTRAINT customer_lens_purchases_pkey PRIMARY KEY (id);


-- Name: customer_satisfaction_surveys customer_satisfaction_surveys_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customer_satisfaction_surveys
    ADD CONSTRAINT customer_satisfaction_surveys_pkey PRIMARY KEY (id);


-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


-- Name: demo_requests demo_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.demo_requests
    ADD CONSTRAINT demo_requests_pkey PRIMARY KEY (id);


-- Name: drivers drivers_license_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_license_number_key UNIQUE (license_number);


-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


-- Name: email_send_events email_send_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.email_send_events
    ADD CONSTRAINT email_send_events_pkey PRIMARY KEY (id);


-- Name: embeddings embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.embeddings
    ADD CONSTRAINT embeddings_pkey PRIMARY KEY (id);


-- Name: field_operations field_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.field_operations
    ADD CONSTRAINT field_operations_pkey PRIMARY KEY (id);


-- Name: internal_order_items internal_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_order_items
    ADD CONSTRAINT internal_order_items_pkey PRIMARY KEY (id);


-- Name: internal_order_status_history internal_order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_order_status_history
    ADD CONSTRAINT internal_order_status_history_pkey PRIMARY KEY (id);


-- Name: internal_orders internal_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_order_number_key UNIQUE (order_number);


-- Name: internal_orders internal_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_pkey PRIMARY KEY (id);


-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


-- Name: lab_work_order_status_history lab_work_order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_order_status_history
    ADD CONSTRAINT lab_work_order_status_history_pkey PRIMARY KEY (id);


-- Name: lab_work_orders lab_work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_pkey PRIMARY KEY (id);


-- Name: lab_work_orders lab_work_orders_work_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_work_order_number_key UNIQUE (work_order_number);


-- Name: lead_activities lead_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);


-- Name: lead_scoring_logs lead_scoring_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lead_scoring_logs
    ADD CONSTRAINT lead_scoring_logs_pkey PRIMARY KEY (id);


-- Name: lead_scoring_rules lead_scoring_rules_activity_type_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lead_scoring_rules
    ADD CONSTRAINT lead_scoring_rules_activity_type_key UNIQUE (activity_type);


-- Name: lead_scoring_rules lead_scoring_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lead_scoring_rules
    ADD CONSTRAINT lead_scoring_rules_pkey PRIMARY KEY (id);


-- Name: lens_families lens_families_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lens_families
    ADD CONSTRAINT lens_families_pkey PRIMARY KEY (id);


-- Name: lens_price_matrices lens_price_matrices_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lens_price_matrices
    ADD CONSTRAINT lens_price_matrices_pkey PRIMARY KEY (id);


-- Name: memory_facts memory_facts_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.memory_facts
    ADD CONSTRAINT memory_facts_pkey PRIMARY KEY (id);


-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


-- Name: operativo_mobile_stock operativo_mobile_stock_field_operation_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.operativo_mobile_stock
    ADD CONSTRAINT operativo_mobile_stock_field_operation_id_product_id_key UNIQUE (field_operation_id, product_id);


-- Name: operativo_mobile_stock operativo_mobile_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.operativo_mobile_stock
    ADD CONSTRAINT operativo_mobile_stock_pkey PRIMARY KEY (id);


-- Name: operativo_sync_queue operativo_sync_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.operativo_sync_queue
    ADD CONSTRAINT operativo_sync_queue_pkey PRIMARY KEY (id);


-- Name: optical_internal_support_messages optical_internal_support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_messages
    ADD CONSTRAINT optical_internal_support_messages_pkey PRIMARY KEY (id);


-- Name: optical_internal_support_tickets optical_internal_support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_pkey PRIMARY KEY (id);


-- Name: optical_internal_support_tickets optical_internal_support_tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_ticket_number_key UNIQUE (ticket_number);


-- Name: opticas_access_tokens opticas_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.opticas_access_tokens
    ADD CONSTRAINT opticas_access_tokens_pkey PRIMARY KEY (id);


-- Name: opticas_access_tokens opticas_access_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.opticas_access_tokens
    ADD CONSTRAINT opticas_access_tokens_token_key UNIQUE (token);


-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


-- Name: order_payments order_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.order_payments
    ADD CONSTRAINT order_payments_pkey PRIMARY KEY (id);


-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


-- Name: orders orders_sii_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_sii_invoice_number_key UNIQUE (sii_invoice_number);


-- Name: organization_settings organization_settings_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.organization_settings
    ADD CONSTRAINT organization_settings_organization_id_key UNIQUE (organization_id);


-- Name: organization_settings organization_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.organization_settings
    ADD CONSTRAINT organization_settings_pkey PRIMARY KEY (id);


-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


-- Name: payment_gateways_config payment_gateways_config_gateway_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.payment_gateways_config
    ADD CONSTRAINT payment_gateways_config_gateway_id_key UNIQUE (gateway_id);


-- Name: payment_gateways_config payment_gateways_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.payment_gateways_config
    ADD CONSTRAINT payment_gateways_config_pkey PRIMARY KEY (id);


-- Name: payment_installments payment_installments_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.payment_installments
    ADD CONSTRAINT payment_installments_pkey PRIMARY KEY (id);


-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


-- Name: pos_sale_idempotency pos_sale_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_sale_idempotency
    ADD CONSTRAINT pos_sale_idempotency_pkey PRIMARY KEY (idempotency_key);


-- Name: pos_sessions pos_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_pkey PRIMARY KEY (id);


-- Name: pos_settings pos_settings_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_settings
    ADD CONSTRAINT pos_settings_branch_id_key UNIQUE (branch_id);


-- Name: pos_settings pos_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_settings
    ADD CONSTRAINT pos_settings_pkey PRIMARY KEY (id);


-- Name: pos_transactions pos_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_transactions
    ADD CONSTRAINT pos_transactions_pkey PRIMARY KEY (id);


-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


-- Name: product_branch_stock product_branch_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_branch_stock
    ADD CONSTRAINT product_branch_stock_pkey PRIMARY KEY (id);


-- Name: product_branch_stock product_branch_stock_product_id_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_branch_stock
    ADD CONSTRAINT product_branch_stock_product_id_branch_id_key UNIQUE (product_id, branch_id);


-- Name: product_option_fields product_option_fields_field_key_form_type_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_option_fields
    ADD CONSTRAINT product_option_fields_field_key_form_type_key UNIQUE (field_key, form_type);


-- Name: product_option_fields product_option_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_option_fields
    ADD CONSTRAINT product_option_fields_pkey PRIMARY KEY (id);


-- Name: product_option_values product_option_values_field_id_value_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_option_values
    ADD CONSTRAINT product_option_values_field_id_value_key UNIQUE (field_id, value);


-- Name: product_option_values product_option_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_option_values
    ADD CONSTRAINT product_option_values_pkey PRIMARY KEY (id);


-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


-- Name: quote_settings quote_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quote_settings
    ADD CONSTRAINT quote_settings_pkey PRIMARY KEY (id);


-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


-- Name: quotes quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);


-- Name: saas_audit_log saas_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_audit_log
    ADD CONSTRAINT saas_audit_log_pkey PRIMARY KEY (id);


-- Name: saas_backups saas_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_backups
    ADD CONSTRAINT saas_backups_pkey PRIMARY KEY (id);


-- Name: saas_support_messages saas_support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_support_messages
    ADD CONSTRAINT saas_support_messages_pkey PRIMARY KEY (id);


-- Name: saas_support_templates saas_support_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_support_templates
    ADD CONSTRAINT saas_support_templates_pkey PRIMARY KEY (id);


-- Name: saas_support_tickets saas_support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_pkey PRIMARY KEY (id);


-- Name: saas_support_tickets saas_support_tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_ticket_number_key UNIQUE (ticket_number);


-- Name: schedule_settings schedule_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.schedule_settings
    ADD CONSTRAINT schedule_settings_pkey PRIMARY KEY (id);


-- Name: subscription_tiers subscription_tiers_name_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.subscription_tiers
    ADD CONSTRAINT subscription_tiers_name_key UNIQUE (name);


-- Name: subscription_tiers subscription_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.subscription_tiers
    ADD CONSTRAINT subscription_tiers_pkey PRIMARY KEY (id);


-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (gateway_subscription_id);


-- Name: support_categories support_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_categories
    ADD CONSTRAINT support_categories_pkey PRIMARY KEY (id);


-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


-- Name: support_templates support_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_templates
    ADD CONSTRAINT support_templates_pkey PRIMARY KEY (id);


-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


-- Name: support_tickets support_tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_ticket_number_key UNIQUE (ticket_number);


-- Name: survey_invitations survey_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.survey_invitations
    ADD CONSTRAINT survey_invitations_pkey PRIMARY KEY (id);


-- Name: survey_invitations survey_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.survey_invitations
    ADD CONSTRAINT survey_invitations_token_key UNIQUE (token);


-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


-- Name: system_email_templates system_email_templates_name_type_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.system_email_templates
    ADD CONSTRAINT system_email_templates_name_type_key UNIQUE (name, type);


-- Name: system_email_templates system_email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.system_email_templates
    ADD CONSTRAINT system_email_templates_pkey PRIMARY KEY (id);


-- Name: system_health_metrics system_health_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.system_health_metrics
    ADD CONSTRAINT system_health_metrics_pkey PRIMARY KEY (id);


-- Name: system_maintenance_log system_maintenance_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.system_maintenance_log
    ADD CONSTRAINT system_maintenance_log_pkey PRIMARY KEY (id);


-- Name: telemetry_aggregates telemetry_aggregates_organization_id_date_period_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.telemetry_aggregates
    ADD CONSTRAINT telemetry_aggregates_organization_id_date_period_key UNIQUE (organization_id, date, period);


-- Name: telemetry_aggregates telemetry_aggregates_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.telemetry_aggregates
    ADD CONSTRAINT telemetry_aggregates_pkey PRIMARY KEY (id);


-- Name: telemetry_config telemetry_config_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.telemetry_config
    ADD CONSTRAINT telemetry_config_organization_id_key UNIQUE (organization_id);


-- Name: telemetry_config telemetry_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.telemetry_config
    ADD CONSTRAINT telemetry_config_pkey PRIMARY KEY (id);


-- Name: telemetry_events telemetry_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.telemetry_events
    ADD CONSTRAINT telemetry_events_pkey PRIMARY KEY (id);


-- Name: tier_change_audit tier_change_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.tier_change_audit
    ADD CONSTRAINT tier_change_audit_pkey PRIMARY KEY (id);


-- Name: treatments treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_pkey PRIMARY KEY (id);


-- Name: treatments treatments_treatment_key_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_treatment_key_key UNIQUE (treatment_key);


-- Name: payment_installments unique_order_installment; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.payment_installments
    ADD CONSTRAINT unique_order_installment UNIQUE (order_id, installment_number);


-- Name: user_tour_progress user_tour_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.user_tour_progress
    ADD CONSTRAINT user_tour_progress_pkey PRIMARY KEY (id);


-- Name: user_tour_progress user_tour_progress_user_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.user_tour_progress
    ADD CONSTRAINT user_tour_progress_user_id_organization_id_key UNIQUE (user_id, organization_id);


-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


-- Name: vehicles vehicles_plate_number_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_plate_number_key UNIQUE (plate_number);


-- Name: webhook_events webhook_events_gateway_gateway_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.webhook_events
    ADD CONSTRAINT webhook_events_gateway_gateway_event_id_key UNIQUE (gateway, gateway_event_id);


-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


-- Name: whatsapp_phone_numbers whatsapp_phone_numbers_phone_number_id_key; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.whatsapp_phone_numbers
    ADD CONSTRAINT whatsapp_phone_numbers_phone_number_id_key UNIQUE (phone_number_id);


-- Name: whatsapp_phone_numbers whatsapp_phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.whatsapp_phone_numbers
    ADD CONSTRAINT whatsapp_phone_numbers_pkey PRIMARY KEY (id);


-- Name: idx_admin_activity_admin_user; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_user ON public.admin_activity_log USING btree (admin_user_id);


-- Name: idx_admin_activity_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON public.admin_activity_log USING btree (created_at);


-- Name: idx_admin_branch_access_admin; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_branch_access_admin ON public.admin_branch_access USING btree (admin_user_id);


-- Name: idx_admin_branch_access_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_branch_access_branch ON public.admin_branch_access USING btree (branch_id);


-- Name: idx_admin_notifications_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_notifications_branch ON public.admin_notifications USING btree (branch_id);


-- Name: idx_admin_notifications_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications USING btree (created_at DESC);


-- Name: idx_admin_notifications_expires_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_notifications_expires_at ON public.admin_notifications USING btree (expires_at) WHERE (expires_at IS NOT NULL);


-- Name: idx_admin_notifications_organization; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_notifications_organization ON public.admin_notifications USING btree (organization_id);


-- Name: idx_admin_notifications_priority; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON public.admin_notifications USING btree (priority);


-- Name: idx_admin_notifications_target; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_notifications_target ON public.admin_notifications USING btree (target_admin_id) WHERE (target_admin_id IS NOT NULL);


-- Name: idx_admin_notifications_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications USING btree (type);


-- Name: idx_admin_notifications_unread; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON public.admin_notifications USING btree (is_read) WHERE (is_read = false);


-- Name: idx_admin_users_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users USING btree (is_active);


-- Name: idx_admin_users_email; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users USING btree (email);


-- Name: idx_admin_users_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_users_org ON public.admin_users USING btree (organization_id) WHERE (organization_id IS NOT NULL);


-- Name: idx_admin_users_role; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users USING btree (role);


-- Name: idx_agreement_customers_agreement_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_customers_agreement_id ON public.agreement_customers USING btree (agreement_id);


-- Name: idx_agreement_customers_customer_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_customers_customer_id ON public.agreement_customers USING btree (customer_id);


-- Name: idx_agreement_customers_last_order; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_customers_last_order ON public.agreement_customers USING btree (last_order_at DESC);


-- Name: idx_agreement_institutional_balances_agreement_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_agreement_id ON public.agreement_institutional_balances USING btree (agreement_id);


-- Name: idx_agreement_institutional_balances_order_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_order_id ON public.agreement_institutional_balances USING btree (order_id);


-- Name: idx_agreement_institutional_balances_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_status ON public.agreement_institutional_balances USING btree (status);


-- Name: idx_agreement_institutional_invoice_balances_balance_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoice_balances_balance_id ON public.agreement_institutional_invoice_balances USING btree (balance_id);


-- Name: idx_agreement_institutional_invoice_balances_invoice_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoice_balances_invoice_id ON public.agreement_institutional_invoice_balances USING btree (invoice_id);


-- Name: idx_agreement_institutional_invoices_agreement_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_agreement_id ON public.agreement_institutional_invoices USING btree (agreement_id);


-- Name: idx_agreement_institutional_invoices_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_branch_id ON public.agreement_institutional_invoices USING btree (branch_id);


-- Name: idx_agreement_institutional_invoices_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_created_at ON public.agreement_institutional_invoices USING btree (created_at DESC);


-- Name: idx_agreement_institutional_invoices_folio; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_agreement_institutional_invoices_folio ON public.agreement_institutional_invoices USING btree (folio);


-- Name: idx_agreement_institutional_invoices_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_status ON public.agreement_institutional_invoices USING btree (status);


-- Name: idx_agreement_purchase_orders_agreement_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_purchase_orders_agreement_id ON public.agreement_purchase_orders USING btree (agreement_id);


-- Name: idx_agreement_purchase_orders_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreement_purchase_orders_status ON public.agreement_purchase_orders USING btree (status);


-- Name: idx_agreements_agreement_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreements_agreement_type ON public.agreements USING btree (agreement_type);


-- Name: idx_agreements_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreements_branch_id ON public.agreements USING btree (branch_id) WHERE (branch_id IS NOT NULL);


-- Name: idx_agreements_institution_rut; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreements_institution_rut ON public.agreements USING btree (institution_rut);


-- Name: idx_agreements_organization_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreements_organization_id ON public.agreements USING btree (organization_id);


-- Name: idx_agreements_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreements_status ON public.agreements USING btree (status);


-- Name: idx_agreements_valid_until; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_agreements_valid_until ON public.agreements USING btree (valid_until) WHERE (valid_until IS NOT NULL);


-- Name: idx_ai_insights_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON public.ai_insights USING btree (created_at DESC);


-- Name: idx_ai_insights_dismissed; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_ai_insights_dismissed ON public.ai_insights USING btree (is_dismissed) WHERE (is_dismissed = false);


-- Name: idx_ai_insights_org_section; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_ai_insights_org_section ON public.ai_insights USING btree (organization_id, section);


-- Name: idx_ai_insights_priority; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON public.ai_insights USING btree (priority DESC);


-- Name: idx_ai_insights_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON public.ai_insights USING btree (type);


-- Name: idx_ai_usage_log_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON public.ai_usage_log USING btree (created_at DESC);


-- Name: idx_ai_usage_log_org_created; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_created ON public.ai_usage_log USING btree (organization_id, created_at DESC);


-- Name: idx_ai_usage_log_org_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_id ON public.ai_usage_log USING btree (organization_id);


-- Name: idx_appointments_assigned_to; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON public.appointments USING btree (assigned_to);


-- Name: idx_appointments_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_appointments_branch ON public.appointments USING btree (branch_id);


-- Name: idx_appointments_customer_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments USING btree (customer_id);


-- Name: idx_appointments_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments USING btree (appointment_date, appointment_time);


-- Name: idx_appointments_field_operation; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_appointments_field_operation ON public.appointments USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);


-- Name: idx_appointments_guest_email; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_appointments_guest_email ON public.appointments USING btree (guest_email) WHERE (guest_email IS NOT NULL);


-- Name: idx_appointments_guest_rut; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_appointments_guest_rut ON public.appointments USING btree (guest_rut) WHERE (guest_rut IS NOT NULL);


-- Name: idx_appointments_order_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_appointments_order_id ON public.appointments USING btree (order_id);


-- Name: idx_appointments_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.appointments USING btree (organization_id) WHERE (organization_id IS NOT NULL);


-- Name: idx_appointments_prescription_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_appointments_prescription_id ON public.appointments USING btree (prescription_id);


-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments USING btree (status);


-- Name: idx_branches_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_branches_active ON public.branches USING btree (is_active);


-- Name: idx_branches_code; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_branches_code ON public.branches USING btree (code);


-- Name: idx_branches_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_branches_org ON public.branches USING btree (organization_id) WHERE (organization_id IS NOT NULL);


-- Name: idx_cart_product; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_cart_product ON public.cart_items USING btree (product_id);


-- Name: idx_cart_session; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_cart_session ON public.cart_items USING btree (session_id);


-- Name: idx_cart_user; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_cart_user ON public.cart_items USING btree (user_id);


-- Name: idx_cash_register_closures_branch_date_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_cash_register_closures_branch_date_unique ON public.cash_register_closures USING btree (branch_id, closure_date) WHERE (field_operation_id IS NULL);


-- Name: idx_cash_register_closures_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_branch_id ON public.cash_register_closures USING btree (branch_id);


-- Name: idx_cash_register_closures_closed_by; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_closed_by ON public.cash_register_closures USING btree (closed_by);


-- Name: idx_cash_register_closures_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_date ON public.cash_register_closures USING btree (closure_date DESC);


-- Name: idx_cash_register_closures_field_operation_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_field_operation_id ON public.cash_register_closures USING btree (field_operation_id);


-- Name: idx_cash_register_closures_operativo_date_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_cash_register_closures_operativo_date_unique ON public.cash_register_closures USING btree (branch_id, field_operation_id, closure_date) WHERE (field_operation_id IS NOT NULL);


-- Name: idx_cash_register_closures_pos_session_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_pos_session_id ON public.cash_register_closures USING btree (pos_session_id);


-- Name: idx_cash_register_closures_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_cash_register_closures_status ON public.cash_register_closures USING btree (status);


-- Name: idx_categories_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories USING btree (is_active);


-- Name: idx_categories_is_default; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_categories_is_default ON public.categories USING btree (is_default);


-- Name: idx_categories_is_system; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_categories_is_system ON public.categories USING btree (is_system);


-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories USING btree (parent_id);


-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories USING btree (slug);


-- Name: idx_chat_messages_created; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages USING btree (created_at);


-- Name: idx_chat_messages_session; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages USING btree (session_id);


-- Name: idx_chat_sessions_created; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_chat_sessions_created ON public.chat_sessions USING btree (created_at DESC);


-- Name: idx_chat_sessions_organization_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_chat_sessions_organization_id ON public.chat_sessions USING btree (organization_id) WHERE (organization_id IS NOT NULL);


-- Name: idx_chat_sessions_user; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions USING btree (user_id);


-- Name: idx_chat_sessions_whatsapp; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_chat_sessions_whatsapp ON public.chat_sessions USING btree (((metadata ->> 'channel'::text)), ((metadata ->> 'wa_id'::text)), ((metadata ->> 'organization_id'::text))) WHERE ((metadata ->> 'channel'::text) = 'whatsapp'::text);


-- Name: idx_contact_lens_encargos_customer; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_customer ON public.contact_lens_encargos USING btree (customer_id);


-- Name: idx_contact_lens_encargos_family; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_family ON public.contact_lens_encargos USING btree (contact_lens_family_id);


-- Name: idx_contact_lens_encargos_org_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_org_branch ON public.contact_lens_encargos USING btree (organization_id, branch_id);


-- Name: idx_contact_lens_encargos_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_status ON public.contact_lens_encargos USING btree (status);


-- Name: idx_contact_lens_families_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_families_active ON public.contact_lens_families USING btree (is_active);


-- Name: idx_contact_lens_families_category_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_families_category_id ON public.contact_lens_families USING btree (category_id);


-- Name: idx_contact_lens_families_modality; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_families_modality ON public.contact_lens_families USING btree (modality);


-- Name: idx_contact_lens_families_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_families_org ON public.contact_lens_families USING btree (organization_id);


-- Name: idx_contact_lens_families_use_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_families_use_type ON public.contact_lens_families USING btree (use_type);


-- Name: idx_contact_lens_inventory_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_active ON public.contact_lens_inventory USING btree (is_active) WHERE (is_active = true);


-- Name: idx_contact_lens_inventory_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_branch ON public.contact_lens_inventory USING btree (branch_id);


-- Name: idx_contact_lens_inventory_family; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_family ON public.contact_lens_inventory USING btree (contact_lens_family_id);


-- Name: idx_contact_lens_inventory_lookup; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_lookup ON public.contact_lens_inventory USING btree (contact_lens_family_id, branch_id, sphere_min, sphere_max) WHERE (is_active = true);


-- Name: idx_contact_lens_matrices_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_active ON public.contact_lens_price_matrices USING btree (is_active);


-- Name: idx_contact_lens_matrices_addition_range; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_addition_range ON public.contact_lens_price_matrices USING gist (numrange((addition_min)::numeric, (addition_max)::numeric, '[]'::text));


-- Name: idx_contact_lens_matrices_cylinder_range; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_cylinder_range ON public.contact_lens_price_matrices USING gist (numrange((cylinder_min)::numeric, (cylinder_max)::numeric, '[]'::text));


-- Name: idx_contact_lens_matrices_family; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_family ON public.contact_lens_price_matrices USING btree (contact_lens_family_id);


-- Name: idx_contact_lens_matrices_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_org ON public.contact_lens_price_matrices USING btree (organization_id);


-- Name: idx_contact_lens_matrices_sphere_range; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_sphere_range ON public.contact_lens_price_matrices USING gist (numrange((sphere_min)::numeric, (sphere_max)::numeric, '[]'::text));


-- Name: idx_credit_note_movements_credit_note_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_credit_note_movements_credit_note_id ON public.credit_note_movements USING btree (credit_note_id);


-- Name: idx_credit_note_movements_pos_session_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_credit_note_movements_pos_session_id ON public.credit_note_movements USING btree (pos_session_id);


-- Name: idx_credit_notes_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_credit_notes_branch_id ON public.credit_notes USING btree (branch_id);


-- Name: idx_credit_notes_order_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_credit_notes_order_id ON public.credit_notes USING btree (order_id);


-- Name: idx_credit_notes_organization_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_credit_notes_organization_id ON public.credit_notes USING btree (organization_id);


-- Name: idx_customer_lens_purchases_customer_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_customer_id ON public.customer_lens_purchases USING btree (customer_id);


-- Name: idx_customer_lens_purchases_order_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_order_id ON public.customer_lens_purchases USING btree (order_id);


-- Name: idx_customer_lens_purchases_prescription_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_prescription_id ON public.customer_lens_purchases USING btree (prescription_id);


-- Name: idx_customer_lens_purchases_purchase_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_purchase_date ON public.customer_lens_purchases USING btree (purchase_date DESC);


-- Name: idx_customer_lens_purchases_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_status ON public.customer_lens_purchases USING btree (status);


-- Name: idx_customer_satisfaction_surveys_created; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_created ON public.customer_satisfaction_surveys USING btree (created_at DESC);


-- Name: idx_customer_satisfaction_surveys_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_org ON public.customer_satisfaction_surveys USING btree (organization_id);


-- Name: idx_customer_satisfaction_surveys_token_used; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_customer_satisfaction_surveys_token_used ON public.customer_satisfaction_surveys USING btree (token_used);


-- Name: idx_customers_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON public.customers USING btree (branch_id);


-- Name: idx_customers_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers USING btree (created_at DESC);


-- Name: idx_customers_email; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers USING btree (email) WHERE (email IS NOT NULL);


-- Name: idx_customers_field_operation; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customers_field_operation ON public.customers USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);


-- Name: idx_customers_is_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers USING btree (is_active) WHERE (is_active = true);


-- Name: idx_customers_name; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers USING btree (first_name, last_name);


-- Name: idx_customers_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers USING btree (organization_id) WHERE (organization_id IS NOT NULL);


-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers USING btree (phone) WHERE (phone IS NOT NULL);


-- Name: idx_customers_rut; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customers_rut ON public.customers USING btree (rut) WHERE (rut IS NOT NULL);


-- Name: idx_customers_rut_normalized; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_customers_rut_normalized ON public.customers USING btree (public.normalize_rut_for_search(rut)) WHERE (rut IS NOT NULL);


-- Name: idx_demo_requests_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON public.demo_requests USING btree (created_at DESC);


-- Name: idx_demo_requests_demo_expires_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_demo_requests_demo_expires_at ON public.demo_requests USING btree (demo_expires_at) WHERE (demo_expires_at IS NOT NULL);


-- Name: idx_demo_requests_email; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON public.demo_requests USING btree (email);


-- Name: idx_demo_requests_funnel_stage; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_demo_requests_funnel_stage ON public.demo_requests USING btree (funnel_stage);


-- Name: idx_demo_requests_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON public.demo_requests USING btree (status);


-- Name: idx_drivers_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_drivers_active ON public.drivers USING btree (is_active);


-- Name: idx_drivers_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_drivers_org ON public.drivers USING btree (organization_id);


-- Name: idx_email_send_events_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_email_send_events_created_at ON public.email_send_events USING btree (created_at DESC);


-- Name: idx_email_send_events_email_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_email_send_events_email_id ON public.email_send_events USING btree (email_id);


-- Name: idx_email_send_events_event_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_email_send_events_event_type ON public.email_send_events USING btree (event_type);


-- Name: idx_embeddings_created; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_embeddings_created ON public.embeddings USING btree (created_at DESC);


-- Name: idx_embeddings_provider; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_embeddings_provider ON public.embeddings USING btree (embedding_provider);


-- Name: idx_embeddings_source; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_embeddings_source ON public.embeddings USING btree (source_type, source_id);


-- Name: idx_embeddings_user; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_embeddings_user ON public.embeddings USING btree (user_id);


-- Name: idx_embeddings_vector; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON public.embeddings USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


-- Name: idx_embeddings_vector_small; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_embeddings_vector_small ON public.embeddings USING ivfflat (embedding_small public.vector_cosine_ops) WITH (lists='100');


-- Name: idx_field_operations_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_field_operations_branch ON public.field_operations USING btree (branch_id);


-- Name: idx_field_operations_organization; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_field_operations_organization ON public.field_operations USING btree (organization_id);


-- Name: idx_field_operations_scheduled_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_field_operations_scheduled_date ON public.field_operations USING btree (scheduled_date DESC);


-- Name: idx_field_operations_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_field_operations_status ON public.field_operations USING btree (status);


-- Name: idx_internal_order_items_order; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_internal_order_items_order ON public.internal_order_items USING btree (internal_order_id);


-- Name: idx_internal_order_items_product; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_internal_order_items_product ON public.internal_order_items USING btree (product_id);


-- Name: idx_internal_order_status_history_created; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_internal_order_status_history_created ON public.internal_order_status_history USING btree (created_at DESC);


-- Name: idx_internal_order_status_history_order; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_internal_order_status_history_order ON public.internal_order_status_history USING btree (internal_order_id);


-- Name: idx_internal_orders_created_by; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_internal_orders_created_by ON public.internal_orders USING btree (created_by);


-- Name: idx_internal_orders_destination; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_internal_orders_destination ON public.internal_orders USING btree (destination_branch_id);


-- Name: idx_internal_orders_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_internal_orders_org ON public.internal_orders USING btree (organization_id);


-- Name: idx_internal_orders_origin; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_internal_orders_origin ON public.internal_orders USING btree (origin_branch_id);


-- Name: idx_internal_orders_priority; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_internal_orders_priority ON public.internal_orders USING btree (priority);


-- Name: idx_internal_orders_scheduled_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_internal_orders_scheduled_date ON public.internal_orders USING btree (scheduled_date);


-- Name: idx_internal_orders_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_internal_orders_status ON public.internal_orders USING btree (status);


-- Name: idx_inventory_movements_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch ON public.inventory_movements USING btree (branch_id);


-- Name: idx_inventory_movements_created; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements USING btree (created_at DESC);


-- Name: idx_inventory_movements_product; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements USING btree (product_id);


-- Name: idx_inventory_movements_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements USING btree (movement_type);


-- Name: idx_lab_work_orders_agreement_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_agreement_id ON public.lab_work_orders USING btree (agreement_id) WHERE (agreement_id IS NOT NULL);


-- Name: idx_lab_work_orders_assigned_to; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_assigned_to ON public.lab_work_orders USING btree (assigned_to);


-- Name: idx_lab_work_orders_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_branch ON public.lab_work_orders USING btree (branch_id);


-- Name: idx_lab_work_orders_contact_lens_family; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_contact_lens_family ON public.lab_work_orders USING btree (contact_lens_family_id) WHERE (contact_lens_family_id IS NOT NULL);


-- Name: idx_lab_work_orders_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_created_at ON public.lab_work_orders USING btree (created_at);


-- Name: idx_lab_work_orders_customer_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_customer_id ON public.lab_work_orders USING btree (customer_id);


-- Name: idx_lab_work_orders_far_lens_family_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_far_lens_family_id ON public.lab_work_orders USING btree (far_lens_family_id);


-- Name: idx_lab_work_orders_field_operation; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_field_operation ON public.lab_work_orders USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);


-- Name: idx_lab_work_orders_lens_family_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_lens_family_id ON public.lab_work_orders USING btree (lens_family_id);


-- Name: idx_lab_work_orders_near_frame_product_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_near_frame_product_id ON public.lab_work_orders USING btree (near_frame_product_id);


-- Name: idx_lab_work_orders_near_lens_family_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_near_lens_family_id ON public.lab_work_orders USING btree (near_lens_family_id);


-- Name: idx_lab_work_orders_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_org ON public.lab_work_orders USING btree (organization_id) WHERE (organization_id IS NOT NULL);


-- Name: idx_lab_work_orders_presbyopia_solution; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_presbyopia_solution ON public.lab_work_orders USING btree (presbyopia_solution);


-- Name: idx_lab_work_orders_prescription_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_prescription_id ON public.lab_work_orders USING btree (prescription_id);


-- Name: idx_lab_work_orders_quote_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_quote_id ON public.lab_work_orders USING btree (quote_id);


-- Name: idx_lab_work_orders_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_status ON public.lab_work_orders USING btree (status);


-- Name: idx_lab_work_orders_work_order_number; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_work_order_number ON public.lab_work_orders USING btree (work_order_number);


-- Name: idx_lead_activities_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON public.lead_activities USING btree (created_at DESC);


-- Name: idx_lead_activities_lead_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities USING btree (lead_id);


-- Name: idx_lead_activities_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON public.lead_activities USING btree (activity_type);


-- Name: idx_lead_scoring_logs_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lead_scoring_logs_created_at ON public.lead_scoring_logs USING btree (calculated_at DESC);


-- Name: idx_lead_scoring_logs_lead_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lead_scoring_logs_lead_id ON public.lead_scoring_logs USING btree (lead_id);


-- Name: idx_lens_families_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lens_families_active ON public.lens_families USING btree (is_active);


-- Name: idx_lens_families_category_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lens_families_category_id ON public.lens_families USING btree (category_id);


-- Name: idx_lens_families_organization_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lens_families_organization_id ON public.lens_families USING btree (organization_id) WHERE (organization_id IS NOT NULL);


-- Name: idx_lens_families_stock_available; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lens_families_stock_available ON public.lens_families USING btree (is_stock_available) WHERE (is_stock_available = true);


-- Name: idx_lens_families_type_material; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lens_families_type_material ON public.lens_families USING btree (lens_type, lens_material);


-- Name: idx_lens_matrices_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lens_matrices_active ON public.lens_price_matrices USING btree (is_active);


-- Name: idx_lens_matrices_addition_range; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lens_matrices_addition_range ON public.lens_price_matrices USING gist (numrange((addition_min)::numeric, (addition_max)::numeric, '[]'::text));


-- Name: idx_lens_matrices_cylinder_range; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lens_matrices_cylinder_range ON public.lens_price_matrices USING gist (numrange((cylinder_min)::numeric, (cylinder_max)::numeric, '[]'::text));


-- Name: idx_lens_matrices_family; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lens_matrices_family ON public.lens_price_matrices USING btree (lens_family_id);


-- Name: idx_lens_matrices_sphere_range; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_lens_matrices_sphere_range ON public.lens_price_matrices USING gist (numrange((sphere_min)::numeric, (sphere_max)::numeric, '[]'::text));


-- Name: idx_memory_facts_expires; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_memory_facts_expires ON public.memory_facts USING btree (expires_at);


-- Name: idx_memory_facts_importance; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_memory_facts_importance ON public.memory_facts USING btree (importance DESC);


-- Name: idx_memory_facts_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_memory_facts_type ON public.memory_facts USING btree (fact_type);


-- Name: idx_memory_facts_user; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_memory_facts_user ON public.memory_facts USING btree (user_id);


-- Name: idx_memory_facts_vector; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_memory_facts_vector ON public.memory_facts USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='50');


-- Name: idx_notification_settings_branch; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_notification_settings_branch ON public.notification_settings USING btree (organization_id, branch_id, notification_type) WHERE (branch_id IS NOT NULL);


-- Name: idx_notification_settings_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_notification_settings_branch_id ON public.notification_settings USING btree (branch_id);


-- Name: idx_notification_settings_enabled; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_notification_settings_enabled ON public.notification_settings USING btree (enabled) WHERE (enabled = true);


-- Name: idx_notification_settings_global; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_notification_settings_global ON public.notification_settings USING btree (notification_type) WHERE ((organization_id IS NULL) AND (branch_id IS NULL));


-- Name: idx_notification_settings_org; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_notification_settings_org ON public.notification_settings USING btree (organization_id, notification_type) WHERE ((organization_id IS NOT NULL) AND (branch_id IS NULL));


-- Name: idx_notification_settings_org_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_notification_settings_org_id ON public.notification_settings USING btree (organization_id);


-- Name: idx_notification_settings_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON public.notification_settings USING btree (notification_type);


-- Name: idx_operativo_mobile_stock_field_operation; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_operativo_mobile_stock_field_operation ON public.operativo_mobile_stock USING btree (field_operation_id);


-- Name: idx_operativo_mobile_stock_product; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_operativo_mobile_stock_product ON public.operativo_mobile_stock USING btree (product_id);


-- Name: idx_operativo_sync_queue_field_operation; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_operativo_sync_queue_field_operation ON public.operativo_sync_queue USING btree (field_operation_id);


-- Name: idx_operativo_sync_queue_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_operativo_sync_queue_status ON public.operativo_sync_queue USING btree (status);


-- Name: idx_optical_internal_support_messages_ticket; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_messages_ticket ON public.optical_internal_support_messages USING btree (ticket_id, created_at DESC);


-- Name: idx_optical_internal_support_tickets_assigned_to; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_assigned_to ON public.optical_internal_support_tickets USING btree (assigned_to);


-- Name: idx_optical_internal_support_tickets_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_branch ON public.optical_internal_support_tickets USING btree (branch_id);


-- Name: idx_optical_internal_support_tickets_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_created_at ON public.optical_internal_support_tickets USING btree (created_at DESC);


-- Name: idx_optical_internal_support_tickets_customer; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_customer ON public.optical_internal_support_tickets USING btree (customer_id);


-- Name: idx_optical_internal_support_tickets_organization; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_organization ON public.optical_internal_support_tickets USING btree (organization_id);


-- Name: idx_optical_internal_support_tickets_priority; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_priority ON public.optical_internal_support_tickets USING btree (priority);


-- Name: idx_optical_internal_support_tickets_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_status ON public.optical_internal_support_tickets USING btree (status);


-- Name: idx_optical_internal_support_tickets_ticket_number; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_ticket_number ON public.optical_internal_support_tickets USING btree (ticket_number);


-- Name: idx_opticas_access_tokens_expires; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_opticas_access_tokens_expires ON public.opticas_access_tokens USING btree (expires_at);


-- Name: idx_opticas_access_tokens_token; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_opticas_access_tokens_token ON public.opticas_access_tokens USING btree (token);


-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items USING btree (order_id);


-- Name: idx_order_items_product; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items USING btree (product_id);


-- Name: idx_order_payments_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_order_payments_date ON public.order_payments USING btree (paid_at);


-- Name: idx_order_payments_method; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_order_payments_method ON public.order_payments USING btree (payment_method);


-- Name: idx_order_payments_order; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_order_payments_order ON public.order_payments USING btree (order_id);


-- Name: idx_order_payments_pos_session_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_order_payments_pos_session_id ON public.order_payments USING btree (pos_session_id);


-- Name: idx_order_payments_session_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_order_payments_session_date ON public.order_payments USING btree (pos_session_id, paid_at) WHERE (pos_session_id IS NOT NULL);


-- Name: idx_orders_agreement_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_agreement_id ON public.orders USING btree (agreement_id) WHERE (agreement_id IS NOT NULL);


-- Name: idx_orders_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_branch ON public.orders USING btree (branch_id);


-- Name: idx_orders_branch_folio; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_branch_folio ON public.orders USING btree (branch_id, internal_folio);


-- Name: idx_orders_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders USING btree (branch_id);


-- Name: idx_orders_customer_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders USING btree (customer_id);


-- Name: idx_orders_document_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_document_type ON public.orders USING btree (document_type);


-- Name: idx_orders_field_operation; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_field_operation ON public.orders USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);


-- Name: idx_orders_internal_folio; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_internal_folio ON public.orders USING btree (internal_folio);


-- Name: idx_orders_is_pos_sale; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_is_pos_sale ON public.orders USING btree (is_pos_sale);


-- Name: idx_orders_mp_payment; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_mp_payment ON public.orders USING btree (mp_payment_id);


-- Name: idx_orders_number; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders USING btree (order_number);


-- Name: idx_orders_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_org ON public.orders USING btree (organization_id) WHERE (organization_id IS NOT NULL);


-- Name: idx_orders_payment_method_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_payment_method_type ON public.orders USING btree (payment_method_type);


-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders USING btree (payment_status);


-- Name: idx_orders_pos_cashier; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_pos_cashier ON public.orders USING btree (pos_cashier_id);


-- Name: idx_orders_pos_session_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_pos_session_id ON public.orders USING btree (pos_session_id) WHERE (pos_session_id IS NOT NULL);


-- Name: idx_orders_sii_folio; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_sii_folio ON public.orders USING btree (sii_folio);


-- Name: idx_orders_sii_invoice_number; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_sii_invoice_number ON public.orders USING btree (sii_invoice_number);


-- Name: idx_orders_sii_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_sii_status ON public.orders USING btree (sii_status);


-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders USING btree (status);


-- Name: idx_orders_user; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders USING btree (user_id);


-- Name: idx_organization_settings_org_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON public.organization_settings USING btree (organization_id);


-- Name: idx_organizations_logo_url; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_organizations_logo_url ON public.organizations USING btree (logo_url) WHERE (logo_url IS NOT NULL);


-- Name: idx_organizations_owner; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations USING btree (owner_id);


-- Name: idx_organizations_scheduled_tier_effective_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_organizations_scheduled_tier_effective_at ON public.organizations USING btree (scheduled_tier_effective_at) WHERE (scheduled_tier IS NOT NULL);


-- Name: idx_organizations_slogan; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_organizations_slogan ON public.organizations USING btree (slogan) WHERE (slogan IS NOT NULL);


-- Name: idx_organizations_slug; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations USING btree (slug);


-- Name: idx_organizations_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations USING btree (status);


-- Name: idx_organizations_tier; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_organizations_tier ON public.organizations USING btree (subscription_tier);


-- Name: idx_payment_installments_due_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payment_installments_due_date ON public.payment_installments USING btree (due_date);


-- Name: idx_payment_installments_order; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payment_installments_order ON public.payment_installments USING btree (order_id);


-- Name: idx_payment_installments_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payment_installments_status ON public.payment_installments USING btree (payment_status);


-- Name: idx_payments_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments USING btree (created_at DESC);


-- Name: idx_payments_gateway_payment_intent_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_intent_id ON public.payments USING btree (gateway_payment_intent_id) WHERE (gateway_payment_intent_id IS NOT NULL);


-- Name: idx_payments_gateway_transaction_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payments_gateway_transaction_id ON public.payments USING btree (gateway_transaction_id) WHERE (gateway_transaction_id IS NOT NULL);


-- Name: idx_payments_mp_payment_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON public.payments USING btree (mp_payment_id);


-- Name: idx_payments_mp_preference_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payments_mp_preference_id ON public.payments USING btree (mp_preference_id);


-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments USING btree (order_id) WHERE (order_id IS NOT NULL);


-- Name: idx_payments_organization_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON public.payments USING btree (organization_id);


-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments USING btree (status);


-- Name: idx_payments_user_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments USING btree (user_id) WHERE (user_id IS NOT NULL);


-- Name: idx_pos_sale_idempotency_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_pos_sale_idempotency_created_at ON public.pos_sale_idempotency USING btree (created_at);


-- Name: idx_pos_sessions_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_pos_sessions_branch_id ON public.pos_sessions USING btree (branch_id);


-- Name: idx_pos_sessions_cashier; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_pos_sessions_cashier ON public.pos_sessions USING btree (cashier_id);


-- Name: idx_pos_sessions_field_operation_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_pos_sessions_field_operation_id ON public.pos_sessions USING btree (field_operation_id);


-- Name: idx_pos_sessions_opening_time; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_pos_sessions_opening_time ON public.pos_sessions USING btree (opening_time DESC);


-- Name: idx_pos_sessions_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON public.pos_sessions USING btree (status);


-- Name: idx_pos_settings_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_pos_settings_branch_id ON public.pos_settings USING btree (branch_id);


-- Name: idx_pos_settings_branch_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_pos_settings_branch_unique ON public.pos_settings USING btree (branch_id) WHERE (branch_id IS NOT NULL);


-- Name: idx_pos_settings_org_global; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_pos_settings_org_global ON public.pos_settings USING btree (organization_id) WHERE (branch_id IS NULL);


-- Name: idx_pos_transactions_created; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_pos_transactions_created ON public.pos_transactions USING btree (created_at DESC);


-- Name: idx_pos_transactions_order; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_pos_transactions_order ON public.pos_transactions USING btree (order_id);


-- Name: idx_pos_transactions_session; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_pos_transactions_session ON public.pos_transactions USING btree (pos_session_id);


-- Name: idx_prescriptions_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_prescriptions_branch_id ON public.prescriptions USING btree (branch_id);


-- Name: idx_prescriptions_customer_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_prescriptions_customer_id ON public.prescriptions USING btree (customer_id);


-- Name: idx_prescriptions_field_operation; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_prescriptions_field_operation ON public.prescriptions USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);


-- Name: idx_prescriptions_is_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_prescriptions_is_active ON public.prescriptions USING btree (is_active) WHERE (is_active = true);


-- Name: idx_prescriptions_is_current; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_prescriptions_is_current ON public.prescriptions USING btree (is_current) WHERE (is_current = true);


-- Name: idx_prescriptions_organization_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_prescriptions_organization_id ON public.prescriptions USING btree (organization_id);


-- Name: idx_prescriptions_prescription_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_prescriptions_prescription_date ON public.prescriptions USING btree (prescription_date DESC);


-- Name: idx_product_branch_stock_available; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_product_branch_stock_available ON public.product_branch_stock USING btree (available_quantity);


-- Name: idx_product_branch_stock_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_product_branch_stock_branch ON public.product_branch_stock USING btree (branch_id);


-- Name: idx_product_branch_stock_contact_lens_low_stock; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_product_branch_stock_contact_lens_low_stock ON public.product_branch_stock USING btree (branch_id, available_quantity);


-- Name: idx_product_branch_stock_low_stock; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_product_branch_stock_low_stock ON public.product_branch_stock USING btree (branch_id, available_quantity) WHERE (available_quantity <= low_stock_threshold);


-- Name: idx_product_branch_stock_product; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_product_branch_stock_product ON public.product_branch_stock USING btree (product_id);


-- Name: idx_product_option_fields_category; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_product_option_fields_category ON public.product_option_fields USING btree (field_category);


-- Name: idx_product_option_fields_form_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_product_option_fields_form_type ON public.product_option_fields USING btree (form_type);


-- Name: idx_product_option_fields_key; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_product_option_fields_key ON public.product_option_fields USING btree (field_key);


-- Name: idx_product_option_values_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_product_option_values_active ON public.product_option_values USING btree (field_id, is_active) WHERE (is_active = true);


-- Name: idx_product_option_values_field_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_product_option_values_field_id ON public.product_option_values USING btree (field_id);


-- Name: idx_products_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_branch ON public.products USING btree (branch_id);


-- Name: idx_products_brand; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products USING btree (brand);


-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products USING btree (category_id);


-- Name: idx_products_contact_lens_family_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_contact_lens_family_id ON public.products USING btree (contact_lens_family_id) WHERE (contact_lens_family_id IS NOT NULL);


-- Name: idx_products_contact_lens_search; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_contact_lens_search ON public.products USING btree (name, brand, sku) WHERE (product_type = 'contact_lens'::text);


-- Name: idx_products_contact_lens_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_contact_lens_type ON public.products USING btree (product_type, optical_category) WHERE (product_type = 'contact_lens'::text);


-- Name: idx_products_featured; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products USING btree (is_featured);


-- Name: idx_products_frame_brand; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_frame_brand ON public.products USING btree (frame_brand);


-- Name: idx_products_frame_colors; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_frame_colors ON public.products USING gin (frame_colors);


-- Name: idx_products_frame_features; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_frame_features ON public.products USING gin (frame_features);


-- Name: idx_products_frame_gender; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_frame_gender ON public.products USING btree (frame_gender);


-- Name: idx_products_frame_material; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_frame_material ON public.products USING btree (frame_material);


-- Name: idx_products_frame_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_frame_type ON public.products USING btree (frame_type);


-- Name: idx_products_lens_coatings; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_lens_coatings ON public.products USING gin (lens_coatings);


-- Name: idx_products_lens_material; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_lens_material ON public.products USING btree (lens_material);


-- Name: idx_products_lens_tint_options; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_lens_tint_options ON public.products USING gin (lens_tint_options);


-- Name: idx_products_lens_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_lens_type ON public.products USING btree (lens_type);


-- Name: idx_products_optical_category; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_optical_category ON public.products USING btree (optical_category);


-- Name: idx_products_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_org ON public.products USING btree (organization_id) WHERE (organization_id IS NOT NULL);


-- Name: idx_products_price_includes_tax; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_price_includes_tax ON public.products USING btree (price_includes_tax);


-- Name: idx_products_product_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products USING btree (product_type);


-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING gin (search_keywords);


-- Name: idx_products_skin_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_skin_type ON public.products USING gin (skin_type);


-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products USING btree (slug);


-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_products_status ON public.products USING btree (status);


-- Name: idx_profiles_is_active_customer; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_profiles_is_active_customer ON public.profiles USING btree (is_active_customer) WHERE (is_active_customer = true);


-- Name: idx_profiles_last_eye_exam_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_profiles_last_eye_exam_date ON public.profiles USING btree (last_eye_exam_date);


-- Name: idx_profiles_next_eye_exam_due; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_profiles_next_eye_exam_due ON public.profiles USING btree (next_eye_exam_due);


-- Name: idx_profiles_rut; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_profiles_rut ON public.profiles USING btree (rut) WHERE (rut IS NOT NULL);


-- Name: idx_profiles_rut_normalized; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_profiles_rut_normalized ON public.profiles USING btree (public.normalize_rut_for_search(rut)) WHERE (rut IS NOT NULL);


-- Name: idx_quote_settings_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quote_settings_branch ON public.quote_settings USING btree (branch_id);


-- Name: idx_quote_settings_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quote_settings_branch_id ON public.quote_settings USING btree (branch_id);


-- Name: idx_quote_settings_branch_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_quote_settings_branch_unique ON public.quote_settings USING btree (branch_id) WHERE (branch_id IS NOT NULL);


-- Name: idx_quote_settings_global_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_quote_settings_global_unique ON public.quote_settings USING btree ((1)) WHERE (branch_id IS NULL);


-- Name: idx_quote_settings_org_global; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_quote_settings_org_global ON public.quote_settings USING btree (organization_id) WHERE (branch_id IS NULL);


-- Name: idx_quotes_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_branch ON public.quotes USING btree (branch_id);


-- Name: idx_quotes_contact_lens_family; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_contact_lens_family ON public.quotes USING btree (contact_lens_family_id) WHERE (contact_lens_family_id IS NOT NULL);


-- Name: idx_quotes_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes USING btree (created_at);


-- Name: idx_quotes_customer_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes USING btree (customer_id);


-- Name: idx_quotes_far_lens_family_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_far_lens_family_id ON public.quotes USING btree (far_lens_family_id);


-- Name: idx_quotes_field_operation; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_field_operation ON public.quotes USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);


-- Name: idx_quotes_lens_family_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_lens_family_id ON public.quotes USING btree (lens_family_id);


-- Name: idx_quotes_near_frame_product_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_near_frame_product_id ON public.quotes USING btree (near_frame_product_id);


-- Name: idx_quotes_near_lens_family_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_near_lens_family_id ON public.quotes USING btree (near_lens_family_id);


-- Name: idx_quotes_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_org ON public.quotes USING btree (organization_id) WHERE (organization_id IS NOT NULL);


-- Name: idx_quotes_presbyopia_solution; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_presbyopia_solution ON public.quotes USING btree (presbyopia_solution);


-- Name: idx_quotes_quote_number; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON public.quotes USING btree (quote_number);


-- Name: idx_quotes_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes USING btree (status);


-- Name: idx_saas_audit_log_action; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_audit_log_action ON public.saas_audit_log USING btree (action);


-- Name: idx_saas_audit_log_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_audit_log_created_at ON public.saas_audit_log USING btree (created_at DESC);


-- Name: idx_saas_audit_log_target; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_audit_log_target ON public.saas_audit_log USING btree (target_type, target_id);


-- Name: idx_saas_audit_log_user_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_audit_log_user_id ON public.saas_audit_log USING btree (user_id);


-- Name: idx_saas_backups_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_backups_created_at ON public.saas_backups USING btree (created_at DESC);


-- Name: idx_saas_support_messages_ticket; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_support_messages_ticket ON public.saas_support_messages USING btree (ticket_id, created_at DESC);


-- Name: idx_saas_support_tickets_assigned_to; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_assigned_to ON public.saas_support_tickets USING btree (assigned_to);


-- Name: idx_saas_support_tickets_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_created_at ON public.saas_support_tickets USING btree (created_at DESC);


-- Name: idx_saas_support_tickets_organization; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_organization ON public.saas_support_tickets USING btree (organization_id);


-- Name: idx_saas_support_tickets_priority; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_priority ON public.saas_support_tickets USING btree (priority);


-- Name: idx_saas_support_tickets_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_status ON public.saas_support_tickets USING btree (status);


-- Name: idx_saas_support_tickets_ticket_number; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_ticket_number ON public.saas_support_tickets USING btree (ticket_number);


-- Name: idx_schedule_settings_branch; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_schedule_settings_branch ON public.schedule_settings USING btree (branch_id);


-- Name: idx_schedule_settings_branch_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_schedule_settings_branch_unique ON public.schedule_settings USING btree (branch_id) WHERE (branch_id IS NOT NULL);


-- Name: idx_schedule_settings_global_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_schedule_settings_global_unique ON public.schedule_settings USING btree ((1)) WHERE (branch_id IS NULL);


-- Name: idx_schedule_settings_org_global; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_schedule_settings_org_global ON public.schedule_settings USING btree (organization_id) WHERE (branch_id IS NULL);


-- Name: idx_status_history_changed_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON public.lab_work_order_status_history USING btree (changed_at);


-- Name: idx_status_history_work_order_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_status_history_work_order_id ON public.lab_work_order_status_history USING btree (work_order_id);


-- Name: idx_subscription_tiers_gateway_plan; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_subscription_tiers_gateway_plan ON public.subscription_tiers USING btree (gateway_plan_id) WHERE (gateway_plan_id IS NOT NULL);


-- Name: idx_subscriptions_gateway_customer; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_customer ON public.subscriptions USING btree (gateway_customer_id) WHERE (gateway_customer_id IS NOT NULL);


-- Name: idx_subscriptions_gateway_payment_method; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_payment_method ON public.subscriptions USING btree (gateway_payment_method_id) WHERE (gateway_payment_method_id IS NOT NULL);


-- Name: idx_subscriptions_gateway_sub; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_sub ON public.subscriptions USING btree (gateway_subscription_id) WHERE (gateway_subscription_id IS NOT NULL);


-- Name: idx_subscriptions_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions USING btree (organization_id);


-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions USING btree (status);


-- Name: idx_support_categories_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_support_categories_branch_id ON public.support_categories USING btree (branch_id);


-- Name: idx_support_messages_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages USING btree (created_at);


-- Name: idx_support_messages_ticket_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages USING btree (ticket_id);


-- Name: idx_support_tickets_assigned_to; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to);


-- Name: idx_support_tickets_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_support_tickets_branch_id ON public.support_tickets USING btree (branch_id);


-- Name: idx_support_tickets_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets USING btree (created_at);


-- Name: idx_support_tickets_customer_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON public.support_tickets USING btree (customer_id);


-- Name: idx_support_tickets_priority; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets USING btree (priority);


-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets USING btree (status);


-- Name: idx_survey_invitations_expires; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_survey_invitations_expires ON public.survey_invitations USING btree (expires_at) WHERE (used_at IS NULL);


-- Name: idx_survey_invitations_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_survey_invitations_org ON public.survey_invitations USING btree (organization_id);


-- Name: idx_survey_invitations_token; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_survey_invitations_token ON public.survey_invitations USING btree (token);


-- Name: idx_survey_invitations_work_order; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_survey_invitations_work_order ON public.survey_invitations USING btree (work_order_id);


-- Name: idx_system_config_branch_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_config_branch_id ON public.system_config USING btree (branch_id) WHERE (branch_id IS NOT NULL);


-- Name: idx_system_config_category; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_config_category ON public.system_config USING btree (category);


-- Name: idx_system_config_key; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_config_key ON public.system_config USING btree (config_key);


-- Name: idx_system_config_organization_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_config_organization_id ON public.system_config USING btree (organization_id) WHERE (organization_id IS NOT NULL);


-- Name: idx_system_config_scope_unique; Type: INDEX; Schema: public; Owner: -

CREATE UNIQUE INDEX idx_system_config_scope_unique ON public.system_config USING btree (config_key, COALESCE((organization_id)::text, ''::text), COALESCE((branch_id)::text, ''::text));


-- Name: idx_system_email_templates_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_email_templates_active ON public.system_email_templates USING btree (is_active);


-- Name: idx_system_email_templates_category; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_email_templates_category ON public.system_email_templates USING btree (category);


-- Name: idx_system_email_templates_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_email_templates_org ON public.system_email_templates USING btree (organization_id);


-- Name: idx_system_email_templates_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_email_templates_type ON public.system_email_templates USING btree (type);


-- Name: idx_system_health_metrics_category; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_health_metrics_category ON public.system_health_metrics USING btree (category);


-- Name: idx_system_health_metrics_collected_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_health_metrics_collected_at ON public.system_health_metrics USING btree (collected_at);


-- Name: idx_system_health_metrics_expires_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_health_metrics_expires_at ON public.system_health_metrics USING btree (expires_at);


-- Name: idx_system_health_metrics_name; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_health_metrics_name ON public.system_health_metrics USING btree (metric_name);


-- Name: idx_system_maintenance_log_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_maintenance_log_created_at ON public.system_maintenance_log USING btree (created_at);


-- Name: idx_system_maintenance_log_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_maintenance_log_status ON public.system_maintenance_log USING btree (status);


-- Name: idx_system_maintenance_log_type; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_system_maintenance_log_type ON public.system_maintenance_log USING btree (task_type);


-- Name: idx_telemetry_aggregates_org_date; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_telemetry_aggregates_org_date ON public.telemetry_aggregates USING btree (organization_id, date);


-- Name: idx_telemetry_events_org_timestamp; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_telemetry_events_org_timestamp ON public.telemetry_events USING btree (organization_id, "timestamp");


-- Name: idx_telemetry_events_type_timestamp; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_telemetry_events_type_timestamp ON public.telemetry_events USING btree (event_type, "timestamp");


-- Name: idx_telemetry_events_user_timestamp; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_timestamp ON public.telemetry_events USING btree (user_id, "timestamp");


-- Name: idx_tier_change_audit_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_tier_change_audit_created_at ON public.tier_change_audit USING btree (created_at DESC);


-- Name: idx_tier_change_audit_organization; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_tier_change_audit_organization ON public.tier_change_audit USING btree (organization_id);


-- Name: idx_treatments_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_treatments_active ON public.treatments USING btree (organization_id, is_active);


-- Name: idx_treatments_category; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_treatments_category ON public.treatments USING btree (organization_id, category);


-- Name: idx_treatments_key; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_treatments_key ON public.treatments USING btree (treatment_key);


-- Name: idx_treatments_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_treatments_org ON public.treatments USING btree (organization_id);


-- Name: idx_user_tour_progress_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_user_tour_progress_org ON public.user_tour_progress USING btree (organization_id);


-- Name: idx_user_tour_progress_status; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_user_tour_progress_status ON public.user_tour_progress USING btree (status);


-- Name: idx_user_tour_progress_user; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_user_tour_progress_user ON public.user_tour_progress USING btree (user_id);


-- Name: idx_variants_product; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants USING btree (product_id);


-- Name: idx_variants_sku; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.product_variants USING btree (sku);


-- Name: idx_vehicles_active; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_vehicles_active ON public.vehicles USING btree (is_active);


-- Name: idx_vehicles_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_vehicles_org ON public.vehicles USING btree (organization_id);


-- Name: idx_webhook_events_created_at; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events USING btree (created_at DESC);


-- Name: idx_webhook_events_gateway_event_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway_event_id ON public.webhook_events USING btree (gateway, gateway_event_id);


-- Name: idx_webhook_events_payment_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_id ON public.webhook_events USING btree (payment_id) WHERE (payment_id IS NOT NULL);


-- Name: idx_webhook_events_processed; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events USING btree (processed) WHERE (processed = false);


-- Name: idx_whatsapp_phone_numbers_org; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_numbers_org ON public.whatsapp_phone_numbers USING btree (organization_id);


-- Name: idx_whatsapp_phone_numbers_phone_id; Type: INDEX; Schema: public; Owner: -

CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_numbers_phone_id ON public.whatsapp_phone_numbers USING btree (phone_number_id);


-- Name: categories check_default_category_deletion; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER check_default_category_deletion BEFORE DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.prevent_default_category_deletion();


-- Name: quotes check_quote_prescription_customer; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER check_quote_prescription_customer BEFORE INSERT OR UPDATE OF prescription_id, customer_id ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.check_quote_prescription_customer_match();


-- Name: categories check_system_category_deletion; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER check_system_category_deletion BEFORE DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.prevent_system_category_deletion();


-- Name: TRIGGER check_system_category_deletion ON categories; Type: COMMENT; Schema: public; Owner: -



-- Name: internal_orders log_internal_order_status_changes; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER log_internal_order_status_changes AFTER UPDATE OF status ON public.internal_orders FOR EACH ROW EXECUTE FUNCTION public.log_internal_order_status_change();


-- Name: optical_internal_support_tickets set_optical_internal_ticket_number_trigger; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER set_optical_internal_ticket_number_trigger BEFORE INSERT ON public.optical_internal_support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_optical_internal_ticket_number();


-- Name: saas_support_tickets set_saas_ticket_number_trigger; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER set_saas_ticket_number_trigger BEFORE INSERT ON public.saas_support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_saas_ticket_number();


-- Name: orders trg_orders_agreement_customers; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trg_orders_agreement_customers AFTER INSERT ON public.orders FOR EACH ROW WHEN (((new.agreement_id IS NOT NULL) AND (new.customer_id IS NOT NULL))) EXECUTE FUNCTION public.sync_agreement_customers_on_order();


-- Name: quotes trigger_check_quote_expiration; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_check_quote_expiration BEFORE INSERT OR UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.check_quote_expiration();


-- Name: demo_requests trigger_demo_request_activity; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_demo_request_activity AFTER UPDATE ON public.demo_requests FOR EACH ROW EXECUTE FUNCTION public.handle_demo_request_activity();


-- Name: products trigger_notify_admin_low_stock; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_notify_admin_low_stock AFTER UPDATE OF inventory_quantity ON public.products FOR EACH ROW EXECUTE FUNCTION public.notify_admin_low_stock();


-- Name: quotes trigger_preserve_quote_original_status; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_preserve_quote_original_status BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.preserve_quote_original_status();


-- Name: support_tickets trigger_set_ticket_number; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_set_ticket_number BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();


-- Name: optical_internal_support_messages trigger_update_optical_internal_ticket_timestamps; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_update_optical_internal_ticket_timestamps AFTER INSERT ON public.optical_internal_support_messages FOR EACH ROW EXECUTE FUNCTION public.update_optical_internal_ticket_timestamps();


-- Name: product_branch_stock trigger_update_stock_movement; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_update_stock_movement BEFORE UPDATE ON public.product_branch_stock FOR EACH ROW EXECUTE FUNCTION public.update_stock_movement_timestamp();


-- Name: support_messages trigger_update_ticket_timestamps; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER trigger_update_ticket_timestamps AFTER INSERT ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.update_ticket_timestamps();


-- Name: agreement_customers update_agreement_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_agreement_customers_updated_at BEFORE UPDATE ON public.agreement_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: agreement_institutional_balances update_agreement_institutional_balances_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_agreement_institutional_balances_updated_at BEFORE UPDATE ON public.agreement_institutional_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: agreement_institutional_invoices update_agreement_institutional_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_agreement_institutional_invoices_updated_at BEFORE UPDATE ON public.agreement_institutional_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: agreement_purchase_orders update_agreement_purchase_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_agreement_purchase_orders_updated_at BEFORE UPDATE ON public.agreement_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: agreements update_agreements_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: ai_insights update_ai_insights_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON public.ai_insights FOR EACH ROW EXECUTE FUNCTION public.update_ai_insights_updated_at();


-- Name: appointments update_appointments_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: branches update_branches_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: cart_items update_cart_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_cart_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: chat_messages update_chat_session_on_message; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_chat_session_on_message AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_chat_session_updated_at();


-- Name: chat_messages update_chat_session_stats_on_message; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_chat_session_stats_on_message AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_chat_session_stats();


-- Name: contact_lens_encargos update_contact_lens_encargos_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_contact_lens_encargos_updated_at BEFORE UPDATE ON public.contact_lens_encargos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: contact_lens_families update_contact_lens_families_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_contact_lens_families_updated_at BEFORE UPDATE ON public.contact_lens_families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: contact_lens_inventory update_contact_lens_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_contact_lens_inventory_updated_at BEFORE UPDATE ON public.contact_lens_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: contact_lens_price_matrices update_contact_lens_price_matrices_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_contact_lens_price_matrices_updated_at BEFORE UPDATE ON public.contact_lens_price_matrices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: credit_notes update_credit_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: customer_lens_purchases update_customer_lens_purchases_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_customer_lens_purchases_updated_at BEFORE UPDATE ON public.customer_lens_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: drivers update_drivers_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: embeddings update_embeddings_timestamp; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_embeddings_timestamp BEFORE UPDATE ON public.embeddings FOR EACH ROW EXECUTE FUNCTION public.update_embeddings_updated_at();


-- Name: internal_orders update_internal_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_internal_orders_updated_at BEFORE UPDATE ON public.internal_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: lab_work_orders update_lab_work_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_lab_work_orders_updated_at BEFORE UPDATE ON public.lab_work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: lens_families update_lens_families_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_lens_families_updated_at BEFORE UPDATE ON public.lens_families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: lens_price_matrices update_lens_price_matrices_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_lens_price_matrices_updated_at BEFORE UPDATE ON public.lens_price_matrices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: memory_facts update_memory_facts_timestamp; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_memory_facts_timestamp BEFORE UPDATE ON public.memory_facts FOR EACH ROW EXECUTE FUNCTION public.update_embeddings_updated_at();


-- Name: optical_internal_support_messages update_optical_internal_support_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_optical_internal_support_messages_updated_at BEFORE UPDATE ON public.optical_internal_support_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: optical_internal_support_tickets update_optical_internal_support_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_optical_internal_support_tickets_updated_at BEFORE UPDATE ON public.optical_internal_support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: payment_gateways_config update_payment_gateways_config_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_payment_gateways_config_updated_at BEFORE UPDATE ON public.payment_gateways_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: payment_installments update_payment_installments_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_payment_installments_updated_at BEFORE UPDATE ON public.payment_installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: pos_sessions update_pos_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_pos_sessions_updated_at BEFORE UPDATE ON public.pos_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: pos_settings update_pos_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_pos_settings_updated_at BEFORE UPDATE ON public.pos_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: pos_transactions update_pos_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_pos_transactions_updated_at BEFORE UPDATE ON public.pos_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: prescriptions update_prescriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: product_branch_stock update_product_branch_stock_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_product_branch_stock_updated_at BEFORE UPDATE ON public.product_branch_stock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: product_option_fields update_product_option_fields_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_product_option_fields_updated_at BEFORE UPDATE ON public.product_option_fields FOR EACH ROW EXECUTE FUNCTION public.update_product_option_fields_updated_at();


-- Name: product_option_values update_product_option_values_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_product_option_values_updated_at BEFORE UPDATE ON public.product_option_values FOR EACH ROW EXECUTE FUNCTION public.update_product_option_values_updated_at();


-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: quote_settings update_quote_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_quote_settings_updated_at BEFORE UPDATE ON public.quote_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: quotes update_quotes_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: saas_support_messages update_saas_support_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_saas_support_messages_updated_at BEFORE UPDATE ON public.saas_support_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: saas_support_templates update_saas_support_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_saas_support_templates_updated_at BEFORE UPDATE ON public.saas_support_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: saas_support_tickets update_saas_support_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_saas_support_tickets_updated_at BEFORE UPDATE ON public.saas_support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: schedule_settings update_schedule_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_schedule_settings_updated_at BEFORE UPDATE ON public.schedule_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: support_categories update_support_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_support_categories_updated_at BEFORE UPDATE ON public.support_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: support_messages update_support_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_support_messages_updated_at BEFORE UPDATE ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: support_templates update_support_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_support_templates_updated_at BEFORE UPDATE ON public.support_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: support_tickets update_support_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: system_config update_system_config_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: system_email_templates update_system_email_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_system_email_templates_updated_at BEFORE UPDATE ON public.system_email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: system_maintenance_log update_system_maintenance_log_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_system_maintenance_log_updated_at BEFORE UPDATE ON public.system_maintenance_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: telemetry_aggregates update_telemetry_aggregates_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_telemetry_aggregates_updated_at BEFORE UPDATE ON public.telemetry_aggregates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: telemetry_config update_telemetry_config_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_telemetry_config_updated_at BEFORE UPDATE ON public.telemetry_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: treatments update_treatments_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: user_tour_progress update_user_tour_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_user_tour_progress_updated_at BEFORE UPDATE ON public.user_tour_progress FOR EACH ROW EXECUTE FUNCTION public.update_user_tour_progress_updated_at();


-- Name: product_variants update_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: vehicles update_vehicles_updated_at; Type: TRIGGER; Schema: public; Owner: -

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Name: admin_activity_log admin_activity_log_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_activity_log
    ADD CONSTRAINT admin_activity_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: admin_branch_access admin_branch_access_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_branch_access
    ADD CONSTRAINT admin_branch_access_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


-- Name: admin_branch_access admin_branch_access_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_branch_access
    ADD CONSTRAINT admin_branch_access_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: admin_notifications admin_notifications_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notifications_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- Name: admin_notifications admin_notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: admin_notifications admin_notifications_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: admin_notifications admin_notifications_target_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notifications_target_admin_id_fkey FOREIGN KEY (target_admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- Name: admin_users admin_users_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_users
    ADD CONSTRAINT admin_users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


-- Name: admin_users admin_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_users
    ADD CONSTRAINT admin_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- Name: admin_users admin_users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.admin_users
    ADD CONSTRAINT admin_users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


-- Name: agreement_customers agreement_customers_agreement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_customers
    ADD CONSTRAINT agreement_customers_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;


-- Name: agreement_customers agreement_customers_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_customers
    ADD CONSTRAINT agreement_customers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


-- Name: agreement_institutional_balances agreement_institutional_balances_agreement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_balances
    ADD CONSTRAINT agreement_institutional_balances_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;


-- Name: agreement_institutional_balances agreement_institutional_balances_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_balances
    ADD CONSTRAINT agreement_institutional_balances_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


-- Name: agreement_institutional_balances agreement_institutional_balances_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_balances
    ADD CONSTRAINT agreement_institutional_balances_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.agreement_purchase_orders(id) ON DELETE SET NULL;


-- Name: agreement_institutional_invoice_balances agreement_institutional_invoice_balances_balance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_invoice_balances
    ADD CONSTRAINT agreement_institutional_invoice_balances_balance_id_fkey FOREIGN KEY (balance_id) REFERENCES public.agreement_institutional_balances(id) ON DELETE CASCADE;


-- Name: agreement_institutional_invoice_balances agreement_institutional_invoice_balances_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_invoice_balances
    ADD CONSTRAINT agreement_institutional_invoice_balances_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.agreement_institutional_invoices(id) ON DELETE CASCADE;


-- Name: agreement_institutional_invoices agreement_institutional_invoices_agreement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_invoices
    ADD CONSTRAINT agreement_institutional_invoices_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;


-- Name: agreement_institutional_invoices agreement_institutional_invoices_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_invoices
    ADD CONSTRAINT agreement_institutional_invoices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: agreement_institutional_invoices agreement_institutional_invoices_emitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_invoices
    ADD CONSTRAINT agreement_institutional_invoices_emitted_by_fkey FOREIGN KEY (emitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: agreement_institutional_invoices agreement_institutional_invoices_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_invoices
    ADD CONSTRAINT agreement_institutional_invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: agreement_purchase_orders agreement_purchase_orders_agreement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_purchase_orders
    ADD CONSTRAINT agreement_purchase_orders_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;


-- Name: agreements agreements_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreements
    ADD CONSTRAINT agreements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- Name: agreements agreements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreements
    ADD CONSTRAINT agreements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: agreements agreements_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreements
    ADD CONSTRAINT agreements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: agreements agreements_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreements
    ADD CONSTRAINT agreements_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: ai_insights ai_insights_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.ai_insights
    ADD CONSTRAINT ai_insights_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: ai_usage_log ai_usage_log_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.ai_usage_log
    ADD CONSTRAINT ai_usage_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: appointments appointments_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


-- Name: appointments appointments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- Name: appointments appointments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


-- Name: appointments appointments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


-- Name: appointments appointments_field_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;


-- Name: appointments appointments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


-- Name: appointments appointments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: appointments appointments_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id);


-- Name: branches branches_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.branches
    ADD CONSTRAINT branches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- Name: cart_items cart_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


-- Name: cash_register_closures cash_register_closures_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.cash_register_closures
    ADD CONSTRAINT cash_register_closures_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: cash_register_closures cash_register_closures_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.cash_register_closures
    ADD CONSTRAINT cash_register_closures_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: cash_register_closures cash_register_closures_field_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.cash_register_closures
    ADD CONSTRAINT cash_register_closures_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;


-- Name: cash_register_closures cash_register_closures_pos_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.cash_register_closures
    ADD CONSTRAINT cash_register_closures_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;


-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


-- Name: chat_sessions chat_sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.chat_sessions
    ADD CONSTRAINT chat_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- Name: contact_lens_encargos contact_lens_encargos_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: contact_lens_encargos contact_lens_encargos_contact_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id) ON DELETE CASCADE;


-- Name: contact_lens_encargos contact_lens_encargos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);


-- Name: contact_lens_encargos contact_lens_encargos_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


-- Name: contact_lens_encargos contact_lens_encargos_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: contact_lens_families contact_lens_families_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_families
    ADD CONSTRAINT contact_lens_families_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


-- Name: contact_lens_families contact_lens_families_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_families
    ADD CONSTRAINT contact_lens_families_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: contact_lens_inventory contact_lens_inventory_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_inventory
    ADD CONSTRAINT contact_lens_inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: contact_lens_inventory contact_lens_inventory_contact_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_inventory
    ADD CONSTRAINT contact_lens_inventory_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id) ON DELETE CASCADE;


-- Name: contact_lens_price_matrices contact_lens_price_matrices_contact_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_price_matrices
    ADD CONSTRAINT contact_lens_price_matrices_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id) ON DELETE CASCADE;


-- Name: contact_lens_price_matrices contact_lens_price_matrices_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.contact_lens_price_matrices
    ADD CONSTRAINT contact_lens_price_matrices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: credit_note_movements credit_note_movements_credit_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.credit_note_movements
    ADD CONSTRAINT credit_note_movements_credit_note_id_fkey FOREIGN KEY (credit_note_id) REFERENCES public.credit_notes(id) ON DELETE CASCADE;


-- Name: credit_note_movements credit_note_movements_pos_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.credit_note_movements
    ADD CONSTRAINT credit_note_movements_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;


-- Name: credit_notes credit_notes_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- Name: credit_notes credit_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: credit_notes credit_notes_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


-- Name: credit_notes credit_notes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


-- Name: credit_notes credit_notes_pos_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.credit_notes
    ADD CONSTRAINT credit_notes_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;


-- Name: customer_lens_purchases customer_lens_purchases_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customer_lens_purchases
    ADD CONSTRAINT customer_lens_purchases_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


-- Name: customer_lens_purchases customer_lens_purchases_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customer_lens_purchases
    ADD CONSTRAINT customer_lens_purchases_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


-- Name: customer_lens_purchases customer_lens_purchases_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customer_lens_purchases
    ADD CONSTRAINT customer_lens_purchases_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE SET NULL;


-- Name: customer_lens_purchases customer_lens_purchases_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customer_lens_purchases
    ADD CONSTRAINT customer_lens_purchases_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


-- Name: customer_satisfaction_surveys customer_satisfaction_surveys_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customer_satisfaction_surveys
    ADD CONSTRAINT customer_satisfaction_surveys_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


-- Name: customer_satisfaction_surveys customer_satisfaction_surveys_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customer_satisfaction_surveys
    ADD CONSTRAINT customer_satisfaction_surveys_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: customer_satisfaction_surveys customer_satisfaction_surveys_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customer_satisfaction_surveys
    ADD CONSTRAINT customer_satisfaction_surveys_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.lab_work_orders(id) ON DELETE SET NULL;


-- Name: customers customers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customers
    ADD CONSTRAINT customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: customers customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


-- Name: customers customers_field_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customers
    ADD CONSTRAINT customers_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;


-- Name: customers customers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customers
    ADD CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: customers customers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.customers
    ADD CONSTRAINT customers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


-- Name: demo_requests demo_requests_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.demo_requests
    ADD CONSTRAINT demo_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id);


-- Name: demo_requests demo_requests_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.demo_requests
    ADD CONSTRAINT demo_requests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


-- Name: demo_requests demo_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.demo_requests
    ADD CONSTRAINT demo_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: drivers drivers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: embeddings embeddings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.embeddings
    ADD CONSTRAINT embeddings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: field_operations field_operations_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.field_operations
    ADD CONSTRAINT field_operations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;


-- Name: field_operations field_operations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.field_operations
    ADD CONSTRAINT field_operations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: field_operations field_operations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.field_operations
    ADD CONSTRAINT field_operations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


-- Name: agreement_institutional_balances fk_agreement_institutional_balances_invoice_id; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_balances
    ADD CONSTRAINT fk_agreement_institutional_balances_invoice_id FOREIGN KEY (invoice_id) REFERENCES public.agreement_institutional_invoices(id) ON DELETE SET NULL;


-- Name: internal_order_items internal_order_items_internal_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_order_items
    ADD CONSTRAINT internal_order_items_internal_order_id_fkey FOREIGN KEY (internal_order_id) REFERENCES public.internal_orders(id) ON DELETE CASCADE;


-- Name: internal_order_items internal_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_order_items
    ADD CONSTRAINT internal_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


-- Name: internal_order_status_history internal_order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_order_status_history
    ADD CONSTRAINT internal_order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


-- Name: internal_order_status_history internal_order_status_history_internal_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_order_status_history
    ADD CONSTRAINT internal_order_status_history_internal_order_id_fkey FOREIGN KEY (internal_order_id) REFERENCES public.internal_orders(id) ON DELETE CASCADE;


-- Name: internal_orders internal_orders_assigned_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_assigned_driver_id_fkey FOREIGN KEY (assigned_driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;


-- Name: internal_orders internal_orders_assigned_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_assigned_vehicle_id_fkey FOREIGN KEY (assigned_vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


-- Name: internal_orders internal_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE RESTRICT;


-- Name: internal_orders internal_orders_destination_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_destination_branch_id_fkey FOREIGN KEY (destination_branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;


-- Name: internal_orders internal_orders_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: internal_orders internal_orders_origin_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.internal_orders
    ADD CONSTRAINT internal_orders_origin_branch_id_fkey FOREIGN KEY (origin_branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;


-- Name: inventory_movements inventory_movements_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.inventory_movements
    ADD CONSTRAINT inventory_movements_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: inventory_movements inventory_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: inventory_movements inventory_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.inventory_movements
    ADD CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


-- Name: lab_work_order_status_history lab_work_order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_order_status_history
    ADD CONSTRAINT lab_work_order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


-- Name: lab_work_order_status_history lab_work_order_status_history_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_order_status_history
    ADD CONSTRAINT lab_work_order_status_history_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.lab_work_orders(id) ON DELETE CASCADE;


-- Name: lab_work_orders lab_work_orders_agreement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE SET NULL;


-- Name: lab_work_orders lab_work_orders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


-- Name: lab_work_orders lab_work_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- Name: lab_work_orders lab_work_orders_contact_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id) ON DELETE SET NULL;


-- Name: lab_work_orders lab_work_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


-- Name: lab_work_orders lab_work_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


-- Name: lab_work_orders lab_work_orders_far_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_far_lens_family_id_fkey FOREIGN KEY (far_lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;


-- Name: lab_work_orders lab_work_orders_field_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;


-- Name: lab_work_orders lab_work_orders_frame_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_frame_product_id_fkey FOREIGN KEY (frame_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


-- Name: lab_work_orders lab_work_orders_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_lens_family_id_fkey FOREIGN KEY (lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;


-- Name: lab_work_orders lab_work_orders_near_frame_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_near_frame_product_id_fkey FOREIGN KEY (near_frame_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


-- Name: lab_work_orders lab_work_orders_near_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_near_lens_family_id_fkey FOREIGN KEY (near_lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;


-- Name: lab_work_orders lab_work_orders_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: lab_work_orders lab_work_orders_pos_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_pos_order_id_fkey FOREIGN KEY (pos_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


-- Name: lab_work_orders lab_work_orders_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE SET NULL;


-- Name: lab_work_orders lab_work_orders_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders
    ADD CONSTRAINT lab_work_orders_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


-- Name: lead_activities lead_activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lead_activities
    ADD CONSTRAINT lead_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


-- Name: lead_activities lead_activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lead_activities
    ADD CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.demo_requests(id) ON DELETE CASCADE;


-- Name: lead_scoring_logs lead_scoring_logs_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lead_scoring_logs
    ADD CONSTRAINT lead_scoring_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.demo_requests(id) ON DELETE CASCADE;


-- Name: lens_families lens_families_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lens_families
    ADD CONSTRAINT lens_families_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


-- Name: lens_families lens_families_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lens_families
    ADD CONSTRAINT lens_families_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: lens_price_matrices lens_price_matrices_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lens_price_matrices
    ADD CONSTRAINT lens_price_matrices_lens_family_id_fkey FOREIGN KEY (lens_family_id) REFERENCES public.lens_families(id) ON DELETE CASCADE;


-- Name: lens_price_matrices lens_price_matrices_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.lens_price_matrices
    ADD CONSTRAINT lens_price_matrices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: memory_facts memory_facts_source_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.memory_facts
    ADD CONSTRAINT memory_facts_source_session_id_fkey FOREIGN KEY (source_session_id) REFERENCES public.chat_sessions(id) ON DELETE SET NULL;


-- Name: memory_facts memory_facts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.memory_facts
    ADD CONSTRAINT memory_facts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- Name: notification_settings notification_settings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.notification_settings
    ADD CONSTRAINT notification_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: notification_settings notification_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.notification_settings
    ADD CONSTRAINT notification_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: operativo_mobile_stock operativo_mobile_stock_field_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.operativo_mobile_stock
    ADD CONSTRAINT operativo_mobile_stock_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE CASCADE;


-- Name: operativo_mobile_stock operativo_mobile_stock_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.operativo_mobile_stock
    ADD CONSTRAINT operativo_mobile_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


-- Name: operativo_sync_queue operativo_sync_queue_field_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.operativo_sync_queue
    ADD CONSTRAINT operativo_sync_queue_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE CASCADE;


-- Name: optical_internal_support_messages optical_internal_support_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_messages
    ADD CONSTRAINT optical_internal_support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: optical_internal_support_messages optical_internal_support_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_messages
    ADD CONSTRAINT optical_internal_support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.optical_internal_support_tickets(id) ON DELETE CASCADE;


-- Name: optical_internal_support_tickets optical_internal_support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: optical_internal_support_tickets optical_internal_support_tickets_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- Name: optical_internal_support_tickets optical_internal_support_tickets_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: optical_internal_support_tickets optical_internal_support_tickets_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


-- Name: optical_internal_support_tickets optical_internal_support_tickets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: optical_internal_support_tickets optical_internal_support_tickets_related_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_related_appointment_id_fkey FOREIGN KEY (related_appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


-- Name: optical_internal_support_tickets optical_internal_support_tickets_related_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_related_order_id_fkey FOREIGN KEY (related_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


-- Name: optical_internal_support_tickets optical_internal_support_tickets_related_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_related_quote_id_fkey FOREIGN KEY (related_quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


-- Name: optical_internal_support_tickets optical_internal_support_tickets_related_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_related_work_order_id_fkey FOREIGN KEY (related_work_order_id) REFERENCES public.lab_work_orders(id) ON DELETE SET NULL;


-- Name: optical_internal_support_tickets optical_internal_support_tickets_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: opticas_access_tokens opticas_access_tokens_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.opticas_access_tokens
    ADD CONSTRAINT opticas_access_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;


-- Name: order_payments order_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.order_payments
    ADD CONSTRAINT order_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


-- Name: order_payments order_payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.order_payments
    ADD CONSTRAINT order_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


-- Name: order_payments order_payments_pos_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.order_payments
    ADD CONSTRAINT order_payments_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;


-- Name: orders orders_agreement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE SET NULL;


-- Name: orders orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


-- Name: orders orders_field_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;


-- Name: orders orders_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: orders orders_pos_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_pos_cashier_id_fkey FOREIGN KEY (pos_cashier_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: orders orders_pos_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;


-- Name: orders orders_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.agreement_purchase_orders(id) ON DELETE SET NULL;


-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: organizations organizations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: payment_installments payment_installments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.payment_installments
    ADD CONSTRAINT payment_installments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


-- Name: payments payments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.payments
    ADD CONSTRAINT payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: pos_sale_idempotency pos_sale_idempotency_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_sale_idempotency
    ADD CONSTRAINT pos_sale_idempotency_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


-- Name: pos_sale_idempotency pos_sale_idempotency_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_sale_idempotency
    ADD CONSTRAINT pos_sale_idempotency_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.lab_work_orders(id) ON DELETE SET NULL;


-- Name: pos_sessions pos_sessions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: pos_sessions pos_sessions_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: pos_sessions pos_sessions_field_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;


-- Name: pos_sessions pos_sessions_reopened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_reopened_by_fkey FOREIGN KEY (reopened_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: pos_settings pos_settings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_settings
    ADD CONSTRAINT pos_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: pos_settings pos_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_settings
    ADD CONSTRAINT pos_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: pos_transactions pos_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_transactions
    ADD CONSTRAINT pos_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


-- Name: pos_transactions pos_transactions_pos_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.pos_transactions
    ADD CONSTRAINT pos_transactions_pos_session_id_fkey FOREIGN KEY (pos_session_id) REFERENCES public.pos_sessions(id) ON DELETE SET NULL;


-- Name: prescriptions prescriptions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- Name: prescriptions prescriptions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


-- Name: prescriptions prescriptions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


-- Name: prescriptions prescriptions_field_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;


-- Name: prescriptions prescriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: product_branch_stock product_branch_stock_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_branch_stock
    ADD CONSTRAINT product_branch_stock_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: product_branch_stock product_branch_stock_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_branch_stock
    ADD CONSTRAINT product_branch_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


-- Name: product_option_values product_option_values_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_option_values
    ADD CONSTRAINT product_option_values_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.product_option_fields(id) ON DELETE CASCADE;


-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


-- Name: products products_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.products
    ADD CONSTRAINT products_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


-- Name: products products_contact_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.products
    ADD CONSTRAINT products_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id);


-- Name: products products_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.products
    ADD CONSTRAINT products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- Name: profiles profiles_preferred_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_preferred_branch_id_fkey FOREIGN KEY (preferred_branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- Name: quote_settings quote_settings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quote_settings
    ADD CONSTRAINT quote_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: quote_settings quote_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quote_settings
    ADD CONSTRAINT quote_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: quote_settings quote_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quote_settings
    ADD CONSTRAINT quote_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


-- Name: quotes quotes_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


-- Name: quotes quotes_contact_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id) ON DELETE SET NULL;


-- Name: quotes quotes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


-- Name: quotes quotes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


-- Name: quotes quotes_far_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_far_lens_family_id_fkey FOREIGN KEY (far_lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;


-- Name: quotes quotes_field_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;


-- Name: quotes quotes_frame_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_frame_product_id_fkey FOREIGN KEY (frame_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


-- Name: quotes quotes_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_lens_family_id_fkey FOREIGN KEY (lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;


-- Name: quotes quotes_near_frame_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_near_frame_product_id_fkey FOREIGN KEY (near_frame_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


-- Name: quotes quotes_near_lens_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_near_lens_family_id_fkey FOREIGN KEY (near_lens_family_id) REFERENCES public.lens_families(id) ON DELETE SET NULL;


-- Name: quotes quotes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: quotes quotes_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE SET NULL;


-- Name: quotes quotes_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES auth.users(id);


-- Name: saas_audit_log saas_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_audit_log
    ADD CONSTRAINT saas_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: saas_backups saas_backups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_backups
    ADD CONSTRAINT saas_backups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: saas_support_messages saas_support_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_support_messages
    ADD CONSTRAINT saas_support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: saas_support_messages saas_support_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_support_messages
    ADD CONSTRAINT saas_support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.saas_support_tickets(id) ON DELETE CASCADE;


-- Name: saas_support_templates saas_support_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_support_templates
    ADD CONSTRAINT saas_support_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: saas_support_tickets saas_support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: saas_support_tickets saas_support_tickets_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: saas_support_tickets saas_support_tickets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


-- Name: saas_support_tickets saas_support_tickets_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: schedule_settings schedule_settings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.schedule_settings
    ADD CONSTRAINT schedule_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: schedule_settings schedule_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.schedule_settings
    ADD CONSTRAINT schedule_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: schedule_settings schedule_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.schedule_settings
    ADD CONSTRAINT schedule_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


-- Name: subscriptions subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: support_categories support_categories_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_categories
    ADD CONSTRAINT support_categories_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: support_messages support_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_messages
    ADD CONSTRAINT support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: support_messages support_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_messages
    ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


-- Name: support_templates support_templates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_templates
    ADD CONSTRAINT support_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.support_categories(id) ON DELETE SET NULL;


-- Name: support_templates support_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_templates
    ADD CONSTRAINT support_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: support_tickets support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: support_tickets support_tickets_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: support_tickets support_tickets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.support_categories(id) ON DELETE SET NULL;


-- Name: support_tickets support_tickets_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: support_tickets support_tickets_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


-- Name: support_tickets support_tickets_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: survey_invitations survey_invitations_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.survey_invitations
    ADD CONSTRAINT survey_invitations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


-- Name: survey_invitations survey_invitations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.survey_invitations
    ADD CONSTRAINT survey_invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: survey_invitations survey_invitations_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.survey_invitations
    ADD CONSTRAINT survey_invitations_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.lab_work_orders(id) ON DELETE CASCADE;


-- Name: system_config system_config_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.system_config
    ADD CONSTRAINT system_config_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


-- Name: system_config system_config_last_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.system_config
    ADD CONSTRAINT system_config_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: system_config system_config_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.system_config
    ADD CONSTRAINT system_config_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: system_email_templates system_email_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.system_email_templates
    ADD CONSTRAINT system_email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: system_email_templates system_email_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.system_email_templates
    ADD CONSTRAINT system_email_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: system_maintenance_log system_maintenance_log_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.system_maintenance_log
    ADD CONSTRAINT system_maintenance_log_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: telemetry_aggregates telemetry_aggregates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.telemetry_aggregates
    ADD CONSTRAINT telemetry_aggregates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: telemetry_config telemetry_config_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.telemetry_config
    ADD CONSTRAINT telemetry_config_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: telemetry_events telemetry_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.telemetry_events
    ADD CONSTRAINT telemetry_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: telemetry_events telemetry_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.telemetry_events
    ADD CONSTRAINT telemetry_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- Name: tier_change_audit tier_change_audit_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.tier_change_audit
    ADD CONSTRAINT tier_change_audit_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


-- Name: tier_change_audit tier_change_audit_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.tier_change_audit
    ADD CONSTRAINT tier_change_audit_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: treatments treatments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: user_tour_progress user_tour_progress_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.user_tour_progress
    ADD CONSTRAINT user_tour_progress_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: user_tour_progress user_tour_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.user_tour_progress
    ADD CONSTRAINT user_tour_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- Name: vehicles vehicles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: webhook_events webhook_events_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.webhook_events
    ADD CONSTRAINT webhook_events_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;


-- Name: whatsapp_phone_numbers whatsapp_phone_numbers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

ALTER TABLE public.whatsapp_phone_numbers
    ADD CONSTRAINT whatsapp_phone_numbers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- Name: system_maintenance_log Admin users can create maintenance logs; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can create maintenance logs" ON public.system_maintenance_log FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: products Admin users can delete all products; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can delete all products" ON public.products FOR DELETE USING (public.is_admin(auth.uid()));


-- Name: system_health_metrics Admin users can delete health metrics; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can delete health metrics" ON public.system_health_metrics FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: system_health_metrics Admin users can insert health metrics; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can insert health metrics" ON public.system_health_metrics FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: POLICY "Admin users can insert health metrics" ON system_health_metrics; Type: COMMENT; Schema: public; Owner: -



-- Name: categories Admin users can manage categories; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can manage categories" ON public.categories USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


-- Name: support_messages Admin users can manage messages; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can manage messages" ON public.support_messages USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: product_variants Admin users can manage product variants; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can manage product variants" ON public.product_variants USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


-- Name: POLICY "Admin users can manage product variants" ON product_variants; Type: COMMENT; Schema: public; Owner: -



-- Name: support_categories Admin users can manage support categories; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can manage support categories" ON public.support_categories USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: support_templates Admin users can manage templates; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can manage templates" ON public.support_templates USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: support_tickets Admin users can manage tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can manage tickets" ON public.support_tickets USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: products Admin users can update all products; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can update all products" ON public.products FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


-- Name: system_health_metrics Admin users can update health metrics; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can update health metrics" ON public.system_health_metrics FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: categories Admin users can view all categories; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can view all categories" ON public.categories FOR SELECT USING (public.is_admin(auth.uid()));


-- Name: chat_messages Admin users can view all chat messages; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can view all chat messages" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: chat_sessions Admin users can view all chat sessions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can view all chat sessions" ON public.chat_sessions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: system_config Admin users can view all config; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can view all config" ON public.system_config FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: memory_facts Admin users can view all memory facts; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can view all memory facts" ON public.memory_facts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: support_messages Admin users can view all messages; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can view all messages" ON public.support_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: product_variants Admin users can view all product variants; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can view all product variants" ON public.product_variants FOR SELECT USING (public.is_admin(auth.uid()));


-- Name: products Admin users can view all products; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can view all products" ON public.products FOR SELECT USING (public.is_admin(auth.uid()));


-- Name: POLICY "Admin users can view all products" ON products; Type: COMMENT; Schema: public; Owner: -



-- Name: support_tickets Admin users can view all tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can view all tickets" ON public.support_tickets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: system_health_metrics Admin users can view health metrics; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can view health metrics" ON public.system_health_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: system_maintenance_log Admin users can view maintenance logs; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admin users can view maintenance logs" ON public.system_maintenance_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: quotes Admins can create quotes; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can create quotes" ON public.quotes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: internal_order_status_history Admins can create status history in their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can create status history in their organization" ON public.internal_order_status_history FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.internal_orders io
  WHERE ((io.id = internal_order_status_history.internal_order_id) AND (io.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))))) AND (changed_by = auth.uid())));


-- Name: lab_work_orders Admins can create work orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can create work orders" ON public.lab_work_orders FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: admin_users Admins can delete admin users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete admin users" ON public.admin_users FOR DELETE USING ((( SELECT public.get_admin_role(auth.uid()) AS get_admin_role) = ANY (ARRAY['admin'::text, 'super_admin'::text])));


-- Name: appointments Admins can delete appointments; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete appointments" ON public.appointments FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: contact_lens_encargos Admins can delete contact lens encargos; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete contact lens encargos" ON public.contact_lens_encargos FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


-- Name: contact_lens_inventory Admins can delete contact lens inventory; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete contact lens inventory" ON public.contact_lens_inventory FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


-- Name: customers Admins can delete customers in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete customers in their branches" ON public.customers FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = customers.branch_id)))));


-- Name: lens_families Admins can delete lens families; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete lens families" ON public.lens_families FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: lens_price_matrices Admins can delete lens price matrices; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete lens price matrices" ON public.lens_price_matrices FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: customer_lens_purchases Admins can delete lens purchases; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete lens purchases" ON public.customer_lens_purchases FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: order_items Admins can delete order items; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete order items" ON public.order_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: POLICY "Admins can delete order items" ON order_items; Type: COMMENT; Schema: public; Owner: -



-- Name: order_payments Admins can delete order_payments in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete order_payments in their branches" ON public.order_payments FOR DELETE USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_payments.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));


-- Name: orders Admins can delete orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: POLICY "Admins can delete orders" ON orders; Type: COMMENT; Schema: public; Owner: -



-- Name: product_option_fields Admins can delete product option fields; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete product option fields" ON public.product_option_fields FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: product_option_values Admins can delete product option values; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete product option values" ON public.product_option_values FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: products Admins can delete products in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete products in their branches" ON public.products FOR DELETE USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND ((aba.branch_id = products.branch_id) OR (products.branch_id IS NULL)))))));


-- Name: profiles Admins can delete profiles; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: POLICY "Admins can delete profiles" ON profiles; Type: COMMENT; Schema: public; Owner: -



-- Name: quotes Admins can delete quotes; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete quotes" ON public.quotes FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: support_categories Admins can delete support categories in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete support categories in their branches" ON public.support_categories FOR DELETE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_categories.branch_id)))))));


-- Name: support_tickets Admins can delete support tickets in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete support tickets in their branches" ON public.support_tickets FOR DELETE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_tickets.branch_id)))))));


-- Name: lab_work_orders Admins can delete work orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can delete work orders" ON public.lab_work_orders FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: admin_users Admins can insert admin users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert admin users" ON public.admin_users FOR INSERT WITH CHECK ((( SELECT public.get_admin_role(auth.uid()) AS get_admin_role) = ANY (ARRAY['admin'::text, 'super_admin'::text])));


-- Name: agreement_institutional_invoice_balances Admins can insert agreement institutional invoice balances; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert agreement institutional invoice balances" ON public.agreement_institutional_invoice_balances FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.agreement_institutional_invoices inv
     JOIN public.agreements a ON ((a.id = inv.agreement_id)))
  WHERE ((inv.id = agreement_institutional_invoice_balances.invoice_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));


-- Name: agreement_institutional_invoices Admins can insert agreement institutional invoices; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert agreement institutional invoices" ON public.agreement_institutional_invoices FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_institutional_invoices.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));


-- Name: agreements Admins can insert agreements; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert agreements" ON public.agreements FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])) AND (admin_branch_access.branch_id IS NOT NULL))))))));


-- Name: ai_usage_log Admins can insert ai_usage_log for their org; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert ai_usage_log for their org" ON public.ai_usage_log FOR INSERT WITH CHECK ((((organization_id = public.get_user_organization_id()) AND (public.get_user_organization_id() IS NOT NULL)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true) AND (admin_users.role = ANY (ARRAY['super_admin'::text, 'root'::text, 'dev'::text])))))));


-- Name: appointments Admins can insert appointments; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert appointments" ON public.appointments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: cash_register_closures Admins can insert cash register closures in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert cash register closures in their branches" ON public.cash_register_closures FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = cash_register_closures.branch_id)))) OR (closed_by = auth.uid())));


-- Name: contact_lens_encargos Admins can insert contact lens encargos; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert contact lens encargos" ON public.contact_lens_encargos FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


-- Name: contact_lens_inventory Admins can insert contact lens inventory; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert contact lens inventory" ON public.contact_lens_inventory FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


-- Name: customers Admins can insert customers in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert customers in their branches" ON public.customers FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = customers.branch_id)))));


-- Name: inventory_movements Admins can insert inventory movements; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert inventory movements" ON public.inventory_movements FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: customer_lens_purchases Admins can insert lens purchases; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert lens purchases" ON public.customer_lens_purchases FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: notification_settings Admins can insert notification settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert notification settings" ON public.notification_settings FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))) AND (((organization_id IS NULL) AND (branch_id IS NULL) AND public.is_root_user(auth.uid())) OR ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT gub.branch_id
   FROM public.get_user_branches(auth.uid()) gub(branch_id, branch_name, branch_code, role, is_primary))))))));


-- Name: order_items Admins can insert order items; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert order items" ON public.order_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: POLICY "Admins can insert order items" ON order_items; Type: COMMENT; Schema: public; Owner: -



-- Name: order_payments Admins can insert order_payments in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert order_payments in their branches" ON public.order_payments FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_payments.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));


-- Name: POLICY "Admins can insert order_payments in their branches" ON order_payments; Type: COMMENT; Schema: public; Owner: -



-- Name: orders Admins can insert orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert orders" ON public.orders FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: POLICY "Admins can insert orders" ON orders; Type: COMMENT; Schema: public; Owner: -



-- Name: orders Admins can insert orders in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert orders in their branches" ON public.orders FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = orders.branch_id)))))));


-- Name: pos_sale_idempotency Admins can insert pos_sale_idempotency in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert pos_sale_idempotency in their branches" ON public.pos_sale_idempotency FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = pos_sale_idempotency.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));


-- Name: POLICY "Admins can insert pos_sale_idempotency in their branches" ON pos_sale_idempotency; Type: COMMENT; Schema: public; Owner: -



-- Name: pos_sessions Admins can insert pos_sessions in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert pos_sessions in their branches" ON public.pos_sessions FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = pos_sessions.branch_id))))) OR (cashier_id = auth.uid())));


-- Name: product_option_fields Admins can insert product option fields; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert product option fields" ON public.product_option_fields FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: product_option_values Admins can insert product option values; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert product option values" ON public.product_option_values FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: products Admins can insert products in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert products in their branches" ON public.products FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = products.branch_id))))));


-- Name: profiles Admins can insert profiles; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: POLICY "Admins can insert profiles" ON profiles; Type: COMMENT; Schema: public; Owner: -



-- Name: agreement_purchase_orders Admins can insert purchase orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert purchase orders" ON public.agreement_purchase_orders FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_purchase_orders.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));


-- Name: support_categories Admins can insert support categories in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert support categories in their branches" ON public.support_categories FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_categories.branch_id)))))));


-- Name: support_tickets Admins can insert support tickets in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can insert support tickets in their branches" ON public.support_tickets FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_tickets.branch_id)))))));


-- Name: pos_sessions Admins can manage POS sessions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage POS sessions" ON public.pos_sessions USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: pos_transactions Admins can manage POS transactions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage POS transactions" ON public.pos_transactions USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: contact_lens_families Admins can manage contact lens families for their org; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage contact lens families for their org" ON public.contact_lens_families USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true) AND ((admin_users.role = 'super_admin'::text) OR (admin_users.organization_id = ( SELECT admin_users_1.organization_id
           FROM public.admin_users admin_users_1
          WHERE ((admin_users_1.id = auth.uid()) AND (admin_users_1.is_active = true))
         LIMIT 1)))))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true) AND ((admin_users.role = 'super_admin'::text) OR (admin_users.organization_id = ( SELECT admin_users_1.organization_id
           FROM public.admin_users admin_users_1
          WHERE ((admin_users_1.id = auth.uid()) AND (admin_users_1.is_active = true))
         LIMIT 1)))))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: contact_lens_price_matrices Admins can manage contact lens price matrices for their org; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage contact lens price matrices for their org" ON public.contact_lens_price_matrices USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true) AND ((admin_users.role = 'super_admin'::text) OR (admin_users.organization_id = ( SELECT admin_users_1.organization_id
           FROM public.admin_users admin_users_1
          WHERE ((admin_users_1.id = auth.uid()) AND (admin_users_1.is_active = true))
         LIMIT 1)))))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true) AND ((admin_users.role = 'super_admin'::text) OR (admin_users.organization_id = ( SELECT admin_users_1.organization_id
           FROM public.admin_users admin_users_1
          WHERE ((admin_users_1.id = auth.uid()) AND (admin_users_1.is_active = true))
         LIMIT 1)))))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: credit_note_movements Admins can manage credit_note_movements; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage credit_note_movements" ON public.credit_note_movements USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: credit_notes Admins can manage credit_notes; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage credit_notes" ON public.credit_notes USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: drivers Admins can manage drivers in their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage drivers in their organization" ON public.drivers USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))) WITH CHECK ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: ai_insights Admins can manage insights for their org; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage insights for their org" ON public.ai_insights USING (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))))) WITH CHECK (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))));


-- Name: payment_installments Admins can manage installments; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage installments" ON public.payment_installments USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: internal_order_items Admins can manage internal order items in their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage internal order items in their organization" ON public.internal_order_items USING ((EXISTS ( SELECT 1
   FROM public.internal_orders io
  WHERE ((io.id = internal_order_items.internal_order_id) AND (io.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.internal_orders io
  WHERE ((io.id = internal_order_items.internal_order_id) AND (io.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))))));


-- Name: internal_orders Admins can manage internal orders in their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage internal orders in their organization" ON public.internal_orders USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))) WITH CHECK ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: lens_price_matrices Admins can manage lens price matrices; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage lens price matrices" ON public.lens_price_matrices USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: pos_settings Admins can manage pos settings in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage pos settings in their branches" ON public.pos_settings USING ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = pos_settings.branch_id)))));


-- Name: pos_settings Admins can manage pos_settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage pos_settings" ON public.pos_settings USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: quote_settings Admins can manage quote settings in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage quote settings in their branches" ON public.quote_settings USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL)));


-- Name: quote_settings Admins can manage quote_settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage quote_settings" ON public.quote_settings USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: schedule_settings Admins can manage schedule settings in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage schedule settings in their branches" ON public.schedule_settings USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL)));


-- Name: schedule_settings Admins can manage schedule_settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage schedule_settings" ON public.schedule_settings USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: product_branch_stock Admins can manage stock in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage stock in their branches" ON public.product_branch_stock USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])))))));


-- Name: contact_lens_families Admins can manage their organization's contact lens families; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage their organization's contact lens families" ON public.contact_lens_families USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: contact_lens_price_matrices Admins can manage their organization's contact lens price matri; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage their organization's contact lens price matri" ON public.contact_lens_price_matrices USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: lens_families Admins can manage their organization's lens families; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage their organization's lens families" ON public.lens_families USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: lens_price_matrices Admins can manage their organization's lens price matrices; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage their organization's lens price matrices" ON public.lens_price_matrices USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: treatments Admins can manage treatments; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage treatments" ON public.treatments USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))));


-- Name: vehicles Admins can manage vehicles in their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage vehicles in their organization" ON public.vehicles USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))) WITH CHECK ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: lab_work_orders Admins can manage work orders in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can manage work orders in their branches" ON public.lab_work_orders USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL)));


-- Name: ai_usage_log Admins can read their org ai_usage_log; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can read their org ai_usage_log" ON public.ai_usage_log FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true) AND (admin_users.role = ANY (ARRAY['super_admin'::text, 'root'::text, 'dev'::text])))))));


-- Name: admin_users Admins can update admin users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update admin users" ON public.admin_users FOR UPDATE USING ((( SELECT public.get_admin_role(auth.uid()) AS get_admin_role) = ANY (ARRAY['admin'::text, 'super_admin'::text]))) WITH CHECK ((( SELECT public.get_admin_role(auth.uid()) AS get_admin_role) = ANY (ARRAY['admin'::text, 'super_admin'::text])));


-- Name: agreements Admins can update agreements; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update agreements" ON public.agreements FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])) AND (admin_branch_access.branch_id IS NOT NULL))))))));


-- Name: orders Admins can update all orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: POLICY "Admins can update all orders" ON orders; Type: COMMENT; Schema: public; Owner: -



-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: POLICY "Admins can update all profiles" ON profiles; Type: COMMENT; Schema: public; Owner: -



-- Name: appointments Admins can update appointments; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update appointments" ON public.appointments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: cash_register_closures Admins can update cash register closures in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update cash register closures in their branches" ON public.cash_register_closures FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = cash_register_closures.branch_id)))) OR ((closed_by = auth.uid()) AND (status = 'draft'::text))));


-- Name: contact_lens_encargos Admins can update contact lens encargos; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update contact lens encargos" ON public.contact_lens_encargos FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


-- Name: contact_lens_inventory Admins can update contact lens inventory; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update contact lens inventory" ON public.contact_lens_inventory FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


-- Name: customers Admins can update customers in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update customers in their branches" ON public.customers FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = customers.branch_id)))));


-- Name: agreement_institutional_balances Admins can update institutional balances; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update institutional balances" ON public.agreement_institutional_balances FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_institutional_balances.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));


-- Name: customer_lens_purchases Admins can update lens purchases; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update lens purchases" ON public.customer_lens_purchases FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: notification_settings Admins can update notification settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update notification settings" ON public.notification_settings FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))) AND (((organization_id IS NULL) AND (branch_id IS NULL) AND public.is_root_user(auth.uid())) OR ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT gub.branch_id
   FROM public.get_user_branches(auth.uid()) gub(branch_id, branch_name, branch_code, role, is_primary))))))));


-- Name: order_payments Admins can update order_payments in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update order_payments in their branches" ON public.order_payments FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_payments.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));


-- Name: orders Admins can update orders in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update orders in their branches" ON public.orders FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = orders.branch_id)))))));


-- Name: pos_sessions Admins can update pos_sessions in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update pos_sessions in their branches" ON public.pos_sessions FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = pos_sessions.branch_id))))) OR (cashier_id = auth.uid())));


-- Name: product_option_fields Admins can update product option fields; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update product option fields" ON public.product_option_fields FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: product_option_values Admins can update product option values; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update product option values" ON public.product_option_values FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: products Admins can update products in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update products in their branches" ON public.products FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND ((aba.branch_id = products.branch_id) OR (products.branch_id IS NULL)))))));


-- Name: agreement_purchase_orders Admins can update purchase orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update purchase orders" ON public.agreement_purchase_orders FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_purchase_orders.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));


-- Name: quotes Admins can update quotes; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update quotes" ON public.quotes FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: support_categories Admins can update support categories in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update support categories in their branches" ON public.support_categories FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_categories.branch_id)))))));


-- Name: support_tickets Admins can update support tickets in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update support tickets in their branches" ON public.support_tickets FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_tickets.branch_id)))))));


-- Name: lab_work_orders Admins can update work orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can update work orders" ON public.lab_work_orders FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: agreement_customers Admins can view agreement customers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view agreement customers" ON public.agreement_customers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_customers.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));


-- Name: agreement_institutional_invoice_balances Admins can view agreement institutional invoice balances; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view agreement institutional invoice balances" ON public.agreement_institutional_invoice_balances FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.agreement_institutional_invoices inv
     JOIN public.agreements a ON ((a.id = inv.agreement_id)))
  WHERE ((inv.id = agreement_institutional_invoice_balances.invoice_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));


-- Name: agreement_institutional_invoices Admins can view agreement institutional invoices; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view agreement institutional invoices" ON public.agreement_institutional_invoices FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_institutional_invoices.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));


-- Name: agreements Admins can view agreements in their org; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view agreements in their org" ON public.agreements FOR SELECT USING ((public.is_super_admin(auth.uid()) OR ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL))))))));


-- Name: admin_users Admins can view all admin users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view all admin users" ON public.admin_users FOR SELECT USING ((( SELECT public.get_admin_role(auth.uid()) AS get_admin_role) = ANY (ARRAY['admin'::text, 'super_admin'::text])));


-- Name: POLICY "Admins can view all admin users" ON admin_users; Type: COMMENT; Schema: public; Owner: -



-- Name: customer_lens_purchases Admins can view all lens purchases; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view all lens purchases" ON public.customer_lens_purchases FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));


-- Name: order_items Admins can view all order items; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: POLICY "Admins can view all order items" ON order_items; Type: COMMENT; Schema: public; Owner: -



-- Name: product_option_fields Admins can view all product option fields; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view all product option fields" ON public.product_option_fields FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: product_option_values Admins can view all product option values; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view all product option values" ON public.product_option_values FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: POLICY "Admins can view all profiles" ON profiles; Type: COMMENT; Schema: public; Owner: -



-- Name: cash_register_closures Admins can view cash register closures in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view cash register closures in their branches" ON public.cash_register_closures FOR SELECT USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = cash_register_closures.branch_id))))));


-- Name: drivers Admins can view drivers in their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view drivers in their organization" ON public.drivers FOR SELECT USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: agreement_institutional_balances Admins can view institutional balances; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view institutional balances" ON public.agreement_institutional_balances FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_institutional_balances.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));


-- Name: internal_order_items Admins can view internal order items in their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view internal order items in their organization" ON public.internal_order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.internal_orders io
  WHERE ((io.id = internal_order_items.internal_order_id) AND (io.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))))));


-- Name: internal_orders Admins can view internal orders in their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view internal orders in their organization" ON public.internal_orders FOR SELECT USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: inventory_movements Admins can view inventory movements; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view inventory movements" ON public.inventory_movements FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: notification_settings Admins can view notification settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view notification settings" ON public.notification_settings FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))) AND (((organization_id IS NULL) AND (branch_id IS NULL)) OR (organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)))));


-- Name: order_payments Admins can view order_payments in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view order_payments in their branches" ON public.order_payments FOR SELECT USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_payments.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));


-- Name: POLICY "Admins can view order_payments in their branches" ON order_payments; Type: COMMENT; Schema: public; Owner: -



-- Name: admin_branch_access Admins can view own branch access; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view own branch access" ON public.admin_branch_access FOR SELECT USING (((admin_user_id = auth.uid()) OR public.is_super_admin(auth.uid())));


-- Name: pos_settings Admins can view pos settings in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view pos settings in their branches" ON public.pos_settings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = pos_settings.branch_id)))));


-- Name: pos_sale_idempotency Admins can view pos_sale_idempotency in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view pos_sale_idempotency in their branches" ON public.pos_sale_idempotency FOR SELECT USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = pos_sale_idempotency.order_id) AND ((o.branch_id IS NULL) OR (EXISTS ( SELECT 1
           FROM public.admin_branch_access aba
          WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = o.branch_id))))))))));


-- Name: POLICY "Admins can view pos_sale_idempotency in their branches" ON pos_sale_idempotency; Type: COMMENT; Schema: public; Owner: -



-- Name: pos_sessions Admins can view pos_sessions in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view pos_sessions in their branches" ON public.pos_sessions FOR SELECT USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = pos_sessions.branch_id))))) OR (cashier_id = auth.uid())));


-- Name: agreement_purchase_orders Admins can view purchase orders via agreement; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view purchase orders via agreement" ON public.agreement_purchase_orders FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_purchase_orders.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));


-- Name: lab_work_order_status_history Admins can view status history; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view status history" ON public.lab_work_order_status_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: internal_order_status_history Admins can view status history in their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view status history in their organization" ON public.internal_order_status_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.internal_orders io
  WHERE ((io.id = internal_order_status_history.internal_order_id) AND (io.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))))));


-- Name: product_branch_stock Admins can view stock in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view stock in their branches" ON public.product_branch_stock FOR SELECT USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid())))));


-- Name: support_categories Admins can view support categories in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view support categories in their branches" ON public.support_categories FOR SELECT USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_categories.branch_id)))))));


-- Name: support_tickets Admins can view support tickets in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view support tickets in their branches" ON public.support_tickets FOR SELECT USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_tickets.branch_id)))))));


-- Name: vehicles Admins can view vehicles in their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view vehicles in their organization" ON public.vehicles FOR SELECT USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: lab_work_orders Admins can view work orders in their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Admins can view work orders in their branches" ON public.lab_work_orders FOR SELECT USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid()))) OR (branch_id IS NULL)));


-- Name: POLICY "Admins can view work orders in their branches" ON lab_work_orders; Type: COMMENT; Schema: public; Owner: -



-- Name: cart_items Anonymous users can manage session cart; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Anonymous users can manage session cart" ON public.cart_items USING (((auth.uid() IS NULL) AND (session_id IS NOT NULL)));


-- Name: products Anyone can view active products; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING ((status = 'active'::text));


-- Name: products Authenticated users can update own products; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Authenticated users can update own products" ON public.products FOR UPDATE USING (((NOT public.is_admin(auth.uid())) AND (auth.role() = 'authenticated'::text))) WITH CHECK (((NOT public.is_admin(auth.uid())) AND (auth.role() = 'authenticated'::text)));


-- Name: products Authenticated users can view active products; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Authenticated users can view active products" ON public.products FOR SELECT USING (((NOT public.is_admin(auth.uid())) AND ((status = 'active'::text) OR (status IS NULL))));


-- Name: POLICY "Authenticated users can view active products" ON products; Type: COMMENT; Schema: public; Owner: -



-- Name: subscription_tiers Authenticated users can view subscription tiers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Authenticated users can view subscription tiers" ON public.subscription_tiers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: support_messages Customers can create messages in own tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Customers can create messages in own tickets" ON public.support_messages FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.support_tickets st
  WHERE ((st.id = support_messages.ticket_id) AND (st.customer_id = auth.uid())))) AND (sender_id = auth.uid()) AND (NOT is_internal)));


-- Name: support_tickets Customers can create tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Customers can create tickets" ON public.support_tickets FOR INSERT WITH CHECK ((customer_id = auth.uid()));


-- Name: support_messages Customers can view messages in own tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Customers can view messages in own tickets" ON public.support_messages FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.support_tickets st
  WHERE ((st.id = support_messages.ticket_id) AND (st.customer_id = auth.uid())))) AND (NOT is_internal)));


-- Name: support_tickets Customers can view own tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Customers can view own tickets" ON public.support_tickets FOR SELECT USING ((customer_id = auth.uid()));


-- Name: payment_gateways_config Elevated roles can manage payment_gateways_config; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Elevated roles can manage payment_gateways_config" ON public.payment_gateways_config USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['super_admin'::text, 'root'::text, 'dev'::text])) AND (admin_users.is_active = true)))));


-- Name: whatsapp_phone_numbers Org admins can delete own whatsapp numbers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Org admins can delete own whatsapp numbers" ON public.whatsapp_phone_numbers FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.organization_id = whatsapp_phone_numbers.organization_id) AND (admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: whatsapp_phone_numbers Org admins can insert own whatsapp numbers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Org admins can insert own whatsapp numbers" ON public.whatsapp_phone_numbers FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.organization_id = whatsapp_phone_numbers.organization_id) AND (admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: whatsapp_phone_numbers Org admins can update own whatsapp numbers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Org admins can update own whatsapp numbers" ON public.whatsapp_phone_numbers FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.organization_id = whatsapp_phone_numbers.organization_id) AND (admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: customer_satisfaction_surveys Org admins can view customer_satisfaction_surveys; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Org admins can view customer_satisfaction_surveys" ON public.customer_satisfaction_surveys FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.organization_id = customer_satisfaction_surveys.organization_id) AND (au.is_active = true)))));


-- Name: whatsapp_phone_numbers Org admins can view own whatsapp numbers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Org admins can view own whatsapp numbers" ON public.whatsapp_phone_numbers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.organization_id = whatsapp_phone_numbers.organization_id) AND (admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


-- Name: survey_invitations Org admins can view survey_invitations; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Org admins can view survey_invitations" ON public.survey_invitations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.organization_id = survey_invitations.organization_id) AND (au.is_active = true)))));


-- Name: telemetry_aggregates Organization admins can manage telemetry aggregates; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Organization admins can manage telemetry aggregates" ON public.telemetry_aggregates USING ((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))));


-- Name: telemetry_config Organization admins can manage telemetry config; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Organization admins can manage telemetry config" ON public.telemetry_config USING ((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))));


-- Name: telemetry_events Organization admins can manage telemetry events; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Organization admins can manage telemetry events" ON public.telemetry_events USING ((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))));


-- Name: branches Organization admins can manage their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Organization admins can manage their branches" ON public.branches USING ((organization_id = public.get_user_organization_id())) WITH CHECK ((organization_id = public.get_user_organization_id()));


-- Name: saas_support_messages Organizations can create messages in own tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Organizations can create messages in own tickets" ON public.saas_support_messages FOR INSERT WITH CHECK (((ticket_id IN ( SELECT saas_support_tickets.id
   FROM public.saas_support_tickets
  WHERE (saas_support_tickets.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid())
         LIMIT 1)))) AND (is_from_customer = true)));


-- Name: saas_support_tickets Organizations can create tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Organizations can create tickets" ON public.saas_support_tickets FOR INSERT WITH CHECK (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) OR (organization_id IS NULL)));


-- Name: system_email_templates Organizations can manage their templates; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Organizations can manage their templates" ON public.system_email_templates TO authenticated USING (((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.organization_id IS NOT NULL)))) OR public.is_super_admin(auth.uid())));


-- Name: saas_support_tickets Organizations can update own tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Organizations can update own tickets" ON public.saas_support_tickets FOR UPDATE USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1))) WITH CHECK ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)));


-- Name: saas_support_messages Organizations can view own ticket messages; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Organizations can view own ticket messages" ON public.saas_support_messages FOR SELECT USING (((ticket_id IN ( SELECT saas_support_tickets.id
   FROM public.saas_support_tickets
  WHERE (saas_support_tickets.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid())
         LIMIT 1)))) AND (is_internal = false)));


-- Name: saas_support_tickets Organizations can view own tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Organizations can view own tickets" ON public.saas_support_tickets FOR SELECT USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)));


-- Name: system_email_templates Organizations can view their templates and defaults; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Organizations can view their templates and defaults" ON public.system_email_templates FOR SELECT TO authenticated USING ((((category = 'organization'::text) AND (organization_id IS NULL)) OR (organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.organization_id IS NOT NULL)))) OR ((category = 'saas'::text) AND public.is_super_admin(auth.uid()))));


-- Name: subscription_tiers Public can view subscription tiers for landing; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Public can view subscription tiers for landing" ON public.subscription_tiers FOR SELECT USING (true);


-- Name: payment_gateways_config Public read payment_gateways_config; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Public read payment_gateways_config" ON public.payment_gateways_config FOR SELECT USING (true);


-- Name: email_send_events Root and dev can read email_send_events; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root and dev can read email_send_events" ON public.email_send_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));


-- Name: admin_users Root users can manage all admin users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can manage all admin users" ON public.admin_users USING (public.is_root_user(auth.uid())) WITH CHECK (public.is_root_user(auth.uid()));


-- Name: saas_support_messages Root users can manage all messages; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can manage all messages" ON public.saas_support_messages USING (public.is_root_user(auth.uid())) WITH CHECK (public.is_root_user(auth.uid()));


-- Name: organizations Root users can manage all organizations; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can manage all organizations" ON public.organizations USING (public.is_root_user(auth.uid())) WITH CHECK (public.is_root_user(auth.uid()));


-- Name: saas_support_tickets Root users can manage all tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can manage all tickets" ON public.saas_support_tickets USING (public.is_root_user(auth.uid())) WITH CHECK (public.is_root_user(auth.uid()));


-- Name: saas_support_templates Root users can manage templates; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can manage templates" ON public.saas_support_templates USING (public.is_root_user(auth.uid())) WITH CHECK (public.is_root_user(auth.uid()));


-- Name: admin_notifications Root users can view SaaS notifications; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can view SaaS notifications" ON public.admin_notifications FOR SELECT USING ((public.is_root_user(auth.uid()) AND ((target_admin_role = 'root'::text) OR (target_admin_id = auth.uid())) AND (organization_id IS NULL)));


-- Name: admin_users Root users can view all admin users; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can view all admin users" ON public.admin_users FOR SELECT USING (public.is_root_user(auth.uid()));


-- Name: POLICY "Root users can view all admin users" ON admin_users; Type: COMMENT; Schema: public; Owner: -



-- Name: saas_support_messages Root users can view all messages; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can view all messages" ON public.saas_support_messages FOR SELECT USING (public.is_root_user(auth.uid()));


-- Name: organizations Root users can view all organizations; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can view all organizations" ON public.organizations FOR SELECT USING ((public.is_root_user(auth.uid()) OR (id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))));


-- Name: saas_support_tickets Root users can view all tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can view all tickets" ON public.saas_support_tickets FOR SELECT USING (public.is_root_user(auth.uid()));


-- Name: saas_support_templates Root users can view templates; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can view templates" ON public.saas_support_templates FOR SELECT USING (public.is_root_user(auth.uid()));


-- Name: tier_change_audit Root users can view tier change audit; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Root users can view tier change audit" ON public.tier_change_audit FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])) AND (admin_users.is_active = true)))));


-- Name: agreement_institutional_balances Service role and admins can insert institutional balances; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Service role and admins can insert institutional balances" ON public.agreement_institutional_balances FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agreements a
  WHERE ((a.id = agreement_institutional_balances.agreement_id) AND (public.is_super_admin(auth.uid()) OR ((a.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid()))) AND ((a.branch_id IS NULL) OR (a.branch_id IN ( SELECT admin_branch_access.branch_id
           FROM public.admin_branch_access
          WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.branch_id IS NOT NULL)))))))))));


-- Name: admin_activity_log Service role can manage activity logs; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Service role can manage activity logs" ON public.admin_activity_log USING ((auth.role() = 'service_role'::text));


-- Name: customer_satisfaction_surveys Service role can manage customer_satisfaction_surveys; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Service role can manage customer_satisfaction_surveys" ON public.customer_satisfaction_surveys TO service_role USING (true) WITH CHECK (true);


-- Name: email_send_events Service role can manage email_send_events; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Service role can manage email_send_events" ON public.email_send_events TO service_role USING (true) WITH CHECK (true);


-- Name: embeddings Service role can manage embeddings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Service role can manage embeddings" ON public.embeddings USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


-- Name: memory_facts Service role can manage memory facts; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Service role can manage memory facts" ON public.memory_facts USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


-- Name: survey_invitations Service role can manage survey_invitations; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Service role can manage survey_invitations" ON public.survey_invitations TO service_role USING (true) WITH CHECK (true);


-- Name: saas_backups Service role full access saas_backups; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Service role full access saas_backups" ON public.saas_backups USING ((auth.role() = 'service_role'::text));


-- Name: agreements Super admin can delete agreements; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admin can delete agreements" ON public.agreements FOR DELETE USING (public.is_super_admin(auth.uid()));


-- Name: system_config Super admin can manage sensitive config; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admin can manage sensitive config" ON public.system_config USING (((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = 'super_admin'::text) AND (au.is_active = true)))) OR (NOT is_sensitive)));


-- Name: customers Super admins can delete customers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can delete customers" ON public.customers FOR DELETE USING (public.is_super_admin(auth.uid()));


-- Name: customers Super admins can insert customers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can insert customers" ON public.customers FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));


-- Name: branches Super admins can manage all branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can manage all branches" ON public.branches USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));


-- Name: pos_settings Super admins can manage all pos settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can manage all pos settings" ON public.pos_settings USING (public.is_super_admin(auth.uid()));


-- Name: whatsapp_phone_numbers Super admins can manage all whatsapp numbers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can manage all whatsapp numbers" ON public.whatsapp_phone_numbers USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));


-- Name: admin_branch_access Super admins can manage branch access; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can manage branch access" ON public.admin_branch_access USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


-- Name: organization_settings Super admins can manage organization settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can manage organization settings" ON public.organization_settings USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: organizations Super admins can manage organizations; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can manage organizations" ON public.organizations USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));


-- Name: subscription_tiers Super admins can manage subscription tiers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can manage subscription tiers" ON public.subscription_tiers USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));


-- Name: subscriptions Super admins can manage subscriptions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can manage subscriptions" ON public.subscriptions USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));


-- Name: customers Super admins can update customers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can update customers" ON public.customers FOR UPDATE USING (public.is_super_admin(auth.uid()));


-- Name: customers Super admins can view all customers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can view all customers" ON public.customers FOR SELECT USING (public.is_super_admin(auth.uid()));


-- Name: pos_settings Super admins can view all pos settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can view all pos settings" ON public.pos_settings FOR SELECT USING (public.is_super_admin(auth.uid()));


-- Name: webhook_events Super admins can view webhook events; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Super admins can view webhook events" ON public.webhook_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))));


-- Name: treatments Treatments visible to org admins; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Treatments visible to org admins" ON public.treatments FOR SELECT USING (((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) OR (organization_id = '00000000-0000-0000-0000-000000000001'::uuid)));


-- Name: contact_lens_encargos Users can create encargos in their branch; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can create encargos in their branch" ON public.contact_lens_encargos FOR INSERT WITH CHECK (((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid())))));


-- Name: chat_messages Users can create messages in own sessions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can create messages in own sessions" ON public.chat_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));


-- Name: optical_internal_support_messages Users can create messages in their organization tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can create messages in their organization tickets" ON public.optical_internal_support_messages FOR INSERT WITH CHECK ((ticket_id IN ( SELECT optical_internal_support_tickets.id
   FROM public.optical_internal_support_tickets
  WHERE (optical_internal_support_tickets.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid())
         LIMIT 1)))));


-- Name: chat_sessions Users can create own chat sessions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can create own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


-- Name: organizations Users can create their own organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can create their own organization" ON public.organizations FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (owner_id = auth.uid()) AND (NOT (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.organization_id IS NOT NULL)))))));


-- Name: POLICY "Users can create their own organization" ON organizations; Type: COMMENT; Schema: public; Owner: -



-- Name: optical_internal_support_tickets Users can create tickets for their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can create tickets for their organization" ON public.optical_internal_support_tickets FOR INSERT WITH CHECK (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT get_user_branches.branch_id
   FROM public.get_user_branches(auth.uid()) get_user_branches(branch_id, branch_name, branch_code, role, is_primary))))));


-- Name: contact_lens_encargos Users can delete encargos in their branch; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can delete encargos in their branch" ON public.contact_lens_encargos FOR DELETE USING (((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid())))));


-- Name: chat_sessions Users can delete own chat sessions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions FOR DELETE USING ((auth.uid() = user_id));


-- Name: orders Users can insert own orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = user_id));


-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


-- Name: user_tour_progress Users can insert their own tour progress; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can insert their own tour progress" ON public.user_tour_progress FOR INSERT WITH CHECK ((auth.uid() = user_id));


-- Name: telemetry_events Users can insert their telemetry events; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can insert their telemetry events" ON public.telemetry_events FOR INSERT WITH CHECK (((auth.uid() = user_id) OR (organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid())))));


-- Name: operativo_mobile_stock Users can manage operativo mobile stock via field operation; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage operativo mobile stock via field operation" ON public.operativo_mobile_stock USING ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_mobile_stock.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_mobile_stock.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id()))))));


-- Name: operativo_sync_queue Users can manage operativo sync queue via field operation; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage operativo sync queue via field operation" ON public.operativo_sync_queue USING ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_sync_queue.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_sync_queue.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id()))))));


-- Name: cart_items Users can manage own cart; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage own cart" ON public.cart_items USING ((auth.uid() = user_id));


-- Name: memory_facts Users can manage own memory facts; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage own memory facts" ON public.memory_facts USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


-- Name: appointments Users can manage their organization appointments; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage their organization appointments" ON public.appointments USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: customers Users can manage their organization customers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage their organization customers" ON public.customers USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: field_operations Users can manage their organization field operations; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage their organization field operations" ON public.field_operations USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id())));


-- Name: lab_work_orders Users can manage their organization lab work orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage their organization lab work orders" ON public.lab_work_orders USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: orders Users can manage their organization orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage their organization orders" ON public.orders USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: payments Users can manage their organization payments; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage their organization payments" ON public.payments USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id())));


-- Name: prescriptions Users can manage their organization prescriptions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage their organization prescriptions" ON public.prescriptions USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: products Users can manage their organization products; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage their organization products" ON public.products USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: quotes Users can manage their organization quotes; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can manage their organization quotes" ON public.quotes USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: telemetry_aggregates Users can read organization telemetry aggregates; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can read organization telemetry aggregates" ON public.telemetry_aggregates FOR SELECT USING ((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))));


-- Name: telemetry_config Users can read organization telemetry config; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can read organization telemetry config" ON public.telemetry_config FOR SELECT USING ((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))));


-- Name: telemetry_events Users can read organization telemetry events; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can read organization telemetry events" ON public.telemetry_events FOR SELECT USING (((organization_id IN ( SELECT organizations.id
   FROM public.organizations
  WHERE (organizations.owner_id = auth.uid()))) OR (user_id = auth.uid())));


-- Name: contact_lens_encargos Users can update encargos in their branch; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update encargos in their branch" ON public.contact_lens_encargos FOR UPDATE USING (((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid())))));


-- Name: chat_sessions Users can update own chat sessions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


-- Name: admin_notifications Users can update their notifications; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update their notifications" ON public.admin_notifications FOR UPDATE USING (((public.is_root_user(auth.uid()) AND ((target_admin_role = 'root'::text) OR (target_admin_id = auth.uid()))) OR ((NOT public.is_root_user(auth.uid())) AND ((target_admin_id = auth.uid()) OR ((target_admin_id IS NULL) AND (organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)))))));


-- Name: optical_internal_support_messages Users can update their organization ticket messages; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update their organization ticket messages" ON public.optical_internal_support_messages FOR UPDATE USING ((ticket_id IN ( SELECT optical_internal_support_tickets.id
   FROM public.optical_internal_support_tickets
  WHERE (optical_internal_support_tickets.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid())
         LIMIT 1)))));


-- Name: optical_internal_support_tickets Users can update their organization tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update their organization tickets" ON public.optical_internal_support_tickets FOR UPDATE USING (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) AND (public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (branch_id IN ( SELECT get_user_branches.branch_id
   FROM public.get_user_branches(auth.uid()) get_user_branches(branch_id, branch_name, branch_code, role, is_primary)))))));


-- Name: user_tour_progress Users can update their own tour progress; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can update their own tour progress" ON public.user_tour_progress FOR UPDATE USING ((auth.uid() = user_id));


-- Name: categories Users can view active categories; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view active categories" ON public.categories FOR SELECT USING (((NOT public.is_admin(auth.uid())) AND (is_active = true)));


-- Name: product_variants Users can view active product variants; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view active product variants" ON public.product_variants FOR SELECT USING (((NOT public.is_admin(auth.uid())) AND (EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_variants.product_id) AND (products.status = 'active'::text))))));


-- Name: admin_activity_log Users can view admin activity logs; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view admin activity logs" ON public.admin_activity_log FOR SELECT USING ((admin_user_id = auth.uid()));


-- Name: contact_lens_encargos Users can view contact lens encargos for their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view contact lens encargos for their branches" ON public.contact_lens_encargos FOR SELECT USING ((organization_id IN ( SELECT au.organization_id
   FROM public.admin_users au
  WHERE (au.id = auth.uid()))));


-- Name: contact_lens_inventory Users can view contact lens inventory for their branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view contact lens inventory for their branches" ON public.contact_lens_inventory FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = contact_lens_inventory.branch_id)))));


-- Name: contact_lens_encargos Users can view encargos in their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view encargos in their organization" ON public.contact_lens_encargos FOR SELECT USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))));


-- Name: ai_insights Users can view insights for their org; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view insights for their org" ON public.ai_insights FOR SELECT USING (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))));


-- Name: chat_messages Users can view messages from own sessions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view messages from own sessions" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));


-- Name: operativo_mobile_stock Users can view operativo mobile stock via field operation; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view operativo mobile stock via field operation" ON public.operativo_mobile_stock FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_mobile_stock.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id()))))));


-- Name: operativo_sync_queue Users can view operativo sync queue via field operation; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view operativo sync queue via field operation" ON public.operativo_sync_queue FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.field_operations fo
  WHERE ((fo.id = operativo_sync_queue.field_operation_id) AND ((EXISTS ( SELECT 1
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (fo.organization_id = public.get_user_organization_id()))))));


-- Name: admin_users Users can view own admin record; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view own admin record" ON public.admin_users FOR SELECT USING ((id = auth.uid()));


-- Name: POLICY "Users can view own admin record" ON admin_users; Type: COMMENT; Schema: public; Owner: -



-- Name: chat_sessions Users can view own chat sessions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions FOR SELECT USING ((auth.uid() = user_id));


-- Name: embeddings Users can view own embeddings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view own embeddings" ON public.embeddings FOR SELECT USING (((user_id = auth.uid()) OR (user_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))));


-- Name: memory_facts Users can view own memory facts; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view own memory facts" ON public.memory_facts FOR SELECT USING ((user_id = auth.uid()));


-- Name: order_items Users can view own order items; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));


-- Name: orders Users can view own orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING ((auth.uid() = user_id));


-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


-- Name: pos_settings Users can view pos_settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view pos_settings" ON public.pos_settings FOR SELECT USING (((branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid()))) OR (organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: quote_settings Users can view quote_settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view quote_settings" ON public.quote_settings FOR SELECT USING (((branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid()))) OR (organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: schedule_settings Users can view schedule_settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view schedule_settings" ON public.schedule_settings FOR SELECT USING (((branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid()))) OR (organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: organizations Users can view their organization; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization" ON public.organizations FOR SELECT USING (((id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))));


-- Name: appointments Users can view their organization appointments; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization appointments" ON public.appointments FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: branches Users can view their organization branches; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization branches" ON public.branches FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true) AND (admin_users.organization_id IS NULL)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: customers Users can view their organization customers; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization customers" ON public.customers FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: field_operations Users can view their organization field operations; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization field operations" ON public.field_operations FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id())));


-- Name: lab_work_orders Users can view their organization lab work orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization lab work orders" ON public.lab_work_orders FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: admin_notifications Users can view their organization notifications; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization notifications" ON public.admin_notifications FOR SELECT USING (((NOT public.is_root_user(auth.uid())) AND ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) OR (target_admin_id = auth.uid()) OR ((target_admin_id IS NULL) AND (target_admin_role IS NULL) AND (organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)))) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT get_user_branches.branch_id
   FROM public.get_user_branches(auth.uid()) get_user_branches(branch_id, branch_name, branch_code, role, is_primary))))));


-- Name: orders Users can view their organization orders; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization orders" ON public.orders FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: payments Users can view their organization payments; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization payments" ON public.payments FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id())));


-- Name: prescriptions Users can view their organization prescriptions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization prescriptions" ON public.prescriptions FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: products Users can view their organization products; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization products" ON public.products FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: quotes Users can view their organization quotes; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization quotes" ON public.quotes FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));


-- Name: organization_settings Users can view their organization settings; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization settings" ON public.organization_settings FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: subscriptions Users can view their organization subscriptions; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization subscriptions" ON public.subscriptions FOR SELECT USING (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true))))));


-- Name: optical_internal_support_messages Users can view their organization ticket messages; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization ticket messages" ON public.optical_internal_support_messages FOR SELECT USING ((ticket_id IN ( SELECT optical_internal_support_tickets.id
   FROM public.optical_internal_support_tickets
  WHERE (optical_internal_support_tickets.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid())
         LIMIT 1)))));


-- Name: optical_internal_support_tickets Users can view their organization tickets; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization tickets" ON public.optical_internal_support_tickets FOR SELECT USING (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) AND (public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (branch_id IN ( SELECT get_user_branches.branch_id
   FROM public.get_user_branches(auth.uid()) get_user_branches(branch_id, branch_name, branch_code, role, is_primary)))))));


-- Name: contact_lens_families Users can view their organization's contact lens families; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization's contact lens families" ON public.contact_lens_families FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: contact_lens_price_matrices Users can view their organization's contact lens price matrices; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization's contact lens price matrices" ON public.contact_lens_price_matrices FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: lens_families Users can view their organization's lens families; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization's lens families" ON public.lens_families FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: lens_price_matrices Users can view their organization's lens price matrices; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their organization's lens price matrices" ON public.lens_price_matrices FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));


-- Name: user_tour_progress Users can view their own tour progress; Type: POLICY; Schema: public; Owner: -

CREATE POLICY "Users can view their own tour progress" ON public.user_tour_progress FOR SELECT USING ((auth.uid() = user_id));


-- Name: admin_activity_log; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Name: admin_branch_access; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.admin_branch_access ENABLE ROW LEVEL SECURITY;

-- Name: admin_notifications; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Name: agreement_customers; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.agreement_customers ENABLE ROW LEVEL SECURITY;

-- Name: agreement_institutional_balances; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_balances ENABLE ROW LEVEL SECURITY;

-- Name: agreement_institutional_invoice_balances; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_invoice_balances ENABLE ROW LEVEL SECURITY;

-- Name: agreement_institutional_invoices; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.agreement_institutional_invoices ENABLE ROW LEVEL SECURITY;

-- Name: agreement_purchase_orders; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.agreement_purchase_orders ENABLE ROW LEVEL SECURITY;

-- Name: agreements; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

-- Name: ai_insights; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Name: ai_usage_log; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Name: branches; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Name: cart_items; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Name: cash_register_closures; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.cash_register_closures ENABLE ROW LEVEL SECURITY;

-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Name: chat_sessions; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Name: contact_lens_encargos; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.contact_lens_encargos ENABLE ROW LEVEL SECURITY;

-- Name: contact_lens_families; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.contact_lens_families ENABLE ROW LEVEL SECURITY;

-- Name: contact_lens_inventory; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.contact_lens_inventory ENABLE ROW LEVEL SECURITY;

-- Name: contact_lens_price_matrices; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.contact_lens_price_matrices ENABLE ROW LEVEL SECURITY;

-- Name: credit_note_movements; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.credit_note_movements ENABLE ROW LEVEL SECURITY;

-- Name: credit_notes; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

-- Name: customer_lens_purchases; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.customer_lens_purchases ENABLE ROW LEVEL SECURITY;

-- Name: customer_satisfaction_surveys; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.customer_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Name: demo_requests; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Name: demo_requests demo_requests_no_public_access; Type: POLICY; Schema: public; Owner: -

CREATE POLICY demo_requests_no_public_access ON public.demo_requests USING (false) WITH CHECK (false);


-- Name: drivers; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Name: email_send_events; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.email_send_events ENABLE ROW LEVEL SECURITY;

-- Name: embeddings; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

-- Name: field_operations; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.field_operations ENABLE ROW LEVEL SECURITY;

-- Name: internal_order_items; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.internal_order_items ENABLE ROW LEVEL SECURITY;

-- Name: internal_order_status_history; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.internal_order_status_history ENABLE ROW LEVEL SECURITY;

-- Name: internal_orders; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.internal_orders ENABLE ROW LEVEL SECURITY;

-- Name: inventory_movements; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Name: lab_work_order_status_history; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.lab_work_order_status_history ENABLE ROW LEVEL SECURITY;

-- Name: lab_work_orders; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.lab_work_orders ENABLE ROW LEVEL SECURITY;

-- Name: lead_activities; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Name: lead_activities lead_activities_root_full_access; Type: POLICY; Schema: public; Owner: -

CREATE POLICY lead_activities_root_full_access ON public.lead_activities TO authenticated USING ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))) WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))));


-- Name: lead_scoring_logs; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.lead_scoring_logs ENABLE ROW LEVEL SECURITY;

-- Name: lead_scoring_logs lead_scoring_logs_root_full_access; Type: POLICY; Schema: public; Owner: -

CREATE POLICY lead_scoring_logs_root_full_access ON public.lead_scoring_logs TO authenticated USING ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))) WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))));


-- Name: lead_scoring_rules; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;

-- Name: lead_scoring_rules lead_scoring_rules_root_full_access; Type: POLICY; Schema: public; Owner: -

CREATE POLICY lead_scoring_rules_root_full_access ON public.lead_scoring_rules TO authenticated USING ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))) WITH CHECK ((auth.uid() IN ( SELECT admin_users.id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))));


-- Name: lens_families; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.lens_families ENABLE ROW LEVEL SECURITY;

-- Name: lens_price_matrices; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.lens_price_matrices ENABLE ROW LEVEL SECURITY;

-- Name: memory_facts; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.memory_facts ENABLE ROW LEVEL SECURITY;

-- Name: notification_settings; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Name: operativo_mobile_stock; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.operativo_mobile_stock ENABLE ROW LEVEL SECURITY;

-- Name: operativo_sync_queue; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.operativo_sync_queue ENABLE ROW LEVEL SECURITY;

-- Name: optical_internal_support_messages; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_messages ENABLE ROW LEVEL SECURITY;

-- Name: optical_internal_support_tickets; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.optical_internal_support_tickets ENABLE ROW LEVEL SECURITY;

-- Name: opticas_access_tokens; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.opticas_access_tokens ENABLE ROW LEVEL SECURITY;

-- Name: opticas_access_tokens opticas_tokens_no_public; Type: POLICY; Schema: public; Owner: -

CREATE POLICY opticas_tokens_no_public ON public.opticas_access_tokens USING (false) WITH CHECK (false);


-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Name: order_payments; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Name: organization_settings; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Name: payment_gateways_config; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.payment_gateways_config ENABLE ROW LEVEL SECURITY;

-- Name: payment_installments; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;

-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Name: pos_sale_idempotency; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.pos_sale_idempotency ENABLE ROW LEVEL SECURITY;

-- Name: pos_sessions; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

-- Name: pos_settings; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;

-- Name: pos_transactions; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

-- Name: prescriptions; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Name: product_branch_stock; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.product_branch_stock ENABLE ROW LEVEL SECURITY;

-- Name: product_option_fields; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.product_option_fields ENABLE ROW LEVEL SECURITY;

-- Name: product_option_values; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;

-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Name: quote_settings; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;

-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Name: saas_audit_log; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.saas_audit_log ENABLE ROW LEVEL SECURITY;

-- Name: saas_audit_log saas_audit_log_root_read; Type: POLICY; Schema: public; Owner: -

CREATE POLICY saas_audit_log_root_read ON public.saas_audit_log FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));


-- Name: saas_audit_log saas_audit_log_service_role_full_access; Type: POLICY; Schema: public; Owner: -

CREATE POLICY saas_audit_log_service_role_full_access ON public.saas_audit_log TO service_role USING (true) WITH CHECK (true);


-- Name: saas_backups; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.saas_backups ENABLE ROW LEVEL SECURITY;

-- Name: saas_support_messages; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.saas_support_messages ENABLE ROW LEVEL SECURITY;

-- Name: saas_support_templates; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.saas_support_templates ENABLE ROW LEVEL SECURITY;

-- Name: saas_support_tickets; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.saas_support_tickets ENABLE ROW LEVEL SECURITY;

-- Name: schedule_settings; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;

-- Name: subscription_tiers; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Name: support_categories; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;

-- Name: support_messages; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Name: support_templates; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.support_templates ENABLE ROW LEVEL SECURITY;

-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Name: survey_invitations; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.survey_invitations ENABLE ROW LEVEL SECURITY;

-- Name: system_config; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Name: system_email_templates; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.system_email_templates ENABLE ROW LEVEL SECURITY;

-- Name: system_health_metrics; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;

-- Name: system_maintenance_log; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.system_maintenance_log ENABLE ROW LEVEL SECURITY;

-- Name: telemetry_aggregates; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.telemetry_aggregates ENABLE ROW LEVEL SECURITY;

-- Name: telemetry_config; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.telemetry_config ENABLE ROW LEVEL SECURITY;

-- Name: telemetry_events; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

-- Name: tier_change_audit; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.tier_change_audit ENABLE ROW LEVEL SECURITY;

-- Name: treatments; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- Name: user_tour_progress; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;

-- Name: vehicles; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Name: webhook_events; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Name: whatsapp_phone_numbers; Type: ROW SECURITY; Schema: public; Owner: -

ALTER TABLE public.whatsapp_phone_numbers ENABLE ROW LEVEL SECURITY;




COMMIT;
