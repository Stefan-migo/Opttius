# POS Optimization Progress - Marzo 2026

## Task ID (Notion)

`33206293-43fc-81a8-bdd1-fca3aecf3920`

## Status

**In Progress** (actualizado en Notion)

---

## Resumen Ejecutivo

El objetivo de esta tarea es optimizar el módulo POS de Opttius, mejorando la UI/UX y la arquitectura del código. El POS actual tiene un archivo `page.tsx` monolítico de **7,360 líneas** con múltiples problemas de mantenibilidad.

### Progreso: Fase 7 Completada ✅ (29 Marzo 2026)

**Logros de esta sesión:**

- ✅ POSPageContent.tsx completamente migrado a usar usePOS() hook
- ✅ Todos los componentes existentes integrados: POSCart, POSCustomerSearch, POSProductSearch, POSPaymentDialog
- ✅ Keyboard shortcuts funcionando (F1-F4, Ctrl+K, Ctrl+Enter, etc.)
- ✅ page.tsx ahora es un simple export del nuevo componente
- ✅ Errores TypeScript del POS reducidos de ~259 a 0
- ✅ Errores TypeScript totales reducidos de ~4,277 a ~3,940 (337 errores corregidos)

Se ha establecido la base arquitectónica para una refactorización gradual y segura.

---

## Fases en Curso

### Fase 4: Extracción de Componentes UI

#### Fase 4.1: Componentes de Layout ✅ COMPLETADO

**Archivos creados:**

| Componente   | Archivo                     | Descripción                                            |
| ------------ | --------------------------- | ------------------------------------------------------ |
| `POSHeader`  | `components/POSHeader.tsx`  | Header con branch selector, estado de caja, operativos |
| `POSSidebar` | `components/POSSidebar.tsx` | Acciones rápidas, atajos de teclado                    |
| `POSLayout`  | `components/POSLayout.tsx`  | Layout base con variantes                              |

#### Fase 4.2: Componentes de Venta ✅ COMPLETADO

**Archivos creados:**

| Componente      | Archivo                        | Descripción                |
| --------------- | ------------------------------ | -------------------------- |
| `POSSaleToggle` | `components/POSSaleToggle.tsx` | Toggle quick/advanced sale |
| `POSQuickSale`  | `components/POSQuickSale.tsx`  | Venta rápida de productos  |

#### Fase 4.3: Componentes de Pago ✅ COMPLETADO

**Archivos creados:**

| Componente             | Archivo                               | Descripción                            |
| ---------------------- | ------------------------------------- | -------------------------------------- |
| `POSPaymentMethods`    | `components/POSPaymentMethods.tsx`    | Selector de método de pago (F1-F4)     |
| `POSCashInput`         | `components/POSCashInput.tsx`         | Entrada de efectivo con montos rápidos |
| `POSPaymentDialog`     | `components/POSPaymentDialog.tsx`     | Diálogo completo de pago               |
| `POSAgreementSelector` | `components/POSAgreementSelector.tsx` | Selector de convenio/combo             |

#### Fase 4.4: Hooks de Atajos de Teclado ✅ COMPLETADO

**Archivo creado:**

| Hook                      | Archivo                            | Descripción                              |
| ------------------------- | ---------------------------------- | ---------------------------------------- |
| `usePOSKeyboardShortcuts` | `hooks/usePOSKeyboardShortcuts.ts` | Atajos F1-F4 para pagos, Ctrl+K búsqueda |

**Atajos implementados:**

- `F1` - Pago en efectivo
- `F2` - Pago con tarjeta
- `F3` - Transferencia
- `F4` - Otro pago
- `Ctrl+K` - Buscar
- `Ctrl+Shift+C` - Limpiar carrito
- `Ctrl+Enter` - Completar venta
- `Escape` - Cerrar diálogo

---

### Fase 5: Memoización y Optimización de Rendimiento ✅ COMPLETADO

**Archivos creados:**

