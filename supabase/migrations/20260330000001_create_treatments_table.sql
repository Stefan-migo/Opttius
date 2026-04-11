-- ================================================================
-- Migration: 20260330000001_create_treatments_table.sql
-- Objetivo: Crear tabla treatments con treatment_type y reglas de exclusión
-- ================================================================

BEGIN;

-- ================================================================
-- 1. Crear tabla treatments
-- ================================================================
CREATE TABLE IF NOT EXISTS public.treatments (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Información básica
  name TEXT NOT NULL,
  treatment_key TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT CHECK (category IN ('coating', 'tint', 'protection', 'finish')),
  
  -- Tipo de tratamiento (CRÍTICO)
  treatment_type TEXT NOT NULL CHECK (
    treatment_type IN ('included', 'lab_applied', 'both')
  ) DEFAULT 'lab_applied',
  
  -- applied_in: dónde se aplica el tratamiento
  applied_in TEXT CHECK (
    applied_in IN ('factory', 'local_lab', 'both')
  ) DEFAULT 'local_lab',
  
  -- Compatibilidad con materiales de lente
  material_compatibility TEXT[] DEFAULT ARRAY['cr39', 'polycarbonate', 'high_index_1_67', 'high_index_1_74', 'trivex', 'glass'],
  
  -- Compatibilidad con tipos de lente
  lens_type_compatibility TEXT[] DEFAULT ARRAY['single_vision', 'bifocal', 'trifocal', 'progressive', 'reading', 'computer', 'sports'],
  
  -- Precio
  default_price DECIMAL(10,2) NOT NULL,
  price_override JSONB,
  
  -- Sistema de exclusiones
  exclusions JSONB DEFAULT '{"excludes": [], "requires": [], "incompatible_with_material": []}',
  
  -- Configuración adicional
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. Crear índices
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_treatments_org ON treatments(organization_id);
CREATE INDEX IF NOT EXISTS idx_treatments_key ON treatments(treatment_key);
CREATE INDEX IF NOT EXISTS idx_treatments_active ON treatments(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_treatments_category ON treatments(organization_id, category);

-- ================================================================
-- 3. Insertar tratamientos base (SYSTEM - para todas las organizaciones)
-- ================================================================
INSERT INTO treatments (organization_id, name, treatment_key, description, category, treatment_type, applied_in, default_price, exclusions, is_default) VALUES
(
  '00000000-0000-0000-0000-000000000001', -- ID especial para treatments del sistema
  'Polarizado', 
  'polarized', 
  'Lente polarizado que bloquea luz reflejada', 
  'coating', 
  'included', 
  'factory', 
  25000,
  '{"excludes": ["photochromatic", "tint"], "requires": [], "incompatible_with_material": []}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Fotocromático', 
  'photochromatic', 
  'Lente que se oscurece con el sol (Transitions)', 
  'coating', 
  'included', 
  'factory', 
  35000,
  '{"excludes": ["polarized"], "requires": [], "incompatible_with_material": []}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Anti-reflejante', 
  'anti_reflective', 
  'Elimina reflejos superficiales', 
  'coating', 
  'both', 
  'both', 
  15000,
  '{"excludes": [], "requires": [], "incompatible_with_material": []}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Filtro Luz Azul', 
  'blue_light_filter', 
  'Bloquea luz azul de pantallas', 
  'coating', 
  'both', 
  'both', 
  20000,
  '{"excludes": [], "requires": [], "incompatible_with_material": []}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Protección UV', 
  'uv_protection', 
  'Bloquea rayos UV', 
  'protection', 
  'both', 
  'factory', 
  10000,
  '{"excludes": [], "requires": [], "incompatible_with_material": []}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Anti-rayas', 
  'scratch_resistant', 
  'Capa endurecida anti-rayas', 
  'finish', 
  'both', 
  'local_lab', 
  12000,
  '{"excludes": [], "requires": [], "incompatible_with_material": []}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Anti-empañamiento', 
  'anti_fog', 
  'Previene empañamiento', 
  'protection', 
  'lab_applied', 
  'local_lab', 
  8000,
  '{"excludes": [], "requires": [], "incompatible_with_material": []}',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'Tinte', 
  'tint', 
  'Teñido del lente (gris, café, verde)', 
  'tint', 
  'lab_applied', 
  'local_lab', 
  15000,
  '{"excludes": ["polarized"], "requires": [], "incompatible_with_material": ["high_index_1_67", "high_index_1_74"]}',
  true
)
ON CONFLICT (treatment_key) DO NOTHING;

-- ================================================================
-- 4. Función: validate_treatment_compatibility
-- ================================================================
CREATE OR REPLACE FUNCTION public.validate_treatment_compatibility(
  p_treatment_keys TEXT[],
  p_lens_material TEXT DEFAULT 'cr39',
  p_lens_type TEXT DEFAULT 'single_vision'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- ================================================================
-- 5. Función: get_treatment_price
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_treatment_price(
  p_treatment_key TEXT,
  p_lens_material TEXT DEFAULT 'cr39'
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
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

-- ================================================================
-- 6. Función: calculate_treatments_total
-- ================================================================
CREATE OR REPLACE FUNCTION public.calculate_treatments_total(
  p_treatment_keys TEXT[],
  p_lens_material TEXT DEFAULT 'cr39'
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
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

-- ================================================================
-- 7. RLS: Habilitar y crear políticas
-- ================================================================
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Treatments visible to org admins" ON public.treatments;
CREATE POLICY "Treatments visible to org admins"
  ON public.treatments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM admin_users WHERE id = auth.uid()
    )
    OR organization_id = '00000000-0000-0000-0000-000000000001' -- treatments del sistema
  );

DROP POLICY IF EXISTS "Admins can manage treatments" ON public.treatments;
CREATE POLICY "Admins can manage treatments"
  ON public.treatments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM admin_users WHERE id = auth.uid()
    )
  );

-- ================================================================
-- 8. Agregar columna use_treatments_table a quote_settings (backwards compatibility)
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quote_settings' AND column_name = 'use_treatments_table'
  ) THEN
    ALTER TABLE quote_settings ADD COLUMN use_treatments_table BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ================================================================
-- 9. Trigger para actualizar updated_at
-- ================================================================
CREATE OR REPLACE TRIGGER update_treatments_updated_at
  BEFORE UPDATE ON public.treatments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- ================================================================
-- Rollback (si es necesario):
-- DROP TRIGGER IF EXISTS update_treatments_updated_at ON public.treatments;
-- DROP POLICY IF EXISTS "Admins can manage treatments" ON public.treatments;
-- DROP POLICY IF EXISTS "Treatments visible to org admins" ON public.treatments;
-- DROP FUNCTION IF EXISTS public.calculate_treatments_total;
-- DROP FUNCTION IF EXISTS public.get_treatment_price;
-- DROP FUNCTION IF EXISTS public.validate_treatment_compatibility;
-- DROP TABLE IF EXISTS public.treatments;
-- ================================================================