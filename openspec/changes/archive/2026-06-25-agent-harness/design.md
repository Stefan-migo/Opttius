# Design: agent-harness

**Status**: Approved
**Based on**: `proposal.md`, `spec.md`, `docs/plans/2026-06-25-agent-harness-design.md`
**Stack**: Next.js 14 App Router + TypeScript 5 + React 18 + Tailwind CSS 3 + shadcn/ui
**Backend**: Supabase (Postgres, Auth, Storage, RLS) + ioredis (cache)

---

## Architecture Decisions (ADRs)

### ADR 1: Eventos estructurados vs markdown renderizado

**Decisión**: Bloques JSON tipados (`Block[]`), no markdown plano ni HTML sanitizado.

**Contexto**: El `Agent.streamChat()` actual emite `LLMStreamChunk.content` como markdown renderizado por el frontend. Para el Agent Harness, el agente necesita emitir previews, acciones, navegación, y estados — no solo texto formateado.

**Consecuencias**:

- Se define un tipo `Block` como union discriminada de 7 variantes (text, preview, action, navigation, loading, error, success).
- El endpoint `/api/agent/chat` emite `{ blocks: Block[], session_id, tool_calls? }`.
- El `BlockRenderer` es el único renderizador autorizado. No existe ruta de escape a raw markdown.
- Se elimina la necesidad de parsear markdown del lado del frontend para acciones/navegación.
- **Trade-off**: El LLM debe generar bloques estructurados. Esto requiere modificar el system prompt del agente para que emita JSON en lugar de markdown. Se implementa con un paso de post-procesamiento que parsea la respuesta del LLM y la transforma en bloques.

**Implementación**:

```typescript
// src/lib/ai/types.ts — nuevo
type BlockType =
  | "text"
  | "preview"
  | "action"
  | "navigation"
  | "loading"
  | "error"
  | "success";

interface TextBlock {
  type: "text";
  content: string;
}
interface PreviewBlock {
  type: "preview";
  entity: string;
  id: string;
  title: string;
  subtitle?: string;
  actions?: Action[];
}
interface ActionBlock {
  type: "action";
  label: string;
  variant: "primary" | "danger" | "ghost";
  action: string;
  params?: Record<string, unknown>;
}
interface NavigationBlock {
  type: "navigation";
  label: string;
  path: string;
}
interface LoadingBlock {
  type: "loading";
  label: string;
}
interface ErrorBlock {
  type: "error";
  content: string;
}
interface SuccessBlock {
  type: "success";
  content: string;
}

type Block =
  | TextBlock
  | PreviewBlock
  | ActionBlock
  | NavigationBlock
  | LoadingBlock
  | ErrorBlock
  | SuccessBlock;
```

### ADR 2: Memory loop en backend vs frontend

**Decisión**: Backend completo con cache ioredis para `getRecentContext`. El frontend solo recolecta metadata y la envía en cada request.

**Contexto**: El memory loop requiere acceso a Supabase y Transformers.js (embeddings 384d). Moverlo al frontend implicaría exponer service role o duplicar lógica.

**Argumentos**:

1. Los embeddings on-device (Transformers.js) solo corren en Node.js server-side.
2. La cache con Redis (`getRedisClient()` ya existe) reduce latencia de `getRecentContext` de ~100ms a ~5ms.
3. El frontend ya recolecta metadata (ruta, sucursal, rol) via `AgentContextProvider` — enviarla en el body del request es trivial.
4. RLS es la barrera final: todas las queries del memory loop usan el supabase autenticado del usuario.

**Implementación**:

```typescript
// Cache del memory loop
const CACHE_TTL = 300; // 5 minutos

async function getRecentContext(
  orgId: string,
  limit = 5,
): Promise<MemoryFact[]> {
  const cacheKey = `agent:recent-context:${orgId}`;
  const cached = await getRedisClient().get(cacheKey);
  if (cached) return JSON.parse(cached);

  const facts = await loadFromDB(orgId, limit);
  await getRedisClient().setex(cacheKey, CACHE_TTL, JSON.stringify(facts));
  return facts;
}
```

### ADR 3: Extensión del Agent class existente vs rewrite

**Decisión**: Extender la clase `Agent` existente (`src/lib/ai/agent/core.ts`). No rewrite.

**Contexto**: `Agent` tiene 919 líneas con 17 categorías de tools, memory manager, organizational memory, fallback de proveedores. Es funcional y probado. El spec explícitamente dice "no rewrite".

**Estrategia**:

1. Se agrega un método `streamChatStructured(userMessage, context?)` que envuelve `streamChat()` existente pero post-procesa la respuesta final en `Block[]`.
2. Se agrega un campo opcional `screenContext: AgentScreenContext` a `AgentOptions`.
3. El memory loop existente (`loadSessionHistory`, `loadOrganizationalContext`, `initializeMemoryManager`) se reutiliza sin cambios.
4. Se agrega un paso opcional de "structured output parsing" después del LLM call.

```typescript
// Extensión mínima
export interface AgentScreenContext {
  route: string;
  section?: string;
  branchId: string | null;
  branchName?: string;
  role: string;
  orgId: string;
}

// Nuevo método en Agent
async *streamChatStructured(
  userMessage: string,
  screenContext?: AgentScreenContext,
): AsyncGenerator<{ blocks?: Block[]; error?: string; done: boolean }> {
  // 1. Inyectar screenContext en la capa 3 del prompt
  // 2. Llamar streamChat() existente
  // 3. Post-procesar respuesta: LLMChunk → Block[]
  // 4. Yield bloques
}
```

