# Sistema de Órdenes de Trabajo (Work Orders) - Opttius

Documentación detallada del módulo de órdenes de trabajo (trabajos de laboratorio) para ópticas. Base de la estructura de documentación del programa.

---

## 1. Introducción

El sistema de órdenes de trabajo de Opttius gestiona el ciclo completo de fabricación de lentes oftálmicos: desde la venta o presupuesto hasta la entrega al cliente. Integra datos clínicos (recetas), inventario de marcos, laboratorios externos, control de calidad y el punto de venta (POS) bajo una arquitectura multi-tenant.

### Alcance

- **Trabajos de laboratorio**: Órdenes de marco + lentes que requieren montaje.
- **Ciclo de vida**: 13 estados desde quote hasta delivered.
- **Orígenes**: POS (process-sale), conversión de presupuesto, API directa.
- **Integraciones**: Orders, Quotes, Prescriptions, Customers, Products, Branches.

### Principios de Diseño

1. **Multi-tenant**: Aislamiento por organización y sucursal.
2. **Cash-First**: Trabajos con pago insuficiente no visibles en taller (on_hold_payment).
3. **Audit trail**: Historial de cambios de estado con usuario y timestamp.
4. **Óptica-first**: Marcos, lentes, presbicia, tratamientos, laboratorios externos.

---

## 2. Arquitectura de Datos

### 2.1 Tabla `lab_work_orders`

| Columna                                                      | Tipo          | Nullable | Descripción                                         |
| ------------------------------------------------------------ | ------------- | -------- | --------------------------------------------------- |
| id                                                           | UUID          | NO       | PK, gen_random_uuid()                               |
| work_order_number                                            | TEXT          | NO       | Único, formato TRB-YYYY-NNNN                        |
| work_order_date                                              | DATE          | NO       | Fecha de creación                                   |
| customer_id                                                  | UUID          | NO       | FK profiles (customers)                             |
| prescription_id                                              | UUID          | YES      | FK prescriptions                                    |
| quote_id                                                     | UUID          | YES      | FK quotes (si convertido)                           |
| branch_id                                                    | UUID          | YES      | FK branches                                         |
| organization_id                                              | UUID          | YES      | FK organizations                                    |
| frame_product_id                                             | UUID          | YES      | FK products                                         |
| frame_name                                                   | TEXT          | NO       | Nombre del marco                                    |
| frame_brand, frame_model, frame_color, frame_size, frame_sku | TEXT          | YES      | Snapshot marco                                      |
| frame_serial_number                                          | TEXT          | YES      | Serie del marco específico                          |
| customer_own_frame                                           | BOOLEAN       | NO       | Marco del cliente (costo 0)                         |
| lens_family_id                                               | UUID          | YES      | FK lens_families                                    |
| lens_type                                                    | TEXT          | NO       | single_vision, bifocal, trifocal, progressive, etc. |
| lens_material                                                | TEXT          | NO       | polycarbonate, high_index_1_67, etc.                |
| lens_index                                                   | DECIMAL       | YES      | Índice refractivo                                   |
| lens_treatments                                              | TEXT[]        | NO       | anti_reflective, blue_light_filter, etc.            |
| lens_tint_color, lens_tint_percentage                        | TEXT, INT     | YES      | Tinte                                               |
| presbyopia_solution                                          | TEXT          | YES      | none, two_separate, bifocal, trifocal, progressive  |
| far_lens_family_id, near_lens_family_id                      | UUID          | YES      | Para two_separate                                   |
| far_lens_cost, near_lens_cost                                | DECIMAL       | YES      | Costos lejos/cerca                                  |
| contact_lens_family_id                                       | UUID          | YES      | Lentes de contacto                                  |
| contact*lens_rx*\*                                           | varios        | YES      | Rx OD/OS para contacto                              |
| contact_lens_quantity, contact_lens_cost                     | INT, DECIMAL  | YES      | Cantidad y costo                                    |
| prescription_snapshot                                        | JSONB         | YES      | Receta al momento de crear                          |
| lab_name, lab_contact, lab_order_number                      | TEXT          | YES      | Info laboratorio externo                            |
| lab_estimated_delivery_date                                  | DATE          | YES      | Fecha estimada lab                                  |
| status                                                       | TEXT          | YES      | Ver sección 3                                       |
| ordered_at, sent_to_lab_at, ...                              | TIMESTAMPTZ   | YES      | Timestamps por estado                               |
| frame_cost, lens_cost, treatments_cost, labor_cost, lab_cost | DECIMAL       | YES      | Costos                                              |
| subtotal, tax_amount, discount_amount, total_amount          | DECIMAL       | YES      | Totales                                             |
| payment_status                                               | TEXT          | YES      | pending, partial, paid, refunded                    |
| payment_method, deposit_amount, balance_amount               | TEXT, DECIMAL | YES      | Pago                                                |
| pos_order_id                                                 | UUID          | YES      | FK orders (si desde POS)                            |
| internal_notes, customer_notes, lab_notes, quality_notes     | TEXT          | YES      | Notas                                               |
| cancellation_reason                                          | TEXT          | YES      | Si cancelado                                        |
| created_by, assigned_to                                      | UUID          | YES      | FK auth.users                                       |
| lab_contact_person                                           | TEXT          | YES      | Persona en lab                                      |
| warranty_start_date, warranty_end_date, warranty_details     | DATE, TEXT    | YES      | Garantía                                            |
| created_at, updated_at                                       | TIMESTAMPTZ   | YES      | Auditoría                                           |

