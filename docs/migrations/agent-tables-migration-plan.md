# Plan de Migración: Tablas de Agente Legacy → Nuevas

**Contexto**: El módulo `agent-harness` reemplazó el chat legacy (`/api/admin/chat`) con el nuevo endpoint `/api/agent/chat`. Las tablas legacy `chat_sessions` y `chat_messages` deben migrarse a `agent_conversations` y `agent_messages` respectivamente en el próximo hito `database-reformation`.

---

## Column Mapping

### chat_sessions → agent_conversations

| chat_sessions          | agent_conversations    | Notas                          |
| ---------------------- | ---------------------- | ------------------------------ |
| `id`                   | `id`                   | UUID, sin cambio               |
| `organization_id`      | `organization_id`      | FK → organizations, sin cambio |
| `user_id`              | `user_id`              | FK → auth.users, sin cambio    |
| `title`                | `title`                | Texto, sin cambio              |
| `model`                | → `llm_model`          | Renombrado para claridad       |
| `provider`             | → `llm_provider`       | Renombrado para claridad       |
| `config`               | → `llm_config`         | Renombrado, JSON               |
| `last_message_preview` | `last_message_preview` | Texto, sin cambio              |
| `message_count`        | `message_count`        | Entero, sin cambio             |
| `metadata`             | `metadata`             | JSONB, sin cambio              |
| `created_at`           | `created_at`           | Timestamp, sin cambio          |
| `updated_at`           | `updated_at`           | Timestamp, sin cambio          |

### chat_messages → agent_messages

| chat_messages  | agent_messages      | Notas                                        |
| -------------- | ------------------- | -------------------------------------------- |
| `id`           | `id`                | UUID, sin cambio                             |
| `session_id`   | → `conversation_id` | Renombrado, FK → agent_conversations         |
| `role`         | `role`              | Enum: user/assistant/system/tool, sin cambio |
| `content`      | `content`           | Texto, sin cambio                            |
| `tool_calls`   | `tool_calls`        | JSONB, sin cambio                            |
| `tool_results` | `tool_results`      | JSONB, sin cambio                            |
| `metadata`     | `metadata`          | JSONB, incluye `token_count`                 |
| `created_at`   | `created_at`        | Timestamp, sin cambio                        |

---

## Referencias en la Codebase

Archivos que consumen `chat_sessions` o `chat_messages` (15 archivos, ~100+ puntos de referencia):

### Route Handlers (chat legacy)

| Archivo                                    | Tablas                       | Uso             |
| ------------------------------------------ | ---------------------------- | --------------- |
| `src/app/api/admin/chat/route.ts`          | chat_messages                | INSERT mensajes |
| `src/app/api/admin/chat/sessions/route.ts` | chat_sessions, chat_messages | CRUD sesiones   |
| `src/app/api/admin/chat/messages/route.ts` | chat_messages                | GET mensajes    |
| `src/app/api/admin/chat/history/route.ts`  | chat_sessions, chat_messages | GET historial   |

### WhatsApp (usa tablas legacy como store transitorio)

| Archivo                               | Tablas        | Uso                                 |
| ------------------------------------- | ------------- | ----------------------------------- |
| `src/lib/whatsapp/webhook-handler.ts` | chat_messages | INSERT mensajes entrantes/salientes |
| `src/lib/whatsapp/session-manager.ts` | chat_sessions | getOrCreateSession                  |

### SaaS Management (WhatsApp root views)

| Archivo                                                                                  | Tablas                       | Uso                     |
| ---------------------------------------------------------------------------------------- | ---------------------------- | ----------------------- |
| `src/app/api/admin/saas-management/whatsapp/conversations/route.ts`                      | chat_sessions                | GET listado             |
| `src/app/api/admin/saas-management/whatsapp/conversations/[sessionId]/messages/route.ts` | chat_sessions, chat_messages | GET mensajes por sesión |

### AI Agent Core

| Archivo                        | Tablas        | Uso                                   |
| ------------------------------ | ------------- | ------------------------------------- |
| `src/lib/ai/agent/core.ts`     | chat_messages | Carga historial para contexto         |
| `src/lib/ai/agent/session.ts`  | —             | Comentario referencia a chat_sessions |
| `src/lib/ai/tools/memory.ts`   | chat_sessions | UPDATE metadata                       |
| `src/lib/ai/memory/session.ts` | chat_messages | Carga historial                       |
| `src/lib/ai/memory/indexer.ts` | chat_messages | Indexación para búsqueda semántica    |

