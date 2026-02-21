# Sistema de Payment Workflow - Opttius

**Fecha:** 2026-02-21  
**Notebook ID:** e071bebc-ce79-4b32-a040-61a6a9c331a3  
**Estado:** Implementación completada (Fases 1-5). Métricas pendientes (prioridad baja).

---

## 0. Estado de Implementación (2026-02-21)

### ✅ Completado

| Fase | Ítem                                                   | Archivos                                                                     |
| ---- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1    | `pendingBalancePaySchema` Zod                          | `zod-schemas.ts`, `pending-balance/pay/route.ts`                             |
| 1    | `PAYMENT_METHOD_MAP` constante                         | `src/lib/payments/constants.ts`, `process-sale`, `pending-balance/pay`       |
| 2    | `IPaymentGateway.createPaymentWithToken` opcional      | `interfaces.ts`, `confirm-payment/route.ts`                                  |
| 2    | Mensaje error confirm-payment (gateways redirect-only) | `confirm-payment/route.ts`                                                   |
| 3    | NOWPayments tasa configurable                          | `create-intent/route.ts` → `NOWPAYMENTS_CLP_TO_USD_RATE`                     |
| 4    | Cron cleanup pending payments                          | `api/cron/cleanup-pending-payments/route.ts`, `vercel.json`                  |
| 5    | Frontend Epoch: Checkout layout, content, result       | `checkout/layout.tsx`, `CheckoutPageContent.tsx`, `checkout/result/page.tsx` |
| 5    | Frontend Epoch: POS Payment Dialog, Pending Balance    | `pos/page.tsx`, `POSPendingBalanceDialog.tsx`                                |

### ⏳ Pendiente (Prioridad Baja)

| Ítem                        | Descripción                                                             |
| --------------------------- | ----------------------------------------------------------------------- |
| Métricas checkout           | Tasa de conversión (succeeded/created), fallos por gateway en analytics |
| Registro pasarelas dinámico | Config en DB para habilitar/deshabilitar sin deploy                     |
| OpenAPI/Swagger             | Documentación API para rutas checkout y POS                             |

### Credenciales Vercel (Cron)

| Variable                    | Uso                                                                  |
| --------------------------- | -------------------------------------------------------------------- |
| `CRON_SECRET`               | Autorización de crons (Vercel envía `Authorization: Bearer <valor>`) |
| `NEXT_PUBLIC_SUPABASE_URL`  | URL Supabase producción                                              |
| `SUPABASE_SERVICE_ROLE_KEY` | Cliente admin para actualizar `payments`                             |

### Cron: `cleanup-pending-payments`

- **Ruta:** `GET /api/cron/cleanup-pending-payments`
- **Schedule:** `0 2 * * *` (02:00 UTC diario)
- **Función:** Marca `payments` con `status=pending` y `created_at > 24h` como `failed`

---

## 1. Resumen Ejecutivo

El sistema de pagos de Opttius opera en **dos capas diferenciadas**:

1. **SaaS Checkout** (`/checkout`): Suscripciones de la plataforma mediante pasarelas externas (Mercado Pago, Flow, PayPal, NOWPayments).
2. **POS Retail** (`/admin/pos`): Ventas en tienda con métodos manuales (efectivo, tarjeta, transferencia) registrados en `order_payments`.

Ambas capas comparten principios de calidad (validación, logging, multi-tenant) pero usan tablas y flujos distintos.

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Flujos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SAAS CHECKOUT (Suscripciones)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  /checkout → create-intent → payments (pending)                              │
│       ↓                                                                     │
│  MercadoPago Bricks / Redirect → confirm-payment (token)                    │
│       ↓                                                                     │
│  payments (succeeded) → subscriptions + organizations.subscription_tier     │
│       ↓                                                                     │
│  Webhook (backup) → webhook_events (idempotencia)                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        POS RETAIL (Ventas Óptica)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Carrito → process-sale → orders + order_items + order_payments             │
│       ↓                                                                     │
│  pos_transactions (sale) → pos_sessions                                      │
│       ↓                                                                     │
│  lab_work_orders (si marco+lentes) + product_branch_stock (reducción)        │
│       ↓                                                                     │
│  BillingAdapter (SII) → boleta/factura                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Tablas y Responsabilidades

