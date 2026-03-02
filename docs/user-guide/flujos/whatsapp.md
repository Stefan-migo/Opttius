# Flujo de WhatsApp + Agente IA – Vista del Usuario

## 1. Contexto en la vida real (Chile)

En Chile, WhatsApp es el canal preferido para comunicarse con clientes. Una óptica quiere que sus pacientes puedan:

- **Consultar por WhatsApp** cuándo es su próxima cita, el estado de su presupuesto o si sus lentes ya están listos.
- **Confirmar citas** sin tener que llamar por teléfono.
- **Recibir recordatorios** automáticos antes de la cita (24h o 2h).
- **Recibir notificaciones** cuando su orden está lista para retiro.

A su vez, el **administrador** o **dueño** de la óptica puede usar WhatsApp para consultar el negocio desde el celular: stock bajo, clientes, órdenes atrasadas, etc., usando el mismo asistente IA que en el panel web.

**Ejemplos concretos:**

- **Óptica Visión Clara (Providencia):** Conecta su número +56 9 1234 5678. La paciente María escribe "¿Cuándo es mi cita?" y recibe: "Tu próxima cita es el 15 de marzo a las 10:00 en Sucursal Providencia."
- **Admin en terreno:** El dueño está fuera de la sucursal y escribe "¿Qué productos tienen stock bajo?" por WhatsApp. El asistente responde con la lista actualizada.
- **Recordatorio automático:** El sistema envía "Tu cita en Óptica Visión Clara es mañana a las 10:00. Responde CONFIRMAR para confirmar." si el cliente tiene `preferred_contact_method: whatsapp`.

**Problemas que resuelve el módulo:**

- Reducir ausentismo en citas con recordatorios y confirmación por WhatsApp.
- Permitir consultas de clientes sin llamar ni ir a la sucursal.
- Dar al admin acceso al asistente IA desde el celular.
- Integrar notificaciones automáticas (citas, presupuestos, órdenes listas, alertas de inventario) en el canal que los clientes prefieren.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Conectar WhatsApp (admin, una sola vez)

1. Ir a **Sistema** en el menú lateral → pestaña **WhatsApp** (o directamente `/admin/system?tab=whatsapp`).
2. Ver la card **WhatsApp Business** con:
   - Estado: **Conectado** (badge verde) o **No conectado** (badge gris).
   - Si está conectado: número mostrado, WABA ID y Phone Number ID.
3. **Opción A – Conectar con Meta (Embedded Signup):**
   - Clic en **Conectar con Meta (Embedded Signup)**.
   - Se abre la ventana de Meta. Iniciar sesión con la cuenta de Facebook que administra la óptica.
   - Seleccionar la Cuenta Comercial (Business Manager) o crear una nueva.
   - Crear perfil de WhatsApp Business (nombre de la óptica, categoría).
   - Registrar y verificar el número de teléfono (código por SMS o llamada).
   - Tras completar, Meta redirige a Opttius y el número queda conectado.
4. **Opción B – Ingreso manual:**
   - En "O ingresa manualmente", completar:
     - **WABA ID** (Business Account ID de Meta).
     - **Phone Number ID** (ID del número de WhatsApp).
     - **Número mostrado** (opcional, ej. +56912345678).
   - Clic en **Conectar WhatsApp** o **Actualizar**.
