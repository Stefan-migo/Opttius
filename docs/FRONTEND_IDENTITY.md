# Documentación de Identidad Visual del Frontend — Opttius

**Versión:** 1.0  
**Fecha:** 2026-02-18  
**Alcance:** Identidad de marca aplicada al frontend — base para consistencia en todo el programa.

---

## 1. Resumen Ejecutivo

Este documento establece la especificación detallada del sistema visual **Epoch** para el frontend de Opttius. Sirve como fuente de verdad para layouts, CSS, animaciones, tipografía, paleta de colores e imagen visual. El objetivo es sostener una identidad de **alta gama** y **escalable** en todo el sistema.

**Arquetipo objetivo:** Sistema de última generación con estética sobria que transmite exclusividad, combinando funcionalidad y pragmatismo. Software creado por un tecnólogo médico, exclusivo para ópticas.

---

## 2. Sistema de Colores (Paleta Epoch)

### 2.1 Tokens Principales

| Token              | Hex               | Uso                                                               |
| ------------------ | ----------------- | ----------------------------------------------------------------- |
| `epoch-primary`    | #1A2B23 / #2C3E33 | Verde bosque profundo. Títulos, fondos oscuros, botones primarios |
| `epoch-accent`     | #C5A059 / #C4B28C | Dorado vintage sobrio. Acentos, CTAs, highlights                  |
| `epoch-surface`    | #1A1A1A           | Charcoal. Fondos oscuros, header scroll                           |
| `epoch-background` | #F9F7F2 / #EAE8DD | Crema elegante. Fondos claros, cards                              |

### 2.2 Uso en Tailwind

```css
/* Clases disponibles */
bg-epoch-primary
bg-epoch-accent
bg-epoch-surface
bg-epoch-background
text-epoch-primary
text-epoch-accent
border-epoch-primary
border-epoch-accent
```

### 2.3 Variables CSS (globals.css)

Los tokens se definen en `:root` y `html.theme-light`:

- `--primary`: #1A2B23
- `--accent`: #C5A059
- `--background`: #F9F7F2
- `--foreground`: #1A2B23