### ADR 4: Tablas nuevas vs modificar existentes

**Decisión**: Tablas nuevas diseñadas pero NO creadas. Todo persiste en tablas legacy (`chat_sessions`, `chat_messages`, `memory_facts`). Esperar a `database-reformation` para migrar.

**Contexto**: El spec define 5 tablas nuevas (`agent_conversations`, `agent_messages`, `agent_memories`, `agent_prompts`, `agent_user_prefs`) y el invariante "NO schema mutations". El proposal es explícito: "sin migraciones de DB hasta database-reformation".

**Estrategia de persistencia**:

- `chat_sessions` → conversaciones del agente (campo `type` para distinguir agent vs legacy).
- `chat_messages` → mensajes con `metadata: { blocks: Block[], tool_calls, screen_context }` en JSONB.
- `memory_facts` → memoria organizacional (el tipo `factType` existente ya cubre `preference | decision | context | workflow | insight`).
- `ai_usage_log` → cost tracking (tabla existente).
- `agent_user_prefs` → NO hay tabla legacy; se usa `localStorage` en Phase 1-3, y se migra a tabla nueva en Phase 4.

**Nota**: `agent_user_prefs` es la única tabla sin equivalente legacy. Para Phase 2-3 se guardan preferencias en una key de `localStorage` con schema tipado. En Phase 4 se crea la tabla `agent_user_prefs`.

### ADR 5: Filtrado de tools por rol

**Decisión**: `getAllTools(role?)` filter function pura que retorna `ToolDefinition[]` filtrado. No se filtra por prompt ni se instruye al LLM que ignore tools.

**Contexto**: Si el LLM ve una tool en la lista de herramientas, puede invocarla. El spec dice: "el agente no tiene la herramienta". Filtrar por prompt es frágil (el LLM puede ignorar la instrucción). Filtrar en el registry es determinista.

**Implementación**:

```typescript
// Extensión de ToolDefinition
export type ToolType = "db" | "navigation" | "context" | "memory";
export type Role = "vendedor" | "admin" | "dueño";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: ToolFunction;
  requiresConfirmation?: boolean;
  category?: string;
  zodSchema?: z.ZodTypeAny;
  // NUEVOS:
  type?: ToolType; // db | navigation | context | memory
  minRole?: Role; // mínimo rol requerido (default: "vendedor")
}

// Filter function pura
export function getAllTools(role?: Role): ToolDefinition[] {
  if (!role)
    return allTools.filter((t) => !t.minRole || t.minRole === "vendedor");

  const roleHierarchy: Record<Role, number> = {
    vendedor: 0,
    admin: 1,
    dueño: 2,
  };

  const userLevel = roleHierarchy[role] ?? 0;

  return allTools.filter((tool) => {
    if (!tool.minRole) return true; // default: todos
    return roleHierarchy[tool.minRole] <= userLevel;
  });
}
```

**Jerarquía de roles**: `vendedor` (0) < `admin` (1) < `dueño` (2).

| Tool                 | minRole  | vendedor          | admin | dueño |
| -------------------- | -------- | ----------------- | ----- | ----- |
| `searchCustomer`     | vendedor | ✅                | ✅    | ✅    |
| `deleteCustomer`     | admin    | ❌                | ✅    | ✅    |
| `updateOrgConfig`    | dueño    | ❌                | ❌    | ✅    |
| `navigateTo`         | vendedor | ✅                | ✅    | ✅    |
| `getFinancialReport` | admin    | ❌                | ✅    | ✅    |
| `saveMemory`         | vendedor | ✅ (solo lectura) | ✅    | ✅    |

Nota: Para `saveMemory`, el control de solo lectura vs escritura se implementa como validación adicional en el `execute` de la tool, no en el filtrado (la tool está visible pero falla si el rol no tiene permiso de escritura).

---

## Component Tree (Phase 1)

```
AgentBubbleContainer          ← client component, integra bubble + context al layout admin
└── AgentContextProvider       ← React Context, escucha ruta/sucursal/rol
    └── AgentBubble            ← container con estados
        ├── BubbleFloatingButton  ← círculo flotante + badge de notificación
        │   ├── PulseAnimation    ← animación cuando hay notificación
        │   └── BadgeCount        ← contador (oculto si 0)
        ├── BubblePanel           ← panel expandido (flotante o fijo)
        │   ├── BubbleHeader      ← título, close, pin (fijar como dock)
        │   │   ├── DockToggle    ← alterna flotante/fijo
        │   │   └── CloseButton
        │   ├── BubbleMessages    ← scroll de conversación
        │   │   └── MessageBlock[] ← array de bloques renderizados
        │   │       └── BlockRenderer ← dispatcher por type
        │   │           ├── TextBlock
        │   │           ├── PreviewBlock
        │   │           ├── ActionBlock
        │   │           ├── NavigationBlock
        │   │           ├── LoadingBlock
        │   │           ├── ErrorBlock
        │   │           └── SuccessBlock
        │   ├── BubbleInput       ← textarea + send button
        │   │   ├── TextArea      ← auto-resize
        │   │   └── SendButton
        │   └── BubbleSuggestions ← texto contextual en estado reposo
        │       └── SuggestionChip[] ← preguntas rápidas sugeridas
        └── [NotificationToast]   ← toast opcional cuando agente inicia
```

### Estados de AgentBubble

