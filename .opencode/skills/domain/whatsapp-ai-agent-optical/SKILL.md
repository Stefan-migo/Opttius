---
name: whatsapp-ai-agent-optical
description: Expert guide for building and maintaining the WhatsApp integration module with the AI Agent for optical shops. Use when working on WhatsApp Business API, mensajería por WhatsApp, agente IA por WhatsApp, webhooks WhatsApp, Embedded Signup, integración dual B2B/B2C, recordatorios WhatsApp, o flujos conversacionales ópticos vía WhatsApp. Covers Cloud API, multi-tenant architecture, Agent reuse, tool calling, costos Meta 2026, and optical-specific messaging patterns.
---

# Módulo WhatsApp + Agente IA para Ópticas

Guía para desarrollar el módulo de manejo de WhatsApp integrado con el Agente IA de Opttius. Incluye **integración dual**: (A) SaaS → dueño de óptica, (B) Óptica → sus clientes.

## Cuándo Usar Este Skill

- Integración WhatsApp Business API / Cloud API
- **Integración A (B2B):** Notificaciones del SaaS al dueño (inventario, citas, caja)
- **Integración B (B2C):** Óptica → clientes; Embedded Signup (cada óptica su número)
- Agente IA respondiendo por WhatsApp
- Recordatorios, confirmaciones, envío de presupuestos
- Webhooks, costos Meta, plantillas aprobadas

## Principios de Diseño

### 1. Reutilizar el Agente Existente

**NO crear un agente paralelo.** El módulo WhatsApp debe:

- Usar el mismo `Agent` de `src/lib/ai/agent/core.ts`
- Usar el mismo `ToolExecutor` y las mismas herramientas
- Usar el mismo `getAgentConfig()` y system prompts
- Respetar `ToolExecutionContext` (organizationId, currentBranchId, userId)

**Diferencias de canal:**

- **Chat web:** Usuario autenticado (admin), sesión en `chat_sessions`, streaming SSE
- **WhatsApp:** Cliente (o admin) por teléfono, sesión por `wa_id` + `organization_id`, respuestas síncronas (no streaming)

### 2. Código Limpio y Lógica Sencilla

- **Un solo punto de entrada:** Webhook `POST /api/webhooks/whatsapp` recibe todos los eventos
- **Despacho por tipo:** `messages`, `status`, `errors` → handlers separados
- **Identificación de contexto:** `wa_id` → customer o admin_user → organization_id, branch_id
- **Sin duplicación:** Lógica de negocio en servicios, no en el webhook

### 3. Integración Dual

- **A (B2B):** Opttius → dueño. Número oficial Opttius. Plantillas. Opttius paga Meta.
- **B (B2C):** Óptica → clientes. Embedded Signup. Cada óptica su número. Óptica paga Meta directamente.

### 4. Arquitectura B2C

- Webhook recibe `metadata.phone_number_id` → mapear a `organization_id` (tabla `whatsapp_phone_numbers`)
- Context resolver: `wa_id` + `phone_number_id` → customer/admin, organization_id, branch_id

## Estructura de Archivos Recomendada

| Ruta                                     | Propósito                                                    |
| ---------------------------------------- | ------------------------------------------------------------ |
| `src/lib/whatsapp/client.ts`             | Cliente para enviar mensajes (Cloud API)                     |
| `src/lib/whatsapp/webhook-handler.ts`    | Parseo y despacho de eventos                                 |
| `src/lib/whatsapp/session-manager.ts`    | Sesiones WhatsApp (wa_id + org_id) → chat_sessions           |
| `src/lib/whatsapp/context-resolver.ts`   | wa_id → customer/admin_user → organization_id, branch_id     |
| `src/app/api/webhooks/whatsapp/route.ts` | Webhook público (verificación + POST)                        |
| `src/lib/ai/agent/whatsapp-adapter.ts`   | Adaptador: mensaje WhatsApp → Agent.chat() → texto respuesta |

## Reglas Críticas

### 1. Multi-Tenancy y Seguridad

- **organization_id:** Resolver SIEMPRE desde el número de teléfono o metadata del webhook
- **RLS:** Todas las consultas deben usar `organization_id` del contexto
- **Webhook verification:** Implementar `GET` con `hub.mode`, `hub.verify_token`, `hub.challenge` (Meta)
- **Firma de verificación:** Validar `X-Hub-Signature-256` en POST para autenticidad

### 2. Identificación del Usuario

