# Plan POS: Refactorización, Devoluciones y Unificación

**Fecha de implementación:** 2026-02-19  
**Estado:** Implementado  
**Notebook ID:** e071bebc-ce79-4b32-a040-61a6a9c331a3

---

## Resumen Ejecutivo

Se implementó el plan de mejoras del POS que unifica los flujos de anulación/devolución, corrige bugs críticos en devoluciones con pago parcial, refactoriza el monolito del POS, y mejora el escaneo de códigos de barras. La documentación detalla las modificaciones realizadas y los ítems pendientes.

---

## Fase 1: Unificación Anulación / Devolución / Nota de Crédito

### 1.1 Corrección error 500 en `/api/admin/orders/[id]/cancel`

**Problema:** La API fallaba con error 500.

**Causas corregidas:**

- RPC `generate_credit_note_number` no existía → **Migración creada**
- Tablas `credit_notes` y `credit_note_movements` no existían → **Migración creada**
- En Next.js 15, `params` es Promise → **Añadido `await params`**

**Archivos modificados:**

- `src/app/api/admin/orders/[id]/cancel/route.ts`
- `supabase/migrations/` (nueva migración `create_credit_notes_system`)

**Cambios:**

- `const { id } = await params` al inicio del handler
- Uso de `total_paid` (suma de `order_payments`) en lugar de `order.total_amount` cuando `payment_status = 'partial'`
- Reversión de stock cuando `create_credit_note = true`

### 1.2 Bug crítico: Devolución devolvía valor total en vez del abono pagado

**Problema:** En Saldos Pendientes, al hacer "Devolución" de una orden con pago parcial, el sistema devolvía el valor total del producto en lugar del monto efectivamente pagado.

**Archivos modificados:**

- `src/app/api/admin/pos/refund/route.ts`
- `src/app/admin/pos/components/POSRefundDialog.tsx`

**Lógica implementada:**

- Calcular `total_paid` = suma de `order_payments.amount`
- Si `total_paid < total_amount`, el monto a devolver está acotado por `total_paid`
- Para devolución parcial de ítems: prorratear `total_paid` según proporción de ítems devueltos vs total
- Fórmula: `refundAmount = min(refundAmountCalculado, total_paid * (refundAmountCalculado / total_amount))`

### 1.3 Unificación de flujos: Caja vs POS

**Flujos unificados:**

| Origen                            | Acción       | Resultado                                                                                                        |
| --------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Caja** (`/admin/cash-register`) | Anular venta | Siempre: `credit_note` + `credit_note_movement` + revert stock (no existe "sin nota")                            |
| **POS** (`/admin/pos`)            | Devolución   | `credit_note` + `credit_note_movement` + revert stock + `order.status = cancelled` + `payment_status = refunded` |

**Nota:** Se eliminó la opción "anular sin nota de crédito". Todas las anulaciones crean nota de crédito para: revertir stock, actualizar caja y mantener consistencia inventario/caja.

**Cambios en Refund API:**

- Crear `credit_note` y `credit_note_movement` (como hace cancel)
- Actualizar `orders.status = 'cancelled'`, `payment_status = 'refunded'`
- Usar `total_paid` como monto máximo a devolver

**Cambios en Pending Balance:**

- Excluir órdenes con `status = 'cancelled'` o `payment_status = 'refunded'`

**Archivo:** `src/app/api/admin/pos/pending-balance/route.ts`

### 1.4 Migración: Sistema de notas de crédito

**Migración:** `create_credit_notes_system`

- Tabla `credit_notes` (id, credit_note_number, order_id, amount, reason, created_at, ...)
- Tabla `credit_note_movements` (id, credit_note_id, pos_session_id, amount, refund_method, created_at)
- RPC `generate_credit_note_number` (secuencia similar a `generate_sii_invoice_number`)

---

## Fase 2: Refactorización del monolito POS

### 2.1 Componentes extraídos

| Componente                | Responsabilidad                                   | Estado                            |
| ------------------------- | ------------------------------------------------- | --------------------------------- |
| `POSPendingBalanceDialog` | Tabla saldos pendientes, abonos, botón devolución | ✅ Creado                         |
| `POSPaymentDialog`        | Diálogo de pago, método, monto, cambio            | ⏳ Pendiente (inline en page.tsx) |
| `POSCompleteOrderForm`    | Formulario marco + lentes + presupuesto           | ⏳ Pendiente                      |
| `POSQuoteSelector`        | Selector de presupuesto con "Ninguno"             | ⏳ Pendiente                      |
| `POSReceiptSection`       | Portal de impresión                               | ⏳ Pendiente                      |
| `POSHeader`               | Branch, caja, links                               | ⏳ Pendiente                      |

### 2.2 Hooks y contexto

| Hook/Contexto          | Estado                            |
| ---------------------- | --------------------------------- |
| `POSContext`           | ⏳ Pendiente                      |
| `usePOSCart`           | ⏳ Pendiente                      |
| `usePOSPayment`        | ⏳ Pendiente                      |
| `usePOSPendingBalance` | ⏳ Pendiente (lógica en page.tsx) |
| `usePOSCompleteOrder`  | ⏳ Pendiente                      |

### 2.3 Reducción de líneas

- **Antes:** ~6.152 líneas en `page.tsx`
- **Después:** ~5.990 líneas (reducción parcial con `POSPendingBalanceDialog`)
- **Objetivo final:** ~200–400 líneas como orquestador

