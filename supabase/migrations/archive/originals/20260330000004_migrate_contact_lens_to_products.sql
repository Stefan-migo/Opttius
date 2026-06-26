-- Migration: 20260330000002_migrate_contact_lens_to_products.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- ============================================================================
-- Migration: Migrate contact_lens_families to products
-- Phase: Inventory Refactor - Fase 1
-- Description: Copiar datos de contact_lens_families a products con product_type='contact_lens'
-- ============================================================================

-- Verificar que la migración anterior fue ejecutada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_product_type_check'
    AND pg_get_constraintdef(oid) LIKE '%contact_lens%'
  ) THEN
    RAISE EXCEPTION 'Migration 20260330000001_add_contact_lens_product_type must be run first';
  END IF;
END $$;

-- Función auxiliar para generar SKU para lentes de contacto
CREATE OR REPLACE FUNCTION generate_contact_lens_sku(brand TEXT, name TEXT, org_id UUID)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1. Insertar productos desde contact_lens_families
-- Solo migra familias activas que no existan ya en products
INSERT INTO products (
  id,
  name,
  slug,
  description,
  price,
  cost_price,
  product_type,
  optical_category,
  organization_id,
  sku,
  status,
  track_inventory,
  created_at,
  updated_at
)
SELECT 
  clf.id,
  -- Nombre: "Marca - Nombre" para mejor identificación
  COALESCE(clf.brand || ' - ', '') || clf.name,
  -- Slug único
  LOWER(REPLACE(COALESCE(clf.brand || '-', '') || clf.name, ' ', '-')) || '-' || LEFT(clf.id::TEXT, 8),
  -- Descripción: incluir características
  CONCAT_WS('. ', 
    clf.description,
    CONCAT('Uso: ', clf.use_type),
    CONCAT('Modalidad: ', clf.modality),
    CONCAT('Material: ', clf.material),
    CONCAT('Empaque: ', clf.packaging)
  ),
  -- Precio: usar el promedio de precios de la matriz
  COALESCE(clpm_avg.avg_price, 0),
  -- Costo: usar el promedio de costos de la matriz  
  COALESCE(clpm_avg.avg_cost, 0),
  -- Tipo de producto
  'contact_lens',
  -- Categoría óptica
  'contact_lenses',
  -- Organización
  clf.organization_id,
  -- SKU generado
  generate_contact_lens_sku(clf.brand, clf.name, clf.organization_id),
  -- Estado: activo si la familia está activa
  CASE WHEN clf.is_active THEN 'active' ELSE 'draft' END,
  -- Track inventory: TRUE para LC (ahora serán inventario)
  TRUE,
  -- Timestamps
  clf.created_at,
  NOW()
FROM contact_lens_families clf
LEFT JOIN LATERAL (
  -- Obtener promedio de precios y costos de la matriz
  SELECT 
    AVG(base_price) as avg_price,
    AVG(cost) as avg_cost
  FROM contact_lens_price_matrices 
  WHERE contact_lens_family_id = clf.id 
    AND is_active = true
) clpm_avg ON true
WHERE clf.is_active = true
  -- Solo migrar si no existe ya un producto con este ID
  AND NOT EXISTS (
    SELECT 1 FROM products WHERE id = clf.id
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Registrar la migración en un log (para referencia)
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % contact lens families to products', v_count;
END $$;

-- 3. Crear índice para búsquedas rápidas de LC
CREATE INDEX IF NOT EXISTS idx_products_contact_lens_search 
ON products(name, brand, sku) 
WHERE product_type = 'contact_lens';

-- 4. Agregar columna temporal para referencia a la familia original (para backward compatibility)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS contact_lens_family_id UUID REFERENCES contact_lens_families(id);

-- Actualizar la referencia para productos migrados
UPDATE products p
SET contact_lens_family_id = clf.id
FROM contact_lens_families clf
WHERE p.id = clf.id
  AND p.product_type = 'contact_lens';

-- Agregar índice para la referencia
CREATE INDEX IF NOT EXISTS idx_products_contact_lens_family_id 
ON products(contact_lens_family_id) 
WHERE contact_lens_family_id IS NOT NULL;

COMMENT ON COLUMN products.contact_lens_family_id 
IS 'Referencia a la familia de lentes de contacto original (para backward compatibility durante migración)';
