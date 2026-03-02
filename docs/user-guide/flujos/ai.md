# Flujo del Módulo IA – Vista del Usuario

## 1. Contexto en la vida real (Chile)

Una óptica necesita **apoyo inteligente** para tomar decisiones rápidas sin salir del sistema: consultar stock bajo, entender tendencias de ventas, obtener recomendaciones de lentes según la receta o recordar qué clientes llevan tiempo sin comprar. El módulo de IA de Opttius ofrece:

- **Chat IA**: Un asistente conversacional que responde preguntas sobre el negocio usando datos en tiempo real (productos, órdenes, clientes, analíticas). Entiende terminología óptica (dioptrías, materiales, tratamientos) y puede ejecutar acciones como buscar productos, listar trabajos atrasados o analizar flujos de negocio.
- **Insights Inteligentes**: Recomendaciones contextuales generadas automáticamente según la sección donde estás (Dashboard, POS, Inventario, Clientes, Analíticas). Por ejemplo: "3 productos con stock bajo", "5 presupuestos pendientes de cierre", "Ventas de ayer 15% por debajo del promedio mensual".

**Problemas que resuelve el módulo:**

- Reducir el tiempo de búsqueda de información (stock, órdenes, clientes).
- Ofrecer sugerencias proactivas sin que el usuario tenga que pedirlas.
- Apoyar decisiones técnicas (materiales de lente, tratamientos) con conocimiento experto.
- Adaptar el tono y las recomendaciones según la madurez de la óptica (nueva, en crecimiento, establecida).

**Requisito:** El Chat IA requiere plan **Pro** o **Premium** (feature `chat_ia`). Los Insights están disponibles según la configuración del tier.

---

## 2. Flujo desde el punto de vista del usuario

### Parte A: Chat IA (Asistente conversacional)

#### Paso 1: Abrir el Chat IA (admin)

1. **Desktop:** Clic en el botón flotante de chat (icono de mensaje) en la esquina inferior derecha.
2. **Móvil:** Clic en el icono de mensaje en la barra inferior de navegación ("Asistente IA").
3. **Alternativa:** Ir directamente a **Chatbot IA** (`/admin/chat`) si conoces la URL.

El chat se abre como burbuja flotante o como panel lateral (si lo expandiste antes). Puedes expandirlo a sidebar para tenerlo visible mientras trabajas en otras secciones.

#### Paso 2: Escribir o elegir una sugerencia rápida

1. En la parte inferior del chat, verás **sugerencias rápidas** según la sección actual:
   - **Dashboard:** "¿Cómo puedo mejorar mis ventas?", "Muéstrame los trabajos atrasados", "¿Qué productos tienen stock bajo?"
   - **POS:** "¿Qué material de lente recomiendas para esta dioptría?", "¿Cómo calcular el precio con descuento?"
   - **Inventario:** "¿Qué productos necesitan reposición?", "Muéstrame productos sin movimiento"
   - **Clientes:** "¿Qué clientes necesitan seguimiento?", "¿Cómo buscar por RUT?"
   - **Analíticas:** "Explica las tendencias de ventas", "¿Cuál es el producto más vendido?"

2. Puedes hacer clic en una sugerencia o escribir tu propia pregunta en el campo de texto.

#### Paso 3: Recibir la respuesta (streaming)

1. El asistente responde en **tiempo real** (streaming).
2. Si la pregunta requiere datos (ej. productos con stock bajo), el agente usa **herramientas** internas para consultar la base de datos y devolver información actualizada.
3. La respuesta puede incluir enlaces a secciones del admin (ej. ir a productos, órdenes, clientes).

#### Paso 4: Gestionar sesiones e historial

1. **Nueva conversación:** Clic en el botón de nueva conversación para empezar desde cero.
2. **Historial:** Abrir el panel lateral de historial para ver conversaciones anteriores y cargar una sesión.
3. **Exportar:** Exportar la conversación actual (si está implementado) para guardarla o compartirla.

