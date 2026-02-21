# Checklist de Pruebas Manuales: Payment Workflow

**Fecha:** 2026-02-21  
**Alcance:** Validar las mejoras implementadas en el plan Payment Workflow (backend + frontend Epoch).

---

## 1. Backend: pending-balance/pay (Zod)

- [ ] **Validación order_id inválido**: Enviar `order_id: "no-uuid"` → debe retornar 400 con mensaje de validación Zod
- [ ] **Validación payment_amount negativo**: Enviar `payment_amount: -100` → debe retornar 400
- [ ] **Validación payment_method inválido**: Enviar `payment_method: "bitcoin"` → debe retornar 400
- [ ] **Pago exitoso**: Orden con saldo pendiente → registrar pago con método válido (cash, debit, credit, transfer, check) → order.payment_status actualizado, lab_work_orders actualizados si aplica

---

## 2. Backend: process-sale (PAYMENT_METHOD_MAP)

- [ ] **Venta con split payments**: Efectivo + tarjeta → order_payments creados con métodos correctos (cash, debit/credit según selección)
- [ ] **Venta única**: Un solo método → order_payment creado correctamente

---

## 3. Backend: confirm-payment (MercadoPago Bricks)

- [ ] **Pago con token MP**: Flujo completo checkout → Bricks → confirm-payment → payment succeeded
- [ ] **Gateway no-MercadoPago**: Si por error se llega a confirm-payment con gateway Flow/PayPal/NOWPayments → mensaje claro: "Este método de pago requiere completar el pago en la ventana externa..."

---

## 4. Backend: create-intent (NOWPayments)

- [ ] **Tasa por defecto**: Sin `NOWPAYMENTS_CLP_TO_USD_RATE` → usa 950
- [ ] **Tasa configurada**: Con `NOWPAYMENTS_CLP_TO_USD_RATE=1000` → monto USD calculado con esa tasa

---

## 5. Backend: Cron cleanup-pending-payments

- [ ] **Sin CRON_SECRET (local)**: `GET /api/cron/cleanup-pending-payments` sin header → 401 si CRON_SECRET está definido
- [ ] **Con CRON_SECRET**: `Authorization: Bearer <CRON_SECRET>` → 200, payments pending >24h marcados como failed
- [ ] **Vercel**: Tras deploy, verificar en Vercel Dashboard → Cron Jobs que el job está configurado (02:00 UTC)

---

## 6. Frontend: Checkout (Design System Epoch)

- [ ] **Layout**: Fondo `bg-admin-bg-primary`, sin gradientes slate
- [ ] **CheckoutPageContent**: Pasos 1-2-3 con `rounded-none`, textos con `admin-text-*`, bordes `admin-border-primary`
- [ ] **Checkout result**: Card con `rounded-none`, iconos de estado con `admin-success`, `admin-error`, `admin-warning`
- [ ] **Responsive**: Verificar en móvil y desktop que no hay desbordes ni estilos rotos

---

## 7. Frontend: POS Payment Dialog

- [ ] **Abrir diálogo de pago**: Al finalizar venta → diálogo con estilos `admin-*` (no gray-\*, green-600, blue-600)
- [ ] **Botones y labels**: `rounded-none`, `text-admin-text-secondary`, etc.

---

## 8. Frontend: POS Pending Balance Dialog

- [ ] **Orden con saldo pendiente**: Abrir diálogo "Saldo pendiente" → inputs, selects y cards con tokens `admin-*`
- [ ] **Registrar pago**: Seleccionar método, monto → enviar → verificar que el pago se registra y el diálogo se cierra correctamente

---

## 9. Integración E2E (Opcional)

- [ ] **Flujo completo POS**: Abrir caja → agregar productos → venta con split → cerrar venta → verificar order_payments y pos_transactions
- [ ] **Flujo completo Checkout SaaS**: create-intent → MercadoPago Bricks → confirm-payment → redirect a result?success=1

---

## Resumen

| Área                      | Items | Críticos                            |
| ------------------------- | ----- | ----------------------------------- |
| pending-balance/pay       | 4     | 1 (pago exitoso)                    |
| process-sale              | 2     | 1 (split)                           |
| confirm-payment           | 2     | 1 (MP Bricks)                       |
| create-intent NOWPayments | 2     | 0                                   |
| Cron                      | 3     | 1 (Vercel)                          |
| Frontend Checkout         | 4     | 2 (layout, result)                  |
| Frontend POS              | 4     | 2 (payment dialog, pending balance) |
| E2E                       | 2     | 0                                   |
