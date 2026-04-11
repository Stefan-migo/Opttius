---
name: appointments-optical-supabase
description: Expert guide for building and maintaining a high-quality appointment scheduling system for optical shops with Supabase. Use when working on appointments, citas, agendas, calendar, schedule settings, availability slots, guest customers, or optical clinic scheduling workflows. Covers multi-tenant architecture, RLS, branch-scoped availability, and optical-specific appointment types.
---

# Sistema de Citas y Agendas para Ópticas con Supabase

Guía para desarrollar y mantener un sistema de citas de alta gama para ópticas usando Supabase y Next.js.

## Cuándo Usar Este Skill

- Gestión de citas (appointments, citas, agendas)
- Calendario y disponibilidad de slots
- Configuración de horarios (schedule_settings)
- Clientes invitados (guest_customer) sin registro previo
- Integración citas ↔ clientes, prescripciones, órdenes
- Recordatorios y notificaciones de citas
- Reportes semanales y analíticas de agenda

## Arquitectura Core

### Modelo de Datos `appointments`

```
appointments:
  id, branch_id, organization_id (multi-tenant)
  customer_id (NULL para guest)
  guest_first_name, guest_last_name, guest_rut, guest_email, guest_phone
  appointment_date, appointment_time, duration_minutes
  appointment_type (eye_exam|consultation|fitting|delivery|repair|follow_up|emergency|other)
  status (scheduled|confirmed|completed|cancelled|no_show)
  assigned_to, created_by
  notes, reason, outcome
  follow_up_required, follow_up_date
  prescription_id, order_id
  reminder_sent, reminder_sent_at
  completed_at, cancelled_at, cancellation_reason
  created_at, updated_at
```

**Regla crítica**: `customer_id` O datos guest (first_name, last_name, rut) son obligatorios. Nunca ambos vacíos.

### Tipos de Cita Óptica-Específicos

| Tipo           | Uso                |
| -------------- | ------------------ |
| `eye_exam`     | Examen de la vista |
| `consultation` | Consulta general   |
| `fitting`      | Ajuste de lentes   |
| `delivery`     | Entrega de lentes  |
| `repair`       | Reparación         |
| `follow_up`    | Seguimiento        |
| `emergency`    | Emergencia         |
| `other`        | Otro               |

### Ciclo de Vida de Estados

```
scheduled → confirmed → completed
    ↓           ↓
cancelled   no_show
```

## Multi-Tenant y Branch

### Filtrado Obligatorio

1. **organization_id**: Siempre filtrar por organización.
2. **branch_id**: Citas son por sucursal. Disponibilidad y calendario son branch-scoped.
3. **Super admin**: Puede ver todas las sucursales; selector de branch en vista global.

### Headers de Branch

- `x-branch-id`: Sucursal seleccionada.
- `x-branch-id: global`: Vista global (super admin).

## Disponibilidad y Slots

### RPCs de Base de Datos

- **`get_available_time_slots(p_date, p_duration_minutes, p_staff_id, p_branch_id)`**: Genera slots considerando:
  - Horarios de trabajo por día (schedule_settings.working_hours)
  - Almuerzo (lunch_start, lunch_end)
  - Días bloqueados (blocked_dates)
  - Citas existentes (scheduled, confirmed)
  - min_advance_booking_hours, max_advance_booking_days
- **`check_appointment_availability(...)`**: Valida si un slot específico está libre (usado en POST/PUT).

### Fallback de schedule_settings

1. Branch-specific (branch_id = X)
2. Global (branch_id IS NULL)
3. Cualquier settings disponible

### Reglas de Negocio

- Slots durante almuerzo: no disponibles.
- Solapamiento: no permitir citas que se superpongan.
- Filtro por staff: si `assigned_to` está definido, verificar disponibilidad del profesional.
- Pasado: slots en el pasado no disponibles (según min_advance_booking_hours).

## Guest Customers (Clientes No Registrados)

