# Sistema POS - Point of Sale (Opttius)

Documentación detallada del módulo POS para ópticas. Base de la estructura de documentación del programa.

---

## 1. Introducción

El POS de Opttius es un sistema de punto de venta diseñado específicamente para ópticas y laboratorios ópticos. Gestiona ventas en tienda, integración con presupuestos, órdenes de trabajo, caja, inventario y facturación SII (Chile).

### Alcance

- **Ventas**: Productos, marcos, lentes, accesorios, servicios.
- **Presupuestos**: Carga de cotizaciones al carrito.
- **Órdenes de trabajo**: Creación automática para montajes (marco + lentes).
- **Caja**: Sesiones de apertura/cierre, movimientos.
- **Pagos**: Efectivo, tarjeta, transferencia, pagos parciales.
- **Facturación**: Boletas y facturas SII (Chile).

### Principios de Diseño

1. **Multi-tenant**: Aislamiento por organización y sucursal.
2. **Óptica-first**: Flujos específicos para marcos, lentes, recetas, presbicia.
3. **Cash-first**: Depósito mínimo para liberar trabajo en taller.
4. **Escalable**: Validación Zod, rate limiting, respuestas API estandarizadas.

---

## 2. Arquitectura de Datos

### 2.1 Tabla `orders` (campos POS)

| Columna            | Tipo    | Descripción                      |
| ------------------ | ------- | -------------------------------- |
| is_pos_sale        | BOOLEAN | true si venta desde POS          |
| pos_session_id     | UUID    | FK pos_sessions                  |
| pos_cashier_id     | UUID    | Usuario que procesó              |
| customer_name      | TEXT    | Nombre cliente (registrado o no) |
| billing_first_name | TEXT    | Nombre facturación               |
| billing_last_name  | TEXT    | Apellido facturación             |
| sii_rut            | TEXT    | RUT para boleta/factura          |
| sii_business_name  | TEXT    | Razón social (factura)           |
| sii_invoice_type   | TEXT    | boleta, factura, none            |
| sii_invoice_number | TEXT    | Folio SII                        |
| mp_payment_method  | TEXT    | cash, card, transfer, etc.       |

### 2.2 Tabla `pos_sessions`

| Columna             | Tipo        | Descripción             |
| ------------------- | ----------- | ----------------------- |
| id                  | UUID        | PK                      |
| cashier_id          | UUID        | FK auth.users           |
| branch_id           | UUID        | FK branches             |
| opening_cash_amount | DECIMAL     | Monto inicial caja      |
| closing_cash_amount | DECIMAL     | Monto al cierre         |
| opening_time        | TIMESTAMPTZ | Apertura                |
| closing_time        | TIMESTAMPTZ | Cierre                  |
| status              | TEXT        | open, closed, suspended |

### 2.2.1 Tabla `pos_transactions`

Existe en el esquema (transaction_type: sale, refund, void, return) pero el process-sale **no crea registros** actualmente. Mejora pendiente (ver POS_ANALYSIS_AND_IMPROVEMENTS.md).

### 2.3 Tabla `order_payments`

| Columna           | Tipo    | Descripción              |
| ----------------- | ------- | ------------------------ |
| order_id          | UUID    | FK orders                |
| amount            | DECIMAL | Monto pagado             |
| payment_method    | TEXT    | cash, card, transfer     |
| pos_session_id    | UUID    | Sesión asociada          |
| payment_reference | TEXT    | Folio, referencia fiscal |

**Nota orders-customer**: La tabla `orders` no tiene columna `customer_id` (FK a customers). La vinculación se hace por `customer_name`, `billing_first_name`, `billing_last_name` y `email`. El `customer_id` se usa en el flujo (lab_work_orders, BillingAdapter) pero no se persiste en orders. Consistente con CRM_SYSTEM.md.

### 2.4 Tabla `lab_work_orders` (resumen campos POS)

- `pos_order_id`: FK orders (vincula work order con orden POS).
- `frame_product_id`, `frame_name`, `frame_brand`, `frame_model`, etc.
- `lens_family_id`, `lens_type`, `lens_material`, `prescription_id`.
- `presbyopia_solution`, `far_lens_family_id`, `near_lens_family_id`.
- `contact_lens_family_id`, `contact_lens_quantity`, etc.
- `status`: on_hold_payment, ordered, in_progress, etc.
- `payment_status`: pending, partial, paid.

### 2.5 Tabla `cash_register_closures`

Registra los cierres de caja diarios por sucursal. Permite conciliación, reaperturas y auditoría.