#### Paso 5: Configuración (opcional)

1. Abrir el panel de **Configuración** (icono de engranaje).
2. Seleccionar **proveedor** (DeepSeek, OpenAI, Anthropic, etc.) y **modelo** si tu organización tiene varias API keys configuradas.

---

### Parte B: Insights Inteligentes

#### Paso 1: Abrir Insights (admin)

1. **Desktop:** Clic en el botón flotante con icono de **Sparkles** (esquina inferior derecha, encima del chat).
2. **Móvil:** Clic en el icono de Sparkles en la barra inferior de navegación ("Insights Inteligentes").

Se abre un panel lateral con los insights de la **sección actual** (Dashboard, POS, Inventario, Clientes o Analíticas).

#### Paso 2: Ver insights generados

1. Cada insight muestra:
   - **Tipo:** advertencia (⚠️), oportunidad (📈), información (ℹ️) o neutral (✓).
   - **Título** y **mensaje** breve (máx. 2 líneas).
   - **Prioridad** (1–10, ordenados de mayor a menor).
   - **Acción:** botón para ir a la pantalla relacionada (ej. "Ver productos con stock bajo" → `/admin/products`).

2. Si no hay insights, verás el mensaje "No hay insights disponibles aún" y un botón **Generar Insights**.

#### Paso 3: Generar o regenerar insights

1. Si no hay insights: clic en **Generar Insights**.
2. Si ya hay insights: clic en el icono de **actualizar** (RefreshCw) en la cabecera del panel.
3. El sistema prepara datos reales (ventas, stock, clientes inactivos, etc.), calcula la madurez organizacional y genera recomendaciones adaptadas.
4. Los insights se guardan y se muestran en el panel.

#### Paso 4: Actuar sobre un insight

1. Clic en el **botón de acción** (ej. "Ver trabajos atrasados") para ir a la pantalla correspondiente.
2. Opcionalmente, dar **feedback** (estrellas 1–5) para mejorar futuras recomendaciones.
3. Si un insight no aplica: clic en **Descartar** para ocultarlo.

---

## 3. Diagrama simplificado

```
[Admin] Abre Chat IA (flotante o /admin/chat)
        ↓
[Admin] Escribe pregunta o elige sugerencia rápida
        ↓
[Sistema] Agent carga contexto (sección, sucursal, organización)
        ↓
[Sistema] Ejecuta herramientas si aplica (getProducts, getOrders, etc.)
        ↓
[Sistema] Responde en streaming → Guarda en chat_messages
        ↓
[Admin] Lee respuesta, puede seguir preguntando o actuar

---

[Admin] Abre Insights (botón Sparkles)
        ↓
[Sistema] Muestra insights de la sección actual (dashboard, pos, inventory, clients, analytics)
        ↓
[Admin] Si no hay: Generar Insights
        ↓
[Sistema] prepare-data → generate (LLM + madurez) → ai_insights
        ↓
[Admin] Ve insights ordenados por prioridad
        ↓
[Admin] Clic en acción → Navega a /admin/... o Descartar / Dar feedback
```

---

## 4. Tabla de actores

| Actor                  | Rol                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin óptica**       | Usa el Chat IA para consultas y los Insights para recomendaciones. Gestiona sesiones, exporta conversaciones, da feedback a insights.       |
| **Vendedor**           | Puede usar Chat e Insights si tiene acceso al admin (según rol). En POS, los insights de la sección `pos` ofrecen sugerencias contextuales. |
| **Sistema (Agent)**    | Procesa mensajes, ejecuta herramientas (productos, órdenes, clientes, analíticas), genera respuestas en streaming.                          |
| **Sistema (Insights)** | Prepara datos por sección, calcula madurez organizacional, genera insights con LLM, los guarda en `ai_insights`.                            |

---

## 5. Integraciones

