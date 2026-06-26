# Tasks: agent-harness

**Status**: Completed
**Based on**: `proposal.md` (220 lines), `spec.md` (27 reqs, 43 scenarios), `design.md` (5 ADRs, 17+ components, 11 tools)
**Stack**: Next.js 14 App Router + TypeScript 5 + React 18 + Tailwind CSS 3 + shadcn/ui
**Invariant**: NO existing DB tables altered. NO migrations created. All agent data uses legacy tables (`chat_sessions`, `chat_messages`, `memory_facts`) or `localStorage`.

---

## Executive Summary

4 fases, ~46 tareas. ~3400-4200 líneas estimadas. Se recomiendan 5 PRs chained para mantener cada review bajo 400 líneas. La Phase 1 (Bubble UI) y Phase 3 (Migration) pueden solaparse parcialmente. Phase 2 es la más riesgosa por depender del Agent core existente (919 líneas).

---

## Review Workload Forecast

| Field                    | Value                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Estimated new lines      | ~3400-4200 (all phases)                                                                                                                                |
| Estimated modified lines | ~500-700 (extensions to existing files)                                                                                                                |
| Estimated deleted lines  | ~200-300 (SmartContextWidget + deprecated components)                                                                                                  |
| 400-line budget risk     | **High** — Phase 2 alone is ~1500-1800 lines                                                                                                           |
| Chained PRs recommended  | **Yes** — 5 PRs minimum                                                                                                                                |
| Suggested split          | PR1: Phase 1 (UI), PR2: Phase 2a (Tool registry + tools), PR3: Phase 2b (Endpoint + memory loop), PR4: Phase 3 (Migration), PR5: Phase 4 (Auto + Cost) |
| Chain strategy           | `base` → `phase-1` → `phase-2a` → `phase-2b` → `phase-3` → `phase-4`                                                                                   |
| Delivery strategy        | `chained` — each PR depends on previous                                                                                                                |
| 400-line risk per PR     | PR1: ~900 (HIGH — split into PR1a/PR1b if needed), PR2a: ~500 (MEDIUM), PR2b: ~800 (HIGH), PR3: ~300 (LOW), PR4: ~500 (MEDIUM)                         |
| Snapshot needed          | `/api/admin/chat` response snapshot before Phase 2                                                                                                     |

---

## Dependency Graph

```
Phase 1 (UI) ──────────────────────────────┐
                                            │
Phase 2a (Tools) ─── Phase 2b (Endpoint) ──┼──── Phase 3 (Migration)
                                            │
                                            └──── Phase 4 (Auto + Cost)
```

- Phase 1 → Phase 2a (tools need types from Phase 1)
- Phase 2a → Phase 2b (endpoint needs tools + registry)
- Phase 2b → Phase 3 (migration needs working agent)
- Phase 2b → Phase 4 (auto-mode needs endpoint)
- Phase 1 y Phase 3: solapamiento parcial permitido (Phase 3 solo reemplaza imports)

---

# Phase 1 — Agent Bubble UI (~10 tasks, ~900 lines)

**Gate**: AgentBubble renderizado en admin layout con todos los estados (collapsed/repose/conversation/notification/docked). BlockRenderer pasa tests con fixtures de 7 tipos. `npm run type-check` pasa.

**Spec coverage**: REQ-1 a REQ-8 (Bubble States, Block Renderer, Context Provider), ESC-1 a ESC-21.

---

- [x] ### 1.1 Definir tipos Block, AgentContext, BubbleState, ToolType

**Description**: Agregar tipos compartidos al archivo `src/lib/ai/types.ts`. Definir `Block` como union discriminada de 7 variantes, `AgentContext`, `BubbleState` (collapsed | repose | conversation | notification | docked), `AgentScreenContext`, y `ToolType`.

**Files**:

- `src/lib/ai/types.ts` (MOD — ~80 lines added)

**Acceptance criteria**:

- `Block` type accepts exactly 7 variants: text, preview, action, navigation, loading, error, success
- Each variant has correct required/optional fields per ADR 1
- `BubbleState` is a string union of 5 states
- `AgentContext` exposes route, branchId, branchName, role, orgId, userId
- `AgentScreenContext` matches the POST body contract from spec ESC-22
- TypeScript compiles without errors

**Dependencies**: None
**Estimate**: ~45 min

**Spec mapping**: REQ-1 (Block types), REQ-5 (7 block variants), ADR 1

---

- [x] ### 1.2 Crear AgentContextProvider

**Description**: React Context provider que escucha `usePathname()` para ruta activa, lee sucursal del estado global (BranchSelector), lee rol/orgId de AuthContext. Expone `AgentContext` via `useAgentContext()` hook. No envía nada al backend — solo recolecta metadata que se serializa en el body del POST cuando el usuario envía un mensaje.

**Files**:

- `src/components/ai/AgentContextProvider.tsx` (NEW — ~120 lines)

**Acceptance criteria**:

- Provider wrappeable en layout admin
- `useAgentContext()` returns `AgentContext` with current values
- Route actualiza via `usePathname()` en cada navegación (ESC-15)
- Branch changes propagated from BranchSelector (ESC-16)
- Role changes propagated from AuthContext (ESC-17)
- No HTTP requests triggered on context changes
- Type-check passes

**Dependencies**: 1.1
**Estimate**: ~1h

**Spec mapping**: REQ-3 (Context Provider), ESC-15/16/17

---

- [x] ### 1.3 Crear BubbleFloatingButton con BadgeCount + PulseAnimation

**Description**: Círculo flotante (56px) en bottom-right corner con z-index controlado. Soporta badge con contador numérico (oculto si 0). Animación pulse sutil cuando hay notificación. Props: `state`, `badgeCount`, `onClick`. No interfiere con elementos interactivos (collide detection via CSS `pointer-events: auto` en el container, `pointer-events: none` en el área de colisión reportada).

**Files**:

- `src/components/ai/BubbleFloatingButton.tsx` (NEW — ~90 lines)

