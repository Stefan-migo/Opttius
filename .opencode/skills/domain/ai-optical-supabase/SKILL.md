---
name: ai-optical-supabase
description: Expert guide for building and maintaining the AI module (chat, insights, tools) for optical shops with Supabase. Use when working on chat IA, insights inteligentes, SmartContextWidget, Agent, LLM providers, AI tools, knowledge base, organizational memory, or optical AI workflows. Covers multi-provider architecture, maturity-adapted insights, tool calling, RAG, and optical-specific prompts.
---

# Módulo de IA para Ópticas con Supabase

Guía para desarrollar y mantener el sistema de IA (chat + insights) de alta calidad para ópticas usando Supabase y Next.js.

## Cuándo Usar Este Skill

- Chat IA / Chatbot contextual (web y WhatsApp)
- Insights inteligentes (SmartContextWidget, InsightCard)
- Generación de insights por sección (dashboard, inventory, pos, clients, analytics)
- Herramientas del agente (tools)
- Proveedores LLM (OpenAI, Anthropic, Google, DeepSeek, OpenRouter)
- Memoria organizacional y knowledge base
- Prompts óptico-específicos
- Madurez organizacional (new, starting, growing, established)

## Arquitectura Core del Módulo AI

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MÓDULO AI OPTTIUS                                │
├─────────────────────────────────────────────────────────────────────────┤
│  CHAT                    │  INSIGHTS                                     │
│  POST /api/admin/chat    │  GET /api/ai/insights                         │
│  → Agent.streamChat()    │  → prepare-data → generate → ai_insights      │
│  → ToolExecutor          │  → SmartContextWidget                         │
│  → loadSessionHistory    │  → OrganizationalMaturitySystem               │
│  → loadOrganizationalContext                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Estructura de Archivos

| Ruta                                       | Propósito                                 |
| ------------------------------------------ | ----------------------------------------- |
| `src/lib/ai/config.ts`                     | Configuración de proveedores LLM          |
| `src/lib/ai/factory.ts`                    | LLMFactory con fallback entre proveedores |
| `src/lib/ai/types.ts`                      | Tipos LLM (LLMMessage, LLMTool, etc.)     |
| `src/lib/ai/agent/core.ts`                 | Agent principal con tool calling          |
| `src/lib/ai/agent/config.ts`               | System prompts por contexto               |
| `src/lib/ai/agent/tool-executor.ts`        | Ejecución de herramientas                 |
| `src/lib/ai/insights/generator.ts`         | Generación de insights con LLM            |
| `src/lib/ai/insights/prompts.ts`           | Prompts por sección                       |
| `src/lib/ai/insights/schemas.ts`           | Validación Zod de insights                |
| `src/lib/ai/insights/maturity.ts`          | Adaptación por madurez                    |
| `src/lib/ai/memory/organizational.ts`      | Contexto de la óptica                     |
| `src/lib/ai/tools/*`                       | Definiciones de herramientas              |
| `src/components/ai/SmartContextWidget.tsx` | Widget de insights                        |
| `src/components/admin/Chatbot.tsx`         | Chat flotante                             |

## Reglas Críticas

### 1. Multi-Tenancy y Branch

- **organization_id**: Siempre resolver desde `admin_users` o `profiles`.
- **currentBranchId**: Pasar al Agent para herramientas que filtran por sucursal.
- **addBranchFilter**: Usar en prepare-data para queries multi-sucursal.

### 2. Proveedores LLM

- **Fallback**: DeepSeek como fallback por defecto (rate limits generosos).
- **Variables de entorno**: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY.
- **Rate limit 429**: No reintentar; mostrar mensaje amigable al usuario.

### 3. Insights

- **Secciones válidas**: dashboard, inventory, clients, pos, analytics.
- **Tipos**: warning, opportunity, info, neutral.
- **Prioridad**: 1-10 (10 = crítico).
- **action_url**: Solo rutas existentes (/admin/...). No inventar rutas.
- **Madurez**: Adaptar tono según new/starting/growing/established.

### 4. Chat

- **Tier feature**: `chat_ia` debe estar habilitado (tier Pro/Premium).
- **Canales**: Web (admin) y WhatsApp (admin o cliente). Mismo Agent, config por canal.
- **Sesiones**: chat_sessions + chat_messages para continuidad.
- **Herramientas**: ToolExecutor valida y ejecuta; logAdminActivity registra uso.

### 5. Código Limpio

- **Validación Zod**: Siempre validar inputs (body, query) en APIs.
- **Rate limiting**: withRateLimit en endpoints de insights.
- **Logging**: appLogger para errores y eventos relevantes.
- **Retry**: Exponential backoff en generación de insights (maxRetries: 2).

## Óptica-Específico

### Terminología en Prompts

- Dioptrías: sphere, cylinder, axis, addition
- Materiales: CR39, policarbonato, alto índice (1.60, 1.67, 1.74)
- Tratamientos: antirreflejo, fotocromático, filtro azul
- Lentes de contacto: hidrogel, silicona-hidrogel, tóricas, multifocales

### Herramientas del Agente

| Categoría       | Herramientas                        |
| --------------- | ----------------------------------- |
| Productos       | getProducts, getLowStockProducts    |
| Órdenes         | getOrders, getOrderDetails          |
| Clientes        | getCustomers, getCustomerDetails    |
| Analytics       | getSalesSummary, getRevenueByPeriod |
| Negocio         | analyzeBusinessFlow, diagnoseSystem |
| Inventario      | optimizeInventory                   |
| Recomendaciones | generateRecommendations             |

### Knowledge Base

- `src/lib/ai/knowledge/`: Documentación indexada para RAG.
- `getKnowledgeBaseContext()`: Inyecta contexto relevante en system prompt.
- Categorías: core-system, business-modules, integrations.

## Mejores Prácticas

1. **Prompts**: Ser concisos; incluir ejemplos de output esperado (JSON).
2. **Insights**: Máximo 2 líneas en message; prioridad según impacto real.
3. **Tools**: Validar params antes de ejecutar; retornar ToolResult estructurado.
4. **Errores**: Mensajes en español; no exponer detalles internos al usuario.
5. **Tests**: Unit tests para generator, schemas, maturity; integration para API.

## Integración con Otros Módulos

- **POS**: Insights en tiempo real al ingresar receta (OnBlur) — sección `pos`.
- **Work Orders**: prepare-data incluye overdueWorkOrders.
- **Quotes**: prepare-data incluye pendingQuotes.
- **Analytics**: prepare-data incluye salesData, trends.
- **SaaS**: Tier validator para chat_ia.

## Referencias

- Documentación completa: `docs/AI_SYSTEM.md`
- Estado de implementación: `docs/ai/AI_IMPLEMENTATION_STATUS.md`
- WhatsApp: `docs/WHATSAPP_AI_AGENT.md`, `docs/WHATSAPP_AGENT_TRAINING.md`
