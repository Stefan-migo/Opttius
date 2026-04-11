# Plan de Mejoras - Módulo Inventario y Contactología (Feb 2026)

**Fecha de implementación:** Febrero 2026  
**Estado:** Completado (excepto ítem opcional)

Este documento describe las modificaciones implementadas según el plan de mejoras del módulo de inventario y contactología, así como los ítems pendientes.

---

## Resumen Ejecutivo

Se implementaron 6 fases principales:

1. **Consolidar botones duplicados** en tabs de familias ópticas y de contacto
2. **Auditoría completa** en `update_product_stock` (process-sale, refund, cancel)
3. **low_stock_threshold** en formularios add/edit y API
4. **Visibilidad de productos por sucursal** (GET + POST)
5. **Formulario merged** de familias de lentes de contacto (new + edit + wizard + API)
6. **Filtros de stock - count preciso** (OPCIONAL - NO implementado)

---

## 1. Consolidar Botones Duplicados ✅

### Cambios realizados

- **`src/app/admin/products/index.tsx`**: El botón del header para contact-lens ahora redirige a `/admin/contact-lens-families/new` (antes iba a `/admin/contact-lens-families`).
- **`src/components/admin/lenses/LensFamiliesList.tsx`**: Eliminado el botón duplicado "VINCULAR NUEVA FAMILIA" dentro de la tabla.
- **`src/components/admin/lenses/ContactLensFamiliesList.tsx`**: Eliminado el botón duplicado "VINCULAR NUEVO PARÁMETRO" dentro de la tabla.

### Comportamiento actual

- Solo existe un botón por tab: el del header en `products/index.tsx`.
- Ópticos: "Nueva Familia Óptica" → `/admin/lens-families/new`
- Contactología: "Nueva Familia Contacto" → `/admin/contact-lens-families/new`

---

## 2. Auditoría Completa en update_product_stock ✅

### Cambios realizados

Se pasan los parámetros de auditoría en todas las llamadas a `update_product_stock`:

| Archivo                                         | Tipo   | Valores                                                                                                             |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/admin/pos/process-sale/route.ts`   | sale   | `p_movement_type: "sale"`, `p_reference_type: "order"`, `p_reference_id: orderId`, `p_created_by: user.id`          |
| `src/app/api/admin/pos/refund/route.ts`         | refund | `p_movement_type: "refund"`, `p_reference_type: "refund"`, `p_reference_id: refundId`, `p_created_by: user.id`      |
| `src/app/api/admin/orders/[id]/cancel/route.ts` | refund | `p_movement_type: "refund"`, `p_reference_type: "order_cancel"`, `p_reference_id: orderId`, `p_created_by: user.id` |

### Tabla inventory_movements

La RPC `update_product_stock` ya acepta estos parámetros opcionales (migración `20260218164824_create_inventory_movements.sql`). Los movimientos quedan registrados en `inventory_movements` para trazabilidad.

---

## 3. low_stock_threshold en UI ✅

### Cambios realizados

**3.1 Formulario Alta de Producto** (`src/app/admin/products/add/page.tsx`)

- Campo numérico opcional `low_stock_threshold` (default: 5) junto a `stock_quantity`.
- Se envía en el body del POST si el usuario lo modifica.

**3.2 Formulario Edición de Producto** (`src/app/admin/products/edit/[id]/page.tsx`)

- Carga `low_stock_threshold` desde `product_branch_stock`.
- Permite editar el umbral y persistirlo vía PATCH.

**3.3 API Products**

- **POST** (`src/app/api/admin/products/route.ts`): Acepta `low_stock_threshold` y crea/actualiza `product_branch_stock` con ese valor.
- **PATCH** (`src/app/api/admin/products/[id]/route.ts`): Acepta `low_stock_threshold` y actualiza `product_branch_stock` para la sucursal.

---

## 4. Visibilidad de Productos por Sucursal ✅

### Comportamiento anterior (incorrecto)

- Todos los productos de la organización se mostraban en todas las sucursales.
- Al crear un producto en sucursal 1, aparecía también en sucursal 2 con stock 0.

### Comportamiento nuevo

**API GET Products** (`src/app/api/admin/products/route.ts`)

| Rol           | Contexto              | Filtro aplicado                                                                           |
| ------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| Admin regular | Sucursal seleccionada | `products.branch_id = currentBranchId` (solo productos de esa sucursal)                   |
| Super admin   | Sucursal seleccionada | `products.branch_id = currentBranchId OR products.branch_id IS NULL` (locales + org-wide) |
| Super admin   | Vista global          | Todos los productos de la organización                                                    |

**API POST Products** (`src/app/api/admin/products/route.ts`)

| Rol           | Contexto                          | Comportamiento                                                                                         |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Admin regular | Sucursal seleccionada             | `product.branch_id = productBranchId`, stock solo para esa sucursal                                    |
| Super admin   | Vista global (`!productBranchId`) | `product.branch_id = null`, se crea `product_branch_stock` con quantity=0 para cada sucursal de la org |

### Productos existentes

- Productos con `branch_id` de una sucursal específica mantienen su comportamiento (visibles solo en esa sucursal).
- Productos con `branch_id = null` son visibles en todas las sucursales (org-wide).

---

## 5. Formulario Merged de Familias de Lentes de Contacto ✅

### Situación anterior

- Ruta `/admin/contact-lens-families/new` no existía (404).
- Las matrices de precios se gestionaban por separado en `/admin/contact-lens-matrices`.
- No había formulario unificado familia + matrices.

### Cambios realizados

**5.1 Nueva ruta `/admin/contact-lens-families/new`**

- Archivo: `src/app/admin/contact-lens-families/new/page.tsx`
- Renderiza `ContactLensFamilyWizard` para creación.

**5.2 Nueva ruta `/admin/contact-lens-families/[id]`**

- Archivo: `src/app/admin/contact-lens-families/[id]/page.tsx`
- Renderiza `ContactLensFamilyWizard` con `familyId` para edición.

**5.3 Componente ContactLensFamilyWizard**

- Archivo: `src/components/admin/lenses/ContactLensFamilyWizard.tsx`
- Wizard de 2 pasos:
  - **Paso 1**: Datos de familia (nombre, marca, categoría, use_type, modality, material, packaging, base_curve, diameter, description, is_active).
  - **Paso 2**: Gestor de matrices de precios (`ContactLensMatrixManager`).
- Soporta creación (sin `familyId`) y edición (con `familyId`).
- En edición: carga familia + matrices desde API y permite actualizar ambos.

**5.4 Componente ContactLensMatrixManager**

- Archivo: `src/components/admin/lenses/ContactLensMatrixManager.tsx`
- Gestión de matrices: esfera, cilindro, eje, adición, base_price, cost, is_active.
- Tabla con agregar/editar/eliminar.

**5.5 API contact-lens-families**

- **POST** (`src/app/api/admin/contact-lens-families/route.ts`):
  - Acepta body con `matrices` (array opcional).
  - Crea familia y luego inserta cada matriz en `contact_lens_price_matrices`.
  - Schema: `createContactLensFamilyWithMatricesSchema`.

- **GET [id]** (`src/app/api/admin/contact-lens-families/[id]/route.ts`):
  - Incluye `contact_lens_price_matrices` por defecto (`?include_matrices=false` para excluir).
  - Select: `*, contact_lens_price_matrices(*)`.

- **PUT [id]** (`src/app/api/admin/contact-lens-families/[id]/route.ts`):
  - Acepta `matrices` opcional.
  - Si se envía: borra matrices existentes y crea las nuevas (sync completo).
  - Schema: `updateContactLensFamilyWithMatricesSchema`.

**5.6 Schemas Zod**

- `createContactLensFamilyWithMatricesSchema`: familia + matrices (sin `contact_lens_family_id` en matrices).
- `updateContactLensFamilyWithMatricesSchema`: campos parciales de familia + matrices opcional.
- `contactLensPriceMatrixInputSchema`: validación de rangos (sphere, cylinder, axis, addition).

---

## 6. Filtros de Stock - Count Preciso ⏸️ PENDIENTE (Opcional)

### Situación actual

- Los filtros `in_stock` y `low_stock_only` se aplican en post-procesamiento en memoria.
- La paginación puede verse afectada (el total no refleja correctamente los filtros).

### Opción A (recomendada, no implementada)

- Ejecutar una query separada con los mismos filtros para obtener el total real cuando se usen estos filtros.
- Menor esfuerzo que crear vistas o subqueries.

### Opción B (mayor complejidad)

- Crear vista o subquery que una `products` con `product_branch_stock` y permita filtrar por `available_quantity` y `low_stock_threshold` en la DB.

---

## Archivos Modificados (Resumen)

| Archivo                                                    | Cambios                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/app/api/admin/products/route.ts`                      | Filtro branch_id en GET; creación org-wide en POST; low_stock_threshold en POST      |
| `src/app/api/admin/products/[id]/route.ts`                 | low_stock_threshold en PATCH                                                         |
| `src/app/api/admin/pos/process-sale/route.ts`              | Params auditoría en update_product_stock                                             |
| `src/app/api/admin/pos/refund/route.ts`                    | Params auditoría                                                                     |
| `src/app/api/admin/orders/[id]/cancel/route.ts`            | Params auditoría                                                                     |
| `src/app/admin/products/add/page.tsx`                      | Campo low_stock_threshold                                                            |
| `src/app/admin/products/edit/[id]/page.tsx`                | Campo low_stock_threshold                                                            |
| `src/app/admin/products/index.tsx`                         | Botón contact-lens → /new                                                            |
| `src/components/admin/lenses/LensFamiliesList.tsx`         | Eliminar botón duplicado                                                             |
| `src/components/admin/lenses/ContactLensFamiliesList.tsx`  | Eliminar botón duplicado                                                             |
| `src/app/admin/contact-lens-families/new/page.tsx`         | **Nuevo**                                                                            |
| `src/app/admin/contact-lens-families/[id]/page.tsx`        | **Nuevo**                                                                            |
| `src/components/admin/lenses/ContactLensFamilyWizard.tsx`  | **Nuevo**                                                                            |
| `src/components/admin/lenses/ContactLensMatrixManager.tsx` | **Nuevo**                                                                            |
| `src/app/api/admin/contact-lens-families/route.ts`         | POST con matrices                                                                    |
| `src/app/api/admin/contact-lens-families/[id]/route.ts`    | GET con matrices; PUT con sync de matrices                                           |
| `src/lib/api/validation/zod-schemas.ts`                    | createContactLensFamilyWithMatricesSchema, updateContactLensFamilyWithMatricesSchema |