**Nota:** Unificar `tailwind.config.ts` (epoch.primary: #2C3E33) con `globals.css` para evitar desvíos.

---

## 3. Tipografía

### 3.1 Jerarquía de Fuentes

| Familia                | Variable CSS       | Uso                                                  | Ejemplo          |
| ---------------------- | ------------------ | ---------------------------------------------------- | ---------------- |
| **Cinzel**             | `--font-cinzel`    | Títulos principales, mayúsculas, tracking amplio     | `font-display`   |
| **Cormorant Garamond** | `--font-cormorant` | Títulos alternativos, precios, secciones secundarias | `font-cormorant` |
| **Playfair Display**   | `--font-playfair`  | Acentos, subtítulos, cursiva                         | `font-serif`     |
| **Lato**               | `--font-lato`      | Cuerpo, descripciones, formularios                   | `font-body`      |

### 3.2 Clases Tailwind

```css
font-display   /* Cinzel - títulos hero, headers */
font-cormorant /* Cormorant - precios, testimonios */
font-serif     /* Playfair - acentos, cursiva */
font-body      /* Lato - cuerpo de texto */
```

### 3.3 Patrón de Títulos Hero

```tsx
<h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tight">
  GESTIÓN ÓPTICA DE
  <br />
  <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
    última generación
  </span>
</h1>
```

- Línea principal: `font-display`, mayúsculas, tracking-tight
- Acento: `font-serif italic`, lowercase, `text-epoch-accent`

### 3.4 Escala de Tamaños

- `text-[10px]` — Labels, badges, tracking amplio
- `text-xs` — Descripciones secundarias
- `text-sm` — Cuerpo secundario
- `text-base` — Cuerpo principal
- `text-lg` — Subtítulos
- `text-xl` — Títulos de sección
- `text-2xl` — Títulos destacados
- `text-5xl` a `text-8xl` — Hero, headlines

---

## 4. Formas y Layout

### 4.1 Bordes

- **Rectos (preferidos):** `rounded-none` para botones, cards, inputs
- **Arcos:** `rounded-arch` (100px 100px 0 0) para transiciones entre secciones
- **Badges:** `rounded-full` para pills de estado

### 4.2 Bento Grid

Layout asimétrico para features en desktop:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">
  {/* Cards con lg:col-span-1, lg:col-span-2, lg:row-span-2 según necesidad */}
</div>
```

**Imágenes por tarjeta:** Cada tarjeta puede tener una imagen de fondo. Estilo: `grayscale`, `opacity-10`, hover: `grayscale-0`, `opacity-20`. Si la imagen no existe (404), se oculta automáticamente (`onError`). Imágenes esperadas en `public/images/landing/`:

- `LamparaW.webp`, `mesaW.webp` (existentes)
- `pos.webp`, `multisucursal.webp`, `asistente.webp`, `analytics.webp`, `agenda.webp`, `laboratorio.webp`

### 4.3 Transiciones entre Secciones

- Arco inferior: `<div className="absolute bottom-0 left-0 right-0 h-40 bg-epoch-background rounded-arch z-10" />`
- Arco superior: `rounded-b-[100%]` para footer

---

## 5. Componentes de Marca

### 5.1 Logo

- **OpttiusLogoText** — Wordmark con slogan "Sistema de Gestión Óptica"
- **OpttiusLogoCompact** — Icono + wordmark vertical (loading, auth success)
- **OpttiusBrand** — Icono + wordmark horizontal (sidebar, header)
- **OpttiusIcon** — Solo isotipo

### 5.2 Prop `forceLight`

En fondos oscuros (epoch-surface, epoch-primary), usar `forceLight={true}` para que el logo sea legible (crema/blanco).

---

## 6. Header y Navegación

### 6.1 Landing Header

- **Estado inicial:** `bg-transparent`
- **Al scroll (scrollY > 20):** `bg-epoch-surface/90 backdrop-blur-md shadow-xl`
- Logo siempre legible: `OpttiusLogoText forceLight={true}`

### 6.2 Admin Header

- `admin-header`: `bg-admin-bg-secondary`, `backdrop-filter: blur(12px)`
- Texto forzado: `color: #F9F7F2` para contraste en fondos oscuros

### 6.3 Sidebar Admin

- Fondo: `admin-bg-secondary` (verde bosque)
- Nav items: `admin-nav-item`, estado activo con `admin-accent-primary`
- Badges: `admin-sidebar-badge` — transparente, solo número en dorado

---

## 7. Botones

### 7.1 CTA Primario (Landing)

```tsx
<Button className="bg-epoch-accent hover:bg-white text-epoch-surface rounded-none h-16 px-16 text-xs font-display tracking-[0.3em] uppercase transition-all duration-500 shadow-2xl">
  Probar Gratis
</Button>
```

### 7.2 CTA Secundario (Ghost)

```tsx
<button className="text-white/60 hover:text-white font-serif italic text-lg tracking-wide border-b border-white/20 hover:border-white pb-1">
  Ver demo en vivo
</button>
```

### 7.3 Botón Auth (Login/Signup)

```tsx
<Button className="w-full h-16 rounded-none bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold uppercase text-xs tracking-[0.4em]">
  Sincronizar Acceso
</Button>
```

---

## 8. Cards y Superficies

### 8.1 Admin Card

```css
.admin-card {
  background: var(--card);
  border-radius: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border);
  transition: all 0.3s ease;
}
.admin-card:hover {
  transform: translateY(-2px);
  border-color: var(--admin-accent-secondary);
}
```

### 8.2 Bento Feature Card

- Bordes: `border border-epoch-primary/5`
- Hover: `hover:shadow-2xl hover:-translate-y-1`
- Iconos en contenedor: `p-3 rounded-none border border-epoch-primary/10`

---

## 9. Animaciones

### 9.1 Keyframes Disponibles (tailwind.config.ts)

- `fade-in-up` — Entrada desde abajo
- `slide-in-right` — Entrada desde izquierda
- `slide-in-left` — Entrada desde derecha
- `scale-in` — Zoom suave
- `premium-float` — Flotación sutil
- `premium-pulse` — Pulsación de opacidad

### 9.2 Clases de Entrada

```tsx
className = "animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200";
```

### 9.3 Transiciones Globales (globals.css)

```css
* {
  transition-property:
    background-color, border-color, color, fill, stroke, transform, box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 250ms;
}
```

---

## 10. Imágenes

### 10.1 Tratamiento Visual

- **Por defecto:** `grayscale` + `opacity-40` o similar
- **Hover:** `group-hover:grayscale-0 group-hover:opacity-20`
- **Overlay:** Gradiente `from-epoch-primary/90 via-epoch-primary/60 to-epoch-surface`

### 10.2 Assets de Landing

| Asset         | Uso                                                 |
| ------------- | --------------------------------------------------- |
| Hero.webp     | Hero, login/signup branding                         |
| Vision.webp   | BenefitsSection                                     |
| LamparaW.webp | FeaturesSection (Gestión de Pacientes IA)           |
| mesaW.webp    | FeaturesSection (Inventario) — verificar existencia |

### 10.3 Texturas

- Carbon fibre: `bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]`

---

## 11. Formularios (Auth)

### 11.1 Inputs

- Altura: `h-14`
- Bordes: `rounded-none border-epoch-primary/10`
- Fondo: `bg-epoch-background/50 focus:bg-white`
- Iconos: `absolute left-5`, `text-epoch-primary/30 group-focus-within:text-epoch-primary`

### 11.2 Labels

- `text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-[0.3em]`

---

## 12. Responsive

### 12.1 Breakpoints

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1400px (container)

### 12.2 Estrategia

- Mobile-first
- Bento: 1 col móvil, 2 cols tablet, 4 cols desktop
- Header: menú hamburguesa en `lg:hidden`, nav horizontal en `hidden lg:flex`

---

## 13. Checklist de Consistencia

Antes de publicar cambios de frontend:

- [ ] ¿Se usa la paleta Epoch (epoch-primary, epoch-accent, epoch-background, epoch-surface)?
- [ ] ¿La tipografía sigue la jerarquía (font-display, font-serif, font-body)?
- [ ] ¿Los botones usan `rounded-none`?
- [ ] ¿Las transiciones entre secciones usan `rounded-arch` cuando aplica?
- [ ] ¿El logo es legible en fondos oscuros (forceLight)?
- [ ] ¿Las imágenes tienen tratamiento grayscale/overlay coherente?
- [ ] ¿El copy evita lenguaje excesivamente literario?
- [ ] ¿Los CTAs son claros y accionables?

---

## 14. Integración con NotebookLM

Para que el cerebro del proyecto tenga acceso a esta documentación:

```bash
nlm source add <notebook-id> --text "$(cat docs/FRONTEND_IDENTITY.md)" --title "Frontend Identity Documentation - Opttius"
```

Notebook ID del proyecto: `e071bebc-ce79-4b32-a040-61a6a9c331a3`

---

## 15. Referencias

- **Identidad:** [docs/IDENTITY.md](./IDENTITY.md)
- **Auditoría:** [docs/IDENTITY_AUDIT.md](./IDENTITY_AUDIT.md)
- **Skill Frontend:** [.cursor/skills/frontend-design-modern/SKILL.md](../.cursor/skills/frontend-design-modern/SKILL.md)
- **Skill Identidad:** [.cursor/skills/opttius-identity/SKILL.md](../.cursor/skills/opttius-identity/SKILL.md)