### Onboarding & Backup

| Archivo                                             | Tablas                       | Uso                        |
| --------------------------------------------------- | ---------------------------- | -------------------------- |
| `src/app/api/onboarding/activate-real-org/route.ts` | chat_sessions                | Creación de sesión inicial |
| `src/lib/backup-service.ts`                         | chat_sessions, chat_messages | Exportación de backup      |

### Types

| Archivo                 | Tablas                       | Uso                                                          |
| ----------------------- | ---------------------------- | ------------------------------------------------------------ |
| `src/types/supabase.ts` | chat_sessions, chat_messages | Tipos autogenerados (se regenera con `database-reformation`) |

---

## Estrategia de Migración de Datos

### Fase 1: Preparación (pre-deploy)

1. Crear tablas nuevas (`agent_conversations`, `agent_messages`) con schema optimizado
2. Agregar índices: `agent_messages.conversation_id`, `agent_conversations.organization_id`
3. No eliminar tablas legacy aún

### Fase 2: Migración de Datos

```sql
-- Migrar sesiones
INSERT INTO agent_conversations (id, organization_id, user_id, title, llm_model, llm_provider, llm_config, last_message_preview, message_count, metadata, created_at, updated_at)
SELECT id, organization_id, user_id, title, model, provider, config, last_message_preview, message_count, metadata, created_at, updated_at
FROM chat_sessions;

-- Migrar mensajes
INSERT INTO agent_messages (id, conversation_id, role, content, tool_calls, tool_results, metadata, created_at)
SELECT id, session_id, role, content, tool_calls, tool_results, metadata, created_at
FROM chat_messages;
```

### Fase 3: Migración de Referencias (por módulo)

1. Chat legacy routes → apuntar a tablas nuevas
2. WhatsApp routes → apuntar a tablas nuevas (requiere actualizar session-manager)
3. AI Agent core → apuntar a agent_conversations / agent_messages
4. Memory tools → apuntar a tablas nuevas
5. Backup service → actualizar table names
6. Regenerar `src/types/supabase.ts`

### Fase 4: Limpieza

1. Verificar que todas las queries apuntan a tablas nuevas
2. Ejecutar validación: `SELECT count(*) FROM agent_conversations` = `SELECT count(*) FROM chat_sessions`
3. Eliminar tablas legacy:

```sql
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
```

4. Eliminar archivos deprecados (SmartContextWidget, insight components, etc.)

---

## Rollback Plan

### Rollback Rápido (si la migración de datos falla)

```sql
-- Las tablas legacy tienen datos originales intactos hasta Fase 4
DROP TABLE IF EXISTS agent_conversations CASCADE;
DROP TABLE IF EXISTS agent_messages CASCADE;
-- Revertir referencias en código al estado pre-migración
```

### Rollback Completo (si hay bugs en producción)

1. Revertir el PR de `database-reformation`
2. Si tablas legacy aún existen: no se requiere acción de datos
3. Si tablas legacy fueron eliminadas: restaurar desde backup

```sql
-- Restaurar desde backup
INSERT INTO chat_sessions SELECT * FROM agent_conversations;
INSERT INTO chat_messages SELECT * FROM agent_messages;
```

### Ventana de Rollback

- 72 horas post-deploy: rollback completo permitido
- Después de 72h: solo rollback de código (datos ya migrados)
- Después de Fase 4 (drop legacy): solo restore desde backup

---

## Checklist de Validación Post-Migración

- [ ] `chat_sessions.message_count` = `agent_conversations.message_count` (total)
- [ ] `chat_messages` count = `agent_messages` count
- [ ] GET `/api/admin/chat/sessions` funciona con tablas nuevas
- [ ] POST `/api/admin/chat` persiste mensajes en tablas nuevas
- [ ] WhatsApp webhook persiste en tablas nuevas
- [ ] AI Agent memory loop carga historial de tablas nuevas
- [ ] `npm run type-check` pasa
- [ ] `npm run test:all` pasa
- [ ] Backup service exporta tablas nuevas
