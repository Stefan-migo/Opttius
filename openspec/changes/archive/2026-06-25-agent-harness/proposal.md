# Proposal: agent-harness

## Intent

Opttius tiene chat IA y un sistema de insights, pero están fragmentados: el chat vive en `/admin/chat` como página separada, los insights en widgets laterales, y no hay un asistente persistente que acompañe al usuario en toda la app. Este cambio unifica todo en un **Agent Harness** — un copiloto contextual que flota sobre cualquier pantalla, conoce la sucursal activa, el rol del usuario, y la página actual, y puede ejecutar acciones, navegar y recordar contexto organizacional.

El diseño completo está documentado en `docs/plans/2026-06-25-agent-harness-design.md`. Este proposal traduce ese diseño a fases implementables.

## Scope

### In Scope

**Phase 1 — Agent Bubble UI + Block Renderer + Context Provider**

- `AgentBubble` — burbuja flotante (círculo + badge + panel expandible) con estados colapsada/reposo/conversación/notificación
- `BlockRenderer` — renderizado de respuestas estructuradas (text, preview, action, navigation, loading, error, success)
- `AgentContextProvider` — React Context que trackea ruta activa, sucursal, rol, org ID
- `AgentBubbleContainer` — client component que integra bubble + context provider al layout
- Animaciones de apertura/cierre, pulso de notificación, transiciones
- Sin conexión al backend aún — la burbuja abre con UI vacía o mock

**Phase 2 — Agent API + Agent Loop + Tools**

- Ruta `/api/agent/chat` — nuevo endpoint paralelo a `/api/admin/chat` (sin reemplazarlo)
- Constructor de prompt de 4 capas: sistema → rol → contexto dinámico → memoria recuperada
- Extensión del `agent/core.ts` existente para emitir bloques estructurados en lugar de markdown plano
- Filtrado de tools por rol — modificar `getAllTools()` / tool registry para aceptar `role` y devolver solo las tools permitidas
- Nuevas tools de navegación: `navigateTo`, `openEntity`, `reopenLastScreen`
- Nuevas tools de contexto: `getScreenContext`, `getActiveFormData`, `getSelectedCustomer`, `getCartContents`
- Memory loop: `getRecentContext(org_id, N)` + `searchOrgMemory(query)` inyectados en el prompt en cada request
- `AgentSession` builder a partir de metadata del frontend (route, branch, role, org)
- Wiring del bubble frontend al nuevo endpoint
- **Nota**: Usa tablas existentes (`chat_sessions`/`chat_messages` para historial, `memory_facts` para memoria). Las tablas nuevas del agente NO se migran en esta fase.

**Phase 3 — Deprecación + Reemplazo**

- Reemplazar `SmartContextWidget.tsx` por `AgentBubble` en layouts donde se usa
- Marcar rutas `/api/ai/insights/*` como deprecadas (comentarios, backward-compat activa)
- Marcar `chat_sessions`/`chat_messages` como legacy en comentarios de código
- Agregar shim de compatibilidad para código que aún consume el sistema de insights viejo
- Escribir plan de migración a tablas nuevas (`agent_conversations`, `agent_messages`, `agent_memories`, `agent_prompts`, `agent_user_prefs`) para cuando `database-reformation` consolide migraciones

**Phase 4 — Auto Mode + Cost Tracking + Polish**

- Modo automático: monitoreo en background (stock bajo, citas próximas, work orders vencidas) con propuestas al usuario
- UI de preferencias: toggle auto-mode, posición de burbuja fija/flotante, tono del agente
- Cost tracking: `token_count` por conversación, `tokens` + `model` por mensaje (en tablas legacy o en las nuevas cuando existan)
- Edge cases: timeouts, rate limiting, error recovery, tool execution fallo
- Testing de integración del ciclo completo: mensaje → contexto → tools → respuesta con bloques

### Out of Scope

- **Migración de schema DB**: Las tablas `agent_conversations`, `agent_messages`, `agent_memories`, `agent_prompts`, `agent_user_prefs` están diseñadas pero NO se crean. Se migrarán cuando `database-reformation` esté completo.
- **Voz/audio**: El diseño lo explícita como post-MVP.
- **WhatsApp Agent**: El agente WhatsApp (whatsapp-ai-agent-optical) es independiente. Este harness es exclusivamente in-app.
- **Facturación Opttius AI**: El cost tracking prepara el terreno pero no implementa facturación.
- **Eliminación del chat legacy**: Las rutas `/api/admin/chat/*` se mantienen funcionales hasta la fase de archive.
- **Reescritura completa del agent/core.ts**: Se extiende, no se reescribe.

