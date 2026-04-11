# Plan de Implementación - Completar P0: Optimización UI/UX y Arquitectura POS

**Fecha:** 11 de abril de 2026  
**Estado:** 📋 Planificado  
**Duración estimada:** 8-12 horas

---

## 📋 Resumen Ejecutivo

El proyecto P0 de optimización del POS está aproximadamente **75% completado**. Las fases 1-7 de refactorización están terminadas, pero quedar funcionalidad pendiente por implementar y errores TypeScript por corregir.

### Avances logrados

- `page.tsx`: 7,360 → 12 líneas (solo re-export)
- POSPageContent.tsx: 740 líneas con usePOS() hook
- 8+ hooks reutilizables
- 15+ componentes modulares
- Errores TypeScript POS: ~259 → 0

###Pendiente real

1. Corregir errores TypeScript en cash-register (~32 errores)
2. Implementar descuentos en carrito (BUG-POS-2)
3. Completar testing y validaciones

---

## 🎯 Tareas por Implementar

### TAREA 1: Corregir Errores TypeScript en Cash-Register ⏸️ P0

#### Problema

```
src/app/admin/cash-register/[id]/page.tsx:
  - Línea 203: error TS2322: Type 'unknown' is not assignable to type '"default" | "secondary" | "destructive" | "outline" | "healty" | null | undefined'
  - Línea 210: Mismo error

src/app/admin/cash-register/orders/[id]/page.tsx:
  - ~30 errores: Property 'XXX' does not exist on type '{}'
```

#### Análisis

El problema en `[id]/page.tsx` (líneas 203, 210):

```tsx
// Código actual (problemático)
if (status === "closed" && reopenedAt) {
  const statusConfig = config.reopened || config[status]; // ← Puede ser undefined
  return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
}
```

El tipo de `statusConfig` puede ser `undefined`, causando que `.variant` sea `unknown`.

El problema en `orders/[id]/page.tsx`:

```tsx
// order se define como unknown
const [order, setOrder] = useState<unknown>(null);
// Luego intenta acceder: order.status, order.payment_status, etc.
```

#### Solución

**Paso 1.1: Corregir `[id]/page.tsx`**

```tsx
// Cambiar líneas 195-211 por:
const getStatusBadge = (status: string, reopenedAt?: string | null) => {
  const config: Record<
    string,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      label: string;
    }
  > = {
    draft: { variant: "outline", label: "Borrador" },
    confirmed: { variant: "secondary", label: "Confirmado" },
    reviewed: { variant: "secondary", label: "Revisado" },
    closed: { variant: "default", label: "Cerrada" },
    reopened: { variant: "secondary", label: "Abierta" },
  };

  if (status === "closed" && reopenedAt) {
    return config.reopened || { variant: "outline", label: status };
  }

  return config[status] || { variant: "outline", label: status };
};

// Uso:
const badge = getStatusBadge(status, reopenedAt);
return <Badge variant={badge.variant}>{badge.label}</Badge>;
```

**Paso 1.2: Corregir `orders/[id]/page.tsx`**

```tsx
// Definir interfaz
interface OrderDetail {
  id: string;
  order_number: string;
  created_at: string;
  status: "completed" | "cancelled" | "processing";
  payment_status: "paid" | "partial" | "pending" | "refunded";
  cancellation_reason?: string | null;
  // otros campos...
}

// Cambiar useState
const [order, setOrder] = useState<OrderDetail | null>(null);

// Cambiar fetch
const data = await response.json();
setOrder(data.order as OrderDetail);

// O usar assertion más específico después del fetch
setOrder(data.order);
```

**Archivos a modificar:**

| Archivo                                            | Cambios                  |
| -------------------------------------------------- | ------------------------ |
| `src/app/admin/cash-register/[id]/page.tsx`        | Líneas 195-211, 203, 210 |
| `src/app/admin/cash-register/orders/[id]/page.tsx` | useState, fetch, tipos   |

**Tiempo estimado:** 1-2 horas

---

### TAREA 2: Implementar Descuentos en Carrito (BUG-POS-2) ⏸️ P1

#### Análisis del Estado Actual

Revisando `POSCart.tsx` (159 líneas):

