---
name: work-orders-optical-supabase
description: Expert guide for building and maintaining a high-quality work orders (órdenes de trabajo, trabajos de laboratorio) system for optical shops with Supabase. Use when working on lab work orders, lab_work_orders, work order lifecycle, quote-to-work-order, POS-to-work-order, status transitions, delivery, optical lab workflows, or optical work order management. Covers multi-tenant architecture, RLS, prescription integration, Cash-First logic, and optical-specific data models.
---

# Sistema de Órdenes de Trabajo para Ópticas con Supabase

Guía para desarrollar y mantener un sistema de trabajos de laboratorio (work orders) de alta gama para ópticas usando Supabase y Next.js.

## Cuándo Usar Este Skill

- Gestión de órdenes de trabajo (lab_work_orders)
- Ciclo de vida y transiciones de estado
- Creación desde POS (process-sale)
- Conversión presupuesto → orden de trabajo
- Entrega de trabajos y validación de saldo
- Información de laboratorio externo
- Historial de estados (audit trail)
- Notificaciones de trabajo
- Vista taller / lista de trabajos pendientes

## Arquitectura Core

### Ciclo de Vida del Trabajo

```
quote ──► ordered ──► sent_to_lab ──► in_progress_lab ──► ready_at_lab
  │          │              │
  │          │              └──► received_from_lab ──► mounted ──► quality_check
  │          │                                                          │
  │          │                                                          └──► ready_for_pickup ──► delivered
  │          │
  │          └──► on_hold_payment (pago insuficiente, no visible en taller)
  │
  └──► cancelled | returned
```

| Estado            | Descripción                      | Visible en Taller | Acciones                     |
| ----------------- | -------------------------------- | ----------------- | ---------------------------- |
| quote             | Presupuesto, no confirmado       | No                | Editar, convertir            |
| on_hold_payment   | Pago insuficiente (Cash-First)   | No                | Cobrar saldo → ordered       |
| ordered           | Orden confirmada, lista para lab | Sí                | Enviar al lab                |
| sent_to_lab       | Enviado a laboratorio externo    | Sí                | Recibir, actualizar lab info |
| in_progress_lab   | En proceso en laboratorio        | Sí                | Marcar listo                 |
| ready_at_lab      | Listo en lab, pendiente retiro   | Sí                | Recibir del lab              |
| received_from_lab | Recibido, pendiente montaje      | Sí                | Montar                       |
| mounted           | Lentes montados                  | Sí                | Control calidad              |
| quality_check     | En control de calidad            | Sí                | Aprobar                      |
| ready_for_pickup  | Listo para retiro del cliente    | Sí                | Entregar                     |
| delivered         | Entregado al cliente             | -                 | Solo lectura                 |
| cancelled         | Cancelado                        | -                 | Solo lectura                 |
| returned          | Devuelto por cliente             | -                 | Solo lectura                 |

### Tablas Principales

| Tabla                           | Propósito                              |
| ------------------------------- | -------------------------------------- |
| `lab_work_orders`               | Órdenes de trabajo (marco + lentes)    |
| `lab_work_order_status_history` | Historial de cambios de estado (audit) |

### Relaciones Críticas

```
customers 1──* lab_work_orders (customer_id)
prescriptions 1──* lab_work_orders (prescription_id)
quotes 1──1 lab_work_orders (quote_id, converted_to_work_order_id en quotes)
orders 1──1 lab_work_orders (pos_order_id)
products ──* lab_work_orders (frame_product_id)
lens_families ──* lab_work_orders (lens_family_id, far_lens_family_id, near_lens_family_id)
branches 1──* lab_work_orders (branch_id)
organizations 1──* lab_work_orders (organization_id)
```

## Multi-Tenant y RLS

### Filtrado Obligatorio

1. **organization_id**: Siempre filtrar por organización del admin para aislamiento multi-tenant.
2. **branch_id**: Si el usuario tiene sucursal seleccionada (x-branch-id), filtrar por branch_id.
3. **Super admin**: Puede ver todos los trabajos de la organización (sin filtro branch).

### Creación de Trabajo

- **branch_id**: Obligatorio. Desde branchContext.branchId (header x-branch-id).
- **organization_id**: Poblado desde branch.organization_id o admin_users.organization_id.
- **Validar acceso**: Admin debe tener acceso a la sucursal (validateBranchAccess).

## Reglas Óptica-Específicas

### 1. Orígenes de Creación

| Origen      | Endpoint                            | Cuándo                                       |
| ----------- | ----------------------------------- | -------------------------------------------- |
| POS (venta) | POST /api/admin/pos/process-sale    | Venta con marco + lentes                     |
| Presupuesto | POST /api/admin/quotes/[id]/convert | Conversión directa                           |
| API directa | POST /api/admin/work-orders         | Creación manual (formulario removido del UI) |

**Nota**: El formulario CreateWorkOrderForm fue removido. Los trabajos se crean principalmente desde POS para evitar trabajos "fantasma" sin vínculo financiero.

### 2. Lógica Cash-First (POS)

- Si `paymentAmount < minDeposit`: status = `on_hold_payment`, no visible en taller.
- Si `balance === 0`: status = `ordered`, payment_status = `paid`.
- Si pago parcial suficiente: status = `ordered`, payment_status = `partial`.
- RPC `get_min_deposit(p_order_total, p_branch_id)` para obtener depósito mínimo.