| Tabla              | Alcance | Propósito                                                         |
| ------------------ | ------- | ----------------------------------------------------------------- |
| `payments`         | SaaS    | Pagos de suscripción vía gateways (MP, Flow, PayPal, NOWPayments) |
| `order_payments`   | POS     | Pagos reales por orden (cash, card, transfer)                     |
| `webhook_events`   | SaaS    | Idempotencia de webhooks por gateway + gateway_event_id           |
| `pos_sessions`     | POS     | Sesiones de caja (abrir/cerrar)                                   |
| `pos_transactions` | POS     | Log de transacciones (sale, refund, void)                         |
| `credit_notes`     | POS     | Notas de crédito para devoluciones                                |
| `subscriptions`    | SaaS    | Estado de suscripción por organización                            |

### 2.3 Pasarelas de Pago (SaaS)

| Gateway      | Uso                          | Flujo                                |
| ------------ | ---------------------------- | ------------------------------------ |
| Mercado Pago | Principal (Chile/LATAM)      | Preference + Bricks token o redirect |
| Flow         | Transferencias, Webpay       | Redirect                             |
| PayPal       | Internacional                | Redirect                             |
| NOWPayments  | Criptomonedas (300+ criptos) | Invoice + redirect                   |

---

## 3. Flujo Detallado: SaaS Checkout

### 3.1 create-intent

**Ruta:** `POST /api/checkout/create-intent`

1. Autenticación: usuario debe estar logueado.
2. Organización: `admin_users.organization_id` obligatorio.
3. Body: `amount`, `currency`, `gateway`, `subscription_tier` (opcional).
4. Crea registro en `payments` (status: pending).
5. Llama a `PaymentGatewayFactory.getGateway(gateway).createPaymentIntent()`.
6. Retorna: `paymentId`, `clientSecret`, `approvalUrl`, `preferenceId`, `invoiceUrl`.

**Validación:** `createCheckoutIntentSchema` (Zod).

### 3.2 confirm-payment (MercadoPago Bricks)

**Ruta:** `POST /api/checkout/confirm-payment`

1. Obtiene `payment` por ID.
2. Verifica `payment.organization_id === organizationId`.
3. Solo soporta `gateway === "mercadopago"`.
4. Llama a `MercadoPagoGateway.createPaymentWithToken()`.
5. Actualiza `payments` con status y `gateway_transaction_id`.
6. Si `succeeded`: `applyPaymentSuccessToOrganization()` + opcional `saveCard`.

**Validación:** `confirmPaymentSchema` (token, paymentId, payerEmail, payment_method_id).

### 3.3 Webhooks

- **Mercado Pago**: `topic=payment`, `merchant_order`, `subscription_preapproval`.
- Validación de firma cuando `MERCADOPAGO_WEBHOOK_SECRET` está configurado.
- Idempotencia: `webhook_events` evita procesar el mismo `gateway_event_id` dos veces.

---

## 4. Flujo Detallado: POS Retail

### 4.1 process-sale

**Ruta:** `POST /api/admin/pos/process-sale`

1. Admin + branch obligatorio (excepto super_admin).
2. Caja abierta: `pos_sessions.status = 'open'` para la sucursal.
3. Validación: `processSaleSchema` (items, totales, customer, payments).
4. Crea `orders` (is_pos_sale=true, pos_session_id).
5. Inserta `order_items`.
6. **Pagos**: `paymentsArray` (split) o pago único → `order_payments`.
7. Crea `pos_transactions` (sale).
8. Si marco+lentes: crea `lab_work_orders` (Cash-First: on_hold_payment si depósito insuficiente).
9. Reduce stock en `product_branch_stock`.
10. BillingAdapter (SII) en try/catch (no bloquea).

### 4.2 pending-balance/pay