## Capabilities

### New Capabilities

| ID  | Capacidad                            | Fase | Descripción                                                                 |
| --- | ------------------------------------ | ---- | --------------------------------------------------------------------------- |
| C1  | Agent Bubble UI                      | 1    | Asistente flotante persistente accesible desde cualquier pantalla del admin |
| C2  | Respuestas estructuradas por bloques | 1    | El agente responde con previews, acciones, navegación — no markdown plano   |
| C3  | Contexto de pantalla                 | 1    | El agente sabe en qué pantalla estás, qué sucursal, qué rol                 |
| C4  | Herramientas de navegación           | 2    | El agente puede navegarte a cualquier ruta o entidad                        |
| C5  | Tools adaptativas por rol            | 2    | Las tools disponibles varían según el rol (vendedor/admin/dueño)            |
| C6  | Memoria organizacional en línea      | 2    | El agente recupera facts relevantes de la org antes de responder            |
| C7  | Modo automático                      | 4    | El agente monitorea y propone acciones proactivamente (opt-in)              |
| C8  | Cost tracking                        | 4    | Conteo de tokens por conversación para futura facturación                   |

### Modified Capabilities

| ID  | Capacidad                                               | Cambio                                                                                                           | Fase |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---- |
| M1  | Chat IA (`/api/admin/chat`, `src/lib/ai/agent/core.ts`) | Se extiende para emitir bloques estructurados y aceptar contexto de pantalla. El endpoint legacy sigue operando. | 2    |
| M2  | SmartContextWidget                                      | Reemplazado por AgentBubble. El componente se elimina.                                                           | 3    |
| M3  | Sistema de insights (`/api/ai/insights/*`)              | Deprecado. No se elimina, se marca como obsoleto.                                                                | 3    |
| M4  | Tool executor (`src/lib/ai/agent/tool-executor.ts`)     | Se agregan tipos navigation y context al executor.                                                               | 2    |
| M5  | Tool registry (`src/lib/ai/tools/`)                     | Se agrega filtrado por rol. `getAllTools(role?)` acepta role opcional.                                           | 2    |

## Approach

### Fases

| Fase  | Estrategia                                                                                                                                                   | Safety                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **1** | Componentes UI puros + React Context. Sin backend nuevo. La burbuja se integra al layout admin y abre con mock data.                                         | Visual review + type-check. Sin impacto en rutas existentes.                                    |
| **2** | Nuevo endpoint `/api/agent/chat` en paralelo al existente. Extensión del agent core existente (no rewrite). Tools nuevas se registran en el registry actual. | El endpoint legacy sigue funcionando idéntico. Rollback trivial: desactivar ruta nueva.         |
| **3** | Reemplazo de componente + marcado de deprecación. Sin eliminación de código legacy todavía.                                                                  | Backward-compat activa en todo momento. Cualquier cosa que consumía insights sigue funcionando. |
| **4** | Feature completa sobre infraestructura de fases 1-3. Testing de integración.                                                                                 | Opt-in para auto-mode. No afecta a usuarios que no lo activen.                                  |

### Diagrama de flujo (Phase 2)

```
[AgentBubble]                    [AgentContextProvider]
     │                                   │
     │ user message + context            │ route, branch, role, org
     └──────────────┬────────────────────┘
                    │
                    ▼
          ┌─────────────────────┐
          │  POST /api/agent/chat │
          └─────────┬───────────┘
                    │
                    ▼
          ┌─────────────────────┐
          │   AgentSession      │
          │  (user, role, org,  │
          │   branch, screen)   │
          └─────────┬───────────┘
                    │
          ┌─────────▼───────────┐
          │  Memory Loop        │
          │  - getRecentContext  │
          │  - searchOrgMemory   │
          └─────────┬───────────┘
                    │
          ┌─────────▼───────────┐
          │  Build Prompt (4    │
          │  capas) + Tools     │
          │  filtradas por rol  │
          └─────────┬───────────┘
                    │
          ┌─────────▼───────────┐
          │  LLM Call           │
          │  (multi-provider)   │
          └─────────┬───────────┘
                    │
          ┌─────────▼───────────┐
          │  Tool Execution     │
          │  (loop hasta        │
          │   maxSteps)         │
          └─────────┬───────────┘
                    │
          ┌─────────▼───────────┐
          │  Block Response     │
          │  (text + previews + │
          │   actions + nav)    │
          └─────────┬───────────┘
                    │
                    ▼
          [AgentBubble renderiza bloques]
```