| Columna                   | Tipo        | Descripción                                  |
| ------------------------- | ----------- | -------------------------------------------- |
| id                        | UUID        | PK                                           |
| pos_session_id            | UUID        | FK pos_sessions (sesión cerrada)             |
| branch_id                 | UUID        | FK branches                                  |
| closure_date              | DATE        | Fecha del cierre                             |
| closed_by                 | UUID        | Usuario que cerró                            |
| opening_cash_amount       | DECIMAL     | Monto inicial de caja                        |
| total_sales               | DECIMAL     | Total ventas del día                         |
| total_transactions        | INTEGER     | Cantidad de transacciones                    |
| cash_sales                | DECIMAL     | Ventas en efectivo                           |
| debit_card_sales          | DECIMAL     | Ventas débito                                |
| credit_card_sales         | DECIMAL     | Ventas crédito                               |
| transfer_sales            | DECIMAL     | Transferencias                               |
| installments_sales        | DECIMAL     | Cuotas                                       |
| other_payment_sales       | DECIMAL     | Otros                                        |
| expected_cash             | DECIMAL     | Efectivo esperado (apertura + ventas cash)   |
| actual_cash               | DECIMAL     | Efectivo contado físicamente                 |
| cash_difference           | DECIMAL     | actual_cash - expected_cash                  |
| card_machine_debit_total  | DECIMAL     | Total débito según datáfono                  |
| card_machine_credit_total | DECIMAL     | Total crédito según datáfono                 |
| card_machine_difference   | DECIMAL     | Diferencia datáfono vs sistema               |
| total_subtotal            | DECIMAL     | Subtotal del día                             |
| total_tax                 | DECIMAL     | IVA del día                                  |
| total_discounts           | DECIMAL     | Descuentos                                   |
| closing_cash_amount       | DECIMAL     | Monto final en caja                          |
| notes                     | TEXT        | Notas del cierre                             |
| discrepancies             | TEXT        | Discrepancias observadas                     |
| status                    | TEXT        | draft, confirmed, reviewed, closed, reopened |
| opened_at                 | TIMESTAMPTZ | Hora apertura sesión                         |
| closed_at                 | TIMESTAMPTZ | Hora cierre                                  |
| confirmed_at              | TIMESTAMPTZ | Confirmación                                 |
| reopened_at               | TIMESTAMPTZ | Si fue reabierta                             |
| reopened_by               | UUID        | Usuario que reabrió                          |
| reopen_count              | INTEGER     | Veces reabierta                              |

### 2.6 Índices Relevantes

- `idx_orders_is_pos_sale`
- `idx_orders_pos_session_id`
- `idx_pos_sessions_branch_id`, `idx_pos_sessions_status`
- `idx_order_payments_order_id`, `idx_order_payments_pos_session_id`
- `idx_cash_register_closures_branch_id`, `idx_cash_register_closures_closure_date`

---

## 3. Flujos de Negocio

### 3.1 Flujo de Venta Simple (Accesorios, Lentes de Sol)

1. Usuario abre POS.
2. Busca producto por nombre/SKU/código de barras.
3. Agrega al carrito.
4. (Opcional) Selecciona cliente.
5. Selecciona método de pago.
6. Procesa venta → order + order_items + order_payments.
7. Stock se reduce en product_branch_stock.
8. No se crea work order.

### 3.2 Flujo de Venta con Marco + Lentes (Work Order)

1. Carga presupuesto o agrega items manualmente (marco + lente).
2. Selecciona receta (obligatorio para lentes con graduación).
3. Sistema calcula precio de lente vía matriz (calculate_lens_price).
4. Cliente obligatorio (registrado).
5. Procesa venta → order + lab_work_order.
6. Si pago < depósito mínimo: work order status = on_hold_payment.
7. Si pago suficiente: work order status = ordered, visible en taller.

### 3.3 Flujo Carga de Presupuesto

1. Usuario navega a POS con `?quote=<uuid>` o selecciona presupuesto desde diálogo.
2. API `POST /api/admin/quotes/[id]/load-to-pos` retorna items en formato carrito.
3. Validaciones: quote no convertido, branch access.
4. Items incluyen frame, lens_complete o contact_lens según tipo de presupuesto.

### 3.4 Flujo de Pago Parcial (Saldo Pendiente)

1. Cliente paga monto inicial (deposit_amount).
2. order.payment_status = partial.
3. Saldo pendiente visible en "Saldos pendientes".
4. Usuario puede abonar vía `POST /api/admin/pos/pending-balance/pay`.
5. Al saldar: payment_status = paid.

### 3.5 Flujo de Caja (CAJA)

