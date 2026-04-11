# Plan de Implementación - Bug Fixes POS

**Fecha:** 29 de marzo de 2026  
**Estado:** Planificado  
**Duración estimada:** 5-7 horas

---

## 📋 Resumen

Este documento detalla el plan de implementación para corregir 3 bugs del módulo POS:

1. **BUG-CAJA-1**: Mensaje de selección de sucursal para super admins
2. **BUG-POS-2**: Interfaz de descuentos visible en móvil
3. **BUG-POS-3**: Botón para crear presupuesto desde receta externa

---

## 🐛 BUG-CAJA-1: Mensaje de Selección de Sucursal

### Problema Identificado

**Ubicación:** `src/app/admin/pos/page.tsx` líneas 3541, 6374

**Descripción:**

- Los super admins en modo global ven error al intentar procesar pago
- No hay mensaje claro indicando que deben seleccionar una sucursal
- La validación solo está en backend (líneas 716-728)

**Código actual:**

```tsx
// Línea 3541 - Solo muestra alerta para no-superadmins
{!isSuperAdmin && effectiveBranchId && (

// Línea 717 - Retorna sin mensaje para super admins
if (!effectiveBranchId && !isSuperAdmin) return;
```

### Solución Propuesta

Crear un componente `POSBranchSelectorAlert` que muestre:

1. **Para super admins sin sucursal seleccionada**: Mensaje claro con botón para abrir selector
2. **Para usuarios normales**: Comportamiento actual (alert de caja cerrada)

### Implementación

#### Paso 1: Crear componente de alerta (nuevo archivo o en-page)

```tsx
// Componente: POSBranchSelectorAlert
- Props: { branches: Branch[], onSelectBranch: (id) => void }
- Diseño: Alert con icono + Select dropdown + botón "Seleccionar"
- Ubicación: Above the cart, visible immediately on page load
```

#### Paso 2: Modificar página POS

```tsx
// Reemplazar línea 3541:
{!isSuperAdmin && effectiveBranchId && (

// Por:
{!effectiveBranchId && isSuperAdmin ? (
  <BranchSelectorAlert branches={branches} onSelectBranch={handleSelectBranch} />
) : !isSuperAdmin && effectiveBranchId && (
```

#### Paso 3: Deshabilitar botón "Cobrar" si no hay sucursal

```tsx
// En el botón de cobrar (línea 6351-6374)
disabled={
  isCashOpen === false ||
  !effectiveBranchId  // ← AGREGAR ESTA CONDICIÓN
}
```

### Archivos a Modificar

| Archivo                      | Cambios                    |
| ---------------------------- | -------------------------- |
| `src/app/admin/pos/page.tsx` | Líneas ~3541, ~6374, ~6411 |

### Tiempo Estimado

**1-2 horas**

---

## 🐛 BUG-POS-2: Descuentos en Carrito (Visible en Móvil)

### Problema Identificado

**Ubicación:** `src/app/admin/pos/page.tsx` líneas 6038-6039

**Descripción:**

- La tarjeta de descuentos existe pero está en el panel derecho (`hidden lg:flex`)
- No es visible en dispositivos móviles ni tablets
- Los usuarios móviles no pueden aplicar descuentos

**Código actual:**

```tsx
// Línea 6038-6039
{/* Right Panel - Cart, Payment (desktop only; mobile uses bottom drawer) */}
<div className="hidden lg:flex w-full lg:w-1/3 flex-col ...">
```

### Solución Propuesta

Agregar la interfaz de descuentos al drawer de pago móvil o como una sección colapsable.

### Implementación

#### Opción A: Agregar al Mobile Payment Drawer

1. **Encontrar el drawer de pago móvil** (buscar `mobilePaymentDrawerOpen`)
2. **Agregar la sección de descuentos** antes del método de pago

#### Opción B: Agregar como sección colapsable en el carrito móvil

1. **Crear expandable section** en el área del carrito móvil
2. **Mover la lógica de descuentos** (ya existe: líneas 415-422, 2641-2715)

#### Código de referencia (ya existe):

```tsx
// Estados (líneas 415-422)
const [cartDiscountType, setCartDiscountType] = useState<"percentage" | "amount">("percentage");
const [cartDiscountValue, setCartDiscountValue] = useState<number>(0);

// Función (líneas 2641-2715)
const applyCartDiscount = () => { ... }

// UI (líneas 6055-6108) - EXISTE, solo mover a ubicación visible en móvil
```

### Archivos a Modificar

| Archivo                      | Cambios                                          |
| ---------------------------- | ------------------------------------------------ |
| `src/app/admin/pos/page.tsx` | Agregar sección descuentos a móvil (~línea 6038) |

### Tiempo Estimado

**2-3 horas**

---

## 🐛 BUG-POS-3: Botón Crear Presupuesto desde Receta Externa

### Problema Identificado