| Módulo           | Integración                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**    | Insights con ventas de ayer, promedio mensual, trabajos atrasados, presupuestos pendientes. Chat con contexto de resumen ejecutivo. |
| **POS**          | Insights contextuales (receta, historial del cliente). Chat con sugerencias de materiales, tratamientos y precios.                  |
| **Inventario**   | Insights con productos zombie, stock bajo. Chat con herramientas `getProducts`, `getLowStockProducts`, `optimizeInventory`.         |
| **Clientes**     | Insights con clientes inactivos. Chat con `getCustomers`, `getCustomerDetails`.                                                     |
| **Analíticas**   | Insights con tendencias y comparaciones. Chat con `getSalesSummary`, `getRevenueByPeriod`, `analyzeMarketTrends`.                   |
| **Trabajos**     | Chat con `getOrders`, `getOrderDetails`. Insights de dashboard incluyen trabajos atrasados.                                         |
| **Presupuestos** | Insights de dashboard incluyen presupuestos pendientes.                                                                             |
| **WhatsApp**     | El mismo Agent se reutiliza para conversaciones por WhatsApp (admin o cliente). Ver `docs/WHATSAPP_AI_AGENT.md`.                    |
| **SaaS / Tiers** | Feature `chat_ia` habilitado en Pro y Premium. Sin él, el Chat IA muestra mensaje de actualización de plan.                         |

---

## 6. Rutas y pantallas

| Ruta                              | Descripción                                                               |
| --------------------------------- | ------------------------------------------------------------------------- |
| `/admin/chat`                     | Página dedicada del Chatbot IA (mismo contenido que la burbuja flotante). |
| Botón flotante Chat (desktop)     | Abre Chat IA como burbuja o sidebar.                                      |
| Botón "Asistente IA" (móvil)      | Abre Chat IA en la barra inferior.                                        |
| Botón flotante Sparkles (desktop) | Abre panel de Insights Inteligentes.                                      |
| Botón "Insights" (móvil)          | Abre panel de Insights en la barra inferior.                              |

**Nota:** No hay entrada en el menú lateral para Chat IA o Insights; se accede por los botones flotantes o la barra móvil.

---

## 7. Secciones de Insights

| Sección       | Dónde aparece                      | Datos principales                                                             |
| ------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| **dashboard** | En Dashboard (`/admin`)            | Ventas de ayer, promedio mensual, trabajos atrasados, presupuestos pendientes |
| **pos**       | En POS (`/admin/pos`)              | Receta actual, historial del cliente (si se implementa trigger OnBlur)        |
| **inventory** | En Productos (`/admin/products`)   | Productos zombie, stock bajo                                                  |
| **clients**   | En Clientes (`/admin/customers`)   | Clientes inactivos                                                            |
| **analytics** | En Analíticas (`/admin/analytics`) | Datos de ventas, tendencias                                                   |

---

## 8. Madurez organizacional (Insights)

El tono de los insights se adapta según la madurez de la óptica:

| Nivel           | Condición                      | Tono                              |
| --------------- | ------------------------------ | --------------------------------- |
| **new**         | &lt; 7 días o &lt; 5 órdenes   | Bienvenida, configuración inicial |
| **starting**    | &lt; 30 días o &lt; 10 órdenes | Guía operativa                    |
| **growing**     | &lt; 90 días o &lt; 50 órdenes | Consultor de negocios             |
| **established** | Consolidado                    | Analista estratégico              |

---

## 9. Herramientas del Chat (resumen)

El agente puede ejecutar herramientas para responder con datos reales:

| Categoría       | Herramientas                        |
| --------------- | ----------------------------------- |
| Productos       | getProducts, getLowStockProducts    |
| Órdenes         | getOrders, getOrderDetails          |
| Clientes        | getCustomers, getCustomerDetails    |
| Analíticas      | getSalesSummary, getRevenueByPeriod |
| Negocio         | analyzeBusinessFlow, diagnoseSystem |
| Inventario      | optimizeInventory                   |
| Recomendaciones | generateRecommendations             |
