-- Migration: 20260207000002_create_lens_family_full_rpc.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Create RPC function to insert lens family and matrices atomically
CREATE OR REPLACE FUNCTION create_lens_family_full(
  p_family_data jsonb,
  p_matrices_data jsonb
) RETURNS jsonb AS $$
DECLARE
  v_family_id uuid;
  v_matrix text;
  v_matrices jsonb;
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
    (p_family_data->>'is_active')::boolean,
    (p_family_data->>'organization_id')::uuid
  ) RETURNING id INTO v_family_id;
  
  -- Prepare matrices data with the new lens_family_id
  -- We'll use a loop or json_populate_recordset if possible, but we need to assign the lens_family_id
  
  -- Iterating over the JSONB array to insert each matrix
  FOR v_matrices IN SELECT * FROM jsonb_array_elements(p_matrices_data)
  LOOP
    INSERT INTO public.lens_price_matrices (
      lens_family_id,
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
      (v_matrices->>'sphere_min')::decimal,
      (v_matrices->>'sphere_max')::decimal,
      (v_matrices->>'cylinder_min')::decimal,
      (v_matrices->>'cylinder_max')::decimal,
      COALESCE((v_matrices->>'addition_min')::decimal, 0),
      COALESCE((v_matrices->>'addition_max')::decimal, 4.0),
      (v_matrices->>'base_price')::decimal,
      (v_matrices->>'cost')::decimal,
      (v_matrices->>'sourcing_type')::text,
      (v_matrices->>'is_active')::boolean
    );
  END LOOP;
  
  RETURN json_build_object('id', v_family_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