### 2.2 Tabla `lab_work_order_status_history`

| Columna       | Tipo        | Descripción        |
| ------------- | ----------- | ------------------ |
| id            | UUID        | PK                 |
| work_order_id | UUID        | FK lab_work_orders |
| from_status   | TEXT        | Estado anterior    |
| to_status     | TEXT        | Estado nuevo       |
| changed_at    | TIMESTAMPTZ | Momento del cambio |
| changed_by    | UUID        | FK auth.users      |
| notes         | TEXT        | Notas del cambio   |

### 2.3 Constraint de Status

```sql
status IN (
  'quote', 'ordered', 'on_hold_payment',
  'sent_to_lab', 'in_progress_lab', 'ready_at_lab',
  'received_from_lab', 'mounted', 'quality_check',
  'ready_for_pickup', 'delivered', 'cancelled', 'returned'
)
```

### 2.4 Índices

- idx_lab_work_orders_customer_id
- idx_lab_work_orders_status
- idx_lab_work_orders_work_order_number
- idx_lab_work_orders_prescription_id
- idx_lab_work_orders_quote_id
- idx_lab_work_orders_assigned_to
- idx_lab_work_orders_created_at
- idx_status_history_work_order_id
- idx_status_history_changed_at

---

## 3. Ciclo de Vida y Estados

### 3.1 Diagrama de Estados

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    FLUJO PRINCIPAL                        │
                    └─────────────────────────────────────────────────────────┘

quote ──► on_hold_payment ──► ordered ──► sent_to_lab ──► in_progress_lab
  │              │                │              │
  │              │                │              └──► ready_at_lab
  │              │                │                        │
  │              │                │                        ▼
  │              │                │              received_from_lab ──► mounted
  │              │                │                        │                  │
  │              │                │                        │                  ▼
  │              │                │                        │            quality_check
  │              │                │                        │                  │
  │              │                │                        │                  ▼
  │              │                │                        │          ready_for_pickup
  │              │                │                        │                  │
  │              │                │                        │                  ▼
  │              │                └────────────────────────┴──────────► delivered
  │              │
  └──────────────┴──► cancelled | returned
