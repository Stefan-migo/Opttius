# SaaS Management API - Documentación de Webhooks

**Última actualización:** 2026-04-01

---

## Resumen

Los webhooks permiten recibir notificaciones asíncronas de eventos de pago y suscripción desde las pasarelas de pago integradas.

---

## Endpoints de Webhook

### Mercado Pago

**URL:** `POST /api/webhooks/mercadopago`

**Parametros de Query:**

- `topic`: Tipo de evento (`payment`, `merchant_order`, `subscription_preapproval`, `preapproval`)
- `id`: ID del evento en Mercado Pago

**Headers Requeridos:**

- `x-signature`: Firma HMAC (cuando `MERCADOPAGO_WEBHOOK_SECRET` está configurado)
- `x-request-id`: ID de request de Mercado Pago

**Eventos Soportados:**

| Topic                      | Descripción                       | Acción                           |
| -------------------------- | --------------------------------- | -------------------------------- |
| `payment`                  | Pago procesado                    | Actualizar payment status        |
| `merchant_order`           | Orden de pago completada          | Actualizar subscription a active |
| `subscription_preapproval` | Cambio en suscripción preapproval | Actualizar status de suscripción |
| `preapproval`              | Preapproval actualizado           | Actualizar status de suscripción |

**Status de Suscripción:**

| MP Status    | Subscription Status |
| ------------ | ------------------- |
| `authorized` | `active`            |
| `pending`    | `active`            |
| `cancelled`  | `cancelled`         |
| `paused`     | `past_due`          |

### PayPal

**URL:** `POST /api/webhooks/paypal`

**Notas:** IPN (Instant Payment Notification) de PayPal

### Flow

**URL:** `POST /api/webhooks/flow`

### NOWPayments

**URL:** `POST /api/webhooks/nowpayments`

---

## Configuración

### Mercado Pago

1. Ir a tu cuenta de Mercado Pago Developers
2. Crear una aplicación o usar existente
3. Ir a "Webhooks" y agregar URL:
   ```
   https://tu-dominio.com/api/webhooks/mercadopago
   ```
4. Configurar eventos a escuchar:
   - `payment`
   - `merchant_order`
   - `subscription_preapproval`

### Configuración de Firma (Opcional)

Establecer en `.env.local`:

```bash
MERCADOPAGO_WEBHOOK_SECRET=tu_secret
```

---

## Ejemplos de Payload

### Payment (Mercado Pago)

```json
{
  "id": 123456789,
  "type": "payment",
  "action": "payment.updated",
  "data": {
    "id": "123456789"
  }
}
```

### Subscription Preapproval

```json
{
  "id": "preapproval_id",
  "type": "subscription_preapproval",
  "action": "subscription_preapproval.updated",
  "data": {
    "id": "preapproval_id",
    "status": "authorized"
  },
  "date_created": "2026-04-01T00:00:00Z"
}
```

---

## Referencias

- Código: `src/app/api/webhooks/mercadopago/route.ts`
- PaymentService: `src/lib/payments/services/payment-service.ts`
- Webhook Validator: `src/lib/payments/mercadopago/webhook-validator.ts`