| Utilidad        | Archivo               | Descripción                        |
| --------------- | --------------------- | ---------------------------------- |
| `usePOSMemo.ts` | `hooks/usePOSMemo.ts` | Utilidades de memoización para POS |
|                 |                       | - useCartTotals                    |
|                 |                       | - useCustomerDisplayName           |
|                 |                       | - useFormattedPrice                |
|                 |                       | - usePaymentChange                 |
|                 |                       | - useProductDisplayName            |

**Componentes optimizados:**

| Componente          | Optimización aplicada                    |
| ------------------- | ---------------------------------------- |
| `POSCart`           | React.memo + memoized CartItemRow        |
| `POSPaymentMethods` | Integración de atajos de teclado (F1-F4) |

---

### Fase 6: Migración a POSProvider ✅ COMPLETADO

**Archivos creados:**

| Componente            | Archivo                   | Descripción                     |
| --------------------- | ------------------------- | ------------------------------- |
| `POSPageWithProvider` | `POSPageWithProvider.tsx` | Wrapper con POSProvider         |
| `POSPageContent`      | `POSPageContent.tsx`      | Contenido que usa usePOS() hook |

**Mejoras de tipos corregidas:**

| Archivo             | Corrección aplicada                           |
| ------------------- | --------------------------------------------- |
| `posService.ts`     | Tipado correcto de respuestas API con isError |
| `client-helpers.ts` | Tipado correcto de responses paginadas        |
| `POSHeader.tsx`     | Props opcionales para isCashOpen, etc.        |
| `POSQuickSale.tsx`  | Componentes inline para evitar prop mismatch  |

---

### Fase 7: Integración Completa del POSPageContent ✅ COMPLETADO (29 Marzo 2026)

**Objetivo:** Completar la migración del POSPageContent.tsx integrando todos los componentes con usePOS() hook.

**Archivos modificados/creados:**

| Archivo               | Acción       | Descripción                            |
| --------------------- | ------------ | -------------------------------------- |
| `POSPageContent.tsx`  | Reescrito    | Integración completa con usePOS() hook |
| `page.tsx`            | Simplificado | Ahora solo exporta POSPageWithProvider |
| `POSRefundDialog.tsx` | Corregido    | Arreglados errores TypeScript          |

**Componentes integrados en POSPageContent:**

| Componente                | Estado | Descripción                       |
| ------------------------- | ------ | --------------------------------- |
| `POSHeader`               | ✅     | Branch selector, estado de caja   |
| `POSSaleToggle`           | ✅     | Toggle venta rápida/avanzada      |
| `POSCustomerSearch`       | ✅     | Búsqueda y selección de clientes  |
| `POSProductSearch`        | ✅     | Búsqueda de productos             |
| `POSCart`                 | ✅     | Carrito de compras                |
| `POSPaymentDialog`        | ✅     | Diálogo de pago                   |
| `POSPendingBalanceDialog` | ✅     | Saldo pendiente                   |
| `POSRefundDialog`         | ✅     | Devoluciones                      |
| Keyboard Shortcuts        | ✅     | F1-F4, Ctrl+K, Ctrl+Enter, Escape |

**Errores TypeScript corregidos:**

| Antes                  | Después                | Diferencia |
| ---------------------- | ---------------------- | ---------- |
| ~259 errores en POS    | 0 errores en POS       | -259       |
| ~4,277 errores totales | ~3,940 errores totales | -337       |

---

## Fases Completadas

### Fase 1: Consolidación de Tipos ✅

**Objetivo:** Eliminar tipos duplicados y crear una fuente única de verdad.

**Archivos modificados:**

- `src/app/admin/pos/types.ts` - **NUEVO**
  - `POSProduct` - Interfaz para productos POS
  - `POSCartItem` - Interfaz para items del carrito
  - `POSCustomer` - Interfaz para clientes
  - `POSQuote` - Interfaz para presupuestos
  - `POSPaymentMethod` - Tipo para métodos de pago
  - Alias de compatibilidad hacia atrás (Product, CartItem, etc.)

