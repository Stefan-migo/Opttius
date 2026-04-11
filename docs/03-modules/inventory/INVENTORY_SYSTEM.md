# Sistema de Inventario - Opttius

Documentación detallada del sistema de inventario para ópticas. Esta documentación es la base de la estructura del módulo y debe mantenerse actualizada con cada cambio significativo.

---

## 1. Introducción

El sistema de inventario de Opttius gestiona el catálogo de productos y el stock por sucursal para ópticas. Está diseñado para:

- **Multi-sucursal**: Stock independiente por sucursal
- **Multi-tenant**: Aislamiento por organización
- **Óptica-específico**: Tipos de producto (marco, lente, accesorio, servicio) con reglas de stock diferenciadas
- **Integración POS**: Reducción automática de stock en ventas
- **Escalabilidad**: Separación catálogo/inventario, RPC para consistencia

---

## 2. Arquitectura

### 2.1 Separación Catálogo vs Inventario

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTS (Catálogo)                       │
│  name, slug, price, sku, barcode, product_type, optical_*       │
│  organization_id, branch_id (asociación inicial)                 │
│  DEPRECADO: inventory_quantity, track_inventory, low_stock_*     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PRODUCT_BRANCH_STOCK (Inventario)                │
│  product_id, branch_id, quantity, reserved_quantity             │
│  available_quantity (generated), low_stock_threshold             │
│  reorder_point, last_stock_movement                             │
│  UNIQUE(product_id, branch_id)                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Principio**: Un producto puede tener stock en múltiples sucursales. Cada combinación (producto, sucursal) tiene su propio registro de stock.

### 2.2 Diagrama de Flujo de Datos

```
Admin crea producto + stock_quantity
         │
         ▼
    products INSERT
         │
         ├──► product_branch_stock INSERT/update_product_stock RPC
         │
POS process-sale
         │
         ▼
    Excluir: frame-manual, lens-, treatments-, labor-, discount-
    Excluir: product_type = service
         │
         ▼
    update_product_stock(product_id, branch_id, -quantity, false)
         │
         ▼
    product_branch_stock.quantity -= quantity
```

---

## 3. Modelo de Datos

### 3.1 Tabla products (campos relevantes para inventario)

| Campo               | Tipo    | Descripción                                     |
| ------------------- | ------- | ----------------------------------------------- |
| id                  | UUID    | PK                                              |
| organization_id     | UUID    | Multi-tenant                                    |
| branch_id           | UUID    | Sucursal de asociación inicial (puede ser null) |
| sku                 | TEXT    | Código único (UNIQUE)                           |
| barcode             | TEXT    | Código de barras                                |
| product_type        | TEXT    | frame, lens, accessory, service                 |
| optical_category    | TEXT    | sunglasses, prescription_glasses, etc.          |
| track_inventory     | BOOLEAN | DEPRECADO                                       |
| inventory_quantity  | INTEGER | DEPRECADO                                       |
| low_stock_threshold | INTEGER | DEPRECADO                                       |

### 3.2 Tabla product_branch_stock

| Campo                  | Tipo        | Descripción                             |
| ---------------------- | ----------- | --------------------------------------- |
| id                     | UUID        | PK                                      |
| product_id             | UUID        | FK → products                           |
| branch_id              | UUID        | FK → branches                           |
| quantity               | INTEGER     | Stock físico (NOT NULL, DEFAULT 0)      |
| reserved_quantity      | INTEGER     | Reservado (NOT NULL, DEFAULT 0)         |
| available_quantity     | INTEGER     | GENERATED: quantity - reserved_quantity |
| low_stock_threshold    | INTEGER     | Umbral de alerta (default 5)            |
| reorder_point          | INTEGER     | Punto de reorden                        |
| last_stock_movement    | TIMESTAMPTZ | Último movimiento                       |
| created_at, updated_at | TIMESTAMPTZ | Auditoría                               |