---

## Fase 3: Correcciones específicas

### 3.1 Deseleccionar presupuesto en "Crear Orden Completa"

**Problema:** No se podía deseleccionar un presupuesto cargado; si ya fue usado, el POS bloqueaba la venta.

**Solución implementada:**

- Añadido `SelectItem` con `value="__none__"` y label "Ninguno / Sin presupuesto"
- `onValueChange("__none__")` ejecuta `setSelectedQuote(null)` y limpia el formulario
- Función `resetCompleteOrderForm` para limpiar estado relacionado

**Archivo:** `src/app/admin/pos/page.tsx`

### 3.2 Pagos divididos (split payments)

**Estado:** API lista, UI pendiente

**Implementado:**

- Schema `processSaleSchema`: acepta `payments: Array<{ method, amount }>` opcional
- API `process-sale`: itera sobre `payments`, crea un `order_payment` por cada uno
- Validación: `sum(payments) >= total_amount`

**Pendiente:**

- UI: botón "Agregar otro método" en el diálogo de pago
- Filas dinámicas (método + monto) antes de confirmar

**Archivos:** `src/lib/api/validation/zod-schemas.ts`, `src/app/api/admin/pos/process-sale/route.ts`

### 3.3 Optimización escaneo (POSBarcodeInput)

**Implementado:**

- Prop `restoreFocusOnSuccess` (default: true) para restaurar foco tras scan/search
- Prop `scanWindowMs` (default: 150 ms) — ventana de detección de escaneo (antes 100 ms)
- Prioridad búsqueda por barcode: cuando el término es numérico y largo (≥12 dígitos, EAN-13), se invoca `onScan` en lugar de `onSearch`

**Archivo:** `src/app/admin/pos/components/POSBarcodeInput.tsx`

### 3.4 Registro en pos_transactions (process-sale)

**Implementado:**

- Tras crear la orden y los pagos, se inserta en `pos_transactions`:
  - `transaction_type: 'sale'`
  - `order_id`, `pos_session_id`, `amount` (total_amount), `payment_method`, `notes`

**Archivo:** `src/app/api/admin/pos/process-sale/route.ts`

---

## Fase 4: Integración con movimientos de caja

### 4.1 Verificación realizada

| Verificación                                                       | Estado |
| ------------------------------------------------------------------ | ------ |
| `session-movements` incluye `order_payments` (ventas)              | ✅     |
| `session-movements` incluye `credit_note_movements` (devoluciones) | ✅     |
| `credit_note_movements` aparecen en resumen de caja                | ✅     |
| Cierre de caja refleja devoluciones en `expected_cash`             | ✅     |

### 4.2 Flujo de datos

- **Ventas:** `order_payments` con `pos_session_id` → session-movements y close
- **Devoluciones:** `credit_note_movements` con `pos_session_id` → session-movements y close
- **expected_cash:** `openingCash + cash_sales` (cash_sales incluye montos negativos de devoluciones en efectivo)

**Archivos:** `src/app/api/admin/cash-register/session-movements/route.ts`, `src/app/api/admin/cash-register/close/route.ts`

---

## Resumen de archivos modificados/creados

| Archivo                                                    | Acción                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| `src/app/api/admin/orders/[id]/cancel/route.ts`            | Fix params, total_paid, revert stock                           |
| `src/app/api/admin/pos/refund/route.ts`                    | Cap refund por total_paid, crear credit_note, actualizar order |
| `src/app/api/admin/pos/process-sale/route.ts`              | Insert pos_transactions, soporte payments[]                    |
| `src/app/api/admin/pos/pending-balance/route.ts`           | Excluir órdenes cancelled                                      |
| `src/app/admin/pos/page.tsx`                               | Refactor parcial, deseleccionar presupuesto                    |
| `src/app/admin/pos/components/POSRefundDialog.tsx`         | Nota sobre pagos parciales                                     |
| `src/app/admin/pos/components/POSBarcodeInput.tsx`         | scanWindowMs, restoreFocusOnSuccess, prioridad EAN-13          |
| `src/app/admin/pos/components/POSPendingBalanceDialog.tsx` | Nuevo componente                                               |
| `src/lib/api/validation/zod-schemas.ts`                    | payments[] en processSaleSchema                                |
| `supabase/migrations/`                                     | create_credit_notes_system                                     |

---

## Ítems pendientes (prioridad sugerida)

1. **Pagos divididos UI:** Añadir interfaz para múltiples métodos de pago en el diálogo de pago
2. **Refactor continuo:** Extraer `POSPaymentDialog`, `POSCompleteOrderForm`, `POSQuoteSelector`, `POSReceiptSection`, `POSHeader`
3. **POSContext y hooks:** Centralizar estado compartido para reducir prop drilling
4. **Revisar update_pos_session_cash:** En process-sale, verificar que se actualice correctamente cuando no hay work order (ventas simples)

---

## Notas técnicas

- `pos_sessions`: columna correcta es `opening_time`, no `opened_at`
- `POSPendingBalanceDialog` recibe `onOpenChange` y `onFetchOrders`; llama a `onFetchOrders` cuando `open` es true
- Para ventas con work order, el flujo es distinto al de ventas simples; revisar cobertura de `pos_transactions` y `update_pos_session_cash` en ambos casos
