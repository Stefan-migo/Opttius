# Módulo AI - Actualización Febrero 2026

**Documento consolidado del estado actual del módulo de IA** — Reemplaza y actualiza AI_SYSTEM.md.

**Fecha:** 2026-02-21  
**Notebook ID:** e071bebc-ce79-4b32-a040-61a6a9c331a3

---

## 1. Resumen Ejecutivo

Se implementó el plan "Módulo AI - Máxima Calidad" con correcciones críticas, nuevas capacidades y mejoras de calidad. El módulo incluye: Chat IA con tool calling, Insights contextuales, importación masiva asistida por IA, cron de generación automática, dashboard de costos LLM y resumen diario.

---

## 2. Modificaciones Implementadas

### 2.1 Fase 1 - Correcciones Críticas (COMPLETADO)

| Item                             | Cambio                                                                                                                                                                                      | Archivos                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **1.1 prepare-data clients**     | Cambio de `profiles` a `customers` para clientes inactivos. `customers` tiene `branch_id`; para vista global se usa `addBranchFilterForBranchScopedTable` que resuelve branchIds de la org. | `prepare-data/route.ts`, `prepare-data.ts`, `branch-middleware.ts` |
| **1.2 Customer tools**           | Todas las herramientas usan `customers` en lugar de `profiles`. Filtro por `currentBranchId` o branches de org. `getCustomerOrders` y `getCustomerStats` usan `customer_id` en orders.      | `tools/customers.ts`                                               |
| **1.3 SmartContextWidget Epoch** | Paleta Epoch: `epoch-primary`, `epoch-accent`, `epoch-background`, `epoch-surface`. Bordes `rounded-none`.                                                                                  | `SmartContextWidget.tsx`                                           |
| **1.4 Validación Zod**           | `ToolDefinition` tiene `zodSchema` opcional. `getZodSchemaForTool` retorna el schema del tool. Todas las tools con schemas los exponen.                                                     | `tools/types.ts`, `tools/index.ts`, todos los `tools/*.ts`         |

### 2.2 Fase 2 - Automatización y Monitoreo (COMPLETADO)

| Item                         | Cambio                                                                                                                                                    | Archivos                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **2.1 Cron insights**        | `/api/cron/generate-insights` ejecuta diario 8:00 UTC. Secciones: daily_summary, dashboard, clients; inventory solo lunes. Usa `createServiceRoleClient`. | `api/cron/generate-insights/route.ts`, `vercel.json`                               |
| **2.2 Bordes Epoch**         | `InsightCard` y ventana `Chatbot` con `rounded-none`.                                                                                                     | `InsightCard.tsx`, `Chatbot.tsx`                                                   |
| **2.3 Dashboard costos LLM** | Tabla `ai_usage_log`, logging en insights generator y agent, API `/api/admin/ai/usage`, componente `AIUsageCard` en pestaña "IA" de analytics.            | Migración SQL, `usage-logger.ts`, `AIUsageCard.tsx`, `api/admin/ai/usage/route.ts` |

### 2.3 Fase 3 - Importación Masiva (COMPLETADO)

| Item                          | Cambio                                                                                                                                             | Archivos                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **3.1 Soporte archivos Chat** | Upload CSV/Excel a `/api/admin/chat/upload-import-file`. Bucket `import-temp` en Storage. ChatInput con botón adjuntar. `fileId` en body del chat. | `upload-import-file/route.ts`, `ChatInput.tsx`, `useChatMessages.ts`, `chat/route.ts` |
| **3.2 Tools importación**     | `analyzeImportFile`: analiza archivo, sugiere mapeo. `executeBulkImport`: importa con mapping y branchId. Parser CSV/Excel en `file-parser.ts`.    | `tools/importBulk.ts`, `utils/file-parser.ts`                                         |
| **3.3 Integración Agent**     | Tools en `allTools`. System prompt con instrucciones de importación. Mensaje incluye `[Archivo adjunto: fileId="..."]` cuando hay adjunto.         | `tools/index.ts`, `agent/config.ts`, `chat/route.ts`                                  |

### 2.4 Fase 4 - Insights Diarios (COMPLETADO)

| Item                         | Cambio                                                                                                                                                                                      | Archivos                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **4.1 Resumen día anterior** | Prompt `getDailySummaryPrompt`. Variante `daily_summary` en generator. Cron genera con `metadata: { type: "daily_summary", date }`. API prioriza daily_summary de ayer al cargar dashboard. | `prompts.ts`, `generator.ts`, `cron/generate-insights`, `api/ai/insights/route.ts` |

---

## 3. Arquitectura Actual

### 3.1 Prepare-data compartido

- `src/lib/ai/insights/prepare-data.ts`: Lógica compartida usada por API route y cron.
- Recibe: supabase, organizationId, organizationName, section, branchContext.
- Para cron: branchContext global (branchId=null, isSuperAdmin=true).

### 3.2 Nuevas herramientas

- **importBulk**: `analyzeImportFile`, `executeBulkImport` (customers, products).
- Todas las tools con `zodSchema` para validación.

### 3.3 Nuevas APIs