**Constraint**: UNIQUE(product_id, branch_id)

### 3.3 Vista products_with_stock (compatibilidad)

Vista que agrega `total_inventory_quantity` y `total_available_quantity` sumando sobre product_branch_stock. Usada para migración gradual.

---

## 4. Funciones RPC

### 4.1 update_product_stock

```sql
update_product_stock(
  p_product_id UUID,
  p_branch_id UUID,
  p_quantity_change INTEGER,
  p_reserve BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN
```

- **p_quantity_change**: Positivo = aumentar, Negativo = disminuir
- **p_reserve**: true = modifica reserved_quantity; false = modifica quantity
- Crea registro si no existe (INSERT con ON CONFLICT)
- Usa GREATEST(0, ...) para evitar cantidades negativas

### 4.2 get_product_stock

```sql
get_product_stock(p_product_id UUID, p_branch_id UUID)
RETURNS TABLE (
  quantity INTEGER,
  reserved_quantity INTEGER,
  available_quantity INTEGER,
  low_stock_threshold INTEGER,
  reorder_point INTEGER,
  is_low_stock BOOLEAN
)
```

Retorna (0,0,0,5,NULL,false) si no existe registro.

---

## 5. Tipos de Productos y Reglas de Stock

### 5.1 Productos que consumen stock

| product_type | Ejemplo                         | Stock en             |
| ------------ | ------------------------------- | -------------------- |
| frame        | Marcos de armazón               | product_branch_stock |
| accessory    | Fundas, líquidos, lentes de sol | product_branch_stock |

### 5.2 Productos que NO consumen stock de products

| product_type | Razón                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| service      | Mano de obra, consultas                                                |
| lens         | Lentes oftálmicos: stock en lens_families, se montan en lab_work_order |

### 5.3 IDs temporales (no son product_id real)

| Prefijo       | Uso                                                        |
| ------------- | ---------------------------------------------------------- |
| frame-manual- | Marco ingresado manualmente en POS                         |
| lens-         | Lente oftálmico (familia)                                  |
| treatments-   | Tratamientos de lente                                      |
| labor-        | Mano de obra                                               |
| discount-     | Descuento                                                  |
| contact-lens- | Lente de contacto (puede tener stock según implementación) |

---

## 6. Integración con Módulos

### 6.1 POS (process-sale)

1. Obtener items con product_id real (excluir temporales)
2. Para cada item: verificar product_type !== 'service'
3. Obtener branch_id del branchContext
4. Si no existe product_branch_stock: INSERT con quantity=0
5. Llamar update_product_stock(product_id, branch_id, -item.quantity, false)

### 6.2 Productos (CRUD)

- **Crear**: Si body.stock_quantity > 0 y branch_id, llamar update_product_stock con cantidad positiva
- **Editar**: PATCH puede incluir stock_quantity; actualizar product_branch_stock vía API [id]/route
- **Bulk update_inventory**: Obtener stock actual, calcular nuevo, update_product_stock por cada producto

### 6.3 Importación

- Mapear CSV/JSON: stock_quantity → stock en product_branch_stock
- Requiere branch_id para asignar stock
- Usar update_product_stock para consistencia

### 6.4 Work Orders (lab_work_orders)

- No reducen stock de products directamente
- Marcos y lentes se montan; el stock de lentes está en lens_families
- Marcos manuales no tienen product_id

---

## 7. Multi-Tenant y Branch Context

### 7.1 Organización

- products.organization_id: filtra por organización del admin
- product_branch_stock hereda branch → organization vía branches

### 7.2 Sucursal

- Stock siempre por branch_id
- Catálogo (products) es compartido por toda la organización
- Header x-branch-id: sucursal seleccionada para consultar/actualizar stock

### 7.3 Super Admin

- Puede ver todas las organizaciones
- Si selecciona sucursal, filtra por branch de esa org

---

## 8. Estructura de Archivos

