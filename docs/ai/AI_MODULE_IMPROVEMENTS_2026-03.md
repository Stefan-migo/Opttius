# Módulo AI - Mejoras Marzo 2026

**Documento de actualización** — Mejoras implementadas en el chat, tools y UX del agente.

**Fecha:** 2026-03-04

---

## 1. Resumen de Mejoras Implementadas

### 1.1 Contexto de Fecha Actual

**Problema:** El agente preguntaba "¿para qué año?" al reprogramar citas.

**Solución:** Se inyecta la fecha actual en el system prompt del chat:

- `FECHA ACTUAL: YYYY-MM-DD`
- Instrucción: usar siempre esta fecha para citas y reprogramaciones
- No preguntar por año; asumir el año actual

**Archivo:** `src/app/api/admin/chat/route.ts`

---

### 1.2 Botón de Detener Chat

**Problema:** No había forma de cancelar una respuesta en curso.

**Solución:** Botón rojo (■) visible durante streaming que aborta la petición.

**Archivos:**

- `src/components/admin/ChatbotContent/hooks/useChatMessages.ts` — `stopStreaming()` expuesto
- `src/components/admin/chat/ChatInput.tsx` — Botón Stop con `onStop` prop
- `src/components/admin/ChatbotContent/ChatbotContentComponent.tsx` — Pasa `stopStreaming` a ChatInput

---

### 1.3 Corrección Upload Import File (500)

**Problema:** `POST /api/admin/chat/upload-import-file` devolvía 500.

**Solución:**

- Uso de `createServiceRoleClient()` para el upload a Storage (bypass RLS)
- Migración `20260304100000_ensure_import_temp_bucket.sql` crea el bucket `import-temp` si no existe

**Archivos:**

- `src/app/api/admin/chat/upload-import-file/route.ts`
- `supabase/migrations/20260304100000_ensure_import_temp_bucket.sql`

---

### 1.4 Nuevas Tools del Agente

| Tool             | Descripción                                                   | Categoría    |
| ---------------- | ------------------------------------------------------------- | ------------ |
| getWorkOrders    | Lista órdenes de trabajo con filtros (status, branch, fechas) | work_orders  |
| getWorkOrderById | Detalle de una orden de trabajo por UUID                      | work_orders  |
| getAppointments  | Lista citas por fecha (YYYY-MM-DD) con filtros                | appointments |

**Archivo:** `src/lib/ai/tools/workOrders.ts` (nuevo), `getAppointments` en `appointments.ts`

---

## 2. Pendiente

### 2.1 Checklist Manual de Tools

El archivo `docs/ai/AGENT_TOOLS_TEST_CHECKLIST.md` existe. **Pendiente:** el usuario completar el testing manual de cada tool conversando con el agente.

### 2.2 Sincronización NotebookLM

- Añadir `docs/ai/AI_MODULE_IMPROVEMENTS_2026-03.md` al cuaderno Cerebro
- Opcional: `docs/ai/AGENT_TOOLS_REFERENCE.md` si no está ya

---

## 3. Referencias

- **Tools:** `docs/ai/AGENT_TOOLS_REFERENCE.md`
- **Checklist:** `docs/ai/AGENT_TOOLS_TEST_CHECKLIST.md`
- **Roadmap:** `docs/ai/AGENT_TRAINING_ROADMAP.md`
- **NotebookLM:** `docs/NOTEBOOKLM_SYNC.md`