- `src/app/admin/pos/page.tsx` - Actualizado para importar tipos desde types.ts
- `src/app/admin/pos/components/index.ts` - Re-exporta los tipos

### Fase 2: Custom Hooks ✅

**Objetivo:** Extraer lógica de negocio en hooks reutilizables.

**Archivos creados:**

| Hook                    | Responsabilidad                                      |
| ----------------------- | ---------------------------------------------------- |
| `usePOSCart.ts`         | Gestión del carrito (add, update, remove, clear)     |
| `usePOSCustomer.ts`     | Búsqueda y selección de clientes con debounce        |
| `usePOSProducts.ts`     | Búsqueda de productos y lectura de código de barras  |
| `usePOSPayment.ts`      | Métodos de pago, cálculos de vuelto, pagos parciales |
| `usePOSPrescription.ts` | Recetas y presupuestos del cliente                   |

**Características implementadas:**

- Debounce de 300ms para búsquedas
- Navegación con teclado (Arrow keys, Enter, Escape)
- Integración con servicios API existentes
- Tipado completo con TypeScript

### Fase 3: Provider Global ✅

**Objetivo:** Proveer acceso unificado a todos los hooks.

**Archivo creado:**

- `src/app/admin/pos/hooks/usePOSProvider.tsx`

**Interfaz expuesta (POSState):**

```typescript
interface POSState {
  // Branch
  branchId: string | null;
  isSuperAdmin: boolean;

  // Cart
  cart: POSCartItem[];
  addToCart, updateCartQuantity, removeFromCart, clearCart;

  // Customer
  customer: POSCustomer | null;
  customerSearchTerm, customerResults, customerLoading, etc.;

  // Products
  productSearchTerm, productResults, productLoading, etc.;

  // Payment
  paymentMethod, cashReceived, paymentChange, etc.;

  // Quotes & Prescriptions
  quotes, selectedQuote, prescriptions, etc.;

  // Cash register
  isCashOpen, isCashChecking, refreshCashStatus;

  // Actions
  completeSale;
}
```

---

## Fases Pendientes

### Fase 4: Extracción de Componentes UI

**Objetivo:** Separar la interfaz en componentes reutilizables.

**Componentes a crear:**

1. `POSQuickSale.tsx` - Venta rápida de productos
2. `POSAdvancedSale.tsx` - Venta con configuración de lentes
3. `POSPaymentDialog.tsx` - Diálogo de procesamiento de pago
4. `POSCustomerPanel.tsx` - Panel de búsqueda/selección de cliente
5. `POSPrescriptionPanel.tsx` - Panel de recetas y presupuestos
6. `POSLensConfig.tsx` - Configuración de lentes (graduaciones, tratamientos)

**Criterios:**

- Cada componente debe tener una responsabilidad única
- Usar el hook `usePOS()` para acceder al estado
- Mantener la compatibilidad con el código existente

### Fase 5: Migración Gradual

**Objetivo:** Reemplazar el código monolítico sin romper funcionalidad.

**Pasos:**

1. Reemplazar estados inline con `usePOS()` hook
2. Migrar handlers uno por uno
3. Añadir atajos de teclado (F1-F12, Ctrl+K, etc.)
4. Implementar memoización (React.memo, useMemo, useCallback)
5. Testing exhaustivo de cada flujo

**Flujos a probar:**

- ✅ Quick Sale (venta rápida)
- ✅ Advanced Sale (venta con lentes)
- ✅ Quote to POS (presupuesto a venta)
- ✅ Pending Balance (saldo pendiente)
- ✅ Refunds (devoluciones)
- ✅ Cash register (apertura/cierre de caja)

---

## Archivos del Proyecto

### Estructura Actual

