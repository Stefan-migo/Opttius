# Checklist de Pruebas Manuales — Trabajos (Órdenes de trabajo)

**Fecha:** 2026-02-22  
**Módulo:** Lab Work Orders (Trabajos de laboratorio)

---

## 1. Listado

- [ ] **Página de trabajos**: `/admin/work-orders` carga correctamente.
- [ ] **Listado**: Tabla con work orders. Verificar columnas: número, cliente, marco, lentes, estado, fecha.
- [ ] **Filtros**: Filtrar por estado (ordered, sent_to_lab, in_progress_lab, ready_at_lab, received_from_lab, mounted, quality_check, ready_for_pickup, delivered, cancelled, returned).
- [ ] **Filtro por cliente**: Buscar por customer_id o nombre. Verificar resultados.
- [ ] **Paginación**: Si hay muchos trabajos, verificar paginación.
- [ ] **Selector de sucursal**: Cambiar sucursal. Verificar que los trabajos se filtran por branch.
- [ ] **Excluir on_hold_payment**: Trabajos con pago insuficiente (on_hold_payment) no deben aparecer en vista "taller" o lista principal (según diseño).

---

## 2. Creación desde presupuesto

- [ ] **Convertir presupuesto**: Desde presupuesto en draft/sent, "Convertir a orden de trabajo". Verificar que se crea lab_work_order.
- [ ] **Número de trabajo**: Formato TRB-YYYY-NNNN, único.
- [ ] **Datos copiados**: frame_name, lens_type, prescription_snapshot, costs. Verificar que coinciden con el presupuesto.
- [ ] **Prescripción**: prescription_id y prescription_snapshot. Verificar que el trabajo tiene la receta.
- [ ] **Quote actualizado**: quote.converted_to_work_order_id, quote.status. Verificar vínculo bidireccional.

---

## 3. Creación desde POS

- [ ] **Venta marco + lentes**: En POS, agregar marco y lente, procesar venta. Verificar que se crea lab_work_order.
- [ ] **order_id vinculado**: lab_work_order.pos_order_id apunta a la orden. Verificar relación.
- [ ] **Cash-First (pago completo)**: Venta pagada al 100%. Work order en status=ordered, payment=paid. Visible en taller.
- [ ] **Cash-First (depósito insuficiente)**: Pago < minDeposit. Work order en on_hold_payment. No visible en taller (o en sección "pendientes de pago").
- [ ] **Cash-First (depósito suficiente)**: Pago parcial >= minDeposit. Work order en ordered, payment=partial. Visible en taller.
- [ ] **Marco del cliente**: customer_own_frame=true. frame_cost=0. Verificar en work order.

---

## 4. Ciclo de vida (transiciones de estado)

- [ ] **ordered → sent_to_lab**: Marcar como "Enviado al laboratorio". Verificar cambio y lab_info si aplica.
- [ ] **sent_to_lab → received_from_lab**: Marcar como "Recibido del laboratorio". Verificar cambio.
- [ ] **received_from_lab → mounted**: Marcar como "Montado". Verificar cambio.
- [ ] **mounted → quality_check**: Marcar como "En control de calidad". Verificar cambio.
- [ ] **quality_check → ready_for_pickup**: Marcar como "Listo para retiro". Verificar cambio.
- [ ] **ready_for_pickup → delivered**: Entregar al cliente. Verificar cambio y que se ejecuta deliver.
- [ ] **Historial**: Verificar que lab_work_order_status_history registra cada cambio con timestamp y usuario.

---

## 5. Entrega (Deliver)

- [ ] **Entregar trabajo**: Acción "Entregar" en trabajo en ready_for_pickup.
- [ ] **Validación saldo**: Si tiene pos_order_id, verificar que la orden tiene saldo = 0. Si hay saldo pendiente, debe rechazar o redirigir a cobrar.
- [ ] **Entregar con saldo pendiente**: Intentar entregar cuando order tiene balance > 0. Verificar que rechaza y muestra mensaje/link a POS para cobrar.
- [ ] **Entregar sin orden POS**: Trabajo creado desde presupuesto (sin pos_order_id). Verificar que permite entregar sin validación de saldo.
- [ ] **Notificación**: (Si configurado) Verificar que se envía notificación de "trabajo listo" o "entregado".

---

## 6. Detalle de trabajo

- [ ] **Página detalle**: `/admin/work-orders/[id]` muestra datos completos.
- [ ] **Datos del trabajo**: Marco, lentes, prescripción, costos, cliente.
- [ ] **Prescripción snapshot**: Ver datos de la receta al momento de crear (OD/OS, esfera, cilindro, etc.).
- [ ] **Enlaces**: A cliente, presupuesto, orden (si aplica). Verificar navegación.
- [ ] **Cambiar estado**: Botones o acciones para transiciones. Verificar que solo permite transiciones válidas.
- [ ] **Información de laboratorio**: Si se envía a lab externo, campos lab_name, lab_reference, etc. Verificar que se pueden editar.

---

## 7. Cancelar y devolver

- [ ] **Cancelar**: Cambiar status a cancelled. Verificar que el trabajo ya no aparece en lista activa.
- [ ] **Devolver**: Status returned. Verificar que se registra y no permite reentregar sin flujo específico.

---

## 8. Multi-sucursal

- [ ] **Trabajos por branch**: Trabajo creado en sucursal A. Verificar que no aparece en listado de sucursal B.
- [ ] **Creación en branch correcto**: Al crear desde POS o presupuesto, branch_id debe ser el de la sucursal actual.
- [ ] **organization_id**: Todos los trabajos pertenecen a la organización. Verificar aislamiento.

---

## Resumen rápido

| Área           | Casos críticos                                         |
| -------------- | ------------------------------------------------------ |
| Creación       | Desde presupuesto, desde POS; datos copiados           |
| Cash-First     | on_hold_payment, ordered con paid/partial              |
| Ciclo de vida  | Transiciones ordered → ... → delivered                 |
| Entrega        | Validar saldo si pos_order_id; rechazar si balance > 0 |
| Detalle        | Datos completos, prescripción, enlaces                 |
| Multi-sucursal | Filtro por branch                                      |