| Estado         | Visual                                     | Comportamiento                              |
| -------------- | ------------------------------------------ | ------------------------------------------- |
| `collapsed`    | Círculo flotante, sin badge                | Click → abre en reposo                      |
| `repose`       | Panel con saludo contextual, sin historial | Muestra sugerencias según pantalla          |
| `conversation` | Panel con historial + input + bloques      | Input habilitado, scroll activo             |
| `notification` | Círculo + badge con count                  | Pulse animation, click abre en conversación |
| `docked`       | Panel fijo lateral (400px)                 | Persiste entre navegaciones                 |

### Integración en Layout

```tsx
// src/app/admin/layout.tsx (modificación mínima)
<AgentContextProvider>
  <AdminSidebar />
  <main>{children}</main>
  <AgentBubbleContainer />
</AgentContextProvider>
```

`AgentBubbleContainer` es un client component que renderiza `AgentBubble` envuelto en `AgentContextProvider` y solo es visible en rutas admin (no en landing/auth).

---

## Data Flow

### Flujo de request (Phase 2+)

```
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js Client)                                           │
│                                                                     │
│  AgentContextProvider                                                │
│    ├── usePathname() → route                                        │
│    ├── AuthContext → role, orgId, userId                             │
│    └── BranchSelector → branchId, branchName                        │
│          │                                                          │
│          │ metadata recolectada en cada render                       │
│          │ se envía en el body del POST, no como stream continuo     │
│          ▼                                                          │
│  AgentBubble → usuario escribe mensaje                              │
│       │                                                             │
│       │ POST /api/agent/chat                                        │
│       │ { message, session_id, context: { route, branch_id,         │
│       │   role, org_id } }                                          │
│       ▼                                                             │
└─────────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│ BACKEND (Next.js Route Handler)                                     │
│                                                                     │
│  POST /api/agent/chat                                               │
│    │                                                                │
│    1. Auth + Tier validation (reusar de chat route)                 │
│    2. Construir AgentSession desde body                             │
│       { userId, role, orgId, branchId, screenRoute }               │
│    3. Memory Loop (secuencial, cacheado):                           │
│       ├── getRecentContext(orgId, 5) ──cached── Redis (5 min TTL)   │
│       └── searchOrgMemory(message, orgId) ──pgvector─────────┐     │
│   4. Build Prompt 4-capas:                                      │    │
│       Layer 1 (Sistema): identidad agente + constraints           │    │
│       Layer 2 (Rol): personalidad según vendedor/admin/dueño     │    │
│       Layer 3 (Contexto): route actual, branch, alertas          │    │
│       Layer 4 (Memoria): output del memory loop                 │    │
│       + Tools filtradas por rol (getAllTools(role))              │    │
│   5. LLM Call (multi-provider con fallback):                      │    │
│       ├── streamChatStructured(userMessage)                      │    │
│       ├── LLM → texto + tool_calls                               │    │
│       └── Tool execution loop (maxSteps)                         │    │
│   6. Post-process → Block[]                                       │    │
│   7. SSE stream: eventos { blocks, session_id, done }            │    │
│       │                                                          │    │
│       ▼                                                          │    │
└──────────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│ FRONTEND (receives SSE stream)                                      │
│                                                                     │
│  BubbleMessages recibe bloques incrementalmente                     │
│    ├── TextBlock → renderizado inline                               │
│    ├── PreviewBlock → card con entity info + actions                │
│    ├── ActionBlock → botón clickable                                │
│    ├── NavigationBlock → link que usa router.push()                 │
│    ├── LoadingBlock → spinner durante tool execution                │
│    ├── ErrorBlock → mensaje de error estilizado                     │
│    └── SuccessBlock → confirmación                                  │
│                                                                     │
│  NavigationBlock handler:                                           │
│    NO ejecuta server-side redirect                                  │
│    Usa next/navigation useRouter → router.push(path)                │
└─────────────────────────────────────────────────────────────────────┘
```

### Flujo de metadata (sin request activo)

`AgentContextProvider` escucha cambios de ruta/sucursal/rol mediante React hooks (`usePathname`, useEffect en cambios de estado global). No envía nada al backend hasta que el usuario envía un mensaje. En ese momento, toda la metadata fresca se serializa en el body del POST.

---

## Route / API Design

### Endpoints

| Method  | Path                     | Description                                     | Auth                       |
| ------- | ------------------------ | ----------------------------------------------- | -------------------------- |
| `POST`  | `/api/agent/chat`        | Nuevo endpoint de agente con bloques y contexto | Supabase SSR + admin check |
| `GET`   | `/api/agent/preferences` | Obtener preferencias del usuario                | Supabase SSR               |
| `PATCH` | `/api/agent/preferences` | Actualizar preferencias                         | Supabase SSR               |

### POST /api/agent/chat — Contract

**Request**:

```json
{
  "message": "¿Qué clientes cumplen años este mes?",
  "session_id": "uuid-optional",
  "context": {
    "route": "/admin/customers",
    "section": "customers",
    "branch_id": "uuid-or-null",
    "branch_name": "Sucursal Centro",
    "role": "admin",
    "org_id": "uuid"
  }
}
```

**Response** (SSE stream):

```
event: block
data: {"type": "text", "content": "Encontrados 3 clientes..."}

event: block
data: {"type": "preview", "entity": "customer", "id": "uuid", "title": "Juan Pérez", "subtitle": "15 junio", "actions": []}

event: done
data: {"session_id": "uuid", "token_count": { "prompt": 450, "completion": 120 }}
```

