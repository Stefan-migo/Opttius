# Entrenamiento del Agente IA para WhatsApp — Guía Detallada

**Versión:** 1.0  
**Fecha:** 2026-02-23  
**Skill asociado:** `.cursor/skills/whatsapp-agent-training-optical/SKILL.md`

---

## 1. Introducción

Esta guía explica cómo **entrenar y especializar** el Agente IA de Opttius para el canal WhatsApp. El agente es el mismo que opera en el chat web del panel de administración; la diferencia está en la **configuración por canal** (prompts, tono, herramientas disponibles) y en las **mejores prácticas** de diseño conversacional para mensajería.

### 1.1 Objetivos

- Respuestas cortas y claras (adaptadas a móvil)
- Tono cercano pero profesional
- Uso correcto de tools según rol (admin vs cliente)
- Mejora continua basada en feedback y conversaciones

### 1.2 Contexto del Proyecto

- **Agente:** `src/lib/ai/agent/core.ts` — reutilizado para web y WhatsApp
- **Config:** `src/lib/ai/agent/config.ts` — system prompts por contexto
- **Memoria:** `OrganizationalMemory`, `loadSessionHistory`, `loadOrganizationalContext`
- **Knowledge base:** RAG para documentación del sistema

---

## 2. Enfoque de Entrenamiento: Prompt Engineering vs Fine-tuning

### 2.1 Recomendación: Empezar con Prompts

| Enfoque                | Cuándo usar                           | Esfuerzo                         |
| ---------------------- | ------------------------------------- | -------------------------------- |
| **Prompt engineering** | Siempre primero                       | Bajo; iterativo                  |
| **Fine-tuning**        | Patrones que los prompts no resuelven | Alto; requiere datos etiquetados |

Para Opttius, el entrenamiento se centra en:

1. **Prompt design** — system prompts adaptados por canal (web, whatsapp, whatsapp_customer)
2. **Organizational memory** — contexto dinámico de la óptica (nombre, productos, métricas)
3. **Knowledge base** — documentación indexada para RAG
4. **Tool design** — herramientas con responsabilidad única y outputs estructurados

### 2.2 Fuentes de Datos para el Agente

| Fuente                | Ubicación                  | Uso                            |
| --------------------- | -------------------------- | ------------------------------ |
| System prompts        | `agent/config.ts`          | Personalidad, reglas, ejemplos |
| Organizational memory | `memory/organizational.ts` | Óptica, productos, métricas    |
| Knowledge base        | `knowledge/`               | Procedimientos, módulos, FAQs  |
| EXPERT_KNOWLEDGE      | `knowledge/knowledge.ts`   | Lentes, email, flujos          |
| Chat history          | `chat_messages`            | Continuidad de conversación    |

---

## 3. Mejores Prácticas de Diseño Conversacional (WhatsApp)

### 3.1 Principios Generales

| Principio                  | Descripción                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| **Brevedad**               | 1–3 oraciones cuando sea posible; máx. ~300 caracteres por mensaje    |
| **Un tema por mensaje**    | Evitar mezclar varios temas; dividir en varios mensajes si hace falta |
| **Lenguaje llano**         | Evitar jerga técnica salvo que el usuario la use                      |
| **Identidad transparente** | "Soy el asistente de [Óptica]"; no fingir ser humano                  |
| **Siguiente paso claro**   | "Responde CONFIRMAR para confirmar" o "Escribe 1–5 para valorar"      |
| **Empatía**                | Pequeñas muestras de cortesía ("Gracias por escribir", "Con gusto")   |

### 3.2 Contraintuitivo pero Efectivo

- **Calidad > velocidad:** Mejor una respuesta correcta en 3s que una incorrecta en 1s
- **Preguntar más:** Si falta contexto, preguntar antes de asumir
- **Micro-pasos:** Dividir flujos complejos en pasos pequeños (ej. confirmar cita → luego horario)

### 3.3 Restricciones Técnicas WhatsApp

- **Máx. 4096 caracteres** por mensaje de texto
- **Sin markdown** en texto plano (emojis sí, con moderación)
- **Sin streaming** — respuesta completa antes de enviar

---

## 4. Arquitectura de Prompts para WhatsApp

### 4.1 Estructura de Capas

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA 1: Base óptico (optic_expert)                         │
│  - Terminología, materiales, flujos, tools                   │
└─────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────┐
│  CAPA 2: Canal WhatsApp                                      │
│  - Brevedad, tono, formato, ejemplos WhatsApp                │
└─────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────┐
│  CAPA 3: Rol (admin vs cliente)                              │
│  - Admin: más tools, tecnicismos                             │
│  - Cliente: subconjunto tools, lenguaje sencillo              │
└─────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────┐
│  CAPA 4: Contexto dinámico (loadOrganizationalContext)       │
│  - Nombre óptica, productos, métricas, sucursal              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Contenido Sugerido para SYSTEM_PROMPTS.whatsapp

```ts
whatsapp: `Eres el asistente de [NOMBRE_OPTICA] respondiendo por WhatsApp.