**Acceptance criteria**:

- Renderiza círculo de 56px con sombra
- Badge oculto cuando `badgeCount === 0`
- Badge visible con count cuando `badgeCount > 0`
- Pulse animation CSS (no librería externa) cuando hay notificación
- Click handler ejecuta `onClick` prop
- `z-index: 50` (por debajo de modales pero sobre contenido)
- Type-check pasa

**Dependencies**: 1.1
**Estimate**: ~45 min

**Spec mapping**: REQ-1, ESC-1 (collapsed circle), ESC-4 (badge + pulse)

---

- [x] ### 1.4 Crear BlockRenderer con 7 sub-componentes

**Description**: `BlockRenderer` es un dispatcher que recibe un `Block` y renderiza el sub-componente correspondiente. Cada tipo de bloque tiene su propio componente en `src/components/ai/blocks/`. Usa Tailwind para estilos consistentes.

Sub-componentes:

- `TextBlock`: contenido formateado (markdown-light con Tailwind prose)
- `PreviewBlock`: card con entity, id, title, subtitle, action buttons
- `ActionBlock`: botón con variant (primary | danger | ghost)
- `NavigationBlock`: link que usa `router.push()` (recibe router como prop o usa `useRouter`)
- `LoadingBlock`: spinner con label
- `ErrorBlock`: mensaje de error con icono y estilo warning/danger
- `SuccessBlock`: confirmación con check y contenido

**Files**:

- `src/components/ai/BlockRenderer.tsx` (NEW — ~50 lines)
- `src/components/ai/blocks/TextBlock.tsx` (NEW — ~40 lines)
- `src/components/ai/blocks/PreviewBlock.tsx` (NEW — ~60 lines)
- `src/components/ai/blocks/ActionBlock.tsx` (NEW — ~35 lines)
- `src/components/ai/blocks/NavigationBlock.tsx` (NEW — ~40 lines)
- `src/components/ai/blocks/LoadingBlock.tsx` (NEW — ~20 lines)
- `src/components/ai/blocks/ErrorBlock.tsx` (NEW — ~25 lines)
- `src/components/ai/blocks/SuccessBlock.tsx` (NEW — ~25 lines)
- `src/components/ai/blocks/index.ts` (NEW — barrel export)

**Acceptance criteria**:

- BlockRenderer renders correct component for each of the 7 block types (ESC-6 a ESC-14)
- Unknown type renders nothing or fallback text
- PreviewBlock renders entity card with title, subtitle, actions
- ActionBlock renders button with correct variant styling
- NavigationBlock renders clickable link that calls `router.push(path)`
- LoadingBlock renders animated spinner
- ErrorBlock renders with red/danger styling
- SuccessBlock renders with green styling
- Type-check passes

**Dependencies**: 1.1
**Estimate**: ~2h

**Spec mapping**: REQ-2 (Block Renderer), ESC-6/7/8/9/10/11/12/13/14

---

- [x] ### 1.5 Crear BubblePanel (header + messages + input + suggestions)

**Description**: Panel expandido que contiene los sub-componentes de la burbuja abierta. Tiene 2 modos visuales: `floating` (panel overlay, 380px width, max-h-[600px]) y `docked` (panel fijo lateral, 400px width, full height). Incluye:

- `BubbleHeader`: título contextual, close button, dock toggle
- `BubbleMessages`: scroll container con mensajes mapeados a `MessageBlock[]` → `BlockRenderer`
- `BubbleInput`: textarea auto-resize + send button
- `BubbleSuggestions`: chips contextuales en estado repose

**Files**:

- `src/components/ai/BubblePanel.tsx` (NEW — ~80 lines, container)
- `src/components/ai/BubbleHeader.tsx` (NEW — ~50 lines)
- `src/components/ai/BubbleMessages.tsx` (NEW — ~60 lines)
- `src/components/ai/BubbleInput.tsx` (NEW — ~65 lines)
- `src/components/ai/BubbleSuggestions.tsx` (NEW — ~45 lines)

**Acceptance criteria**:

- Panel se muestra en modo floating (overlay) o docked (sidebar)
- Header muestra título contextual según estado/screen
- Close button colapsa la burbuja
- Dock toggle alterna floating/docked (ESC-5)
- Messages container hace scroll con overflow-y-auto
- Input textarea auto-resize hasta 4 líneas
- Send button deshabilitado si input vacío
- Suggestions muestra chips según screen context (repose state)
- Transiciones CSS suaves (no librería) en open/close
- Type-check pasa

**Dependencies**: 1.1, 1.3, 1.4
**Estimate**: ~2.5h

**Spec mapping**: REQ-1, REQ-2, ESC-5 (docked panel), ESC-2 (repose greeting)

---

- [x] ### 1.6 Crear AgentBubble container con manejo de estados

**Description**: Componente container que orquesta los estados de la burbuja: `collapsed`, `repose`, `conversation`, `notification`, `docked`. Maneja la máquina de estados (transiciones), el badge count, y la integración de sub-componentes. En Phase 1, no tiene conexión al backend — usa mock data para demostración.

Estado inicial: `collapsed`. Transiciones:

- collapsed + click → repose
- repose + type message → conversation
- conversation + close → collapsed
- notification + click → conversation
- any + dock toggle → docked (si no estaba) / floating (si estaba)

**Files**:

- `src/components/ai/AgentBubble.tsx` (NEW — ~120 líneas)

**Acceptance criteria**:

- State machine implementa las 5 transiciones principales
- collapsed: muestra BubbleFloatingButton sin badge
- repose: muestra panel con saludo contextual + suggestions (ESC-2)
- conversation: muestra panel con historial + input habilitado (ESC-3)
- notification: badge count visible + pulse (ESC-4)
- docked: panel fijo lateral, persiste estado entre renders (ESC-5)
- Mock messages se renderizan via BlockRenderer
- Type-check pasa

**Dependencies**: 1.2, 1.5
**Estimate**: ~1.5h

