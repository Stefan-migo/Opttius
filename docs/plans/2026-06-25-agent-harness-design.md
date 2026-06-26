# Diseño: Opttius Agent Harness

**Fecha**: 2026-06-25
**Estado**: Borrador para validación
**Basado en**: Brainstorming con usuario (dueño/director del proyecto)

---

## Resumen

Opttius pasa de ser "un SaaS de gestión con chat IA" a ser **el agente de la óptica** — un harness que transforma Opttius en un copiloto que trabaja codo a codo con cada rol de la óptica (dueño, administrador, vendedor). El agente conoce la base de datos, navega el software, y colabora con el humano como un empleado más.

---

## 1. Presencia del Agente en la UI

### 1.1 Burbuja flotante

- Círculo flotante en la esquina inferior derecha, estilo Intercom/WhatsApp
- Badge con contador de notificaciones no leídas
- Pulso sutil cuando el agente tiene algo que decir en segundo plano
- Opción de fijar como panel lateral (~400px) — opt-in, default flotante

### 1.2 Estados

| Estado               | Descripción                                            |
| -------------------- | ------------------------------------------------------ |
| Colapsada            | Círculo flotante + badge                               |
| Abierta reposo       | Panel con mensaje contextual según pantalla actual     |
| Abierta conversación | Panel con historial + input + respuestas estructuradas |
| Notificación         | Badge + toast opcional cuando el agente inicia         |

### 1.3 Eventos estructurados

Las respuestas del agente no son markdown plano. Son arrays de bloques:

```typescript
type Block =
  | { type: "text"; content: string }
  | {
      type: "preview";
      entity: EntityType;
      id: string;
      title: string;
      subtitle: string;
      actions: Action[];
    }
  | {
      type: "action";
      label: string;
      variant: "primary" | "danger" | "ghost";
      action: string;
      params: Record<string, unknown>;
    }
  | { type: "navigation"; label: string; path: string }
  | { type: "loading"; label: string }
  | { type: "error"; content: string }
  | { type: "success"; content: string };
```

Solo texto, sin voz en el MVP.

---

## 2. Contexto del Agente

### 2.1 Context Provider (frontend)

`AgentContextProvider` envuelve la app y escucha cambios de:

- Ruta activa (`usePathname`)
- Sucursal seleccionada (del layout/state global)
- Rol del usuario (del AuthContext)
- Org ID y nombre

Se envía al agente como metadata en cada request, no como stream constante.

### 2.2 Tools de contexto (backend, invocables por el agente)

| Tool                    | Descripción                                    |
| ----------------------- | ---------------------------------------------- |
| `getScreenContext()`    | Ruta, sección, sucursal, rol                   |
| `getActiveFormData()`   | Datos del formulario activo en pantalla        |
| `getSelectedCustomer()` | Cliente seleccionado, si hay                   |
| `getCartContents()`     | Items del carrito POS, si hay                  |
| `searchDatabase(query)` | Búsqueda textual en clientes/productos/órdenes |

---

## 3. Tools del Agente

### 3.1 Cuatro tipos

| Tipo           | Ejemplos                                                                                                             | Rol mínimo                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **DB**         | `searchCustomer`, `createOrder`, `getProductStock`, `updateCustomer`                                                 | Varía por operación                 |
| **Navegación** | `navigateTo(path)`, `openEntity(entity, id)`, `reopenLastScreen()`                                                   | Todos                               |
| **Contexto**   | `getScreenContext`, `getActiveFormData`, `getSelectedCustomer`, `getCartContents`                                    | Todos                               |
| **Memoria**    | `searchOrgMemory`, `saveMemory`, `getRecentContext`, `saveSessionSummary`, `getUserPreferences`, `setUserPreference` | Todos (lectura), admin+ (escritura) |

### 3.2 Filtrado por rol

El agente recibe tools según el rol del usuario. No se filtra por prompt — el agente **no tiene la herramienta**:

| Tool                 | Vendedor          | Admin | Dueño |
| -------------------- | ----------------- | ----- | ----- |
| `searchCustomer`     | ✅                | ✅    | ✅    |
| `createOrder`        | ✅                | ✅    | ✅    |
| `updateCustomer`     | ✅                | ✅    | ✅    |
| `deleteCustomer`     | ❌                | ✅    | ✅    |
| `getFinancialReport` | ❌                | ✅    | ✅    |
| `updateOrgConfig`    | ❌                | ❌    | ✅    |
| `navigateTo`         | ✅                | ✅    | ✅    |
| `saveMemory`         | ✅ (solo lectura) | ✅    | ✅    |

---

## 4. Memoria del Agente

### 4.1 Esquema de tablas (pendiente de aplicar hasta que db-audit consolide migraciones)

Cuatro tablas nuevas, ninguna modifica schema existente:

- **`agent_conversations`**: Una fila por sesión de chat. org_id, user_id, role, branch_id, screen_route, summary, message_count, token_count.
- **`agent_messages`**: Cada mensaje. conversation_id, role, content, blocks (JSONB), tool_calls (JSONB), tokens, model.
- **`agent_memories`**: Memoria organizacional con embedding 384d (pgvector). org_id, type (decision|discovery|pattern|preference|fact|summary), content, embedding, source, metadata, importance (1-5).
- **`agent_prompts`**: Config de personalidad por org. base_prompt, role_prompts (JSONB), tools_enabled, tone, temperature.
- **`agent_user_prefs`**: Preferencias por usuario. auto_mode, bubble_fixed, prefs (JSONB).