La CAJA es el módulo de gestión de efectivo y sesiones de caja. **Obligatoria** para procesar ventas en el POS.

#### 3.5.1 Apertura

1. Usuario selecciona sucursal (branch obligatorio).
2. POST `/api/admin/cash-register/open` con `{ opening_cash_amount }`.
3. Valida: no existe sesión abierta para esa sucursal.
4. Valida: si ya hubo cierre "closed" hoy, debe reabrir (no crear nueva sesión).
5. Crea `pos_session` con status=open.

#### 3.5.2 Durante el día

- Cada venta POS asocia `pos_session_id` en `order_payments`.
- GET `/api/admin/cash-register/open` retorna estado: `{ isOpen, session }`.
- El POS verifica estado cada 30 segundos; bloquea ventas si caja cerrada.

#### 3.5.3 Cierre

1. GET `/api/admin/cash-register/close` retorna resumen del día (ventas, pagos por método, expected_cash).
2. Usuario ingresa `actual_cash` (efectivo contado), `card_machine_debit_total`, `card_machine_credit_total`.
3. POST `/api/admin/cash-register/close` con body completo.
4. Sistema cierra `pos_session` (status=closed).
5. Crea/actualiza `cash_register_closures` con status=closed.

#### 3.5.4 Reapertura

- Si se cerró por error o se necesita continuar vendiendo el mismo día.
- POST `/api/admin/cash-register/reopen` con `{ session_id }`.
- Solo admin/super_admin. Incrementa `reopen_count` en sesión.
- Marca closure como `reopened_at`, `reopened_by`.
- Crea nueva sesión o reabre la existente según lógica.

#### 3.5.5 Historial de cierres

- GET `/api/admin/cash-register/closures` lista cierres con paginación y filtros por fecha.
- GET `/api/admin/cash-register/closures/[id]` detalle de un cierre.

---

## 4. API Reference

### 4.1 POST /api/admin/pos/process-sale

**Body** (processSaleSchema):

- `email`, `customer_id`, `customer_name`, `customer_rut`
- `payment_method_type`: cash, card, debit_card, credit_card, transfer
- `subtotal`, `tax_amount`, `total_amount`, `currency`
- `items`: array de { product_id, product_name, quantity, unit_price, ... }
- `cash_received`, `deposit_amount`, `change_amount`
- `sii_invoice_type`, `sii_rut`, `sii_business_name`
- `lens_data`, `frame_data`, `presbyopia_solution`, `quote_id`
- `contact_lens_*` (campos para lentes de contacto)

**Headers**: `x-branch-id` (sucursal)

**Respuesta**:

```json
{
  "data": {
    "order": { "id", "order_number", "order_items", ... },
    "work_order": { "id", "work_order_number", ... } | null,
    "billing": { "folio", "pdfUrl", "type" } | null
  }
}
```

### 4.2 GET /api/admin/pos/pending-balance

**Query**: `search`, `limit`

**Headers**: `x-branch-id`

**Respuesta**: Array de órdenes con payment_status partial/pending.

### 4.3 POST /api/admin/pos/pending-balance/pay

**Body**: `order_id`, `payment_amount`, `payment_method`, `notes`, `fiscal_reference`

### 4.4 POST /api/admin/quotes/[id]/load-to-pos

**Respuesta**:

```json
{
  "success": true,
  "quoteId", "quoteNumber", "customerId", "customer",
  "prescriptionId", "prescription",
  "items": [ { "type", "id", "name", "price", "quantity", ... } ],
  "totals": { "subtotal", "tax", "discount", "total" },
  "notes", "internalNotes", "originalQuote"
}
```

### 4.5 API Caja (Cash Register)