**Ubicación:** `src/app/admin/pos/page.tsx` líneas 1553-1716, 4659-4679

**Descripción:**

- Diálogo crea cliente y receta pero NO presupuesto
- Después de crear cliente+receta, usuario debe salir del flujo para crear presupuesto
- No hay integración con `quoteService.createQuote()`

**Código actual:**

```tsx
// Línea 4659-4679 - Solo tiene un botón
<Button onClick={handleCreateExternalCustomerWithPrescription}>
  Crear Cliente y Receta
</Button>

// No existe: botón para crear presupuesto
```

### Solución Propuesta

Agregar segundo botón "Crear Presupuesto" que:

1. Cree cliente + receta (como actualmente)
2. Cree también un presupuesto vinculado
3. Muestre el presupuesto en el formulario o redireccione

### Implementación

#### Paso 1: Extender función existente

```tsx
// Modificar handleCreateExternalCustomerWithPrescription
// O crear nueva función:

const handleCreateExternalCustomerWithQuote = async () => {
  // 1. Crear cliente (existente)
  const newCustomer = await customerService.createCustomer({...});

  // 2. Crear receta (existente)
  const newPrescription = await customerService.createPrescription(...);

  // 3. NUEVO: Crear presupuesto
  const newQuote = await quoteService.createQuote({
    customer_id: newCustomer.id,
    prescription_id: newPrescription.id,
    // ... otros campos necesarios
  });

  // 4. NUEVO: Mostrar en UI o redirigir
  setSelectedCustomer(newCustomer);
  loadQuoteToPOS(newQuote.id); // Usar función existente
};
```

#### Paso 2: Agregar segundo botón en UI

```tsx
// Después del botón "Crear Cliente y Receta" (línea 4679)
<div className="flex gap-2">
  <Button onClick={handleCreateExternalCustomerWithPrescription}>
    Crear Cliente y Receta
  </Button>

  {/* NUEVO BOTÓN */}
  <Button variant="outline" onClick={handleCreateExternalCustomerWithQuote}>
    <FileText className="h-4 w-4 mr-2" />
    Crear Presupuesto
  </Button>
</div>
```

#### Paso 3: Revisar quoteService

Verificar que `quoteService.createQuote()` esté disponible y aceptar los parámetros necesarios.

### Archivos a Modificar

| Archivo                                | Cambios                                                |
| -------------------------------------- | ------------------------------------------------------ |
| `src/app/admin/pos/page.tsx`           | Líneas ~1554 (nueva función), ~4659-4679 (nuevo botón) |
| `src/lib/api/services/quoteService.ts` | Verificar `createQuote()`                              |

### Tiempo Estimado

**2-3 horas**

---

## 📅 Cronograma

| Bug        | Fase | Duración | Dependencias     | Estado        |
| ---------- | ---- | -------- | ---------------- | ------------- |
| BUG-CAJA-1 | 1    | 1-2 hrs  | -                | ✅ COMPLETADO |
| BUG-POS-2  | 2    | 2-3 hrs  | -                | ✅ COMPLETADO |
| BUG-POS-3  | 3    | 2-3 hrs  | Bug 1 (opcional) | ✅ COMPLETADO |

**Total: 5-7 horas** - **TODO COMPLETADO** ✅

---

## ✅ Checklist de Implementación

### BUG-CAJA-1 ✅ COMPLETADO

- [x] Crear componente `POSBranchSelectorAlert`
- [x] Agregar a página principal
- [x] Deshabilitar botón Cobrar si no hay sucursal
- [x] Test: Super admin sin sucursal ve mensaje claro
- [x] Test: Usuario normal funciona igual

### BUG-POS-2 ✅ COMPLETADO

- [x] Mover UI descuentos a ubicación móvil
- [x] Test: Descuentos visibles en móvil
- [x] Test: Cálculos correctos (porcentaje y monto)
- [x] Test: Descuento se muestra en total

### BUG-POS-3 ✅ COMPLETADO

- [x] Crear/extender función de creación
- [x] Agregar segundo botón en UI
- [x] Integrar con quoteService
- [x] Test: Presupuesto se crea correctamente
- [x] Test: Presupuesto se carga al POS

---

## 🔍 Notas Adicionales

### Descuentos (BUG-POS-2)

La funcionalidad YA EXISTE en el código:

- Estados: líneas 415-422
- Función: líneas 2641-2715
- UI desktop: líneas 6055-6108

Solo falta mover la UI a la versión móvil.

### Receta Externa (BUG-POS-3)

El flujo actual ya crea cliente y receta. Solo falta agregar la creación del presupuesto.

---

## 📞 Referencias

- Plan general: `docs/POS_IMPLEMENTATION_PLAN.md`
- Sistema POS: `docs/03-modules/pos/POS_SYSTEM.md`
- Código: `src/app/admin/pos/page.tsx`
