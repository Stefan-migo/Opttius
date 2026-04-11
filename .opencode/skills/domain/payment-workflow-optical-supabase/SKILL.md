---
name: payment-workflow-optical-supabase
description: Expert guide for building and maintaining the Payment workflow system for optical shops with Supabase. Use when working on checkout, payment gateways, pasarelas de pago, flujo de pago, order_payments, payments table, process-sale, POS payments, SaaS subscriptions, Mercado Pago, Flow, PayPal, NOWPayments, refunds, webhooks, or optical retail payment processing.
---

# Payment Workflow para Ópticas con Supabase

Guía para desarrollar y mantener un sistema de pagos de alta calidad para ópticas usando Supabase y Next.js.

## Cuándo Usar Este Skill

- Checkout SaaS (`/checkout`) - suscripciones
- Pagos POS (`process-sale`, `order_payments`)
- Pasarelas (Mercado Pago, Flow, PayPal, NOWPayments)
- Webhooks de pago
- Saldos pendientes y abonos
- Devoluciones y notas de crédito
- Integración SII y facturación

## Arquitectura: Dos Capas de Pago

El sistema tiene **dos flujos distintos** que no deben confundirse:

| Capa              | Tabla            | Contexto                                    | Pasarelas                     |
| ----------------- | ---------------- | ------------------------------------------- | ----------------------------- |
| **SaaS Checkout** | `payments`       | Suscripciones organizacionales              | MP, Flow, PayPal, NOWPayments |
| **POS Retail**    | `order_payments` | Ventas óptica (efectivo, tarjeta, transfer) | Manual (no pasarela externa)  |

### SaaS Checkout Flow

```
Usuario → /checkout → create-intent → payments (pending)
       → MercadoPago Bricks / redirect → confirm-payment
       → payments (succeeded) → subscriptions + organizations
       → Webhook (backup) → idempotencia webhook_events
```

### POS Retail Flow

```
Carrito POS → process-sale → orders + order_items + order_payments
          → pos_transactions → pos_sessions
          → lab_work_orders (si marco+lentes)
          → BillingAdapter (SII)
```

## Reglas Críticas

1. **Caja abierta obligatoria**: POS requiere `pos_session` abierta (excepto super_admin).
2. **Branch obligatorio**: Usuario debe tener sucursal (x-branch-id) para ventas.
3. **Validación Zod**: Siempre `processSaleSchema` en process-sale; `confirmPaymentSchema` en confirm-payment.
4. **Split payments**: `paymentsArray` en process-sale permite múltiples métodos por orden.
5. **Cash-First**: Si `paymentAmount < minDeposit` → work_order `on_hold_payment`.
6. **Idempotencia webhooks**: `webhook_events` evita procesar dos veces el mismo evento.

## Tablas Principales

| Tabla              | Propósito                                            |
| ------------------ | ---------------------------------------------------- |
| `payments`         | Pagos SaaS (gateways externos, suscripciones)        |
| `order_payments`   | Pagos POS (efectivo, tarjeta, transfer por orden)    |
| `webhook_events`   | Idempotencia de webhooks (gateway, gateway_event_id) |
| `pos_sessions`     | Sesiones de caja (vinculan order_payments)           |
| `pos_transactions` | Log de transacciones (sale, refund, void)            |

## API Routes

### Checkout (SaaS)

| Ruta                            | Método | Propósito                                                  |
| ------------------------------- | ------ | ---------------------------------------------------------- |
| `/api/checkout/create-intent`   | POST   | Crear intent, retorna paymentId, approvalUrl, clientSecret |
| `/api/checkout/confirm-payment` | POST   | Confirmar pago con token (MercadoPago Bricks)              |
| `/api/checkout/gateways`        | GET    | Gateways activos                                           |
| `/api/checkout/tiers`           | GET    | Planes de suscripción                                      |

### POS

| Ruta                                 | Método | Propósito                                     |
| ------------------------------------ | ------ | --------------------------------------------- |
| `/api/admin/pos/process-sale`        | POST   | Procesar venta completa                       |
| `/api/admin/pos/pending-balance/pay` | POST   | Registrar abono a orden con saldo             |
| `/api/admin/pos/refund`              | POST   | Devolución (usa total_paid de order_payments) |

### Webhooks

| Ruta                        | Propósito                                            |
| --------------------------- | ---------------------------------------------------- |
| `/api/webhooks/mercadopago` | MP payment, merchant_order, subscription_preapproval |
| `/api/webhooks/paypal`      | PayPal IPN                                           |
| `/api/webhooks/flow`        | Flow                                                 |
| `/api/webhooks/nowpayments` | NOWPayments                                          |

## Mejores Prácticas

### Código

- **Rate limiting**: `rateLimitConfigs.payment` en checkout; `rateLimitConfigs.pos` en process-sale.
- **Validación**: Siempre parseAndValidateBody con Zod antes de procesar.
- **Logging**: `logger.info` en puntos clave; no exponer datos sensibles.
- **No bloquear**: Billing y notificaciones en try/catch; no fallar la venta.

### Seguridad

- Validar `organization_id` en checkout (payment.organization_id === orgId).
- Filtrar por `branch_id` en todas las queries POS.
- Webhooks: validar firma (MercadoPagoWebhookValidator) cuando MERCADOPAGO_WEBHOOK_SECRET configurado.

### Óptica-Específico

- **Depósito mínimo**: Configurable; work_order `on_hold_payment` si no se alcanza.
- **Saldos pendientes**: `total_paid` = suma order_payments; refund acotado por total_paid.
- **Devoluciones**: Siempre crear `credit_note` + `credit_note_movement`; revertir stock.

## Checklist de Calidad Payment Workflow

- [ ] Caja abierta verificada antes de process-sale
- [ ] processSaleSchema / confirmPaymentSchema validados
- [ ] order_payments con pos_session_id en ventas POS
- [ ] Split payments (paymentsArray) soportado en process-sale
- [ ] Webhooks con idempotencia (webhook_events)
- [ ] Refund usa total_paid (order_payments), no total_amount
- [ ] Rate limiting en create-intent y confirm-payment
- [ ] Respuestas API con createApiSuccessResponse / validationErrorResponse

## Referencias

- Documentación: `docs/PAYMENT_WORKFLOW_SYSTEM.md`
- POS skill: `.cursor/skills/pos-optical-supabase/SKILL.md`
- API create-intent: `src/app/api/checkout/create-intent/route.ts`
- API confirm-payment: `src/app/api/checkout/confirm-payment/route.ts`
- PaymentService: `src/lib/payments/services/payment-service.ts`
- process-sale: `src/app/api/admin/pos/process-sale/route.ts`
