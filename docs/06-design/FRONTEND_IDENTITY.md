# Documentación de Identidad Visual del Frontend — Opttius

**Versión:** 2.0  
**Fecha:** 2026-02-22  
**Alcance:** Especificación técnica del sistema visual Epoch (post-pivote Lujo Tecnológico).

**Fuente de verdad para narrativa y copy:** [docs/IDENTITY.md](./IDENTITY.md)

---

## 1. Resumen Ejecutivo

Este documento define la implementación técnica del sistema visual **Epoch** para el frontend de Opttius. Tras el pivote a **Lujo Tecnológico y Precisión Clínica** (2026-02-22), la estética prioriza minimalismo SaaS, tipografías geométricas y espacios limpios — estilo Stripe, Apple, Vercel.

---

## 2. Sistema de Colores (Paleta Epoch — intacta)

### 2.1 Tokens Principales

| Token              | Hex               | Uso                                                        |
| ------------------ | ----------------- | ---------------------------------------------------------- |
| `epoch-primary`    | #1A2B23 / #2C3E33 | Verde profundo. Títulos, fondos oscuros, botones primarios |
| `epoch-accent`     | #C5A059 / #C4B28C | Dorado. Acentos, CTAs, highlights                          |
| `epoch-surface`    | #1A1A1A           | Charcoal. Fondos oscuros, header scroll                    |
| `epoch-background` | #F9F7F2 / #EAE8DD | Crema. Fondos claros, cards                                |

### 2.2 Clases Tailwind

```css
bg-epoch-primary  text-epoch-primary  border-epoch-primary
bg-epoch-accent   text-epoch-accent   border-epoch-accent
bg-epoch-surface  bg-epoch-background
```

---

## 3. Tipografía (Minimalismo SaaS)

### 3.1 Jerarquía de Fuentes

| Familia                     | Variable CSS       | Uso                                                                             |
| --------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| **Geist / Inter / DM Sans** | `--font-sans`      | Display y body. Principal para títulos y texto.                                 |
| **Cormorant Garamond**      | `--font-cormorant` | Solo acentos decorativos mínimos (ej: una palabra en itálica). No para lectura. |

**Eliminadas:** Cinzel, Playfair Display, Lato.

### 3.2 Clases Tailwind

```css
font-sans     /* Geist/Inter/DM Sans - principal */
font-cormorant /* Cormorant - acento decorativo sutil, uso mínimo */
```

### 3.3 Patrón de Títulos Hero

```tsx
<h1 className="text-5xl md:text-7xl font-sans font-bold text-white tracking-tight">
  Automatiza. Controla. Crece.
</h1>
<p className="text-xl font-sans text-white/70 mt-4">
  Desde el examen visual hasta la entrega del lente...
</p>
```

### 3.4 Escala de Tamaños

- `text-xs` — Labels, badges
- `text-sm` — Descripciones secundarias
- `text-base` — Cuerpo principal
- `text-lg` — Subtítulos
- `text-xl` a `text-8xl` — Títulos, hero

---

## 4. Formas y Layout (Estilo Apple/Stripe)

### 4.1 Bordes

- **Cards y modales:** `rounded-xl` o `rounded-2xl`
- **Botones:** `rounded-xl`
- **Badges:** `rounded-full` para pills

**Eliminado:** `rounded-arch` (100px). **Eliminado:** `rounded-none` como estándar global.

### 4.2 Bento Grid

Layout minimalista para features:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(160px,auto)]">
  {/* Cards con rounded-xl */}