CANAL WHATSAPP:
- Responde en 1-3 oraciones cuando sea posible.
- Máximo ~300 caracteres por mensaje; divide en varios si hace falta.
- Tono cercano pero profesional.
- Sin listas largas; usa viñetas solo si son ≤5 ítems.
- Identidad transparente: "Soy el asistente de [Óptica]".
- Si no sabes algo, indica que contacte a la sucursal.

HERRAMIENTAS: Usa las mismas que en el chat web (getProducts, getCustomers, etc.).
Usa siempre datos actualizados antes de responder.`,
```

### 4.3 Contenido Sugerido para SYSTEM_PROMPTS.whatsapp_customer

```ts
whatsapp_customer: `Eres el asistente de [NOMBRE_OPTICA] respondiendo a un paciente/cliente por WhatsApp.

CANAL WHATSAPP - CLIENTE:
- Respuestas cortas (1-3 oraciones).
- Lenguaje sencillo; evita dioptrías sin contexto.
- Solo herramientas: getAppointmentStatus, getQuoteStatus, getOrderStatus.
- Si pide confirmar cita: "Responde CONFIRMAR para confirmar."
- Si no encuentras al cliente: pide que contacte a la sucursal.
- Tono amable y profesional.`,
```

---

## 5. Implementación en Opttius

### 5.1 Añadir Prompts en config.ts

```ts
// src/lib/ai/agent/config.ts

export const SYSTEM_PROMPTS = {
  // ... existentes ...
  whatsapp: `...`, // Admin por WhatsApp
  whatsapp_customer: `...`, // Cliente por WhatsApp
};
```

### 5.2 Uso en el WhatsApp Adapter

```ts
// En whatsapp-adapter.ts o similar
const context = context.role === "admin" ? "whatsapp" : "whatsapp_customer";
const agent = await createAgent({
  context,
  organizationId,
  currentBranchId,
  sessionId,
  config: {
    enabledTools: context.role === "admin" ? undefined : CUSTOMER_SAFE_TOOLS,
  },
});
```

### 5.3 Tools para Clientes (CUSTOMER_SAFE_TOOLS)

- `getAppointmentStatus` — estado de citas del cliente
- `getQuoteStatus` — estado de presupuestos
- `getOrderStatus` — estado de órdenes (lab_work_orders)

Estas tools deben validar que el solicitante sea el dueño del recurso (por `customer_id` o `wa_id`).

### 5.4 Memoria y Session

- **loadSessionHistory(sessionId):** Misma sesión por `(wa_id, organization_id)`
- **loadOrganizationalContext():** Mismo contexto que en web
- **Knowledge base:** RAG activo si `enableKnowledgeBase: true`; considerar reducir contexto para WhatsApp (menos tokens)

---

## 6. Proceso de Mejora Continua

### 6.1 Ciclo de Iteración

```ts
1. Desplegar prompts actualizados
2. Recolectar conversaciones (chat_messages con metadata.channel = "whatsapp")
3. Analizar: respuestas demasiado largas, errores, herramientas no usadas
4. Ajustar prompts según patrones
5. Repetir
```

### 6.2 Métricas a Monitorear

| Métrica                     | Objetivo                       |
| --------------------------- | ------------------------------ |
| Longitud media de respuesta | < 200 caracteres (cliente)     |
| Tasa de uso de tools        | Cuando la pregunta lo requiere |
| Feedback score              | > 3.5/5                        |

### 6.3 Feedback Cualitativo

- Permitir "👍" / "👎" o puntuación 1–5 tras cada respuesta
- Opción de comentario libre para casos problemáticos
- Usar para refinar ejemplos en el prompt

---

## 7. Clean Architecture

### 7.1 Separación de Responsabilidades

| Capa                     | Responsabilidad                                   |
| ------------------------ | ------------------------------------------------- |
| **Agent (core.ts)**      | Orquestación, tool calling, streaming/chat        |
| **config.ts**            | Prompts por contexto; sin lógica de negocio       |
| **ToolExecutor**         | Ejecución de tools; validación de params          |
| **WhatsApp adapter**     | Canal: parsear mensaje → Agent → enviar respuesta |
| **OrganizationalMemory** | Contexto de la óptica                             |
| **Knowledge base**       | RAG                                               |

### 7.2 Single-Tool, Single-Responsibility

- Cada tool hace una cosa clara
- Inputs validados con Zod
- Outputs: `{ success, data, error, message }`
- Tools idempotentes cuando sea posible (ej. consultas)

### 7.3 Externalización de Prompts

- Prompts en `config.ts` o archivos dedicados
- Variables: `[NOMBRE_OPTICA]`, `[SUCURSAL]`
- No hardcodear en adapters ni en core

---

## 8. Referencias

- Skill: `.cursor/skills/whatsapp-agent-training-optical/SKILL.md`
- Módulo WhatsApp: `docs/WHATSAPP_AI_AGENT.md`
- Skill WhatsApp: `.cursor/skills/whatsapp-ai-agent-optical/SKILL.md`
- Agent config: `src/lib/ai/agent/config.ts`
- AI System: `docs/AI_SYSTEM.md`
- OpenAI: [A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
- Clean Agentic Architecture: [Bedir Tapkan](https://bedirtapkan.com/posts/blog_posts/clean_agentic_architecture/)
