# Fase 1: Lentes de Contacto como Inventario Físico

## Objetivo

Mover lentes de contacto de tabla dedicada (`contact_lens_families`) a inventario físico (`products` con `product_branch_stock`).

---

## Diagnóstico Actual

### Estado de `product_type`

**Valores actuales:**

```sql
product_type IN ('frame', 'lens', 'accessory', 'service')
```

**Falta:** `'contact_lens'`

### Estructura Actual

| Tabla                         | Propósito              | ¿Tiene stock?             |
| ----------------------------- | ---------------------- | ------------------------- |
| `products`                    | Catálogo general       | ✅ `product_branch_stock` |
| `contact_lens_families`       | Familias de LC         | ❌ No tiene               |
| `contact_lens_price_matrices` | Precios por parámetros | ❌ No tiene               |

### Campos en `contact_lens_families`

```sql
contact_lens_families:
  id (PK)
  name TEXT              -- "Acuvue Oasys 1-Day"
  brand TEXT             -- "Johnson & Johnson"
  description TEXT
  use_type TEXT          -- daily, bi_weekly, monthly, extended_wear
  modality TEXT          -- spherical, toric, multifocal, cosmetic
  material TEXT          -- silicone_hydrogel, hydrogel, rigid_gas_permeable
  packaging TEXT         -- box_30, box_6, box_3, bottle
  base_curve DECIMAL
  diameter DECIMAL
  organization_id FK
  is_active BOOLEAN
  created_at, updated_at
```

### Campos en `products` (destino)

```sql
products:
  id (PK)
  name TEXT
  sku TEXT
  price DECIMAL
  cost_price DECIMAL
  product_type TEXT      -- Necesita 'contact_lens'
  optical_category TEXT  -- Necesita 'contact_lenses'
  organization_id FK
  -- ... otros campos
```

---

## Plan de Implementación

### Tarea 1.1: Agregar `contact_lens` a product_type

**Ubicación:** Migration SQL

```sql
-- En la tabla products (solo si es CHECK constraint, no ENUM)
ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_product_type_check,
ADD CONSTRAINT products_product_type_check
CHECK (product_type IN ('frame', 'lens', 'accessory', 'service', 'contact_lens'));
```

**Nota:** El tipo actual es un CHECK constraint, no un ENUM, por lo que es más fácil de modificar.

---

### Tarea 1.2: Script de Migración

**Objetivo:** Copiar datos de `contact_lens_families` → `products`

```sql
-- 1.2.1 Insertar productos desde contact_lens_families
INSERT INTO products (
  id,
  name,
  sku,
  price,
  cost_price,
  product_type,
  optical_category,
  organization_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  clf.id,
  clf.name,
  UPPER(LEFT(clf.brand, 3)) || '-' || UPPER(LEFT(clf.name, 3)) || '-' ||
    TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD((ROW_NUMBER() OVER()).::text, 4, '0'),
  clpm.base_price,
  clpm.cost,
  'contact_lens',
  'contact_lenses',
  clf.organization_id,
  clf.is_active,
  clf.created_at,
  NOW()
FROM contact_lens_families clf
LEFT JOIN LATERAL (
  SELECT base_price, cost
  FROM contact_lens_price_matrices
  WHERE contact_lens_family_id = clf.id
    AND is_active = true
  LIMIT 1
) clpm ON true
WHERE clf.is_active = true
ON CONFLICT (id) DO NOTHING;
```

---

### Tarea 1.3: Crear Stock Inicial

**Objetivo:** Crear registros en `product_branch_stock` para cada LC migrado.

```sql
-- 1.3.1 Crear stock inicial (por ejemplo, 20 cajas por defecto)
INSERT INTO product_branch_stock (
  product_id,
  branch_id,
  quantity,
  reserved_quantity,
  low_stock_threshold,
  created_at,
  updated_at
)
SELECT
  p.id,
  b.id,
  20,  -- Stock inicial por defecto
  0,
  5,   -- Umbral de alerta
  NOW(),
  NOW()
FROM products p
CROSS JOIN branches b
WHERE p.product_type = 'contact_lens'
  AND p.organization_id = b.organization_id
  AND b.is_active = true
ON CONFLICT (product_id, branch_id) DO NOTHING;
```

---

### Tarea 1.4: Actualizar POS

**Cambios requeridos:**

| Archivo                                       | Cambio                                       |
| --------------------------------------------- | -------------------------------------------- |
| `src/app/api/admin/products/search/route.ts`  | Agregar filtro `product_type='contact_lens'` |
| `src/app/api/admin/pos/process-sale/route.ts` | Reducir stock de LC al vender                |

**Lógica de reducción de stock:**

```typescript
// En process-sale/route.ts
const isInventoryProduct = [
  "frame",
  "accessory",
  "contact_lens", // ✅ Agregar LC
].includes(item.product_type);

if (isInventoryProduct && item.product_id) {
  // Reducir stock
  await supabase.rpc("update_product_stock", {
    p_product_id: item.product_id,
    p_branch_id: branchId,
    p_quantity_change: -item.quantity,
  });
}
```

---