**Validation**:

- `message` requerido → 400 si falta
- `context.role`, `context.org_id` requeridos → 400 si falta
- Auth fail → 401
- Tier quota excedido → 429 con `Retry-After`
- Error interno → 500 con mensaje genérico

### Relación con endpoint legacy

| Aspecto     | `/api/admin/chat` (legacy) | `/api/agent/chat` (nuevo)                     |
| ----------- | -------------------------- | --------------------------------------------- |
| Response    | Markdown via SSE           | `Block[]` via SSE                             |
| Context     | `section` opcional         | `context` completo (route, branch, role, org) |
| Session     | `chat_sessions`            | `chat_sessions` (misma tabla)                 |
| Tools       | `getAllTools()` sin filtro | `getAllTools(role)` filtrado                  |
| Memory loop | No                         | Sí (getRecentContext + searchOrgMemory)       |
| Estado      | Se mantiene                | Convive en paralelo                           |

**Invariante**: `/api/admin/chat` NO se modifica. Sus tests deben seguir pasando.

---

## Tool Architecture

### Extensión de ToolDefinition

```typescript
// src/lib/ai/tools/types.ts — modificado
export type ToolType = "db" | "navigation" | "context" | "memory";
export type Role = "vendedor" | "admin" | "dueño";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: ToolFunction;
  requiresConfirmation?: boolean;
  category?: string;
  zodSchema?: z.ZodTypeAny;
  // NUEVOS campos (opcionales, backward-compat):
  type?: ToolType; // default: "db"
  minRole?: Role; // default: "vendedor" (todos pueden usarla)
}
```

### getToolsForRole (filter function pura)

```typescript
// src/lib/ai/tools/index.ts — modificado
const ROLE_HIERARCHY: Record<Role, number> = {
  vendedor: 0,
  admin: 1,
  dueño: 2,
};

export function getAllTools(role?: Role): ToolDefinition[] {
  if (!role)
    return allTools.filter((t) => !t.minRole || t.minRole === "vendedor");

  const userLevel = ROLE_HIERARCHY[role] ?? 0;

  return allTools.filter((tool) => {
    if (!tool.minRole) return true;
    return ROLE_HIERARCHY[tool.minRole] <= userLevel;
  });
}
```

### Nuevas tools

#### Navegación

| Tool               | type       | minRole  | Descripción                                                |
| ------------------ | ---------- | -------- | ---------------------------------------------------------- |
| `navigateTo`       | navigation | vendedor | Navega a ruta específica. Retorna `NavigationBlock`.       |
| `openEntity`       | navigation | vendedor | Navega a detalle de entidad (ej: `/admin/customers/{id}`). |
| `reopenLastScreen` | navigation | vendedor | Navega a ruta anterior via `router.back()`.                |

```typescript
// src/lib/ai/tools/navigation.ts — nuevo
export const navigationTools: ToolDefinition[] = [
  {
    name: "navigateTo",
    description:
      "Navigate the user to a specific admin route. Returns a navigation block.",
    type: "navigation",
    minRole: "vendedor",
    category: "navigation",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Admin route path, e.g. /admin/customers",
        },
        label: {
          type: "string",
          description: "Human-readable label for the link",
        },
      },
      required: ["path", "label"],
    },
    execute: async (params) => ({
      success: true,
      data: { type: "navigation", label: params.label, path: params.path },
    }),
  },
  // openEntity, reopenLastScreen...
];
```

**Nota crucial**: Las tools de navegación NO ejecutan redirects server-side. Devuelven un `NavigationBlock` que el frontend procesa con `next/navigation` `useRouter`.

#### Contexto

| Tool                  | type    | minRole  | Descripción                                        |
| --------------------- | ------- | -------- | -------------------------------------------------- |
| `getScreenContext`    | context | vendedor | Ruta actual, sección, sucursal, rol.               |
| `getActiveFormData`   | context | vendedor | Datos serializados del formulario activo (o null). |
| `getSelectedCustomer` | context | vendedor | Cliente seleccionado en contexto actual.           |
| `getCartContents`     | context | vendedor | Items del carrito POS activo (o null).             |

#### Memoria

| Tool                 | type   | minRole  | Descripción                                   |
| -------------------- | ------ | -------- | --------------------------------------------- |
| `searchOrgMemory`    | memory | vendedor | Búsqueda semántica en memoria organizacional. |
| `saveMemory`         | memory | vendedor | Guarda fact (solo lectura para vendedor).     |
| `getRecentContext`   | memory | vendedor | Últimos facts de la org (cacheado).           |
| `saveSessionSummary` | memory | admin    | Persiste resumen de interacción.              |
| `getUserPreferences` | memory | vendedor | Preferencias del usuario actual.              |
| `setUserPreference`  | memory | vendedor | Actualiza preferencia.                        |

### Migración de tools existentes con minRole

Solo un subconjunto de tools existentes necesita `minRole` explícito. Las tools sin `minRole` se consideran `vendedor` (default).

| Tool existente       | minRole a asignar |
| -------------------- | ----------------- |
| `deleteCustomer`     | admin             |
| `deleteProduct`      | admin             |
| `deleteCategory`     | admin             |
| `deleteWorkOrder`    | admin             |
| `updateOrgConfig`    | dueño             |
| `getFinancialReport` | admin             |
| `updateSystemConfig` | dueño             |
| `importBulk`         | admin             |