### 4.2 Tipos de memoria

| Tipo         | Ejemplo                                                         | Caducidad  |
| ------------ | --------------------------------------------------------------- | ---------- |
| `decision`   | "El dueño decidió no comprar más lentes X"                      | Permanente |
| `discovery`  | "Los clientes de Sucursal Centro prefieren armazones metálicos" | Permanente |
| `pattern`    | "Cada jueves llega stock de laboratorio"                        | 30 días    |
| `preference` | "El vendedor Juan prefiere respuestas cortas"                   | Permanente |
| `fact`       | "El proveedor de CR39 es Óptica Mayorista SPA"                  | Permanente |
| `summary`    | "Se revisó stock con admin. Se ordenaron 20 pares."             | 7 días     |

### 4.3 Loop de memoria

En cada request del usuario:

1. `getRecentContext(org_id, 5)` → últimos facts de la org
2. `searchOrgMemory(query implícita del mensaje)` → facts relevantes semánticamente
3. Ambos se inyectan en la capa de memoria del system prompt
4. Al cerrar la interacción: `saveSessionSummary(resumen)`

---

## 5. Sistema de Prompts (4 Capas)

### 5.1 Construcción dinámica

```
[SISTEMA] Capa base: identidad del agente
[ROL] Capa rol: personalidad según dueño/admin/vendedor
[CONTEXTO] Capa dinámica: pantalla actual, sucursal, alertas
[MEMORIA] Capa recuperada: facts relevantes de la org
[HERRAMIENTAS] Lista filtrada por rol
```

Se reconstruye en cada request del usuario. No se acumulan mensajes viejos.

### 5.2 Configurable por organización

Tabla `agent_prompts` permite al dueño personalizar tono y comportamiento sin deploy.

---

## 6. Loop del Agente

### 6.1 Pipeline por request

```
1. INGEST
   - Recibir mensaje + metadata del frontend
   - Construir AgentSession (usuario, rol, sucursal, pantalla)
   - Búsqueda automática de memoria relevante

2. CONSTRUIR PROMPT
   - System prompt de 4 capas + tools filtradas + historial

3. LLM CALL
   - Enviar al proveedor configurado
   - Recibir: texto o tool_calls

4. EJECUTAR (si hay tool_calls)
   - Ejecutar tool (DB / Navegación / Contexto / Memoria)
   - Resultado vuelve al LLM
   - Loop hasta maxSteps o respuesta final

5. RESPONDER
   - Generar bloques estructurados
   - Enviar al frontend (texto + previews + acciones)

6. CERRAR (al minimizar o timeout)
   - saveSessionSummary
```

### 6.2 Modos

| Modo                   | Comportamiento                                                      | Quién decide                                       |
| ---------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| **Consulta** (default) | El humano pregunta, el agente responde/ejecuta                      | El usuario abre la burbuja                         |
| **Automático**         | El agente monitorea (stock bajo, citas próximas) y propone acciones | Opt-in por usuario en `agent_user_prefs.auto_mode` |

En modo automático: el agente **propone**, el humano **autoriza** acciones irreversibles. Las reversibles (agendar, reorganizar) puede ejecutarlas y reportar.

---

## 7. Privacidad por Rol

- Cada usuario tiene su historial de conversaciones privado (`user_id` en `agent_conversations`)
- La memoria organizacional (`agent_memories`) es compartida dentro de la org
- El agente nunca expone conversaciones de un usuario a otro
- Las tools se filtran por rol — el vendedor no tiene herramientas de eliminación/configuración

---

## 8. Stack

| Capa          | Tecnología                                                               |
| ------------- | ------------------------------------------------------------------------ |
| Frontend      | Next.js 14 (React 18) + Tailwind + shadcn/ui                             |
| Burbuja       | Componente AgentBubble con renderizado de bloques                        |
| Contexto      | AgentContextProvider (React Context)                                     |
| Backend       | API route `/api/agent/chat` (reemplaza `/api/admin/chat`)                |
| Base de datos | Supabase (Postgres + pgvector)                                           |
| LLM           | Multi-provider (DeepSeek default, OpenAI, Anthropic, Google, OpenRouter) |
| Embeddings    | Transformers.js (384d, on-device)                                        |
| Tools         | LLM tool calling existente, extendido con navegación y contexto          |
| Memoria       | Tablas propias en Supabase con pgvector                                  |

---

## 9. Eliminaciones

- `SmartContextWidget.tsx` y sistema de insights: se reemplaza por la burbuja del agente
- Las rutas de API de insights se deprecan (mantener por compatibilidad, eliminar en release futura)
- El sistema de "sesiones de chat" actual (`chat_sessions`, `chat_messages`) se migra gradualmente a `agent_conversations` / `agent_messages`

---

## 10. Cómputo de costos

- Se trackea `token_count` por conversación en `agent_conversations`
- Se trackea `tokens` y `model` por mensaje en `agent_messages`
- Base para futura facturación Opttius AI o reporte de costos BYO API key
