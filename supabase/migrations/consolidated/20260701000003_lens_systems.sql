-- Migration: 20260703000003_lens_systems.sql
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

CREATE TABLE IF NOT EXISTS public.lens_catalog_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    catalog_id uuid NOT NULL,
    original_name text NOT NULL,
    original_code text,
    original_row_data jsonb,
    parsed_data jsonb NOT NULL,
    ai_confidence numeric(3,2),
    mapped_material_id uuid,
    mapped_design_id uuid,
    supplier_cost numeric(10,2) NOT NULL,
    suggested_price numeric(10,2),
    import_status text DEFAULT 'pending'::text,
    skip_reason text,
    review_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    lens_product_id uuid,
    CONSTRAINT lens_catalog_products_import_status_check CHECK ((import_status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'mapped'::text, 'imported'::text, 'skipped'::text])))
);

CREATE TABLE IF NOT EXISTS public.lens_designs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    has_addition boolean DEFAULT false,
    requires_height boolean DEFAULT false,
    name_variations jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lens_designs_category_check CHECK ((category = ANY (ARRAY['single_vision'::text, 'bifocal'::text, 'progressive'::text, 'occupational'::text, 'sports'::text, 'specialty'::text])))
);

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
    base_treatments text[] DEFAULT '{}'::text[],
    treatments_available text[] DEFAULT ARRAY['anti_reflective'::text, 'blue_light_filter'::text, 'tint'::text],
    CONSTRAINT lens_families_lens_material_check CHECK ((lens_material = ANY (ARRAY['cr39'::text, 'polycarbonate'::text, 'high_index_1_67'::text, 'high_index_1_74'::text, 'trivex'::text, 'glass'::text]))),
    CONSTRAINT lens_families_lens_type_check CHECK ((lens_type = ANY (ARRAY['single_vision'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text, 'reading'::text, 'computer'::text, 'sports'::text])))
);

CREATE TABLE IF NOT EXISTS public.lens_indexes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    value numeric(4,3) NOT NULL,
    label text NOT NULL,
    description text,
    category text DEFAULT 'standard'::text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lens_indexes_category_check CHECK ((category = ANY (ARRAY['standard'::text, 'premium'::text, 'ultra'::text, 'specialty'::text])))
);

CREATE TABLE IF NOT EXISTS public.lens_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    index_refraction numeric(4,3),
    category text DEFAULT 'organic'::text,
    name_variations jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    index_id uuid,
    CONSTRAINT lens_materials_category_check CHECK ((category = ANY (ARRAY['organic'::text, 'polycarbonate'::text, 'high_index'::text, 'mineral'::text, 'specialty'::text])))
);

CREATE TABLE IF NOT EXISTS public.lens_mountings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    supplier_id uuid,
    name text NOT NULL,
    mounting_type text NOT NULL,
    applies_to text[] DEFAULT '{single_vision,bifocal,progressive}'::text[] NOT NULL,
    price_simple numeric(10,2) NOT NULL,
    price_ranurado numeric(10,2),
    price_perforado numeric(10,2),
    is_free_for_own_brand boolean DEFAULT false,
    own_brand_condition text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lens_mountings_mounting_type_check CHECK ((mounting_type = ANY (ARRAY['simple'::text, 'ranurado'::text, 'perforado'::text])))
);

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

CREATE TABLE IF NOT EXISTS public.lens_product_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lens_product_id uuid NOT NULL,
    sphere_min numeric(5,2) DEFAULT '-10.00'::numeric NOT NULL,
    sphere_max numeric(5,2) DEFAULT 10.00 NOT NULL,
    cylinder_min numeric(5,2) DEFAULT '-4.00'::numeric NOT NULL,
    cylinder_max numeric(5,2) DEFAULT 4.00 NOT NULL,
    addition_min numeric(5,2) DEFAULT 0.00,
    addition_max numeric(5,2) DEFAULT 4.00,
    cost numeric(10,2) NOT NULL,
    price numeric(10,2) NOT NULL,
    sourcing_type text DEFAULT 'stock'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lens_product_pricing_sourcing_type_check CHECK ((sourcing_type = ANY (ARRAY['stock'::text, 'surfaced'::text]))),
    CONSTRAINT valid_addition_range CHECK ((addition_min <= addition_max)),
    CONSTRAINT valid_cylinder_range CHECK ((cylinder_min <= cylinder_max)),
    CONSTRAINT valid_sphere_range CHECK ((sphere_min <= sphere_max))
);

CREATE TABLE IF NOT EXISTS public.lens_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    sku_code text NOT NULL,
    name text NOT NULL,
    description text,
    supplier_id uuid,
    catalog_product_id uuid,
    supplier_sku text,
    material_id uuid,
    design_id uuid,
    lens_type text NOT NULL,
    lens_material text NOT NULL,
    lens_index numeric(4,3),
    tech_variant text DEFAULT 'standard'::text,
    tech_variant_color text,
    sourcing_type text DEFAULT 'surfaced'::text NOT NULL,
    is_stock_available boolean DEFAULT false,
    stock_sphere_min numeric(5,2) DEFAULT '-10.00'::numeric,
    stock_sphere_max numeric(5,2) DEFAULT 10.00,
    stock_cylinder_min numeric(5,2) DEFAULT '-4.00'::numeric,
    stock_cylinder_max numeric(5,2) DEFAULT 4.00,
    base_treatments text[] DEFAULT '{}'::text[],
    available_treatments text[] DEFAULT '{}'::text[],
    pricing_type text DEFAULT 'fixed'::text NOT NULL,
    cost numeric(10,2) NOT NULL,
    price numeric(10,2) NOT NULL,
    category_id uuid,
    brand text,
    warranty_months integer,
    min_height_mm numeric(4,1),
    diameter_mm text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sales_unit text DEFAULT 'per_pair'::text NOT NULL,
    is_tax_included boolean DEFAULT false,
    index_id uuid,
    CONSTRAINT lens_products_lens_material_check CHECK ((lens_material = ANY (ARRAY['cr39'::text, 'polycarbonate'::text, 'high_index_1_67'::text, 'high_index_1_74'::text, 'trivex'::text, 'glass'::text]))),
    CONSTRAINT lens_products_lens_type_check CHECK ((lens_type = ANY (ARRAY['single_vision'::text, 'bifocal'::text, 'trifocal'::text, 'progressive'::text, 'reading'::text, 'computer'::text, 'sports'::text]))),
    CONSTRAINT lens_products_pricing_type_check CHECK ((pricing_type = ANY (ARRAY['fixed'::text, 'range'::text]))),
    CONSTRAINT lens_products_sales_unit_check CHECK ((sales_unit = ANY (ARRAY['per_eye'::text, 'per_pair'::text]))),
    CONSTRAINT lens_products_sourcing_type_check CHECK ((sourcing_type = ANY (ARRAY['stock'::text, 'surfaced'::text, 'both'::text]))),
    CONSTRAINT lens_products_tech_variant_check CHECK ((tech_variant = ANY (ARRAY['standard'::text, 'blue_filter'::text, 'photochromatic'::text, 'polarized'::text, 'photochromatic_blue'::text, 'mirrored'::text, 'gradient'::text])))
);