El resto (getProducts, searchCustomer, createOrder, etc.) se quedan sin `minRole` (default: vendedor).

---

## Memory Architecture

### Pipeline de memoria por request

```
1. Llega mensaje del usuario + contexto
       │
2. Memory Loop (ejecutado ANTES del LLM call):
       │
       ├── 2a. getRecentContext(orgId, limit=5)
       │       └── cache: Redis key "agent:recent-context:{orgId}" TTL 5 min
       │       └── fallback: query a memory_facts
       │
       └── 2b. searchOrgMemory(userMessage, orgId)
               └── Transformers.js embedding → pgvector search
               └── match_threshold: 0.7, match_count: 5
               └── NO cache (semántico, depende del mensaje)
       │
3. Resultados inyectados en Layer 4 del system prompt
       │
4. LLM Call con prompt completo + tools filtradas
       │
5. [Al cerrar sesión] saveSessionSummary()
       ├── trigger: (a) minimizar burbuja, (b) timeout 5 min inactividad, (c) explícito
       └── persiste en memory_facts con factType: "insight"
```

### Cache strategy

| Query                     | Cache   | TTL   | Invalidez                                                                  |
| ------------------------- | ------- | ----- | -------------------------------------------------------------------------- |
| `getRecentContext(orgId)` | ioredis | 5 min | Escritura en `memory_facts` podría invalidar, pero TTL corto es suficiente |
| `searchOrgMemory(query)`  | No      | —     | Semántico, query-dependiente                                               |

### Almacenamiento (sin tablas nuevas)

| Dato           | Tabla legacy    | Campo                                                                |
| -------------- | --------------- | -------------------------------------------------------------------- | ----------- | --------- | ------------ | ------ | ---------- |
| Conversaciones | `chat_sessions` | Se agrega `type: "agent"` para distinguir (en metadata JSONB)        |
| Mensajes       | `chat_messages` | `metadata.blocks`, `metadata.screen_context`, `metadata.token_count` |
| Memory facts   | `memory_facts`  | `factType: "decision"                                                | "discovery" | "pattern" | "preference" | "fact" | "summary"` |
| Cost tracking  | `ai_usage_log`  | Ya existe, sin cambios                                               |
| User prefs     | `localStorage`  | Temporal hasta Phase 4                                               |

### saveSessionSummary

```typescript
async function saveSessionSummary(
  sessionId: string,
  summary: string,
  metadata: { messageCount: number; tokenCount: number; screenRoute?: string },
): Promise<void> {
  // Persiste en memory_facts como "summary"
  await supabase.from("memory_facts").insert({
    user_id: userId,
    fact_type: "insight",
    category: "agent_summary",
    content: summary,
    importance: 3,
    source_session_id: sessionId,
    metadata: {
      message_count: metadata.messageCount,
      token_count: metadata.tokenCount,
      screen_route: metadata.screenRoute,
    },
  });

  // Actualiza chat_sessions metadata
  await supabase
    .from("chat_sessions")
    .update({
      metadata: {
        summary,
        message_count: metadata.messageCount,
        token_count: metadata.tokenCount,
      },
    })
    .eq("id", sessionId);
}
```

---

## Phase Plan

### Phase 1 — Agent Bubble UI + Block Renderer + Context Provider

**Duración estimada**: 1 sprint

| #    | Tarea                                                           | Archivos                                                                             |
| ---- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1.1  | Definir tipos `Block`, `AgentContext`, `BubbleState`            | `src/lib/ai/types.ts` (mod)                                                          |
| 1.2  | Crear `AgentContextProvider`                                    | `src/components/ai/AgentContextProvider.tsx` (new)                                   |
| 1.3  | Crear `BlockRenderer` con 7 sub-componentes                     | `src/components/ai/BlockRenderer.tsx` (new), `src/components/ai/blocks/*.tsx` (new)  |
| 1.4  | Crear `BubbleFloatingButton` con badge + pulse                  | `src/components/ai/BubbleFloatingButton.tsx` (new)                                   |
| 1.5  | Crear `BubblePanel` con header + messages + input               | `src/components/ai/BubblePanel.tsx` (new)                                            |
| 1.6  | Crear `BubbleSuggestions` con chips contextuales                | `src/components/ai/BubbleSuggestions.tsx` (new)                                      |
| 1.7  | Crear `AgentBubble` container con manejo de estados             | `src/components/ai/AgentBubble.tsx` (new)                                            |
| 1.8  | Crear `AgentBubbleContainer` e integrar en admin layout         | `src/components/ai/AgentBubbleContainer.tsx` (new), `src/app/admin/layout.tsx` (mod) |
| 1.9  | Tests unitarios: BlockRenderer (7 fixtures), estados del bubble | `src/__tests__/unit/components/ai/`                                                  |
| 1.10 | Type-check + build                                              | —                                                                                    |

**Gate**: Bubble renderizado en admin layout con todos los estados. BlockRenderer pasa tests con fixtures de cada tipo.

### Phase 2 — Agent API + Agent Loop + Tools

**Duración estimada**: 2 sprints