**Spec mapping**: REQ-1 (Bubble States), ESC-1/2/3/4/5

---

- [x] ### 1.7 Crear AgentBubbleContainer e integrar en admin layout

**Description**: Client component wrapper que renderiza `AgentBubble` envuelto en `AgentContextProvider`. Se integra en `src/app/admin/layout.tsx` como último elemento (después de sidebar + main). Solo visible en rutas admin (no landing/auth).

**Files**:

- `src/components/ai/AgentBubbleContainer.tsx` (NEW — ~25 líneas)
- `src/app/admin/layout.tsx` (MOD — agregar `<AgentBubbleContainer />`)

**Acceptance criteria**:

- AgentBubbleContainer se renderiza solo en rutas admin
- Layout admin incluye el container sin romper estructura existente
- Bubble flotante aparece en bottom-right de todas las pantallas admin
- No afecta layout responsive existente
- Type-check pasa

**Dependencies**: 1.2, 1.6
**Estimate**: ~30 min

**Spec mapping**: REQ-1 (disponible en toda pantalla admin)

---

- [x] ### 1.8 Tests unitarios: BlockRenderer + Bubble estados

**Description**: Tests con vitest + testing-library. Fixtures para cada tipo de Block. Tests de transiciones de estado.

**Files**:

- `src/__tests__/unit/components/ai/BlockRenderer.test.tsx` (NEW — ~120 lines)
- `src/__tests__/unit/components/ai/AgentBubble.test.tsx` (NEW — ~100 lines)
- `src/__tests__/unit/components/ai/fixtures/blocks.fixture.ts` (NEW — ~60 lines)

**Acceptance criteria**:

- BlockRenderer: 7 tests, uno por tipo de bloque, verifica renderizado correcto
- AgentBubble: test de cada transición de estado (collapsed→repose, repose→conversation, etc.)
- Fixtures cubren: text, preview, action, navigation, loading, error, success
- `npx vitest run src/__tests__/unit/components/ai/` pasa
- Type-check pasa

**Dependencies**: 1.4, 1.6
**Estimate**: ~1.5h

**Spec mapping**: Quality Gate Phase 1 (BlockRenderer unit tests, Bubble render)

---

- [x] ### 1.9 Type-check + lint + build (Phase 1 gate)

**Description**: Verificar que toda la Phase 1 compila y pasa linter.

**Files**: None
**Acceptance criteria**:

- `npm run type-check` pasa
- `npm run lint` pasa (sin new warnings)
- `npm run build` pasa

**Dependencies**: 1.7, 1.8
**Estimate**: ~15 min

---

# Phase 2a — Tool Registry + Tools (~7 tasks, ~600 lines)

**Gate**: `getAllTools(role?)` filtra correctamente por jerarquía. Tools de navegación/contexto/memoria registradas y con tests. Tools legacy con `minRole` asignado.

**Spec coverage**: REQ-12 a REQ-17 (Role-Filtered Tools, Navigation, Context, Memory), ESC-27 a ESC-34.

---

- [x] ### 2.1 Extender ToolDefinition con type, minRole

**Description**: Agregar campos `type?: ToolType` y `minRole?: Role` a `ToolDefinition` en `src/lib/ai/tools/types.ts`. Definir `ToolType` ("db" | "navigation" | "context" | "memory") y `Role` ("vendedor" | "admin" | "dueño"). Todos backward-compat (opcionales, default behavior unchanged si no se especifican).

**Files**:

- `src/lib/ai/tools/types.ts` (MOD — ~30 lines added)

**Acceptance criteria**:

- `ToolDefinition` tiene `type` y `minRole` opcionales
- `ToolType` union de 4 valores
- `Role` union de 3 valores
- Sin cambios en tools existentes que no definen estos campos
- Type-check pasa

**Dependencies**: 1.1
**Estimate**: ~30 min

**Spec mapping**: ADR 5, design §Tool Architecture

---

- [x] ### 2.2 Implementar getAllTools(role?) con filtro por jerarquía

**Description**: Modificar `getAllTools()` en `src/lib/ai/tools/index.ts` para aceptar `role?: Role`. Si no se pasa role, retorna tools sin filtro (default actual). Si se pasa, filtra por jerarquía: `vendedor` (0) < `admin` (1) < `dueño` (2). Tools sin `minRole` se consideran accesibles por todos.

**Files**:

- `src/lib/ai/tools/index.ts` (MOD — ~40 lines added)

**Acceptance criteria**:

- `getAllTools("vendedor")` excluye tools con `minRole: "admin"` o `"dueño"` (ESC-27)
- `getAllTools("admin")` incluye tools con `minRole: "vendedor"` y `"admin"`, excluye `"dueño"` (ESC-28)
- `getAllTools("dueño")` incluye todas (ESC-29)
- `getAllTools(undefined)` retorna todas (backward-compat)
- Tools sin `minRole` siempre incluidas
- Function es pura (sin side effects)
- Type-check pasa

**Dependencies**: 2.1
**Estimate**: ~45 min

**Spec mapping**: REQ-12 (Role-Filtered Tools), ESC-27/28/29, ADR 5

---

- [x] ### 2.3 Crear tools de navegación (navigateTo, openEntity, reopenLastScreen)

**Description**: 3 tools en archivo nuevo. `navigateTo(path, label)` devuelve `NavigationBlock`. `openEntity(entity, id)` construye path según tipo de entidad y devuelve `NavigationBlock`. `reopenLastScreen()` devuelve comando de navegación a ruta anterior (backend solo retorna block; frontend maneja `router.back()`).

Nota: Ninguna tool ejecuta redirect server-side. Todas devuelven un `NavigationBlock` que el frontend procesa con `next/navigation`.

**Files**:

- `src/lib/ai/tools/navigation.ts` (NEW — ~80 lines)

**Acceptance criteria**:

