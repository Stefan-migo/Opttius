-- Migration: 20250122000000_convert_to_optical_shop.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Convert Products to Optical Shop Products
-- This migration transforms the generic product system into an optical shop product management system

-- Add optical product type
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'frame' CHECK (product_type IN ('frame', 'lens', 'accessory', 'service'));

-- Add optical product category
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS optical_category TEXT CHECK (optical_category IN ('sunglasses', 'prescription_glasses', 'reading_glasses', 'safety_glasses', 'contact_lenses', 'accessories', 'services'));

-- ===== FRAME SPECIFICATIONS =====
-- Frame Type
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_type TEXT CHECK (frame_type IN ('full_frame', 'half_frame', 'rimless', 'semi_rimless', 'browline', 'cat_eye', 'aviator', 'round', 'square', 'rectangular', 'oval', 'geometric'));

-- Frame Material
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_material TEXT CHECK (frame_material IN ('acetate', 'metal', 'titanium', 'stainless_steel', 'aluminum', 'carbon_fiber', 'wood', 'horn', 'plastic', 'tr90', 'monel', 'beta_titanium'));

-- Frame Measurements (in mm)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_measurements JSONB; -- {lens_width: 52, bridge_width: 18, temple_length: 140, lens_height: 40, total_width: 140}

-- Frame Shape
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_shape TEXT CHECK (frame_shape IN ('round', 'square', 'rectangular', 'oval', 'cat_eye', 'aviator', 'browline', 'geometric', 'shield', 'wrap', 'sport'));

-- Frame Color
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_color TEXT;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_colors TEXT[]; -- Multiple color options

-- Frame Brand/Manufacturer
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_brand TEXT;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_model TEXT;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_sku TEXT;

-- Frame Gender/Age
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_gender TEXT CHECK (frame_gender IN ('mens', 'womens', 'unisex', 'kids', 'youth'));
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_age_group TEXT CHECK (frame_age_group IN ('adult', 'youth', 'kids', 'senior'));

-- Frame Features
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_features TEXT[]; -- ['spring_hinges', 'adjustable_nose_pads', 'flexible_temples', 'lightweight', 'durable']

-- Frame Size
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_size TEXT CHECK (frame_size IN ('narrow', 'medium', 'wide', 'extra_wide'));

-- ===== LENS SPECIFICATIONS =====
-- Lens Type
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lens_type TEXT CHECK (lens_type IN ('single_vision', 'bifocal', 'trifocal', 'progressive', 'reading', 'computer', 'driving', 'sports', 'photochromic', 'polarized'));

-- Lens Material
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lens_material TEXT CHECK (lens_material IN ('cr39', 'polycarbonate', 'high_index_1_67', 'high_index_1_74', 'trivex', 'glass', 'photochromic'));

-- Lens Prescription Fields (for prescription lenses)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS prescription_available BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS prescription_range JSONB; -- {sph_min: -10, sph_max: +6, cyl_min: -4, cyl_max: +4, add_min: 0, add_max: 4}

-- Lens Coatings and Treatments
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lens_coatings TEXT[]; -- ['anti_reflective', 'blue_light_filter', 'uv_protection', 'scratch_resistant', 'anti_fog', 'mirror', 'tint']

-- Lens Index (refractive index)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lens_index DECIMAL(3,2); -- 1.50, 1.59, 1.67, 1.74, etc.

-- UV Protection Level
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS uv_protection TEXT CHECK (uv_protection IN ('none', 'uv400', 'uv380', 'uv350'));

-- Blue Light Filter
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS blue_light_filter BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS blue_light_filter_percentage INTEGER; -- 0-100%

-- Photochromic Properties
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS photochromic BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS photochromic_tint_levels JSONB; -- {clear: 0, dark: 3} or similar

-- Lens Tint Options
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lens_tint_options TEXT[]; -- ['clear', 'gray', 'brown', 'green', 'blue', 'yellow', 'rose', 'mirror']

-- ===== GENERAL OPTICAL PRODUCT FIELDS =====
-- Brand/Manufacturer (general)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS model_number TEXT;

-- Warranty Information
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS warranty_months INTEGER;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS warranty_details TEXT;

-- Compatibility
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS compatible_with TEXT[]; -- For accessories or lens compatibility

-- Prescription Required
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT FALSE;

-- Customizable
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_customizable BOOLEAN DEFAULT FALSE;

-- ===== REMOVE/DEPRECATE COSMETICS-SPECIFIC FIELDS =====
-- We'll keep these columns but they won't be used for optical products
-- skin_type, benefits, ingredients, certifications, usage_instructions, precautions, shelf_life_months

-- Add indexes for optical product queries
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_optical_category ON public.products(optical_category);
CREATE INDEX IF NOT EXISTS idx_products_frame_type ON public.products(frame_type);
CREATE INDEX IF NOT EXISTS idx_products_frame_material ON public.products(frame_material);
CREATE INDEX IF NOT EXISTS idx_products_frame_brand ON public.products(frame_brand);
CREATE INDEX IF NOT EXISTS idx_products_frame_gender ON public.products(frame_gender);
CREATE INDEX IF NOT EXISTS idx_products_lens_type ON public.products(lens_type);
CREATE INDEX IF NOT EXISTS idx_products_lens_material ON public.products(lens_material);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);

-- Create GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_products_frame_colors ON public.products USING gin(frame_colors);
CREATE INDEX IF NOT EXISTS idx_products_frame_features ON public.products USING gin(frame_features);
CREATE INDEX IF NOT EXISTS idx_products_lens_coatings ON public.products USING gin(lens_coatings);
CREATE INDEX IF NOT EXISTS idx_products_lens_tint_options ON public.products USING gin(lens_tint_options);

-- Create function to search optical products by measurements
CREATE OR REPLACE FUNCTION search_frames_by_measurements(
  min_lens_width INTEGER DEFAULT NULL,
  max_lens_width INTEGER DEFAULT NULL,
  min_bridge_width INTEGER DEFAULT NULL,
  max_bridge_width INTEGER DEFAULT NULL,
  min_temple_length INTEGER DEFAULT NULL,
  max_temple_length INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  frame_measurements JSONB
) AS $$
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
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON COLUMN public.products.product_type IS 'Type of optical product: frame, lens, accessory, or service';
COMMENT ON COLUMN public.products.frame_measurements IS 'Frame measurements in mm: {lens_width, bridge_width, temple_length, lens_height, total_width}';
COMMENT ON COLUMN public.products.prescription_range IS 'Prescription range supported: {sph_min, sph_max, cyl_min, cyl_max, add_min, add_max}';
COMMENT ON COLUMN public.products.lens_index IS 'Refractive index of lens material (1.50, 1.59, 1.67, 1.74, etc.)';

