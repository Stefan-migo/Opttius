# Mejoras del Sistema de Métricas - Febrero 2026

Documento que detalla las modificaciones implementadas y el checklist de pruebas manuales.

---

## 1. Resumen de Modificaciones Implementadas

### 1.1 Crítico: Migración de inventario a product_branch_stock

**Antes**: Se usaban las columnas deprecadas `products.inventory_quantity` y `products.low_stock_threshold`.

**Después**:

- **Analytics** (`/api/admin/analytics/dashboard`): Query a `product_branch_stock` con filtro por branch. Cálculo de bajo stock y sin stock desde la tabla correcta.
- **Dashboard Home** (`/api/admin/dashboard`): Misma migración. Lista de productos en bajo stock con `currentStock`, `threshold`, `slug` desde `product_branch_stock`.
- **Lógica**: Vista sucursal = 1 branch. Vista global = todas las sucursales de la org. Productos sin registro = stock 0.

**Archivos afectados**:

- `src/app/api/admin/analytics/dashboard/route.ts`
- `src/app/api/admin/dashboard/route.ts`

---

### 1.2 Medio: Validación Zod de parámetros

**Antes**: `parseInt(searchParams.get("period") || "30")` sin validación.

**Después**:

- Schema `analyticsDashboardParamsSchema` en `src/lib/api/validation/zod-schemas.ts`
- `period`: z.coerce.number().int().min(7).max(365).default(30)
- Uso de `parseAnalyticsPeriod(searchParams)` en la API de analytics.

**Archivos afectados**:

- `src/lib/api/validation/zod-schemas.ts`
- `src/app/api/admin/analytics/dashboard/route.ts`

---

### 1.3 Medio: Servicio analyticsService

**Nuevo archivo**: `src/lib/analytics/analytics-service.ts`

**Funciones**:

- `computeInventoryMetrics(productBranchStock, productIdsInCatalog, options?)`: Calcula lowStock, outOfStock y opcionalmente lista de productos en bajo stock.
- `parseAnalyticsPeriod(searchParams)`: Parsea y valida el parámetro period.

**Uso**:

- Analytics route: usa `computeInventoryMetrics` para métricas de productos.
- Dashboard route: usa `computeInventoryMetrics` con `products` y `maxLowStockList: 5` para la lista de widgets.

---

### 1.4 Bajo: Traducción de help text

**Antes**: `ANALYTICS_HELP` y `EMPTY_STATE_MESSAGES` en inglés.

**Después**: Todo traducido al español en `src/lib/analytics-help.ts`.

**Actualización Feb 2026**: Integrado en tooltips (ver 1.6).

---

### 1.6 Implementado Feb 2026: Tooltips con ANALYTICS_HELP

**Objetivo**: Exponer las definiciones de métricas en español mediante tooltips en la página de analytics.

**Implementación**:

- **Componente Tooltip** (`src/components/ui/tooltip.tsx`): Creado con Radix UI (@radix-ui/react-tooltip).
- **MetricTooltip** (`src/components/admin/MetricTooltip.tsx`): Componente que muestra título, descripción, detalles y fórmula de cada métrica al hacer hover sobre icono de ayuda.
- **TooltipProvider** en `src/app/admin/layout.tsx` envuelve el contenido admin.
- **Integración**: Tooltips en las 8 KPI cards principales (Ingresos Totales, Trabajos, Presupuestos, Citas, Ventas POS, Ingresos Trabajos, Clientes, Productos) y en Métricas de Incidentes.
- **ANALYTICS_HELP ampliado**: Nuevas entradas `workOrdersTotal`, `quoteConversionRate`, `appointmentsTotal`, `appointmentCompletionRate`.

**Archivos afectados**:

- `src/components/ui/tooltip.tsx` (nuevo)
- `src/components/admin/MetricTooltip.tsx` (nuevo)
- `src/app/admin/layout.tsx` (TooltipProvider)
- `src/app/admin/analytics/page.tsx` (integración)
- `src/lib/analytics-help.ts` (entradas nuevas)

