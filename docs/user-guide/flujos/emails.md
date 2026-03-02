# Flujo de Emails B2C – Vista del Usuario

## 1. Contexto en la vida real (Chile)

La óptica envía correos electrónicos a sus **clientes** (pacientes) en distintos momentos del ciclo de atención: confirmación de citas, presupuestos enviados, aviso de que los lentes están listos, recordatorios de recetas por vencer, etc. Estos emails son **B2C**: comunicación directa de la óptica hacia el cliente final.

**Ejemplos concretos:**

- **Óptica Andina** (Santiago): Al crear una cita para María González, el sistema envía automáticamente un email de confirmación con fecha, hora y sucursal.
- **Óptica del Sur** (Concepción): Cuando el laboratorio termina los lentes de Juan Pérez, el vendedor cambia el estado a "Listo para retiro" y el cliente recibe un email indicando que puede pasar a buscar su trabajo.
- **Óptica Central** (Valparaíso): Al enviar un presupuesto por email a un cliente, este recibe el detalle de la cotización con vigencia y datos de contacto.

**Problemas que resuelve el módulo:**

- Comunicación automática y consistente con el cliente en cada etapa del flujo.
- Reducir no-shows con recordatorios de citas (24h y 2h antes).
- Informar al cliente cuando su presupuesto o receta está por vencer.
- Dar la bienvenida a nuevos clientes registrados con email.
- Personalizar el contenido con el nombre de la óptica, sucursal y datos de contacto.

**Nota:** Este documento se enfoca únicamente en emails **B2C** (óptica → cliente). No incluye emails del SaaS hacia la óptica (bienvenida, trial, pagos, etc.).

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Configurar plantillas y branding (admin)

1. Ir a **Sistema** → pestaña **Email**.
2. Ver la lista de **plantillas de email** disponibles para la óptica:
   - Confirmación de cita, recordatorios (24h, 2h), cancelación, reprogramación
   - Presupuesto enviado, presupuesto por vencer
   - Trabajo listo para retiro
   - Receta por vencer
   - Bienvenida de cliente
   - Confirmación de orden, entrega
3. **Editar** una plantilla: clic en el ícono de editar → modificar asunto y contenido HTML. Se pueden usar variables como `{{customer_name}}`, `{{appointment_date}}`, `{{branch_name}}`, etc.
4. **Crear plantilla personalizada**: si la óptica quiere una variante (ej. otro tono para recordatorios), puede crear una nueva del mismo tipo; la org específica tiene prioridad sobre la plantilla por defecto.
5. **Enviar prueba**: clic en "Enviar prueba" → ingresar email → el sistema envía una copia con datos de ejemplo.
6. En la misma pestaña, configurar **Email de respuesta (Reply-To)** y **Nombre para mostrar** en la card de configuración. Las respuestas del cliente irán a ese correo.

**Qué ve el usuario:** Tabla de plantillas con tipo, asunto, estado (activa/inactiva), uso. Botones para editar, eliminar, preview y enviar prueba. Card con campos de Reply-To y nombre de remitente.

---

### Paso 2: Emails automáticos al crear cita (admin/vendedor)

1. Ir a **Citas y Agenda** → **Nueva cita** (o crear desde el calendario).
2. Completar datos del cliente (o invitado), fecha, hora, sucursal, profesional.
3. Si el cliente tiene **email** registrado (o se ingresa guest_email), al guardar el sistema envía automáticamente un **email de confirmación** con:
   - Nombre del cliente
   - Fecha y hora de la cita
   - Nombre del profesional
   - Sucursal y datos de contacto

**Qué ve el usuario:** No hay acción explícita para enviar el email; ocurre en segundo plano al crear la cita. El cliente recibe el correo en su bandeja.

---

### Paso 3: Recordatorios automáticos de citas (sistema – cron)

El sistema ejecuta tareas programadas (cron) que envían recordatorios sin intervención del usuario:

- **24 horas antes:** Cron diario busca citas del día siguiente y envía recordatorio.
- **2 horas antes:** Cron cada hora busca citas en ~2 horas y envía recordatorio.
- **7 días antes del seguimiento:** Para citas con "Requiere Seguimiento", envía recordatorio cuando `follow_up_date` está en 7 días.

**Qué ve el usuario:** El admin no hace nada; los emails se envían automáticamente. El cliente recibe el recordatorio en su correo.

