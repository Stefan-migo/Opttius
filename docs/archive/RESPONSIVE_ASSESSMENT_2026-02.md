# Evaluación de Responsividad y Diseño Frontend — Opttius

**Fecha:** 2026-02-26  
**Alcance:** Auditoría de adaptación móvil y diseño frontend en módulos admin  
**Fuentes:** NotebookLM (Cerebro), FRONTEND_RESPONSIVITY.md, skills (responsive-frontend-optical, frontend-design-modern)

---

## 1. Resumen Ejecutivo

Opttius es un SaaS B2B multi-tenant para ópticas con **77 rutas admin** y una arquitectura frontend basada en Next.js 14, Tailwind, Radix/shadcn. La documentación declara estrategia **mobile-first** y breakpoints estándar (sm:640, md:768, lg:1024, xl:1280, 2xl:1400).

**Estado general:** La base responsiva está bien implementada en layout, sidebar, POS y varios módulos. Quedan secciones con tablas sin wrapper de scroll horizontal y algunos headers/formularios sin adaptación explícita.

---

## 2. Módulos Principales (NotebookLM)

| Módulo          | Ruta                     | Descripción                               |
| --------------- | ------------------------ | ----------------------------------------- |
| Dashboard       | `/admin`                 | KPIs, widgets, acceso rápido              |
| CRM / Clientes  | `/admin/customers`       | Listado, fichas, prescripciones           |
| Citas / Agenda  | `/admin/appointments`    | Calendario, slots, guest customers        |
| Presupuestos    | `/admin/quotes`          | Cotizaciones, conversión a POS/work order |
| POS             | `/admin/pos`             | Punto de venta, carrito, pagos            |
| Trabajos        | `/admin/work-orders`     | Órdenes de laboratorio                    |
| Productos       | `/admin/products`        | Catálogo, inventario, categorías          |
| Caja            | `/admin/cash-register`   | Sesiones, conciliación                    |
| Analíticas      | `/admin/analytics`       | Métricas, tendencias                      |
| Soporte         | `/admin/support`         | Incidentes internos                       |
| Notificaciones  | `/admin/notifications`   | Centro de alertas                         |
| Admin Users     | `/admin/admin-users`     | Empleados, roles                          |
| Perfil          | `/admin/profile`         | Cuenta, preferencias                      |
| Sistema         | `/admin/system`          | Config global, plantillas                 |
| SaaS Management | `/admin/saas-management` | Tenants (root/dev)                        |

---

## 3. Estado de Responsividad por Bloque

### 3.1 ✅ Correctamente adaptados

| Bloque              | Implementación                                                                          | Patrones |
| ------------------- | --------------------------------------------------------------------------------------- | -------- |
| **Admin Layout**    | Sidebar `hidden lg:flex`, header móvil `lg:hidden`, Sheet drawer 75vw                   | ✅       |
| **Admin Sheet**     | Fondo `bg-admin-bg-secondary`, coherente con sidebar                                    | ✅       |
| **BranchSelector**  | `max-md:w-10 max-md:px-2 max-md:justify-center` + `[&_span:last-child]:hidden` en móvil | ✅       |
| **Dashboard**       | Grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, headers `flex-col md:flex-row`       | ✅       |
| **Productos**       | ProductGrid `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, ProductTable con overflow-x    | ✅       |
| **POS**             | Layout `flex flex-col lg:flex-row`, paneles `w-full lg:w-2/3` y `w-full lg:w-1/3`       | ✅       |
| **POS móvil**       | Tabs Cliente/Productos/Orden, bottom bar Cobrar, Sheet pago 85vh                        | ✅       |
| **Profile**         | Flex `flex-col md:flex-row`                                                             | ✅       |
| **Content padding** | `lg:pl-80`, `min-w-0` en main                                                           | ✅       |
| **AdminMobileNav**  | Bottom nav `lg:hidden`, touch targets 44px                                              | ✅       |

### 3.2 🟡 Parcialmente adaptados

| Bloque              | Observación                                                      |
| ------------------- | ---------------------------------------------------------------- |
| **Checkout**        | Grids responsivos; revisar formularios en móvil                  |
| **Analytics**       | Tablas con overflow-x; charts con ResponsiveContainer            |
| **Appointments**    | Calendario lazy-loaded; DialogContent `max-w-[calc(100vw-2rem)]` |
| **Work Orders**     | Tabla con overflow; detalle `grid-cols-1 lg:grid-cols-3`         |
| **Quotes**          | Tabla overflow; detalle con grids responsivos                    |
| **Customers**       | TabsList overflow-x; tabla overflow; diálogos móvil              |
| **Admin Users**     | Tabla overflow                                                   |
| **Branches**        | Tabla overflow, diálogos móvil                                   |
| **Support**         | Tabla, diálogos                                                  |
| **Cash Register**   | Tablas con overflow; diálogo grande `max-w-6xl`                  |
| **System**          | TabsList overflow; diálogos móvil                                |
| **SaaS Management** | Varias tablas con overflow; algunas páginas con grids            |

### 3.3 🟠 Requieren revisión

| Bloque                    | Problema                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Categories**            | Header `flex justify-between` sin `flex-col sm:flex-row`; DialogContent `sm:max-w-[425px]` sin `max-w-[calc(100vw-2rem)]` |
| **Lens Matrices**         | Tabla con `overflow-x-auto` sin wrapper `-mx-4 px-4 md:mx-0`; diálogo `max-w-3xl` sin patrón móvil                        |
| **Contact Lens Families** | Tabla con wrapper; revisar diálogos                                                                                       |
| **Contact Lens Matrices** | `overflow-x-auto` sin margen negativo en móvil                                                                            |
| **Internal Orders**       | No auditado en detalle                                                                                                    |
| **Lens Management**       | No auditado en detalle                                                                                                    |
| **Docs**                  | No auditado en detalle                                                                                                    |
| **Tour**                  | Grid `grid-cols-1 md:grid-cols-4`; revisar UX móvil                                                                       |
| **Help**                  | Diálogos con patrón móvil                                                                                                 |
| **Notifications**         | Grids y tablas; revisar touch targets                                                                                     |

### 3.4 ⚠️ Sin adaptación explícita

| Bloque                      | Nota                                                     |
| --------------------------- | -------------------------------------------------------- |
| **orders/[id]**             | Tabla con `overflow-x-auto` simple, sin wrapper estándar |
| **cash-register/[id]**      | Tablas con overflow; revisar layout                      |
| **saas-management/support** | Páginas root; prioridad baja                             |
| **saas-management/emails**  | Grid `grid-cols-1 md:grid-cols-3`                        |
| **pos-billing-settings**    | TabsList overflow; tabla overflow                        |

---

## 4. Patrones Aplicados vs Pendientes

### Aplicados

| Patrón                                       | Uso                                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0` | Tablas en analytics, customers, work-orders, quotes, admin-users, branches, cash-register, products, support, system, saas-management |
| `max-w-[calc(100vw-2rem)] sm:max-w-*`        | Diálogos en appointments, customers, branches, support, system, lens-matrices, quotes, help                                           |
| `max-h-[90vh] overflow-y-auto`               | Diálogos largos                                                                                                                       |
| `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`  | Dashboard, system, quick actions                                                                                                      |
| `flex flex-col md:flex-row`                  | Headers, formularios                                                                                                                  |
| `min-h-[44px]`                               | Botones POS móvil, touch targets                                                                                                      |
| `lg:hidden` / `hidden lg:flex`               | Sidebar, cart desktop, mobile nav                                                                                                     |

