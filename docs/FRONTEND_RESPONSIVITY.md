# Documentación de Responsividad del Frontend — Opttius

**Versión:** 1.0  
**Fecha:** 2026-02-21  
**Alcance:** Sistema de gestión óptica Opttius — frontend responsivo, mobile-first, escalable.

---

## 1. Resumen Ejecutivo

Este documento establece la especificación de responsividad del frontend de Opttius, basada en el sistema **Epoch** y en las mejores prácticas para sistemas de gestión en ópticas. Sirve como base para toda la documentación de frontend del programa.

**Objetivo:** Lograr un sistema responsivo de la más alta calidad en código y funcionalidad, escalable y alineado con la lógica del negocio óptico.

---

## 2. Arquitectura Responsiva Actual

### 2.1 Stack y Configuración

- **Framework:** Next.js 14 (App Router)
- **Estilos:** Tailwind CSS
- **Componentes:** Radix UI, shadcn/ui
- **Breakpoints:** Estándar Tailwind (sm:640, md:768, lg:1024, xl:1280, 2xl:1400)
- **Container:** `max-width: 1400px` (2xl)

### 2.2 Estrategia Declarada

- **Mobile-first:** Diseñar primero para móvil, mejorar hacia desktop.
- **Bento Grid:** 1 col móvil → 2 cols tablet → 4 cols desktop.
- **Header:** Hamburguesa en `lg:hidden`, nav horizontal en `hidden lg:flex`.

---

## 3. Estado Actual — Auditoría

### 3.1 Lo que funciona bien

| Área                | Implementación                                                         | Estado      |
| ------------------- | ---------------------------------------------------------------------- | ----------- |
| **Admin Layout**    | Sidebar `hidden lg:flex`, header móvil `lg:hidden`, Sheet para drawer  | ✅ Correcto |
| **Dashboard**       | Grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`                      | ✅ Correcto |
| **Productos**       | ProductGrid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` | ✅ Correcto |
| **Checkout**        | Grids responsivos en tiers y formularios                               | ✅ Correcto |
| **Profile**         | Flex `flex-col md:flex-row` para secciones                             | ✅ Correcto |
| **Content padding** | `lg:pl-72` para compensar sidebar, `min-w-0` en main                   | ✅ Correcto |
| **Cards admin**     | `admin-card` con `rounded-none`, hover consistente                     | ✅ Correcto |

### 3.2 Áreas de mejora identificadas (actualizadas 2026-02)

| Área               | Problema                                                          | Estado                                               |
| ------------------ | ----------------------------------------------------------------- | ---------------------------------------------------- |
| **POS**            | Layout fijo `w-2/3` + `w-1/3` sin breakpoints                     | ✅ Resuelto — layout `flex-col lg:flex-row`          |
| **BranchSelector** | Ancho fijo 200px rompía header en móvil                           | ✅ Resuelto — compacto en móvil (solo icono)         |
| **Admin Sheet**    | Franja blanca en drawer móvil                                     | ✅ Resuelto — fondo oscuro coherente                 |
| **Landing header** | Transparente, logo/nav se perdían                                 | ✅ Resuelto — `bg-epoch-surface/70 backdrop-blur-md` |
| **Viewport**       | Next.js inyecta viewport por defecto                              | ✅ Verificado                                        |
| **Touch targets**  | Mínimo 44×44px para elementos interactivos                        | 🟡 Revisar en icon-sm/xs                             |
| **Tablas**         | `overflow-x-auto` en móvil                                        | ✅ Aplicado — wrapper `-mx-4 px-4 md:mx-0 md:px-0`   |
| **Diálogos**       | `max-h-[90vh] overflow-y-auto` y `max-w-[calc(100vw-2rem)]` móvil | ✅ Aplicado en base y componentes                    |
| **Card component** | Default `rounded-2xl` vs admin `rounded-none`                     | 🟢 Menor                                             |

### 3.3 POS — Análisis detallado

El POS (`/admin/pos`) utiliza:

```tsx
// Layout principal — NO responsivo
<div className="w-2/3 flex flex-col ...">  // Productos / búsqueda
<div className="w-1/3 flex flex-col ...">  // Carrito
```

En pantallas <1024px, dos columnas al 66% y 33% generan:

- Columnas muy estrechas
- Carrito ilegible
- Búsqueda de productos incómoda
- Tabs (Cliente/Productos) comprimidos

**Recomendación:** Implementar layout responsivo:

- **Desktop (lg+):** Mantener 2/3 + 1/3.
- **Tablet (md–lg):** 1/2 + 1/2 o tabs para alternar.
- **Móvil:** Layout apilado (flex-col) con carrito colapsable o bottom sheet.

---

## 4. Guías y Mejores Prácticas

### 4.1 Breakpoints — Uso consistente

| Escenario                 | Clases recomendadas                         |
| ------------------------- | ------------------------------------------- |
| Ocultar en móvil          | `hidden md:block` o `hidden lg:flex`        |
| Mostrar solo móvil        | `block lg:hidden`                           |
| Grid 1→2→4 columnas       | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` |
| Grid 1→2→3 columnas       | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| Flex col→row              | `flex flex-col md:flex-row`                 |
| Padding lateral           | `px-4 md:px-6 lg:px-8`                      |
| Espaciado entre elementos | `gap-4 md:gap-6`                            |

### 4.2 Touch Targets (WCAG 2.2)

- **Mínimo:** 44×44px para botones, links e inputs interactivos.
- **Clases:** `min-h-[44px] min-w-[44px]` o `h-11` (44px) para botones.
- **Padding:** `p-3` (12px) mínimo en botones para área táctil suficiente.

### 4.3 Overflow y Truncado

```tsx
// Flex hijo que puede truncar
<div className="flex min-w-0">
  <span className="truncate">Texto largo...</span>
</div>

// Tabla en móvil
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
  <Table />
</div>

// Contenedor con scroll
<div className="overflow-y-auto max-h-[60vh]">
  ...
</div>
```

### 4.4 Diálogos y Modales

```tsx
<DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-none">
  ...
</DialogContent>
```

- Siempre `max-h-[90vh]` o similar para contenido largo.
- `overflow-y-auto` para scroll interno.
- `rounded-none` en admin (Epoch).

### 4.5 Imágenes y Media

- Usar `aspect-ratio` para evitar layout shift: `aspect-square`, `aspect-video`.
- `object-cover` en imágenes de producto para mantener proporción.
- Next.js `Image` con `sizes` para responsive images.

### 4.6 Tipografía Responsiva

```tsx
// Títulos
text-2xl md:text-3xl lg:text-4xl

// Cuerpo
text-sm md:text-base

