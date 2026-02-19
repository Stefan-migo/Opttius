# Sistema de Citas y Agendas - Opttius

Documentación completa del sistema de citas y agendas para ópticas de Opttius.

## Índice

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Modelo de Datos](#modelo-de-datos)
4. [Flujos de Negocio](#flujos-de-negocio)
5. [Disponibilidad y Slots](#disponibilidad-y-slots)
6. [Clientes Invitados (Guest)](#clientes-invitados-guest)
7. [Configuración de Horarios](#configuración-de-horarios)
8. [API Reference](#api-reference)
9. [Integraciones](#integraciones)
10. [Mejores Prácticas](#mejores-prácticas)

---

## Visión General

El sistema de citas de Opttius permite a las ópticas gestionar consultas, exámenes de vista, ajustes, entregas y reparaciones. Está diseñado para:

- **Multi-tenant**: Cada organización y sucursal tiene su propia agenda.
- **Clientes registrados y no registrados**: Soporta citas para clientes en base de datos y guest (walk-in).
- **Conversión de leads**: Los guest pueden auto-registrarse al completar la cita.
- **Integración clínica**: Vinculación con prescripciones, órdenes y CRM.

### Características Principales

| Característica                | Descripción                                        |
| ----------------------------- | -------------------------------------------------- |
| Calendario                    | Vista semanal y mensual con slots interactivos     |
| Configuración flexible        | Horarios por día, almuerzos, fechas bloqueadas     |
| Disponibilidad en tiempo real | RPCs que validan contra citas existentes           |
| Guest flow                    | Agendar sin cliente previo; registrar al completar |
| Notificaciones                | Email de confirmación, notificaciones internas     |
| Reportes                      | Reporte semanal imprimible                         |

---

## Arquitectura

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  AppointmentsPage  │  CreateAppointmentForm  │  AppointmentCalendar │
│  ScheduleSettings  │  BranchSelector         │  Weekly Report       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                        API ROUTES                                │
├─────────────────────────────────────────────────────────────────┤
│  /api/admin/appointments          GET, POST                      │
│  /api/admin/appointments/[id]     GET, PUT, DELETE                │
│  /api/admin/appointments/availability  GET                       │
│  /api/admin/schedule-settings     GET, PUT                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                     SUPABASE (PostgreSQL)                         │
├─────────────────────────────────────────────────────────────────┤
│  appointments  │  schedule_settings  │  customers  │  profiles   │
│  RPC: get_available_time_slots  │  check_appointment_availability │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

- **Frontend**: Next.js 14+, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Base de datos**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth + RLS

---

## Modelo de Datos

### Tabla `appointments`

| Columna               | Tipo        | Nullable | Descripción                                         |
| --------------------- | ----------- | -------- | --------------------------------------------------- |
| id                    | UUID        | NO       | PK                                                  |
| `customer_id`         | UUID        | YES      | Cliente registrado; NULL si guest                   |
| `guest_first_name`    | TEXT        | YES      | Nombre guest                                        |
| `guest_last_name`     | TEXT        | YES      | Apellido guest                                      |
| `guest_rut`           | TEXT        | YES      | RUT guest                                           |
| `guest_email`         | TEXT        | YES      | Email guest                                         |
| `guest_phone`         | TEXT        | YES      | Teléfono guest                                      |
| `appointment_date`    | DATE        | NO       | Fecha                                               |
| `appointment_time`    | TIME        | NO       | Hora                                                |
| `duration_minutes`    | INTEGER     | YES      | Duración (default 30)                               |
| `appointment_type`    | TEXT        | YES      | eye_exam, consultation, etc.                        |
| `status`              | TEXT        | YES      | scheduled, confirmed, completed, cancelled, no_show |
| `assigned_to`         | UUID        | YES      | Staff asignado                                      |
| `created_by`          | UUID        | YES      | Usuario que creó                                    |
| `notes`               | TEXT        | YES      | Notas                                               |
| `reason`              | TEXT        | YES      | Motivo                                              |
| `outcome`             | TEXT        | YES      | Resultado                                           |
| `follow_up_required`  | BOOLEAN     | YES      | Requiere seguimiento                                |
| `follow_up_date`      | DATE        | YES      | Fecha sugerida seguimiento                          |
| `prescription_id`     | UUID        | YES      | Prescripción vinculada                              |
| `order_id`            | UUID        | YES      | Orden vinculada                                     |
| `reminder_sent`       | BOOLEAN     | YES      | Recordatorio enviado                                |
| `reminder_sent_at`    | TIMESTAMPTZ | YES      | Cuándo                                              |
| `completed_at`        | TIMESTAMPTZ | YES      | Cuándo se completó                                  |
| `cancelled_at`        | TIMESTAMPTZ | YES      | Cuándo se canceló                                   |
| `cancellation_reason` | TEXT        | YES      | Motivo cancelación                                  |
| `branch_id`           | UUID        | YES      | Sucursal                                            |
| `organization_id`     | UUID        | YES      | Organización                                        |
| `created_at`          | TIMESTAMPTZ | YES      |                                                     |
| `updated_at`          | TIMESTAMPTZ | YES      |                                                     |

### Constraint

```sql
CHECK (
  (customer_id IS NOT NULL) OR
  (guest_first_name IS NOT NULL AND guest_last_name IS NOT NULL AND guest_rut IS NOT NULL)
)
```

### Tipos de Cita

| Valor        | Etiqueta           |
| ------------ | ------------------ |
| eye_exam     | Examen de la Vista |
| consultation | Consulta           |
| fitting      | Ajuste de Lentes   |
| delivery     | Entrega de Lentes  |
| repair       | Reparación         |
| follow_up    | Seguimiento        |
| emergency    | Emergencia         |
| other        | Otro               |

### Estados

| Estado    | Descripción |
| --------- | ----------- |
| scheduled | Programada  |
| confirmed | Confirmada  |
| completed | Completada  |
| cancelled | Cancelada   |
| no_show   | No asistió  |

---

## Flujos de Negocio

### Crear Cita

1. Usuario abre formulario (desde calendario o botón Nueva Cita).
2. Selecciona cliente (búsqueda con debounce) o modo guest.
3. Si guest: completa nombre, apellido, RUT.
4. Selecciona tipo, fecha, hora, duración.
5. Opcional: staff, notas, motivo, follow-up.
6. Sistema valida disponibilidad vía `get_available_time_slots`.
7. POST a API con validación Zod.
8. API valida slot nuevamente.
9. Inserta en DB.
10. Notifica y envía email si hay email.

### Editar Cita

1. Usuario abre detalle de cita.
2. Si cambia fecha/hora/duración: API valida disponibilidad con `check_appointment_availability` (excluyendo el appointment actual).
3. PUT actualiza.
4. Si status → completed y es guest: auto-registro.

### Completar Cita con Guest

1. Usuario selecciona status "Completada".
2. API PUT: status=completed.
3. Lógica: guest_first_name presente y customer_id NULL.
4. Buscar customer por RUT en organization.
5. Si no existe: crear customer.
6. Actualizar appointment: customer*id = nuevo customer, limpiar guest*\*.

### Cancelar

- PUT con status=cancelled.
- Se limpian guest\_\* al cancelar.
- Se registra cancelled_at y cancellation_reason.

---

## Disponibilidad y Slots

### Función `get_available_time_slots`

**Parámetros:**

- `p_date`: DATE
- `p_duration_minutes`: INTEGER (default 30)
- `p_staff_id`: UUID (opcional)
- `p_branch_id`: UUID (opcional)

**Retorna:** TABLE(time_slot TIME, available BOOLEAN)

**Lógica:**

1. Obtener schedule_settings (branch → global → cualquiera).
2. Verificar día habilitado en working_hours.
3. Verificar bloqueado en blocked_dates.
4. Generar slots por slot_duration_minutes.
5. Para cada slot:
   - Excluir si está en almuerzo.
   - Excluir si hay conflicto con cita existente (scheduled/confirmed).
   - Excluir si está en el pasado (min_advance_booking_hours).
   - Excluir si está en el futuro lejano (max_advance_booking_days).
6. Si p_staff_id: filtrar por assigned_to.
7. Si p_branch_id: filtrar por branch_id.

### Función `check_appointment_availability`

**Parámetros:**

- `p_date`, `p_time`, `p_duration_minutes`
- `p_appointment_id`: UUID (para excluir en edición)
- `p_staff_id`, `p_branch_id`

**Retorna:** BOOLEAN

### Inconsistencia POST vs Availability

**Nota:** En POST de appointments, la API usa `get_available_time_slots` y busca el slot en la lista para validar en lugar de `check_appointment_availability`. Esto es intencional para consistencia con el frontend.

---

## Clientes Invitados (Guest)

### Requisitos

- `guest_first_name`, `guest_last_name`, `guest_rut` obligatorios.
- `guest_email`, `guest_phone` opcionales.
- RUT formatizado con `formatRUT()`.

### Validación Zod

```typescript
guestCustomerSchema: {
  first_name: string min 1,
  last_name: string min 1,
  rut: rutSchema,
  email: optional,
  phone: optional
}
```

### Auto-Registro

- Solo en PUT cuando status → completed.
- Buscar por RUT en organization.
- Crear customer si no existe (branch_id, organization_id).
- Actualizar appointment.

---

## Configuración de Horarios

### Tabla `schedule_settings`

| Campo                        | Tipo    | Descripción                                                    |
| ---------------------------- | ------- | -------------------------------------------------------------- |
| branch_id                    | UUID    | NULL = global                                                  |
| slot_duration_minutes        | INTEGER | Intervalo de slots (15, 20, 30)                                |
| default_appointment_duration | INTEGER | Duración por defecto                                           |
| buffer_time_minutes          | INTEGER | Buffer entre citas                                             |
| working_hours                | JSONB   | Por día: enabled, start_time, end_time, lunch_start, lunch_end |
| blocked_dates                | DATE[]  | Fechas no laborales                                            |
| min_advance_booking_hours    | INTEGER | Anticipación mínima                                            |
| max_advance_booking_days     | INTEGER | Anticipación máxima                                            |

### Estructura working_hours

```json
{
  "monday": {
    "enabled": true,
    "start_time": "09:00",
    "end_time": "18:00",
    "lunch_start": "13:00",
    "lunch_end": "14:00"
  },
  ...
}
```

---

## API Reference

### GET /api/admin/appointments

**Query params:**

- start_date, end_date (o date_from, date_to)
- status
- customer_id
- staff_id
- branch_id

**Response:** Array de appointments con customer, assigned_staff, prescription, order.

### POST /api/admin/appointments

**Body:** createAppointmentSchema (customer_id o guest_customer, appointment_type, appointment_date, appointment_time, duration_minutes, etc.)

**Validación:** Disponibilidad antes de insertar. `force_create: true` omite validación (admin).

### GET /api/admin/appointments/[id]

**Response:** Appointment con relaciones.

### PUT /api/admin/appointments/[id]

**Body:** Campos a actualizar. Si cambia fecha/hora/duración, valida disponibilidad.

### DELETE /api/admin/appointments/[id]

Elimina la cita.

### GET /api/admin/appointments/availability

**Query params:**

- date (required)
- duration (default 30)
- staff_id (optional)

**Headers:** x-branch-id para branch context.

**Response:** `{ date, duration, slots: [{ time_slot, available }] }`

---

## Integraciones

### CRM/Clientes

- Búsqueda de clientes al crear cita.
- Link a ficha de cliente desde detalle de cita.

### Prescripciones

- appointment.prescription_id vincula a prescriptions.
- Flujo: examen → prescripción.

### Órdenes

- appointment.order_id vincula a orders.
- Flujo: entrega de lentes.

### Notificaciones

- `NotificationService.notifyNewAppointment()`
- `EmailNotificationService.sendAppointmentConfirmation()` si hay email.

---

## Mejores Prácticas

### Seguridad

- Siempre filtrar por organization_id y branch_id.
- RLS en appointments y schedule_settings.
- Validar is_admin antes de operaciones.

### Performance

- Debounce en búsqueda de clientes (300ms).
- Batch queries para relaciones (evitar N+1).
- Lazy load de AppointmentCalendar y CreateAppointmentForm.

### UX

- Slots bloqueados visualmente distintos.
- Confirmación antes de eliminar.
- Toast informativos en éxito/error.

### Código

- Usar createApiSuccessResponse/createApiErrorResponse.
- Logging con requestId.
- Validación Zod en todas las rutas.

---

## Referencias de Archivos

| Componente            | Ruta                                                            |
| --------------------- | --------------------------------------------------------------- |
| Página principal      | src/app/admin/appointments/page.tsx                             |
| Configuración         | src/app/admin/appointments/settings/page.tsx                    |
| Calendario            | src/components/admin/AppointmentCalendar.tsx                    |
| Formulario            | src/components/admin/CreateAppointmentForm.tsx                  |
| API appointments      | src/app/api/admin/appointments/route.ts                         |
| API [id]              | src/app/api/admin/appointments/[id]/route.ts                    |
| API availability      | src/app/api/admin/appointments/availability/route.ts            |
| API schedule-settings | src/app/api/admin/schedule-settings/route.ts                    |
| Servicio              | src/lib/api/services/appointmentService.ts                      |
| Validación            | src/lib/api/validation/zod-schemas.ts (createAppointmentSchema) |