CREATE TABLE IF NOT EXISTS public.lens_supplier_catalogs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    catalog_name text NOT NULL,
    source_type text DEFAULT 'markdown'::text,
    raw_content text,
    parse_status text DEFAULT 'pending'::text,
    parsed_data jsonb,
    ai_confidence_score numeric(3,2),
    ai_model_used text,
    pricing_model_detected text,
    markup_percentage numeric(5,2) DEFAULT 40.00,
    products_detected integer DEFAULT 0,
    products_confirmed integer DEFAULT 0,
    valid_from date,
    valid_to date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lens_supplier_catalogs_parse_status_check CHECK ((parse_status = ANY (ARRAY['pending'::text, 'parsing'::text, 'parsed'::text, 'confirmed'::text, 'failed'::text]))),
    CONSTRAINT lens_supplier_catalogs_source_type_check CHECK ((source_type = ANY (ARRAY['pdf_text'::text, 'markdown'::text, 'excel'::text, 'manual'::text])))
);

CREATE TABLE IF NOT EXISTS public.lens_supplier_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    service_category text NOT NULL,
    name text NOT NULL,
    sku_code text,
    description text,
    mounting_type text,
    applies_to text[] DEFAULT '{}'::text[],
    cost numeric(10,2) DEFAULT 0 NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    is_free_for_own_brand boolean DEFAULT false,
    own_brand_condition text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lens_supplier_services_mounting_type_check CHECK ((mounting_type = ANY (ARRAY['simple'::text, 'ranurado'::text, 'perforado'::text, 'flexible'::text]))),
    CONSTRAINT lens_supplier_services_service_category_check CHECK ((service_category = ANY (ARRAY['mounting'::text, 'treatment'::text, 'tinting'::text, 'surcharge'::text, 'express_delivery'::text, 'prism'::text, 'other'::text])))
);

CREATE TABLE IF NOT EXISTS public.lens_suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    supplier_type text DEFAULT 'laboratory'::text NOT NULL,
    country text DEFAULT 'Chile'::text,
    website text,
    contact_info jsonb DEFAULT '{}'::jsonb,
    suggested_markup numeric(5,2),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lens_suppliers_supplier_type_check CHECK ((supplier_type = ANY (ARRAY['laboratory'::text, 'internal'::text, 'importer'::text])))
);

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
    CONSTRAINT treatments_applied_in_check CHECK ((applied_in = ANY (ARRAY['factory'::text, 'local_lab'::text, 'both'::text, 'lab'::text]))),
    CONSTRAINT treatments_category_check CHECK ((category = ANY (ARRAY['coating'::text, 'tint'::text, 'protection'::text, 'finish'::text])))
);

-- ========================================
-- Function
-- ========================================

CREATE OR REPLACE FUNCTION public.calculate_contact_lens_price(p_contact_lens_family_id uuid, p_sphere numeric, p_cylinder numeric DEFAULT 0, p_axis integer DEFAULT NULL::integer, p_addition numeric DEFAULT NULL::numeric, p_organization_id uuid DEFAULT NULL::uuid) RETURNS TABLE(price numeric, cost numeric, base_curve numeric, diameter numeric)
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

CREATE OR REPLACE FUNCTION public.calculate_lens_price(p_lens_family_id uuid, p_sphere numeric, p_cylinder numeric DEFAULT 0, p_sourcing_type text DEFAULT NULL::text) RETURNS TABLE(price numeric, sourcing_type text, cost numeric)
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

CREATE OR REPLACE FUNCTION public.calculate_lens_price(p_lens_family_id uuid, p_sphere numeric, p_cylinder numeric DEFAULT 0, p_addition numeric DEFAULT NULL::numeric, p_sourcing_type text DEFAULT NULL::text) RETURNS TABLE(price numeric, sourcing_type text, cost numeric)
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