### Pendientes

| Patrón                        | Secciones afectadas                                                 |
| ----------------------------- | ------------------------------------------------------------------- |
| Wrapper tablas estándar       | lens-matrices (solo overflow-x), contact-lens-matrices, orders/[id] |
| DialogContent móvil base      | categories (sm:max-w-[425px])                                       |
| Header `flex-col sm:flex-row` | categories, algunas páginas saas-management                         |
| Touch targets 44px            | Auditoría de icon-sm/xs en toda la app                              |

---

## 5. Diseño Frontend (Epoch / Lujo Tecnológico)

- **Paleta:** epoch-primary (#1A2B23), epoch-accent (#C5A059), epoch-surface, epoch-background
- **Tipografía:** Geist/Inter/DM Sans (principal), Cormorant Garamond (acento mínimo)
- **Formas:** `rounded-xl` / `rounded-2xl` en cards y botones
- **Bento:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- **Breakpoints:** sm:640, md:768, lg:1024, xl:1280, 2xl:1400

**Nota NotebookLM:** La documentación en el Cerebro aún menciona Cinzel, Playfair, Lato. La fuente de verdad actual es FRONTEND_IDENTITY.md (Geist/Inter/DM Sans).

---

## 6. Prioridades para Versiones Móviles

### Alta

1. **Tablas sin wrapper estándar:** lens-matrices, contact-lens-matrices, orders/[id]
2. **Diálogos sin patrón móvil:** categories (`max-w-[calc(100vw-2rem)]`)
3. **Headers sin flex responsivo:** categories y páginas similares

### Media

4. **Touch targets:** Revisar iconos pequeños en móvil
5. **Calendario de citas:** Vista semanal en móvil vs mensual en desktop (documentado en FRONTEND_RESPONSIVITY)
6. **Filtros en productos:** Drawer o acordeón en móvil

### Baja

7. **Card component:** Unificar rounded entre admin y profile
8. **Lazy loading:** Confirmar en calendario y componentes pesados
9. **SaaS Management:** Prioridad baja (uso root/dev)

---

## 7. Checklist Mobile-First (Referencia)

- [ ] BranchSelector compacto en móvil
- [ ] Admin header con flex-wrap y título truncado
- [ ] Admin Sheet con fondo oscuro
- [ ] POS layout flex-col lg:flex-row
- [ ] Tablas con `overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0`
- [ ] Diálogos con `max-w-[calc(100vw-2rem)] sm:max-w-*` y `max-h-[90vh] overflow-y-auto`
- [ ] Touch targets ≥44px en botones críticos
- [ ] Grids con breakpoints apropiados
- [ ] Headers `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`

---

## 8. Referencias

- [docs/FRONTEND_RESPONSIVITY.md](./FRONTEND_RESPONSIVITY.md)
- [docs/FRONTEND_IDENTITY.md](./FRONTEND_IDENTITY.md)
- [.cursor/skills/responsive-frontend-optical/SKILL.md](../.cursor/skills/responsive-frontend-optical/SKILL.md)
- [.cursor/skills/frontend-design-modern/SKILL.md](../.cursor/skills/frontend-design-modern/SKILL.md)
- NotebookLM Cerebro: `e071bebc-ce79-4b32-a040-61a6a9c331a3`
