# Módulo WhatsApp + Agente IA — Documentación Técnica

**Versión:** 1.1  
**Fecha:** 2026-02-23  
**Skill asociado:** `.cursor/skills/whatsapp-ai-agent-optical/SKILL.md`  
**Fuente:** Incluye requisitos, costos e instrucciones de la conversación Gemini (2026-02).

---

## 1. Introducción

Este documento describe la arquitectura, diseño e implementación del módulo de **WhatsApp integrado con el Agente IA** de Opttius. El objetivo es permitir **dos integraciones distintas** en un SaaS multi-tenant de ópticas:

1. **Integración A (B2B):** Opttius → Dueño de óptica (notificaciones del sistema)
2. **Integración B (B2C):** Óptica → Sus clientes/pacientes (comunicación con IA)

### 1.1 Alcance

- **Integración A:** Recordatorios, alertas de inventario, cierres de cita, notificaciones del SaaS al dueño de la óptica
- **Integración B:** Clientes consultan citas, presupuestos, órdenes; la IA responde con datos de esa óptica
- **Administradores:** Acceso al Agente IA completo vía WhatsApp (herramientas, insights)

### 1.2 Contexto del Proyecto

- **Opttius:** SaaS para gestión de ópticas (multi-tenant)
- **Agente IA:** Chat con tool calling, memoria organizacional, insights
- **WhatsApp:** Canal preferido en Chile y LATAM; requiere API oficial (no app normal)

---

## 2. Integración Dual (B2B + B2C)

### 2.1 Integración A: SaaS → Dueño de Óptica (B2B)

| Aspecto              | Detalle                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| **Emisor**           | Número oficial de Opttius (una sola cuenta WhatsApp Business)              |
| **Receptor**         | Dueño/administrador de la óptica                                           |
| **Tipo de mensajes** | Plantillas (Templates) pre-aprobadas por Meta                              |
| **Trigger**          | Eventos del sistema: inventario bajo, cierre de caja, recordatorio de cita |
| **Quién paga Meta**  | Opttius (conversaciones de Utilidad)                                       |
| **Arquitectura**     | Backend detecta evento → Webhook/envío a API WhatsApp con número del dueño |

### 2.2 Integración B: Óptica → Sus Clientes (B2C)

| Aspecto                | Detalle                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| **Emisor**             | Número de cada óptica (cada una conecta su propio número)                        |
| **Receptor**           | Pacientes/clientes de esa óptica                                                 |
| **Modelo recomendado** | **Embedded Signup** (cada óptica conecta su número desde Opttius)                |
| **Quién paga Meta**    | La óptica directamente (Cliente ↔ Meta)                                         |
| **Ventaja**            | Opttius no asume costos de mensajes; cada cliente paga su consumo                |
| **IA**                 | Un asistente por óptica; contexto RAG con precios, doctores, citas de esa óptica |

### 2.3 Diagrama de Componentes (Integración B)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    WHATSAPP + AGENTE IA OPTTIUS (B2C)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────┐     ┌─────────────────────┐     ┌──────────────────────┐   │
│   │  Meta Cloud  │     │  Webhook API         │     │  WhatsApp Adapter     │   │
│   │  API         │────▶│  /api/webhooks/      │────▶│  phone_number_id →    │   │
│   │  (webhooks)  │     │  whatsapp            │     │  organization_id      │   │
│   └──────────────┘     └─────────────────────┘     └───────────┬────────────┘   │
│                                                                 │                │
│                                                                 ▼                │
│   ┌──────────────┐     ┌─────────────────────┐     ┌──────────────────────┐   │
│   │  Meta Cloud  │◀────│  WhatsApp Client     │◀────│  Agent (core.ts)      │   │
│   │  API         │     │  (por phone_number_id)│    │  ToolExecutor          │   │
│   │  (send)      │     │                      │     │  loadSessionHistory   │   │
│   └──────────────┘     └─────────────────────┘     └──────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Identificador de contexto:** El webhook recibe `metadata.phone_number_id`. Se debe mapear `phone_number_id` → `organization_id` (tabla `whatsapp_phone_numbers` u otra).