CREATE OR REPLACE FUNCTION public.calculate_lens_product_price(p_lens_product_id uuid, p_sphere numeric DEFAULT 0, p_cylinder numeric DEFAULT 0, p_addition numeric DEFAULT 0) RETURNS TABLE(price numeric, cost numeric, sourcing_type text, pricing_match text, sales_unit text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_product public.lens_products;
  v_pricing public.lens_product_pricing;
BEGIN
  SELECT * INTO v_product
  FROM public.lens_products
  WHERE id = p_lens_product_id AND is_active = TRUE;

END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_treatments_total(p_treatment_keys text[], p_lens_material text DEFAULT 'cr39'::text) RETURNS numeric
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

END;
$$;

CREATE OR REPLACE FUNCTION public.can_add_treatment(p_treatment_key text, p_lens_family_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_treatments_available TEXT[];
    v_is_stock BOOLEAN;
BEGIN
    SELECT lf.treatments_available, lf.is_stock_available INTO v_treatments_available, v_is_stock
    FROM public.lens_families lf WHERE lf.id = p_lens_family_id;
    IF v_is_stock = TRUE THEN RETURN FALSE; END IF;
    RETURN (p_treatment_key = ANY(v_treatments_available));
END;
$$;

CREATE OR REPLACE FUNCTION public.check_contact_lens_availability(p_product_id uuid, p_branch_id uuid, p_quantity integer) RETURNS TABLE(is_available boolean, current_stock integer, requested_quantity integer)
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

CREATE OR REPLACE FUNCTION public.check_contact_lens_stock(p_contact_lens_family_id uuid, p_branch_id uuid, p_sphere numeric, p_cylinder numeric) RETURNS TABLE(has_stock boolean, available_quantity integer, inventory_id uuid)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_quantity INTEGER;
  v_inventory_id UUID;
BEGIN
  -- Find inventory entry that covers the requested prescription
  SELECT cli.quantity, cli.id INTO v_quantity, v_inventory_id
  FROM contact_lens_inventory cli
  WHERE cli.contact_lens_family_id = p_contact_lens_family_id
    AND cli.branch_id = p_branch_id
    AND cli.is_active = TRUE
    AND cli.quantity > 0
    AND p_sphere >= cli.sphere_min
    AND p_sphere <= cli.sphere_max
    AND p_cylinder >= cli.cylinder_min
    AND p_cylinder <= cli.cylinder_max
  LIMIT 1;

  RETURN QUERY SELECT 
    CASE WHEN v_quantity > 0 THEN TRUE ELSE FALSE END,
    COALESCE(v_quantity, 0),
    v_inventory_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_lens_family_full(p_family_data jsonb, p_matrices_data jsonb) RETURNS jsonb
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

END;
$$;

CREATE OR REPLACE FUNCTION public.create_lens_product_full(p_product_data jsonb, p_pricing_data jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_product_id UUID;
BEGIN
  -- Insert product from JSONB data
  INSERT INTO public.lens_products
  SELECT *
  FROM jsonb_populate_record(NULL::public.lens_products, p_product_data)
  RETURNING id INTO v_product_id;

END;
$$;

CREATE OR REPLACE FUNCTION public.generate_contact_lens_sku(brand text, name text, org_id uuid) RETURNS text
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

CREATE OR REPLACE FUNCTION public.get_treatment_price(p_treatment_key text, p_lens_material text DEFAULT 'cr39'::text) RETURNS numeric
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

END;
$$;

CREATE OR REPLACE FUNCTION public.is_prescription_in_stock_range(p_sphere numeric, p_cylinder numeric, p_stock_sphere_min numeric, p_stock_sphere_max numeric, p_stock_cylinder_min numeric, p_stock_cylinder_max numeric) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN (p_sphere >= p_stock_sphere_min AND p_sphere <= p_stock_sphere_max
            AND p_cylinder >= p_stock_cylinder_min AND p_cylinder <= p_stock_cylinder_max);
END;
$$;

CREATE OR REPLACE FUNCTION public.reduce_contact_lens_stock(p_contact_lens_family_id uuid, p_branch_id uuid, p_sphere numeric, p_cylinder numeric, p_quantity_to_reduce integer DEFAULT 1) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_inventory_id UUID;
  v_current_quantity INTEGER;
BEGIN
  -- Find and lock the inventory entry
  SELECT cli.id, cli.quantity INTO v_inventory_id, v_current_quantity
  FROM contact_lens_inventory cli
  WHERE cli.contact_lens_family_id = p_contact_lens_family_id
    AND cli.branch_id = p_branch_id
    AND cli.is_active = TRUE
    AND p_sphere >= cli.sphere_min
    AND p_sphere <= cli.sphere_max
    AND p_cylinder >= cli.cylinder_min
    AND p_cylinder <= cli.cylinder_max
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_inventory_id IS NULL OR v_current_quantity < p_quantity_to_reduce THEN
    RETURN FALSE;
  END IF;

  -- Reduce the quantity
  UPDATE contact_lens_inventory
  SET quantity = quantity - p_quantity_to_reduce,
      updated_at = NOW()
  WHERE id = v_inventory_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_treatment_compatibility(p_treatment_keys text[], p_lens_material text DEFAULT 'cr39'::text, p_lens_type text DEFAULT 'single_vision'::text) RETURNS jsonb
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

-- ========================================
-- Tables
-- ========================================

-- Table: contact_lens_encargos
END;
$$;

-- ========================================
-- Trigger
-- ========================================

CREATE TRIGGER update_contact_lens_encargos_updated_at BEFORE UPDATE ON public.contact_lens_encargos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_lens_families_updated_at BEFORE UPDATE ON public.contact_lens_families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_lens_inventory_updated_at BEFORE UPDATE ON public.contact_lens_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_lens_price_matrices_updated_at BEFORE UPDATE ON public.contact_lens_price_matrices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lens_catalog_products_updated_at BEFORE UPDATE ON public.lens_catalog_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lens_designs_updated_at BEFORE UPDATE ON public.lens_designs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lens_families_updated_at BEFORE UPDATE ON public.lens_families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lens_materials_updated_at BEFORE UPDATE ON public.lens_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lens_mountings_updated_at BEFORE UPDATE ON public.lens_mountings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lens_price_matrices_updated_at BEFORE UPDATE ON public.lens_price_matrices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lens_product_pricing_updated_at BEFORE UPDATE ON public.lens_product_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lens_products_updated_at BEFORE UPDATE ON public.lens_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lens_supplier_catalogs_updated_at BEFORE UPDATE ON public.lens_supplier_catalogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_lens_supplier_services_updated_at BEFORE UPDATE ON public.lens_supplier_services FOR EACH ROW EXECUTE FUNCTION public.update_lens_supplier_services_updated_at();

CREATE TRIGGER update_lens_suppliers_updated_at BEFORE UPDATE ON public.lens_suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Constraint
-- ========================================

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_pkey PRIMARY KEY (id);

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id) ON DELETE CASCADE;

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id);

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.contact_lens_encargos
    ADD CONSTRAINT contact_lens_encargos_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: contact_lens_families

ALTER TABLE public.contact_lens_families
    ADD CONSTRAINT contact_lens_families_pkey PRIMARY KEY (id);

ALTER TABLE public.contact_lens_families
    ADD CONSTRAINT contact_lens_families_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.contact_lens_families
    ADD CONSTRAINT contact_lens_families_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: contact_lens_inventory

ALTER TABLE public.contact_lens_inventory
    ADD CONSTRAINT contact_lens_inventory_contact_lens_family_id_branch_id_sph_key UNIQUE (contact_lens_family_id, branch_id, sphere_min, sphere_max, cylinder_min, cylinder_max);

ALTER TABLE public.contact_lens_inventory
    ADD CONSTRAINT contact_lens_inventory_pkey PRIMARY KEY (id);

ALTER TABLE public.contact_lens_inventory
    ADD CONSTRAINT contact_lens_inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.contact_lens_inventory
    ADD CONSTRAINT contact_lens_inventory_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id) ON DELETE CASCADE;