---

## Checklist de Pruebas Manuales

Use esta lista para validar que todo funciona correctamente después del despliegue.

### 1. Botones y navegación

- [ ] En `/admin/products`, tab "Familias Ópticas": solo hay un botón "Nueva Familia Óptica" (en el header).
- [ ] En `/admin/products`, tab "Contactología": solo hay un botón "Nueva Familia Contacto" (en el header).
- [ ] El botón "Nueva Familia Contacto" lleva a `/admin/contact-lens-families/new` (no 404).
- [ ] El botón Editar en una familia de contacto lleva a `/admin/contact-lens-families/[id]` y carga correctamente.

### 2. Auditoría de inventario

- [ ] Realizar una venta en POS: verificar que en `inventory_movements` exista un registro con `movement_type = 'sale'`, `reference_type = 'order'`, `reference_id` = ID de la orden.
- [ ] Realizar un reembolso en POS: verificar registro con `movement_type = 'refund'`, `reference_type = 'refund'`.
- [ ] Cancelar una orden: verificar registro con `movement_type = 'refund'`, `reference_type = 'order_cancel'`.

### 3. low_stock_threshold

- [ ] Crear producto nuevo: el campo "Umbral de stock bajo" aparece y acepta valor (default 5).
- [ ] Editar producto existente: el campo "Umbral de stock bajo" se carga desde la sucursal y se puede modificar.
- [ ] Guardar producto: el valor se persiste en `product_branch_stock.low_stock_threshold`.

### 4. Visibilidad de productos por sucursal

- [ ] **Admin regular + sucursal A**: solo ve productos con `branch_id = A`.
- [ ] **Super admin + sucursal A**: ve productos con `branch_id = A` O `branch_id IS NULL`.
- [ ] **Super admin + vista global**: ve todos los productos de la organización.
- [ ] **Super admin en vista global**: al crear producto sin sucursal, `branch_id = null` y se crea stock en todas las sucursales con quantity=0.

### 5. Familias de lentes de contacto (creación)

- [ ] Ir a `/admin/contact-lens-families/new`.
- [ ] Paso 1: completar nombre, marca, tipo de uso, modalidad, etc.
- [ ] Paso 2: agregar al menos una matriz de precios (rangos esfera, cilindro, eje, adición, precio, costo).
- [ ] Crear familia: se crea la familia y las matrices en una sola operación.
- [ ] Redirección a `/admin/products?tab=contact-lens-families`.

### 6. Familias de lentes de contacto (edición)

- [ ] Desde la lista de familias de contacto, hacer clic en Editar.
- [ ] Se carga la familia con sus matrices.
- [ ] Modificar datos de familia y/o matrices.
- [ ] Guardar: se actualiza familia y se sincronizan matrices (reemplazo completo).
- [ ] Verificar que las matrices eliminadas ya no aparecen.

### 7. Integración general

- [ ] Las familias de contacto creadas/editadas aparecen en cotizaciones y trabajos si aplica.
- [ ] El cálculo de precio de lentes de contacto (`calculate_contact_lens_price`) sigue funcionando con las matrices creadas desde el wizard.

---

## Notas Adicionales

- **RLS**: Las políticas existentes en `contact_lens_families` y `contact_lens_price_matrices` siguen aplicando. Los admins solo ven y modifican datos de su organización.
- **Categorías**: El wizard filtra categorías por slugs (`lentes-contacto`, `monofocales`, etc.). Si no hay categorías, el select mostrará "Sin categoría".
- **Matrices vacías en edición**: En modo edición se permite guardar con 0 matrices (se eliminan todas). En creación se exige al menos una matriz.
