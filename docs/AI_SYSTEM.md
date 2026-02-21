# Sistema de IA de Opttius

**Documento base del módulo de IA** — Chat, Insights y Herramientas para ópticas.

**Versión:** 1.0  
**Fecha:** 2026-02-21  
**Skill asociado:** `.cursor/skills/ai-optical-supabase/SKILL.md`

---

## 1. Introducción

El sistema de IA de Opttius es un módulo integral que proporciona:

1. **Chat IA**: Asistente conversacional con acceso a datos en tiempo real mediante herramientas (tool calling).
2. **Insights Inteligentes**: Recomendaciones contextuales generadas por LLM, adaptadas a la madurez organizacional.
3. **Knowledge Base**: RAG (Retrieval Augmented Generation) para documentación del sistema.

Está diseñado específicamente para ópticas: terminología óptica, flujos de laboratorio, prescripciones, inventario de lentes y marcos.

---

## 2. Arquitectura

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  Chatbot.tsx          │  SmartContextWidget.tsx  │  InsightCard.tsx           │
│  ChatbotContent       │  GenerateInsightsButton  │  (tarjeta de insight)     │
│  ChatInput            │  (popover/embedded)     │                           │
│  ChatHistorySidebar   │                          │                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API ROUTES                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  POST /api/admin/chat           │  GET  /api/ai/insights                     │
│  GET  /api/admin/chat           │  POST /api/ai/insights/generate           │
│  POST /api/admin/chat/sessions  │  GET  /api/ai/insights/prepare-data       │
│  POST /api/admin/chat/messages  │  POST /api/ai/insights/[id]/dismiss       │
│  GET  /api/admin/chat/providers │  POST /api/ai/insights/[id]/feedback      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE AI LIBRARY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Agent (core.ts)          │  Insights Generator    │  LLMFactory            │
│  ToolExecutor              │  Prompts (por sección) │  Providers (7)         │
│  OrganizationalMemory      │  MaturitySystem        │  Config                │
│  Knowledge Base (RAG)      │  Schemas (Zod)         │  Types                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Proveedores LLM

| Proveedor  | Variable           | Modelo por defecto          |
| ---------- | ------------------ | --------------------------- |
| OpenAI     | OPENAI_API_KEY     | gpt-4-turbo-preview         |
| Anthropic  | ANTHROPIC_API_KEY  | claude-3-sonnet-20240229    |
| Google     | GOOGLE_API_KEY     | gemini-2.5-flash            |
| DeepSeek   | DEEPSEEK_API_KEY   | deepseek-chat               |
| OpenRouter | OPENROUTER_API_KEY | anthropic/claude-3.5-sonnet |
| Kilocode   | KILOCODE_API_KEY   | kilocode-frontier           |
| Minimax    | MINIMAX_API_KEY    | minimax-m2.1                |

**Fallback:** Si el proveedor principal falla (excepto 429), se intenta DeepSeek.

---

## 3. Chat IA

### 3.1 Flujo

1. Usuario envía mensaje → `POST /api/admin/chat`
2. Se crea o recupera sesión (`chat_sessions`)
3. Se inserta mensaje usuario en `chat_messages`
4. Agent carga historial (`loadSessionHistory`)
5. Agent carga contexto organizacional (`loadOrganizationalContext`)
6. Agent ejecuta `streamChat()` con tool calling
7. Respuesta en streaming (SSE)
8. Mensaje asistente se guarda en `chat_messages`

### 3.2 Contexto del Agent

- **System prompt**: `optic_expert` por defecto; variantes por contexto (products, orders, analytics, etc.)
- **Organizational context**: Nombre óptica, top productos, métricas, moneda
- **Section context**: Dashboard, POS, Inventario, etc. (según ruta actual)
- **Branch context**: Sucursal seleccionada o vista global
- **Knowledge base**: Documentación relevante inyectada vía RAG

### 3.3 Herramientas (Tools)

Definidas en `src/lib/ai/tools/`:

- **productTools**: getProducts, getLowStockProducts
- **categoryTools**: getCategories
- **orderTools**: getOrders, getOrderDetails
- **customerTools**: getCustomers, getCustomerDetails
- **analyticsTools**: getSalesSummary, getRevenueByPeriod
- **supportTools**: getSupportTickets
- **businessFlowTools**: analyzeBusinessFlow
- **diagnoseSystemTools**: diagnoseSystem
- **marketTrendsTools**: analyzeMarketTrends
- **inventoryTools**: optimizeInventory
- **recommendationTools**: generateRecommendations

Cada tool recibe `ToolExecutionContext` (userId, organizationId, supabase, currency, currentBranchId, userData).

### 3.4 Tier y Permisos

- Feature `chat_ia` debe estar habilitado (tier Pro o Premium)
- Solo usuarios admin (`is_admin` RPC)

---

## 4. Insights Inteligentes

### 4.1 Secciones

