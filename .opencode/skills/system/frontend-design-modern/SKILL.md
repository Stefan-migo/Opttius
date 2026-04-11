---
name: frontend-design-modern
description: Guides creation of modern, impressive frontend designs with clean code and responsive layouts. Use when building UI components, pages, styling, layouts, or when the user asks for frontend design, responsive design, or UI best practices.
---

# Modern Frontend Design - Opttius (Lujo Tecnológico)

**Pivote 2026-02-22:** Minimalismo SaaS, estilo Stripe, Apple, Vercel.

## Quick Start

When creating or editing frontend UI for Opttius (Landing, Admin, Auth):

1. **Mobile-first** — Start with smallest viewport, enhance upward.
2. **Epoch Contrast** — Paleta intacta: verde #1A2B23, dorado #C5A059, crema #F9F7F2.
3. **Spanish First** — All landing and auth copy must be in Spanish.
4. **Bento Layouts** — Grid minimalista (4 cols desktop), espacio negativo generoso.
5. **Bordes sutiles** — Cards y botones: `rounded-xl` o `rounded-2xl`.

## Design Principles

### Visual Impact (Lujo Tecnológico)

- **Typography**:
  - **Principal:** Geist, Inter o DM Sans (sans-serif geométricas).
  - **Acento (mínimo):** Cormorant Garamond solo para itálicas decorativas sutiles.
  - **Eliminadas:** Cinzel, Playfair Display, Lato.
- **Color Palette (Epoch intacta):**
  - `epoch-primary`: Deep Forest Green (#1A2B23).
  - `epoch-accent`: Gold (#C5A059).
  - `epoch-surface`: Charcoal (#1A1A1A).
  - `epoch-background`: Cream (#F9F7F2).
- **Shapes:**
  - **Cards:** `rounded-xl` o `rounded-2xl`.
  - **Botones:** `rounded-xl`.
  - **Eliminado:** `rounded-arch` (arcos arquitectónicos).
- **Espaciado:** Generoso (p-8, p-12). Interfaz limpia, sin ruido visual.
- **Header:** `bg-epoch-surface/90 backdrop-blur-md` on scroll. Logo legible en fondos oscuros (`forceLight`).

### Responsive Strategy

- **Breakpoints:** `sm:640`, `md:768`, `lg:1024`, `xl:1280`, `2xl:1400`.
- **Bento:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`.
- **Header:** Hamburger en `lg:hidden`, nav horizontal en `hidden lg:flex`.

### Imágenes

- **Por defecto:** `grayscale` + `opacity-40`.
- **Hover:** `group-hover:grayscale-0 group-hover:opacity-20`.
- **Overlay:** Gradiente `from-epoch-primary/90 via-epoch-primary/60 to-epoch-surface`.

## Code Quality & Patterns

### Components

- **CTA Primario:** `bg-epoch-accent hover:bg-white text-epoch-surface rounded-xl h-14 px-12 font-sans font-semibold`.
- **CTA Secundario:** `font-sans text-base border-b border-white/20`.
- **Auth Primary:** `rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-sans font-semibold`.
- **Admin Cards:** `rounded-xl`, hover `translateY(-2px)`.

### Styling (Tailwind)

- Use tokens: `bg-epoch-primary`, `text-epoch-accent`, `rounded-xl`.

## Identidad & Copy

- **Eslogan:** "Automatiza. Controla. Crece."
- **Badge:** "De la clínica al código. 100% nativo para ópticas."
- **Evitar:** legado, forjar, santuario, maestría, pergamino, credencial, llave de acceso.
- **Preferir:** Email, Contraseña, Probar Gratis, Iniciar sesión, Registrarse.

## Checklist Before Finishing

- [ ] Landing page copy is in Spanish.
- [ ] Header logo is legible on scroll (`forceLight` en fondos oscuros).
- [ ] Bento grid cards use `rounded-xl`.
- [ ] No `rounded-arch` (arcos eliminados).
- [ ] Tipografía sans-serif geométrica (Geist/Inter/DM Sans).
- [ ] Paleta Epoch intacta.
- [ ] Admin mantiene coherencia con landing.

## Documentación Detallada

- **docs/FRONTEND_IDENTITY.md** — Especificación técnica del frontend.
- **docs/IDENTITY.md** — Identidad de marca (fuente de verdad).
- **docs/IDENTITY_AUDIT.md** — Registro del pivote de diseño.
