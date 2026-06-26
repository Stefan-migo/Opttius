-- Migration: 20260703000002_optical_conversion.sql
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

-- ========================================
-- Function
-- ========================================

CREATE OR REPLACE FUNCTION public.check_appointment_availability(p_date date, p_time time without time zone, p_duration_minutes integer DEFAULT 30, p_appointment_id uuid DEFAULT NULL::uuid, p_staff_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid) RETURNS boolean
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

CREATE OR REPLACE FUNCTION public.decrement_inventory(product_id uuid, quantity integer) RETURNS boolean
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

CREATE OR REPLACE FUNCTION public.get_available_time_slots(p_date date, p_duration_minutes integer DEFAULT 30, p_staff_id uuid DEFAULT NULL::uuid, p_branch_id uuid DEFAULT NULL::uuid) RETURNS TABLE(time_slot time without time zone, available boolean)
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

CREATE OR REPLACE FUNCTION public.get_current_prescription(customer_uuid uuid) RETURNS TABLE(id uuid, prescription_date date, expiration_date date, od_sphere numeric, od_cylinder numeric, od_axis integer, os_sphere numeric, os_cylinder numeric, os_axis integer)
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

CREATE OR REPLACE FUNCTION public.get_product_stock(p_product_id uuid, p_branch_id uuid) RETURNS TABLE(quantity integer, reserved_quantity integer, available_quantity integer, low_stock_threshold integer, reorder_point integer, is_low_stock boolean)
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

CREATE OR REPLACE FUNCTION public.get_upcoming_appointments(customer_uuid uuid, days_ahead integer DEFAULT 30) RETURNS TABLE(id uuid, appointment_date date, appointment_time time without time zone, appointment_type text, status text, notes text)
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

CREATE OR REPLACE FUNCTION public.log_debug(message text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RAISE NOTICE '%', message;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_customers_by_rut(rut_search_term text, p_branch_id uuid DEFAULT NULL::uuid, p_branch_ids uuid[] DEFAULT NULL::uuid[]) RETURNS TABLE(id uuid, first_name text, last_name text, email text, phone text, rut text)
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

CREATE OR REPLACE FUNCTION public.search_frames_by_measurements(min_lens_width integer DEFAULT NULL::integer, max_lens_width integer DEFAULT NULL::integer, min_bridge_width integer DEFAULT NULL::integer, max_bridge_width integer DEFAULT NULL::integer, min_temple_length integer DEFAULT NULL::integer, max_temple_length integer DEFAULT NULL::integer) RETURNS TABLE(id uuid, name text, frame_measurements jsonb)
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

CREATE OR REPLACE FUNCTION public.update_product_stock(p_product_id uuid, p_branch_id uuid, p_quantity_change integer, p_reserve boolean DEFAULT false, p_movement_type text DEFAULT NULL::text, p_reference_type text DEFAULT NULL::text, p_reference_id uuid DEFAULT NULL::uuid, p_created_by uuid DEFAULT NULL::uuid) RETURNS boolean
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

END;
$$;

CREATE OR REPLACE FUNCTION public.update_stock_movement_timestamp() RETURNS trigger
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

-- ========================================
-- Tables
-- ========================================

-- Table: appointments

-- ========================================
-- Trigger
-- ========================================

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER check_default_category_deletion BEFORE DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.prevent_default_category_deletion();

CREATE TRIGGER check_system_category_deletion BEFORE DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.prevent_system_category_deletion();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_lens_purchases_updated_at BEFORE UPDATE ON public.customer_lens_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_stock_movement BEFORE UPDATE ON public.product_branch_stock FOR EACH ROW EXECUTE FUNCTION public.update_stock_movement_timestamp();

CREATE TRIGGER update_product_branch_stock_updated_at BEFORE UPDATE ON public.product_branch_stock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_option_fields_updated_at BEFORE UPDATE ON public.product_option_fields FOR EACH ROW EXECUTE FUNCTION public.update_product_option_fields_updated_at();

CREATE TRIGGER update_product_option_values_updated_at BEFORE UPDATE ON public.product_option_values FOR EACH ROW EXECUTE FUNCTION public.update_product_option_values_updated_at();

CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_notify_admin_low_stock AFTER UPDATE OF inventory_quantity ON public.products FOR EACH ROW EXECUTE FUNCTION public.notify_admin_low_stock();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_settings_updated_at BEFORE UPDATE ON public.schedule_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Constraint
-- ========================================

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id);

