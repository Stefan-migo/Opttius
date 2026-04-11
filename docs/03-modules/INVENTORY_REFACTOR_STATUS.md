# Estado del Proyecto: Refactorización Inventario vs Servicios de Taller

**Última actualización:** 2026-03-31  
**Proyecto:** Opttius - Sistema SaaS para Ópticas

---

## ✅ ESTADO: FASE 3 COMPLETADA (Pendiente Testing)

> **AVISO:** La implementación de la Fase 3 está completa pero **NO ha sido probada**.
> Se requiere ejecutar la migración y realizar testing manual del flujo Quote → POS → Work Order.

---

## Resumen Ejecutivo

Este documento registra el progreso de la refactorización de la arquitectura de productos en Opttius, separando:

1. **Inventario físico** (armazones, accesorios, lentes de contacto)
2. **Servicios de taller** (lentes tallados, tratamientos)
3. **Catálogos de referencia** (lentes especiales, tratamientos disponibles)

---

## Plan General: 3 Fases

| Fase       | Descripción                               | Estado                        |
| ---------- | ----------------------------------------- | ----------------------------- |
| **Fase 1** | Lentes de Contacto como inventario físico | ✅ Completado (sin testing)   |
| **Fase 2** | Sistema de Tratamientos (simplificado)    | ✅ Completado (sin testing)   |
| **Fase 3** | Cristales Stock vs Tallado                | ✅ Implementado (sin testing) |

---

## Fase 3: Stock vs Tallado - ✅ IMPLEMENTADO (Sin Testing)

> ⚠️ **Estado del testing:** Sin testing realizado - requiere validación

### Decisión de Diseño

Se implementó un sistema que permite seleccionar **Stock (entrega inmediata)** vs **Tallado a pedido** cuando la familia de lentes tiene stock disponible.

### Campos Agregados a la Base de Datos

**lens_families:**

```sql
is_stock_available BOOLEAN DEFAULT FALSE
stock_sphere_min DECIMAL(5,2) DEFAULT -10.00
stock_sphere_max DECIMAL(5,2) DEFAULT 10.00
stock_cylinder_min DECIMAL(5,2) DEFAULT -4.00
stock_cylinder_max DECIMAL(5,2) DEFAULT 4.00
```

**lab_work_orders:**

```sql
lens_sourcing_type TEXT CHECK (lens_sourcing_type IN ('stock', 'surfaced')) DEFAULT 'surfaced'
```

**quotes:**

```sql
lens_sourcing_type TEXT -- Se guarda en el presupuesto
```

### Archivos Modificados

| Archivo                                                                 | Cambio                           |
| ----------------------------------------------------------------------- | -------------------------------- |
| `supabase/migrations/20260420000000_add_stock_fields_lens_families.sql` | Migración con nuevos campos      |
| `supabase-types.ts`                                                     | Tipos actualizados               |
| `src/types/supabase.ts`                                                 | Tipos actualizados               |
| `src/components/admin/CreateQuoteForm.tsx`                              | Selector Stock vs Tallado en UI  |
| `src/app/admin/pos/components/POSAdvancedSale.tsx`                      | Selector Stock vs Tallado en POS |
| `src/app/api/admin/quotes/[id]/convert/route.ts`                        | Pasa sourcing_type al work order |
| `src/app/api/admin/pos/process-sale/route.ts`                           | Pasa sourcing_type al work order |

### Flujo Implementado

```
1. Admin configura lens_families con is_stock_available = true
2. En Quotes/POS, al seleccionar familia con stock:
   → Se muestra radio buttons: "Stock (Entrega inmediata)" / "Tallado a pedido"
3. Usuario selecciona opción → se guardalens_sourcing_type en quote
4. Al convertir a Work Order:
   → lens_sourcing_type se propagalab_work_orders
5. Si sourcing_type = 'stock':
   → No se crea work order (entrega inmediata)
   → Se reduce stock de inventory (futuro)
6. Si sourcing_type = 'surfaced':
   → Se crea work order normal
```

### Cómo Habilitar Stock para una Familia

```sql
-- Habilitar stock para una familia específica
UPDATE lens_families
SET is_stock_available = TRUE
WHERE name ILIKE '%cr39%single%vision%';

-- Configurar rangos de graduación disponibles en stock
UPDATE lens_families
SET
  stock_sphere_min = -6.00,
  stock_sphere_max = 2.00,
  stock_cylinder_min = 0,
  stock_cylinder_max = -2.00
WHERE name ILIKE '%cr39%single%vision%';
```

### Pendiente Testing

- [ ] Aplicar migración a DB local
- [ ] Configurar lens_familiesdemo con stock
- [ ] Crear quote con lente stock → verificar selector visible
- [ ] Seleccionar "Stock" → verificar guardadokens_sourcing_type
- [ ] Cargar quote al POS → verificar mantiene selección
- [ ] Procesar venta → verificar no crea work order (entrega inmediata)
- [ ] Crear quote con "Tallado" → procesar venta → verificar work order creado con lens_sourcing_type='surfaced'