| Endpoint                             | Método | Descripción                                                                             |
| ------------------------------------ | ------ | --------------------------------------------------------------------------------------- |
| `/api/cron/generate-insights`        | GET    | Cron Vercel. Requiere CRON_SECRET.                                                      |
| `/api/admin/ai/usage`                | GET    | Uso y costos LLM por org. Query: `days`, `organizationId` (super_admin).                |
| `/api/admin/chat/upload-import-file` | POST   | Upload CSV/Excel. FormData `file`. Retorna `fileId`, `filename`, `rowCount`, `headers`. |

### 3.4 Nuevas tablas

- **ai_usage_log**: organization_id, provider, model, prompt_tokens, completion_tokens, endpoint, created_at.
- **import-temp** (Storage): Bucket para archivos temporales de importación. RLS por org.

---

## 4. Pendiente (No Implementado)

### 4.1 Fase 4.2 - Envío por email

- Configuración por org: `ai_daily_insight_email`, email.
- Tras generar daily_summary en cron: si habilitado, enviar email con Resend.
- Plantilla `daily-insight.ts`.
- UI en configuración (opcional).

### 4.2 Fase 4.3 - Progresividad

- Reforzar en prompts: "desde cuándo existe la óptica", "estado actual".
- Mejorar manejo de JSON malformado en generator.
- `InsightsResponseSchema` ya permite 0 insights (default []).

### 4.3 Fase 5 - Prioridad Baja

- **5.1 Caché 24h**: Consultar ai_insights antes de regenerar; `forceRegenerate` opcional.
- **5.2 Feedback cualitativo**: Campo `feedback_comment` o tabla `ai_insight_feedback`.
- **5.3 Métricas efectividad**: Tracking clicks en `action_url`, tabla `ai_insight_clicks`.

---

## 5. Checklist de Pruebas Manuales

### 5.1 Insights y Prepare-data

- [ ] **Prepare-data clients**: Ir a dashboard, generar insights. Verificar que los insights de "clientes inactivos" usen datos de `customers` (CRM), no de usuarios del sistema.
- [ ] **SmartContextWidget**: Abrir widget de insights. Verificar colores Epoch (no azul/índigo), bordes rectos (`rounded-none`).
- [ ] **InsightCard**: Ver tarjeta de insight. Bordes rectos.
- [ ] **Daily summary**: Tras ejecutar cron (o simular), verificar que dashboard muestre primero el resumen del día anterior si existe.

### 5.2 Cron de Insights

- [ ] **Ejecución manual**: `GET /api/cron/generate-insights` con header `Authorization: Bearer <CRON_SECRET>`. Verificar que se procesen orgs y se inserten insights.
- [ ] **Vercel Cron**: En vercel.json está `"schedule": "0 8 * * *"`. Verificar en dashboard de Vercel que el cron esté configurado.

### 5.3 Chat IA

- [ ] **Chat básico**: Enviar mensaje. Verificar respuesta en streaming.
- [ ] **Tools**: Preguntar "¿Qué productos tienen stock bajo?" → debe usar getLowStockProducts.
- [ ] **Customer tools**: Preguntar "Lista los clientes" → debe usar getCustomers con `customers`, no profiles.
- [ ] **Validación Zod**: Si el LLM intenta un parámetro inválido, debe fallar la validación.

### 5.4 Importación Masiva

- [ ] **Upload archivo**: En el chat, clic en botón adjuntar (clip). Subir CSV con columnas: nombre, apellido, email. Verificar que se muestre el archivo adjunto con filas.
- [ ] **Mensaje con fileId**: Enviar "Importa estos clientes". El agent debe ver el fileId y usar analyzeImportFile.
- [ ] **Analyze y Execute**: El agent debe sugerir mapeo y pedir confirmación. Al confirmar, executeBulkImport debe insertar en `customers`.
- [ ] **Productos**: Probar con CSV de productos (nombre, precio). Verificar importación.

### 5.5 Dashboard de Costos LLM

- [ ] **Pestaña IA**: En Analytics, ir a pestaña "IA". Verificar que se cargue AIUsageCard.
- [ ] **API usage**: Tras usar chat o generar insights, verificar que `/api/admin/ai/usage?days=7` devuelva datos. Total tokens, coste estimado, por modelo.
- [ ] **Logging**: Verificar que `ai_usage_log` tenga registros tras usar chat/insights.

### 5.6 Bordes y UI

- [ ] **Chatbot ventana**: Ventana del chat con bordes rectos (`rounded-none`).
- [ ] **InsightCard**: Tarjetas sin bordes redondeados.

---

## 6. Variables de Entorno

```env
# Al menos uno para Chat e Insights
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=

# Cron (requerido para generate-insights)
CRON_SECRET=

# Opcionales
AI_DEFAULT_PROVIDER=deepseek
AI_DEFAULT_MODEL=deepseek-chat
AI_FALLBACK_PROVIDERS=google,openai
```

---

## 7. Referencias

- Plan original: `ai_module_maximum_quality_693544d4.plan.md`
- Skill: `.cursor/skills/ai-optical-supabase/SKILL.md`
- Tests: `npm test -- --testPathPattern="ai"`
