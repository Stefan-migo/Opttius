-- Migration: 20250127000000_create_product_option_fields.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create product option fields system
-- This allows users to customize dropdown options in product forms

-- Create table for customizable product option fields
CREATE TABLE IF NOT EXISTS public.product_option_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key TEXT NOT NULL UNIQUE, -- e.g., 'product_type', 'frame_type', 'lens_material'
  field_label TEXT NOT NULL, -- Display name, e.g., 'Tipo de Producto', 'Tipo de Armazón'
  field_category TEXT NOT NULL, -- 'general', 'frame', 'lens', 'accessory'
  is_array BOOLEAN DEFAULT FALSE, -- Whether this field accepts multiple values (like frame_features)
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for option values
CREATE TABLE IF NOT EXISTS public.product_option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES public.product_option_fields(id) ON DELETE CASCADE,
  value TEXT NOT NULL, -- The actual value stored in DB (e.g., 'frame', 'acetate')
  label TEXT NOT NULL, -- Display label (e.g., 'Armazón', 'Acetato')
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE, -- Mark default option
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata (icon, color, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(field_id, value)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_option_fields_key ON public.product_option_fields(field_key);
CREATE INDEX IF NOT EXISTS idx_product_option_fields_category ON public.product_option_fields(field_category);
CREATE INDEX IF NOT EXISTS idx_product_option_values_field_id ON public.product_option_values(field_id);
CREATE INDEX IF NOT EXISTS idx_product_option_values_active ON public.product_option_values(field_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.product_option_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_option_fields
CREATE POLICY "Admins can view all product option fields"
  ON public.product_option_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can insert product option fields"
  ON public.product_option_fields FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update product option fields"
  ON public.product_option_fields FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can delete product option fields"
  ON public.product_option_fields FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

-- RLS Policies for product_option_values
CREATE POLICY "Admins can view all product option values"
  ON public.product_option_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can insert product option values"
  ON public.product_option_values FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update product option values"
  ON public.product_option_values FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can delete product option values"
  ON public.product_option_values FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_option_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_product_option_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_product_option_fields_updated_at
  BEFORE UPDATE ON public.product_option_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_product_option_fields_updated_at();

CREATE TRIGGER update_product_option_values_updated_at
  BEFORE UPDATE ON public.product_option_values
  FOR EACH ROW
  EXECUTE FUNCTION update_product_option_values_updated_at();

-- Insert default option fields
INSERT INTO public.product_option_fields (field_key, field_label, field_category, is_array, display_order) VALUES
  ('product_type', 'Tipo de Producto', 'general', false, 1),
  ('optical_category', 'Categoría Óptica', 'general', false, 2),
  ('frame_type', 'Tipo de Armazón', 'frame', false, 10),
  ('frame_material', 'Material del Armazón', 'frame', false, 11),
  ('frame_shape', 'Forma del Armazón', 'frame', false, 12),
  ('frame_gender', 'Género', 'frame', false, 13),
  ('frame_size', 'Tamaño', 'frame', false, 14),
  ('frame_features', 'Características del Armazón', 'frame', true, 15),
  ('lens_type', 'Tipo de Lente', 'lens', false, 20),
  ('lens_material', 'Material del Lente', 'lens', false, 21),
  ('uv_protection', 'Protección UV', 'lens', false, 22),
  ('lens_coatings', 'Tratamientos y Recubrimientos', 'lens', true, 23)
ON CONFLICT (field_key) DO NOTHING;

-- Insert default option values for product_type
INSERT INTO public.product_option_values (field_id, value, label, display_order, is_default) 
SELECT id, 'frame', 'Armazón', 1, true FROM public.product_option_fields WHERE field_key = 'product_type'
UNION ALL
SELECT id, 'lens', 'Lente', 2, false FROM public.product_option_fields WHERE field_key = 'product_type'
UNION ALL
SELECT id, 'accessory', 'Accesorio', 3, false FROM public.product_option_fields WHERE field_key = 'product_type'
UNION ALL
SELECT id, 'service', 'Servicio', 4, false FROM public.product_option_fields WHERE field_key = 'product_type'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default option values for optical_category
INSERT INTO public.product_option_values (field_id, value, label, display_order) 
SELECT id, 'sunglasses', 'Lentes de Sol', 1 FROM public.product_option_fields WHERE field_key = 'optical_category'
UNION ALL
SELECT id, 'prescription_glasses', 'Lentes con Receta', 2 FROM public.product_option_fields WHERE field_key = 'optical_category'
UNION ALL
SELECT id, 'reading_glasses', 'Lentes de Lectura', 3 FROM public.product_option_fields WHERE field_key = 'optical_category'
UNION ALL
SELECT id, 'safety_glasses', 'Lentes de Seguridad', 4 FROM public.product_option_fields WHERE field_key = 'optical_category'
UNION ALL
SELECT id, 'contact_lenses', 'Lentes de Contacto', 5 FROM public.product_option_fields WHERE field_key = 'optical_category'
UNION ALL
SELECT id, 'accessories', 'Accesorios', 6 FROM public.product_option_fields WHERE field_key = 'optical_category'
UNION ALL
SELECT id, 'services', 'Servicios', 7 FROM public.product_option_fields WHERE field_key = 'optical_category'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default option values for frame_type
INSERT INTO public.product_option_values (field_id, value, label, display_order) 
SELECT id, 'full_frame', 'Marco Completo', 1 FROM public.product_option_fields WHERE field_key = 'frame_type'
UNION ALL
SELECT id, 'half_frame', 'Media Montura', 2 FROM public.product_option_fields WHERE field_key = 'frame_type'
UNION ALL
SELECT id, 'rimless', 'Sin Marco', 3 FROM public.product_option_fields WHERE field_key = 'frame_type'
UNION ALL
SELECT id, 'semi_rimless', 'Semi Sin Marco', 4 FROM public.product_option_fields WHERE field_key = 'frame_type'
UNION ALL
SELECT id, 'browline', 'Browline', 5 FROM public.product_option_fields WHERE field_key = 'frame_type'
UNION ALL
SELECT id, 'cat_eye', 'Ojo de Gato', 6 FROM public.product_option_fields WHERE field_key = 'frame_type'
UNION ALL
SELECT id, 'aviator', 'Aviador', 7 FROM public.product_option_fields WHERE field_key = 'frame_type'
UNION ALL
SELECT id, 'round', 'Redondo', 8 FROM public.product_option_fields WHERE field_key = 'frame_type'
UNION ALL
SELECT id, 'square', 'Cuadrado', 9 FROM public.product_option_fields WHERE field_key = 'frame_type'
UNION ALL
SELECT id, 'rectangular', 'Rectangular', 10 FROM public.product_option_fields WHERE field_key = 'frame_type'
UNION ALL
SELECT id, 'oval', 'Oval', 11 FROM public.product_option_fields WHERE field_key = 'frame_type'
UNION ALL
SELECT id, 'geometric', 'Geométrico', 12 FROM public.product_option_fields WHERE field_key = 'frame_type'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default option values for frame_material
INSERT INTO public.product_option_values (field_id, value, label, display_order) 
SELECT id, 'acetate', 'Acetato', 1 FROM public.product_option_fields WHERE field_key = 'frame_material'
UNION ALL
SELECT id, 'metal', 'Metal', 2 FROM public.product_option_fields WHERE field_key = 'frame_material'
UNION ALL
SELECT id, 'titanium', 'Titanio', 3 FROM public.product_option_fields WHERE field_key = 'frame_material'
UNION ALL
SELECT id, 'stainless_steel', 'Acero Inoxidable', 4 FROM public.product_option_fields WHERE field_key = 'frame_material'
UNION ALL
SELECT id, 'aluminum', 'Aluminio', 5 FROM public.product_option_fields WHERE field_key = 'frame_material'
UNION ALL
SELECT id, 'carbon_fiber', 'Fibra de Carbono', 6 FROM public.product_option_fields WHERE field_key = 'frame_material'
UNION ALL
SELECT id, 'wood', 'Madera', 7 FROM public.product_option_fields WHERE field_key = 'frame_material'
UNION ALL
SELECT id, 'horn', 'Cuerno', 8 FROM public.product_option_fields WHERE field_key = 'frame_material'
UNION ALL
SELECT id, 'plastic', 'Plástico', 9 FROM public.product_option_fields WHERE field_key = 'frame_material'
UNION ALL
SELECT id, 'tr90', 'TR90', 10 FROM public.product_option_fields WHERE field_key = 'frame_material'
UNION ALL
SELECT id, 'monel', 'Monel', 11 FROM public.product_option_fields WHERE field_key = 'frame_material'
UNION ALL
SELECT id, 'beta_titanium', 'Beta Titanio', 12 FROM public.product_option_fields WHERE field_key = 'frame_material'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default option values for frame_shape
INSERT INTO public.product_option_values (field_id, value, label, display_order) 
SELECT id, 'round', 'Redondo', 1 FROM public.product_option_fields WHERE field_key = 'frame_shape'
UNION ALL
SELECT id, 'square', 'Cuadrado', 2 FROM public.product_option_fields WHERE field_key = 'frame_shape'
UNION ALL
SELECT id, 'rectangular', 'Rectangular', 3 FROM public.product_option_fields WHERE field_key = 'frame_shape'
UNION ALL
SELECT id, 'oval', 'Oval', 4 FROM public.product_option_fields WHERE field_key = 'frame_shape'
UNION ALL
SELECT id, 'cat_eye', 'Ojo de Gato', 5 FROM public.product_option_fields WHERE field_key = 'frame_shape'
UNION ALL
SELECT id, 'aviator', 'Aviador', 6 FROM public.product_option_fields WHERE field_key = 'frame_shape'
UNION ALL
SELECT id, 'browline', 'Browline', 7 FROM public.product_option_fields WHERE field_key = 'frame_shape'
UNION ALL
SELECT id, 'geometric', 'Geométrico', 8 FROM public.product_option_fields WHERE field_key = 'frame_shape'
UNION ALL
SELECT id, 'shield', 'Escudo', 9 FROM public.product_option_fields WHERE field_key = 'frame_shape'
UNION ALL
SELECT id, 'wrap', 'Wrap', 10 FROM public.product_option_fields WHERE field_key = 'frame_shape'
UNION ALL
SELECT id, 'sport', 'Deportivo', 11 FROM public.product_option_fields WHERE field_key = 'frame_shape'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default option values for frame_gender
INSERT INTO public.product_option_values (field_id, value, label, display_order) 
SELECT id, 'mens', 'Hombre', 1 FROM public.product_option_fields WHERE field_key = 'frame_gender'
UNION ALL
SELECT id, 'womens', 'Mujer', 2 FROM public.product_option_fields WHERE field_key = 'frame_gender'
UNION ALL
SELECT id, 'unisex', 'Unisex', 3 FROM public.product_option_fields WHERE field_key = 'frame_gender'
UNION ALL
SELECT id, 'kids', 'Niños', 4 FROM public.product_option_fields WHERE field_key = 'frame_gender'
UNION ALL
SELECT id, 'youth', 'Juvenil', 5 FROM public.product_option_fields WHERE field_key = 'frame_gender'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default option values for frame_size
INSERT INTO public.product_option_values (field_id, value, label, display_order) 
SELECT id, 'narrow', 'Estrecho', 1 FROM public.product_option_fields WHERE field_key = 'frame_size'
UNION ALL
SELECT id, 'medium', 'Mediano', 2 FROM public.product_option_fields WHERE field_key = 'frame_size'
UNION ALL
SELECT id, 'wide', 'Ancho', 3 FROM public.product_option_fields WHERE field_key = 'frame_size'
UNION ALL
SELECT id, 'extra_wide', 'Extra Ancho', 4 FROM public.product_option_fields WHERE field_key = 'frame_size'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default option values for frame_features
INSERT INTO public.product_option_values (field_id, value, label, display_order) 
SELECT id, 'spring_hinges', 'Bisagras con Resorte', 1 FROM public.product_option_fields WHERE field_key = 'frame_features'
UNION ALL
SELECT id, 'adjustable_nose_pads', 'Puente Ajustable', 2 FROM public.product_option_fields WHERE field_key = 'frame_features'
UNION ALL
SELECT id, 'flexible_temples', 'Varillas Flexibles', 3 FROM public.product_option_fields WHERE field_key = 'frame_features'
UNION ALL
SELECT id, 'lightweight', 'Liviano', 4 FROM public.product_option_fields WHERE field_key = 'frame_features'
UNION ALL
SELECT id, 'durable', 'Resistente', 5 FROM public.product_option_fields WHERE field_key = 'frame_features'
UNION ALL
SELECT id, 'sports_ready', 'Para Deportes', 6 FROM public.product_option_fields WHERE field_key = 'frame_features'
UNION ALL
SELECT id, 'memory_metal', 'Metal con Memoria', 7 FROM public.product_option_fields WHERE field_key = 'frame_features'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default option values for lens_type
INSERT INTO public.product_option_values (field_id, value, label, display_order) 
SELECT id, 'single_vision', 'Monofocal', 1 FROM public.product_option_fields WHERE field_key = 'lens_type'
UNION ALL
SELECT id, 'bifocal', 'Bifocal', 2 FROM public.product_option_fields WHERE field_key = 'lens_type'
UNION ALL
SELECT id, 'trifocal', 'Trifocal', 3 FROM public.product_option_fields WHERE field_key = 'lens_type'
UNION ALL
SELECT id, 'progressive', 'Progresivo', 4 FROM public.product_option_fields WHERE field_key = 'lens_type'
UNION ALL
SELECT id, 'reading', 'Lectura', 5 FROM public.product_option_fields WHERE field_key = 'lens_type'
UNION ALL
SELECT id, 'computer', 'Computadora', 6 FROM public.product_option_fields WHERE field_key = 'lens_type'
UNION ALL
SELECT id, 'driving', 'Conducción', 7 FROM public.product_option_fields WHERE field_key = 'lens_type'
UNION ALL
SELECT id, 'sports', 'Deportivo', 8 FROM public.product_option_fields WHERE field_key = 'lens_type'
UNION ALL
SELECT id, 'photochromic', 'Fotocromático', 9 FROM public.product_option_fields WHERE field_key = 'lens_type'
UNION ALL
SELECT id, 'polarized', 'Polarizado', 10 FROM public.product_option_fields WHERE field_key = 'lens_type'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default option values for lens_material
INSERT INTO public.product_option_values (field_id, value, label, display_order) 
SELECT id, 'cr39', 'CR-39', 1 FROM public.product_option_fields WHERE field_key = 'lens_material'
UNION ALL
SELECT id, 'polycarbonate', 'Policarbonato', 2 FROM public.product_option_fields WHERE field_key = 'lens_material'
UNION ALL
SELECT id, 'high_index_1_67', 'Alto Índice 1.67', 3 FROM public.product_option_fields WHERE field_key = 'lens_material'
UNION ALL
SELECT id, 'high_index_1_74', 'Alto Índice 1.74', 4 FROM public.product_option_fields WHERE field_key = 'lens_material'
UNION ALL
SELECT id, 'trivex', 'Trivex', 5 FROM public.product_option_fields WHERE field_key = 'lens_material'
UNION ALL
SELECT id, 'glass', 'Vidrio', 6 FROM public.product_option_fields WHERE field_key = 'lens_material'
UNION ALL
SELECT id, 'photochromic', 'Fotocromático', 7 FROM public.product_option_fields WHERE field_key = 'lens_material'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default option values for uv_protection
INSERT INTO public.product_option_values (field_id, value, label, display_order) 
SELECT id, 'none', 'Ninguno', 1 FROM public.product_option_fields WHERE field_key = 'uv_protection'
UNION ALL
SELECT id, 'uv400', 'UV400', 2 FROM public.product_option_fields WHERE field_key = 'uv_protection'
UNION ALL
SELECT id, 'uv380', 'UV380', 3 FROM public.product_option_fields WHERE field_key = 'uv_protection'
UNION ALL
SELECT id, 'uv350', 'UV350', 4 FROM public.product_option_fields WHERE field_key = 'uv_protection'
ON CONFLICT (field_id, value) DO NOTHING;

-- Insert default option values for lens_coatings
INSERT INTO public.product_option_values (field_id, value, label, display_order) 
SELECT id, 'anti_reflective', 'Antirreflejante', 1 FROM public.product_option_fields WHERE field_key = 'lens_coatings'
UNION ALL
SELECT id, 'blue_light_filter', 'Filtro de Luz Azul', 2 FROM public.product_option_fields WHERE field_key = 'lens_coatings'
UNION ALL
SELECT id, 'uv_protection', 'Protección UV', 3 FROM public.product_option_fields WHERE field_key = 'lens_coatings'
UNION ALL
SELECT id, 'scratch_resistant', 'Antirrayaduras', 4 FROM public.product_option_fields WHERE field_key = 'lens_coatings'
UNION ALL
SELECT id, 'anti_fog', 'Antivaho', 5 FROM public.product_option_fields WHERE field_key = 'lens_coatings'
UNION ALL
SELECT id, 'mirror', 'Espejado', 6 FROM public.product_option_fields WHERE field_key = 'lens_coatings'
UNION ALL
SELECT id, 'tint', 'Tinte', 7 FROM public.product_option_fields WHERE field_key = 'lens_coatings'
UNION ALL
SELECT id, 'polarized', 'Polarizado', 8 FROM public.product_option_fields WHERE field_key = 'lens_coatings'
ON CONFLICT (field_id, value) DO NOTHING;