| #    | Tarea                                                                                               | Archivos                                   |
| ---- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 2.1  | Extender `ToolDefinition` con `type`, `minRole`                                                     | `src/lib/ai/tools/types.ts` (mod)          |
| 2.2  | Modificar `getAllTools(role?)` con filtro por jerarquía                                             | `src/lib/ai/tools/index.ts` (mod)          |
| 2.3  | Crear tools de navegación (navigateTo, openEntity, reopenLastScreen)                                | `src/lib/ai/tools/navigation.ts` (new)     |
| 2.4  | Crear tools de contexto (getScreenContext, getActiveFormData, getSelectedCustomer, getCartContents) | `src/lib/ai/tools/context.ts` (new)        |
| 2.5  | Crear tools de memoria (searchOrgMemory, saveMemory, getRecentContext, saveSessionSummary)          | `src/lib/ai/tools/memory.ts` (new)         |
| 2.6  | Agregar memory loop con cache Redis                                                                 | `src/lib/ai/memory/agent-loop.ts` (new)    |
| 2.7  | Extender `Agent` con `streamChatStructured()` y post-procesamiento                                  | `src/lib/ai/agent/core.ts` (mod)           |
| 2.8  | Crear endpoint `POST /api/agent/chat` con SSE de bloques                                            | `src/app/api/agent/chat/route.ts` (new)    |
| 2.9  | Crear `AgentSession` builder a partir de metadata                                                   | `src/lib/ai/agent/session.ts` (new)        |
| 2.10 | Construir prompt de 4 capas                                                                         | `src/lib/ai/agent/prompt-builder.ts` (new) |
| 2.11 | Conectar Bubble frontend al endpoint                                                                | `src/components/ai/AgentBubble.tsx` (mod)  |
| 2.12 | Asignar `minRole` a tools existentes (deleteCustomer, deleteProduct, etc.)                          | `src/lib/ai/tools/*.ts` (mod)              |
| 2.13 | Tests: POST /api/agent/chat, getAllTools filtering, memory loop                                     | `src/__tests__/integration/api/agent/`     |
| 2.14 | Verificar legacy /api/admin/chat sin cambios                                                        | Tests existentes                           |

**Gate**: POST /api/agent/chat responde con bloques. Tools filtradas por rol. Legacy endpoint intacto.

### Phase 3 — Deprecación + Reemplazo

**Duración estimada**: 1 sprint

| #   | Tarea                                                              | Archivos                                                                                      |
| --- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 3.1 | Reemplazar SmartContextWidget por AgentBubble en todos los layouts | `src/components/admin/InsightsFloatingButton.tsx` (mod), varios layouts                       |
| 3.2 | Eliminar `SmartContextWidget.tsx`                                  | `src/components/ai/SmartContextWidget.tsx` (del)                                              |
| 3.3 | Marcar rutas `/api/ai/insights/*` como deprecadas                  | `src/app/api/ai/insights/route.ts` (mod — comentario @deprecated)                             |
| 3.4 | Marcar componentes legacy como deprecados                          | `InsightCard.tsx`, `GenerateInsightsButton.tsx`, `InsightDetailDialog.tsx` (mod — comentario) |
| 3.5 | Marcar referencias a `chat_sessions`/`chat_messages` como legacy   | Archivos que usan estas tablas (mod — comentario)                                             |
| 3.6 | Crear shim de compatibilidad para consumidores existentes          | `src/components/ai/AgentBubbleContainer.tsx` (mod — wrapper)                                  |
| 3.7 | Documentar plan de migración a tablas nuevas                       | `docs/migrations/agent-tables-migration-plan.md` (new)                                        |
| 3.8 | Grep de referencias remanentes + type-check                        | —                                                                                             |

**Gate**: SmartContextWidget eliminado. `npm run type-check` pasa. Insights routes funcionales.

### Phase 4 — Auto Mode + Cost Tracking + Polish

**Duración estimada**: 2 sprints

| #   | Tarea                                                                        | Archivos                                       |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------- |
| 4.1 | Implementar trigger engine para auto-mode (stock bajo, citas, work orders)   | `src/lib/ai/agent/auto-trigger.ts` (new)       |
| 4.2 | Crear UI de preferencias del agente (auto_mode, bubble_position, agent_tone) | `src/components/ai/AgentPreferences.tsx` (new) |
| 4.3 | Implementar cost tracking: token_count por conversación                      | `src/lib/ai/usage-logger.ts` (mod)             |
| 4.4 | Rate limiting y timeouts en endpoint                                         | `src/app/api/agent/chat/route.ts` (mod)        |
| 4.5 | Edge cases: error recovery, tool execution fallo, LLM timeout                | `src/lib/ai/agent/core.ts` (mod)               |
| 4.6 | Tests de integración del ciclo completo                                      | `src/__tests__/integration/agent/`             |
| 4.7 | E2E: burbuja flotante, abrir/cerrar, fijar panel                             | `e2e/agent-bubble.spec.ts` (new)               |

**Gate**: Auto-mode notifica stock bajo. Cost tracking persiste. Tests de integración pasan.

---

## Testing Strategy

### Unit Tests

| Test                   | Descripción                                             | Fixtures                                         |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `BlockRenderer`        | Renderiza correctamente los 7 tipos de bloque           | `blocks.fixture.ts` con 1 ejemplo por tipo       |
| `getAllTools(role)`    | Filtra correctamente por rol                            | Combinaciones: vendedor, admin, dueño, undefined |
| `getRecentContext`     | Cache funcionando                                       | Mock de Redis + DB                               |
| `AgentSession builder` | Construye sesión desde metadata válida e inválida       | Payloads completos e incompletos                 |
| `Bubble estados`       | Transiciones collapsed→repose→conversation→notification | State machine                                    |

### Integration Tests

