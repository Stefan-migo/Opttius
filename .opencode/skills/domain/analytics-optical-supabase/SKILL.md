---
name: analytics-optical-supabase
description: Expert guide for building and maintaining a high-quality analytics and metrics system for optical shops with Supabase. Use when working on métricas, analíticas, dashboard, KPIs, reportes, tendencias, revenue, work orders analytics, quotes conversion, appointments metrics, product performance, or optical business intelligence. Covers multi-tenant architecture, branch-scoped metrics, Cash-First logic alignment, and optical-specific KPIs.
---

# Sistema de Métricas y Analíticas para Ópticas con Supabase

Guía para desarrollar y mantener un sistema de analíticas de alta gama para ópticas usando Supabase y Next.js. Este skill es la base de referencia para otros módulos (Soporte, CRM, POS) que exponen métricas.

## Cuándo Usar Este Skill

- Dashboard de analíticas y KPIs
- Métricas de ventas (POS, trabajos de laboratorio)
- Tendencias temporales (ingresos, clientes, presupuestos, citas)
- Métricas de conversión (presupuestos → trabajo)
- Métricas de inventario (stock bajo, productos top)
- Integración con IA/insights
- Reportes ejecutivos y exportación
- Métricas de soporte (tiempos de resolución, categorías)

## Arquitectura Core

### Fuentes de Datos

| Tabla / Fuente                      | Uso en Analíticas                                                    |
| ----------------------------------- | -------------------------------------------------------------------- |
| `cash_register_closures`            | Ingresos POS (preferido sobre orders cuando hay cierres confirmados) |
| `orders`                            | Ventas POS (fallback), order_items para top productos                |
| `lab_work_orders`                   | Trabajos de laboratorio, ingresos lab, tiempos de entrega            |
| `quotes`                            | Presupuestos, tasa de conversión                                     |
| `appointments`                      | Citas, tasa de completación, no-shows                                |
| `customers`                         | Clientes nuevos, recurrentes                                         |
| `products` + `product_branch_stock` | Stock, alertas bajo stock, top productos                             |
| `optical_internal_support_tickets`  | Incidentes óptica, tiempos resolución                                |
| `saas_support_tickets`              | Soporte B2B (root/dev)                                               |

### Regla Crítica: Inventario

**NUNCA usar `products.inventory_quantity` ni `products.low_stock_threshold`.** Están DEPRECADOS. Usar siempre `product_branch_stock` para:

- `quantity` (stock físico)
- `low_stock_threshold` (umbral por sucursal)
- `available_quantity` (quantity - reserved_quantity)

Para métricas de inventario en vista global: agregar sobre `product_branch_stock` filtrando por `branch_id IN (org_branches)`.

## Multi-Tenant y Branch

### Filtrado Obligatorio

1. **organization_id**: Siempre filtrar por organización.
2. **branch_id**: Si el usuario tiene sucursal seleccionada, filtrar por ella.
3. **Vista global (super admin)**: Filtrar por `branch_id IN (org_branch_ids)`.
4. **Admin sin branch**: Devolver datos vacíos o según política (evitar datos sin contexto).

### Headers

- `x-branch-id`: Sucursal seleccionada (opcional).
- Sin header + super admin: vista global de la organización.

### Lógica de Visibilidad

```typescript
if (branchContext.branchId) {
  ordersQuery = ordersQuery.eq("branch_id", branchContext.branchId);
} else if (
  branchContext.isSuperAdmin &&
  !branchContext.branchId &&
  orgBranchIds.length > 0
) {
  ordersQuery = ordersQuery.in("branch_id", orgBranchIds);
} else if (!branchContext.isSuperAdmin) {
  ordersQuery = ordersQuery.is("branch_id", null).limit(0); // Sin datos
}
```

## KPIs Óptica-Específicos

### Ingresos

| KPI              | Fuente                                                    | Fórmula                                |
| ---------------- | --------------------------------------------------------- | -------------------------------------- |
| Ingresos POS     | cash_register_closures.total_sales (o orders is_pos_sale) | Suma de total_sales en período         |
| Ingresos Lab     | lab_work_orders (payment_status=paid)                     | Suma total_amount                      |
| Ingresos Totales | POS + Lab                                                 | Suma de ambos                          |
| Crecimiento      | Período actual vs anterior                                | ((Actual - Anterior) / Anterior) × 100 |

### Trabajos de Laboratorio

| KPI                   | Descripción                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| Total trabajos        | COUNT lab_work_orders en período                                                |
| Pendientes            | Estados: quote, ordered, sent_to_lab, received_from_lab, mounted, quality_check |
| Completados           | status = delivered                                                              |
| Cancelados            | status = cancelled                                                              |
| Días promedio entrega | Promedio (delivered_at - ordered_at) para entregados                            |

### Presupuestos

| KPI                     | Descripción                             |
| ----------------------- | --------------------------------------- |
| Total presupuestos      | COUNT quotes                            |
| Aceptados + Convertidos | status IN (accepted, converted_to_work) |
| Tasa conversión         | (Aceptados + Convertidos) / Total × 100 |
| Valor promedio          | Sum total_amount / Total                |

### Citas

| KPI               | Descripción               |
| ----------------- | ------------------------- |
| Total citas       | COUNT appointments        |
| Completadas       | status = completed        |
| No-show           | status = no_show          |
| Tasa completación | Completadas / Total × 100 |

### Clientes

| KPI               | Descripción                                 |
| ----------------- | ------------------------------------------- |
| Total clientes    | COUNT customers (en scope branch/org)       |
| Nuevos en período | created_at en rango                         |
| Recurrentes       | Clientes con >1 orden/work order en período |

