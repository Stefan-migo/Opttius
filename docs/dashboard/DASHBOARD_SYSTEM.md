# Sistema Dashboard - Opttius

Documentación detallada del módulo Dashboard del programa Opttius. Esta documentación es la base de la estructura de documentación del proyecto y sirve como referencia para desarrollo, mantenimiento y mejoras.

---

## 1. Resumen Ejecutivo

El Dashboard es el punto de entrada operativo del administrador de una óptica. Ofrece:

- **Visión ejecutiva**: KPIs clave (ingresos, citas, inventario, clientes)
- **Alertas críticas**: Bajo stock, trabajos pendientes
- **Accesos rápidos**: POS, agenda, taller, búsqueda cliente/producto
- **Citas del día**: Listado de compromisos diarios
- **Tendencias**: Evolución de ingresos, estado operativo

---

## 2. Arquitectura

### 2.1 Niveles de Dashboard

| Nivel                   | Ruta               | API                              | Descripción                                                          |
| ----------------------- | ------------------ | -------------------------------- | -------------------------------------------------------------------- |
| **Dashboard Principal** | `/admin`           | `/api/admin/dashboard`           | Vista ejecutiva diaria. Siempre accesible.                           |
| **Analytics**           | `/admin/analytics` | `/api/admin/analytics/dashboard` | Análisis profundo. Requiere tier Pro/Premium (`advanced_analytics`). |

### 2.2 Flujo de Datos

```
[Admin Page] → fetch(/api/admin/dashboard?period=7|30|90|365)
                    ↓
[API Route] → getBranchContext() → addBranchFilter()
                    ↓
[Supabase] → orders, products, cash_register_closures,
             product_branch_stock, customers, appointments,
             lab_work_orders, quotes
                    ↓
[Respuesta] → kpis, todayAppointments, lowStockProducts, charts
```

### 2.3 Multi-Tenant y Branch

- **Header `x-branch-id`**:
  - UUID de sucursal: datos de esa sucursal
  - `"global"`: vista agregada de todas las sucursales (solo super_admin)
- **Filtrado**:
  - Con branch: `branch_id = X`
  - Vista global: `branch_id IN (orgBranchIds)` o `organization_id.eq(orgId)`

---

## 3. Estructura de Archivos

```
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx              # Dashboard principal (AdminDashboard)
│   │   ├── analytics/
│   │   │   └── page.tsx          # Página Analytics
│   │   └── layout.tsx             # Layout con nav, BranchSelector, stats
│   └── api/
│       └── admin/
│           ├── dashboard/
│           │   └── route.ts      # API Dashboard principal
│           └── analytics/
│               └── dashboard/
│                   └── route.ts # API Analytics (con caché)
├── components/
│   └── admin/
│       ├── DashboardSearch.tsx   # Búsqueda cliente/producto
│       └── charts/              # Enhanced* (usados en Analytics)
├── lib/
│   ├── analytics-help.ts         # ANALYTICS_HELP, EMPTY_STATE_MESSAGES
│   └── analytics/
│       └── analytics-service.ts  # computeInventoryMetrics, parseAnalyticsPeriod
└── hooks/
    └── useBranch.ts             # currentBranchId, isSuperAdmin, branches
```

---

## 4. KPIs y Métricas

### 4.1 Dashboard Principal

| KPI          | Fuente                          | Descripción                          |
| ------------ | ------------------------------- | ------------------------------------ |
| Ingresos     | cash_register_closures / orders | Mes actual vs anterior, % cambio     |
| Citas hoy    | appointments                    | Total, confirmadas, pendientes       |
| Inventario   | product_branch_stock            | Total activo, bajo stock, sin stock  |
| Clientes     | customers                       | Total, nuevos en ciclo               |
| Trabajos     | lab_work_orders                 | Pendientes, en progreso, completados |
| Presupuestos | quotes                          | Total, pendientes, convertidos       |

### 4.2 Gráficos

- **Evolución de Ingresos**: AreaChart, período configurable (7/30/90/365 días)
- **Estado Operativo**: PieChart (en progreso, pendientes, concluidos)
- **Best Sellers**: BarChart horizontal, top 5 productos por ingresos

### 4.3 Reglas de Negocio

- **Inventario**: NUNCA usar `products.inventory_quantity`. Usar `product_branch_stock`.
- **Ingresos**: Preferir `cash_register_closures` cuando existan cierres confirmados.
- **Período**: Validar 7–365 días en API.

---

## 5. Componentes Principales

### 5.1 AdminDashboard (`page.tsx`)

- Estado: `data`, `isLoading`, `error`, `revenuePeriod`, `isAppointmentModalOpen`
- Efectos: `fetchDashboardData()` en `currentBranchId`, `isGlobalView`, `revenuePeriod`
- Secciones: Header, Stock Alert Banner, KPI Cards, Charts, Citas del día, Quick Actions, Modal Cita

### 5.2 DashboardSearch

- Búsqueda por tipo: `customer` | `product`
- Debounce 300ms, mínimo 2 caracteres
- Endpoints: `/api/admin/customers/search`, `/api/admin/products/search`
- Navegación: `/admin/customers/:id`, `/admin/products/edit/:id`

### 5.3 CreateAppointmentForm (Modal)

- Carga dinámica (`dynamic`) para reducir bundle
- Callback `onSuccess` → cierra modal, refresca dashboard, toast

---

## 6. API Dashboard Principal

### 6.1 Endpoint

```
GET /api/admin/dashboard?period=7|30|90|365
Headers: x-branch-id (opcional)
```

### 6.2 Respuesta