-- Table: contact_lens_price_matrices

ALTER TABLE public.contact_lens_price_matrices
    ADD CONSTRAINT contact_lens_price_matrices_pkey PRIMARY KEY (id);

ALTER TABLE public.contact_lens_price_matrices
    ADD CONSTRAINT contact_lens_price_matrices_contact_lens_family_id_fkey FOREIGN KEY (contact_lens_family_id) REFERENCES public.contact_lens_families(id) ON DELETE CASCADE;

ALTER TABLE public.contact_lens_price_matrices
    ADD CONSTRAINT contact_lens_price_matrices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: lens_catalog_products

ALTER TABLE public.lens_catalog_products
    ADD CONSTRAINT lens_catalog_products_pkey PRIMARY KEY (id);

ALTER TABLE public.lens_catalog_products
    ADD CONSTRAINT lens_catalog_products_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES public.lens_supplier_catalogs(id) ON DELETE CASCADE;

ALTER TABLE public.lens_catalog_products
    ADD CONSTRAINT lens_catalog_products_lens_product_id_fkey FOREIGN KEY (lens_product_id) REFERENCES public.lens_products(id);

ALTER TABLE public.lens_catalog_products
    ADD CONSTRAINT lens_catalog_products_mapped_design_id_fkey FOREIGN KEY (mapped_design_id) REFERENCES public.lens_designs(id);

ALTER TABLE public.lens_catalog_products
    ADD CONSTRAINT lens_catalog_products_mapped_material_id_fkey FOREIGN KEY (mapped_material_id) REFERENCES public.lens_materials(id);

-- Table: lens_designs

ALTER TABLE public.lens_designs
    ADD CONSTRAINT lens_designs_code_key UNIQUE (code);

ALTER TABLE public.lens_designs
    ADD CONSTRAINT lens_designs_pkey PRIMARY KEY (id);

-- Table: lens_families

ALTER TABLE public.lens_families
    ADD CONSTRAINT lens_families_pkey PRIMARY KEY (id);

ALTER TABLE public.lens_families
    ADD CONSTRAINT lens_families_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.lens_families
    ADD CONSTRAINT lens_families_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: lens_indexes

ALTER TABLE public.lens_indexes
    ADD CONSTRAINT lens_indexes_pkey PRIMARY KEY (id);

ALTER TABLE public.lens_indexes
    ADD CONSTRAINT lens_indexes_value_key UNIQUE (value);

-- Table: lens_materials

ALTER TABLE public.lens_materials
    ADD CONSTRAINT lens_materials_code_key UNIQUE (code);

ALTER TABLE public.lens_materials
    ADD CONSTRAINT lens_materials_pkey PRIMARY KEY (id);

ALTER TABLE public.lens_materials
    ADD CONSTRAINT lens_materials_index_id_fkey FOREIGN KEY (index_id) REFERENCES public.lens_indexes(id);

-- Table: lens_mountings

ALTER TABLE public.lens_mountings
    ADD CONSTRAINT lens_mountings_pkey PRIMARY KEY (id);

ALTER TABLE public.lens_mountings
    ADD CONSTRAINT lens_mountings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.lens_mountings
    ADD CONSTRAINT lens_mountings_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lens_suppliers(id) ON DELETE SET NULL;

-- Table: lens_price_matrices

ALTER TABLE public.lens_price_matrices
    ADD CONSTRAINT lens_price_matrices_pkey PRIMARY KEY (id);

ALTER TABLE public.lens_price_matrices
    ADD CONSTRAINT lens_price_matrices_lens_family_id_fkey FOREIGN KEY (lens_family_id) REFERENCES public.lens_families(id) ON DELETE CASCADE;

ALTER TABLE public.lens_price_matrices
    ADD CONSTRAINT lens_price_matrices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: lens_product_pricing

ALTER TABLE public.lens_product_pricing
    ADD CONSTRAINT lens_product_pricing_pkey PRIMARY KEY (id);

ALTER TABLE public.lens_product_pricing
    ADD CONSTRAINT lens_product_pricing_lens_product_id_fkey FOREIGN KEY (lens_product_id) REFERENCES public.lens_products(id) ON DELETE CASCADE;

-- Table: lens_products

ALTER TABLE public.lens_products
    ADD CONSTRAINT lens_products_organization_id_sku_code_key UNIQUE (organization_id, sku_code);

