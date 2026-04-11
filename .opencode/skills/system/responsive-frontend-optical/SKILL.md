---
name: responsive-frontend-optical
description: Expert guide for building and maintaining responsive frontend in Opttius optical shop system. Use when working on layouts, breakpoints, mobile adaptation, POS responsive, admin sidebar, grids, touch targets, viewport, or optical shop UI across devices. Covers mobile-first strategy, Epoch design system alignment, and optical-specific UX patterns.
---

# Responsive Frontend — Opttius Optical System

Guía para construir interfaces responsivas de alta calidad en el sistema de gestión óptica Opttius.

## Quick Start

1. **Mobile-first** — Diseñar primero para móvil, mejorar hacia desktop.
2. **Breakpoints estándar** — sm:640, md:768, lg:1024, xl:1280, 2xl:1400.
3. **Touch targets** — Mínimo 44×44px para botones e inputs en móvil.
4. **min-w-0** — En flex/grid hijos que pueden truncar texto, usar `min-w-0` para evitar overflow.

## Breakpoints y Estrategia

### Breakpoints Tailwind (Opttius)

| Breakpoint | Pixels | Uso típico                         |
| ---------- | ------ | ---------------------------------- |
| (default)  | <640px | Móvil                              |
| sm         | 640px  | Móvil grande / phablet             |
| md         | 768px  | Tablet portrait                    |
| lg         | 1024px | Tablet landscape / desktop pequeño |
| xl         | 1280px | Desktop                            |
| 2xl        | 1400px | Container máximo                   |

### Patrones de Grid Responsivo

```tsx
// Bento / Features (landing, dashboard)
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4

// Cards de estadísticas
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4

// Formularios / dos columnas
grid grid-cols-1 md:grid-cols-2 gap-6

// Productos / catálogo
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6
```

### Flex Responsivo

```tsx
// Header / acciones: columna en móvil, fila en desktop
flex flex-col md:flex-row justify-between items-start md:items-end gap-4

// Títulos con acciones
flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
```

## Layout Admin

- **Sidebar**: `hidden lg:flex` (desktop) — fijo, 18rem (w-72).
- **Mobile header**: `lg:hidden` — menú hamburguesa con Sheet.
- **Content**: `lg:pl-72 flex-1 min-w-0 w-full` — padding para sidebar, min-w-0 evita overflow.
- **Sheet sidebar**: `w-80` para drawer móvil; fondo oscuro `bg-admin-bg-secondary` coherente con sidebar (evitar franja blanca).
- **Header**: `flex-wrap` y `gap` para móvil; título truncado `max-w-[120px]` en móvil.
- **BranchSelector**: En móvil (`max-md`) versión compacta — solo icono (`w-10`), texto oculto con `[&_span:last-child]:hidden`; desktop `w-[200px] min-w-[140px]`.

## Módulos Ópticos Específicos

### POS (Punto de Venta)

- **Layout responsivo** (implementado): `flex flex-col lg:flex-row` — en móvil columnas apiladas, en desktop 2/3 + 1/3.
- **Paneles**: Productos `w-full lg:w-2/3`, Carrito `w-full lg:w-1/3`; bordes `border-r-0 lg:border-r` para móvil.
- **Header**: `flex-col sm:flex-row`; botones apilados en móvil; "Saldos Pendientes" abreviado a "Saldos" en móvil.
- **Barcode input**: Mantener auto-focus y detección rápida; en móvil considerar teclado numérico.

### Checkout

- Grid de tiers: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- Formularios: `grid-cols-1 md:grid-cols-3` para campos.

### Dashboard

- KPIs: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- Charts: ResponsiveContainer de Recharts; considerar altura mínima en móvil.

### Productos / Inventario

- ProductGrid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- Filtros: Colapsar en drawer o acordeón en móvil.

## Componentes Base

### Cards (admin-card)

- `rounded-none` en admin (Epoch).
- Hover: `translateY(-2px)` — mantener en todos los breakpoints.
- Padding: `p-4` móvil, `p-6` desktop si se requiere.

### Botones

- Altura mínima: `min-h-[44px]` en móvil para touch.
- CTAs: `h-16 px-16` en desktop; en móvil `h-14 px-8` o `w-full`.

### Inputs

- `h-14` para formularios — suficiente para touch.
- Labels: `text-[10px]` con tracking amplio — legibles en móvil.

## Overflow y Truncado

- Contenedores con scroll: `overflow-y-auto` o `overflow-x-auto` según necesidad.
- Texto largo: `truncate` con `min-w-0` en el padre flex.
- Tablas: Wrapper `overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0` para scroll horizontal en móvil.

## Diálogos y Modales

- **Base DialogContent**: `max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto` — móvil seguro.
- **Custom max-w**: Usar `max-w-[calc(100vw-2rem)] sm:max-w-2xl` (o 3xl, 4xl) para evitar overflow horizontal en móvil.
- `max-h-[90vh] overflow-y-auto` para contenido largo — evita desborde en pantallas pequeñas.

## Checklist Antes de Publicar

- [ ] ¿Los grids usan breakpoints apropiados (1 col móvil → 2–4 cols desktop)?
- [ ] ¿Los botones tienen área táctil ≥44px en móvil?
- [ ] ¿El sidebar se oculta en móvil (lg:hidden / hidden lg:flex)?
- [ ] ¿Hay min-w-0 en flex hijos que truncarían texto?
- [ ] ¿Las tablas tienen overflow-x-auto en móvil?
- [ ] ¿Los diálogos tienen max-h y overflow-y para contenido largo?

## Documentación Detallada

- **docs/FRONTEND_RESPONSIVITY.md** — Especificación completa, auditoría y mejoras.
- **docs/FRONTEND_IDENTITY.md** — Identidad Epoch y breakpoints.
