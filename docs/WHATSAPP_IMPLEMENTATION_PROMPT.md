# Prompt para Agente de Implementación — Módulo WhatsApp + Agente IA

**Uso:** Copia el contenido de la sección "Prompt" y pégalo al agente de IA que creará el plan de implementación.

---

## Prompt

Eres un ingeniero de software experto. Tu tarea es crear un **plan de implementación detallado** para integrar el módulo de WhatsApp con el Agente IA en el proyecto Opttius (SaaS de gestión de ópticas con Supabase y Next.js).

### Paso 1: Recolectar contexto con NotebookLM

Antes de crear el plan, **debes** usar `notebooklm-cli` (comando `nlm`) para recopilar información del proyecto:

```bash
# Verificar sesión (requiere nlm login si ha expirado)
nlm login --check

# Cuaderno principal (Cerebro) - arquitectura y flujos
nlm notebook query e071bebc-ce79-4b32-a040-61a6a9c331a3 "Describe la arquitectura del módulo de IA: Agent, ToolExecutor, herramientas, flujo de chat, memoria organizacional y cómo se integra con el sistema de ópticas."

# Cuaderno extendido - documentación WhatsApp e implementación
nlm notebook query 17302d9d-7d70-4c8d-a774-49fbfca3c09d "Resume la documentación del módulo WhatsApp + Agente IA: integración dual B2B/B2C, Embedded Signup, webhook, context resolver, roadmap de implementación."
```

**IDs de cuadernos:**

- Cerebro (principal): `e071bebc-ce79-4b32-a040-61a6a9c331a3`
- Extendido: `17302d9d-7d70-4c8d-a774-49fbfca3c09d`

### Paso 2: Leer documentación y skills

Consulta estos archivos del repositorio (en este orden):

1. **Sistema de IA:** `docs/AI_SYSTEM.md` — arquitectura del Agent, tools, insights
2. **Skill AI:** `.cursor/skills/ai-optical-supabase/SKILL.md` — reglas críticas, multi-tenancy
3. **Módulo WhatsApp:** `docs/WHATSAPP_AI_AGENT.md` — integración dual, Embedded Signup, webhook, roadmap
4. **Skill WhatsApp:** `.cursor/skills/whatsapp-ai-agent-optical/SKILL.md` — reglas de implementación
5. **Entrenamiento del agente:** `docs/WHATSAPP_AGENT_TRAINING.md` — prompts WhatsApp, tono, tools por rol
6. **Skill entrenamiento:** `.cursor/skills/whatsapp-agent-training-optical/SKILL.md` — mejores prácticas

### Paso 3: Principios que debes seguir

- **Mismo Agent:** Reutilizar `src/lib/ai/agent/core.ts`. NO crear un agente paralelo.
- **Config por canal:** Añadir `context: "whatsapp"` y `"whatsapp_customer"` en `getAgentConfig()`.
- **Integración dual:** (A) Opttius → dueño de óptica; (B) Óptica → sus clientes (Embedded Signup).
- **Clean architecture:** Separación de responsabilidades; prompts externalizados en `config.ts`.
- **Single-tool, single-responsibility:** Tools con Zod, outputs `{ success, data, error }`.
- **Multi-tenancy:** Siempre `organization_id`; RLS; `phone_number_id` → `organization_id`.

### Paso 4: Entregable

Genera un **plan de implementación** que incluya:

1. **Fases** con orden de ejecución (Fase 1, 2, 3...)
2. **Tareas concretas** por fase, con archivos a crear/modificar
3. **Dependencias** entre tareas (qué debe existir antes)
4. **Migraciones de base de datos** necesarias (ej. `whatsapp_phone_numbers`, `metadata` en `chat_sessions`)
5. **Variables de entorno** a configurar
6. **Criterios de aceptación** por fase
7. **Riesgos o consideraciones** (ej. verificación de firma Meta, rate limits)

El plan debe ser ejecutable por un desarrollador que siga las tareas en orden. Incluye rutas de archivos, nombres de funciones y referencias a la documentación existente.

### Paso 5: Evitar

- No duplicar documentación en NotebookLM. Si actualizas fuentes, elimina las antiguas antes de añadir (`nlm source delete <id> --confirm`).
- No crear un agente IA paralelo para WhatsApp.
- No hardcodear prompts en el adapter; usar `config.ts`.
- No omitir la verificación de firma `X-Hub-Signature-256` en el webhook.

---

## Referencias rápidas

| Recurso                | Ruta                                     |
| ---------------------- | ---------------------------------------- |
| Agent core             | `src/lib/ai/agent/core.ts`               |
| Config prompts         | `src/lib/ai/agent/config.ts`             |
| ToolExecutor           | `src/lib/ai/agent/tool-executor.ts`      |
| Tools                  | `src/lib/ai/tools/`                      |
| Memoria organizacional | `src/lib/ai/memory/organizational.ts`    |
| Chat API               | `src/app/api/admin/chat/route.ts`        |
| Webhook (a crear)      | `src/app/api/webhooks/whatsapp/route.ts` |