```
src/
├── app/
│   ├── admin/
│   │   └── products/
│   │       ├── index.tsx          # Página principal (tabs)
│   │       ├── add/page.tsx       # Alta de producto
│   │       ├── edit/[id]/page.tsx # Edición
│   │       └── sections/
│   │           └── ProductListingSection.tsx
│   └── api/
│       └── admin/
│           ├── products/
│           │   ├── route.ts       # GET, POST
│           │   ├── [id]/route.ts  # GET, PATCH
│           │   ├── bulk/route.ts  # Operaciones masivas
│           │   ├── import/route.ts
│           │   └── search/route.ts
│           └── pos/
│               └── process-sale/route.ts
├── lib/
│   └── inventory/
│       └── stock-helpers.ts       # getProductStock, updateProductStock, upsertProductStock
└── types/
    └── supabase.ts               # Tipos product_branch_stock, update_product_stock

supabase/
└── migrations/
    ├── 20251216000000_create_branches_system.sql
    ├── 20260120000000_refactor_separate_products_inventory.sql
    └── ...
```

---

## 9. Consideraciones de Rendimiento

- **Índices**: idx_product_branch_stock_available, idx_product_branch_stock_low_stock
- **Post-procesamiento**: Filtros in_stock, low_stock_only se aplican en memoria (no en DB) por limitación de Supabase con joins
- **Paginación**: Usar limit/offset o page en GET products

---

## 10. Mejoras Futuras (Roadmap)

### 10.1 Auditoría de movimientos (inventory_transactions)

Tabla para registrar todos los movimientos de stock con trazabilidad:

| Campo           | Tipo        | Descripción                                       |
| --------------- | ----------- | ------------------------------------------------- |
| id              | UUID        | PK                                                |
| product_id      | UUID        | FK → products                                     |
| branch_id       | UUID        | FK → branches                                     |
| quantity_change | INTEGER     | Cambio (+/-)                                      |
| type            | TEXT        | sale, adjustment, transfer_out, transfer_in, etc. |
| reference_id    | UUID        | ID de referencia (sale_id, work_order_id, etc.)   |
| created_at      | TIMESTAMPTZ | Fecha del movimiento                              |
| created_by      | UUID        | FK → auth.users (opcional)                        |

**Implementación**: Crear migración, triggers o llamadas explícitas desde `update_product_stock` para insertar en `inventory_transactions`.

### 10.2 Transferencias entre sucursales

API para mover stock de una sucursal origen a una sucursal destino:

- **Endpoint**: `POST /api/admin/inventory/transfers`
- **Body**: `{ origin_branch_id, destination_branch_id, items: [{ product_id, quantity }] }`
- **Validaciones**: Mismo organization_id en ambas sucursales, stock suficiente en origen
- **Flujo**: `update_product_stock(origin, -q)` + `update_product_stock(destination, +q)` + registros en `inventory_transactions` (type: transfer_out, transfer_in)

### 10.3 Otras mejoras

3. **low_stock_threshold por producto/sucursal**: Ya existe en product_branch_stock, exponer en UI
4. **reorder_point**: Sugerencias de compra cuando stock <= reorder_point
5. **Lotes/caducidad**: Para lentes de contacto (shelf_life)
6. **Reservas temporales**: Sistema de reserva para presupuestos con expiración
7. **Eliminar columnas deprecadas**: DROP inventory_quantity, track_inventory, low_stock_threshold de products (cuando no haya referencias)

---

## 11. Changelog

| Fecha      | Cambio                                                                              |
| ---------- | ----------------------------------------------------------------------------------- |
| 2026-01-20 | Refactor: separación products/product_branch_stock, RPC update_product_stock        |
| 2026-02-18 | Documentación inicial INVENTORY_SYSTEM.md y skill inventory-optical-supabase        |
| 2026-02-19 | Roadmap: detalle de inventory_transactions y API de transferencias entre sucursales |