---

### Paso 4: Enviar presupuesto por email (admin/vendedor)

1. Ir a **Presupuestos** → seleccionar un presupuesto (estado borrador o enviado).
2. Clic en **Enviar por email** (o botón similar).
3. Ingresar el **email del destinatario** (si el cliente no tiene email, se puede escribir uno).
4. Confirmar envío: el sistema envía el presupuesto con detalle, total y vigencia.
5. El cliente recibe el email con el contenido del presupuesto.

**Qué ve el usuario:** Diálogo con campo de email. Al enviar, toast de éxito. El presupuesto pasa a estado "Enviado".

---

### Paso 5: Presupuesto por vencer (sistema – cron)

- **48 horas antes de expirar:** Cron diario busca presupuestos con `expiration_date` en 2 días y envía recordatorio al cliente.

**Qué ve el usuario:** Automático. El cliente recibe un email recordando que su presupuesto vence pronto.

---

### Paso 6: Trabajo listo para retiro (admin/vendedor)

1. Ir a **Trabajos** → seleccionar un trabajo de laboratorio.
2. Cambiar el **estado** a **Listo para retiro** (`ready_for_pickup`).
3. Al guardar, si el cliente tiene email, el sistema envía automáticamente un email indicando que los lentes están listos para retiro.
4. Opcionalmente, si el cliente prefiere WhatsApp, también se envía mensaje por ese canal.

**Qué ve el usuario:** Cambio de estado en el detalle del trabajo. El email se envía en segundo plano. El cliente recibe la notificación.

---

### Paso 7: Receta por vencer (sistema – cron)

- **30 días antes de vencer:** Cron diario busca recetas con `expiration_date` en 30 días y envía recordatorio al cliente para que renueve su receta.

**Qué ve el usuario:** Automático. El cliente recibe un email recordando que su receta vence pronto (Código Sanitario Chile).

---

### Paso 8: Bienvenida a nuevo cliente (admin/vendedor)

1. Ir a **Clientes** → **Nuevo cliente**.
2. Completar datos: nombre, apellido, **email**, teléfono, etc.
3. Al guardar, si se ingresó email, el sistema envía automáticamente un **email de bienvenida** al nuevo cliente.

**Qué ve el usuario:** Creación normal del cliente. El email se envía en segundo plano.

---

### Paso 9: Confirmación de orden (admin/POS – si aplica)

- Al crear una **orden** (ej. desde POS o módulo de órdenes) con email del cliente, el sistema envía **confirmación de orden** con detalle de items y total.
- Al confirmar **entrega** de una orden, se puede enviar email de **orden entregada** (si el flujo está implementado).

**Qué ve el usuario:** Depende del flujo de órdenes/POS. El email se dispara automáticamente al crear la orden o al marcar como entregada.

---

### Paso 10: Cancelación o reprogramación de cita (admin/vendedor)

- **Cancelación:** Al cancelar una cita, si el cliente tiene email, el sistema envía **email de cancelación**.
- **Reprogramación:** Al cambiar fecha u hora de una cita, se envía **email de reprogramación** con los nuevos datos.

**Qué ve el usuario:** Acciones normales de cancelar o editar cita. Los emails se envían automáticamente.

---

## 3. Diagrama simplificado

```
[Admin] Configura plantillas y Reply-To en Sistema → Email
        ↓
[Admin/Vendedor] Crea cita con email del cliente
        ↓
[Sistema] Envía appointment_confirmation automáticamente
        ↓
[Cron 24h] Envía appointment_reminder
[Cron 2h]  Envía appointment_reminder_2h
        ↓
[Admin/Vendedor] Envía presupuesto por email
        ↓
[Sistema] Envía quote_sent al cliente
        ↓
[Cron 48h] Envía quote_expiring si presupuesto por vencer
        ↓
[Admin/Vendedor] Cambia trabajo a "Listo para retiro"
        ↓
[Sistema] Envía work_order_ready al cliente
        ↓
[Cron 30d] Envía prescription_expiring si receta por vencer
        ↓
[Admin/Vendedor] Crea nuevo cliente con email
        ↓
[Sistema] Envía account_welcome
```

---

## 4. Tabla de actores