**Ruta:** `POST /api/admin/pos/pending-balance/pay`

1. Inserta nuevo `order_payments` con `pos_session_id`.
2. Calcula `totalPaid` = suma de `order_payments.amount`.
3. Actualiza `orders.payment_status` (paid/partial).
4. Actualiza `lab_work_orders` asociados (deposit_amount, balance_amount, status).

### 4.3 refund

- Usa `total_paid` (suma order_payments) como techo del monto a devolver.
- Crea `credit_note` + `credit_note_movement`.
- Revierte stock, actualiza order (status=cancelled, payment_status=refunded).

---

## 5. Análisis del Estado Actual

### 5.1 Fortalezas

| Aspecto                | Estado                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| Separación SaaS vs POS | ✅ Clara: `payments` vs `order_payments`                               |
| Validación Zod         | ✅ processSaleSchema, confirmPaymentSchema, createCheckoutIntentSchema |
| Rate limiting          | ✅ En create-intent, confirm-payment, process-sale                     |
| Idempotencia webhooks  | ✅ webhook_events                                                      |
| Split payments         | ✅ paymentsArray en process-sale                                       |
| Cash-First             | ✅ on_hold_payment cuando depósito insuficiente                        |
| Multi-pasarela         | ✅ Factory + Flow, MP, PayPal, NOWPayments                             |
| Refunds                | ✅ Usa total_paid, credit_notes                                        |

### 5.2 Áreas de Mejora (Estado)

#### A. Validación y Consistencia

1. ~~**pending-balance/pay**~~ ✅ **Resuelto**: Usa `pendingBalancePaySchema` y `parseAndValidateBody`.
2. **confirm-payment**: Solo MercadoPago (Bricks). Flow, PayPal, NOWPayments son redirect-only; mensaje de error mejorado.
3. ~~**payment_method en order_payments**~~ ✅ **Resuelto**: `PAYMENT_METHOD_MAP` en `src/lib/payments/constants.ts`.

#### B. Código y Mantenibilidad

4. **PaymentGatewayFactory**: Switch hardcodeado; agregar nueva pasarela requiere modificar factory. (Pendiente)
5. ~~**confirm-payment type casting**~~ ✅ **Resuelto**: `IPaymentGateway.createPaymentWithToken?` declarado; sin type casting.
6. ~~**NOWPayments CLP→USD**~~ ✅ **Resuelto**: Variable `NOWPAYMENTS_CLP_TO_USD_RATE` (default 950).

#### C. Seguridad y Auditoría

7. **Webhooks**: Flow, PayPal, NOWPayments tienen validación de firma; revisar que todos estén protegidos. (Pendiente)
8. **Logs**: Evitar loguear tokens o datos sensibles; verificar que no se expongan en dev. (Pendiente)

#### D. UX y Resiliencia

9. **Checkout**: Si create-intent falla tras crear `payments`, el registro queda pending sin rollback explícito. (Pendiente)
10. ~~**Cleanup payments pending**~~ ✅ **Resuelto**: Cron `cleanup-pending-payments` marca pending >24h como failed.
11. **Retry webhooks**: No hay estrategia explícita de retry para webhooks fallidos (MP reintenta; otros gateways?). (Pendiente)

#### E. Óptica-Específico

11. **Depósito mínimo**: Valor puede venir de system_config o branch; verificar que esté centralizado.
12. **Folio fiscal**: `payment_reference` en order_payments; SII puede requerir trazabilidad adicional.

---

## 6. Roadmap (Estado Actualizado)

### ✅ Completadas

| #   | Mejora                        | Estado                                                       |
| --- | ----------------------------- | ------------------------------------------------------------ |
| 1   | Zod en pending-balance/pay    | `pendingBalancePaySchema` + `parseAndValidateBody`           |
| 2   | Extender IPaymentGateway      | `createPaymentWithToken?` opcional                           |
| 3   | Constante payment method map  | `PAYMENT_METHOD_MAP` en `src/lib/payments/constants.ts`      |
| 4   | NOWPayments tasa configurable | `NOWPAYMENTS_CLP_TO_USD_RATE` (env)                          |
| 7   | Cleanup payments pending      | Cron `GET /api/cron/cleanup-pending-payments` en vercel.json |

