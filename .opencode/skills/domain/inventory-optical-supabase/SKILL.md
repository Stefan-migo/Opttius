---
name: inventory-optical-supabase
description: Expert guide for building and maintaining a high-quality inventory system for optical shops with Supabase. Use when working on products, stock management, product_branch_stock, inventory adjustments, low stock alerts, multi-branch inventory, POS stock reduction, or optical product catalog. Covers multi-tenant architecture, RLS, branch-scoped stock, and optical-specific data models.
---

# Inventario para Ópticas con Supabase

Guía para desarrollar y mantener un sistema de inventario de alta gama para ópticas usando Supabase y Next.js.

## Cuándo Usar Este Skill

- Gestión de productos (catálogo, CRUD)
- Control de inventario por sucursal (product_branch_stock)
- Ajustes de stock (manual, bulk, import)
- Alertas de stock bajo
- Integración POS (reducción de stock en ventas)
- Órdenes de trabajo (lab_work_orders) - productos que no consumen stock físico
- Familias de lentes oftálmicos y de contacto
- Transferencias entre sucursales (futuro)
- Auditoría de movimientos de inventario (futuro)

## Arquitectura Core

### Separación Catálogo vs Inventario

| Tabla                  | Propósito                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `products`             | Catálogo de productos (datos maestros, precios, especificaciones ópticas)                 |
| `product_branch_stock` | Inventario por sucursal (quantity, reserved_quantity, low_stock_threshold, reorder_point) |

**Regla crítica**: El inventario NUNCA vive en `products`. Las columnas `inventory_quantity`, `track_inventory`, `low_stock_threshold` en products están DEPRECADAS. Usar siempre `product_branch_stock`.

### Modelo de Datos product_branch_stock

```
product_branch_stock:
  id (PK)
  product_id (FK → products)
  branch_id (FK → branches)
  quantity (NOT NULL, DEFAULT 0) — stock físico
  reserved_quantity (NOT NULL, DEFAULT 0) — reservado para presupuestos/carritos
  available_quantity (GENERATED) — quantity - reserved_quantity
  low_stock_threshold (DEFAULT 5) — umbral de alerta
  reorder_point — punto de reorden
  last_stock_movement — timestamp último movimiento
  created_at, updated_at
  UNIQUE(product_id, branch_id)
```

### Tipos de Productos Ópticos

| product_type | Consume Stock | Notas                                                                    |
| ------------ | ------------- | ------------------------------------------------------------------------ |
| frame        | Sí            | Marcos físicos                                                           |
| lens         | No\*          | \*Lentes oftálmicos: se montan en lab_work_order, stock en lens_families |
| accessory    | Sí            | Fundas, líquidos, accesorios                                             |
| service      | No            | Mano de obra, consultas                                                  |

**IDs temporales (no consumen stock de products):**

- `frame-manual-*` — Marco ingresado manualmente
- `lens-*` — Lente oftálmico (familia)
- `treatments-*` — Tratamientos
- `labor-*` — Mano de obra
- `contact-lens-*` — Lentes de contacto (pueden consumir stock según implementación)
- `discount-*` — Descuentos

## Funciones RPC de Inventario

### update_product_stock

```sql
update_product_stock(
  p_product_id UUID,
  p_branch_id UUID,
  p_quantity_change INTEGER,  -- Negativo = disminuir, Positivo = aumentar
  p_reserve BOOLEAN DEFAULT FALSE  -- true = actualiza reserved_quantity
) RETURNS BOOLEAN
```

**Uso:**

- Reducir stock en venta: `p_quantity_change: -item.quantity`, `p_reserve: false`
- Aumentar stock en recepción: `p_quantity_change: cantidad`, `p_reserve: false`
- Reservar para presupuesto: `p_quantity_change: cantidad`, `p_reserve: true`

### get_product_stock

```sql
get_product_stock(p_product_id UUID, p_branch_id UUID)
RETURNS TABLE (quantity, reserved_quantity, available_quantity, low_stock_threshold, reorder_point, is_low_stock)
```

## Flujo de Stock en POS

1. **Validar items**: Excluir frame-manual, lens-, treatments-, labor-, discount-
2. **Verificar product_type**: Si `service`, no reducir stock
3. **Obtener branch_id**: Del branchContext (obligatorio para no super admin)
4. **Crear registro si no existe**: Insert en product_branch_stock con quantity=0 si es primera venta
5. **Llamar RPC**: `update_product_stock` con quantity_change negativo