| Actor              | Rol                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin óptica**   | Configura plantillas de email, Reply-To y nombre de remitente en Sistema → Email. Crea citas, envía presupuestos, cambia estados de trabajos. Recibe respuestas de clientes en el Reply-To configurado. |
| **Vendedor**       | Crea citas, envía presupuestos por email, cambia trabajos a "Listo para retiro". No configura plantillas (solo admin).                                                                                  |
| **Cliente**        | Recibe emails de confirmación, recordatorios, presupuestos, avisos de trabajo listo, receta por vencer, bienvenida. Puede responder al Reply-To de la óptica.                                           |
| **Sistema (cron)** | Envía recordatorios de citas (24h, 2h, follow-up), presupuesto por vencer, receta por vencer. Sin intervención del usuario.                                                                             |

---

## 5. Integraciones

| Módulo               | Integración                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **Citas y Agenda**   | Confirmación al crear, recordatorios 24h/2h, cancelación, reprogramación, follow-up.                   |
| **Presupuestos**     | Envío manual por email (quote_sent), recordatorio por vencer (quote_expiring).                         |
| **Trabajos**         | Email al cambiar estado a "Listo para retiro" (work_order_ready).                                      |
| **Clientes (CRM)**   | Bienvenida al crear cliente con email (account_welcome).                                               |
| **Libro de Recetas** | Recordatorio de receta por vencer (prescription_expiring).                                             |
| **Órdenes/POS**      | Confirmación de orden, entrega (si el flujo está activo).                                              |
| **Notificaciones**   | Las notificaciones in-app (admin_notifications) son independientes; los emails van directo al cliente. |

---

## 6. Rutas de referencia

| Acción                                  | Ruta admin                              |
| --------------------------------------- | --------------------------------------- |
| Plantillas y configuración email        | `/admin/system?tab=email`               |
| Crear cita (dispara confirmación)       | `/admin/appointments` → Nueva cita      |
| Enviar presupuesto                      | `/admin/quotes/[id]` → Enviar por email |
| Cambiar trabajo a listo (dispara email) | `/admin/work-orders/[id]` → Estado      |
| Crear cliente (dispara bienvenida)      | `/admin/customers/new`                  |

---

## 7. Tipos de plantilla B2C (resumen)

| Tipo                             | Cuándo se envía                          | Destinatario |
| -------------------------------- | ---------------------------------------- | ------------ |
| `appointment_confirmation`       | Al crear cita                            | Cliente      |
| `appointment_reminder`           | 24h antes (cron)                         | Cliente      |
| `appointment_reminder_2h`        | 2h antes (cron)                          | Cliente      |
| `appointment_cancelation`        | Al cancelar cita                         | Cliente      |
| `appointment_rescheduled`        | Al reprogramar cita                      | Cliente      |
| `appointment_follow_up_reminder` | 7 días antes de follow_up_date (cron)    | Cliente      |
| `quote_sent`                     | Al enviar presupuesto por email          | Cliente      |
| `quote_expiring`                 | 48h antes de expirar (cron)              | Cliente      |
| `work_order_ready`               | Al cambiar trabajo a "Listo para retiro" | Cliente      |
| `prescription_expiring`          | 30 días antes de vencer (cron)           | Cliente      |
| `account_welcome`                | Al crear cliente con email               | Cliente      |
| `order_confirmation`             | Al crear orden con email                 | Cliente      |
| `order_delivered`                | Al confirmar entrega (si aplica)         | Cliente      |

---

## 8. Notas de implementación

- **Remitente:** Todos los emails B2C se envían desde `noreply@opttius.cl` (dominio verificado en Resend). El **Reply-To** es el email de la óptica (`organizations.metadata.support_email` o `system_config.contact_email`).
- **Plantillas:** Se cargan desde `system_email_templates`. Prioridad: plantilla con `organization_id` de la óptica > plantilla por defecto (`organization_id IS NULL`).
- **Variables:** Cada plantilla usa variables como `{{customer_name}}`, `{{appointment_date}}`, `{{branch_name}}`, `{{quote_number}}`, etc. Ver skill `emails-optical-supabase` para lista completa.
- **Cron:** Los recordatorios dependen de Vercel Cron (o similar) con `CRON_SECRET` para autorización.
- **low_stock_alert:** Se envía al email de la óptica (contacto), no al cliente; no se considera B2C en este documento.