</div>
```

### 4.3 Espaciado

- **Secciones:** `p-8` o `p-12` (espacio negativo generoso)
- **Gaps:** `gap-6` o `gap-8` en grids

### 4.4 Transiciones entre Secciones

- **Sin arcos:** Usar transiciones lineales o bordes sutiles
- Evitar `rounded-arch` y formas arquitectónicas

---

## 5. Componentes de Marca

### 5.1 Logo

- **OpttiusLogoText** — Wordmark
- **OpttiusLogoCompact** — Icono + wordmark vertical
- **OpttiusBrand** — Icono + wordmark horizontal
- **OpttiusIcon** — Solo isotipo

### 5.2 Prop `forceLight`

En fondos oscuros (epoch-surface, epoch-primary), usar `forceLight={true}` para legibilidad.

---

## 6. Header y Navegación

### 6.1 Landing Header

- **Al scroll:** `bg-epoch-surface/90 backdrop-blur-md shadow-xl`
- Logo siempre legible en fondos oscuros

### 6.2 Admin Header

- `admin-header`: `bg-admin-bg-secondary`, `backdrop-filter: blur(12px)`

---

## 7. Botones

### 7.1 CTA Primario (Landing)

```tsx
<Button className="bg-epoch-accent hover:bg-white text-epoch-surface rounded-xl h-14 px-12 font-sans font-semibold">
  Probar Gratis
</Button>
```

### 7.2 CTA Secundario

```tsx
<button className="text-white/70 hover:text-white font-sans text-base border-b border-white/20 hover:border-white pb-1">
  Ver demo en vivo
</button>
```

### 7.3 Botón Auth

```tsx
<Button className="w-full h-14 rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-sans font-semibold">
  Iniciar sesión
</Button>
```

---

## 8. Cards y Superficies

### 8.1 Feature Card (Bento)

- `rounded-xl`
- `border border-epoch-primary/5`
- `hover:shadow-xl hover:-translate-y-1`
- Iconos en contenedor: `p-3 rounded-xl border border-epoch-primary/10`

### 8.2 Admin Card

- `rounded-xl` (o mantener según diseño admin)
- Hover: `translateY(-2px)`, `border-admin-accent-secondary`

---

## 9. Formularios (Auth)

### 9.1 Inputs

- Altura: `h-14`
- Bordes: `rounded-xl border-epoch-primary/10`
- Fondo: `bg-epoch-background/50 focus:bg-white`
- Labels: "Email", "Contraseña" (no "Credencial", "Llave de Acceso")

### 9.2 Labels

- `text-xs font-sans font-medium text-epoch-primary/70`

---

## 10. Imágenes

### 10.1 Tratamiento Visual

- **Por defecto:** `grayscale` + `opacity-40`
- **Hover:** `group-hover:grayscale-0 group-hover:opacity-20`
- **Overlay:** Gradiente `from-epoch-primary/90 via-epoch-primary/60 to-epoch-surface`

### 10.2 Assets de Landing

| Asset          | Uso                   |
| -------------- | --------------------- |
| Hero.webp      | Hero, login/signup    |
| LamparaW.webp  | FeaturesSection       |
| mesaW.webp     | FeaturesSection       |
| pos.webp, etc. | Features según config |

---

## 11. Responsive

### 11.1 Breakpoints

- `sm`: 640px | `md`: 768px | `lg`: 1024px | `xl`: 1280px | `2xl`: 1400px

### 11.2 Estrategia

- Mobile-first
- Bento: 1 col móvil, 2 cols tablet, 4 cols desktop
- Header: hamburguesa en `lg:hidden`, nav horizontal en `hidden lg:flex`

---

## 12. Checklist de Consistencia

Antes de publicar cambios de frontend:

- [ ] ¿Se usa la paleta Epoch?
- [ ] ¿La tipografía es sans-serif geométrica (Geist/Inter/DM Sans)?
- [ ] ¿Las formas usan rounded-xl o rounded-2xl (no rounded-arch)?
- [ ] ¿El copy evita legado, forjar, santuario, maestría, pergamino, credencial, llave de acceso?
- [ ] ¿El eslogan "Automatiza. Controla. Crece." está presente donde aplica?
- [ ] ¿El logo es legible en fondos oscuros (forceLight)?
- [ ] ¿Los CTAs son claros y accionables?

---

## 13. Referencias

- **Identidad (fuente de verdad):** [docs/IDENTITY.md](./IDENTITY.md)
- **Auditoría y pivote:** [docs/IDENTITY_AUDIT.md](./IDENTITY_AUDIT.md)
- **Skill Frontend:** [.cursor/skills/frontend-design-modern/SKILL.md](../.cursor/skills/frontend-design-modern/SKILL.md)
- **Skill Identidad:** [.cursor/skills/opttius-identity/SKILL.md](../.cursor/skills/opttius-identity/SKILL.md)
