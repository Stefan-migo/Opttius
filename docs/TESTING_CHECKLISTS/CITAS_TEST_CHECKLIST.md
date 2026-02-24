# Checklist de Pruebas Manuales — Citas

**Fecha:** 2026-02-22  
**Módulo:** Appointments (Agenda de citas)

---

## 1. Navegación y listado

- [ ] **Página de citas**: `/admin/appointments` carga correctamente.
- [ ] **Vista calendario**: Cambiar entre vista día/semana/mes (si aplica). Verificar que las citas se muestran.
- [ ] **Filtros**: Filtrar por estado (scheduled, confirmed, completed, cancelled, no_show).
- [ ] **Filtros por fecha**: Rango start_date, end_date. Verificar que solo muestra citas en el rango.
- [ ] **Filtro por profesional**: Si hay `assigned_to`, filtrar por staff. Verificar resultados.
- [ ] **Selector de sucursal**: Cambiar sucursal. Verificar que las citas se filtran por branch.

---

## 2. Crear cita con cliente existente

- [ ] **Formulario crear**: Abrir formulario de nueva cita.
- [ ] **Buscar cliente**: Escribir nombre, RUT o email. Verificar que aparecen sugerencias (debounce).
- [ ] **Seleccionar cliente**: Elegir cliente de la lista. Verificar que se asocia `customer_id`.
- [ ] **Seleccionar tipo**: eye_exam, consultation, fitting, delivery, repair, follow_up, emergency, other.
- [ ] **Seleccionar fecha y hora**: Usar selector de slots. Verificar que solo muestra slots disponibles.
- [ ] **Slots durante almuerzo**: Verificar que no se ofrecen slots en horario de almuerzo (schedule_settings).
- [ ] **Guardar**: Crear cita. Verificar que aparece en calendario y en lista.
- [ ] **Validación solapamiento**: Intentar crear cita en slot ya ocupado → debe rechazar.

---

## 3. Crear cita guest (sin cliente)

- [ ] **Opción "Cliente no registrado"**: Seleccionar crear cita sin cliente.
- [ ] **Campos guest obligatorios**: first_name, last_name, rut. Verificar validación.
- [ ] **Campos opcionales**: email, phone.
- [ ] **Guardar cita guest**: Crear con guest_first_name, guest_last_name, guest_rut. Verificar `customer_id = NULL`.
- [ ] **Auto-registro al completar**: Marcar cita guest como `completed`. Verificar que se crea `customer` por RUT si no existe y se actualiza la cita.

---

## 4. Editar y cancelar

- [ ] **Editar cita**: Cambiar fecha, hora, tipo, notas. Guardar. Verificar persistencia.
- [ ] **Revalidar disponibilidad al cambiar**: Si se cambia fecha/hora, verificar que el nuevo slot está libre.
- [ ] **Cancelar cita**: Cambiar estado a cancelled. Verificar `cancelled_at`, `cancellation_reason` si aplica.
- [ ] **No-show**: Marcar como no_show. Verificar estado.

---

## 5. Ciclo de vida

- [ ] **scheduled → confirmed**: Confirmar cita. Verificar cambio de estado.
- [ ] **confirmed → completed**: Marcar como completada. Verificar `completed_at`.
- [ ] **Notificaciones**: (Si configurado) Verificar que se envía confirmación al crear y recordatorio antes de la cita.

---

## 6. Configuración (schedule_settings)

- [ ] **Página de configuración**: `/admin/appointments/settings` carga.
- [ ] **Horarios por día**: Configurar working_hours (start_time, end_time) por día de la semana.
- [ ] **Almuerzo**: Configurar lunch_start, lunch_end. Verificar que los slots durante almuerzo no se ofrecen.
- [ ] **Duración de slot**: slot_duration_minutes (15, 20, 30). Verificar que la rejilla de slots se ajusta.
- [ ] **Días bloqueados**: Agregar fechas en blocked_dates. Verificar que no hay slots ese día.
- [ ] **Fallback branch → global**: Si no hay settings por branch, usar settings globales.

---

## 7. Multi-sucursal

- [ ] **Citas por branch**: Crear cita en sucursal A. Cambiar a sucursal B. Verificar que la cita de A no aparece en B.
- [ ] **Disponibilidad por branch**: Slots disponibles son por sucursal (citas de otras sucursales no bloquean).

---

## Resumen rápido

| Área           | Casos críticos                                                      |
| -------------- | ------------------------------------------------------------------- |
| Crear          | Cliente existente, guest, slots disponibles                         |
| Guest          | first_name, last_name, rut obligatorios; auto-registro al completar |
| Editar         | Revalidar disponibilidad al cambiar fecha/hora                      |
| Config         | Horarios, almuerzo, slot_duration, blocked_dates                    |
| Multi-sucursal | Citas y disponibilidad por branch                                   |
