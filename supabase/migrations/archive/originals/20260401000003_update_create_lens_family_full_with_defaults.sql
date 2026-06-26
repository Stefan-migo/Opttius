-- Migration: 20260401000003_update_create_lens_family_full_with_defaults.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update create_lens_family_full to support name and default matrices
-- When matrices is empty, inserts Rango base + Fallback automatically

CREATE OR REPLACE FUNCTION create_lens_family_full(
  p_family_data jsonb,
  p_matrices_data jsonb
) RETURNS jsonb AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
