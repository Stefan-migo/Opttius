# Sistema de Métricas y Analíticas - Opttius

Documentación detallada del sistema de analíticas de Opttius. Esta documentación es la base de la estructura de documentación del programa y sirve como referencia para el desarrollo de módulos que exponen métricas (Soporte, CRM, etc.).

---

## 1. Resumen Ejecutivo

El sistema de métricas de Opttius proporciona un dashboard de analíticas para ópticas con KPIs de ventas, trabajos de laboratorio, presupuestos, citas, clientes e inventario. Está diseñado para arquitectura multi-tenant y multi-sucursal, con feature gating por plan de suscripción (`advanced_analytics`).

### Componentes Principales

| Componente          | Ubicación                                                    | Responsabilidad                                                     |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| API Dashboard       | `src/app/api/admin/analytics/dashboard/route.ts`             | Cálculo de KPIs, tendencias, soporte óptico, caché (unstable_cache) |
| API Dashboard Home  | `src/app/api/admin/dashboard/route.ts`                       | Widgets home (productos, órdenes, ingresos)                         |
| Analytics Service   | `src/lib/analytics/analytics-service.ts`                     | computeInventoryMetrics, parseAnalyticsPeriod                       |
| Página Analytics    | `src/app/admin/analytics/page.tsx`                           | UI, gráficos, tab Incidentes                                        |
| Help Text           | `src/lib/analytics-help.ts`                                  | Definiciones de métricas (español)                                  |
| MetricTooltip       | `src/components/admin/MetricTooltip.tsx`                     | Tooltips con ANALYTICS_HELP en KPI cards                            |
| Tooltip             | `src/components/ui/tooltip.tsx`                              | Componente base Radix UI                                            |
| Gráficos            | `src/components/admin/charts/Enhanced*.tsx`                  | Visualización Recharts                                              |
| Support Metrics B2B | `src/app/api/admin/saas-management/support/metrics/route.ts` | Métricas SaaS (root)                                                |

---

## 2. Arquitectura

### 2.1 Flujo de Datos

```
Usuario Admin → Página Analytics → GET /api/admin/analytics/dashboard?period=30
                                        ↓
                              getBranchContext(request)
                                        ↓
                              Validar advanced_analytics (tier)
                                        ↓
                              parseAnalyticsPeriod (Zod)
                                        ↓
                              Queries paralelas (orders, closures, customers, quotes, work_orders, appointments, products, product_branch_stock, optical_internal_support_tickets)
                                        ↓
                              Aplicar filtros branch/org
                                        ↓
                              computeInventoryMetrics (analytics-service)
                                        ↓
                              Calcular KPIs, tendencias, distribuciones
                                        ↓
                              createApiSuccessResponse({ analytics })
```

### 2.2 Fuentes de Datos

| Fuente                             | Uso                                                     |
| ---------------------------------- | ------------------------------------------------------- |
| `cash_register_closures`           | Ingresos POS (preferido cuando hay cierres confirmados) |
| `orders`                           | Ventas POS (fallback), conteo transacciones             |
| `order_items`                      | Top productos, ingresos por categoría                   |
| `lab_work_orders`                  | Trabajos, ingresos lab, tiempos entrega                 |
| `quotes`                           | Presupuestos, conversión                                |
| `appointments`                     | Citas, completación, no-shows                           |
| `customers`                        | Clientes nuevos, recurrentes                            |
| `products`                         | Catálogo                                                |
| `product_branch_stock`             | Inventario por sucursal (quantity, low_stock_threshold) |
| `optical_internal_support_tickets` | Incidentes óptica (tab Incidentes)                      |
| `categories`                       | Nombres para top productos y categorías                 |

### 2.3 Lógica de Branch

- **Sucursal seleccionada**: Todas las métricas filtradas por `branch_id`.
- **Vista global (super admin)**: Filtro `branch_id IN (org_branch_ids)`.
- **Admin sin sucursal**: Queries con `limit(0)` para evitar datos sin contexto.

---

## 3. KPIs y Fórmulas

### 3.1 Ingresos

| KPI              | Fórmula                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| Ingresos POS     | Suma `cash_register_closures.total_sales` (o orders is_pos_sale + paid) |
| Ingresos Lab     | Suma `lab_work_orders.total_amount` donde payment_status = paid         |
| Ingresos Totales | POS + Lab                                                               |
| Crecimiento      | ((Actual - Anterior) / Anterior) × 100                                  |

### 3.2 Trabajos de Laboratorio

- **Pendientes**: Estados quote, ordered, sent_to_lab, received_from_lab, mounted, quality_check
- **Completados**: status = delivered
- **Días promedio entrega**: Promedio(delivered_at - ordered_at) para entregados

### 3.3 Presupuestos

- **Tasa conversión**: (accepted + converted_to_work) / total × 100
- **Valor promedio**: Sum total_amount / total

### 3.4 Citas

- **Tasa completación**: completed / total × 100

