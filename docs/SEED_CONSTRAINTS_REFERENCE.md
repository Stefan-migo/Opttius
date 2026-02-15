# Seed Demo - CHECK Constraints Reference

Referencia de valores permitidos por tabla/columna para el seed de demo (`seed_demo_organization_data`). Usar como checklist al modificar el seed para evitar violaciones de CHECK constraints.

## Tablas usadas por el seed

| Tabla                                | Columna             | Valores permitidos                                                                                                                                                                                 | Fuente         |
| ------------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **appointments**                     | appointment_type    | `eye_exam`, `consultation`, `fitting`, `delivery`, `repair`, `follow_up`, `emergency`, `other`                                                                                                     | 20250123000000 |
| **appointments**                     | status              | `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`                                                                                                                                      | 20250123000000 |
| **lab_work_orders**                  | status              | `quote`, `ordered`, `on_hold_payment`, `sent_to_lab`, `in_progress_lab`, `ready_at_lab`, `received_from_lab`, `mounted`, `quality_check`, `ready_for_pickup`, `delivered`, `cancelled`, `returned` | 20260122000007 |
| **lab_work_orders**                  | payment_status      | `pending`, `partial`, `paid` (y otros según esquema)                                                                                                                                               | -              |
| **cash_register_closures**           | status              | `draft`, `confirmed`, `reviewed`, `closed`                                                                                                                                                         | 20260129000002 |
| **optical_internal_support_tickets** | category            | `lens_issue`, `frame_issue`, `prescription_issue`, `delivery_issue`, `payment_issue`, `appointment_issue`, `customer_complaint`, `quality_issue`, `other`                                          | 20260201000002 |
| **optical_internal_support_tickets** | priority            | `low`, `medium`, `high`, `urgent`                                                                                                                                                                  | 20260201000002 |
| **optical_internal_support_tickets** | status              | `open`, `assigned`, `in_progress`, `waiting_customer`, `resolved`, `closed`                                                                                                                        | 20260201000002 |
| **orders**                           | status              | `pending`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`                                                                                                                           | 20241220000001 |
| **orders**                           | payment_status      | `pending`, `paid`, `failed`, `refunded`, `partially_refunded`, `partial`, `on_hold_payment`                                                                                                        | 20260127000000 |
| **orders**                           | payment_method_type | `cash`, `debit_card`, `credit_card`, `installments`, `transfer`, `check`, `mercadopago`, `other`, `deposit`, `card`                                                                                | 20260127000001 |
| **products**                         | status              | `draft`, `active`, `archived`                                                                                                                                                                      | 20241220000001 |
| **quotes**                           | status              | (ver migraciones de quotes)                                                                                                                                                                        | -              |

## Valores inválidos conocidos (evitar)

- **appointments.appointment_type**: `adjustment` → usar `fitting` (Ajuste de lentes)

## Flujo recomendado antes de push

1. `npm run supabase:reset` - aplica migraciones y seed inicial
2. `npm run validate:demo-reset` - prueba el reset completo
3. Si pasa, hacer push de migraciones

## Actualización

Al añadir o modificar CHECK constraints en migraciones, actualizar esta tabla y verificar que el seed use solo valores permitidos.