// Labels
text-[10px] md:text-xs
```

---

## 5. Mejoras Propuestas (Priorizadas)

### Prioridad Alta

1. **POS responsivo**
   - Añadir breakpoints al layout principal.
   - En `md` y menor: layout apilado o tabs (Productos | Carrito).
   - Mantener barcode input y flujo de venta funcional.

2. **Touch targets**
   - Auditoría de botones e inputs en móvil.
   - Asegurar `min-h-[44px]` en elementos interactivos críticos (POS, checkout, formularios).

### Prioridad Media

3. **Tablas**
   - Revisar tablas en work-orders, customers, products.
   - Añadir `overflow-x-auto` en wrappers para scroll horizontal en móvil.

4. **Diálogos**
   - Revisar todos los `DialogContent`.
   - Añadir `max-h-[90vh] overflow-y-auto` donde falte.

5. **Viewport y safe-area**
   - Verificar metadata de viewport en layout raíz.
   - Considerar `env(safe-area-inset-*)` para dispositivos con notch.

### Prioridad Baja

6. **Card component**
   - Unificar `rounded` entre admin (rounded-none) y profile (rounded-2xl) según contexto.
   - Documentar cuándo usar cada variante.

7. **Lazy loading**
   - Confirmar lazy loading en calendario de citas y componentes pesados.
   - Considerar `loading="lazy"` en imágenes below-the-fold.

---

## 6. Patrones por Módulo

### Dashboard

- KPIs: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Charts: `ResponsiveContainer` con `minHeight={200}` en móvil
- Quick actions: `grid-cols-2 md:grid-cols-4`

### Productos

- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Filtros: Drawer o acordeón en móvil
- Product detail: Columna única en móvil, dos columnas en desktop

### Citas / Agenda

- Calendario: Vista semanal en móvil, mensual en desktop
- Formularios: `flex-col` en móvil, `flex-row` donde aplique en desktop

### Checkout

- Tiers: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Formulario de pago: Columna única en móvil

### Work Orders

- Lista: Cards apiladas en móvil, tabla en desktop
- Detalle: `grid-cols-1 lg:grid-cols-3` para layout principal

---

## 7. Mobile-First Checklist (Post-Implementación 2026-02)

Lista de verificación para nuevas features o cambios en UI:

- [ ] **BranchSelector**: En móvil (`max-md`) usar versión compacta (solo icono); desktop mantiene Select completo.
- [ ] **Admin header**: `flex-wrap` y `gap` para que logo + acciones no desborden; título truncado en móvil.
- [ ] **Admin Sheet**: Fondo oscuro (`bg-admin-bg-secondary`) coherente con sidebar; botón cerrar visible.
- [ ] **POS**: Layout `flex flex-col lg:flex-row`; paneles `w-full lg:w-2/3` y `w-full lg:w-1/3`; header `flex-col sm:flex-row`.
- [ ] **Landing header**: Siempre legible — `bg-epoch-surface/70 backdrop-blur-md` o similar; nunca transparente puro.
- [ ] **Tablas**: Envolver en `<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0"><Table>...</Table></div>`.
- [ ] **Diálogos**: Usar `max-w-[calc(100vw-2rem)] sm:max-w-{size}` para móvil; `max-h-[90vh] overflow-y-auto` (base DialogContent ya lo incluye).
- [ ] **Touch targets**: Botones críticos `min-h-[44px]` o `h-11`; iconos pequeños añadir padding para área táctil.
- [ ] **Grids**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` según contenido.
- [ ] **Headers de página**: `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`.

### Patrones aplicados

| Componente             | Patrón                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------- |
| BranchSelector         | `max-md:w-10 max-md:px-2 max-md:justify-center` + `[&_span:last-child]:hidden` en móvil |
| POS layout             | `flex flex-col lg:flex-row`; paneles `w-full lg:w-2/3` / `w-full lg:w-1/3`              |
| Tablas                 | `overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0`                                            |
| DialogContent (base)   | `max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto`                     |
| DialogContent (custom) | `max-w-[calc(100vw-2rem)] sm:max-w-2xl` (o 3xl, 4xl, etc.)                              |

---

## 8. Integración con NotebookLM

Para que el cerebro del proyecto tenga acceso a esta documentación:

```bash
export PYTHONIOENCODING=utf-8
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/FRONTEND_RESPONSIVITY.md --title "Frontend Responsivity Documentation - Opttius"
nlm source add 17302d9d-7d70-4c8d-a774-49fbfca3c09d --file docs/FRONTEND_RESPONSIVITY.md --title "Frontend Responsivity Documentation - Opttius"
```

---

## 9. Referencias

- **Identidad:** [docs/FRONTEND_IDENTITY.md](./FRONTEND_IDENTITY.md)
- **Skill:** [.cursor/skills/responsive-frontend-optical/SKILL.md](../.cursor/skills/responsive-frontend-optical/SKILL.md)
- **Frontend Design:** [.cursor/skills/frontend-design-modern/SKILL.md](../.cursor/skills/frontend-design-modern/SKILL.md)
- **POS Skill:** [.cursor/skills/pos-optical-supabase/SKILL.md](../.cursor/skills/pos-optical-supabase/SKILL.md)