-- Table: cart_items

ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);

ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;

-- Table: categories

ALTER TABLE public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);

ALTER TABLE public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- Table: customer_lens_purchases

ALTER TABLE public.customer_lens_purchases
    ADD CONSTRAINT customer_lens_purchases_pkey PRIMARY KEY (id);

ALTER TABLE public.customer_lens_purchases
    ADD CONSTRAINT customer_lens_purchases_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.customer_lens_purchases
    ADD CONSTRAINT customer_lens_purchases_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.customer_lens_purchases
    ADD CONSTRAINT customer_lens_purchases_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE SET NULL;

ALTER TABLE public.customer_lens_purchases
    ADD CONSTRAINT customer_lens_purchases_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- Table: customers

ALTER TABLE public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);

ALTER TABLE public.customers
    ADD CONSTRAINT customers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.customers
    ADD CONSTRAINT customers_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;

ALTER TABLE public.customers
    ADD CONSTRAINT customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.customers
    ADD CONSTRAINT customers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- Table: prescriptions

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_field_operation_id_fkey FOREIGN KEY (field_operation_id) REFERENCES public.field_operations(id) ON DELETE SET NULL;

ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: product_branch_stock

ALTER TABLE public.product_branch_stock
    ADD CONSTRAINT product_branch_stock_pkey PRIMARY KEY (id);

ALTER TABLE public.product_branch_stock
    ADD CONSTRAINT product_branch_stock_product_id_branch_id_key UNIQUE (product_id, branch_id);

ALTER TABLE public.product_branch_stock
    ADD CONSTRAINT product_branch_stock_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.product_branch_stock
    ADD CONSTRAINT product_branch_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Table: product_option_fields

ALTER TABLE public.product_option_fields
    ADD CONSTRAINT product_option_fields_field_key_form_type_key UNIQUE (field_key, form_type);

ALTER TABLE public.product_option_fields
    ADD CONSTRAINT product_option_fields_pkey PRIMARY KEY (id);

-- Table: product_option_values

ALTER TABLE public.product_option_values
    ADD CONSTRAINT product_option_values_field_id_value_key UNIQUE (field_id, value);

ALTER TABLE public.product_option_values
    ADD CONSTRAINT product_option_values_pkey PRIMARY KEY (id);

ALTER TABLE public.product_option_values
    ADD CONSTRAINT product_option_values_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.product_option_fields(id) ON DELETE CASCADE;

-- Table: product_variants

ALTER TABLE public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);

ALTER TABLE public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);

ALTER TABLE public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Table: products

ALTER TABLE public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);

ALTER TABLE public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);

ALTER TABLE public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);

ALTER TABLE public.products
    ADD CONSTRAINT products_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.products
    ADD CONSTRAINT products_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id);

ALTER TABLE public.products
    ADD CONSTRAINT products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: schedule_settings

ALTER TABLE public.schedule_settings
    ADD CONSTRAINT schedule_settings_pkey PRIMARY KEY (id);

ALTER TABLE public.schedule_settings
    ADD CONSTRAINT schedule_settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.schedule_settings
    ADD CONSTRAINT schedule_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.schedule_settings
    ADD CONSTRAINT schedule_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- ========================================
-- Indexes (auto-generated from current schema)
-- ========================================

-- ========================================
-- Policy
-- ========================================

CREATE POLICY "Admins can delete appointments" ON public.appointments FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

CREATE POLICY "Admins can insert appointments" ON public.appointments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

CREATE POLICY "Admins can update appointments" ON public.appointments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

CREATE POLICY "Users can manage their organization appointments" ON public.appointments USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Users can view their organization appointments" ON public.appointments FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Anonymous users can manage session cart" ON public.cart_items USING (((auth.uid() IS NULL) AND (session_id IS NOT NULL)));

CREATE POLICY "Users can manage own cart" ON public.cart_items USING ((auth.uid() = user_id));