- `navigateTo` acepta `{ path, label }`, retorna `{ type: "navigation" }` (ESC-30)
- `openEntity` acepta `{ entity, id }`, mapea a ruta correcta (ESC-31)
- `reopenLastScreen` retorna navigation block con path anterior (ESC-32)
- Ninguna tool ejecuta redirect server-side
- Tools registradas en `ToolDefinition[]` y exportadas
- Type-check pasa

**Dependencies**: 2.1, 2.2
**Estimate**: ~1h

**Spec mapping**: REQ-13 (Navigation Tools), ESC-30/31/32

---

- [x] ### 2.4 Crear tools de contexto (getScreenContext, getActiveFormData, getSelectedCustomer, getCartContents)

**Description**: 4 tools que devuelven datos del contexto actual de pantalla. `getScreenContext()` retorna route/section/branch/role desde `AgentScreenContext`. `getActiveFormData()` retorna datos serializados del formulario activo (o null). `getSelectedCustomer()` retorna customer info del contexto actual (o null). `getCartContents()` retorna items del carrito POS (o null).

Implementación: usar un ContextStore global (React context externo al provider, accesible desde server-side via una referencia singleton o pasada como parámetro). Para Phase 2a, implementar con un store simple que el frontend actualiza y las tools consultan.

**Files**:

- `src/lib/ai/tools/context.ts` (NEW — ~100 lines)

**Acceptance criteria**:

- `getScreenContext()` retorna route, section, branch, role (ESC-33)
- `getActiveFormData()` retorna form data serializado o null (ESC-34)
- `getSelectedCustomer()` retorna `{ id, name, rut, email, phone }` o null (ESC-35)
- `getCartContents()` retorna `{ items, total, branch_id }` o null (ESC-36)
- Tools manejan null/undefined sin crash
- Type-check pasa

**Dependencies**: 2.1, 2.2
**Estimate**: ~1.5h

**Spec mapping**: REQ-14 (Context Tools), ESC-33/34/35/36

---

- [x] ### 2.5 Crear tools de memoria (searchOrgMemory, saveMemory, getRecentContext, saveSessionSummary)

**Description**: 4 tools de memoria. `searchOrgMemory(query)` hace búsqueda semántica sobre `memory_facts` usando Transformers.js (384d embeddings existente). `saveMemory(fact)` persiste en `memory_facts` con validación de escritura según rol. `getRecentContext(orgId, limit)` retorna últimos facts (cacheado). `saveSessionSummary()` persiste resumen al cerrar sesión.

Todas usan `supabaseClient` autenticado del usuario (RLS es barrera final).

**Files**:

- `src/lib/ai/tools/memory.ts` (NEW — ~120 lines)

**Acceptance criteria**:

- `searchOrgMemory` ejecuta búsqueda semántica con threshold 0.7
- `saveMemory` persiste en `memory_facts` con factType correcto
- `saveMemory` para rol `vendedor` solo permite lectura (falla si intenta escribir)
- `getRecentContext` retorna hasta `limit` facts
- `saveSessionSummary` persiste resumen + token_count en memory_facts (ESC-37)
- Tools usan `supabase.from("memory_facts")` autenticado
- Type-check pasa

**Dependencies**: 2.1, 2.2
**Estimate**: ~1.5h

**Spec mapping**: REQ-15 (Memory Tools), ESC-37

---

- [x] ### 2.6 Asignar minRole a tools existentes

**Description**: Agregar `minRole` a tools existentes que requieren permisos elevados. Por diseño del ADR 5, herramientas como `deleteCustomer`, `deleteProduct`, `deleteCategory`, `deleteWorkOrder` → `minRole: "admin"`. `updateOrgConfig`, `updateSystemConfig` → `minRole: "dueño"`. `getFinancialReport`, `importBulk` → `minRole: "admin"`. El resto queda sin `minRole` (default: vendedor).

**Files**:

- `src/lib/ai/tools/*.ts` (MOD — ~15 files, ~1-2 lines each)

**Acceptance criteria**:

- Las 8 tools listadas en design §Tool Architecture tienen `minRole` asignado
- Tools no listadas quedan sin `minRole` (default vendedor)
- Type-check pasa
- Tests de getAllTools verifican que estas tools son filtradas correctamente

**Dependencies**: 2.1, 2.2
**Estimate**: ~30 min

**Spec mapping**: ADR 5, design §Tool Architecture table

---

- [x] ### 2.7 Tests: getAllTools filtering

**Description**: Unit tests para `getAllTools(role?)` con combinaciones de roles y tools.

**Files**:

- `src/__tests__/unit/lib/ai/tools/filtering.test.ts` (NEW — ~80 lines)

**Acceptance criteria**:

- Test: vendedor no ve deleteCustomer (minRole: admin)
- Test: admin ve deleteCustomer pero no updateOrgConfig
- Test: dueño ve todas
- Test: tools sin minRole visibles para todos
- Test: undefined role retorna todas (backward-compat)
- `npx vitest run src/__tests__/unit/lib/ai/tools/` pasa

**Dependencies**: 2.2, 2.6
**Estimate**: ~45 min

**Spec mapping**: Quality Gate Phase 2 (Tools filtered by role)

---

# Phase 2b — Agent Endpoint + Memory Loop (~7 tasks, ~1100 lines)

**Gate**: `POST /api/agent/chat` responde con `Block[]` via SSE. Memory loop inyecta contexto en prompt 4-capas. Legacy `/api/admin/chat` intacto.

**Spec coverage**: REQ-9 a REQ-11 (Endpoint Contract, 4-Layer Prompt, Memory Loop), ESC-22 a ESC-26.

---

- [x] ### 2.8 Crear AgentSession builder

**Description**: Función pura que construye un objeto `AgentSession` a partir del body del request. Valida campos requeridos (`message`, `context.role`, `context.org_id`). Retorna `session_id` (nuevo o reusado de `chat_sessions`). Tipado completo.

**Files**:

- `src/lib/ai/agent/session.ts` (NEW — ~60 lines)

**Acceptance criteria**:

- Construye `AgentSession` desde body válido
- Retorna error 400 si falta `message` (ESC-23)
- Retorna error 400 si falta `context.role` o `context.org_id` (ESC-23)
- Genera nuevo `session_id` UUID si no se provee
- Type-check pasa

**Dependencies**: 2.1
**Estimate**: ~30 min

**Spec mapping**: REQ-9 (Endpoint Contract), ESC-22/23

---

- [x] ### 2.9 Crear prompt builder de 4 capas

**Description**: Constructor de system prompt que ensambla 4 capas: (1) identidad base del agente + constraints, (2) personalidad según rol (dueño/admin/vendedor), (3) contexto dinámico de pantalla (route, branch, alerts), (4) memoria recuperada del memory loop.

Cada capa es una función separada para testabilidad. El output es un string de system prompt completo.

**Files**:

- `src/lib/ai/agent/prompt-builder.ts` (NEW — ~120 lines)

**Acceptance criteria**:

- `buildSystemPrompt(session, memoryContext, tools)` retorna string con 4 capas
- Layer 1 incluye identidad + behavioral constraints (ESC-24)
- Layer 2 inyecta personalidad específica del rol (ESC-24)
- Layer 3 inyecta route + branch + active alerts (ESC-24)
- Layer 4 inyecta output del memory loop (ESC-24)
- Sin capa, el prompt builder omite esa sección
- Type-check pasa

**Dependencies**: 2.8
**Estimate**: ~1h

**Spec mapping**: REQ-10 (4-Layer System Prompt), ESC-24

---

- [x] ### 2.10 Implementar memory loop con cache Redis

**Description**: Pipeline de 2 pasos ejecutado antes del LLM call: (1) `getRecentContext(orgId, 5)` con cache ioredis (TTL 5 min), (2) `searchOrgMemory(message, orgId)` con Transformers.js embedding (384d) + pgvector search (threshold 0.7, match_count 5). Paralelizable (Promise.all).

Si Redis no está disponible, fallback a query directa a `memory_facts`. Si Transformers.js excede 3s, timeout y continuar sin memoria semántica.

**Files**:

- `src/lib/ai/memory/agent-loop.ts` (NEW — ~100 lines)

**Acceptance criteria**:

- `getRecentContext(orgId, 5)` cachea en Redis con TTL 5 min (ESC-25)
- `searchOrgMemory(message, orgId)` ejecuta búsqueda semántica (ESC-25)
- Ambas queries se ejecutan en paralelo
- Fallback sin cache si Redis no disponible
- Timeout de 3s para Transformers.js
- Resultados se combinan para capa 4 del prompt
- Type-check pasa

**Dependencies**: 2.1
**Estimate**: ~1.5h

**Spec mapping**: REQ-11 (Memory Loop), ESC-25/26

---

- [x] ### 2.11 Extender Agent.core con streamChatStructured()

**Description**: Agregar método `streamChatStructured(userMessage, screenContext?)` a la clase `Agent` en `src/lib/ai/agent/core.ts`. Envuelve `streamChat()` existente y post-procesa la respuesta del LLM (texto + tool_calls) en `Block[]`. Usa un paso de post-procesamiento que parsea la respuesta del LLM y la transforma en bloques.

No rewrite de la clase — solo extensión. El método `streamChatStructured()` retorna `AsyncGenerator<{ blocks: Block[]; sessionId: string; toolCalls?: ToolCall[]; done: boolean }>`.

El post-procesamiento:

1. Recibe texto del LLM + tool_calls
2. Divide el texto en bloques por secciones (##text, ##preview, ##action, etc.)
3. Cada sección se mapea al Block type correspondiente
4. tool_calls se convierten en loading/action/success blocks secuencialmente
5. Retorna `Block[]` ordenado

**Files**:

- `src/lib/ai/agent/core.ts` (MOD — ~200 lines added)

**Acceptance criteria**:

- `streamChatStructured()` existe como método en Agent class (ESC-24)
- Acepta `screenContext?: AgentScreenContext`
- Inyecta contexto en capa 3 del prompt
- Post-procesa respuesta LLM → `Block[]`
- Maneja tool_calls como bloques de acción
- No modifica `streamChat()` existente
- Legacy endpoint no afectado
- Type-check pasa

**Dependencies**: 2.9, 2.10
**Estimate**: ~3h (área más compleja del cambio)

**Spec mapping**: REQ-9 (Endpoint), ADR 3 (Extensión vs rewrite)

---

- [x] ### 2.12 Crear endpoint POST /api/agent/chat con SSE de bloques

**Description**: Nuevo route handler en `src/app/api/agent/chat/route.ts`. Flujo:

1. Auth validation (reusar middleware de chat route existente)
2. Tier quota check → 429 si excedido (con `Retry-After` header)
3. Construir `AgentSession` desde body
4. Ejecutar memory loop (agent-loop.ts)
5. Construir prompt 4-capas + tools filtradas por rol
6. Llamar `agent.streamChatStructured()` con `Agent.streamChatStructured()`
7. Emitir SSE stream con eventos `block` y `done`
8. En session close/timeout: ejecutar `saveSessionSummary`

Response: SSE stream con eventos:

```
event: block
data: {"type": "text", "content": "..."}

event: done
data: {"session_id": "uuid", "token_count": { "prompt": 450, "completion": 120 }}
```

**Files**:

- `src/app/api/agent/chat/route.ts` (NEW — ~150 lines)
- `src/app/api/agent/preferences/route.ts` (NEW — ~30 lines, stub GET/PATCH)

**Acceptance criteria**:

- POST responde con SSE stream de bloques
- 400 si falta message o context fields requeridos (ESC-23)
- 401 si no autenticado (ESC-24)
- 429 si tier quota excedido (ESC-25)
- 500 en error interno con mensaje genérico
- `/api/admin/chat` sigue funcionando sin cambios (ESC-26)
- Type-check pasa

**Dependencies**: 2.8, 2.9, 2.10, 2.11
**Estimate**: ~3h

**Spec mapping**: REQ-9 (Endpoint Contract), ESC-22/23/24/25/26

---

- [x] ### 2.13 Tests de integración: endpoint, memory loop, legacy snapshot

**Description**: Tests de integración con vitest. Mocks: LLM (devuelve tool_calls + texto), Supabase (queries), Redis (cache), Transformers.js (embeddings).

**Files**:

- `src/__tests__/integration/api/agent/chat.test.ts` (NEW — ~180 lines)
- `src/__tests__/unit/lib/ai/memory/agent-loop.test.ts` (NEW — ~80 lines)

**Acceptance criteria**:

- POST /api/agent/chat con payload válido → blocks (200/SSE)
- POST /api/agent/chat sin role → 400
- POST /api/agent/chat sin auth → 401
- POST /api/agent/chat tier excedido → 429
- Memory loop: verificar que prompt layers se construyen correctamente
- Snapshot: POST /api/admin/chat responde idéntico que antes de Phase 2 (ESC-26)
- `npx vitest run src/__tests__/integration/api/agent/` pasa

**Dependencies**: 2.12
**Estimate**: ~2h

**Spec mapping**: Quality Gate Phase 2 (POST returns blocks, Tools filtered, Legacy unchanged)

---

- [x] ### 2.14 Conectar Bubble frontend al endpoint

**Description**: Modificar `AgentBubble.tsx` (y componentes relacionados) para enviar mensajes a `POST /api/agent/chat` en lugar de usar mock data. Enviar `AgentContext` del provider como parte del body. Procesar SSE stream y renderizar bloques via BlockRenderer. Manejar estados de loading, error, y conexión.

**Files**:

- `src/components/ai/AgentBubble.tsx` (MOD — ~100 lines added)

**Acceptance criteria**:

- Mensajes del usuario se envían a `/api/agent/chat`
- Body incluye `{ message, session_id, context }` con metadata del AgentContextProvider
- SSE stream se procesa y cada `event: block` se renderiza via BlockRenderer
- Loading state durante tool execution
- Error state si endpoint falla
- Session continúa entre mensajes (mismo session_id)
- Type-check pasa

**Dependencies**: 1.7, 2.12
**Estimate**: ~1.5h

**Spec mapping**: REQ-1 (Bubble integrated with backend)

---

# Phase 3 — Migration (~7 tasks, ~350 lines)

**Gate**: SmartContextWidget eliminado sin broken imports. Insights routes funcionales pero marcados deprecated. `npm run type-check` pasa.

**Spec coverage**: REQ-18 a REQ-21 (Component Replacement, Deprecation, Migration Plan), ESC-38 a ESC-43.

---

- [x] ### 3.1 Reemplazar SmartContextWidget por AgentBubble en layouts

**Description**: Buscar todos los layouts que importan `SmartContextWidget` y reemplazar por `AgentBubbleContainer`. Grep completo de `SmartContextWidget` en `src/` primero. Actualizar imports uno por uno.

**Files**:

- `src/components/admin/InsightsFloatingButton.tsx` (MOD)
- Varios layouts (MOD — según resultados de grep)

**Acceptance criteria**:

- grep de `SmartContextWidget` en `src/` retorna 0 referencias después del reemplazo (ESC-38)
- `AgentBubbleContainer` se renderiza donde antes estaba `SmartContextWidget`
- Layout tests pasan después del reemplazo (ESC-38)
- Type-check pasa (ESC-39)

**Dependencies**: 1.7 (AgentBubbleContainer must exist)
**Estimate**: ~1h

**Spec mapping**: REQ-18 (Component Replacement), ESC-38/39

---

- [x] ### 3.2 Eliminar SmartContextWidget.tsx y su test

**Description**: Eliminar archivo del componente y su test asociado.

**Files**:

- `src/components/ai/SmartContextWidget.tsx` (DEL)
- `src/components/ai/SmartContextWidget.test.tsx` (DEL) — si existe

**Acceptance criteria**:

- Archivos eliminados
- `npm run type-check` pasa (sin imports rotos)
- grep de `SmartContextWidget` retorna 0 (ya reemplazados en 3.1)

**Dependencies**: 3.1
**Estimate**: ~15 min

**Spec mapping**: REQ-18

---

- [x] ### 3.3 Marcar rutas /api/ai/insights/\* como deprecadas

**Description**: Agregar comentario `@deprecated` al inicio del archivo de ruta `src/app/api/ai/insights/route.ts`. La ruta sigue funcionando — no se modifica lógica.

**Files**:

- `src/app/api/ai/insights/route.ts` (MOD — agregar comentario de 2 líneas)

**Acceptance criteria**:

- Archivo tiene comentario: `// @deprecated Use /api/agent/chat instead. Remove after database-reformation.` (ESC-40)
- Ruta sigue funcionando idéntica (ESC-40)
- Tests de /api/ai/insights siguen pasando

**Dependencies**: None
**Estimate**: ~10 min

**Spec mapping**: REQ-19 (Deprecation), ESC-40

---

- [x] ### 3.4 Marcar componentes legacy como deprecados

**Description**: Agregar comentario `@deprecated` a `InsightCard.tsx`, `GenerateInsightsButton.tsx`, `InsightDetailDialog.tsx`. No eliminar ni modificar lógica.

**Files**:

- `src/components/ai/InsightCard.tsx` (MOD — comentario)
- `src/components/ai/GenerateInsightsButton.tsx` (MOD — comentario)
- `src/components/ai/InsightDetailDialog.tsx` (MOD — comentario)

**Acceptance criteria**:

- Cada archivo tiene comentario `@deprecated` con referencia al agente nuevo
- Componentes siguen funcionando sin cambios
- Type-check pasa

**Dependencies**: None
**Estimate**: ~15 min

**Spec mapping**: REQ-19, design §File Changes Summary Phase 3

---

- [x] ### 3.5 Marcar referencias a chat_sessions/chat_messages como legacy

**Description**: Buscar archivos que referencian `chat_sessions` y `chat_messages`. Agregar comentario `// @deprecated Migrate to agent_conversations/agent_messages after database-reformation` en cada archivo. No agregar nuevas queries a estas tablas.

**Files**:

- Archivos que usan `chat_sessions` o `chat_messages` (MOD — según grep, estimado 15-20 archivos)

**Acceptance criteria**:

- Cada archivo que referencia estas tablas tiene comentario `@deprecated` (ESC-41)
- No se agregaron nuevas queries a estas tablas (ESC-41)
- Type-check pasa

**Dependencies**: None
**Estimate**: ~30 min

**Spec mapping**: REQ-19, ESC-41

---

- [x] ### 3.6 Crear shim de compatibilidad para consumidores existentes

**Description**: En `AgentBubbleContainer.tsx`, agregar un shim que expone la misma interfaz que `SmartContextWidget` para cualquier código que aún consuma el widget viejo mediante import dinámico o referencia indirecta. El shim renderiza `AgentBubble` internamente y traduce props.

**Files**:

- `src/components/ai/AgentBubbleContainer.tsx` (MOD — ~20 lines added)

**Acceptance criteria**:

- Código que importaba `SmartContextWidget` funciona sin cambio si usaba interfaz simple
- Shim es mínimo (solo traduce props básicas)
- Type-check pasa

**Dependencies**: 3.2
**Estimate**: ~30 min

**Spec mapping**: REQ-18, proposal §Phase 3 approach

---

- [x] ### 3.7 Documentar plan de migración a tablas nuevas

**Description**: Escribir `docs/migrations/agent-tables-migration-plan.md` con mapping exacto de columnas: `chat_sessions` → `agent_conversations`, `chat_messages` → `agent_messages`. Enumerar todas las referencias en la codebase que consumen las tablas legacy. Incluir estrategia de migración de datos y rollback.

**Files**:

- `docs/migrations/agent-tables-migration-plan.md` (NEW — ~100 lines)

**Acceptance criteria**:

- Documento guardado en `docs/migrations/`
- Incluye column mapping exacto (ESC-42)
- Enumera ~100+ reference points estimados (ESC-42)
- Describe estrategia de migración de datos
- Describe rollback plan
- Type-check no aplica (markdown)

**Dependencies**: None
**Estimate**: ~1h

**Spec mapping**: REQ-20 (Migration Plan), ESC-42/43

---

- [x] ### 3.8 Grep de referencias remanentes + type-check (Phase 3 gate)

**Description**: Verificación final de Phase 3: grep de SmartContextWidget, `@deprecated` coverage, type-check, tests de insights legacy.

**Files**: None

**Acceptance criteria**:

- `grep -r "SmartContextWidget" src/` retorna 0 (ESC-38)
- `npm run type-check` pasa (ESC-39)
- `POST /api/ai/insights` sigue funcionando (ESC-40)
- `npm run build` pasa

**Dependencies**: 3.1-3.7
**Estimate**: ~15 min

---

# Phase 4 — Auto-Mode & Cost Tracking (~7 tasks, ~600 lines)

**Gate**: Auto-mode monitorea stock bajo y citas próximas. Cost tracking persiste `token_count`. UI de preferencias operativa. Tests de integración pasan.

**Spec coverage**: REQ-22 a REQ-27 (Auto Mode, User Preferences, Cost Tracking), ESC-44 a ESC-50.

---

### [x] 4.1 Implementar trigger engine para auto-mode

**Description**: Engine que monitorea eventos en background: stock bajo (product_branch_stock.stock < threshold), citas próximas (appointments dentro de 24h), work orders vencidas. Se ejecuta en intervalos configurables (por ahora, sólo cuando el usuario abre la burbuja + polling cada 5 min si auto-mode activo). Usa queries directas a Supabase con el cliente autenticado del usuario.

Cada trigger produce una notificación estructurada con tipo, severidad, entidad relacionada, acción propuesta.

**Files**:

- `src/lib/ai/agent/auto-trigger.ts` (NEW — ~120 lines)

**Acceptance criteria**:

- Trigger de stock bajo: detecta productos con stock < mínimo (ESC-44)
- Trigger de citas próximas: detecta appointments dentro de 24h (ESC-44)
- Trigger de work orders vencidas: detecta OT vencidas
- Cada trigger retorna `{ type, severity, entity, action }`
- No ejecuta acciones irreversibles sin confirmación (ESC-45)
- Rate-limited para evitar notificaciones molestas (cooldown por tipo)
- Type-check pasa

**Dependencies**: 2.12 (endpoint exists)
**Estimate**: ~1.5h

**Spec mapping**: REQ-22 (Auto Mode), ESC-44/45/46

---

### [x] 4.2 Crear UI de preferencias del agente

**Description**: Panel de preferencias accesible desde la burbuja. Toggles y selectores para: `auto_mode` (switch on/off), `bubble_position` (floating | docked), `agent_tone` (professional | casual | concise). Persiste en `localStorage` con schema tipado.

El panel es un componente React que se renderiza dentro de `BubblePanel` o como modal desde el header. Lee/escribe `localStorage` con key `agent:preferences:{userId}`.

**Files**:

- `src/components/ai/AgentPreferences.tsx` (NEW — ~80 lines)

**Acceptance criteria**:

- Toggle `auto_mode` on/off (ESC-47)
- Selector `bubble_position`: floating | docked (ESC-47)
- Selector `agent_tone`: professional | casual | concise (ESC-47)
- Preferencias persisten en localStorage con key scoped por userId
- Cambio de `bubble_position` afecta inmediatamente al AgentBubble
- Type-check pasa

**Dependencies**: 1.6 (AgentBubble states), Phase 1 complete
**Estimate**: ~1h

**Spec mapping**: REQ-23 (User Preferences UI), ESC-47

---

### [x] 4.3 Extender usage-logger con token_count por conversación

**Description**: Modificar `src/lib/ai/usage-logger.ts` para contar tokens por conversación. En cada LLM call, registrar `tokens_prompt` + `tokens_completion` por mensaje (en `chat_messages.metadata.token_count`) y acumular `token_count` en `chat_sessions.metadata.token_count`. Al cerrar sesión, incluir `token_count` en el summary (ESC-50).

**Files**:

- `src/lib/ai/usage-logger.ts` (MOD — ~60 lines added)

**Acceptance criteria**:

- `logTokenUsage(sessionId, messageId, promptTokens, completionTokens)` persiste en `chat_messages.metadata.token_count`
- `token_count` se acumula por sesión en `chat_sessions.metadata`
- `saveSessionSummary` incluye `token_count` en metadata (ESC-50)
- Backward-compat: no rompe registro existente de `ai_usage_log`
- Type-check pasa

**Dependencies**: 2.12
**Estimate**: ~1h

**Spec mapping**: REQ-24 (Cost Tracking), ESC-48/49/50

---

### [x] 4.4 Rate limiting y timeouts en endpoint

**Description**: Agregar rate limiting por usuario/org en `POST /api/agent/chat`. Usar ioredis para counter con TTL (ej: 30 requests/min por org). Timeout de LLM call (30s default). Error recovery en tool execution (retry 1 vez, fallback message si falla).

**Files**:

- `src/app/api/agent/chat/route.ts` (MOD — ~40 lines added)

**Acceptance criteria**:

- Rate limit: 429 si org excede cuota (ESC-25)
- `Retry-After` header en respuesta 429
- Timeout LLM: error block si excede 30s
- Tool execution: retry 1 vez, error block si falla
- Type-check pasa

**Dependencies**: 2.12, 4.3
**Estimate**: ~1h

**Spec mapping**: REQ-9 (Endpoint Contract), ESC-25

---

### [x] 4.5 Edge cases: error recovery, tool execution fallo, LLM timeout

**Description**: Manejo robusto de errores en el loop agente: (1) LLM timeout → mensaje "Lo siento, no pude procesar tu solicitud. Intenta de nuevo." + sugerencias. (2) Tool execution falla → error block con mensaje + opción de reintentar. (3) Conexión perdida durante SSE → frontend reconecta con último session_id. (4) Payload inválido → 400 con detalle de campo faltante.

**Files**:

- `src/lib/ai/agent/core.ts` (MOD — ~60 lines added)
- `src/components/ai/AgentBubble.tsx` (MOD — ~30 lines added)

**Acceptance criteria**:

- LLM timeout produce error block amigable
- Tool execution falla produce error block con opción reintentar
- Frontend reconecta SSE si conexión se pierde
- Errores de validación retornan 400 con detalle
- Sin crash silencioso
- Type-check pasa

**Dependencies**: 2.11, 2.12
**Estimate**: ~1.5h

**Spec mapping**: REQ-26 (Edge Cases), proposal §Risks

---

### [x] 4.6 Tests de integración del ciclo completo

**Description**: Tests que cubren el ciclo completo: mensaje → contexto → tools → respuesta con bloques. Mock de todo el pipeline.

**Files**:

- `src/__tests__/integration/agent/auto-mode.test.ts` (NEW — ~100 lines)
- `src/__tests__/integration/agent/full-cycle.test.ts` (NEW — ~120 lines)

**Acceptance criteria**:

- Auto-mode: mock trigger → notificación generada (ESC-44)
- Full cycle: mensaje → prompt → LLM → blocks tool execution → response
- Cost tracking: token_count persistido después de conversación (ESC-48/49)
- `npx vitest run src/__tests__/integration/agent/` pasa

**Dependencies**: 4.1, 4.3
**Estimate**: ~2h

**Spec mapping**: Quality Gate Phase 4 (Auto-mode notification, Token count persisted, Full cycle)

---

### [x] 4.7 E2E test: burbuja flotante, abrir/cerrar, dock toggle

**Description**: Playwright E2E test que verifica el comportamiento visual de la burbuja: collapsed → click → repose → type → conversation → close → collapsed. Dock toggle → panel fijo. Notificación → badge visible.

**Files**:

- `e2e/agent-bubble.spec.ts` (NEW — ~80 lines)

**Acceptance criteria**:

- Test: bubble collapsed → click → panel visible
- Test: repose → type message → conversation mode
- Test: close → collapsed
- Test: dock toggle → panel se fija
- Test: notificación → badge count visible
- `npx playwright test e2e/agent-bubble.spec.ts` pasa

**Dependencies**: 1.7, 2.14
**Estimate**: ~1h

**Spec mapping**: Quality Gate Phase 4 (E2E: bubble lifecycle)

---

## Summary

| Phase         | Tasks  | New Files | Modified Files | Deleted Files | Est. Lines | Est. Time  |
| ------------- | ------ | --------- | -------------- | ------------- | ---------- | ---------- |
| 1 — UI        | 10     | 18        | 2              | 0             | ~900       | ~11h       |
| 2a — Tools    | 7      | 5         | ~18            | 0             | ~600       | ~6h        |
| 2b — Endpoint | 7      | 6         | 2              | 0             | ~1100      | ~12h       |
| 3 — Migration | 8      | 1         | ~25            | 2             | ~350       | ~3.5h      |
| 4 — Auto+Cost | 7      | 5         | 4              | 0             | ~600       | ~8h        |
| **Total**     | **39** | **35**    | **~51**        | **2**         | **~3550**  | **~40.5h** |

## Next Steps

1. **Review this tasks document** with the team before starting Phase 1
2. **Run snapshot** of `/api/admin/chat` response BEFORE Phase 2
3. **Grep full codebase** for all `SmartContextWidget` imports (informational for Phase 3 planning)
4. **Grep full codebase** for all `chat_sessions`/`chat_messages` references (informational for Phase 3 planning)
5. **Start Phase 1** (Agent Bubble UI) — highest priority, enables all downstream work
6. **PR1: Phase 1** → merge → **PR2a: Phase 2a** (tools) → **PR2b: Phase 2b** (endpoint) → **PR3: Phase 3** (migration) → **PR4: Phase 4** (auto+cost)