### 2.4 Flujo de Datos

```
1. Usuario envía mensaje por WhatsApp
2. Meta envía webhook POST a /api/webhooks/whatsapp
3. Webhook handler:
   a. Verifica firma (X-Hub-Signature-256)
   b. Parsea payload (messages, status, errors)
   c. Por cada mensaje: extrae wa_id, text, type
4. Context Resolver:
   a. wa_id → ¿customer o admin_user?
   b. Obtiene organization_id, branch_id
5. Session Manager:
   a. Busca/crea chat_session con metadata { channel: "whatsapp", wa_id }
6. WhatsApp Adapter:
   a. Crea Agent con organizationId, currentBranchId
   b. loadSessionHistory(sessionId)
   c. loadOrganizationalContext()
   d. response = await agent.chat(userMessage)  // No streaming
7. WhatsApp Client:
   a. Envía response a Meta Cloud API
8. Persistencia:
   a. Inserta mensaje usuario y asistente en chat_messages
```

### 2.5 Reutilización del Agente

El **Agente IA** (`src/lib/ai/agent/core.ts`) no se modifica. Se usa tal cual:

- `createAgent(options)` con `organizationId`, `currentBranchId`, `userId`
- `loadSessionHistory(sessionId)` para continuidad
- `loadOrganizationalContext()` para contexto de la óptica
- `agent.chat(message)` para respuesta síncrona (WhatsApp no soporta streaming)

**Diferencias por canal:**

| Aspecto   | Chat Web                   | WhatsApp                        |
| --------- | -------------------------- | ------------------------------- |
| Usuario   | admin (autenticado)        | customer o admin (por wa_id)    |
| Sesión    | sessionId de chat_sessions | sessionId + metadata.wa_id      |
| Respuesta | Streaming SSE              | Síncrona, texto completo        |
| Tools     | Todas (si admin)           | Subconjunto según rol (ver 4.5) |

---

## 3. WhatsApp Cloud API

### 3.1 Configuración en Meta