---

### 1.7 Implementado Feb 2026: Caché del dashboard

**Objetivo**: Reducir carga en el servidor cuando el dashboard recibe alto tráfico.

**Implementación**:

- Uso de `unstable_cache` de Next.js en `/api/admin/analytics/dashboard`.
- Clave de caché: `analytics-dashboard:${orgId}:${branchId ?? 'global'}:${period}`.
- TTL por defecto: 180 segundos (3 min). Configurable con variable de entorno `ANALYTICS_CACHE_TTL_SECONDS`.

**Archivos afectados**:

- `src/app/api/admin/analytics/dashboard/route.ts`

---

### 1.8 Implementado Feb 2026: Colores Epoch en gráficos

**Objetivo**: Unificar colores con el design system Epoch (FRONTEND_IDENTITY.md).

**Cambios**:

- `#9DC65D` → `#C5A059` (epoch-accent)
- `#1E3A8A` → `#1A2B23` (epoch-primary)
- `#D4A853` → `#C5A059` (epoch-accent)
- `#6366F1` → `#C5A059` (epoch-accent)

**Nota**: Recharts no soporta CSS variables en SVG, por eso se usan hex equivalentes a los tokens Epoch.

---

### 1.9 Implementado Feb 2026: Bordes rectos (rounded-none)

**Objetivo**: Alinear con FRONTEND_IDENTITY.md (versión pre-pivote).

**Implementación**: Todas las Cards en la página de analytics usan `rounded="none"`.

**Nota (2026-02-22):** El design system ha pivotado a `rounded-xl`/`rounded-2xl`. Evaluar migración de analytics cards en futuras iteraciones.

---

### 1.5 Bajo: Métricas de soporte óptico

**Nuevo**:

- Query a `optical_internal_support_tickets` con filtros por `organization_id` y `branch_id`.
- Payload `support`: total, open, resolved, avgResolutionMinutes, byStatus, byCategory, trends.
- Tab "Incidentes" en la página de analíticas con:
  - KPI cards: Total, Abiertos, Resueltos, Tiempo promedio resolución.
  - Gráfico de tendencia (tickets por día).
  - Gráficos circulares: por estado y por categoría.

**Archivos afectados**:

- `src/app/api/admin/analytics/dashboard/route.ts`
- `src/app/admin/analytics/page.tsx`

---

## 2. Pendiente (no implementado)

| Item                      | Prioridad | Descripción                                                                      |
| ------------------------- | --------- | -------------------------------------------------------------------------------- |
| Vistas materializadas     | Baja      | Para períodos 365 días y alto volumen                                            |
| Exportación de reportes   | Media     | PDF/Excel para reportes de analytics                                             |
| Caché distribuido (Redis) | Baja      | Si se escala a múltiples instancias, considerar Redis en lugar de unstable_cache |

---

## 3. Checklist de Pruebas Manuales

### 3.1 Autenticación y acceso

- [ ] Acceder a `/admin/analytics` como admin con plan Pro/Premium (advanced_analytics).
- [ ] Verificar que sin advanced_analytics se muestra error de acceso.
- [ ] Verificar que sin sesión se redirige a login.

### 3.2 Selector de período y sucursal

- [ ] Cambiar período (7, 30, 90, 365 días) y verificar que los datos se actualizan.
- [ ] Probar períodos inválidos (ej. period=3 o period=500) y verificar que se aplica default 30 o validación.
- [ ] Como super admin: verificar que el selector de sucursal muestra "Todas" o sucursales.
- [ ] Seleccionar sucursal específica y verificar que los datos se filtran por esa sucursal.

### 3.3 Métricas de inventario (product_branch_stock)