```typescript
{
  success: true,
  data: {
    branch: { id, is_global, is_super_admin },
    kpis: {
      products: { total, lowStock, outOfStock },
      orders: { total, pending, processing, completed, failed },
      revenue: { current, previous, change, currency },
      customers: { total, new, returning },
      appointments: { today, scheduled, confirmed, pending },
      workOrders: { total, inProgress, pending, completed },
      quotes: { total, pending, converted }
    },
    todayAppointments: [...],
    lowStockProducts: [...],
    charts: {
      revenueTrend: [{ date, revenue, orders }],
      ordersStatus: { pending, processing, completed, ... },
      topProducts: [{ name, revenue, quantity }]
    }
  }
}
```

### 6.3 Autenticación y Autorización

- Usuario autenticado
- RPC `is_admin` para verificar rol admin
- Branch context desde headers y sesión

---

## 7. Integración con Otros Módulos

| Módulo     | Integración                                                     |
| ---------- | --------------------------------------------------------------- |
| POS        | Botón "Venta Rápida" → `/admin/pos`                             |
| Agenda     | Citas del día, botón "Gestionar Agenda" → `/admin/appointments` |
| Taller     | Badge pendientes, botón "Taller" → `/admin/work-orders`         |
| Inventario | Alerta bajo stock → `/admin/products?filter=low_stock`          |
| IA         | Insights diarios (cron), Chatbot con contexto `dashboard`       |
| Analytics  | Enlace desde nav → `/admin/analytics`                           |

---

## 8. Identidad Visual (Epoch)

- **Primary**: `#1A2B23` (Forest Green)
- **Accent**: `#C5A059` (Vintage Gold)
- **Surface**: `#121212` (Charcoal)
- **Background**: `#F9F7F2` (Elegant Cream)
- Gráficos: `var(--chart-1)` a `var(--chart-5)`

---

## 9. Posibles Mejoras (Estado Actual vs Objetivo)

### 9.1 Código y Arquitectura

| Área                   | Estado Actual                                             | Mejora Propuesta                                                                      |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Tamaño de page.tsx** | ~1030 líneas, todo en un archivo                          | Extraer `KpiCard`, `ChartCard`, `AppointmentsList`, `QuickActionsPanel` a componentes |
| **Tipado**             | `any[]` en todayAppointments, lowStockProducts            | Definir interfaces `AppointmentListItem`, `LowStockProduct`                           |
| **Duplicación**        | Lógica de branch/period similar en Dashboard y Analytics  | Crear hook `useDashboardData(period)` o servicio compartido                           |
| **DashboardSearch**    | Usa `inventory_quantity` (deprecado) en subtitle producto | Usar `product_branch_stock` o endpoint que devuelva stock por branch                  |

### 9.2 API y Rendimiento

| Área           | Estado Actual                                             | Mejora Propuesta                                        |
| -------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| **Caché**      | Dashboard principal sin caché                             | Caché corta (1–3 min) como Analytics para reducir carga |
| **Queries**    | Varias secuenciales (appointments, todayAppointmentsList) | Paralelizar con `Promise.all` donde sea posible         |
| **requestId**  | No usado en dashboard API                                 | Añadir `requestId` para trazabilidad como en analytics  |
| **Validación** | `period` parseado manualmente                             | Usar `analyticsDashboardParamsSchema` o similar         |

### 9.3 UX y Accesibilidad

| Área             | Estado Actual                                       | Mejora Propuesta                                        |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------- |
| **Empty states** | Mensajes genéricos                                  | Usar `EMPTY_STATE_MESSAGES` de analytics-help           |
| **Skeleton**     | Genérico                                            | Skeleton que refleje estructura real (4 KPIs, 2 charts) |
| **Navegación**   | `window.location.href` en botones Catálogo/Clientes | Usar `<Link>` de Next.js para SPA                       |
| **Responsive**   | Grid adaptativo                                     | Revisar breakpoints en móvil para KPIs y charts         |

### 9.4 Funcionalidad

| Área               | Estado Actual                          | Mejora Propuesta                                                 |
| ------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| **Refresh**        | Solo al montar o cambiar branch/period | Botón "Actualizar" manual como en Analytics                      |
| **Export**         | No hay exportación                     | Exportar resumen a PDF/Excel (tier avanzado)                     |
| **Filtro período** | Solo en revenue trend                  | Considerar período global para KPIs si se requiere               |
| **BranchSelector** | En layout, no en página dashboard      | Mantener en layout; asegurar que dashboard refleje branch actual |

### 9.5 Consistencia con Analytics

| Área                        | Estado Actual                 | Mejora Propuesta                                    |
| --------------------------- | ----------------------------- | --------------------------------------------------- |
| **Componentes de gráficos** | Recharts directo en Dashboard | Evaluar uso de `Enhanced*` para consistencia visual |
| **Formato de precios**      | `formatCurrency`              | Mismo que Analytics (`formatPrice` con Intl)        |
| **Labels de estado**        | Hardcodeados en badges        | Centralizar en `analytics-help` o `lib/labels`      |

---

## 10. Checklist de Calidad (Desarrollo)

- [ ] Filtro organization_id / branch_id en todas las queries
- [ ] Usar product_branch_stock para inventario
- [ ] Validación de período (7–365)
- [ ] Logging con requestId
- [ ] Respuestas estandarizadas (createApiSuccessResponse)
- [ ] Skeleton durante carga
- [ ] Empty states informativos
- [ ] Navegación con Link (no window.location)
- [ ] Tipado estricto (evitar any)

---

## 11. Referencias

- Skill: `.cursor/skills/dashboard-optical-supabase/SKILL.md`
- Analytics Skill: `.cursor/skills/analytics-optical-supabase/SKILL.md`
- NOTEBOOKLM_CUADERNOS_GUIA: `docs/NOTEBOOKLM_CUADERNOS_GUIA.md`