ALTER TABLE public.lens_products
    ADD CONSTRAINT lens_products_pkey PRIMARY KEY (id);

ALTER TABLE public.lens_products
    ADD CONSTRAINT lens_products_catalog_product_id_fkey FOREIGN KEY (catalog_product_id) REFERENCES public.lens_catalog_products(id) ON DELETE SET NULL;

ALTER TABLE public.lens_products
    ADD CONSTRAINT lens_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.lens_products
    ADD CONSTRAINT lens_products_design_id_fkey FOREIGN KEY (design_id) REFERENCES public.lens_designs(id);

ALTER TABLE public.lens_products
    ADD CONSTRAINT lens_products_index_id_fkey FOREIGN KEY (index_id) REFERENCES public.lens_indexes(id);

ALTER TABLE public.lens_products
    ADD CONSTRAINT lens_products_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.lens_materials(id);

ALTER TABLE public.lens_products
    ADD CONSTRAINT lens_products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.lens_products
    ADD CONSTRAINT lens_products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lens_suppliers(id) ON DELETE SET NULL;

-- Table: lens_supplier_catalogs

ALTER TABLE public.lens_supplier_catalogs
    ADD CONSTRAINT lens_supplier_catalogs_pkey PRIMARY KEY (id);

ALTER TABLE public.lens_supplier_catalogs
    ADD CONSTRAINT lens_supplier_catalogs_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lens_suppliers(id) ON DELETE CASCADE;

-- Table: lens_supplier_services

ALTER TABLE public.lens_supplier_services
    ADD CONSTRAINT lens_supplier_services_organization_id_supplier_id_name_ser_key UNIQUE (organization_id, supplier_id, name, service_category);

ALTER TABLE public.lens_supplier_services
    ADD CONSTRAINT lens_supplier_services_pkey PRIMARY KEY (id);

ALTER TABLE public.lens_supplier_services
    ADD CONSTRAINT lens_supplier_services_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.lens_supplier_services
    ADD CONSTRAINT lens_supplier_services_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.lens_suppliers(id) ON DELETE CASCADE;

-- Table: lens_suppliers

ALTER TABLE public.lens_suppliers
    ADD CONSTRAINT lens_suppliers_organization_id_code_key UNIQUE (organization_id, code);

ALTER TABLE public.lens_suppliers
    ADD CONSTRAINT lens_suppliers_pkey PRIMARY KEY (id);

ALTER TABLE public.lens_suppliers
    ADD CONSTRAINT lens_suppliers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Table: treatments

ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_pkey PRIMARY KEY (id);

ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_treatment_key_key UNIQUE (treatment_key);

ALTER TABLE public.treatments
    ADD CONSTRAINT treatments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ========================================
-- Indexes (auto-generated from current schema)
-- ========================================

-- ========================================
-- Policy
-- ========================================

CREATE POLICY "Admins can delete contact lens encargos" ON public.contact_lens_encargos FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can insert contact lens encargos" ON public.contact_lens_encargos FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can update contact lens encargos" ON public.contact_lens_encargos FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Users can create encargos in their branch" ON public.contact_lens_encargos FOR INSERT WITH CHECK (((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid())))));

CREATE POLICY "Users can delete encargos in their branch" ON public.contact_lens_encargos FOR DELETE USING (((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid())))));

CREATE POLICY "Users can update encargos in their branch" ON public.contact_lens_encargos FOR UPDATE USING (((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) AND (branch_id IN ( SELECT admin_branch_access.branch_id
   FROM public.admin_branch_access
  WHERE (admin_branch_access.admin_user_id = auth.uid())))));

CREATE POLICY "Users can view contact lens encargos for their branches" ON public.contact_lens_encargos FOR SELECT USING ((organization_id IN ( SELECT au.organization_id
   FROM public.admin_users au
  WHERE (au.id = auth.uid()))));

CREATE POLICY "Users can view encargos in their organization" ON public.contact_lens_encargos FOR SELECT USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))));

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

CREATE POLICY "Admins can manage their organization's contact lens families" ON public.contact_lens_families USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Users can view their organization's contact lens families" ON public.contact_lens_families FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Admins can delete contact lens inventory" ON public.contact_lens_inventory FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can insert contact lens inventory" ON public.contact_lens_inventory FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can update contact lens inventory" ON public.contact_lens_inventory FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Users can view contact lens inventory for their branches" ON public.contact_lens_inventory FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = contact_lens_inventory.branch_id)))));

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

CREATE POLICY "Admins can manage their organization's contact lens price matri" ON public.contact_lens_price_matrices USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Users can view their organization's contact lens price matrices" ON public.contact_lens_price_matrices FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Admins can manage lens_catalog_products" ON public.lens_catalog_products USING ((catalog_id IN ( SELECT lens_supplier_catalogs.id
   FROM public.lens_supplier_catalogs
  WHERE (lens_supplier_catalogs.supplier_id IN ( SELECT lens_suppliers.id
           FROM public.lens_suppliers
          WHERE (lens_suppliers.organization_id IN ( SELECT admin_users.organization_id
                   FROM public.admin_users
                  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))))))) WITH CHECK ((catalog_id IN ( SELECT lens_supplier_catalogs.id
   FROM public.lens_supplier_catalogs
  WHERE (lens_supplier_catalogs.supplier_id IN ( SELECT lens_suppliers.id
           FROM public.lens_suppliers
          WHERE (lens_suppliers.organization_id IN ( SELECT admin_users.organization_id
                   FROM public.admin_users
                  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))))))));

CREATE POLICY "Admins can view lens_catalog_products" ON public.lens_catalog_products FOR SELECT USING ((catalog_id IN ( SELECT lens_supplier_catalogs.id
   FROM public.lens_supplier_catalogs
  WHERE (lens_supplier_catalogs.supplier_id IN ( SELECT lens_suppliers.id
           FROM public.lens_suppliers
          WHERE (lens_suppliers.organization_id IN ( SELECT admin_users.organization_id
                   FROM public.admin_users
                  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))))))));

