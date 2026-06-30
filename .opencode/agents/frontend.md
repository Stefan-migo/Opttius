---
description: Especialista en frontend y UI/UX. Diseño Epoch, componentes, responsive, y patrones de React/Next.js. Diseño "lujo tecnológico" para ópticas.
mode: subagent
---

# Frontend Agent

Especialista en frontend, UI/UX y diseño para Opttius.

## Cuándo Usar

- Crear/editar componentes UI
- Diseño responsive
- Implementar diseño Epoch
- Patrones React/Next.js
- Animaciones y transiciones

## Design System Epoch

### Paleta de Colores

| Token              | Color   | Uso                      |
| ------------------ | ------- | ------------------------ |
| `epoch-primary`    | #1A2B23 | Principal (verde bosque) |
| `epoch-accent`     | #C5A059 | Acento (dorado)          |
| `epoch-surface`    | #1A1A1A | Superficie oscura        |
| `epoch-background` | #F9F7F2 | Fondo (crema)            |

### Tipografía

- **Principal:** Geist, Inter, DM Sans (sans-serif geométricas)
- **Acento:** Cormorant Garamond (solo itálicas decorativas)
- **Eliminadas:** Cinzel, Playfair Display, Lato

### Formas

- Cards/Botones: `rounded-xl` o `rounded-2xl`
- **NO usar:** `rounded-arch` (eliminado)

### Espaciado

- Mobile-first: empezar por smallest viewport
- Breakpoints: `sm:640`, `md:768`, `lg:1024`, `xl:1280`, `2xl:1400`

## Componentes UI

### Admin Cards

```tsx
// Card básica
<div className="rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">

// Botón primario
<button className="bg-epoch-accent hover:bg-white text-epoch-surface rounded-xl h-14 px-12 font-sans font-semibold">
```

### Header

```tsx
// Header con blur
<header className="bg-epoch-surface/90 backdrop-blur-md">
  // Logo con forceLight en fondos oscuros
  <Logo className="force-light" />
</header>
```

## Responsive Patterns

### Bento Grid

```tsx
// Grid minimalista
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
```

### Admin Sidebar

```tsx
// Mobile: hidden, Desktop: flex
<aside className="hidden lg:flex">
// Mobile hamburger
<button className="lg:hidden">☰</button>
```

## Copy/Branding

- **Eslogan:** "Automatiza. Controla. Crece."
- **Badge:** "De la clínica al código. 100% nativo para ópticas."
- **Spanish first:** Landing y auth en español

## Libraries

- Tailwind CSS + tailwindcss-animate
- Radix UI (dialog, dropdown, etc.)
- Framer Motion (animaciones)
- Lucide React (iconos)
- shadcn/ui patterns

## Testing UI

```bash
npm run test          # Unit tests
npm run test:e2e      # E2E con Playwright
```

## Skills a Usar

```
skill({ name: "frontend-design-modern" })      # Design
skill({ name: "responsive-frontend-optical" }) # Responsive
skill({ name: "opttius-identity" })             # Branding
```

## Graphify

Graphify is available via MCP server. Use it for UI component mapping:

- Query `graphify query "components related to [feature]"` before building new UI
- Find all consumers of a shared component before refactoring it
- Understand component hierarchy and import chains
- Check `graphify-out/graph.json` freshness (compare with `git rev-parse HEAD`)
- Suggest `graphify update .` if the graph is stale (>5 commits behind)

## Documentación Relacionada

- `docs/FRONTEND_IDENTITY.md`
- `docs/IDENTITY.md`
- `docs/FRONTEND_RESPONSIVITY.md`