5. **Instrucciones adicionales:**
   - Crear app en [Meta for Developers](https://developers.facebook.com/) y añadir WhatsApp Cloud API.
   - Configurar el webhook en Meta: `https://tu-dominio.com/api/webhooks/whatsapp`.
   - Configurar facturación en Business Manager de Meta (Meta cobra directamente según volumen de mensajes).

**Qué ve el usuario:** Card con estado, botón de conexión OAuth, formulario manual e instrucciones paso a paso.

---

### Paso 2: Cliente escribe por WhatsApp (cliente)

1. El cliente abre **WhatsApp** en su celular.
2. Busca el número de la óptica (ej. +56 9 1234 5678) o el contacto guardado.
3. Escribe un mensaje, por ejemplo:
   - "¿Cuándo es mi próxima cita?"
   - "¿Cómo va mi presupuesto?"
   - "¿Ya están listos mis lentes?"
   - "Confirmo mi cita"
4. El **asistente IA** responde en segundos con información real de la óptica.
5. Si el cliente **no está registrado** (su número no coincide con ningún cliente en el CRM), el asistente indica: "Contacta directamente a la sucursal para vincular tu número."

**Qué ve el cliente:** Conversación normal en WhatsApp. Respuestas en texto plano (sin streaming; WhatsApp no lo soporta).

**Requisito:** El número del cliente debe estar registrado en la ficha del cliente (`customers.phone`) para que el sistema lo identifique y pueda consultar citas, presupuestos y órdenes.

---

### Paso 3: Admin escribe por WhatsApp (admin)

1. El administrador o dueño abre **WhatsApp** en su celular.
2. Escribe al número de la óptica conectada.
3. El sistema identifica al admin porque su número coincide con `profiles.phone` de un usuario activo en la organización.
4. El asistente responde con **acceso completo** a las herramientas:
   - "¿Qué productos tienen stock bajo?"
   - "¿Cuántas órdenes hay pendientes?"
   - "Muéstrame los clientes que llevan más de 6 meses sin comprar"
   - "¿Cómo van las ventas de esta semana?"
5. Las respuestas usan datos en tiempo real de la sucursal/organización.

**Qué ve el admin:** Mismo flujo que el cliente, pero con respuestas más ricas y acceso a analíticas, inventario, clientes, etc.

---

### Paso 4: Recordatorios y notificaciones automáticas (sistema)

El sistema envía mensajes automáticos según la configuración:

| Evento                         | Cuándo                  | A quién                  | Canal                                            |
| ------------------------------ | ----------------------- | ------------------------ | ------------------------------------------------ |
| **Recordatorio de cita (24h)** | Cron diario             | Cliente con cita próxima | WhatsApp si `preferred_contact_method: whatsapp` |
| **Recordatorio de cita (2h)**  | Cron cada hora          | Cliente con cita en 2h   | WhatsApp si preferido                            |
| **Presupuesto enviado**        | Al enviar presupuesto   | Cliente del presupuesto  | WhatsApp si preferido                            |
| **Orden lista para retiro**    | Al cambiar OT a "listo" | Cliente de la orden      | WhatsApp si preferido                            |
| **Alerta de inventario bajo**  | Cron de stock bajo      | Dueño/admin (config)     | WhatsApp B2B (número Opttius)                    |

**Qué ve el usuario:** Mensajes entrantes en WhatsApp sin intervención manual. El cliente puede responder "CONFIRMAR" para confirmar la cita (si está implementado).

---

## 3. Diagrama simplificado

```
[Admin] Sistema → WhatsApp → Conectar con Meta (o manual)
        ↓
[Sistema] Guarda phone_number_id + waba_id en whatsapp_phone_numbers
        ↓
[Cliente] Escribe por WhatsApp al número de la óptica
        ↓
[Meta] POST /api/webhooks/whatsapp
        ↓
[Sistema] Context Resolver: wa_id + phone_number_id → customer/admin, organization_id
        ↓
[Sistema] Session Manager: getOrCreateWhatsAppSession(wa_id, org_id)
        ↓
[Sistema] WhatsApp Adapter → Agent.chat() (tools según rol)
        ↓
[Sistema] Envía respuesta vía Cloud API → [Cliente] Recibe en WhatsApp
        ↓
[Admin] Escribe por WhatsApp → Mismo flujo, tools completas
        ↓
[Sistema] Cron / eventos → Envía recordatorios, presupuestos, "orden lista", alertas
```

---

## 4. Tabla de actores

| Actor                      | Rol                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin óptica**           | Conecta el número WhatsApp en Sistema; usa el asistente por WhatsApp con acceso completo (stock, clientes, órdenes, analíticas).      |
| **Cliente**                | Escribe por WhatsApp para consultar citas, presupuestos y órdenes; confirma citas; recibe recordatorios y notificaciones automáticas. |
| **Sistema (Agent)**        | Procesa mensajes entrantes, identifica rol (admin/cliente), ejecuta herramientas según permisos, envía respuesta por Cloud API.       |
| **Sistema (Cron/Eventos)** | Envía recordatorios de cita, presupuestos, "orden lista" y alertas de inventario según configuración.                                 |
| **Meta (WhatsApp)**        | Recibe mensajes del usuario, entrega al webhook; entrega respuestas al usuario.                                                       |

---

## 5. Integraciones

| Módulo                      | Integración                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Citas**                   | Recordatorios 24h y 2h por WhatsApp; tool `getAppointmentStatus` y `confirmAppointment` para clientes. |
| **Presupuestos**            | Envío de presupuesto por WhatsApp al cliente; tool `getQuoteStatus` para clientes.                     |
| **Trabajos de laboratorio** | Notificación "Tu orden está lista" por WhatsApp; tool `getOrderStatus` para clientes.                  |
| **Clientes (CRM)**          | `preferred_contact_method: whatsapp`; `customers.phone` para identificar cliente por wa_id.            |
| **Inventario**              | Alerta de stock bajo por WhatsApp al dueño (B2B, número Opttius).                                      |
| **IA (Chat web)**           | Mismo Agent (`core.ts`), mismas herramientas; canal `whatsapp` vs `whatsapp_customer` según rol.       |

---

## 6. Rutas y pantallas

| Acción                       | Ruta admin                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Configurar WhatsApp          | `/admin/system?tab=whatsapp`                                                   |
| OAuth callback (Meta)        | `/api/admin/whatsapp/oauth-callback` → redirige a `/admin/system?tab=whatsapp` |
| Estado de números conectados | `GET /api/admin/whatsapp/status`                                               |
| Conectar/actualizar número   | `POST /api/admin/whatsapp/connect`                                             |
| Webhook (Meta)               | `GET/POST /api/webhooks/whatsapp` (público, verificación + mensajes)           |

---

## 7. Herramientas del agente por rol

### Cliente (4 tools)

| Tool                   | Descripción                             |
| ---------------------- | --------------------------------------- |
| `getAppointmentStatus` | Citas próximas del cliente              |
| `getQuoteStatus`       | Presupuestos del cliente                |
| `getOrderStatus`       | Órdenes de trabajo (lentes) del cliente |
| `confirmAppointment`   | Confirmar una cita (solo si es dueño)   |

**Validación:** Todas validan que el `wa_id` corresponda a un cliente registrado (`customers.phone`). Si no, el agente indica contactar a la sucursal.

### Admin (todas las tools)

- Productos, clientes, órdenes, analíticas, inventario, soporte, recomendaciones, etc.
- Mismo conjunto que el Chat IA del panel web.

---

## 8. Notas de implementación

- **Identificación:** `wa_id` (teléfono del remitente) se compara con `customers.phone` (cliente) o `profiles.phone` + `admin_users` (admin). Chile: 9 dígitos (912345678) se normaliza a 56912345678.
- **Ventana 24h:** Mensajes fuera de la ventana de 24h requieren plantillas aprobadas por Meta.
- **Límite:** 4096 caracteres por mensaje de texto.
- **Costos:** Meta cobra a la óptica directamente (Embedded Signup). Mensajes de respuesta dentro de 24h suelen ser gratuitos (Servicio); Utilidad ~$0.001–0.015 USD/msg.
- **Número limpio:** Para conectar un número nuevo, no debe tener WhatsApp activo (o borrar la cuenta actual antes).
- **B2B (alertas al dueño):** Usa el número oficial de Opttius; configuración en `system_config.whatsapp_notification_phone` o `profiles.phone` del owner.
