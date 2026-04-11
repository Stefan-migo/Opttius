# Plan de Refactorización: Inventario vs Servicios de Taller

## Resumen Ejecutivo

Este documento detalla el plan de implementación para refactorizar la arquitectura de productos en Opttius, separando claramente el inventario físico de los servicios de taller. El objetivo es alinear el sistema con la realidad operativa de las ópticas chilenas.

---

## 1. Diagnóstico Actual

### 1.1 Estado del Sistema (Marzo 2026)

| Categoría          | Tabla Actual                      | Estado                   |
| ------------------ | --------------------------------- | ------------------------ |
| Armazones          | `products`                        | ✅ Correcto              |
| Accesorios         | `products`                        | ✅ Correcto              |
| Lentes oftálmicos  | `lens_families`                   | ✅ Correcto (servicio)   |
| Lentes de contacto | `contact_lens_inventory`          | ✅ COMPLETADO (mar 2026) |
| Tratamientos       | `quote_settings.treatment_prices` | ❌ Pendiente             |

### 1.2 Módulos Afectados

| Módulo            | Impacto                                                    | Complejidad | Estado        |
| ----------------- | ---------------------------------------------------------- | ----------- | ------------- |
| **POS**           | Buscar en products + lens_families + contact_lens_families | Media       | ✅ Completado |
| **Inventario LC** | Stock por graduación + sucursal                            | Alta        | ✅ Completado |
| **Quotes**        | Validar treatment_type, reglas de exclusión                | Alta        | ❌ Pendiente  |
| **Work Orders**   | Agregar flag stock vs tallado                              | Baja        | ❌ Pendiente  |

---

## 2. Arquitectura Implementada (Fase 1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA ACTUAL - LENTES CONTACTO                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ZONA 1: PRODUCTOS FÍSICOS (INVENTARIO REAL)                               │
│  ├── Armazones (frames) → products + product_branch_stock                   │
│  ├── Accesorios → products + product_branch_stock                           │
│  └── Lentes de Contacto → contact_lens_inventory (NUEVO!)                   │
│                                                                             │
│  ZONA 2: SERVICIOS DE TALLER (WORK ORDERS)                                  │
│  ├── Lentes oftálmicos tallados → lens_families → lab_work_orders          │
│  └── Tratamientos de laboratorio → treatments (pendiente)                  │
│                                                                             │
│  ZONA 3: CATÁLOGO DE REFERENCIA (SIN STOCK)                                 │
│  ├── Lentes de contacto (especiales) → contact_lens_families                │
│  └── Tratamientos disponibles → treatments (pendiente)                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Nueva Tabla: contact_lens_inventory

```sql
contact_lens_inventory (
  id UUID PRIMARY KEY,
  contact_lens_family_id UUID,  -- Familia de LC
  branch_id UUID,               -- Sucursal
  sphere_min DECIMAL(5,2),      -- Esfera mínima del rango
  sphere_max DECIMAL(5,2),      -- Esfera máxima del rango
  cylinder_min DECIMAL(5,2),    -- Cilindro mínimo del rango
  cylinder_max DECIMAL(5,2),    -- Cilindro máximo del rango
  quantity INTEGER,             -- Stock (cajas)
  min_stock_threshold INTEGER,  -- Umbral de alerta
  is_active BOOLEAN,
  created_at, updated_at
)
```

**Características:**

- ✅ Stock por **graduación específica** (sphere/cylinder ranges)
- ✅ Stock por **sucursal** (branch_id)
- ✅ Sistema deencargos integrado cuando no hay stock
- ✅ Fuente de verdad: `contact_lens_inventory` (NO product_branch_stock)

---

## 3. Implementación Completada (Marzo 2026)

### Tareas Fase 1 - COMPLETADAS ✅

| #   | Tarea                                                        | Complejidad | Estado |
| --- | ------------------------------------------------------------ | ----------- | ------ |
| 1.1 | Agregar `contact_lens` como product_type válido              | Baja        | ✅     |
| 1.2 | Crear script migración: contact_lens_families → products     | Alta        | ✅     |
| 1.3 | Crear contact_lens_inventory para stock por graduación       | Alta        | ✅     |
| 1.4 | Actualizar POS: buscar y vender LC con verificación de stock | Alta        | ✅     |
| 1.5 | Crear UI para gestión de inventario LC (por graduación)      | Alta        | ✅     |
| 1.6 | Crear sistema de encargos para LC sin stock                  | Media       | ✅     |
| 1.7 | Excluir LC de product_branch_stock (legacy)                  | Media       | ✅     |

### Archivos Creados

#### Base de Datos

- `supabase/migrations/20260401000000_create_contact_lens_inventory.sql`
  - Tabla `contact_lens_inventory`
  - Funciones RPC: `check_contact_lens_stock()`, `reduce_contact_lens_stock()`
  - RLS policies
  - Seeder de datos demo

- `supabase/migrations/20260415000000_create_contact_lens_encargos.sql`
  - Tabla `contact_lens_encargos` para encargos/órdenes de compra

#### API Routes

- `/api/admin/contact-lens-inventory/route.ts` - CRUD inventario LC
- `/api/admin/contact-lens-encargos/route.ts` - CRUD encargos

#### Servicios

