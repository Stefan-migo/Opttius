# Capacidades del Agente IA en WhatsApp

**Versión:** 1.0  
**Fecha:** 2026-02-23

---

## 1. Resumen ejecutivo

El agente IA de Opttius opera por WhatsApp con **dos perfiles** según quién escribe:

| Rol         | Identificación                                           | Herramientas                              | Autonomía |
| ----------- | -------------------------------------------------------- | ----------------------------------------- | --------- |
| **Admin**   | `wa_id` coincide con `profiles.phone` de un admin activo | Todas las tools del sistema               | Alta      |
| **Cliente** | `wa_id` coincide con `customers.phone` de la óptica      | 4 tools seguras (consulta + confirmación) | Media     |

---

## 2. Identificación de usuarios

El **Context Resolver** (`src/lib/whatsapp/context-resolver.ts`) determina el rol:

1. **phone_number_id** → tabla `whatsapp_phone_numbers` → `organization_id`
2. **wa_id** (teléfono del remitente) se compara con:
   - `customers.phone` (organización) → **Cliente**
   - `profiles.phone` + `admin_users` (organización) → **Admin**
3. Si no coincide con ninguno → se trata como **Cliente anónimo** (sin `customerId`; tools limitadas)

**Normalización E.164:** Chile 9 dígitos (ej. 912345678) se normaliza a 56912345678 para comparación.

---

## 3. Herramientas por rol

### 3.1 Cliente (4 tools)

| Tool                   | Descripción                                     | Acción   |
| ---------------------- | ----------------------------------------------- | -------- |
| `getAppointmentStatus` | Citas próximas del cliente                      | Consulta |
| `getQuoteStatus`       | Presupuestos del cliente                        | Consulta |
| `getOrderStatus`       | Órdenes de trabajo (lentes) del cliente         | Consulta |
| `confirmAppointment`   | Confirma una cita (solo si el cliente es dueño) | Acción   |

**Validación de ownership:** Todas las tools validan que `context.customerId` coincida con el recurso solicitado. Si no, devuelven error de permisos.

### 3.2 Admin (todas las tools)

El admin tiene acceso al mismo conjunto de herramientas que el chat web:

- **Productos:** getProducts, categorías
- **Clientes:** getCustomers, búsqueda
- **Órdenes:** getOrders, work orders
- **Analytics:** métricas, tendencias
- **Soporte:** tickets, diagnósticos
- **Inventario:** stock bajo, optimización
- **Recomendaciones:** sugerencias de negocio
- **Importación:** bulk
- **Customer WhatsApp:** getAppointmentStatus, getQuoteStatus, getOrderStatus, confirmAppointment

---

## 4. Acciones que puede realizar el agente

### 4.1 Como cliente

| Acción                               | Tool                 | Autonomía           |
| ------------------------------------ | -------------------- | ------------------- |
| Consultar próximas citas             | getAppointmentStatus | Total               |
| Consultar presupuestos               | getQuoteStatus       | Total               |
| Consultar estado de órdenes (lentes) | getOrderStatus       | Total               |
| Confirmar una cita                   | confirmAppointment   | Total (si es dueño) |
| Preguntas generales                  | Knowledge base + LLM | Total               |
| Solicitar contacto humano            | Respuesta guiada     | Total               |

### 4.2 Como admin

| Acción                               | Herramientas                    | Autonomía |
| ------------------------------------ | ------------------------------- | --------- |
| Consultar productos, stock, clientes | getProducts, getCustomers, etc. | Total     |
| Analizar métricas y tendencias       | analyticsTools                  | Total     |
| Diagnosticar problemas del sistema   | diagnoseSystem                  | Total     |
| Generar recomendaciones              | recommendationTools             | Total     |
| Soporte técnico (tickets, FAQs)      | supportTools + knowledge base   | Total     |

---

## 5. Autonomía del agente

### 5.1 Nivel de autonomía

| Aspecto                   | Cliente                                 | Admin                                                                |
| ------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| **Consultas**             | Totalmente autónomo                     | Totalmente autónomo                                                  |
| **Confirmación de cita**  | Autónomo (valida ownership)             | N/A                                                                  |
| **Modificación de datos** | Ninguna (solo lectura + confirmar cita) | Todas las tools de consulta; las destructivas requieren confirmación |
| **Respuestas sin tool**   | Knowledge base + LLM                    | Knowledge base + LLM                                                 |
| **Desconocido**           | "Contacta a la sucursal"                | Respuesta basada en contexto                                         |

### 5.2 Limitaciones

- **Cliente sin `customerId`:** No puede usar getAppointmentStatus, getQuoteStatus, getOrderStatus ni confirmAppointment. El agente indica que contacte a la sucursal para vincular su número.
- **Sin streaming:** WhatsApp no soporta streaming; la respuesta se envía completa.
- **Límite 4096 caracteres** por mensaje.
- **Ventana 24h:** Mensajes fuera de ventana requieren plantillas aprobadas por Meta.

---

## 6. Flujo de mensaje

```
1. Usuario envía mensaje por WhatsApp
2. Meta → POST /api/webhooks/whatsapp
3. Verificación firma X-Hub-Signature-256
4. Context Resolver: wa_id + phone_number_id → organization_id, role, customerId
5. Session Manager: getOrCreateWhatsAppSession(wa_id, org_id)
6. WhatsApp Adapter: createAgent() con context (whatsapp / whatsapp_customer)
7. Agent.chat(userMessage) — no streaming
8. WhatsApp Client envía respuesta a Meta
9. Persistencia en chat_messages
```

---

## 7. Configuración necesaria

| Variable                   | Uso                                                 |
| -------------------------- | --------------------------------------------------- |
| `WHATSAPP_ACCESS_TOKEN`    | Envío de mensajes (número oficial Opttius para B2B) |
| `WHATSAPP_PHONE_NUMBER_ID` | Número por defecto                                  |
| `WHATSAPP_VERIFY_TOKEN`    | Verificación GET del webhook                        |
| `WHATSAPP_APP_SECRET`      | Validación firma POST                               |
| `NEXT_PUBLIC_META_APP_ID`  | Embedded Signup (opcional)                          |
| `META_APP_SECRET`          | Intercambio OAuth (opcional)                        |

Cada óptica conecta su número en `/admin/system` (tab WhatsApp) vía Embedded Signup o formulario manual. Los mensajes B2C usan el `phone_number_id` de esa óptica.