### Flujo

1. Usuario selecciona "Cliente no registrado".
2. Formulario pide: first_name, last_name, rut (obligatorios); email, phone (opcionales).
3. Al crear cita: `customer_id = NULL`, datos en guest\_\*.
4. Al marcar como `completed`: auto-registro como customer si no existe (por RUT en org).

### Validación Zod

- `guestCustomerSchema`: first_name, last_name, rut obligatorios.
- `createAppointmentSchema.refine`: customer_id O guest_customer debe estar presente.

### Auto-Registro al Completar

En PUT appointments/[id]: si status=completed y hay guest*\*, buscar customer por RUT en org; si no existe, crear; actualizar appointment con customer_id y limpiar guest*\*.

## schedule_settings

### Estructura

```
schedule_settings:
  branch_id (NULL = global)
  slot_duration_minutes (15, 20, 30)
  default_appointment_duration
  buffer_time_minutes
  working_hours: { monday..sunday: { enabled, start_time, end_time, lunch_start, lunch_end } }
  blocked_dates: DATE[]
  min_advance_booking_hours
  max_advance_booking_days
```

### Duración de Slot vs Duración de Cita

- **slot_duration**: Intervalo de la rejilla (ej. 15 min).
- **default_appointment_duration**: Duración por defecto de nuevas citas (ej. 30 min).
- Mantener default_appointment_duration como múltiplo de slot_duration para estética.

## API y Validación

### Rutas

- `GET /api/admin/appointments` – Listar con filtros (start_date, end_date, status, customer_id, staff_id, branch_id).
- `POST /api/admin/appointments` – Crear (validar disponibilidad antes de insertar).
- `GET /api/admin/appointments/[id]` – Detalle con relaciones.
- `PUT /api/admin/appointments/[id]` – Actualizar (revalidar disponibilidad si cambia fecha/hora).
- `DELETE /api/admin/appointments/[id]` – Eliminar.
- `GET /api/admin/appointments/availability?date=&duration=&staff_id=` – Slots disponibles.
- `GET/PUT /api/admin/schedule-settings` – Configuración de horarios.

### Validación

- `createAppointmentSchema` en zod-schemas.
- `appointment_time`: formato HH:MM:SS.
- `appointment_date`: YYYY-MM-DD.

### Respuestas Estandarizadas

- `createApiSuccessResponse`, `createApiErrorResponse`.
- Incluir `requestId` en logs y respuestas de error.

## Integraciones

### Con CRM

- Citas vinculadas a `customers`.
- Búsqueda de clientes con debounce al crear cita.
- Ficha de cliente desde detalle de cita.

### Con Prescripciones y Órdenes

- `prescription_id`, `order_id` opcionales en appointment.
- Flujo: cita examen → prescripción → cotización → orden.

### Notificaciones

- `NotificationService.notifyNewAppointment()` al crear.
- `EmailNotificationService.sendAppointmentConfirmation()` si hay email (cliente o guest).

## Checklist de Calidad

- [ ] Filtro organization_id y branch_id en todas las queries.
- [ ] Validación Zod en POST/PUT.
- [ ] Verificación de disponibilidad antes de crear/actualizar (excepto force_create admin).
- [ ] Guest: customer*id NULL + guest*\* obligatorios.
- [ ] Auto-registro de guest al completar.
- [ ] schedule_settings con fallback branch → global.
- [ ] Formato TIME consistente (HH:MM:SS en API, HH:MM en UI).
- [ ] Debounce en búsqueda de clientes.
- [ ] RLS en appointments y schedule_settings.

## Referencias

- Documentación detallada: `docs/APPOINTMENTS_SYSTEM.md`
- API: `src/app/api/admin/appointments/`
- Servicio: `src/lib/api/services/appointmentService.ts`
- Componentes: `AppointmentCalendar`, `CreateAppointmentForm`, `ScheduleSettingsPage`