---

## Fase 2: Treatments - COMPLETADO ✅ (Enfoque Simplificado)

> ⚠️ **Estado del testing:** Sin testing realizado

### Decisión de Diseño

Después de analizar la realidad de las ópticas chilenas, se optó por un **enfoque simplificado** en lugar de una tabla treatments compleja.

### Tratamientos que VIENEN con el cristal (NO manipulables)

| Tratamiento         | Por qué no es manipulable                                 |
| ------------------- | --------------------------------------------------------- |
| **Polarizado**      | Lámina interna (sándwich), se compra el bloque polarizado |
| **Fotocromático**   | Tecnología Transitions de fábrica                         |
| **Filtro Luz Azul** | Ya viene en el AR moderno                                 |
| **Protección UV**   | Ya es estándar (salvo CR39 muy básico)                    |

### Tratamientos que se aplican en LABORATORIO LOCAL

| Tratamiento               | Proceso                          | Precio típico (CLP) |
| ------------------------- | -------------------------------- | ------------------- |
| **Anti-reflejante (AR)**  | Cámara de vacío, capas múltiples | 15.000              |
| **Anti-rayas / Top Coat** | Baño de laca endurecedora + UV   | 12.000              |
| **Tinte / Teñido**        | Olla con tintura caliente        | 15.000              |

### Implementación Actual

Los tratamientos se almacenan en `quote_settings.treatment_prices`:

```typescript
treatment_prices: {
  // Tratamientos de laboratorio local
  anti_reflective: number;    // Anti-reflejante
  scratch_resistant: number; // Anti-rayas
  tint: number;              // Tinte

  // Servicio personalizado
  custom_service?: {
    enabled: boolean;
    name: string;
    price: number;
  };
}
```

### Comparación: Antes vs Ahora

| treatment_key         | Precio   | Notas             |
| --------------------- | -------- | ----------------- |
| anti_reflective       | 15.000   | ✅ De laboratorio |
| scratch_resistant     | 12.000   | ✅ De laboratorio |
| tint                  | 15.000   | ✅ De laboratorio |
| custom_service        | variable | ✅ Personalizable |
| ~~blue_light_filter~~ | -        | ❌ Ya viene en AR |
| ~~uv_protection~~     | -        | ❌ Ya es estándar |
| ~~anti_fog~~          | -        | ❌ Spray/gamuza   |
| ~~photochromic~~      | -        | ❌ Tipo de lente  |
| ~~polarized~~         | -        | ❌ Tipo de lente  |

### Archivos del Sistema de Treatments

| Archivo                                            | Propósito                |
| -------------------------------------------------- | ------------------------ |
| `src/lib/api/services/quoteSettingsService.ts`     | Tipo treatment_prices    |
| `src/app/admin/quotes/settings/page.tsx`           | UI de configuración      |
| `src/components/admin/CreateQuoteForm.tsx`         | Treatments en formulario |
| `src/app/admin/pos/components/POSAdvancedSale.tsx` | Treatments en POS        |

### ¿Es suficiente el enfoque actual?

**✅ Es suficiente si:**

- Solo necesitas cobrar servicios de laboratorio local (AR, anti-rayas, tinte)
- No necesitas validaciones complejas de incompatibilidad
- Quieres simplicidad en la configuración

**❌ Es insuficiente si:**

- Necesitas validaciones automáticas (ej: "no puedes pedir tinte + polarizado")
- Necesitas precios por tipo de material
- Necesitas un catálogo de tratamientos más robusto

> **Nota:** La tabla `treatments` con validaciones de incompatibilidad fue considerada pero postergada para una fase futura si el negocio lo requiere.

---

## Fase 1: Lentes de Contacto - ✅ COMPLETADO (SIN TESTING)

> ⚠️ **Estado del testing:** Sin testing realizado - **NO VERIFICADO EN PRODUCCIÓN**

### Objetivo

Mover lentes de contacto de tabla dedicada (`contact_lens_families`) a inventario físico (`products` con `product_branch_stock`).

### Por qué es necesario

| Actualmente                         | Problema                       |
| ----------------------------------- | ------------------------------ |
| `contact_lens_families`             | No tiene control de stock real |
| Los LC se "agregan" a quotes/ventas | No se descuenta inventario     |
| No hay alertas de stock bajo        | No sabes cuándo reponer        |

### Arquitectura Propuesta

```
ANTES:                              DESPUÉS:
┌─────────────────────┐            ┌─────────────────────┐
│ contact_lens_      │            │ products            │
│ families           │            │ product_type =      │
│ - name             │            │   'contact_lens'    │
│ - brand            │            │ +                   │
│ - price            │            │ product_branch_stock│
│ (sin stock)        │            │ - quantity (stock)  │
└─────────────────────┘            │ - low_stock_alert   │
                                    └─────────────────────┘
```

### Migraciones Creadas y Ejecutadas ✅