- Muestra items, subtotal, IVA, total
- **NO tiene** sección de descuentos
- La lógica de descuentos existe a nivel de `POSPageContent.tsx` pero no está expuesta en el UI del carrito

#### Implementación

**Paso 2.1: Crear hook usePOSDiscount**

```typescript
// src/app/admin/pos/hooks/usePOSDiscount.ts

interface UsePOSDiscountReturn {
  discountType: "percentage" | "amount";
  discountValue: number;
  discountAmount: number;
  effectiveSubtotal: number;
  effectiveTotal: number;
  setDiscountType: (type: "percentage" | "amount") => void;
  setDiscountValue: (value: number) => void;
  applyDiscount: (subtotal: number) => void;
  clearDiscount: () => void;
  isDiscountValid: (subtotal: number) => boolean;
}

export function usePOSDiscount() {
  const [discountType, setDiscountType] = useState<"percentage" | "amount">(
    "percentage",
  );
  const [discountValue, setDiscountValue] = useState<number>(0);

  const discountAmount = useMemo(() => {
    // Validar límites aquí
  }, [discountType, discountValue]);

  // ... resto de implementación
}
```

**Paso 2.2: Extender POSCart para mostrar descuentos**

```tsx
// En POSCart.tsx, agregar props:
interface POSCartProps {
  // ... props existentes
  discountType?: "percentage" | "amount";
  discountValue?: number;
  discountAmount?: number;
  onDiscountChange?: (type: "percentage" | "amount", value: number) => void;
  onClearDiscount?: () => void;
}

// Agregar sección en el UI del footer del carrito
```

**Paso 2.3: Integrar en POSPageContent**

```tsx
// Usar el hook y pasar props a POSCart
const { discountType, discountValue, discountAmount, ... } = usePOSDiscount();

// Calcular totals con descuento
const subtotalWithDiscount = subtotal - discountAmount;
```

**Archivos a crear/modificar:**

| Archivo                                     | Acción        |
| ------------------------------------------- | ------------- |
| `src/app/admin/pos/hooks/usePOSDiscount.ts` | Crear (nuevo) |
| `src/app/admin/pos/components/POSCart.tsx`  | Extender      |
| `src/app/admin/pos/POSPageContent.tsx`      | Integrar      |
| `src/app/admin/pos/components/index.ts`     | Exportar      |

**Tiempo estimado:** 2-3 horas

---

### TAREA 3: Verificar Integraciones Existentes ⏸️ P1

#### 3.1 BUG-CAJA-1: Selector de Sucursal

**Estado:** Ya implementado en `POSBranchSelector.tsx` (127 líneas)

Verificar que:

- Se muestra cuando `currentBranchId` es null y `isSuperAdmin` es true
- El callback `onBranchSelected` funciona

**Ubicación:** `src/app/admin/pos/components/POSBranchSelector.tsx`

**Acción:** Testing manual para verificar integración en POSPageContent

---

#### 3.2 BUG-POS-3: Presupuesto desde Receta Externa

**Estado:** Según docs, completado. Verificar código

Buscar en `POSPageContent.tsx`:

- Función para crear presupuesto desde cliente+receta externo
- Botón en UI

**Acción:** Revisar código y testing manual

---

### TAREA 4: Testing y Validaciones ⏸️ P0

#### Checklist de Validaciones

| #   | Validación | Comando              | Objetivo                    |
| --- | ---------- | -------------------- | --------------------------- |
| 4.1 | ESLint     | `npm run lint`       | 0 errores/warnings críticos |
| 4.2 | TypeScript | `npm run type-check` | 0 errores                   |
| 4.3 | Build      | `npm run build`      | Build exitoso               |
| 4.4 | Tests      | `npm run test`       | Tests pasando               |

#### Testing Manual (Flujos)

Ver checklist existente: `docs/07-testing/CHECKLISTS/POS_TEST_CHECKLIST.md`

| Flujo | Descripción                   |
| ----- | ----------------------------- |
| FM1   | Apertura/cierre de caja       |
| FM2   | Venta simple (productos)      |
| FM3   | Venta con descuentos          |
| FM4   | Venta con cliente             |
| FM5   | Venta con método de pago      |
| FM6   | Carga de presupuesto al POS   |
| FM7   | Venta con work order (lentes) |
| FM8   | Devoluciones                  |