CREATE POLICY "Super admin can view all lens_catalog_products" ON public.lens_catalog_products FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can view lens_designs" ON public.lens_designs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))));

CREATE POLICY "Root and dev manage lens_designs" ON public.lens_designs TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));

CREATE POLICY "Admins can delete lens families" ON public.lens_families FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can manage their organization's lens families" ON public.lens_families USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Users can view their organization's lens families" ON public.lens_families FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Admins can view lens_indexes" ON public.lens_indexes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'root'::text, 'dev'::text]))))));

CREATE POLICY "Super admins can delete lens_indexes" ON public.lens_indexes FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['super_admin'::text, 'root'::text, 'dev'::text]))))));

CREATE POLICY "Super admins can insert lens_indexes" ON public.lens_indexes FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['super_admin'::text, 'root'::text, 'dev'::text]))))));

CREATE POLICY "Super admins can update lens_indexes" ON public.lens_indexes FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['super_admin'::text, 'root'::text, 'dev'::text]))))));

CREATE POLICY "Admins can view lens_materials" ON public.lens_materials FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))));

CREATE POLICY "Root and dev manage lens_materials" ON public.lens_materials TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text]))))));

CREATE POLICY "Admins can delete lens_mountings" ON public.lens_mountings FOR DELETE USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can insert lens_mountings" ON public.lens_mountings FOR INSERT WITH CHECK ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can update lens_mountings" ON public.lens_mountings FOR UPDATE USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))) WITH CHECK ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can view lens_mountings" ON public.lens_mountings FOR SELECT USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Super admin can view all lens_mountings" ON public.lens_mountings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can delete lens price matrices" ON public.lens_price_matrices FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can manage lens price matrices" ON public.lens_price_matrices USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

CREATE POLICY "Admins can manage their organization's lens price matrices" ON public.lens_price_matrices USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid()))) WITH CHECK (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Users can view their organization's lens price matrices" ON public.lens_price_matrices FOR SELECT USING (((organization_id = public.get_user_organization_id()) OR public.is_root_user(auth.uid())));

CREATE POLICY "Admins can manage lens_product_pricing" ON public.lens_product_pricing USING ((lens_product_id IN ( SELECT lens_products.id
   FROM public.lens_products
  WHERE (lens_products.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))))) WITH CHECK ((lens_product_id IN ( SELECT lens_products.id
   FROM public.lens_products
  WHERE (lens_products.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))))));

CREATE POLICY "Admins can view lens_product_pricing" ON public.lens_product_pricing FOR SELECT USING ((lens_product_id IN ( SELECT lens_products.id
   FROM public.lens_products
  WHERE (lens_products.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))))));

CREATE POLICY "Super admin can view all lens_product_pricing" ON public.lens_product_pricing FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can delete lens_products" ON public.lens_products FOR DELETE USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can insert lens_products" ON public.lens_products FOR INSERT WITH CHECK ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can update lens_products" ON public.lens_products FOR UPDATE USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))) WITH CHECK ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can view lens_products" ON public.lens_products FOR SELECT USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Super admin can view all lens_products" ON public.lens_products FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can delete lens_supplier_catalogs" ON public.lens_supplier_catalogs FOR DELETE USING ((supplier_id IN ( SELECT lens_suppliers.id
   FROM public.lens_suppliers
  WHERE (lens_suppliers.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))))));

CREATE POLICY "Admins can insert lens_supplier_catalogs" ON public.lens_supplier_catalogs FOR INSERT WITH CHECK ((supplier_id IN ( SELECT lens_suppliers.id
   FROM public.lens_suppliers
  WHERE (lens_suppliers.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))))));

CREATE POLICY "Admins can update lens_supplier_catalogs" ON public.lens_supplier_catalogs FOR UPDATE USING ((supplier_id IN ( SELECT lens_suppliers.id
   FROM public.lens_suppliers
  WHERE (lens_suppliers.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))))) WITH CHECK ((supplier_id IN ( SELECT lens_suppliers.id
   FROM public.lens_suppliers
  WHERE (lens_suppliers.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))))));

CREATE POLICY "Admins can view lens_supplier_catalogs" ON public.lens_supplier_catalogs FOR SELECT USING ((supplier_id IN ( SELECT lens_suppliers.id
   FROM public.lens_suppliers
  WHERE (lens_suppliers.organization_id IN ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))))));

CREATE POLICY "Super admin can view all lens_supplier_catalogs" ON public.lens_supplier_catalogs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can delete lens_supplier_services" ON public.lens_supplier_services FOR DELETE USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))));

CREATE POLICY "Admins can insert lens_supplier_services" ON public.lens_supplier_services FOR INSERT WITH CHECK ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))));

CREATE POLICY "Admins can update lens_supplier_services" ON public.lens_supplier_services FOR UPDATE USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))));

CREATE POLICY "Admins can view lens_supplier_services" ON public.lens_supplier_services FOR SELECT USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))));

CREATE POLICY "Super admin can view all lens_supplier_services" ON public.lens_supplier_services FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['super_admin'::text, 'root'::text, 'dev'::text]))))));

CREATE POLICY "Admins can delete lens_suppliers" ON public.lens_suppliers FOR DELETE USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can insert lens_suppliers" ON public.lens_suppliers FOR INSERT WITH CHECK ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can update lens_suppliers" ON public.lens_suppliers FOR UPDATE USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true))))) WITH CHECK ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Admins can view lens_suppliers" ON public.lens_suppliers FOR SELECT USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));