| Ruta                                         | Método | Propósito                                                                                                                                             |
| -------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/admin/cash-register/open`              | GET    | Estado de caja: `{ isOpen, session }`                                                                                                                 |
| `/api/admin/cash-register/open`              | POST   | Abrir caja: `{ opening_cash_amount }`                                                                                                                 |
| `/api/admin/cash-register/close`             | GET    | Resumen del día para cierre                                                                                                                           |
| `/api/admin/cash-register/close`             | POST   | Crear cierre: `closure_date`, `opening_cash_amount`, `actual_cash`, `card_machine_debit_total`, `card_machine_credit_total`, `notes`, `discrepancies` |
| `/api/admin/cash-register/reopen`            | POST   | Reabrir: `{ session_id }` (solo admin)                                                                                                                |
| `/api/admin/cash-register/closures`          | GET    | Lista cierres: `limit`, `offset`, `start_date`, `end_date`                                                                                            |
| `/api/admin/cash-register/closures/[id]`     | GET    | Detalle de un cierre                                                                                                                                  |
| `/api/admin/cash-register/session-movements` | GET    | Movimientos de una sesión                                                                                                                             |

**Headers**: `x-branch-id` (sucursal)

---

## 5. Componentes Frontend

### 5.1 Página POS (`src/app/admin/pos/page.tsx`)

- Carrito, búsqueda productos, búsqueda clientes.
- Diálogo de pago (método, monto, referencia fiscal).
- Diálogo de presupuestos (cargar quote).
- Formulario completo para órdenes con marco+lentes (receta, familia lentes, presbicia).
- Saldos pendientes (listado, abono).
- Impresión de recibos (POSReceipt).

### 5.2 POSReceipt (`src/components/admin/POS/POSReceipt.tsx`)

- Recibo térmico (80mm) o A4.
- Logo, datos negocio, sucursal.
- Items, totales, IVA.
- Tipo: sale | payment (comprobante de abono).

### 5.3 Página Caja (`src/app/admin/cash-register/page.tsx`)

- **Abrir caja**: Diálogo con monto inicial.
- **Cerrar caja**: Resumen del día, ingreso de efectivo contado, datáfono, notas.
- **Historial de cierres**: Tabla con paginación, filtros por fecha.
- **Reapertura**: Botón para reabrir cierre cerrado (admin).
- **Detalle de cierre** (`/admin/cash-register/[id]`): Vista completa de un cierre.
- **Órdenes del día** (`/admin/cash-register/orders/[id]`): Órdenes asociadas a un cierre.

### 5.4 Servicios

- `posService`: getCashStatus, getPendingBalanceOrders, processPendingPayment, processSale.
- `quoteService`: loadQuoteToPOS (llama load-to-pos).
- `customerService`: searchCustomers.
- `productService`: searchProducts.

---

## 6. Utilidades

### 6.1 Tax (`src/lib/utils/tax.ts`)

- `calculatePriceWithTax(basePrice, includesTax, taxRate)`
- `calculateSubtotal`, `calculateTotalTax`, `calculateTotal` para arrays de items.

### 6.2 Tax Config (`src/lib/utils/tax-config.ts`)

- `getTaxPercentage()`: retorna % IVA (ej. 19 para Chile).

### 6.3 RUT (`src/lib/utils/rut.ts`)

- `normalizeRUT`, `formatRUT`, `isValidRUTFormat`, `completeRUTIfNeeded`.

---

## 7. Mejores Prácticas (Óptica)

### 7.1 UX

- Búsqueda rápida de productos (debounce).
- Búsqueda de clientes con sugerencias (nombre, RUT, teléfono).
- Carga de presupuesto desde URL o diálogo.
- Flujo guiado para ventas complejas (marco + lentes).
- Soporte escáner de códigos de barras (input focus + Enter).

### 7.2 Seguridad

- Caja abierta obligatoria.
- Branch obligatorio para no super admin.
- Validación Zod en todas las APIs.
- Rate limiting en process-sale.

### 7.3 Integración

- CRM: cliente vinculado a orden.
- Presupuestos: quote_id en work order.
- Recetas: prescription_id en lens_data.
- Inventario: stock por sucursal.
- Billing: Shadow Billing / SII vía BillingAdapter.

---

## 8. Estado Actual y Mejoras Recomendadas

Ver documento detallado: **[docs/POS_ANALYSIS_AND_IMPROVEMENTS.md](./POS_ANALYSIS_AND_IMPROVEMENTS.md)**

Resumen:

- **Fortalezas**: Integración óptica completa, backend robusto, presupuestos, work orders, caja, SII.
- **Mejoras prioritarias**: Refactorizar página POS (6.000+ líneas), devoluciones, escaneo de códigos de barras, split payments.

---

## 9. Glosario

| Término    | Definición                                                                                |
| ---------- | ----------------------------------------------------------------------------------------- |
| POS        | Point of Sale - terminal de ventas                                                        |
| CAJA       | Módulo de gestión de efectivo: sesiones de apertura/cierre, cierres diarios, conciliación |
| Work Order | Orden de trabajo de laboratorio (marco + lentes)                                          |
| Cash-First | Lógica de depósito mínimo para liberar trabajo                                            |
| SII        | Servicio de Impuestos Internos (Chile)                                                    |
| Boleta     | Documento tributario B2C                                                                  |
| Factura    | Documento tributario B2B                                                                  |

---

_Última actualización: 2026-02-18_  
_Mantenedor: Equipo Opttius_