**Tiempo estimado:** 2-3 horas

---

### TAREA 5: Documentación Final ⏸️ P2

Actualizar `POS_OPTIMIZATION_PROGRESS.md`:

- Marcar Fase 6 como completada
- Agregar métricas finales
- Documentar problemas encontrados y soluciones

---

## 📅 Cronograma

| #   | Tarea                     | Estimado | Dependencias | Estado         |
| --- | ------------------------- | -------- | ------------ | -------------- |
| T1  | Corregir TS cash-register | 1-2 hrs  | -            | ⏸️ Planificado |
| T2  | Descuentos en carrito     | 2-3 hrs  | T1           | ⏸️ Planificado |
| T3  | Verificar integraciones   | 1 hr     | -            | ⏸️ Planificado |
| T4  | Testing y validaciones    | 2-3 hrs  | T1, T2, T3   | ⏸️ Planificado |
| T5  | Documentación final       | 1 hr     | T4           | ⏸️ Planificado |

**Total:** 8-12 horas

---

## ✅ Checklist de Implementación

### T1: TypeScript Cash-Register

- [ ] Corregir variant type en [id]/page.tsx líneas 195-211
- [ ] Corregir order types en orders/[id]/page.tsx
- [ ] `npm run type-check` sin errores en cash-register

### T2: Descuentos

- [ ] Crear usePOSDiscount hook
- [ ] Extender POSCart con props de descuento
- [ ] Integrar en POSPageContent
- [ ] Testing: aplicar descuento porcentaje
- [ ] Testing: aplicar descuento monto fijo
- [ ] Testing: descuento no excede total

### T3: Integraciones

- [ ] Testing: BUG-CAJA-1 (selector sucursal)
- [ ] Testing: BUG-POS-3 (presupuesto desde receta)

### T4: Validaciones

- [ ] `npm run lint` pasando
- [ ] `npm run type-check` = 0 errores
- [ ] `npm run build` exitoso
- [ ] `npm run test` pasando
- [ ] Testing manual flujos principales

### T5: Documentación

- [ ] Actualizar POS_OPTIMIZATION_PROGRESS.md
- [ ] Commit con cambios

---

## 🔧 Notas Técnicas

### Errores TypeScript Especicos a Corregir

**cash-register/[id]/page.tsx línea 203:**

```tsx
// ANTES (error)
const statusConfig = config.reopened || config[status];
return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;

// DESPUÉS (corregido)
const badge = getStatusBadge(status, reopenedAt);
return <Badge variant={badge.variant}>{badge.label}</Badge>;
```

**cash-register/orders/[id]/page.tsx:**

```tsx
// ANTES (error)
const [order, setOrder] = useState<unknown>(null);
// ... order.status error

// DESPUÉS (corregido)
interface OrderDetail { ... }
const [order, setOrder] = useState<OrderDetail | null>(null);
```

### Hook usePOSDiscount (boceto)

```typescript
// stub para implementar
export function usePOSDiscount() {
  const [discountType, setDiscountType] = useState<"percentage" | "amount">(
    "percentage",
  );
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [applied, setApplied] = useState<boolean>(false);

  const calculateDiscount = (subtotal: number): number => {
    if (!applied || discountValue <= 0) return 0;
    if (discountType === "percentage") {
      return Math.round((subtotal * discountValue) / 100);
    }
    return Math.min(discountValue, subtotal); // No exceder
  };

  return {
    discountType,
    discountValue,
    applied,
    setDiscountType,
    setDiscountValue: (v: number) => {
      setDiscountValue(v);
      setApplied(true);
    },
    clearDiscount: () => {
      setDiscountValue(0);
      setApplied(false);
    },
    calculateDiscount,
    // ...
  };
}
```

---

## 📞 Referencias

- Documentación POS: `docs/03-modules/pos/POS_SYSTEM.md`
- Hooks existentes: `src/app/admin/pos/hooks/`
- Componentes: `src/app/admin/pos/components/`
- Testing checklist: `docs/07-testing/CHECKLISTS/POS_TEST_CHECKLIST.md`

---

**Nota:** Este plan es dinámico y puede ajustarse basado en hallazgos durante la implementación.
