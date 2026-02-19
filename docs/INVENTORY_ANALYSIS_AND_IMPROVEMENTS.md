# Análisis del Sistema de Inventario - Devolución y Mejoras

**Fecha**: 18 de febrero de 2026  
**Objetivo**: Evaluar el estado actual y proponer mejoras para lograr un sistema de inventario de la más alta calidad para ópticas.

---

## 1. Resumen Ejecutivo

El sistema de inventario de Opttius tiene una **base arquitectónica sólida** con separación correcta entre catálogo (products) e inventario (product_branch_stock), multi-tenant y multi-sucursal. Sin embargo, existen **oportunidades de mejora** en consistencia, auditoría, configurabilidad y características óptica-específicas para alcanzar un nivel de gama alta.

**Calificación actual**: 7.5/10  
**Potencial con mejoras**: 9.5/10

---

## 2. Fortalezas Actuales

### 2.1 Arquitectura

- ✅ **Separación catálogo/inventario**: product_branch_stock correctamente desacoplado de products
- ✅ **Multi-sucursal**: Stock por branch_id con UNIQUE(product_id, branch_id)
- ✅ **RPC update_product_stock**: Función centralizada para cambios de stock con lógica consistente
- ✅ **available_quantity generado**: quantity - reserved_quantity calculado en DB
- ✅ **Vista products_with_stock**: Compatibilidad durante migración

### 2.2 Integración

- ✅ **POS**: Reducción de stock en process-sale con exclusión correcta de servicios e IDs temporales
- ✅ **Bulk operations**: update_inventory usa product_branch_stock y RPC
- ✅ **Import**: Mapeo a product_branch_stock con update_product_stock
- ✅ **Creación de productos**: stock_quantity inicial vía RPC

### 2.3 Óptica-Específico

- ✅ **product_type**: frame, lens, accessory, service con reglas diferenciadas
- ✅ **Exclusión de servicios**: product_type=service no reduce stock
- ✅ **Exclusión de IDs temporales**: frame-manual, lens-, treatments-, labor-, discount-
- ✅ **Campos ópticos**: frame*\*, lens*\*, optical_category en products

### 2.4 Multi-Tenant

- ✅ **organization_id**: Filtrado en products
- ✅ **Branch context**: x-branch-id para contexto de sucursal
- ✅ **Catálogo compartido**: Productos visibles en toda la org, stock por sucursal

---

## 3. Debilidades y Oportunidades de Mejora

### 3.1 CRÍTICO: Inconsistencia stock-helpers vs RPC

**Problema**: `stock-helpers.ts` implementa `updateProductStock` con UPDATE directo a la tabla, mientras que el POS y bulk usan el RPC `update_product_stock`. La API de productos [id] usa `updateProductStock` del helper.

**Riesgo**: La lógica puede divergir (ej: el RPC crea registro si no existe, el helper también pero con flujo diferente). En condiciones de concurrencia, el RPC es más seguro.

**Recomendación**:

- Unificar: que `updateProductStock` en stock-helpers llame al RPC en lugar de hacer UPDATE directo
- O deprecar el helper y usar siempre `supabase.rpc("update_product_stock", ...)` desde las APIs

### 3.2 CRÍTICO: low_stock_threshold hardcodeado

**Problema**: En múltiples lugares se usa `low_stock_threshold: 5` como valor fijo:

- stock-helpers.ts upsertProductStock
- process-sale al crear registro inicial
- Filtro low_stock_only compara con 5 en products/route.ts (línea 354)

**Recomendación**:

- Usar el valor de product_branch_stock.low_stock_threshold cuando exista
- Permitir configurar en UI al crear/editar producto o en ajustes de sucursal
- El filtro low_stock_only debe usar `available_quantity <= low_stock_threshold` del registro, no 5 fijo

### 3.3 ALTO: Sin auditoría de movimientos

**Problema**: No existe tabla `inventory_transactions` o similar. No hay trazabilidad de:

- Quién modificó el stock
- Cuándo y por qué (venta, ajuste, recepción, transferencia)
- Referencia a order_id, work_order_id, etc.

**Recomendación**:

- Crear tabla `inventory_movements` (product_id, branch_id, quantity_change, movement_type, reference_type, reference_id, created_by, created_at)
- Triggers o lógica en update_product_stock para insertar en movements
- UI para historial de movimientos por producto/sucursal

### 3.4 ALTO: reorder_point no utilizado

**Problema**: La columna `reorder_point` existe en product_branch_stock pero:

- No se expone en UI de productos
- No hay alertas ni sugerencias de compra cuando stock <= reorder_point
- No se usa en reportes

**Recomendación**:

- Añadir campo reorder_point en formularios de producto/sucursal
- Dashboard o alertas: "Productos bajo punto de reorden"
- Integración futura con órdenes de compra

### 3.5 MEDIO: Stock negativo permitido

**Problema**: El RPC usa GREATEST(0, ...) pero en process-sale no se valida stock suficiente antes de vender. Si quantity=2 y se venden 5, el RPC dejaría 0 (no -3), pero la venta se procesa igual.

**Recomendación**:

- Validar `available_quantity >= item.quantity` antes de procesar venta
- Devolver error 400 si stock insuficiente
- Opción de configuración: "Permitir venta con stock insuficiente" (para emergencias)

### 3.6 MEDIO: Columnas deprecadas en products

**Problema**: inventory_quantity, track_inventory, low_stock_threshold siguen en products. Código hace fallback a inventory_quantity cuando no hay product_branch_stock.

**Recomendación**:

- Fase 1: Eliminar todo uso de inventory_quantity en código (forzar product_branch_stock)
- Fase 2: Migración para poblar product_branch_stock desde inventory_quantity donde aplique
- Fase 3: DROP COLUMN de las columnas deprecadas

### 3.7 MEDIO: Sin transferencias entre sucursales

**Problema**: No existe flujo para mover stock de sucursal A a B.

**Recomendación**:

- API POST /api/admin/inventory/transfer
- Body: product_id, from_branch_id, to_branch_id, quantity
- Dos llamadas a update_product_stock (restar en A, sumar en B) en transacción
- Registrar en inventory_movements con type=transfer

### 3.8 BAJO: Filtros de stock en post-procesamiento

**Problema**: in_stock y low_stock_only se aplican después de fetchear productos. Con muchos productos, la paginación puede ser incorrecta (count no refleja filtros).

**Recomendación**:

- Para listados con filtros de stock: considerar subquery o vista materializada
- O aceptar limitación y documentar que el count puede ser aproximado cuando hay filtros de stock

### 3.9 BAJO: bulk update_inventory y branch_id

**Problema**: En bulk/route.ts, update_inventory obtiene stock de product_branch_stock pero no filtra por branch_id. Si un producto tiene stock en múltiples sucursales, ¿a cuál se aplica el ajuste?

**Recomendación**:

- Requerir branch_id en el body de update_inventory
- Aplicar ajuste solo a la sucursal indicada
- Si no se envía branch_id, considerar: error 400 o aplicar a todas las sucursales (documentar comportamiento)

---

## 4. Mejoras Óptica-Específicas

### 4.1 Lotes y caducidad (lentes de contacto)

- Lentes de contacto tienen fecha de caducidad
- Considerar tabla `product_branch_stock_lots` (product_id, branch_id, quantity, expiry_date, lot_number)
- FIFO en ventas: consumir primero los que caducan antes

### 4.2 Reservas para presupuestos

- Presupuesto pendiente podría reservar stock temporalmente
- reserved_quantity ya existe; falta flujo: crear presupuesto → reservar, convertir a venta → reducir quantity y reserved
- Expiración de reservas (cron job para liberar reservas antiguas)

### 4.3 SKU y códigos por tipo

- Convención: OPT-FR-001 (marco), OPT-AC-001 (accesorio), OPT-LC-001 (lente contacto)
- Validación de unicidad por organización

---

## 5. Plan de Acción Priorizado

| Prioridad | Acción                                      | Esfuerzo | Impacto |
| --------- | ------------------------------------------- | -------- | ------- |
| P0        | Unificar stock-helpers con RPC              | Bajo     | Alto    |
| P0        | Corregir low_stock_threshold hardcodeado    | Bajo     | Alto    |
| P1        | Validar stock suficiente antes de venta     | Bajo     | Alto    |
| P1        | Añadir reorder_point en UI                  | Medio    | Medio   |
| P2        | Crear inventory_movements y auditoría       | Alto     | Alto    |
| P2        | Requerir branch_id en bulk update_inventory | Bajo     | Medio   |
| P3        | Transferencias entre sucursales             | Medio    | Medio   |
| P3        | Eliminar columnas deprecadas de products    | Medio    | Bajo    |
| P4        | Lotes/caducidad para lentes de contacto     | Alto     | Medio   |
| P4        | Reservas para presupuestos                  | Alto     | Medio   |

---

## 6. Conclusión

El sistema de inventario tiene una base sólida y está bien integrado con POS, bulk e import. Las mejoras propuestas lo llevarían a un nivel de gama alta, con mayor trazabilidad, consistencia y características óptica-específicas. Se recomienda abordar primero las correcciones P0 y P1 para estabilidad y confiabilidad inmediata.