### 3. Entrega (Deliver)

- Endpoint: POST /api/admin/work-orders/[id]/deliver
- **Validación**: Si pos_order_id existe, verificar saldo con `calculate_order_balance`. No permitir entrega con saldo > 0.
- Actualizar status a `delivered` vía RPC `update_work_order_status`.
- Notificar: notifyWorkOrderCompleted.

### 4. Prescripción

- **prescription_snapshot**: JSONB con receta al momento de crear. Inmutable.
- **prescription_id**: FK a prescriptions (puede cambiar si se actualiza receta).
- Para laboratorio: usar prescription_snapshot o prescription actual para datos de montaje.

### 5. Soluciones de Presbicia

| Solución     | Campos usados                                                          |
| ------------ | ---------------------------------------------------------------------- |
| none         | lens_family_id, lens_type, lens_cost                                   |
| two_separate | far_lens_family_id, near_lens_family_id, far_lens_cost, near_lens_cost |
| bifocal      | lens_family_id, lens_type: bifocal                                     |
| trifocal     | lens_family_id, lens_type: trifocal                                    |
| progressive  | lens_family_id, lens_type: progressive                                 |

### 6. Marco del Cliente

- **customer_own_frame**: true → frame_cost = 0, no reducir stock de inventario.
- Incluir frame_name, frame_brand, frame_model para trazabilidad.

### 7. Número de Trabajo

- Formato: `TRB-YYYY-NNNN` (ej: TRB-2025-0001).
- Generado por RPC `generate_work_order_number()`.
- Único por año.

## API Endpoints

| Método | Ruta                                | Descripción                                              |
| ------ | ----------------------------------- | -------------------------------------------------------- |
| GET    | /api/admin/work-orders              | Lista con filtros (status, customer_id), paginación      |
| POST   | /api/admin/work-orders              | Crear (createWorkOrderSchema)                            |
| GET    | /api/admin/work-orders/[id]         | Detalle con customer, prescription, quote, frame_product |
| PUT    | /api/admin/work-orders/[id]         | Actualizar campos editables                              |
| DELETE | /api/admin/work-orders/[id]         | Eliminar (con restricciones)                             |
| PUT    | /api/admin/work-orders/[id]/status  | Cambiar estado + lab info                                |
| POST   | /api/admin/work-orders/[id]/deliver | Entregar (valida saldo)                                  |

## Validación Zod (createWorkOrderSchema)

- **customer_id**: UUID obligatorio.
- **prescription_id**: Opcional (recomendado para lentes graduados).
- **frame_name**, **lens_type**, **lens_material**: Obligatorios.
- **presbyopia_solution**: none | two_separate | bifocal | trifocal | progressive.
- **status**: quote | ordered (y otros en DB, schema puede estar desactualizado).
- **total_amount**: Obligatorio, número positivo.

## RPC y Funciones

| Función                                                                        | Propósito                                 |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| generate_work_order_number()                                                   | Genera TRB-YYYY-NNNN                      |
| update_work_order_status(p_work_order_id, p_new_status, p_changed_by, p_notes) | Actualiza status + timestamps + historial |
| get_min_deposit(p_order_total, p_branch_id)                                    | Depósito mínimo para Cash-First           |
| calculate_order_balance(p_order_id)                                            | Saldo pendiente de orden                  |

## Conversión desde Presupuesto

1. Validar: quote no convertido.
2. Generar work_order_number.
3. Crear lab_work_order con datos del quote (frame, lens, prescription_snapshot, costs).
4. Actualizar quote: status = accepted, converted_to_work_order_id.
5. Notificar: notifyQuoteConverted, notifyNewWorkOrder.

**Importante**: El convert actual no copia todos los campos (presbyopia, near frame, contact lens). Ver docs/WORK_ORDERS_SYSTEM.md para mejoras.

## Checklist de Calidad

- [ ] branch_id y organization_id poblados al crear
- [ ] Filtro addBranchFilter en GET list
- [ ] validateBranchAccess en GET/PUT/DELETE por id
- [ ] Validación Zod en POST/PUT
- [ ] RPC update_work_order_status para cambios de estado (no UPDATE directo)
- [ ] prescription_snapshot al crear si prescription_id existe
- [ ] Cash-First: on_hold_payment cuando pago < minDeposit
- [ ] Deliver: validar saldo antes de permitir entrega
- [ ] Notificaciones: notifyNewWorkOrder, notifyWorkOrderStatusChange, notifyWorkOrderCompleted
- [ ] Respuestas API estandarizadas (createPaginatedResponse, createApiErrorResponse)

## Referencias

- Documentación detallada: `docs/WORK_ORDERS_SYSTEM.md`
- API work-orders: `src/app/api/admin/work-orders/`
- POS process-sale: `src/app/api/admin/pos/process-sale/`
- Quote convert: `src/app/api/admin/quotes/[id]/convert/`
- Presupuestos: `.cursor/skills/quotes-optical-supabase/SKILL.md`
- POS: `.cursor/skills/pos-optical-supabase/SKILL.md`
- Inventario: `.cursor/skills/inventory-optical-supabase/SKILL.md`
