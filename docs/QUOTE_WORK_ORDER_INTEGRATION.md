# Integración Presupuestos - Órdenes de Trabajo

Documento que describe cómo se integran los sistemas de presupuestos (quotes) y órdenes de trabajo (lab_work_orders) en Opttius.

---

## 1. Flujos de Integración

### Flujo A: Conversión directa (Quote → Work Order)

**Endpoint:** `POST /api/admin/quotes/[id]/convert`

1. Usuario convierte presupuesto aceptado a orden de trabajo.
2. Se genera `work_order_number` (TRB-YYYY-NNNN).
3. Se crea `lab_work_order` con datos del quote.
4. Se actualiza quote: `status = accepted`, `converted_to_work_order_id = newWorkOrder.id`.
5. Notificaciones: `notifyQuoteConverted`, `notifyNewWorkOrder`.

### Flujo B: Carga al POS (Quote → Load-to-POS → Process-Sale → Work Order)

**Endpoints:** `POST /api/admin/quotes/[id]/load-to-pos` → `POST /api/admin/pos/process-sale`

1. Usuario carga presupuesto al carrito POS.
2. Load-to-pos devuelve items (marco, lente(s), near_frame, near_lens para two_separate).
3. Usuario procesa venta en POS.
4. Process-sale crea order y lab_work_order.
5. Se actualiza quote: `status = accepted`, `converted_to_work_order_id`.

---

## 2. Campos copiados de Quote a lab_work_order (Convert)

| Campo                                                                                                                         | Descripción                                        |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| customer_id, prescription_id, branch_id, organization_id                                                                      | Identificadores                                    |
| frame_product_id, frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku                                    | Marco                                              |
| customer_own_frame                                                                                                            | Marco del cliente                                  |
| lens*family_id, lens_type, lens_material, lens_index, lens_treatments, lens_tint*\*                                           | Lente principal                                    |
| presbyopia_solution                                                                                                           | none, two_separate, bifocal, trifocal, progressive |
| far_lens_family_id, near_lens_family_id, far_lens_cost, near_lens_cost                                                        | Presbicia two_separate                             |
| near_frame_product_id, near_frame_name, near_frame_brand, near_frame_model, near_frame_color, near_frame_size, near_frame_sku | Marco de cerca (two_separate)                      |
| near_frame_price, near_frame_cost, near_frame_price_includes_tax, customer_own_near_frame                                     | Marco de cerca (precio/costo)                      |
| contact*lens_family_id, contact_lens_rx*\*, contact_lens_quantity, contact_lens_cost                                          | Lentes de contacto                                 |
| prescription_snapshot                                                                                                         | Receta al momento de crear                         |
| frame_cost, lens_cost, treatments_cost, labor_cost                                                                            | Costos                                             |
| subtotal, tax_amount, discount_amount, total_amount, currency                                                                 | Totales                                            |

**Nota:** Desde la migración `add_near_frame_fields_to_lab_work_orders`, los campos `near_frame_*` se copian correctamente en el convert.

---

## 3. Relación bidireccional

```
quotes 1──1 lab_work_orders
  - quotes.converted_to_work_order_id → lab_work_orders.id
  - lab_work_orders.quote_id → quotes.id
```

Al eliminar un work order con `quote_id`, se elimina también el quote asociado.

---

## 4. Gaps cerrados (2026-02-18)

- Convert copia presbyopia, contact*lens, organization_id, lens_family_id, customer_own_frame, near_frame*\* (two_separate).
- Load-to-pos envía near_frame y near_lens para presbicia two_separate.
- POST quotes persiste presbyopia y near_frame.
- PUT quotes actualiza presbyopia, near_frame, contact_lens.
- Validación prescription.customer_id === quote.customer_id en API.

---

## 5. Referencias

- Skill presupuestos: `.cursor/skills/quotes-optical-supabase/SKILL.md`
- Skill trabajos: `.cursor/skills/work-orders-optical-supabase/SKILL.md`
- Docs: `docs/QUOTES_SYSTEM.md`, `docs/WORK_ORDERS_SYSTEM.md`