```

### 3.2 Descripción de Estados

| Estado            | Descripción                    | Visible Taller | Timestamp            |
| ----------------- | ------------------------------ | -------------- | -------------------- |
| quote             | Presupuesto, no confirmado     | No             | work_order_date      |
| on_hold_payment   | Pago insuficiente (Cash-First) | No             | -                    |
| ordered           | Orden confirmada               | Sí             | ordered_at           |
| sent_to_lab       | Enviado a lab externo          | Sí             | sent_to_lab_at       |
| in_progress_lab   | En proceso en lab              | Sí             | lab_started_at       |
| ready_at_lab      | Listo en lab                   | Sí             | lab_completed_at     |
| received_from_lab | Recibido del lab               | Sí             | received_from_lab_at |
| mounted           | Lentes montados                | Sí             | mounted_at           |
| quality_check     | Control calidad                | Sí             | quality_checked_at   |
| ready_for_pickup  | Listo para retiro              | Sí             | ready_at             |
| delivered         | Entregado                      | -              | delivered_at         |
| cancelled         | Cancelado                      | -              | cancelled_at         |
| returned          | Devuelto                       | -              | -                    |

### 3.3 Transiciones Válidas

No hay validación estricta de transiciones en la API actual. Cualquier estado puede cambiar a cualquier otro. Para un sistema de alta gama, se recomienda implementar una máquina de estados con transiciones permitidas explícitas.

---

## 4. Orígenes de Creación

### 4.1 Desde POS (process-sale)

**Endpoint**: POST /api/admin/pos/process-sale

**Condiciones**:

- Carrito con marco + lentes que requieren montaje
- Cliente obligatorio
- Depósito mínimo según pos_settings.min_deposit_percent

**Flujo**:

1. Crear order + order_items + order_payments
2. Reducir stock (marco si no customer_own_frame)
3. Generar work_order_number
4. Determinar status (on_hold_payment si pago < minDeposit, else ordered)
5. Insert lab_work_orders con pos_order_id
6. RPC update_work_order_status si status != quote
7. Notificar notifyNewWorkOrder
8. Si quote_id: actualizar quote.converted_to_work_order_id

### 4.2 Desde Presupuesto (convert)

**Endpoint**: POST /api/admin/quotes/[id]/convert

**Condiciones**:

- Quote no convertido
- Acceso a branch del quote

**Flujo**:

1. Generar work_order_number
2. Obtener prescription_snapshot si prescription_id
3. Insert lab_work_orders (status = ordered)
4. Actualizar quote: status=accepted, converted_to_work_order_id
5. Notificar notifyQuoteConverted, notifyNewWorkOrder

**Limitación actual**: No copia presbyopia*solution, far/near_lens*_, contact*lens*_, organization_id.

### 4.3 API Directa

**Endpoint**: POST /api/admin/work-orders

**Uso**: Creación manual. El formulario CreateWorkOrderForm fue removido del UI; los trabajos se crean principalmente desde POS para evitar trabajos sin vínculo financiero.

---

## 5. API Reference

### 5.1 GET /api/admin/work-orders

Lista trabajos con paginación y filtros.

**Query params**:

- page, limit: Paginación
- status: Filtro por estado (all por defecto)
- customer_id: Filtrar por cliente

**Headers**:

- x-branch-id: Sucursal (obligatorio para no super admin)

**Response**: createPaginatedResponse con workOrders y pagination.

### 5.2 POST /api/admin/work-orders

Crear trabajo. Validación: createWorkOrderSchema.

### 5.3 GET /api/admin/work-orders/[id]

Detalle con customer, prescription, quote, frame_product, statusHistory.

### 5.4 PUT /api/admin/work-orders/[id]

Actualizar campos editables. No incluye status (usar endpoint status).

### 5.5 DELETE /api/admin/work-orders/[id]

Eliminar. Restricciones:

- status=delivered: requiere body.allowDelivered=true
- payment_status paid/partial: requiere allowDelivered
- Si quote_id: también elimina el quote

### 5.6 PUT /api/admin/work-orders/[id]/status

Cambiar estado. Body: { status, notes, lab_name, lab_contact, lab_order_number, lab_estimated_delivery_date, ... }

Usa RPC update_work_order_status. Notifica y envía email si ready_for_pickup.

### 5.7 POST /api/admin/work-orders/[id]/deliver

Entregar trabajo. Valida saldo con calculate_order_balance si pos_order_id. No permite entrega con saldo > 0.

---

## 6. RPC y Funciones

### generate_work_order_number()

Retorna TEXT. Formato TRB-YYYY-NNNN. Secuencia por año.

### update_work_order_status(p_work_order_id, p_new_status, p_changed_by, p_notes)

- Actualiza lab_work_orders.status
- Actualiza timestamp correspondiente (ordered_at, sent_to_lab_at, etc.)
- Inserta en lab_work_order_status_history

### get_min_deposit(p_order_total, p_branch_id)

Retorna depósito mínimo desde pos_settings. Usado en Cash-First.

### calculate_order_balance(p_order_id)

Retorna saldo pendiente (total - pagos). Usado en deliver.

---

## 7. Seguridad (RLS)

Las políticas actuales en lab_work_orders permiten a admins activos (admin_users) SELECT, INSERT, UPDATE, DELETE. No hay filtro por organization_id en RLS; el filtrado se aplica en la capa API mediante addBranchFilter y validateBranchAccess.

**Recomendación**: Añadir políticas RLS que filtren por organization_id para defensa en profundidad.

---

## 8. Notificaciones

| Tipo                     | Cuándo             |
| ------------------------ | ------------------ |
| work_order_new           | Trabajo creado     |
| work_order_status_change | Cambio de estado   |
| work_order_completed     | Status = delivered |

---

## 9. Integración con Otros Módulos

| Módulo        | Relación                                                         |
| ------------- | ---------------------------------------------------------------- |
| POS           | process-sale crea work order; deliver valida saldo               |
| Quotes        | convert crea work order; load-to-pos puede llevar a process-sale |
| CRM           | customer_id obligatorio para work orders                         |
| Prescriptions | prescription_id, prescription_snapshot                           |
| Inventory     | frame_product_id; stock se reduce en POS                         |
| Billing       | pos_order_id vincula con orders para SII                         |

---

## 10. Mejoras Identificadas

1. **Quote convert**: Copiar presbyopia*solution, far/near_lens*_, contact*lens*_, organization_id.
2. **createWorkOrderSchema**: Alinear status enum con DB (incluir todos los estados).
3. **Transiciones de estado**: Implementar máquina de estados con transiciones válidas.
4. **RLS**: Añadir filtro organization_id en políticas.
5. **on_hold_payment → ordered**: Flujo automático cuando se cobra saldo (pending-balance/pay).
6. **Vista taller**: Endpoint o filtro para trabajos "en taller" (excluir quote, on_hold_payment, delivered, cancelled, returned).
7. **prescription_snapshot**: Asegurar que process-sale y convert siempre lo populen cuando hay prescription_id.

---

## Referencias

- Migración base: `supabase/migrations/20250125000000_create_lab_work_orders_system.sql`
- Skill: `.cursor/skills/work-orders-optical-supabase/SKILL.md`
- API: `src/app/api/admin/work-orders/`
- POS: `src/app/api/admin/pos/process-sale/`
- Quote convert: `src/app/api/admin/quotes/[id]/convert/`