### ⏳ Pendientes

| #   | Mejora                                            | Prioridad |
| --- | ------------------------------------------------- | --------- |
| 5   | Registro de pasarelas dinámico                    | Media     |
| 6   | Validación firma en todos los webhooks            | Media     |
| 8   | Métricas de pago (conversión, fallos por gateway) | Baja      |
| 9   | Documentación API OpenAPI/Swagger                 | Baja      |

---

## 7. Mejores Prácticas (Checklist)

### Desarrollo

- [ ] Siempre validar con Zod antes de procesar pagos
- [ ] Usar createApiSuccessResponse / validationErrorResponse
- [ ] Logging en puntos clave sin datos sensibles
- [ ] Rate limiting en todas las rutas de pago
- [ ] Branch obligatorio para operaciones POS (excepto super_admin)

### Seguridad

- [ ] Verificar organization_id en checkout
- [ ] Filtrar por branch_id en queries POS
- [ ] Validar firma en webhooks cuando el gateway lo soporte
- [ ] No exponer tokens ni datos de tarjeta en logs

### Óptica-Específico

- [ ] Caja abierta antes de process-sale
- [ ] order_payments.pos_session_id en cada venta
- [ ] Refund acotado por total_paid
- [ ] Credit note en todas las devoluciones
- [ ] Cash-First: on_hold_payment cuando depósito < mínimo

---

## 8. Referencias de Código

| Componente                                 | Ruta                                                        |
| ------------------------------------------ | ----------------------------------------------------------- |
| create-intent                              | `src/app/api/checkout/create-intent/route.ts`               |
| confirm-payment                            | `src/app/api/checkout/confirm-payment/route.ts`             |
| PaymentService                             | `src/lib/payments/services/payment-service.ts`              |
| PaymentGatewayFactory                      | `src/lib/payments/index.ts`                                 |
| MercadoPagoGateway                         | `src/lib/payments/mercadopago/gateway.ts`                   |
| process-sale                               | `src/app/api/admin/pos/process-sale/route.ts`               |
| pending-balance/pay                        | `src/app/api/admin/pos/pending-balance/pay/route.ts`        |
| refund                                     | `src/app/api/admin/pos/refund/route.ts`                     |
| Webhook MP                                 | `src/app/api/webhooks/mercadopago/route.ts`                 |
| processSaleSchema, pendingBalancePaySchema | `src/lib/api/validation/zod-schemas.ts`                     |
| PAYMENT_METHOD_MAP, constants              | `src/lib/payments/constants.ts`                             |
| cleanup-pending-payments cron              | `src/app/api/cron/cleanup-pending-payments/route.ts`        |
| Skill                                      | `.cursor/skills/payment-workflow-optical-supabase/SKILL.md` |
| Checklist pruebas                          | `docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md`                   |

---

## 9. Variables de Entorno

| Variable                      | Descripción                                                  | Default |
| ----------------------------- | ------------------------------------------------------------ | ------- |
| `NOWPAYMENTS_CLP_TO_USD_RATE` | Tasa de conversión CLP→USD para NOWPayments (no soporta CLP) | 950     |
| `CRON_SECRET`                 | Secret para proteger rutas cron (cleanup-pending-payments)   | -       |

## 10. Changelog

| Fecha      | Cambio                                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-20 | Documento inicial: arquitectura, análisis, mejoras propuestas                                                                                                                                                                                           |
| 2026-02-21 | Implementación completa: pendingBalancePaySchema, PAYMENT_METHOD_MAP, IPaymentGateway.createPaymentWithToken, confirm-payment mensaje redirect-only, NOWPayments rate env, cron cleanup-pending-payments (vercel.json), estilos Epoch en checkout y POS |
| 2026-02-21 | Cron configurado como GET (Vercel Cron usa GET); credenciales Vercel documentadas                                                                                                                                                                       |