- `src/lib/api/services/contactLensInventoryService.ts`
- `src/lib/api/services/contactLensEncargoService.ts`

#### Componentes Frontend

- `src/app/admin/pos/components/ContactLensSelector.tsx`
  - Selector de familia LC
  - Input de graduación (manual o desde receta)
  - Verificación de stock por graduación
  - Dialog de encargo si no hay stock

- `src/components/admin/lenses/ContactLensInventoryManager.tsx`
  - UI para gestionar inventario LC
  - Agregar/editar stock por rango de graduación
  - Filtering por familia y sucursal

### Modificaciones a Archivos Existentes

- `src/app/admin/products/index.tsx` - Sub-tabs "Familias" e "Inventario" en Contactología
- `src/app/api/admin/pos/process-sale/route.ts` - Reduce stock de contact_lens_inventory (NO de product_branch_stock)
- `src/app/admin/pos/components/POSAdvancedSale.tsx` - Integración con ContactLensSelector

---

## 4. Flujo de Venta de LC (Implementado)

```
1. Cliente selecciona "Lentes de Contacto" en POS
   ↓
2. Selecciona familia (Acuvue, Biofinity, etc.)
   ↓
3. Sistema carga graduación (desde receta del cliente o manual)
   ↓
4. Sistema verifica stock en contact_lens_inventory:
   - Busca por familia_id + branch_id + sphere + cylinder
   ↓
5.SI hay stock: mostrar "Disponible" → continuar venta
   NO hay stock: mostrar "Sin stock" → Opción de solicitar encargo
   ↓
6.Al confirmar venta: reduce stock de contact_lens_inventory (OD + OS)
   ↓
7.Genera_order con contact_lens_* fields en la orden
```

---

## 5. Estado Actual: Fases 1, 2 y 3 Completadas

### FASE 2: Tabla Treatments con Treatment Type (IMPLEMENTADO - Enfoque Simplificado)

| #   | Tarea                                  | Complejidad | Estado |
| --- | -------------------------------------- | ----------- | ------ |
| 2.1 | Sistema simplificado en quote_settings | Baja        | ✅     |
| 2.2 | UI en Quote Settings                   | Media       | ✅     |
| 2.3 | Treatments en CreateQuoteForm          | Media       | ✅     |
| 2.4 | Treatments en POSAdvancedSale          | Media       | ✅     |

> **Nota:** Se optó por enfoque simplificado (quote_settings) en lugar de tabla treatments compleja.

### FASE 3: Cristales Stock vs Tallado (IMPLEMENTADO)

| #   | Tarea                                                            | Complejidad | Estado |
| --- | ---------------------------------------------------------------- | ----------- | ------ |
| 3.1 | Agregar `is_stock_available` a lens_families                     | Baja        | ✅     |
| 3.2 | Agregar `stock_sphere_max`, `stock_cylinder_max` a lens_families | Media       | ✅     |
| 3.3 | Crear lógica en Quotes: mostrar opción stock vs tallado          | Alta        | ✅     |
| 3.4 | Crear lógica en POS: mostrar opción stock vs tallado             | Alta        | ✅     |
| 3.5 | Actualizar Work Orders: marcar tipo de cristal                   | Media       | ✅     |

**Migración:** `supabase/migrations/20260420000000_add_stock_fields_lens_families.sql`

---

## 6. Testing - Fase 1 Completado

### Pruebas Realizadas

- ✅ Crear producto tipo contact_lens
- ✅ Agregar stock a contact_lens_inventory por graduación
- ✅ Vender LC desde POS → reducir stock de contact_lens_inventory
- ✅ Verificar stock insuficiente → mostrar opción de encargo
- ✅ Crear encargo cuando no hay stock
- ✅ Stock por sucursal (branch_id) funciona correctamente

### Pendiente Testing

- [ ] Quotes con LC desde products
- [ ] Alertas de stock bajo en dashboard
- [ ] Sincronización entre familias y productos

---

## 7. Decisiones Técnicas Importantes

### Stock Legacy vs Nuevo

**Decisión:** Usar `contact_lens_inventory` como fuente de verdad para LC, NO `product_branch_stock`.

**Justificación:**

- `product_branch_stock` solo maneja cantidad simple (ej: 50 cajas)
- LC requiere stock por graduación específica (sphere/cylinder)
- El sistema de venta busca primero en `contact_lens_inventory`

**Implementación:**

- El código de `process-sale` excluye productos tipo `contact_lens` del `stockReductionsPayload`
- Solo reduce de `contact_lens_inventory` usando las funciones RPC

### Gestión por Sucursal

**Decisión:** Cada sucursal gestiona su propio inventario de LC.

**Justificación:**

- Cada óptica puede tener diferentes niveles de stock
- Allows for branch-specific pricing and inventory

**URL de acceso:** `/admin/products?tab=contact-lens-families&contactLensSubTab=inventory`

---

## 8. Referencias

- Schema actual: `supabase/`
- Docs de módulos: `docs/03-modules/`
- Componente UI: `src/components/admin/lenses/ContactLensInventoryManager.tsx`

---

**Documento creado:** 2026-03-30
**Última actualización:** 2026-03-31
**Estado:** Fase 1 ✅ | Fase 2 ✅ | Fase 3 ✅ implementada (pendiente testing)