1. Crear app en [Meta for Developers](https://developers.facebook.com/)
2. Añadir producto **WhatsApp** > **Cloud API**
3. Obtener:
   - `WHATSAPP_ACCESS_TOKEN` (token de acceso)
   - `WHATSAPP_PHONE_NUMBER_ID` (ID del número de negocio)
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
4. Configurar webhook URL: `https://tu-dominio.com/api/webhooks/whatsapp`
5. Verificación: `WHATSAPP_VERIFY_TOKEN` (string secreto que tú defines)

### 3.2 Verificación del Webhook (GET)

Meta envía GET para verificar la URL:

```
GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=CHALLENGE
```

Respuesta: devolver `hub.challenge` como texto plano si `hub.verify_token` coincide.

### 3.3 Recepción de Mensajes (POST)

Payload de ejemplo (simplificado):

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551234567",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "wa_id": "56912345678",
                "profile": { "name": "Juan Pérez" }
              }
            ],
            "messages": [
              {
                "from": "56912345678",
                "id": "wamid.xxx",
                "timestamp": "1234567890",
                "type": "text",
                "text": { "body": "¿Cuándo es mi cita?" }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### 3.4 Envío de Mensajes

```
POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "56912345678",
  "type": "text",
  "text": { "body": "Tu cita es el 25 de febrero a las 10:00." }
}
```

### 3.5 Límites y Consideraciones

- **Throughput:** 80 msg/s por defecto por número
- **Ventana de 24h:** Tras respuesta del usuario, puedes enviar mensajes libres por 24h
- **Fuera de 24h:** Solo plantillas aprobadas por Meta
- **Longitud:** Máximo 4096 caracteres por mensaje de texto

### 3.6 Estructura de Costos (Estimados 2026)

| Componente                                       | Detalle                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| **Meta (WhatsApp)**                              |                                                                  |
| — Servicio (cliente escribe, IA responde en 24h) | **Gratis**                                                       |
| — Utilidad (confirmaciones, citas)               | ~$0.001 – $0.015 USD por mensaje                                 |
| — Marketing (promociones)                        | ~$0.02 – $0.12 USD por mensaje                                   |
| **IA (tokens)**                                  | $5 – $20 USD/mes (pyme); $50+ USD (empresa)                      |
| **Plataforma (BSP/CRM)**                         | Opcional si se programa todo; $15–90 USD si se usa intermediario |

**Con Embedded Signup:** La óptica paga Meta directamente. Opttius cobra solo por el módulo de IA y la plataforma.

---

## 4. Embedded Signup (Integración B)

Permite que cada dueño de óptica conecte su propio número de WhatsApp desde Opttius, sin salir de la plataforma. Opttius actúa como Solution Partner.

### 4.1 Requisitos Previos (Desarrollador Opttius)

| Requisito          | Descripción                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| App Meta           | Crear app tipo "Business" en [Meta for Developers](https://developers.facebook.com/)          |
| Producto WhatsApp  | Añadir producto WhatsApp > Cloud API                                                          |
| Permisos           | Solicitar y obtener aprobación: `whatsapp_business_management`, `whatsapp_business_messaging` |
| Facebook Login SDK | Integrar botón oficial en el panel de administración                                          |
| Webhook            | Servidor listo para recibir WABA ID y Phone Number ID al completar el registro                |

### 4.2 Requisitos para el Dueño de la Óptica

| Requisito          | Descripción                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| Cuenta Facebook    | Personal, administrador de la Fan Page o Business Manager de la óptica      |
| Información legal  | Nombre legal, dirección, sitio web, correo corporativo                      |
| Número de teléfono | **Limpio:** sin cuenta de WhatsApp activa (o borrar la cuenta actual antes) |
| Método de pago     | Tarjeta en su Business Manager de Meta (Meta cobra directamente)            |

### 4.3 Instrucciones para el Dueño de la Óptica

Crear sección "Configuración de WhatsApp" en el SaaS con estos pasos:

**Paso 1: Iniciar conexión**  
"Haz clic en 'Conectar con Facebook'. Se abrirá una ventana de Meta. Inicia sesión con tu cuenta personal que administra la óptica."

**Paso 2: Seleccionar cuenta comercial**  
"Selecciona tu Cuenta Comercial de Meta (Business Manager). Si no tienes una, el sistema te permitirá crear una nueva con los datos de tu óptica."

**Paso 3: Crear perfil de WhatsApp Business**  
"Ingresa el nombre público de tu óptica (ej. 'Óptica Visión Clara') y la categoría del negocio. Este es el nombre que verán tus clientes."

**Paso 4: Registrar y verificar el número**  
"Introduce el número de teléfono que usarás. Recibirás un código de 6 dígitos por SMS o llamada de voz para verificar que el número te pertenece."

**Paso 5: Configurar el pago**  
"Una vez finalizado, ve a tu Administrador Comercial de Meta > Configuración de facturación. Añade un método de pago. Meta te cobrará directamente según el volumen de mensajes; nosotros solo gestionamos la tecnología."

**Sugerencia:** Proporcionar un video corto (2 min) mostrando el proceso.

### 4.4 Mapeo phone_number_id → organization_id

Tras el Embedded Signup, Meta devuelve `waba_id` y `phone_number_id`. Guardar en tabla:

```sql
-- Ejemplo de esquema
CREATE TABLE whatsapp_phone_numbers (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  phone_number_id TEXT NOT NULL UNIQUE,
  waba_id TEXT NOT NULL,
  display_phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Diseño de Implementación

### 5.1 Estructura de Archivos

```
src/
├── lib/
│   ├── whatsapp/
│   │   ├── client.ts           # Enviar mensajes a Cloud API
│   │   ├── webhook-handler.ts  # Parseo y despacho de eventos
│   │   ├── session-manager.ts  # Sesiones por wa_id + org_id
│   │   ├── context-resolver.ts # wa_id → customer/admin → org, branch
│   │   └── types.ts            # Tipos de payload, mensajes
│   └── ai/
│       └── agent/
│           └── whatsapp-adapter.ts  # Adaptador Agent para WhatsApp
└── app/
    └── api/
        └── webhooks/
            └── whatsapp/
                └── route.ts    # GET (verify) + POST (webhook)
```

### 5.2 Context Resolver

**Integración B:** Primero resolver `phone_number_id` → `organization_id` (tabla `whatsapp_phone_numbers`).

```typescript
// Resolver: phone_number_id + wa_id → organization_id, branch_id, rol
interface WhatsAppContext {
  waId: string;
  organizationId: string;
  branchId?: string | null;
  phoneNumberId: string; // Para enviar respuesta por el número correcto
  userId?: string; // admin_users.id si es admin
  customerId?: string; // customers.id si es cliente
  role: "admin" | "customer";
}

async function resolveContext(
  waId: string,
  phoneNumberId: string,
): Promise<WhatsAppContext | null>;
```

Lógica:

1. **phone_number_id** → `whatsapp_phone_numbers` → `organization_id`
2. **wa_id** → Buscar `customers` donde `phone` normalizado (E.164) coincida
3. Si no hay customer, buscar `admin_users` o `profiles` con `phone` coincidente
4. Si es admin: `organization_id` de admin_users; `branch_id` por defecto o config
5. Si es customer: `organization_id` y `branch_id` del customer
6. Si no se encuentra: ¿crear contacto temporal o rechazar? (Definir política)

### 5.3 Session Manager

```typescript
// Sesiones por (wa_id, organization_id)
async function getOrCreateWhatsAppSession(
  waId: string,
  organizationId: string,
  metadata?: Record<string, any>,
): Promise<string>; // session_id
```

- Tabla: `chat_sessions` (existente)
- Metadata: `{ channel: "whatsapp", wa_id }
- Un mismo wa_id puede tener sesiones en distintas organizaciones (multi-óptica)

### 5.4 WhatsApp Adapter

```typescript
async function processWhatsAppMessage(
  userMessage: string,
  context: WhatsAppContext,
  sessionId: string,
): Promise<string> {
  const agent = await createAgent({
    userId: context.userId || context.userId!, // o un system user para clientes
    organizationId: context.organizationId,
    currentBranchId: context.branchId,
    sessionId,
    config: {
      enabledTools: context.role === "admin" ? undefined : CUSTOMER_SAFE_TOOLS,
    },
  });

  await agent.loadSessionHistory(sessionId);
  await agent.loadOrganizationalContext();

  const response = await agent.chat(userMessage);
  return response;
}
```

### 5.5 Herramientas por Rol

| Rol     | Herramientas permitidas                                              |
| ------- | -------------------------------------------------------------------- |
| Admin   | Todas (getProducts, getCustomers, getOrders, etc.)                   |
| Cliente | getAppointmentStatus, getQuoteStatus, getOrderStatus (a implementar) |

Para clientes, se pueden crear tools específicas que reciban `customerId` o `wa_id` y validen que el solicitante sea el dueño del recurso.

### 5.6 Base de Datos

**Tablas existentes:**

- `chat_sessions`: Añadir `metadata` JSONB con `{ channel, wa_id }`
- `chat_messages`: Sin cambios

**Opcional:**

- `whatsapp_contacts`: Mapeo wa_id ↔ customer_id, organization_id (para optimizar resolución)

---

## 6. Seguridad

### 6.1 Verificación de Firma

Meta firma el payload con HMAC-SHA256. Verificar:

```
X-Hub-Signature-256: sha256=<signature>
```

Comparar con `HMAC-SHA256(payload_raw, APP_SECRET)`.

### 6.2 Validación de Entrada

- Sanitizar `text.body` (evitar inyección)
- Validar longitud (4096 caracteres)
- Limitar frecuencia por wa_id (rate limit)

### 6.3 RLS y Multi-Tenancy

- Todas las consultas deben filtrar por `organization_id`
- El Agent ya usa `ToolExecutionContext` con `organizationId` y `currentBranchId`

---

## 7. Casos de Uso Ópticos

### 7.1 Cliente: Consultar Cita

- Mensaje: "¿Cuándo es mi próxima cita?"
- Tool: `getAppointmentStatus` (customerId)
- Respuesta: "Tu próxima cita es el 25 de febrero a las 10:00 en la sucursal Centro."

### 7.2 Cliente: Confirmar Cita

- Mensaje: "Confirmo mi cita"
- Tool: `confirmAppointment` (appointmentId)
- Respuesta: "Tu cita ha sido confirmada. Te esperamos."

### 7.3 Admin: Consultar Productos

- Mensaje: "¿Qué productos tienen stock bajo?"
- Tool: `getLowStockProducts`
- Respuesta: (resumen de productos con stock bajo)

### 7.4 Sistema: Recordatorio de Cita

- Trigger: Cron (24h antes)
- Plantilla aprobada o mensaje dentro de 24h
- "Tu cita en [Óptica] es mañana a las 10:00. Responde CONFIRMAR para confirmar."

---

## 8. Roadmap de Implementación

### Fase 1: Integración A — Notificaciones SaaS (1–2 semanas)

1. Número oficial de Opttius conectado a Meta
2. Plantillas aprobadas: alerta inventario, recordatorio cita, cierre de caja
3. Webhook de envío (backend → API WhatsApp)
4. Mapeo: organization_id → phone del dueño (admin_users o config)

### Fase 2: Infraestructura B2C (1–2 semanas)

1. Webhook route (GET + POST)
2. Verificación de firma
3. WhatsApp client (send text, por phone_number_id)
4. Tabla `whatsapp_phone_numbers` (phone_number_id → organization_id)
5. Context resolver: phone_number_id + wa_id → organization_id, role
6. Session manager
7. WhatsApp adapter + Agent.chat()

### Fase 3: Embedded Signup (2 semanas)

1. App Meta con permisos whatsapp_business_management, whatsapp_business_messaging
2. Facebook Login SDK en panel de administración
3. Flujo "Conectar WhatsApp" en UI
4. Guardar WABA ID y Phone Number ID al completar registro
5. Instrucciones paso a paso para el dueño (ver 4.3)

### Fase 4: Clientes y Tools (1 semana)

1. Context resolver para customers (phone → customer_id)
2. Tools seguras: getAppointmentStatus, getQuoteStatus, getOrderStatus
3. Prompts adaptados para tono cliente

### Fase 5: Automatizaciones (2 semanas)

1. Recordatorios de cita (integrar con cron existente)
2. Envío de presupuesto por WhatsApp
3. "Tu orden está lista" por WhatsApp

### Fase 6: Mejoras (continuo)

1. Botones de respuesta rápida
2. Listas de opciones
3. Plantillas para mensajes fuera de 24h
4. Métricas de uso por canal

---

## 9. Variables de Entorno

```env
# WhatsApp Business (Meta Cloud API)
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=  # String secreto para verificación GET
WHATSAPP_APP_SECRET=    # Para X-Hub-Signature-256 (OBLIGATORIO en prod)
```

### 9.1 Configuración Inicial (Webhook B2C)

Para que el webhook resuelva `phone_number_id` → `organization_id`, inserta un registro en `whatsapp_phone_numbers`:

```sql
INSERT INTO public.whatsapp_phone_numbers (
  organization_id,
  phone_number_id,
  waba_id,
  display_phone_number
) VALUES (
  'uuid-de-tu-organizacion',
  'TU_WHATSAPP_PHONE_NUMBER_ID',
  'TU_WHATSAPP_BUSINESS_ACCOUNT_ID',
  '+56912345678'
);
```

Con el número oficial de Opttius (Fase 1-2), usa el mismo `phone_number_id` y `waba_id` de las variables de entorno.

---

## 10. Referencias

- Skill: `.cursor/skills/whatsapp-ai-agent-optical/SKILL.md`
- AI System: `docs/AI_SYSTEM.md`
- AI Skill: `.cursor/skills/ai-optical-supabase/SKILL.md`
- Meta Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
- Appointments: `docs/` (sistema de citas)
- Emails: `docs/` (plantillas de notificación)