### Productos e Inventario

| KPI           | Fuente               | Descripción                                           |
| ------------- | -------------------- | ----------------------------------------------------- |
| Bajo stock    | product_branch_stock | quantity > 0 AND quantity <= low_stock_threshold      |
| Sin stock     | product_branch_stock | quantity = 0                                          |
| Top productos | order_items          | Agrupar por product_id, sum total_price, ordenar desc |

## Mejores Prácticas

### 1. Respuestas Estandarizadas

```typescript
return createApiSuccessResponse({ analytics }, { requestId });
return createApiErrorResponse(error, { requestId });
```

### 2. Validación de Período

```typescript
const period = Math.min(
  365,
  Math.max(7, parseInt(searchParams.get("period") || "30", 10)),
);
```

### 3. Logging con requestId

```typescript
const requestId = crypto.randomUUID();
logger.debug("Analytics Dashboard API called", { requestId });
logger.info("Analytics calculated successfully", {
  period,
  branchId,
  requestId,
});
```

### 4. Feature Gating

- `advanced_analytics`: Feature de tier (Pro/Premium). Validar con `validateFeature(orgId, "advanced_analytics")`.
- Si no tiene acceso: `AuthorizationError("Analíticas avanzadas no están incluidas en tu plan")`.

### 5. Cálculo de Período Anterior

Para crecimiento, usar mismo tamaño de período:

```typescript
const prevPeriodStart = new Date(startDate);
prevPeriodStart.setDate(prevPeriodStart.getDate() - period);
// Período anterior: [prevPeriodStart, startDate)
```

### 6. Tendencias Diarias

Generar series con un punto por día para gráficos:

```typescript
for (let i = 0; i < period; i++) {
  const currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + i);
  const dateStr = currentDate.toISOString().split("T")[0];
  // Filtrar datos del día y agregar a trends
}
```

### 7. Métodos de Pago

- Preferir `cash_register_closures` (cash_sales, debit_card_sales, etc.) cuando existan.
- Fallback: `orders.payment_method_type` para ventas POS.

## API y Estructura

### Endpoint Principal

| Método | Ruta                                     | Descripción |
| ------ | ---------------------------------------- | ----------- | --- | ---- | ------------------ |
| GET    | `/api/admin/analytics/dashboard?period=7 | 30          | 90  | 365` | Dashboard completo |

### Parámetros

- `period`: Días (7, 30, 90, 365). Default: 30.
- Header `x-branch-id`: Sucursal (opcional).

### Estructura de Respuesta

```typescript
{
  data: {
    analytics: {
      kpis: { totalRevenue, posRevenue, workOrdersRevenue, revenueGrowth, ... },
      workOrders: { total, pending, completed, cancelled, byStatus },
      quotes: { total, accepted, rejected, conversionRate, byStatus },
      appointments: { total, completed, noShow, completionRate, byStatus },
      products: { total, lowStock, outOfStock, topProducts, categoryRevenue },
      paymentMethods: [{ method, count, revenue }],
      trends: { sales, customers, workOrders, quotes },
      period: { from, to, days }
    }
  }
}
```

## Componentes de Visualización

### Gráficos Reutilizables

- `EnhancedColumnChart` – Barras verticales
- `EnhancedBarChart` – Barras horizontales
- `EnhancedLineChart` – Líneas
- `EnhancedAreaChart` – Área
- `EnhancedPieChart` – Circular

### Help Text

- `src/lib/analytics-help.ts`: `ANALYTICS_HELP`, `EMPTY_STATE_MESSAGES`.
- Usar para tooltips y mensajes de estado vacío.

## Integración con Otros Módulos

### Soporte (optical_internal_support_tickets)

- KPI: Total tickets, resueltos, tiempo promedio resolución.
- Trend: Tickets por día.
- Top categorías.

### IA Insights

- `prepare-data` usa analytics para comparar ventas período actual vs anterior.
- Breakdown por tipo: frames, lenses, contactLenses, accessories (heurística por product_name).

## Checklist de Calidad

- [ ] Filtro organization_id / branch_id en todas las queries.
- [ ] Usar product_branch_stock para inventario (no products.inventory_quantity).
- [ ] Validación de período (7–365 días).
- [ ] Feature gating advanced_analytics.
- [ ] Logging con requestId.
- [ ] Respuestas estandarizadas (createApiSuccessResponse).
- [ ] Índices en (branch_id, created_at), (organization_id, created_at).
- [ ] Evitar N+1: usar Promise.all para queries paralelas.

## Escalabilidad

- **Paginación**: No aplica al dashboard (datos agregados). Para listados grandes, considerar límites.
- **Vistas materializadas**: Para períodos largos (365 días) y muchas sucursales, evaluar vistas o jobs nocturnos.
- **Caché**: Considerar caché de corta duración (1–5 min) para dashboards con alto tráfico.
- **Queries paralelas**: Usar Promise.all para órdenes, clientes, quotes, work orders, appointments.

## Referencias

- API: `src/app/api/admin/analytics/dashboard/route.ts`
- Página: `src/app/admin/analytics/page.tsx`
- Help: `src/lib/analytics-help.ts`
- Charts: `src/components/admin/charts/Enhanced*.tsx`
- Support metrics: `src/app/api/admin/saas-management/support/metrics/route.ts`
- Skills relacionados: `support-optical-supabase`, `inventory-optical-supabase`, `pos-optical-supabase`