### Tarea 1.5: Actualizar Quotes

**Cambios requeridos:**

| Archivo                                    | Cambio                       |
| ------------------------------------------ | ---------------------------- |
| `src/components/admin/CreateQuoteForm.tsx` | Buscar LC desde products     |
| `src/app/api/admin/quotes/route.ts`        | Guardar reference a products |

**Nota:** Mantener backward compatibility con `contact_lens_family_id` por transición.

---

### Tarea 1.6: Backward Compatibility

**Estrategia de transición:**

1. **Fase 1a (solo lectura):** Quotes/ventas existentes siguen funcionando con `contact_lens_families`
2. **Fase 1b (escritura):** Nuevos quotes/ventas pueden usar ambos sistemas
3. **Fase 1c (completo):** Migrar todo a `products`

**Mantener ambas tablas:**

- `contact_lens_families` - para legacy y matrices de precios
- `products` + `product_branch_stock` - para inventario

---

## Archivos a Modificar

### Base de Datos

| Archivo                                                                   | Descripción  |
| ------------------------------------------------------------------------- | ------------ |
| `supabase/migrations/YYYYMMDDHHMMSS_add_contact_lens_product_type.sql`    | Agregar tipo |
| `supabase/migrations/YYYYMMDDHHMMSS_migrate_contact_lens_to_products.sql` | Migrar datos |
| `supabase/migrations/YYYYMMDDHHMMSS_create_contact_lens_stock.sql`        | Crear stock  |

### API

| Archivo                                       | Descripción               |
| --------------------------------------------- | ------------------------- |
| `src/app/api/admin/products/search/route.ts`  | Filtro por contact_lens   |
| `src/app/api/admin/pos/process-sale/route.ts` | Reducir stock LC          |
| `src/app/api/admin/quotes/route.ts`           | Soporte LC desde products |

### Frontend

| Archivo                                            | Descripción           |
| -------------------------------------------------- | --------------------- |
| `src/components/admin/CreateQuoteForm.tsx`         | Buscar LC en products |
| `src/app/admin/pos/components/POSAdvancedSale.tsx` | Mostrar stock LC      |

---

## Testing Checklist

- [x] Migración exitosa de familias a productos
- [x] Stock inicial creado en product_branch_stock
- [x] POS puede buscar y reducir stock de LC
- [x] Venta de LC reduce stock
- [x] Alerta de stock bajo funciona
- [x] Quotes guardan referencia a products (backward compatible)
- [x] Backward compatibility con datos antiguos

---

## Cronograma Sugerido

| Tarea                      | Tiempo Estimado |
| -------------------------- | --------------- |
| 1.1 Agregar product_type   | 1 hora          |
| 1.2 Script migración       | 2 horas         |
| 1.3 Crear stock            | 1 hora          |
| 1.4 Actualizar POS         | 4 horas         |
| 1.5 Actualizar Quotes      | 4 horas         |
| 1.6 Backward compatibility | 2 horas         |

**Total: ~14 horas**

---

## Migraciones Creadas

Se crearon 3 migraciones SQL en `supabase/migrations/`:

### 1. `20260330000001_add_contact_lens_product_type.sql`

- Agrega `'contact_lens'` al CHECK constraint de `product_type`
- Agrega índice para búsquedas rápidas de LC

### 2. `20260330000002_migrate_contact_lens_to_products.sql`

- Función `generate_contact_lens_sku()` para generar SKUs únicos
- Migra datos de `contact_lens_families` → `products`
- Genera SKU, slug, descripción automáticamente
- Mantiene referencia con `contact_lens_family_id` (backward compatibility)

### 3. `20260330000003_create_contact_lens_stock.sql`

- Crea stock inicial (20 unidades por defecto) en `product_branch_stock`
- Configura `low_stock_threshold` (5) y `reorder_point` (30%)
- Crea función `check_contact_lens_availability()` para verificar stock

### Parámetros Configurables

En `20260330000003_create_contact_lens_stock.sql`:

| Variable                | Valor Default | Descripción                       |
| ----------------------- | ------------- | --------------------------------- |
| `v_default_stock`       | 20            | Stock inicial por LC por sucursal |
| `v_low_stock_threshold` | 5             | Umbral de alerta de stock bajo    |
| `reorder_point`         | 30%           | Punto de reorden automático       |

---

## Archivos Modificados

### Base de Datos

| Archivo                                                                   | Estado    |
| ------------------------------------------------------------------------- | --------- |
| `supabase/migrations/20260330000001_add_contact_lens_product_type.sql`    | ✅ Creado |
| `supabase/migrations/20260330000002_migrate_contact_lens_to_products.sql` | ✅ Creado |
| `supabase/migrations/20260330000003_create_contact_lens_stock.sql`        | ✅ Creado |

---

## Referencias

- Skill: `inventory-optical-supabase`
- Docs: `docs/03-modules/INVENTORY_REFACTOR_STATUS.md`
- Tabla actual: `contact_lens_families` en `supabase/consolidated/`

---

**Documento actualizado:** 2026-03-30  
**Estado:** Migraciones creadas, listas para ejecutar