| Test                   | Descripción                            | Mock                                     |
| ---------------------- | -------------------------------------- | ---------------------------------------- |
| `POST /api/agent/chat` | Endpoint responde con bloques          | Mock LLM que devuelve tool_calls + texto |
| `POST /api/agent/chat` | Error 400 en contexto inválido         | Payload sin role/org_id                  |
| `POST /api/agent/chat` | Error 401 sin auth                     | Request sin cookie                       |
| `POST /api/agent/chat` | 429 en tier excedido                   | Mock tier-validator                      |
| Memory loop            | prompt layers inyectados correctamente | Mock getRecentContext + searchOrgMemory  |
| `saveSessionSummary`   | Persiste en memory_facts               | Mock Supabase                            |

### E2E Tests

| Test                       | Descripción                                        |
| -------------------------- | -------------------------------------------------- |
| Bubble collapsed → abierto | Click en círculo, ver panel                        |
| Bubble abierto → collapsed | Click en close, ver círculo                        |
| Notificación aparece       | Badge count visible + pulse animation              |
| Dock toggle                | Panel se fija como sidebar (400px)                 |
| Navegación desde block     | Click en NavigationBlock → router.push() ejecutado |

### Snapshot Test

```typescript
// Legacy endpoint invariant (Phase 2)
test("/api/admin/chat no cambia", async () => {
  const response = await fetch("/api/admin/chat", {
    method: "POST",
    body: JSON.stringify({ message: "test" }),
  });
  // Comparar respuesta con snapshot pre-aprobado
  expect(response.body).toMatchSnapshot("legacy-chat-response");
});
```

---

## File Changes Summary

### Phase 1 — UI

| File                                                      | Acción                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| `src/lib/ai/types.ts`                                     | MOD — agregar tipos `Block`, `BubbleState`, `AgentContext` |
| `src/components/ai/AgentContextProvider.tsx`              | NEW                                                        |
| `src/components/ai/BlockRenderer.tsx`                     | NEW                                                        |
| `src/components/ai/blocks/TextBlock.tsx`                  | NEW                                                        |
| `src/components/ai/blocks/PreviewBlock.tsx`               | NEW                                                        |
| `src/components/ai/blocks/ActionBlock.tsx`                | NEW                                                        |
| `src/components/ai/blocks/NavigationBlock.tsx`            | NEW                                                        |
| `src/components/ai/blocks/LoadingBlock.tsx`               | NEW                                                        |
| `src/components/ai/blocks/ErrorBlock.tsx`                 | NEW                                                        |
| `src/components/ai/blocks/SuccessBlock.tsx`               | NEW                                                        |
| `src/components/ai/BubbleFloatingButton.tsx`              | NEW                                                        |
| `src/components/ai/BubblePanel.tsx`                       | NEW                                                        |
| `src/components/ai/BubbleMessages.tsx`                    | NEW                                                        |
| `src/components/ai/BubbleInput.tsx`                       | NEW                                                        |
| `src/components/ai/BubbleHeader.tsx`                      | NEW                                                        |
| `src/components/ai/BubbleSuggestions.tsx`                 | NEW                                                        |
| `src/components/ai/AgentBubble.tsx`                       | NEW                                                        |
| `src/components/ai/AgentBubbleContainer.tsx`              | NEW                                                        |
| `src/app/admin/layout.tsx`                                | MOD — agregar `AgentBubbleContainer`                       |
| `src/__tests__/unit/components/ai/AgentBubble.test.tsx`   | NEW                                                        |
| `src/__tests__/unit/components/ai/BlockRenderer.test.tsx` | NEW                                                        |

### Phase 2 — API + Tools

| File                                                | Acción                                                        |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `src/lib/ai/tools/types.ts`                         | MOD — agregar `type`, `minRole` a `ToolDefinition`            |
| `src/lib/ai/tools/index.ts`                         | MOD — `getAllTools(role?)`                                    |
| `src/lib/ai/tools/navigation.ts`                    | NEW                                                           |
| `src/lib/ai/tools/context.ts`                       | NEW                                                           |
| `src/lib/ai/tools/memory.ts`                        | NEW                                                           |
| `src/lib/ai/tools/*.ts`                             | MOD — asignar `minRole` a deleteCustomer, deleteProduct, etc. |
| `src/lib/ai/agent/core.ts`                          | MOD — agregar `streamChatStructured()`, `screenContext`       |
| `src/lib/ai/agent/session.ts`                       | NEW — `AgentSession` builder                                  |
| `src/lib/ai/agent/prompt-builder.ts`                | NEW — 4-capas prompt constructor                              |
| `src/lib/ai/memory/agent-loop.ts`                   | NEW — memory loop con cache Redis                             |
| `src/app/api/agent/chat/route.ts`                   | NEW                                                           |
| `src/app/api/agent/preferences/route.ts`            | NEW                                                           |
| `src/components/ai/AgentBubble.tsx`                 | MOD — conectar al endpoint                                    |
| `src/__tests__/integration/api/agent/chat.test.ts`  | NEW                                                           |
| `src/__tests__/unit/lib/ai/tools/filtering.test.ts` | NEW                                                           |

### Phase 3 — Deprecación

| File                                              | Acción                              |
| ------------------------------------------------- | ----------------------------------- |
| `src/components/ai/SmartContextWidget.tsx`        | DEL                                 |
| `src/components/ai/SmartContextWidget.test.tsx`   | DEL                                 |
| `src/components/ai/InsightCard.tsx`               | MOD — comentario @deprecated        |
| `src/components/ai/GenerateInsightsButton.tsx`    | MOD — comentario @deprecated        |
| `src/components/ai/InsightDetailDialog.tsx`       | MOD — comentario @deprecated        |
| `src/components/admin/InsightsFloatingButton.tsx` | MOD — reemplazar SmartContextWidget |
| `src/app/api/ai/insights/route.ts`                | MOD — comentario @deprecated        |
| `docs/migrations/agent-tables-migration-plan.md`  | NEW                                 |