| Sección   | Trigger                     | Datos principales                                                |
| --------- | --------------------------- | ---------------------------------------------------------------- |
| dashboard | Cron diario / Manual        | yesterdaySales, monthlyAverage, overdueWorkOrders, pendingQuotes |
| inventory | Cron semanal / Manual       | zombieProducts, lowStockProducts                                 |
| clients   | Cron diario / Manual        | inactiveClients                                                  |
| pos       | Tiempo real (OnBlur receta) | prescription, customerHistory                                    |
| analytics | On Load (caché 24h)         | salesData, trends                                                |

### 4.2 Flujo de Generación

1. Frontend llama `GET /api/ai/insights/prepare-data?section=X`
2. Backend agrega datos reales (órdenes, productos, clientes, etc.)
3. Frontend llama `POST /api/ai/insights/generate` con `{ section, data }`
4. Backend calcula madurez organizacional
5. `generateInsights()` usa prompts adaptados + LLM
6. Respuesta validada con Zod (`InsightsResponseSchema`)
7. Insights insertados en `ai_insights`
8. Frontend obtiene con `GET /api/ai/insights?section=X`

### 4.3 Madurez Organizacional

| Nivel       | Condición                | Tono                              |
| ----------- | ------------------------ | --------------------------------- |
| new         | < 7 días o < 5 órdenes   | Bienvenida, configuración inicial |
| starting    | < 30 días o < 10 órdenes | Guía operativa                    |
| growing     | < 90 días o < 50 órdenes | Consultor de negocios             |
| established | Consolidado              | Analista estratégico              |

### 4.4 Esquema de Insight

```typescript
{
  type: "warning" | "opportunity" | "info" | "neutral",
  title: string,      // max 100
  message: string,    // max 500
  priority: 1-10,
  action_label?: string,
  action_url?: string,  // /admin/... o URL absoluta
  metadata?: Record<string, any>
}
```

### 4.5 Integración en Páginas

- `SmartContextWidget` con `section` prop
- Variantes: `popover` (flotante) o `embedded` (panel)
- `InsightsFloatingButton` agrupa Chatbot + SmartContextWidget

---

## 5. Base de Datos

### 5.1 Tablas relevantes

| Tabla              | Propósito          |
| ------------------ | ------------------ |
| ai_insights        | Insights generados |
| chat_sessions      | Sesiones de chat   |
| chat_messages      | Mensajes de chat   |
| admin_activity_log | Log de tool calls  |

### 5.2 ai_insights

- `organization_id`, `section`, `type`, `title`, `message`, `priority`
- `action_label`, `action_url`, `metadata`
- `is_dismissed`, `feedback_score`
- RLS por organization_id

---

## 6. Posibles Mejoras (Roadmap)

### 6.1 Correcciones Identificadas

1. **prepare-data clients**: Usa `profiles` en lugar de `customers` para clientes inactivos. Debe corregirse a `customers` con `organization_id` y `branch_id` según el modelo de datos.
2. **getZodSchemaForTool**: En `tools/index.ts` retorna `null` siempre; no hay validación Zod de parámetros de tools. Considerar definir schemas por tool.
3. **Cron jobs**: No implementados; insights se generan solo manualmente. Implementar cron para dashboard (diario), inventory (semanal), clients (diario).

### 6.2 Mejoras de Calidad

4. **Monitoreo de costos**: Dashboard de costos LLM por organización; alertas de presupuesto.
5. **Feedback cualitativo**: Además del score 1-5, permitir comentarios libres para mejorar prompts.
6. **Métricas de efectividad**: Tracking de insights generados vs. aplicados (clicks en action_url).
7. **Caché de insights**: Evitar regenerar si hay insights recientes (< 24h para dashboard).
8. **Streaming de insights**: Generar insights en streaming para UX más fluida.

### 6.3 Escalabilidad

9. **Cola de generación**: Para cron, usar cola (Bull, Inngest) en lugar de ejecución síncrona.
10. **Rate limit por organización**: Límites diferenciados por tier.
11. **A/B testing de prompts**: Variantes de prompts para medir efectividad.

### 6.4 Funcionalidad

12. **Insights POS en tiempo real**: Actualmente prepare-data pos no está conectado a un trigger OnBlur; implementar si se desea.
13. **Multi-idioma**: Soporte para inglés/portugués en prompts.
14. **Exportar conversaciones**: Permitir exportar historial de chat (PDF, JSON).

---

## 7. Testing

- **Unit**: `generator.test.ts`, `schemas.test.ts`, `maturity.test.ts`, `feedback.test.ts`
- **Integration**: `generate-insights.test.ts`, `insights-generation.test.ts`
- **Component**: `SmartContextWidget.test.tsx`, `InsightCard.test.tsx`

Ejecutar: `npm test -- --testPathPattern="ai"`

---

## 8. Variables de Entorno

```env
# Al menos uno requerido para Chat e Insights
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=

# Opcionales
AI_DEFAULT_PROVIDER=deepseek
AI_DEFAULT_MODEL=deepseek-chat
AI_FALLBACK_PROVIDERS=google,openai
```

---

## 9. Referencias

- Skill: `.cursor/skills/ai-optical-supabase/SKILL.md`
- Estado: `docs/ai/AI_IMPLEMENTATION_STATUS.md`
- Repowiki: `.qoder/repowiki/en/content/AI-Powered Insights System/`