- [ ] **Analytics**: Verificar que "Bajo Stock" y "Sin Stock" en la sección Productos muestran valores coherentes.
- [ ] **Analytics**: Verificar que los productos en bajo stock corresponden a registros en `product_branch_stock` con quantity <= low_stock_threshold.
- [ ] **Dashboard Home** (`/admin`): Verificar que la lista "Productos en bajo stock" muestra productos correctos con `currentStock` y `threshold`.
- [ ] **Vista global**: Con super admin sin sucursal, verificar que inventario agrega correctamente todas las sucursales de la org.
- [ ] **Vista sucursal**: Verificar que inventario solo considera la sucursal seleccionada.

### 3.4 Tab Incidentes (soporte óptico)

- [ ] Verificar que el tab "Incidentes" aparece en la página de analytics.
- [ ] Si hay tickets en `optical_internal_support_tickets`: verificar Total, Abiertos, Resueltos.
- [ ] Verificar que el tiempo promedio de resolución se muestra correctamente (o "-" si no hay datos).
- [ ] Verificar que los gráficos por estado y por categoría muestran datos correctos.
- [ ] Verificar que la tendencia de tickets por día se renderiza.
- [ ] Si no hay tickets: verificar que el tab sigue visible y muestra "No hay incidentes en este período" donde corresponde.

### 3.5 Gráficos y datos generales

- [ ] Verificar que los gráficos de ventas, trabajos, presupuestos se cargan.
- [ ] Alternar entre barras y líneas en ventas/trabajos/presupuestos.
- [ ] Verificar que los gráficos de métodos de pago y categorías funcionan.
- [ ] Verificar que los gráficos de estados (trabajos, presupuestos) se muestran correctamente.

### 3.6 Dashboard Home

- [ ] Verificar que la página de inicio (`/admin`) carga correctamente.
- [ ] Verificar que los widgets de productos (total, bajo stock, sin stock) muestran valores correctos.
- [ ] Verificar que la lista de productos en bajo stock tiene enlaces o datos correctos.

### 3.7 Respuesta de errores

- [ ] Probar con period inválido (ej. "abc") y verificar que la API responde con error de validación o valor por defecto.
- [ ] Verificar que sin sucursal (admin sin branch) los datos no se muestran o se muestran vacíos según diseño.

### 3.8 Tooltips (implementado Feb 2026)

- [ ] Verificar que cada KPI card (Ingresos Totales, Trabajos, Presupuestos, Citas, Ventas POS, Ingresos Trabajos, Clientes, Productos) muestra un icono de ayuda (?) junto al título.
- [ ] Hacer hover sobre el icono y verificar que aparece un tooltip con título, descripción, detalles y fórmula de la métrica.
- [ ] Verificar que el tooltip de "Métricas de Incidentes" funciona en el tab Incidentes.
- [ ] Verificar que los tooltips se muestran correctamente en modo claro y oscuro.

### 3.9 Caché del dashboard

- [ ] Cargar `/admin/analytics` con un período (ej. 30 días).
- [ ] Recargar la página inmediatamente: la segunda carga debería ser más rápida (datos cacheados).
- [ ] Cambiar período o sucursal: debe recalcular (nueva clave de caché).
- [ ] Esperar 3+ minutos y recargar: debe refrescar datos (TTL expirado).

### 3.10 Colores y bordes (Epoch)

- [ ] Verificar que los gráficos usan paleta Epoch (verde bosque #1A2B23, dorado #C5A059).
- [ ] Verificar que las cards tienen bordes rectos (sin esquinas redondeadas).

---

## 4. Comandos para actualizar NotebookLM

```bash
# Notebook ID: e071bebc-ce79-4b32-a040-61a6a9c331a3
export PYTHONIOENCODING=utf-8
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/METRICS_SYSTEM.md --title "Sistema de Métricas Opttius"
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/METRICS_IMPROVEMENTS_2026-02.md --title "Mejoras Métricas Feb 2026 - Tooltips Caché Colores Checklist"
```