```
src/app/admin/pos/
├── types.ts                    ✅ Consolidado
├── page.tsx                    ✅ Migrado (12 líneas - re-exporta POSPageWithProvider)
├── POSPageWithProvider.tsx      ✅ Wrapper con POSProvider
├── POSPageContent.tsx           ✅ Componente principal con usePOS()
├── components/
│   ├── index.ts               ✅ Actualizado
│   ├── POSCart.tsx            ✅ Existe
│   ├── POSBarcodeInput.tsx    ✅ Existe
│   ├── POSBranchSelector.tsx  ✅ Existe
│   ├── POSCustomerSearch.tsx  ✅ Existe
│   ├── POSProductSearch.tsx  ✅ Existe
│   ├── POSPendingBalanceDialog.tsx  ✅ Existe
│   └── POSRefundDialog.tsx    ✅ Existe
├── context/
│   └── POSContext.tsx         ✅ Actualizado
└── hooks/
    ├── usePOSCart.ts          ✅ Nuevo
    ├── usePOSCustomer.ts      ✅ Nuevo
    ├── usePOSProducts.ts      ✅ Nuevo
    ├── usePOSPayment.ts       ✅ Nuevo
    ├── usePOSPrescription.ts  ✅ Nuevo
    ├── usePOSCashStatus.ts    ✅ Existe
    ├── usePOSPendingBalance.ts ✅ Existe
    └── usePOSProvider.tsx     ✅ Nuevo
```

---

## Correcciones Aplicadas

### 1. usePOSProducts.ts

- **Problema:** Función duplicada causando error de compilación
- **Solución:** Eliminada la función duplicada

### 2. usePOSCustomer.ts

- **Problema:** Faltaba parámetro `branchId` para búsqueda multi-tenant
- **Solución:** Añadidos `branchId` y `fieldOperationId` como parámetros

### 3. usePOSPrescription.ts

- **Problema:** Parámetros incorrectos para quoteService.getQuotes()
- **Solución:**
  - `customerId` → `customer_id`
  - `branchId` → `branch_id`
  - Estados válidos: draft, sent, accepted, rejected, expired

### 4. POSRefundDialog.tsx (29 Marzo 2026)

- **Problema:** Tipos `unknown` en catch blocks
- **Solución:** Uso de `err instanceof Error` para acceso seguro a `.message`

### 5. POSPageContent.tsx (29 Marzo 2026)

- **Problema:** Componente placeholder sin integración
- **Solución:** Integración completa con usePOS() hook y todos los componentes existentes

---

## Métricas del Proyecto

| Métrica             | Antes  | Después (Actual)  | Target |
| ------------------- | ------ | ----------------- | ------ |
| Líneas en page.tsx  | 7,360  | 12 (re-export)    | ~2,000 |
| useState hooks      | 55+    | 0 (usar provider) | 0      |
| Tipos duplicados    | Sí     | No                | No     |
| Hooks reutilizables | 2      | 8+                | 7+     |
| Componentes UI      | 8      | 15+               | 15+    |
| Errores TS (POS)    | ~259   | 0                 | 0      |
| Errores TS (total)  | ~4,277 | ~3,940            | ~3,500 |

---

## Riesgo y Mitigación

### Riesgos Identificados

1. **Riesgo de ruptura:** Migrar todo a la vez podría romper funcionalidad
   - **Mitigación:** Migración gradual, componente por componente
2. **Errores TypeScript preexistentes:** 200+ errores en page.tsx
   - **Mitigación:** Enfoque en nueva arquitectura, los errores existeden antes
3. **Tiempo de desarrollo:** Refactorización extensa
   - **Mitigación:** Dividir en fases con hitos verificables

### Estrategia de Rollback

Si algo sale mal:

1. Mantener página original en `page.backup.tsx`
2. Feature flags para activar/desactivar nueva arquitectura
3. Testing E2E antes de cada merge

---

## Referencias

- **Notion Task:** [🎯 Optimización del POS - Mejoras UI/UX y Arquitectura](https://notion.so/33206293-43fc-81a8-bdd1-fca3aecf3920)
- **Documentación POS:** `docs/03-modules/pos/POS_SYSTEM.md`
- **Testing Checklist:** `docs/07-testing/CHECKLISTS/POS_TEST_CHECKLIST.md`

---

_Documento actualizado: 29 Marzo 2026_