### Notas técnicas

- **Schema**: Esta propuesta NO crea migraciones de DB. Las tablas nuevas están diseñadas en `docs/plans/2026-06-25-agent-harness-design.md` (#4.1) pero quedan pendientes hasta que `database-reformation` unifique el esquema de migraciones.
- **Compatibilidad**: El endpoint `/api/agent/chat` corre en paralelo a `/api/admin/chat`. El chat legacy no se toca. La migración de datos de `chat_sessions` → `agent_conversations` se hará en un cambio futuro.
- **Reuso**: El `tool-executor.ts` existente y `agent/core.ts` se extienden, no se reescriben. Las tools nuevas (navegación, contexto) se registran en el mismo `src/lib/ai/tools/` registry.
- **Embeddings**: La memoria semántica usa Transformers.js on-device (384d), ya implementado en `src/lib/ai/embeddings/transformers.ts`.

## Affected Areas

| Area                                            | Impact     | Phase | Description                                                 |
| ----------------------------------------------- | ---------- | ----- | ----------------------------------------------------------- |
| `src/components/ai/AgentBubble.tsx`             | New        | 1     | Burbuja flotante con estados colapsada/abierta/notificación |
| `src/components/ai/BlockRenderer.tsx`           | New        | 1     | Renderizador de bloques estructurados                       |
| `src/components/ai/AgentContextProvider.tsx`    | New        | 1     | React Context para ruta, sucursal, rol, org                 |
| `src/components/ai/AgentBubbleContainer.tsx`    | New        | 1     | Integración bubble + context                                |
| `src/components/ai/SmartContextWidget.tsx`      | Removed    | 3     | Reemplazado por AgentBubble                                 |
| `src/components/ai/InsightCard.tsx`             | Deprecated | 3     | Marcado como legacy                                         |
| `src/components/ai/GenerateInsightsButton.tsx`  | Deprecated | 3     | Marcado como legacy                                         |
| `src/components/ai/InsightDetailDialog.tsx`     | Deprecated | 3     | Marcado como legacy                                         |
| `src/app/api/agent/chat/route.ts`               | New        | 2     | Endpoint de agente con bloques y contexto                   |
| `src/app/api/admin/chat/`                       | Unchanged  | —     | Se mantiene como legacy                                     |
| `src/app/api/ai/insights/`                      | Deprecated | 3     | Marcado, no eliminado                                       |
| `src/lib/ai/agent/core.ts`                      | Modified   | 2     | Extendido para bloques y contexto de pantalla               |
| `src/lib/ai/agent/tool-executor.ts`             | Modified   | 2     | Soportar tool types navigation y context                    |
| `src/lib/ai/tools/types.ts`                     | Modified   | 2     | Nuevos tipos NavigationTool y ContextTool                   |
| `src/lib/ai/tools/index.ts`                     | Modified   | 2     | `getAllTools(role?)` con filtrado                           |
| `src/lib/ai/tools/` (nuevos)                    | New        | 2     | Tools de navegación y contexto                              |
| `src/lib/ai/memory/session.ts`                  | Modified   | 2     | Memory loop (getRecentContext)                              |
| `src/lib/ai/memory/semantic.ts`                 | Modified   | 2     | searchOrgMemory para el loop                                |
| `src/lib/ai/types.ts`                           | Modified   | 2     | Tipos Block, AgentSession                                   |
| `src/lib/ai/usage-logger.ts`                    | Modified   | 4     | Cost tracking extendido                                     |
| `docs/plans/2026-06-25-agent-harness-design.md` | Unchanged  | —     | Documento de diseño fuente (ya existe)                      |

## Risks

| Risk                                                                                 | Likelihood | Phase | Mitigation                                                                                                                |
| ------------------------------------------------------------------------------------ | ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------- |
| El bubble flotante interfiere con UI existente (POS, forms)                          | Medium     | 1     | z-index controlado, collide detection, opción de fijar como panel lateral. Review con UX.                                 |
| El endpoint nuevo `/api/agent/chat` duplica lógica del legacy                        | Low        | 2     | Se extiende `agent/core.ts` compartido. El endpoint nuevo es un wrapper del mismo core con bloques.                       |
| Las tools de navegación rompen if client-side routing cambia                         | Low        | 2     | Usar `next/navigation` (`useRouter`) en el frontend. El backend devuelve paths, no ejecuta navegación server-side.        |
| Memory loop incrementa latencia de cada request                                      | Medium     | 2     | El loop es secuencial (2 queries antes del LLM). Cachear getRecentContext con Redis (ioredis ya existe).                  |
| Filtrado por rol en tools se salta RLS                                               | Low        | 2     | Las tools ejecutan queries con el supabaseClient autenticado del usuario. RLS es la barrera final siempre.                |
| Migración a tablas nuevas post-database-reformation requiere data migration compleja | Medium     | 3     | Documentar el mapping exacto en el plan de migración. chat_sessions tiene 100+ referencias, el plan debe cubrir cada una. |
| Auto-mode en Phase 4 puede generar notificaciones molestas                           | Low        | 4     | Opt-in explícito con toggle. Ratio limits y cooldown por tipo de evento.                                                  |
| SmartContextWidget es consumido en múltiples layouts                                 | Low        | 3     | Hacer grep completo de imports antes de eliminar. Reemplazar uno por uno con AgentBubble.                                 |

## Rollback Plan

Cada fase se mergea como PR independiente. Rollback por PR:

- **Phase 1**: `git revert` del PR de bubble UI. El layout vuelve a no tener burbuja. Sin impacto funcional.
- **Phase 2**: `git revert` del PR del endpoint `/api/agent/chat`. Las tools de navegación y contexto quedan registradas pero no se usan. El chat legacy sigue funcionando.
- **Phase 3**: `git revert` del PR de deprecación. SmartContextWidget vuelve, insights siguen activos. Backward-compat garantizada por diseño.
- **Phase 4**: `git revert` del PR de auto-mode. El toggle de preferencias se oculta. Cost tracking se desactiva.

Sin migración de datos ni rollback de schema — no se crean tablas nuevas.

## Dependencies

- **Phase 1**: Ninguna. Componentes UI puros.
- **Phase 2**: Phase 1 completa (el endpoint necesita la burbuja para conectarse). Dependencia blanda — el endpoint podría probarse con curl/Postman sin el frontend.
- **Phase 3**: Phase 1 + 2 completas. Depende de que AgentBubble esté funcionando para reemplazar SmartContextWidget.
- **Phase 4**: Phases 1-3 completas. El cost tracking puede empezar sin auto-mode, pero el diseño de preferencias lo unifica.
- **Pendiente externo**: `database-reformation` audit antes de migrar tablas nuevas. Este cambio no bloquea ni es bloqueado por ese audit.

## Success Criteria

- [ ] **Phase 1**: AgentBubble se renderiza en el layout admin con estados colapsada/reposo/conversación. Badge con contador funciona. BlockRenderer renderiza correctamente los 7 tipos de bloque. AgentContextProvider expone ruta, sucursal, rol, org. `npm run type-check` pasa.
- [ ] **Phase 2**: `POST /api/agent/chat` responde con bloques estructurados. Tools de navegación ejecutan `router.push()` en el frontend. Tools de contexto devuelven datos de la pantalla activa. `getAllTools("vendedor")` excluye tools de admin/dueño. Memory loop inyecta facts relevantes. El endpoint legacy `/api/admin/chat` sigue funcionando idéntico.
- [ ] **Phase 3**: `SmartContextWidget.tsx` eliminado sin broken imports. Rutas `/api/ai/insights/*` marcadas como deprecadas con comentarios. Shim de compatibilidad para consumidores existentes. Plan de migración a tablas nuevas documentado en `docs/migrations/agent-tables-migration-plan.md`.
- [ ] **Phase 4**: Auto-mode monitorea stock bajo y citas próximas. UI de preferencias permite toggle y configuración. `token_count` se persiste por conversación. Tests de integración del ciclo completo pasan. `npm run test:all` y `npm run build` pasan.
- [ ] **Cross-cutting**: Sin regresiones en POS, checkout, appointments, customers, work orders. `npm run build` pasa en toda fase.

## Executive Summary

El Agent Harness transforma Opttius de "un SaaS con chat IA" a un copiloto contextual que acompaña al usuario en toda la app. Se divide en 4 fases incrementales: (1) burbuja UI flotante con renderizado de bloques, (2) endpoint de agente con contexto de pantalla, tools por rol y memoria organizacional, (3) reemplazo del sistema de insights legacy, (4) modo automático y cost tracking. Sin cambios de schema DB hasta que database-reformation consolide migraciones. El diseño completo está en `docs/plans/2026-06-25-agent-harness-design.md`.
