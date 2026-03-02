# Flujo de Citas y Agenda – Vista del Usuario

## 1. Contexto en la vida real (Chile)

Una óptica necesita **organizar la agenda** de consultas, exámenes de vista, ajustes, entregas y reparaciones. El flujo típico es:

- Un paciente llama o llega a la sucursal y pide hora para un examen de la vista.
- La recepcionista o vendedor busca un slot disponible en el calendario y agenda la cita.
- Si el paciente no está registrado (walk-in), se puede agendar igual con nombre, apellido y RUT.
- El día de la cita, el profesional confirma la asistencia, realiza el servicio y marca la cita como completada.
- Si era un cliente invitado (guest), al completar la cita el sistema lo registra automáticamente en el CRM.

**Problemas que resuelve el módulo:**

- Evitar solapamientos y doble reserva de horarios.
- Gestionar disponibilidad por sucursal (horarios de apertura, almuerzo, fechas bloqueadas).
- Agendar clientes no registrados sin perder la trazabilidad.
- Convertir visitantes en clientes del CRM al completar la cita.
- Vincular citas con prescripciones y órdenes (examen → receta → cotización → entrega).
- Generar reportes semanales imprimibles para la operación.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Configurar horarios (admin)

1. Ir a **Citas y Agenda** → **Configuración** (icono engranaje).
2. Completar:
   - **Duración de slot** (ej. 15 min): intervalo de la rejilla del calendario.
   - **Duración por defecto** (ej. 30 min): duración de nuevas citas.
   - **Reserva mínima** (horas): anticipación requerida para agendar.
   - **Reserva máxima** (días): hasta cuándo se puede agendar.
3. Configurar **Horarios de operación** por día: Lunes a Domingo.
   - Activar/desactivar cada día.
   - Definir apertura, cierre, inicio y fin de almuerzo.
4. Agregar **Fechas no laborales** (feriados, cierres).
5. Guardar: la configuración se aplica a la sucursal (o global si es super admin).

### Paso 2: Crear una cita (admin/vendedor)

1. Ir a **Citas y Agenda**.
2. Clic en **Nueva Cita** o hacer clic en un slot vacío del calendario.
3. **Seleccionar cliente**:
   - **Cliente registrado**: buscar por nombre, apellido o RUT (búsqueda con debounce).
   - **Cliente no registrado**: marcar "Cliente invitado" y completar nombre, apellido y RUT (obligatorios); email y teléfono opcionales.
4. Elegir **tipo de cita**: Examen de la Vista, Consulta, Ajuste, Entrega, Reparación, Seguimiento, Emergencia u Otro.
5. Seleccionar **fecha** y **hora** (solo se muestran slots disponibles según configuración).
6. Opcional: staff asignado, motivo, notas, seguimiento requerido.
7. Guardar: la cita se crea con estado **Programada**. Si hay email, se envía confirmación.

### Paso 3: Ver y gestionar citas en el calendario

1. En la vista principal se muestra el calendario (Día, Semana o Mes).
2. **Filtros**: estado (Programadas, Confirmadas, Completadas, Canceladas), sucursal (si super admin).
3. **Navegación**: flechas anterior/siguiente, botón "Hoy".
4. Clic en una cita: se abre el detalle con información del cliente, fecha/hora, tipo, duración, estado.
5. **Acciones en detalle**:
   - Cambiar estado (Programada → Confirmada → Completada, o Cancelada / No asistió).
   - Editar datos (abre el formulario).
   - Ir a Ficha Cliente (si está registrado).
   - Eliminar cita (con confirmación).

### Paso 4: Completar cita con cliente invitado

1. En el detalle de la cita, cambiar estado a **Completada**.
2. Si era cliente invitado (guest): el sistema busca por RUT en la organización.
3. Si no existe: crea el cliente automáticamente y vincula la cita.
4. El cliente queda registrado en el CRM de la sucursal.

### Paso 5: Reporte semanal (admin)

1. En **Citas y Agenda**, clic en **Reporte Semanal** (Herramientas).
2. Se muestra el resumen de la semana actual: total, programadas, confirmadas, completadas, canceladas/no asistió.
3. Detalle por día (Lunes a Domingo) con hora, cliente y tipo de cita.
4. Clic en **Imprimir** para generar el reporte en papel.

---

## 3. Diagrama simplificado

```
[Admin] Configura horarios (Configuración)
        ↓
[Admin/Vendedor] Nueva Cita → Selecciona cliente (registrado o guest)
        ↓
[Sistema] Muestra slots disponibles según schedule_settings
        ↓
[Usuario] Elige tipo, fecha, hora → Guarda
        ↓
[Sistema] Crea cita (Programada) → Envía email si hay correo
        ↓
[Profesional] Día de la cita: Confirma → Atiende → Marca Completada
        ↓
[Sistema] Si guest: auto-registro en CRM por RUT
        ↓
[Admin] Reporte Semanal → Imprime para operación
```

---

## 4. Tabla de actores

| Actor                        | Rol                                                                      |
| ---------------------------- | ------------------------------------------------------------------------ |
| **Admin óptica**             | Configura horarios, fechas bloqueadas, gestiona citas, genera reportes.  |
| **Vendedor / Recepcionista** | Agenda citas (clientes y guests), confirma asistencia, actualiza estado. |
| **Profesional óptico**       | Atiende la cita, marca como completada.                                  |
| **Cliente**                  | Paciente que asiste a la cita (registrado o walk-in).                    |

---

## 5. Integraciones

| Módulo                    | Integración                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| **CRM (Clientes)**        | Búsqueda de clientes al crear cita; enlace a ficha desde detalle; auto-registro de guest al completar. |
| **Prescripciones**        | Cita puede vincularse a `prescription_id`; flujo examen → receta.                                      |
| **Órdenes**               | Cita puede vincularse a `order_id`; flujo entrega de lentes.                                           |
| **Notificaciones**        | Notificación interna al crear cita; email de confirmación si hay correo (cliente o guest).             |
| **Operativos en Terreno** | Citas pueden heredar `field_operation_id` del cliente vinculado al operativo.                          |

---

## 6. Rutas y pantallas

| Ruta                           | Descripción                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `/admin/appointments`          | Agenda principal: calendario (Día/Semana/Mes), filtros, resumen del día, herramientas. |
| `/admin/appointments/settings` | Configuración de horarios: slots, duración, horarios por día, fechas bloqueadas.       |

---

## 7. Estados de la cita

| Estado         | Significado                                           |
| -------------- | ----------------------------------------------------- |
| **Programada** | Cita creada, pendiente de confirmación.               |
| **Confirmada** | Cliente confirmó asistencia.                          |
| **Completada** | Servicio realizado; si era guest, se registra en CRM. |
| **Cancelada**  | Cita anulada (con motivo opcional).                   |
| **No asistió** | Cliente no se presentó.                               |

---

## 8. Tipos de cita

| Tipo               | Uso típico                      |
| ------------------ | ------------------------------- |
| Examen de la Vista | Revisión optométrica.           |
| Consulta           | Consulta general.               |
| Ajuste de Lentes   | Ajuste de armazón.              |
| Entrega de Lentes  | Retiro de lentes listos.        |
| Reparación         | Reparación de armazón o lentes. |
| Seguimiento        | Control posterior.              |
| Emergencia         | Atención urgente.               |
| Otro               | Cualquier otro motivo.          |