CREATE POLICY "Super admin can view all lens_suppliers" ON public.lens_suppliers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.role = ANY (ARRAY['root'::text, 'dev'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can manage treatments" ON public.treatments USING ((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))));

CREATE POLICY "Treatments visible to org admins" ON public.treatments FOR SELECT USING (((organization_id IN ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid()))) OR (organization_id = '00000000-0000-0000-0000-000000000001'::uuid)));

-- ========================================
-- Rls Enable
-- ========================================

ALTER TABLE public.contact_lens_encargos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contact_lens_families ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contact_lens_inventory ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contact_lens_price_matrices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_catalog_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_designs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_families ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_indexes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_materials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_mountings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_price_matrices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_product_pricing ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_supplier_catalogs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_supplier_services ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lens_suppliers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Index
-- ========================================

CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_customer ON public.contact_lens_encargos USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_family ON public.contact_lens_encargos USING btree (contact_lens_family_id);

CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_org_branch ON public.contact_lens_encargos USING btree (organization_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_status ON public.contact_lens_encargos USING btree (status);

CREATE INDEX IF NOT EXISTS idx_contact_lens_families_active ON public.contact_lens_families USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_contact_lens_families_category_id ON public.contact_lens_families USING btree (category_id);

CREATE INDEX IF NOT EXISTS idx_contact_lens_families_modality ON public.contact_lens_families USING btree (modality);

CREATE INDEX IF NOT EXISTS idx_contact_lens_families_org ON public.contact_lens_families USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_contact_lens_families_use_type ON public.contact_lens_families USING btree (use_type);

CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_active ON public.contact_lens_inventory USING btree (is_active) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_branch ON public.contact_lens_inventory USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_family ON public.contact_lens_inventory USING btree (contact_lens_family_id);

CREATE INDEX IF NOT EXISTS idx_contact_lens_inventory_lookup ON public.contact_lens_inventory USING btree (contact_lens_family_id, branch_id, sphere_min, sphere_max) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_active ON public.contact_lens_price_matrices USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_addition_range ON public.contact_lens_price_matrices USING gist (numrange((addition_min)::numeric, (addition_max)::numeric, '[]'::text));

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_cylinder_range ON public.contact_lens_price_matrices USING gist (numrange((cylinder_min)::numeric, (cylinder_max)::numeric, '[]'::text));

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_family ON public.contact_lens_price_matrices USING btree (contact_lens_family_id);

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_org ON public.contact_lens_price_matrices USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_contact_lens_matrices_sphere_range ON public.contact_lens_price_matrices USING gist (numrange((sphere_min)::numeric, (sphere_max)::numeric, '[]'::text));

CREATE INDEX IF NOT EXISTS idx_lens_catalog_products_catalog ON public.lens_catalog_products USING btree (catalog_id);

CREATE INDEX IF NOT EXISTS idx_lens_catalog_products_status ON public.lens_catalog_products USING btree (import_status);

CREATE INDEX IF NOT EXISTS idx_lens_families_active ON public.lens_families USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_lens_families_category_id ON public.lens_families USING btree (category_id);

CREATE INDEX IF NOT EXISTS idx_lens_families_organization_id ON public.lens_families USING btree (organization_id) WHERE (organization_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lens_families_stock_available ON public.lens_families USING btree (is_stock_available) WHERE (is_stock_available = true);

CREATE INDEX IF NOT EXISTS idx_lens_families_type_material ON public.lens_families USING btree (lens_type, lens_material);

CREATE INDEX IF NOT EXISTS idx_lens_indexes_active ON public.lens_indexes USING btree (is_active) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_lens_indexes_sort ON public.lens_indexes USING btree (sort_order);

CREATE INDEX IF NOT EXISTS idx_lens_materials_index ON public.lens_materials USING btree (index_id);

CREATE INDEX IF NOT EXISTS idx_lens_mountings_org ON public.lens_mountings USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_lens_mountings_supplier ON public.lens_mountings USING btree (supplier_id);

CREATE INDEX IF NOT EXISTS idx_lens_matrices_active ON public.lens_price_matrices USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_lens_matrices_addition_range ON public.lens_price_matrices USING gist (numrange((addition_min)::numeric, (addition_max)::numeric, '[]'::text));

CREATE INDEX IF NOT EXISTS idx_lens_matrices_cylinder_range ON public.lens_price_matrices USING gist (numrange((cylinder_min)::numeric, (cylinder_max)::numeric, '[]'::text));

CREATE INDEX IF NOT EXISTS idx_lens_matrices_family ON public.lens_price_matrices USING btree (lens_family_id);

CREATE INDEX IF NOT EXISTS idx_lens_matrices_sphere_range ON public.lens_price_matrices USING gist (numrange((sphere_min)::numeric, (sphere_max)::numeric, '[]'::text));

CREATE INDEX IF NOT EXISTS idx_lens_pricing_addition ON public.lens_product_pricing USING gist (numrange((addition_min)::numeric, (addition_max)::numeric, '[]'::text));

CREATE INDEX IF NOT EXISTS idx_lens_pricing_cylinder ON public.lens_product_pricing USING gist (numrange((cylinder_min)::numeric, (cylinder_max)::numeric, '[]'::text));

CREATE INDEX IF NOT EXISTS idx_lens_pricing_product ON public.lens_product_pricing USING btree (lens_product_id);

CREATE INDEX IF NOT EXISTS idx_lens_pricing_sphere ON public.lens_product_pricing USING gist (numrange((sphere_min)::numeric, (sphere_max)::numeric, '[]'::text));

CREATE INDEX IF NOT EXISTS idx_lens_products_active ON public.lens_products USING btree (is_active) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_lens_products_design_id ON public.lens_products USING btree (design_id);

CREATE INDEX IF NOT EXISTS idx_lens_products_index ON public.lens_products USING btree (index_id);

CREATE INDEX IF NOT EXISTS idx_lens_products_material_id ON public.lens_products USING btree (material_id);

CREATE INDEX IF NOT EXISTS idx_lens_products_org ON public.lens_products USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_lens_products_sku ON public.lens_products USING btree (sku_code);

CREATE INDEX IF NOT EXISTS idx_lens_products_stock ON public.lens_products USING btree (is_stock_available) WHERE (is_stock_available = true);

CREATE INDEX IF NOT EXISTS idx_lens_products_supplier ON public.lens_products USING btree (supplier_id);

CREATE INDEX IF NOT EXISTS idx_lens_products_type_material ON public.lens_products USING btree (lens_type, lens_material);

CREATE INDEX IF NOT EXISTS idx_lens_catalogs_status ON public.lens_supplier_catalogs USING btree (parse_status);

CREATE INDEX IF NOT EXISTS idx_lens_catalogs_supplier ON public.lens_supplier_catalogs USING btree (supplier_id);

CREATE INDEX IF NOT EXISTS idx_lens_supplier_services_active ON public.lens_supplier_services USING btree (is_active) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_lens_supplier_services_category ON public.lens_supplier_services USING btree (service_category);

CREATE INDEX IF NOT EXISTS idx_lens_supplier_services_org ON public.lens_supplier_services USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_lens_supplier_services_supplier ON public.lens_supplier_services USING btree (supplier_id);

CREATE INDEX IF NOT EXISTS idx_lens_suppliers_active ON public.lens_suppliers USING btree (is_active) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_lens_suppliers_org ON public.lens_suppliers USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_treatments_active ON public.treatments USING btree (organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_treatments_category ON public.treatments USING btree (organization_id, category);

CREATE INDEX IF NOT EXISTS idx_treatments_key ON public.treatments USING btree (treatment_key);

CREATE INDEX IF NOT EXISTS idx_treatments_org ON public.treatments USING btree (organization_id);

-- ========================================
-- Comment
-- ========================================

-- ========================================
-- Functions
-- ========================================

COMMENT ON TABLE public.contact_lens_families IS 'Familias de lentes de contacto con características genéticas';

COMMENT ON COLUMN public.contact_lens_families.use_type IS 'Frecuencia de reemplazo: diario, quincenal, mensual, uso prolongado';

COMMENT ON COLUMN public.contact_lens_families.modality IS 'Tipo de corrección: esférico, tórico (astigmatismo), multifocal (presbicia), cosmético';

COMMENT ON COLUMN public.contact_lens_families.packaging IS 'Formato de venta: caja de 30, 6, 3 lentes, o botella';

COMMENT ON TABLE public.contact_lens_inventory IS 'Inventario de lentes de contacto por graduación específica';

COMMENT ON COLUMN public.contact_lens_inventory.sphere_min IS 'Esfera mínima del rango (ej: -6.00)';

COMMENT ON COLUMN public.contact_lens_inventory.sphere_max IS 'Esfera máxima del rango (ej: -0.50)';

COMMENT ON COLUMN public.contact_lens_inventory.quantity IS 'Cantidad de cajas en stock';

COMMENT ON COLUMN public.contact_lens_inventory.min_stock_threshold IS 'Umbral para alertar stock bajo';

COMMENT ON TABLE public.contact_lens_price_matrices IS 'Matrices de precios para lentes de contacto por rangos de parámetros';

COMMENT ON COLUMN public.contact_lens_price_matrices.base_price IS 'Precio de venta por caja (no por lente individual)';

COMMENT ON COLUMN public.contact_lens_price_matrices.cost IS 'Costo de compra por caja';

COMMENT ON COLUMN public.contact_lens_price_matrices.name IS 'Etiqueta legible para la matriz.';

COMMENT ON TABLE public.lens_families IS 'Familias de lentes ópticos definidas por tipo y material';

COMMENT ON COLUMN public.lens_families.lens_type IS 'Tipo de lente: single_vision, bifocal, trifocal, progressive, reading, computer, sports';

COMMENT ON COLUMN public.lens_families.lens_material IS 'Material del lente: cr39, polycarbonate, high_index_1_67, high_index_1_74, trivex, glass';

COMMENT ON COLUMN public.lens_families.organization_id IS 'Organization that owns this lens family.';

COMMENT ON COLUMN public.lens_families.is_stock_available IS 'Indica si hay stock disponible para esta familia de lentes';

COMMENT ON COLUMN public.lens_families.stock_sphere_min IS 'Esfera mínima disponible en stock';

COMMENT ON COLUMN public.lens_families.stock_sphere_max IS 'Esfera máxima disponible en stock';

COMMENT ON COLUMN public.lens_families.stock_cylinder_min IS 'Cilindro mínimo disponible en stock';

COMMENT ON COLUMN public.lens_families.stock_cylinder_max IS 'Cilindro máximo disponible en stock';

COMMENT ON COLUMN public.lens_families.base_treatments IS 'Tratamientos incluidos en el precio base del lente';

COMMENT ON COLUMN public.lens_families.treatments_available IS 'Tratamientos adicionales disponibles para agregar (solo aplica a tallado)';

COMMENT ON TABLE public.lens_price_matrices IS 'Matrices de precios para familias de lentes según rangos de esfera y cilindro';

COMMENT ON COLUMN public.lens_price_matrices.sourcing_type IS 'Tipo de sourcing: stock (en inventario) o surfaced (surfaced a pedido)';

COMMENT ON COLUMN public.lens_price_matrices.name IS 'Etiqueta legible: Rango base, Alta miopía, Fallback, etc.';

COMMENT ON COLUMN public.lens_products.sales_unit IS 'Unidad de venta: per_eye (precio por ojo) o per_pair (precio por par)';

COMMENT ON COLUMN public.lens_products.is_tax_included IS 'Indica si el precio del producto ya incluye IVA (impuesto)';

COMMENT ON COLUMN public.treatments.treatment_type IS 'Tipo de treatment: coating (aplicado en lab), included (viene con el cristal)';

COMMIT;