### Phase 4 — Auto + Cost

| File                                                | Acción                                    |
| --------------------------------------------------- | ----------------------------------------- |
| `src/lib/ai/agent/auto-trigger.ts`                  | NEW                                       |
| `src/components/ai/AgentPreferences.tsx`            | NEW                                       |
| `src/lib/ai/usage-logger.ts`                        | MOD — extender con token_count por sesión |
| `src/app/api/agent/chat/route.ts`                   | MOD — rate limiting, timeouts             |
| `src/__tests__/integration/agent/auto-mode.test.ts` | NEW                                       |
| `e2e/agent-bubble.spec.ts`                          | NEW                                       |

### Sin cambios

| Archivo                   | Razón                                    |
| ------------------------- | ---------------------------------------- |
| `src/app/api/admin/chat/` | Legacy, debe seguir funcionando idéntico |
| `src/lib/ai/embeddings/`  | Transformers.js ya existe y funciona     |
| `src/lib/redis/`          | ioredis ya existe y se reusa             |
| `src/lib/ai/factory.ts`   | LLMFactory no se modifica                |
| `src/lib/ai/knowledge/`   | No se toca                               |

---

## Diagrama de Secuencia (Flujo Completo)

```
Usuario            AgentBubble        AgentContext        POST /api/agent/chat    Agent Core      Memory Loop     LLM Provider
   │                    │                  │                      │                   │                │               │
   │  navigates admin   │                  │                      │                   │                │               │
   │───────────────────>│                  │                      │                   │                │               │
   │                    │  usePathname()   │                      │                   │                │               │
   │                    │─────────────────>│                      │                   │                │               │
   │                    │  updates context  │                     │                   │                │               │
   │                    │<─────────────────│                      │                   │                │               │
   │                    │                  │                      │                   │                │               │
   │  clicks bubble     │                  │                      │                   │                │               │
   │───────────────────>│                  │                      │                   │                │               │
   │                    │  collapsed→repose│                      │                   │                │               │
   │                    │  show greeting   │                      │                   │                │               │
   │  types message     │                  │                      │                   │                │               │
   │───────────────────>│                  │                      │                   │                │               │
   │                    │ repose→conversation                     │                   │                │               │
   │                    │  POST /agent/chat─┐                     │                   │                │               │
   │                    │───────────────────│─────────────────────>│                   │                │               │
   │                    │                   │                     │  auth + validate   │                │               │
   │                    │                   │                     │  build session     │                │               │
   │                    │                   │                     │──────────────────>│                │               │
   │                    │                   │                     │                   │  memory loop    │               │
   │                    │                   │                     │                   │────────────────>│               │
   │                    │                   │                     │                   │                │  getRecentCtx  │
   │                    │                   │                     │                   │                │  searchOrgMem  │
   │                    │                   │                     │                   │<────────────────│               │
   │                    │                   │                     │  build 4-layer    │                │               │
   │                    │                   │                     │  prompt + tools   │                │               │
   │                    │                   │                     │──────────────────>│                │               │
   │                    │                   │                     │  LLM call         │                │               │
   │                    │                   │                     │──────────────────────────────────────────────────>│
   │                    │                   │                     │                   │                │               │
   │                    │                   │                     │    tool_calls loop│                │               │
   │                    │                   │                     │<──────────────────────────────────────────────────│
   │                    │                   │                     │                   │                │               │
   │                    │                   │                     │  post-process     │                │               │
   │                    │                   │                     │  → Block[]        │                │               │
   │                    │  SSE: blocks      │                     │                   │                │               │
   │                    │<───────────────────────────────────────│                   │                │               │
   │  render blocks     │                  │                      │                   │                │               │
   │<───────────────────│                  │                      │                   │                │               │
   │                    │                  │                      │                   │                │               │
   │  [minimizes]       │                  │                      │                   │                │               │
   │───────────────────>│                  │                      │                   │                │               │
   │                    │  saveSessionSumm.─┐                    │                   │                │               │
   │                    │───────────────────│────────────────────>│                   │                │               │
```

---

## Riesgos y Mitigaciones Técnicas

| Riesgo                                             | Probabilidad | Mitigación                                                                |
| -------------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| Bubble flotante interfiere con POS/forms           | Media        | z-index controlado, collide detection, opción dock                        |
| Endpoint nuevo duplica lógica legacy               | Baja         | `Agent` core compartido, endpoint es wrapper thin                         |
| Tools de navegación rompen con client-side routing | Baja         | Backend solo devuelve paths; frontend usa `next/navigation`               |
| Memory loop incrementa latencia                    | Media        | cache Redis para `getRecentContext` (TTL 5 min, ~5ms vs ~100ms)           |
| Transformers.js embedding lento (500-2000ms)       | Media        | `searchOrgMemory` corre en paralelo con `getRecentContext`; timeout de 3s |
| Filtrado por rol se salta RLS                      | Baja         | Tools usan `supabase` autenticado del usuario. RLS es barrera final       |
| SmartContextWidget references remanentes           | Baja         | Grep antes de eliminar + type-check como gate                             |
