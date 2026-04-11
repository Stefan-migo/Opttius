---
name: dashboard-optical-supabase
description: Expert guide for building and maintaining the Dashboard module for optical shops with Supabase. Use when working on dashboard, resumen ejecutivo, KPIs ópticos, vista general, métricas operativas, citas del día, alertas de inventario, quick actions, or optical shop executive overview. Covers multi-tenant architecture, branch-scoped data, Cash-First logic, optical-specific KPIs, and dashboard UX best practices.
---

# Dashboard para Ópticas con Supabase

Guía para desarrollar y mantener un Dashboard de alta gama para ópticas usando Supabase y Next.js. El Dashboard es el punto de entrada operativo del admin y debe ofrecer visión ejecutiva, accesos rápidos y alertas críticas.

## Cuándo Usar Este Skill

- Dashboard principal (`/admin`)
- Resumen ejecutivo y KPIs operativos
- Citas del día y agenda
- Alertas de inventario (bajo stock)
- Quick actions (búsqueda cliente/producto, nueva cita)
- Gráficos de tendencia (ingresos, estado operativo)
- Integración con Analytics (`/admin/analytics`)

## Arquitectura del Sistema Dashboard

### Dos Niveles de Dashboard

| Nivel                   | Ruta               | API                              | Propósito                                                             |
| ----------------------- | ------------------ | -------------------------------- | --------------------------------------------------------------------- |
| **Dashboard Principal** | `/admin`           | `/api/admin/dashboard`           | Vista ejecutiva diaria, KPIs clave, citas hoy, alertas, quick actions |
| **Analytics**           | `/admin/analytics` | `/api/admin/analytics/dashboard` | Análisis profundo, tendencias, reportes, feature `advanced_analytics` |

El Dashboard principal es siempre accesible; Analytics requiere tier Pro/Premium.

### Fuentes de Datos (Dashboard Principal)

| Tabla / Fuente           | Uso                                                                     |
| ------------------------ | ----------------------------------------------------------------------- |
| `cash_register_closures` | Ingresos (preferido sobre orders)                                       |
| `orders`                 | Fallback ingresos, top productos, distribución estados                  |
| `product_branch_stock`   | Inventario, bajo stock, sin stock (NUNCA `products.inventory_quantity`) |
| `products`               | Catálogo activo, conteo total                                           |
| `customers`              | Cartera, nuevos en período                                              |
| `appointments`           | Citas del día, confirmadas, pendientes                                  |
| `lab_work_orders`        | Estado operativo (pendientes, en progreso, completados)                 |
| `quotes`                 | Presupuestos pendientes, convertidos                                    |

## Multi-Tenant y Branch Context

### Headers Obligatorios

```typescript
// Branch seleccionada
headers["x-branch-id"] = currentBranchId;

// Vista global (super admin, todas las sucursales)
headers["x-branch-id"] = "global";
```

### Lógica de Filtrado

- **Con branch**: Filtrar por `branch_id` en todas las queries.
- **Vista global**: Usar `branch_id IN (orgBranchIds)` o `organization_id.eq(orgId)` según tabla.
- **Sin branch + no super admin**: Devolver datos vacíos o según política.

## KPIs Ópticos del Dashboard Principal

### Prioridad de Visualización

1. **Ingresos** – Rendimiento mensual, cambio vs mes anterior
2. **Citas del día** – Agenda hoy, confirmadas
3. **Inventario** – Total activo, alertas críticas (bajo stock)
4. **Clientes** – Cartera total, nuevos en ciclo
5. **Trabajos** – Pendientes, en progreso, completados
6. **Presupuestos** – Total, pendientes, convertidos

### Cálculo de Ingresos

- Preferir `cash_register_closures.total_sales` cuando existan cierres confirmados.
- Fallback: `orders` con `status === "completed"` o `payment_status === "paid"`.

### Inventario

- Usar siempre `product_branch_stock` para:
  - `quantity` (stock físico)
  - `low_stock_threshold` (umbral por sucursal)
- `computeInventoryMetrics()` en `analytics-service` centraliza la lógica.

## Mejores Prácticas de Código

### 1. Código Limpio

- Extraer componentes reutilizables: `KpiCard`, `ChartCard`, `EmptyState`.
- Evitar archivos > 500 líneas; dividir en subcomponentes.
- Usar tipos TypeScript para `DashboardData` y respuestas API.

### 2. Lógica Sencilla

- Separar fetch de datos (API) de presentación (UI).
- Un único `useEffect` de carga por `currentBranchId` + `period`.
- Evitar lógica duplicada entre Dashboard y Analytics.

### 3. Estados de UI

- `isLoading`: Skeleton inicial.
- `error`: Mensaje amigable + botón reintentar.
- `data`: Estado normal con datos.

### 4. Empty States

- Mensajes claros y orientados a acción.
- Usar `ANALYTICS_HELP` y `EMPTY_STATE_MESSAGES` de `analytics-help.ts` cuando aplique.

### 5. Accesibilidad

- `data-tour` para onboarding (ej: `data-tour="dashboard-header"`).
- Labels descriptivos en gráficos.
- Contraste adecuado (paleta Epoch).

## Componentes Clave

- `DashboardSearch` – Búsqueda cliente/producto con debounce.
- `CreateAppointmentForm` – Modal nueva cita.
- `BranchSelector` – Selector de sucursal (super admin).
- Gráficos: Recharts (AreaChart, PieChart, BarChart) con estilos Epoch.

## Integración con Otros Módulos

- **POS**: Botón "Venta Rápida" → `/admin/pos`.
- **Agenda**: Citas del día → `/admin/appointments`.
- **Taller**: Trabajos pendientes → `/admin/work-orders`.
- **Inventario**: Alertas bajo stock → `/admin/products?filter=low_stock`.
- **IA**: Insights diarios vía `prepareInsightData` y cron job.

## Checklist de Calidad

- [ ] Filtro `organization_id` / `branch_id` en todas las queries.
- [ ] Usar `product_branch_stock` para inventario (no `products.inventory_quantity`).
- [ ] Validación de período (7–365 días) para revenue trend.
- [ ] Logging con `requestId` en API.
- [ ] Respuestas estandarizadas (`createApiSuccessResponse`).
- [ ] Skeleton durante carga.
- [ ] Empty states informativos.

## Referencias

- Página: `src/app/admin/page.tsx`
- API: `src/app/api/admin/dashboard/route.ts`
- Analytics: `src/app/admin/analytics/page.tsx`, `src/app/api/admin/analytics/dashboard/route.ts`
- Help: `src/lib/analytics-help.ts`
- Skills relacionados: `analytics-optical-supabase`, `inventory-optical-supabase`, `pos-optical-supabase`, `appointments-optical-supabase`
