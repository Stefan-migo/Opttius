# Análisis y Devolución del POS - Opttius

Documento de evaluación del estado actual del POS y recomendaciones para alcanzar un sistema de la más alta calidad.

---

## 1. Resumen Ejecutivo

El POS de Opttius tiene una **base sólida** con integración completa a presupuestos, órdenes de trabajo, caja, inventario y facturación SII. Cumple con los flujos core de una óptica. Sin embargo, hay oportunidades de mejora en **arquitectura de código**, **UX para escaneo**, **devoluciones**, **split payments** y **modularización** para escalar y mantener el sistema a largo plazo.

**Calificación general**: 7.5/10 — Funcional y bien integrado, con margen para alcanzar nivel "alta gama".

---

## 2. Fortalezas Actuales

### 2.1 Integración Óptica-Específica ✅

- **Presupuestos → POS**: API `load-to-pos` bien diseñada, convierte quote en items editables.
- **Work orders**: Lógica Cash-First correcta (on_hold_payment vs ordered).
- **Presbicia**: Soporte para dos lentes separados (far/near).
- **Marco del cliente**: customer_own_frame con precio 0.
- **Lentes de contacto**: Flujo diferenciado con contact_lens_family_id, RX, cantidad.

### 2.2 Backend Robusto ✅

- Validación Zod (`processSaleSchema`) completa.
- Rate limiting en process-sale.
- Branch context y multi-tenant correctos.
- Verificación de caja abierta antes de venta.
- Reducción de stock por sucursal.
- BillingAdapter (SII) no bloqueante.
- Notificaciones asíncronas.

### 2.3 Datos y Modelo ✅

- `orders`, `order_items`, `order_payments`, `pos_sessions` bien estructurados.
- `lab_work_orders` con todos los campos necesarios.
- Índices adecuados para consultas frecuentes.

### 2.4 UX Básica ✅

- Búsqueda de productos y clientes.
- Carga de presupuesto desde URL (?quoteId=).
- Diálogos de pago y saldos pendientes.
- Impresión de recibos (térmico/A4).

---

## 3. Áreas de Mejora

### 3.1 Arquitectura del Frontend (Prioridad Alta)

**Problema**: La página POS (`page.tsx`) supera las **6.000 líneas**. Esto dificulta mantenimiento, testing y colaboración.

**Recomendaciones**:

1. **Extraer componentes**:
   - `POSCart.tsx` — Carrito, items, totales.
   - `POSProductSearch.tsx` — Búsqueda y sugerencias de productos.
   - `POSCustomerSearch.tsx` — Búsqueda de clientes.
   - `POSPaymentDialog.tsx` — Diálogo de pago.
   - `POSPendingBalanceDialog.tsx` — Saldos pendientes.
   - `POSCompleteOrderForm.tsx` — Formulario marco + lentes (ya tiene lógica compleja).
   - `POSQuoteDialog.tsx` — Selección y carga de presupuestos.

2. **Custom hooks**:
   - `usePOSCart()` — Estado del carrito, add/remove/update.
   - `usePOSPayment()` — Estado de pago, processSale.
   - `usePOSCashStatus()` — Estado de caja.
   - `usePOSPendingBalance()` — Órdenes con saldo pendiente.

3. **Contexto**: `POSContext` para estado compartido (branch, customer, cart, payment) en lugar de prop drilling.

### 3.2 Escaneo de Códigos de Barras (Prioridad Alta)

**Problema**: No hay flujo optimizado para escáner de códigos de barras. Los escáneres USB actúan como teclado; el usuario debe tener el foco en el input de búsqueda. No hay:

- Input dedicado "modo escáner" con auto-focus.
- Detección de entrada rápida (escáner típicamente envía Enter al final).
- Búsqueda por barcode como prioridad cuando el término coincide con formato EAN/UPC.

**Recomendaciones**:

1. Añadir input dedicado para escáner con `autoFocus` y `ref` para restaurar foco tras cada búsqueda.
2. Detectar secuencia "caracteres + Enter" en < 100ms como escaneo.
3. Priorizar búsqueda por `barcode` exacto cuando el término sea numérico y largo (EAN-13, etc.).
4. Documentar en UX que el escáner debe estar conectado y el foco en el campo de búsqueda.

### 3.3 Devoluciones y Anulaciones (Prioridad Alta)

**Problema**: No existe flujo de devoluciones ni anulaciones en el POS. La tabla `pos_transactions` tiene `transaction_type IN ('sale', 'refund', 'void', 'return')` pero no hay UI ni API para:

- Anular una venta (void).
- Procesar devolución (return) con reingreso a stock.
- Emitir nota de crédito SII.

**Recomendaciones**:

1. API `POST /api/admin/pos/refund` con order_id, items a devolver, motivo.
2. Reversar stock vía `update_product_stock` con quantity_change positivo.
3. Registrar en `pos_transactions` con type='refund' o 'return'.
4. Integrar con BillingAdapter para nota de crédito SII.
5. UI: botón "Devolución" en historial de ventas o en detalle de orden.

### 3.4 Pagos Divididos (Split Payments) (Prioridad Media)

**Problema**: El flujo actual permite un solo método de pago por venta. No hay soporte explícito para "parte efectivo, parte tarjeta".

**Recomendaciones**:

1. Permitir múltiples `order_payments` en una misma orden.
2. UI: en diálogo de pago, botón "Agregar otro método" con monto por método.
3. Validar que la suma de pagos = total_amount (o permitir cambio si efectivo > total).

### 3.5 Consistencia SII (Prioridad Media)

**Problema**: Posible inconsistencia entre `processSaleSchema` (sii_invoice_type: "invoice") y RPC `generate_sii_invoice_number` (espera "factura"). Revisar mapeo.

**Recomendaciones**:

1. Unificar valores: usar "boleta" y "factura" en todo el sistema.
2. Validar que el frontend envía los mismos valores que espera el backend.

### 3.6 Registro en pos_transactions (Prioridad Media)

**Problema**: En `process-sale` hay un comentario: "pos_transactions currently only has order_id, so we'll skip this for now". No se crean registros en `pos_transactions` para las ventas.

**Recomendaciones**:

1. Crear registro en `pos_transactions` para cada venta (type='sale').
2. Añadir columna `work_order_id` a `pos_transactions` si se desea trazabilidad.
3. Usar para reportes de caja y auditoría.

### 3.7 Transaccionalidad (Prioridad Baja)

**Problema**: El process-sale hace múltiples operaciones (order, order_items, order_payments, stock, work_order, billing) sin transacción explícita. Si falla a mitad, puede quedar estado inconsistente.

**Recomendaciones**:

1. Usar transacción de base de datos (BEGIN/COMMIT/ROLLBACK) o RPC que encapsule todo.
2. En caso de error post-order, considerar compensación (rollback manual o flag de "reversar").

### 3.8 Tests Automatizados (Prioridad Media)

**Problema**: No hay tests específicos para el POS (process-sale, load-to-pos, pending-balance).

**Recomendaciones**:

1. Tests de integración para `POST /api/admin/pos/process-sale` (casos: venta simple, venta con work order, pago parcial).
2. Tests para `load-to-pos` (quote válido, quote ya convertido).
3. Tests unitarios para hooks de cálculo (tax, totales).

### 3.9 Accesibilidad y Atajos de Teclado (Prioridad Baja)

**Problema**: No hay atajos de teclado documentados (ej. F2 para buscar producto, F3 para cliente, Enter para procesar).

**Recomendaciones**:

1. Implementar atajos estándar de POS.
2. Documentar en ayuda in-app.
3. Soporte para navegación por teclado (accesibilidad).

### 3.10 Reportes y Analytics (Prioridad Baja)

**Problema**: No hay reportes POS específicos (ventas por hora, por cajero, por método de pago, productos más vendidos en POS).

**Recomendaciones**:

1. Dashboard o sección "Reportes POS" con gráficos.
2. Exportar a Excel/CSV.
3. Integrar con analytics existente si aplica.

---

## 4. Mejores Prácticas de POS para Ópticas (Checklist)

Basado en estándares de la industria (iVend, ACESales, Shopify Retail):

| Práctica                           | Estado Actual | Acción                     |
| ---------------------------------- | ------------- | -------------------------- |
| Prescripción vinculada a venta     | ✅            | Mantener                   |
| Stock en tiempo real por sucursal  | ✅            | Mantener                   |
| Órdenes de laboratorio automáticas | ✅            | Mantener                   |
| Múltiples métodos de pago          | ⚠️ Parcial    | Implementar split payments |
| Devoluciones y anulaciones         | ❌            | Implementar                |
| Escaneo de códigos de barras       | ⚠️ Básico     | Mejorar flujo dedicado     |
| Caja con apertura/cierre           | ✅            | Mantener                   |
| Recibos térmicos y A4              | ✅            | Mantener                   |
| Integración facturación (SII)      | ✅            | Mantener                   |
| Multi-sucursal                     | ✅            | Mantener                   |
| Pagos parciales / layaway          | ✅            | Mantener                   |
| Carga de presupuestos              | ✅            | Mantener                   |
| Reportes de ventas                 | ⚠️ Limitado   | Expandir                   |

---

## 5. Plan de Acción Sugerido

### Fase 1 (1–2 sprints): Estabilidad y Devoluciones

1. Refactorizar `page.tsx` en componentes y hooks.
2. Implementar API y UI de devoluciones.
3. Crear registros en `pos_transactions`.

### Fase 2 (1 sprint): UX y Pagos

4. Mejorar flujo de escaneo de códigos de barras.
5. Implementar split payments.

### Fase 3 (1 sprint): Calidad y Reportes

6. Tests de integración para POS.
7. Unificar valores SII (boleta/factura).
8. Transaccionalidad en process-sale.

### Fase 4 (opcional): Analytics

9. Reportes POS (ventas, cajeros, métodos de pago).
10. Atajos de teclado y accesibilidad.

---

## 6. Conclusión

El POS de Opttius es **funcional, bien integrado y alineado con la lógica de negocio de una óptica**. Las mejoras propuestas se centran en:

- **Código**: Modularización y mantenibilidad.
- **Funcionalidad**: Devoluciones, split payments, escaneo.
- **Calidad**: Tests, transaccionalidad, consistencia SII.
- **Escalabilidad**: Reportes y analytics.

Con la implementación de las fases 1 y 2, el sistema alcanzaría un nivel de **alta gama** adecuado para ópticas con múltiples sucursales y alto volumen de ventas.

---

_Documento generado: 2026-02-18_  
_Base: análisis de código, skill pos-optical-supabase, documentación POS_SYSTEM.md_