## Multi-Tenant y Branch Context

### Filtrado Obligatorio

1. **organization_id**: Productos pertenecen a organización. Siempre filtrar.
2. **branch_id**: Stock es por sucursal. Si usuario tiene sucursal seleccionada, filtrar stock por branch_id.
3. **Catálogo compartido**: Todos los productos de la org son visibles en todas las sucursales. El stock SÍ es por sucursal.

### Headers

- `x-branch-id`: Sucursal seleccionada para consultar/actualizar stock

## Helpers TypeScript

### stock-helpers.ts

| Función                                                                         | Uso                                                                         |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `getProductStock(productId, branchId, supabase)`                                | Obtener stock actual                                                        |
| `updateProductStock(productId, branchId, quantityChange, isReserved, supabase)` | Actualizar stock (usa direct update, preferir RPC cuando sea transaccional) |
| `upsertProductStock(productId, branchId, quantity, reservedQuantity, supabase)` | Crear o reemplazar stock                                                    |

**Nota**: Para operaciones críticas (POS, bulk), usar `supabase.rpc("update_product_stock", ...)` directamente para consistencia con la lógica del servidor.

## Mejores Prácticas Óptica-Específicas

### 1. SKU y Código de Barras

- SKU único por producto (UNIQUE en products)
- Barcode para escaneo en POS
- Formato sugerido: `OPT-{tipo}-{código}` (ej: OPT-FR-001234)

### 2. Stock Bajo

- `low_stock_threshold` configurable por producto/sucursal (actualmente default 5)
- Filtrar `low_stock_only=true` en listado para ver alertas
- Considerar `reorder_point` para sugerencias de compra

### 3. Productos Sin Stock Físico

- `product_type: "service"` → no crear product_branch_stock
- Lentes oftálmicos (lens_families) → stock en tabla separada
- Marcos manuales → no tienen product_id real

### 4. Importación Masiva

- Usar `update_product_stock` RPC al importar
- Mapear `stock_quantity` o `inventory_quantity` a product_branch_stock
- Requiere branch_id para asignar stock

### 5. Operaciones Bulk

- `update_inventory`: Ajuste por cantidad o porcentaje
- Obtener stock actual de product_branch_stock antes de calcular nuevo valor
- Aplicar por cada branch_id si es multi-sucursal

## API Routes Relevantes

| Ruta                          | Método | Propósito                                               |
| ----------------------------- | ------ | ------------------------------------------------------- |
| `/api/admin/products`         | GET    | Listar productos con stock (branch_id en header)        |
| `/api/admin/products`         | POST   | Crear producto + stock inicial (stock_quantity en body) |
| `/api/admin/products/[id]`    | PATCH  | Actualizar producto + stock                             |
| `/api/admin/products/bulk`    | POST   | Bulk: update_inventory, update_status, etc.             |
| `/api/admin/products/import`  | POST   | Importar productos con stock                            |
| `/api/admin/pos/process-sale` | POST   | Reducir stock en venta                                  |

## Checklist de Calidad Inventario

- [ ] Stock siempre en product_branch_stock, nunca en products.inventory_quantity
- [ ] Usar RPC update_product_stock para cambios de stock (POS, bulk, import)
- [ ] Branch_id obligatorio al crear/actualizar stock
- [ ] Excluir product_type=service de reducción de stock
- [ ] Excluir IDs temporales (frame-manual, lens-, etc.) de stock
- [ ] available_quantity = quantity - reserved_quantity
- [ ] Filtrar por organization_id en todas las queries de productos
- [ ] low_stock_threshold configurable (no hardcodear 5 en UI)
- [ ] Validar stock suficiente antes de venta (opcional, actualmente permite negativo)

## Referencias

- Documentación: `docs/INVENTORY_SYSTEM.md`
- Migración refactor: `supabase/migrations/20260120000000_refactor_separate_products_inventory.sql`
- Stock helpers: `src/lib/inventory/stock-helpers.ts`
- POS process-sale: `src/app/api/admin/pos/process-sale/route.ts`
- Products API: `src/app/api/admin/products/route.ts`
