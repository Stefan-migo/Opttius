# Checklist Maestro: Demo Óptica Multi-Sucursal

Documento de referencia para la base de datos demo de **Óptica Mirada Clara**, una óptica chilena con 6 meses de operación progresiva y dos sucursales que abren en momentos distintos.

---

## Nombre de la óptica demo

**Óptica Mirada Clara** — Nombre memorable y profesional para Chile.

---

## Identificadores

| Entidad                  | UUID                                   |
| ------------------------ | -------------------------------------- |
| Organización             | `00000000-0000-0000-0000-000000000001` |
| Sucursal 1 (Casa Matriz) | `00000000-0000-0000-0000-000000000002` |
| Sucursal 2 (Providencia) | `00000000-0000-0000-0000-000000000003` |

---

## Elementos obligatorios por módulo

### Organización y sucursales

| Elemento              | Descripción                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `organizations`       | 1 org: Óptica Mirada Clara, slug `optica-mirada-clara`, tier premium |
| `branches`            | 2 sucursales: Casa Matriz (mes 0), Sucursal Providencia (mes 4)      |
| `admin_users`         | 1 admin de la óptica (crear vía UI o script)                         |
| `admin_branch_access` | Acceso del admin a ambas sucursales                                  |

### CRM

| Elemento        | Sucursal 1                       | Sucursal 2      |
| --------------- | -------------------------------- | --------------- |
| `customers`     | 20–25 clientes                   | 15–20 clientes  |
| `prescriptions` | 1+ por customer con receta       | 1+ por customer |
| Contactología   | Opcional (contact_lens_families) | Opcional        |

- RUTs chilenos válidos (formato 12.345.678-9)
- Emails: @email.com (B1), @providencia.cl (B2)
- Teléfonos: +56 9 XXXX XXXX

### Citas

| Elemento            | Sucursal 1          | Sucursal 2         |
| ------------------- | ------------------- | ------------------ |
| `appointments`      | ~80–120 (meses 0–4) | ~40–60 (meses 4–6) |
| `schedule_settings` | Por branch          | Por branch         |

**Tipos de cita**: eye_exam, consultation, fitting, delivery, adjustment, repair, follow_up

**Estados**: scheduled, confirmed, completed, cancelled, no_show

### Presupuestos

| Elemento         | Sucursal 1 | Sucursal 2 |
| ---------------- | ---------- | ---------- |
| `quotes`         | ~25–40     | ~15–25     |
| `quote_settings` | Por branch | Por branch |

**Estados**: draft, sent, accepted, converted_to_work, rejected, expired

**Conversión**: Algunos quotes convertidos a lab_work_orders u orders

### Órdenes de trabajo

| Elemento          | Sucursal 1 | Sucursal 2 |
| ----------------- | ---------- | ---------- |
| `lab_work_orders` | ~20–30     | ~15–20     |

**Estados**: ordered, sent_to_lab, in_progress_lab, ready_at_lab, received_from_lab, mounted, quality_check, ready_for_pickup, delivered

**Campos obligatorios**: frame_name, lens_type, lens_material, prescription_id

### POS

| Elemento                 | Sucursal 1            | Sucursal 2            |
| ------------------------ | --------------------- | --------------------- |
| `orders`                 | ~60–80                | ~30–40                |
| `order_items`            | 1+ por order          | 1+ por order          |
| `order_payments`         | Para orders pagados   | Para orders pagados   |
| `pos_sessions`           | Días laborables T0–T4 | Días laborables T4–T6 |
| `cash_register_closures` | Por día laborable     | Por día laborable     |

### Inventario

| Elemento               | Descripción                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `products`             | 10 marcos, 5 lentes sol, 5 accesorios, 5 servicios            |
| `categories`           | Usar existentes: marcos, lentes-de-sol, accesorios, servicios |
| `product_branch_stock` | Stock por sucursal para cada producto                         |
| `lens_families`        | 10–18 familias (org-scoped)                                   |
| `lens_price_matrices`  | Precios por esfera/cilindro/adición                           |

### Pagos

| Elemento         | Descripción                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `order_payments` | payment_method_type: cash, credit_card, debit_card, installments |

### Configuración

| Elemento            | Descripción                                |
| ------------------- | ------------------------------------------ |
| `schedule_settings` | Por branch (horarios, slot_duration, etc.) |
| `quote_settings`    | Por branch                                 |
| `pos_settings`      | Por branch (min_deposit_percent)           |

### Soporte

| Elemento                           | Descripción                    |
| ---------------------------------- | ------------------------------ |
| `optical_internal_support_tickets` | Opcional, requiere admin_users |

---

## Criterios de coherencia temporal

| Período        | Fecha relativa            | Descripción                           |
| -------------- | ------------------------- | ------------------------------------- |
| **Mes 0 (T0)** | `CURRENT_DATE - 6 months` | Inicio óptica, solo sucursal 1        |
| **Meses 1–3**  | T0 + 1 a T0 + 3 meses     | Solo sucursal 1, volúmenes crecientes |
| **Mes 4 (T4)** | `CURRENT_DATE - 2 months` | Apertura sucursal 2                   |
| **Meses 4–6**  | T4 a hoy                  | Ambas sucursales operando             |

**Progresión de volúmenes**:

- Menos citas/presupuestos al inicio (mes 0–1)
- Más actividad hacia mes 4 en sucursal 1
- Sucursal 2 con ~50% del volumen de sucursal 1 en su período

---

## Consideraciones multi-sucursal

1. **branch_id**: Todas las tablas con branch_id deben tenerlo correcto
2. **organization_id**: En customers, quotes, orders, lab_work_orders, appointments
3. **Productos**: organization_id + branch_id; productos compartidos por org
4. **Stock**: product_branch_stock por (product_id, branch_id)
5. **Números secuenciales**: COT-DEMO1-YYYY-NNNN, TRB-DEMO1-YYYY-NNNN, ORD-DEMO1-YYYY-NNNNN para sucursal 1; COT-PROV-..., TRB-PROV-..., ORD-PROV-... para sucursal 2

---

## UUIDs deterministas

| Prefijo  | Entidad               |
| -------- | --------------------- |
| 10000000 | Customers sucursal 1  |
| 11000000 | Customers sucursal 2  |
| 20000000 | Products              |
| 30000000 | Prescriptions         |
| 40000000 | Lens families         |
| 50000000 | Orders                |
| 60000000 | Appointments          |
| 70000000 | Contact lens families |

---

## Constraints y ON CONFLICT

- `quotes.quote_number`: UNIQUE
- `lab_work_orders.work_order_number`: UNIQUE
- `orders.order_number`: UNIQUE
- `products.slug`: UNIQUE
- `cash_register_closures`: UNIQUE(branch_id, closure_date)
- `organizations`: ON CONFLICT (id) o (slug) según schema