### 3.5 Clientes

- **Nuevos**: created_at en rango del período
- **Recurrentes**: Clientes con >1 orden/work order en período (por customer_email o customer_id)

### 3.6 Productos e Inventario

- **Bajo stock**: quantity > 0 AND quantity <= low_stock_threshold
- **Sin stock**: quantity = 0
- **Top productos**: Agrupar order_items por product_id, sum total_price, top 10

---

## 4. Tendencias Diarias

El sistema genera series temporales con un punto por día:

- `sales`: Ingresos diarios (POS + Lab)
- `customers`: Nuevos clientes por día
- `workOrders`: Trabajos creados por día
- `quotes`: Presupuestos creados por día
- `support.trends`: Incidentes creados por día (optical_internal_support_tickets)

Formato: `{ date: "YYYY-MM-DD", value: number, count: number }`

---

## 5. Gráficos y Visualización

### Componentes

- **EnhancedColumnChart**: Barras verticales (ingresos, trabajos, presupuestos)
- **EnhancedBarChart**: Barras horizontales (categorías, top productos)
- **EnhancedLineChart**: Líneas (tendencias)
- **EnhancedAreaChart**: Área (trabajos)
- **EnhancedPieChart**: Circular (estados, métodos de pago)

### Selectores de Tipo

- Ventas, trabajos y presupuestos permiten alternar entre column/line.

---

## 6. Estado de Implementación (Actualizado Feb 2026)

### 6.1 Implementado

| Mejora                                | Estado   | Detalle                                                                                        |
| ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| **Inventario → product_branch_stock** | ✅ Hecho | Analytics y Dashboard usan `product_branch_stock`. Servicio `computeInventoryMetrics`.         |
| **Validación Zod**                    | ✅ Hecho | `analyticsDashboardParamsSchema`, `parseAnalyticsPeriod()`                                     |
| **analyticsService**                  | ✅ Hecho | `src/lib/analytics/analytics-service.ts` con `computeInventoryMetrics`, `parseAnalyticsPeriod` |
| **Help text español**                 | ✅ Hecho | `analytics-help.ts` traducido                                                                  |
| **Métricas soporte óptico**           | ✅ Hecho | Tab "Incidentes" con KPIs, tendencias, por estado y categoría                                  |

### 6.2 Pendiente

- **Vistas materializadas**: Para períodos largos (365 días) y alto volumen.
- **Caché**: Considerar caché 1–5 min para dashboards con alto tráfico.
- **Uso de ANALYTICS_HELP en UI**: El archivo está traducido pero no se importa en tooltips; preparado para uso futuro.

### 6.3 Fortalezas Actuales

1. **Arquitectura multi-tenant**: Filtrado correcto por branch y organización.
2. **Feature gating**: `advanced_analytics` validado por tier.
3. **Inventario correcto**: `product_branch_stock` por sucursal.
4. **Fuente de ingresos dual**: `cash_register_closures` cuando existe.
5. **Respuestas estandarizadas**: `createApiSuccessResponse`, `createApiErrorResponse`.
6. **Logging**: requestId en logs.
7. **Queries paralelas**: `Promise.all`.
8. **Cobertura óptica**: Trabajos, presupuestos, citas, inventario, incidentes.

### 6.4 Escalabilidad

- **Período 365 días**: Puede ser costoso en queries. Considerar:
  - Vistas materializadas para agregados históricos.
  - Caché de corta duración (1–5 min).
- **Muchas sucursales**: La vista global hace `IN (branch_ids)`. Con 50+ sucursales, verificar rendimiento de índices.

---

## 7. Integración con NotebookLM

Esta documentación y el skill `analytics-optical-supabase` están diseñados para ser fuentes en el NotebookLM del proyecto (Notebook ID: `e071bebc-ce79-4b32-a040-61a6a9c331a3`).

Para añadir como fuente:

```bash
export PYTHONIOENCODING=utf-8
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/METRICS_SYSTEM.md --title "Sistema de Métricas Opttius"
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file .cursor/skills/analytics-optical-supabase/SKILL.md --title "Skill Analíticas Óptica"
```

---

## 8. Referencias Rápidas

| Recurso             | Ruta                                                                     |
| ------------------- | ------------------------------------------------------------------------ |
| API Analytics       | `src/app/api/admin/analytics/dashboard/route.ts`                         |
| API Dashboard Home  | `src/app/api/admin/dashboard/route.ts`                                   |
| Analytics Service   | `src/lib/analytics/analytics-service.ts`                                 |
| Página              | `src/app/admin/analytics/page.tsx`                                       |
| Help                | `src/lib/analytics-help.ts`                                              |
| Zod Schema          | `src/lib/api/validation/zod-schemas.ts` (analyticsDashboardParamsSchema) |
| Skill               | `.cursor/skills/analytics-optical-supabase/SKILL.md`                     |
| Support Metrics B2B | `src/app/api/admin/saas-management/support/metrics/route.ts`             |
