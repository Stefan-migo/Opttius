# Roadmap de Entrenamiento y Mejora del Agente IA

Plan de evolución del Agente Experto Óptico de Opttius.

**Versión:** 1.0  
**Fecha:** 2026-03-04

---

## 1. Corto plazo (1-2 meses)

### 1.1 Refinamiento de prompts

- **Objetivo:** Mejorar la calidad de las respuestas según feedback.
- **Acciones:**
  - Revisar `feedback_score` y `feedback_comment` en `ai_insights` para identificar patrones.
  - Ajustar prompts en `src/lib/ai/agent/config.ts` por sección (products, orders, analytics).
  - Añadir ejemplos few-shot en el system prompt para casos frecuentes (ej. "¿Qué productos tienen stock bajo?" → usar getLowStockProducts).
- **Métricas:** Feedback score promedio > 3.5, longitud de respuesta adecuada.

### 1.2 Métricas de uso

- **Objetivo:** Entender cómo se usan las tools.
- **Acciones:**
  - Dashboard de tool calls por tipo (ya existe `admin_activity_log`).
  - Tasa de uso de tools vs. respuestas sin tools.
  - Identificar tools poco usadas o que fallan con frecuencia.
- **Herramientas:** `logAdminActivity` ya registra tool calls.

### 1.3 Longitud de respuesta

- **Objetivo:** Respuestas concisas en chat web, más breves en WhatsApp.
- **Acciones:**
  - Añadir instrucción en system prompt: "Responde de forma concisa; evita párrafos largos salvo que el usuario pida detalle."
  - Para WhatsApp: ya existe límite ~300 caracteres en prompts.

---

## 2. Mediano plazo (3-6 meses)

### 2.1 Nuevas tools (implementadas 2026-03-04)

| Tool                        | Descripción                                          | Estado       |
| --------------------------- | ---------------------------------------------------- | ------------ |
| createCustomer              | Crear cliente desde el chat                          | Implementada |
| getAppointmentSlots         | Obtener horarios disponibles para citas              | Implementada |
| rescheduleAppointment       | Reprogramar una cita (con detección de conflictos)   | Implementada |
| sendQuoteByEmail            | Enviar presupuesto por email al cliente              | Implementada |
| getBranchSchedule           | Horarios de sucursal                                 | Implementada |
| suggestLensFromPrescription | Sugerir lentes según receta (presbicia, alto índice) | Implementada |

### 2.2 Integración con calendario

- Sugerir horarios al crear citas: getAppointmentSlots permite al agente ofrecer slots disponibles.
- Detectar conflictos: rescheduleAppointment valida disponibilidad antes de actualizar.
- Recordatorios: ya existe cron de appointment-reminders.

### 2.3 Resúmenes de conversaciones

- Para conversaciones largas (>20 mensajes), generar resumen automático.
- Permitir "Resumir esta conversación" como comando.

### 2.4 Soporte multi-idioma

- Prompts en inglés y portugués.
- Detección de idioma del usuario o configuración por organización.
- Variables de localización en `config.ts`.

---

## 3. Largo plazo (6+ meses)

### 3.1 Fine-tuning (opcional)

- **Cuándo:** Si hay volumen suficiente de conversaciones de alta calidad (feedback 4-5).
- **Qué:** Modelo especializado en dominio óptico y flujos de Opttius.
- **Alternativa:** Mejorar prompts y RAG antes de fine-tuning (más económico).

### 3.2 Agente proactivo

- Sugerencias sin que el usuario pregunte (ej. "Tienes 3 órdenes con entrega atrasada").
- Notificaciones push o en el widget de insights.
- Integrar con cron de insights.

### 3.3 Análisis predictivo

- Predicción de ventas por período.
- Alertas de inventario predictivo (demanda esperada).
- Recomendaciones de compra a proveedores.

### 3.4 Integraciones externas

- APIs de laboratorios ópticos.
- Proveedores de lentes (precios, disponibilidad).
- SII Chile (facturación electrónica) para consultas.

---

## 4. Mejoras de eficiencia

### 4.1 Reducción de tokens

- **Resumir historial:** Para conversaciones largas, sustituir mensajes antiguos por un resumen.
- **Comprimir contexto organizacional:** Solo incluir métricas relevantes para la pregunta.
- **Knowledge base selectiva:** Recuperar solo chunks relevantes (RAG ya lo hace).

### 4.2 Caché de respuestas

- Para preguntas frecuentes idénticas (ej. "¿Qué productos tienen stock bajo?"), cachear respuesta por organización + branch.
- TTL corto (ej. 5-10 min) para no mostrar datos obsoletos.

### 4.3 Routing de modelos

- Preguntas simples (listar, buscar) → modelo más barato (ej. DeepSeek, Gemini Flash).
- Preguntas complejas (análisis, recomendaciones) → modelo premium (Claude, GPT-4).
- Detectar complejidad por longitud, intent de tool o keywords.

---

## 5. Observabilidad

### 5.1 Dashboard de costos

- Ya existe `ai_usage_log` y `AIUsageCard` en analytics.
- **Mejora:** Alertas cuando el coste mensual supere umbral por organización.
- **Mejora:** Desglose por modelo y por tool.

### 5.2 Logs de tool calls

- Patrones de fallo (qué tool falla más).
- Tiempo de ejecución por tool.
- Detección de herramientas que no se usan (candidatas a deprecar).

### 5.3 A/B testing de prompts

- Variantes de system prompt para medir impacto en feedback.
- Métricas: longitud, satisfacción, tasa de uso de tools.

---

## 6. Entrenamiento continuo

### 6.1 Ciclo de mejora

```
1. Recolectar feedback (score + comment)
2. Analizar conversaciones con bajo score
3. Identificar patrones (tool no usada, respuesta incorrecta, tono)
4. Ajustar prompts o tools
5. Desplegar y medir
6. Repetir
```

### 6.2 Fuentes de datos

- `ai_insights.feedback_score`, `feedback_comment`
- `chat_messages` con metadata de tool calls
- `admin_activity_log` para uso de tools

### 6.3 Evaluación cualitativa

- Revisión manual de muestras de conversaciones.
- Casos de prueba documentados en `AGENT_TOOLS_TEST_CHECKLIST.md`.
- Regression testing tras cambios en prompts.

---

## 7. Referencias

- [AI_SYSTEM.md](../AI_SYSTEM.md) - Arquitectura del módulo AI
- [AI_IMPLEMENTATION_STATUS.md](AI_IMPLEMENTATION_STATUS.md) - Estado actual
- [AGENT_TOOLS_REFERENCE.md](AGENT_TOOLS_REFERENCE.md) - Documentación de tools
- [AGENT_TOOLS_TEST_CHECKLIST.md](AGENT_TOOLS_TEST_CHECKLIST.md) - Checklist de testing
- [WHATSAPP_AGENT_TRAINING.md](../WHATSAPP_AGENT_TRAINING.md) - Entrenamiento WhatsApp