- **wa_id:** Identificador único de WhatsApp por usuario
- **Mapeo:** `whatsapp_contacts` o `customers.phone` normalizado → customer_id
- **Admin por WhatsApp:** Si el número coincide con `admin_users` o `profiles`, tratar como admin (acceso a tools)
- **Cliente:** Si no es admin, modo limitado: consultas de cita, presupuesto, estado de orden

### 3. Sesiones y Memoria

- **chat_sessions:** Crear sesión por `(wa_id, organization_id)` con metadata `{ channel: "whatsapp" }`
- **Persistencia:** Mismos `chat_messages` que el chat web
- **Límite de contexto:** WhatsApp tiene límite de mensajes; considerar ventana de 20–50 mensajes

### 5. Costos (2026)

- **Meta Servicio:** Gratis si cliente escribe y respondes en 24h
- **Meta Utilidad:** ~$0.001–0.015 USD/msg
- **Embedded Signup:** Óptica paga Meta directamente; Opttius no asume costos de mensajes

### 6. Rate Limits y Throughput

- **Cloud API:** 80 mensajes/segundo por defecto; hasta 400 MPS con aprobación
- **Cola:** Si hay alto volumen, usar cola (Bull, Inngest) para enviar respuestas
- **24h window:** Mensajes fuera de ventana de 24h requieren plantilla aprobada

### 7. Herramientas del Agente en WhatsApp

- **Admin:** Todas las tools (getProducts, getCustomers, etc.)
- **Cliente:** Subconjunto seguro: `getAppointmentStatus`, `getQuoteStatus`, `getOrderStatus`
- **Confirmación destructiva:** En WhatsApp no hay UI; usar respuestas de confirmación ("¿Confirmar? Responde SÍ o NO")

### 8. Embedded Signup (Integración B)

- Permisos: `whatsapp_business_management`, `whatsapp_business_messaging`
- Facebook Login SDK en panel de administración
- Instrucciones para dueño: Conectar con Facebook → Business Manager → Perfil WhatsApp → Verificar número → Configurar pago en Meta
- Número limpio: sin WhatsApp activo (o borrar antes)

### 9. Formato de Mensajes

- **Texto:** Máximo 4096 caracteres por mensaje
- **Plantillas:** Para mensajes business-initiated (fuera de 24h)
- **Botones/Listas:** Usar cuando mejore UX (ej. "Ver citas", "Confirmar cita")
- **Emojis:** Usar con moderación, tono profesional óptico

## Flujo de Mensaje Entrante

1. **Webhook recibe** `POST` con payload de Meta
2. **Verificar firma** `X-Hub-Signature-256`
3. **Extraer** `entry[].changes[].value.messages[]`
4. **Por cada mensaje:**
   - `from` (wa_id), `text.body`, `type`
   - Resolver: ¿Es admin o cliente? → organization_id, branch_id
   - Obtener o crear sesión WhatsApp
   - Llamar `Agent.chat(userMessage)` (no streaming; respuesta completa)
   - Enviar respuesta vía Cloud API
   - Persistir mensaje usuario y asistente en `chat_messages`

## Variables de Entorno

```env
# WhatsApp Business (Meta Cloud API)
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=  # Para verificación del webhook
```

## Integración con Módulos Existentes

| Módulo           | Integración                                         |
| ---------------- | --------------------------------------------------- |
| **Appointments** | Recordatorios 24h/2h; confirmación por WhatsApp     |
| **Quotes**       | Envío de presupuesto por WhatsApp; link para ver    |
| **Work Orders**  | "Tu orden está lista" por WhatsApp                  |
| **Customers**    | `preferred_contact_method: "whatsapp"` ya existe    |
| **Emails**       | Plantillas similares; considerar templates WhatsApp |

## Mejores Prácticas

1. **Idempotencia:** Mismo mensaje duplicado (retry) no debe generar doble respuesta
2. **Timeout:** Respuesta del agente < 15s; si tarda, enviar "Procesando..." y luego respuesta
3. **Errores:** Mensaje amigable al usuario; log detallado en servidor
4. **Testing:** Usar sandbox de Meta; simular webhooks con payloads de prueba
5. **Logging:** `appLogger` para eventos; `logAdminActivity` para uso de tools por admin

## Referencias

- Documentación: `docs/WHATSAPP_AI_AGENT.md`
- Meta Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
- Skill AI: `.cursor/skills/ai-optical-supabase/SKILL.md`
- Sistema de IA: `docs/AI_SYSTEM.md`