CREATE POLICY "Admin users can manage categories" ON public.categories USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin users can view all categories" ON public.categories FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view active categories" ON public.categories FOR SELECT USING (((NOT public.is_admin(auth.uid())) AND (is_active = true)));

CREATE POLICY "Admins can delete lens purchases" ON public.customer_lens_purchases FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

CREATE POLICY "Admins can insert lens purchases" ON public.customer_lens_purchases FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

CREATE POLICY "Admins can update lens purchases" ON public.customer_lens_purchases FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

CREATE POLICY "Admins can view all lens purchases" ON public.customer_lens_purchases FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

CREATE POLICY "Admins can delete customers in their branches" ON public.customers FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = customers.branch_id)))));

CREATE POLICY "Admins can insert customers in their branches" ON public.customers FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = customers.branch_id)))));

CREATE POLICY "Admins can update customers in their branches" ON public.customers FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = customers.branch_id)))));

CREATE POLICY "Super admins can delete customers" ON public.customers FOR DELETE USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert customers" ON public.customers FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update customers" ON public.customers FOR UPDATE USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all customers" ON public.customers FOR SELECT USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can manage their organization customers" ON public.customers USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Users can view their organization customers" ON public.customers FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Users can manage their organization prescriptions" ON public.prescriptions USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Users can view their organization prescriptions" ON public.prescriptions FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Admins can manage stock in their branches" ON public.product_branch_stock USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text])))))));

CREATE POLICY "Admins can view stock in their branches" ON public.product_branch_stock FOR SELECT USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid())))));

CREATE POLICY "Admins can delete product option fields" ON public.product_option_fields FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can insert product option fields" ON public.product_option_fields FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can update product option fields" ON public.product_option_fields FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can view all product option fields" ON public.product_option_fields FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can delete product option values" ON public.product_option_values FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can insert product option values" ON public.product_option_values FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can update product option values" ON public.product_option_values FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can view all product option values" ON public.product_option_values FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admin users can manage product variants" ON public.product_variants USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin users can view all product variants" ON public.product_variants FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view active product variants" ON public.product_variants FOR SELECT USING (((NOT public.is_admin(auth.uid())) AND (EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_variants.product_id) AND (products.status = 'active'::text))))));

CREATE POLICY "Admin users can delete all products" ON public.products FOR DELETE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin users can update all products" ON public.products FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin users can view all products" ON public.products FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete products in their branches" ON public.products FOR DELETE USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND ((aba.branch_id = products.branch_id) OR (products.branch_id IS NULL)))))));

CREATE POLICY "Admins can insert products in their branches" ON public.products FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = products.branch_id))))));

CREATE POLICY "Admins can update products in their branches" ON public.products FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND ((aba.branch_id = products.branch_id) OR (products.branch_id IS NULL)))))));

CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING ((status = 'active'::text));

CREATE POLICY "Authenticated users can update own products" ON public.products FOR UPDATE USING (((NOT public.is_admin(auth.uid())) AND (auth.role() = 'authenticated'::text))) WITH CHECK (((NOT public.is_admin(auth.uid())) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Authenticated users can view active products" ON public.products FOR SELECT USING (((NOT public.is_admin(auth.uid())) AND ((status = 'active'::text) OR (status IS NULL))));

CREATE POLICY "Users can manage their organization products" ON public.products USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Users can view their organization products" ON public.products FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = 'super_admin'::text) AND (admin_users.is_active = true)))) OR (organization_id = public.get_user_organization_id()) OR (organization_id IS NULL)));

CREATE POLICY "Admins can manage schedule settings in their branches" ON public.schedule_settings USING ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE ((admin_branch_access.admin_user_id = auth.uid()) AND (admin_branch_access.role = ANY (ARRAY['manager'::text, 'staff'::text]))))) OR (branch_id IS NULL)));

CREATE POLICY "Admins can manage schedule_settings" ON public.schedule_settings USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Users can view schedule_settings" ON public.schedule_settings FOR SELECT USING (((branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid()))) OR (organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

-- ========================================
-- Rls Enable
-- ========================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customer_lens_purchases ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_branch_stock ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_option_fields ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Index
-- ========================================

CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON public.appointments USING btree (assigned_to);

CREATE INDEX IF NOT EXISTS idx_appointments_branch ON public.appointments USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments USING btree (appointment_date, appointment_time);

CREATE INDEX IF NOT EXISTS idx_appointments_field_operation ON public.appointments USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_appointments_guest_email ON public.appointments USING btree (guest_email) WHERE (guest_email IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_appointments_guest_rut ON public.appointments USING btree (guest_rut) WHERE (guest_rut IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_appointments_order_id ON public.appointments USING btree (order_id);

CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.appointments USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_appointments_prescription_id ON public.appointments USING btree (prescription_id);

CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments USING btree (status);

CREATE INDEX IF NOT EXISTS idx_cart_product ON public.cart_items USING btree (product_id);

CREATE INDEX IF NOT EXISTS idx_cart_session ON public.cart_items USING btree (session_id);

CREATE INDEX IF NOT EXISTS idx_cart_user ON public.cart_items USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_categories_is_default ON public.categories USING btree (is_default);

CREATE INDEX IF NOT EXISTS idx_categories_is_system ON public.categories USING btree (is_system);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories USING btree (parent_id);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories USING btree (slug);

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_customer_id ON public.customer_lens_purchases USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_order_id ON public.customer_lens_purchases USING btree (order_id);

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_prescription_id ON public.customer_lens_purchases USING btree (prescription_id);

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_purchase_date ON public.customer_lens_purchases USING btree (purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_status ON public.customer_lens_purchases USING btree (status);

CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON public.customers USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_customers_field_operation ON public.customers USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers USING btree (is_active) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers USING btree (first_name, last_name);

CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers USING btree (phone) WHERE (phone IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_customers_rut_normalized ON public.customers USING btree (public.normalize_rut_for_search(rut)) WHERE (rut IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_customers_updated_by ON public.customers USING btree (updated_by);

CREATE INDEX IF NOT EXISTS idx_prescriptions_branch_id ON public.prescriptions USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_created_by ON public.prescriptions USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_prescriptions_customer_id ON public.prescriptions USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_field_operation ON public.prescriptions USING btree (field_operation_id) WHERE (field_operation_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_prescriptions_is_active ON public.prescriptions USING btree (is_active) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_prescriptions_is_current ON public.prescriptions USING btree (is_current) WHERE (is_current = true);

CREATE INDEX IF NOT EXISTS idx_prescriptions_organization_id ON public.prescriptions USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_prescription_date ON public.prescriptions USING btree (prescription_date DESC);

CREATE INDEX IF NOT EXISTS idx_product_branch_stock_available ON public.product_branch_stock USING btree (available_quantity);

CREATE INDEX IF NOT EXISTS idx_product_branch_stock_branch ON public.product_branch_stock USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_product_branch_stock_contact_lens_low_stock ON public.product_branch_stock USING btree (branch_id, available_quantity);

CREATE INDEX IF NOT EXISTS idx_product_branch_stock_low_stock ON public.product_branch_stock USING btree (branch_id, available_quantity) WHERE (available_quantity <= low_stock_threshold);

CREATE INDEX IF NOT EXISTS idx_product_branch_stock_product ON public.product_branch_stock USING btree (product_id);

CREATE INDEX IF NOT EXISTS idx_product_option_fields_category ON public.product_option_fields USING btree (field_category);

CREATE INDEX IF NOT EXISTS idx_product_option_fields_form_type ON public.product_option_fields USING btree (form_type);

CREATE INDEX IF NOT EXISTS idx_product_option_fields_key ON public.product_option_fields USING btree (field_key);

CREATE INDEX IF NOT EXISTS idx_product_option_values_active ON public.product_option_values USING btree (field_id, is_active) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_product_option_values_field_id ON public.product_option_values USING btree (field_id);

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants USING btree (product_id);

CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.product_variants USING btree (sku);

CREATE INDEX IF NOT EXISTS idx_products_branch ON public.products USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products USING btree (brand);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products USING btree (category_id);

CREATE INDEX IF NOT EXISTS idx_products_contact_lens_family_id ON public.products USING btree (contact_lens_family_id) WHERE (contact_lens_family_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_products_contact_lens_search ON public.products USING btree (name, brand, sku) WHERE (product_type = 'contact_lens'::text);

CREATE INDEX IF NOT EXISTS idx_products_contact_lens_type ON public.products USING btree (product_type, optical_category) WHERE (product_type = 'contact_lens'::text);

CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products USING btree (is_featured);

CREATE INDEX IF NOT EXISTS idx_products_frame_brand ON public.products USING btree (frame_brand);

CREATE INDEX IF NOT EXISTS idx_products_frame_colors ON public.products USING gin (frame_colors);

CREATE INDEX IF NOT EXISTS idx_products_frame_features ON public.products USING gin (frame_features);

CREATE INDEX IF NOT EXISTS idx_products_frame_gender ON public.products USING btree (frame_gender);

CREATE INDEX IF NOT EXISTS idx_products_frame_material ON public.products USING btree (frame_material);

CREATE INDEX IF NOT EXISTS idx_products_frame_type ON public.products USING btree (frame_type);

CREATE INDEX IF NOT EXISTS idx_products_lens_coatings ON public.products USING gin (lens_coatings);

CREATE INDEX IF NOT EXISTS idx_products_lens_material ON public.products USING btree (lens_material);

CREATE INDEX IF NOT EXISTS idx_products_lens_tint_options ON public.products USING gin (lens_tint_options);

CREATE INDEX IF NOT EXISTS idx_products_lens_type ON public.products USING btree (lens_type);

CREATE INDEX IF NOT EXISTS idx_products_optical_category ON public.products USING btree (optical_category);

CREATE INDEX IF NOT EXISTS idx_products_org ON public.products USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_products_price_includes_tax ON public.products USING btree (price_includes_tax);

CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products USING btree (product_type);

CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING gin (search_keywords);

CREATE INDEX IF NOT EXISTS idx_products_skin_type ON public.products USING gin (skin_type);

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products USING btree (slug);

CREATE INDEX IF NOT EXISTS idx_products_status ON public.products USING btree (status);

CREATE INDEX IF NOT EXISTS idx_schedule_settings_branch ON public.schedule_settings USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_schedule_settings_updated_by ON public.schedule_settings USING btree (updated_by);

-- ========================================
-- Comment
-- ========================================

-- ========================================
-- Functions
-- ========================================

COMMENT ON TABLE public.appointments IS 'Customer appointments and schedules';

COMMENT ON COLUMN public.appointments.customer_id IS 'References customers table, not profiles. Customers are branch-specific.';

COMMENT ON COLUMN public.appointments.guest_first_name IS 'First name of guest (non-registered) customer. Required if customer_id is NULL.';

COMMENT ON COLUMN public.appointments.guest_last_name IS 'Last name of guest (non-registered) customer. Required if customer_id is NULL.';

COMMENT ON COLUMN public.appointments.guest_rut IS 'RUT of guest (non-registered) customer. Required if customer_id is NULL.';

COMMENT ON COLUMN public.appointments.guest_email IS 'Email of guest (non-registered) customer. Optional.';

COMMENT ON COLUMN public.appointments.guest_phone IS 'Phone of guest (non-registered) customer. Optional.';

COMMENT ON COLUMN public.appointments.organization_id IS 'Organization that owns this appointment. Used for multi-tenant data isolation.';

COMMENT ON TABLE public.categories IS 'Categorías de productos. La categoría "Marcos" es la categoría por defecto para armazones.';

COMMENT ON COLUMN public.categories.is_system IS 'Indica si la categoría es del sistema. Las categorías del sistema (is_system=true) no pueden ser eliminadas. Solo "Marcos" tiene is_system=true.';

COMMENT ON COLUMN public.categories.is_default IS 'Indicates if this is a system default category that cannot be deleted';

COMMENT ON TABLE public.customer_lens_purchases IS 'Detailed history of lens and frame purchases linked to prescriptions';

COMMENT ON TABLE public.customers IS 'Branch-specific customers. Separate from users (profiles). Customers are created only from within the platform.';

COMMENT ON COLUMN public.customers.branch_id IS 'The branch this customer belongs to. Each branch manages its own customers independently.';

COMMENT ON COLUMN public.customers.email IS 'Optional email. Customers may not have email addresses.';

COMMENT ON COLUMN public.customers.rut IS 'Chilean RUT (Rol Único Tributario) or similar identification number.';

COMMENT ON COLUMN public.customers.organization_id IS 'Organization that owns this customer. Used for multi-tenant data isolation.';

COMMENT ON TABLE public.prescriptions IS 'Eye prescriptions for customers';

COMMENT ON COLUMN public.prescriptions.customer_id IS 'References customers table, not profiles. Customers are branch-specific.';

COMMENT ON COLUMN public.prescriptions.od_sphere IS 'Right eye sphere power (e.g., -2.50, +1.75)';

COMMENT ON COLUMN public.prescriptions.od_axis IS 'Right eye axis in degrees (0-180)';

COMMENT ON COLUMN public.prescriptions.od_pd IS 'Right eye pupillary distance in millimeters';

COMMENT ON COLUMN public.prescriptions.os_sphere IS 'Left eye sphere power';

COMMENT ON COLUMN public.prescriptions.os_axis IS 'Left eye axis in degrees (0-180)';

COMMENT ON COLUMN public.prescriptions.os_pd IS 'Left eye pupillary distance in millimeters';

COMMENT ON TABLE public.product_branch_stock IS 'Evaluation: Updated with contact_lens products - 2026-03-30';

COMMENT ON COLUMN public.product_branch_stock.quantity IS 'Total physical stock available at this branch';

COMMENT ON COLUMN public.product_branch_stock.reserved_quantity IS 'Stock reserved for pending orders/carts. Available = quantity - reserved_quantity';

COMMENT ON COLUMN public.product_branch_stock.low_stock_threshold IS 'Alert threshold: when available_quantity <= this value, stock is considered low';

COMMENT ON COLUMN public.product_branch_stock.available_quantity IS 'Calculated: quantity - reserved_quantity. Stock actually available for sale';

COMMENT ON COLUMN public.product_branch_stock.reorder_point IS 'Reorder point: when stock reaches this level, reorder should be triggered';

COMMENT ON COLUMN public.product_branch_stock.last_stock_movement IS 'Timestamp of last stock movement (increase or decrease)';

COMMENT ON COLUMN public.products.track_inventory IS 'DEPRECATED: Use product_branch_stock table instead. Will be removed in future migration.';

COMMENT ON COLUMN public.products.inventory_quantity IS 'DEPRECATED: Use product_branch_stock table instead. Will be removed in future migration.';

COMMENT ON COLUMN public.products.low_stock_threshold IS 'DEPRECATED: Use product_branch_stock table instead. Will be removed in future migration.';

COMMENT ON COLUMN public.products.product_type IS 'Type of optical product: frame, lens, accessory, or service';

COMMENT ON COLUMN public.products.frame_measurements IS 'Frame measurements in mm: {lens_width, bridge_width, temple_length, lens_height, total_width}';

COMMENT ON COLUMN public.products.prescription_range IS 'Prescription range supported: {sph_min, sph_max, cyl_min, cyl_max, add_min, add_max}';

COMMENT ON COLUMN public.products.lens_index IS 'Refractive index of lens material (1.50, 1.59, 1.67, 1.74, etc.)';

COMMENT ON COLUMN public.products.package_characteristics IS 'Package/container characteristics for biocosmetic products';

COMMENT ON COLUMN public.products.branch_id IS 'Sucursal a la que pertenece el producto. NULL para productos globales (legacy).';

COMMENT ON COLUMN public.products.price_includes_tax IS 'Indica si el precio del producto ya incluye el IVA. Si es TRUE, el precio mostrado ya incluye IVA. Si es FALSE, se debe agregar IVA al precio.';

COMMENT ON COLUMN public.products.organization_id IS 'Organization that owns this product. Used for multi-tenant data isolation.';

COMMENT ON COLUMN public.products.contact_lens_family_id IS 'Referencia a la familia de lentes de contacto original (para backward compatibility durante migración)';

COMMENT ON TABLE public.schedule_settings IS 'Configuración de horarios y disponibilidad para el sistema de citas';

COMMIT;
