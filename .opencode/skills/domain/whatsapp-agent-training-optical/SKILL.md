---
name: whatsapp-agent-training-optical
description: Expert guide for training the AI agent specifically for WhatsApp in Opttius optical shop SaaS. Use when working on entrenamiento de agente WhatsApp, prompts WhatsApp, adaptación de canal, system prompts para mensajería, tono conversacional óptico, o mejora continua del agente por canal. Covers prompt engineering, organizational memory, knowledge base, tool design, and channel-specific best practices.
---

# Entrenamiento del Agente IA para WhatsApp — Skill Óptico

Guía para entrenar y especializar el Agente IA de Opttius para el canal WhatsApp, manteniendo el mismo core y añadiendo adaptaciones de canal.

## Cuándo Usar Este Skill

- Entrenar el agente para responder por WhatsApp
- Diseñar prompts específicos para mensajería (brevedad, tono)
- Adaptar el agente por canal (web vs WhatsApp)
- Mejorar respuestas con feedback de conversaciones
- Añadir conocimiento óptico al contexto WhatsApp
- Configurar tools y memoria para clientes por WhatsApp

## Principios de Entrenamiento

### 1. Mismo Agente, Configuración por Canal

**NO crear un agente paralelo.** Usar el mismo `Agent` (`src/lib/ai/agent/core.ts`) con:

- `config.systemPrompt` adaptado para WhatsApp
- `context: "whatsapp"` o `"whatsapp_customer"` en `getAgentConfig()`
- Mismas tools, memoria organizacional y knowledge base

### 2. Prompt Engineering > Fine-tuning (para empezar)

- **Prioridad:** Prompts bien diseñados, externalizados en `agent/config.ts`
- **Fine-tuning:** Solo si hay patrones recurrentes que los prompts no resuelven
- **Iterativo:** Probar → medir feedback → ajustar prompts → repetir

### 3. Single-Tool, Single-Responsibility

- Cada tool hace una cosa clara
- Inputs validados con Zod
- Outputs estructurados `{ success, data, error, message }`
- Tools para clientes: subconjunto seguro (getAppointmentStatus, getQuoteStatus, getOrderStatus)

### 4. WhatsApp-Específico: Brevedad y Claridad

- **Máx. ~300 caracteres** por mensaje cuando sea posible (móvil)
- **Un tema por mensaje**; dividir en varios si hace falta
- **Lenguaje llano**; evitar jerga técnica salvo que el cliente la use
- **Identidad transparente:** "Soy el asistente de [Óptica]"
- **Siguiente paso claro:** "Responde CONFIRMAR para confirmar tu cita"

## Fuentes de Entrenamiento en Opttius

| Fuente                     | Ubicación                             | Uso para WhatsApp                                          |
| -------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| **System prompts**         | `src/lib/ai/agent/config.ts`          | Añadir `whatsapp`, `whatsapp_customer`                     |
| **Memoria organizacional** | `src/lib/ai/memory/organizational.ts` | loadOrganizationalContext() — mismo para todos los canales |
| **Knowledge base**         | `src/lib/ai/knowledge/`               | RAG; inyectar contexto relevante                           |
| **EXPERT_KNOWLEDGE**       | `src/lib/ai/knowledge/knowledge.ts`   | Lentes, email; incluir en prompt base                      |
| **Historial de chat**      | `chat_messages`                       | loadSessionHistory(); continuidad por wa_id + org_id       |
| **Tools**                  | `src/lib/ai/tools/`                   | Habilitar subconjunto para clientes                        |

## Estructura de Prompts WhatsApp

### Base (optic_expert) + Overlay WhatsApp

```
[Base: Experto Óptico]
+
[Canal WhatsApp:]
- Responde en 1-3 oraciones cuando sea posible
- Sin listas largas; usa viñetas solo si son ≤5 ítems
- Tono cercano pero profesional
- Si el cliente es paciente: lenguaje sencillo, evita dioptrías sin contexto
- Si es admin: puede usar más tecnicismos
```

### Ejemplos de Comportamiento WhatsApp

| Usuario (cliente)       | Respuesta correcta                                                               | Incorrecta                                                                        |
| ----------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| "¿Cuándo es mi cita?"   | "Tu próxima cita es el 25 de feb a las 10:00 en la sucursal Centro. ¿Confirmas?" | Párrafo largo con historia de citas                                               |
| "Confirmo"              | "Listo, tu cita está confirmada. Te esperamos."                                  | "Perfecto. Tu cita ha sido confirmada exitosamente. Recibirás un recordatorio..." |
| "¿Mi orden está lista?" | "Sí, tu orden está lista. Puedes retirarla en [sucursal]."                       | Explicación técnica del estado                                                    |

## Reglas de Implementación

### 1. Externalizar Prompts

- Prompts en `config.ts` o archivos separados por canal
- No hardcodear en el adapter
- Usar variables: `[NOMBRE_OPTICA]`, `[SUCURSAL]`

### 2. Contexto por Rol

- **Admin por WhatsApp:** `context: "whatsapp"` → prompt similar a optic_expert, más breve
- **Cliente:** `context: "whatsapp_customer"` → prompt simplificado, sin tools destructivas

### 3. Feedback y Mejora

- Registrar `feedback_score` en `ai_insights` o tabla de feedback WhatsApp
- Usar historial de chat para detectar patrones de fallo
- Ajustar prompts según feedback cualitativo

### 4. Observabilidad

- **logAdminActivity** para tool calls
- **appLogger** para errores y latencia
- Trazabilidad: session_id, wa_id, organization_id en logs

## Integración con el Proyecto

- **Agent:** `createAgent({ context: "whatsapp" | "whatsapp_customer", ... })`
- **Config:** Añadir `SYSTEM_PROMPTS.whatsapp` y `SYSTEM_PROMPTS.whatsapp_customer` en `config.ts`
- **Adapter:** `src/lib/ai/agent/whatsapp-adapter.ts` usa `getAgentConfig("whatsapp")` según rol

## Referencias

- Documentación: `docs/WHATSAPP_AGENT_TRAINING.md`
- Módulo WhatsApp: `docs/WHATSAPP_AI_AGENT.md`
- Skill WhatsApp: `.cursor/skills/whatsapp-ai-agent-optical/SKILL.md`
- Agent config: `src/lib/ai/agent/config.ts`