> ⚠️ **Estas migraciones fueron ejecutadas en la DB local de Docker**

| #   | Migration                                             | Estado       |
| --- | ----------------------------------------------------- | ------------ |
| 1.1 | `20260330000001_add_contact_lens_product_type.sql`    | ✅ Ejecutada |
| 1.2 | `20260330000002_migrate_contact_lens_to_products.sql` | ✅ Ejecutada |
| 1.3 | `20260330000003_create_contact_lens_stock.sql`        | ✅ Ejecutada |

### Productos Migrados (DB Local)

| ID                                   | Nombre                                            | Precio  | Stock (Casa Matriz) | Stock (Providencia) |
| ------------------------------------ | ------------------------------------------------- | ------- | ------------------- | ------------------- |
| 70000000-0000-0000-0000-000000000001 | Johnson & Johnson - Acuvue Oasys 1-Day            | $45.991 | 20                  | 20                  |
| 70000000-0000-0000-0000-000000000002 | Alcon - Air Optix Plus HydraGlyde for Astigmatism | $55.991 | 20                  | 20                  |

### Cambios de Código Realizados

| Archivo                 | Cambio                                                               | Estado          |
| ----------------------- | -------------------------------------------------------------------- | --------------- |
| `process-sale/route.ts` | Actualizada lógica de reducción de stock para incluir `contact_lens` | ✅ Implementado |

### Tareas Completadas

| #   | Tarea                                            | Complejidad | Estado   |
| --- | ------------------------------------------------ | ----------- | -------- |
| 1.1 | Agregar `contact_lens` a product_type            | Baja        | ✅ Hecho |
| 1.2 | Migrar datos de contact_lens_families a products | Alta        | ✅ Hecho |
| 1.3 | Crear stock inicial en product_branch_stock      | Media       | ✅ Hecho |
| 1.4 | Actualizar POS para reducir stock de LC          | Media       | ✅ Hecho |
| 1.5 | Backward compatibility con quotes                | Media       | ✅ Hecho |

### Estado del Testing

| Test Case                                    | Estado        |
| -------------------------------------------- | ------------- |
| Migración exitosa de familias a products     | ❌ NO PROBADO |
| Stock inicial creado en product_branch_stock | ❌ NO PROBADO |
| POS puede reducir stock de LC                | ❌ NO PROBADO |
| Alerta de stock bajo funciona                | ❌ NO PROBADO |
| Quotes guardan referencia a products         | ❌ NO PROBADO |
| Backward compatibility                       | ❌ NO PROBADO |

---

## Fase 3: Stock vs Tallado - PENDIENTE ⏳

### Tareas Pendientes

| #   | Tarea                                            | Complejidad |
| --- | ------------------------------------------------ | ----------- |
| 3.1 | Agregar `is_stock_available` a lens_families     | Baja        |
| 3.2 | Agregar `stock_sphere_max`, `stock_cylinder_max` | Media       |
| 3.3 | Crear lógica en Quotes: stock vs tallado         | Alta        |
| 3.4 | Crear lógica en POS: stock vs tallado            | Alta        |
| 3.5 | Actualizar Work Orders: marcar tipo de cristal   | Media       |

---

## Documentación del Proyecto

```
docs/03-modules/
├── INVENTORY_REFACTOR_PLAN.md         # Plan general
├── INVENTORY_REFACTOR_STATUS.md       # Este archivo
├── TREATMENTS_TABLE_DESIGN.md         # Diseño simplificado de treatments
└── INVENTORY_PHASE1_CONTACT_LENS.md   # Detalles de implementación Fase 1
```

---

## Notas de la Discusión (2026-03-30)

### Puntos Clave

1. **Tratamientos:** Se validó que el enfoque simplificado (quote_settings) es suficiente para operaciones básicas. La tabla treatments con validaciones de incompatibilidad se considera para fase futura si el negocio lo requiere.

2. **Fase 1 implementada:** Se ejecutó la implementación de Lentes de Contacto como inventario físico:
   - Control de stock real (20 unidades por sucursal)
   - Migración de datos exitosa (2 productos)
   - Código actualizado para reducir stock

3. **SIN TESTING:** Ninguno de los cambios ha sido probado en entorno real. Se requiere:
   - Hacer una venta de LC en POS y verificar stock
   - Verificar que el stock se reduce correctamente
   - Probar el flujo completo de quotes → POS → Work Order

4. **Backward compatibility:** Mantener la tabla `contact_lens_families` para compatibilidad mientras se implementa la migración.

---

## Referencias

- NotebookLM Principal: `e071bebc-ce79-4b32-a040-61a6a9c331a3`
- Notebook Extendido: `17302d9d-7d70-4c8d-a774-49fbfca3c09d`
- Skills: `.opencode/skills/domain/`
- Migración Fase 3: `supabase/migrations/20260420000000_add_stock_fields_lens_families.sql`

---

**Documento actualizado:** 2026-03-31  
**Estado:** Migraciones aplicadas a DB remota - Tipos generados - Pendiente testing manual
