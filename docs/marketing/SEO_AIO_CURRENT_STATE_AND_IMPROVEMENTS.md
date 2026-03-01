# Estado Actual SEO + AIO y Mejoras Detectadas — Opttius

**Versión:** 1.0  
**Fecha:** 2026-02-28  
**Objetivo:** Análisis exhaustivo del estado actual y backlog de mejoras priorizadas.

---

## 1. Resumen Ejecutivo

El programa Opttius tiene una **base de metadata mínima** pero presenta **deficiencias críticas** que impiden el descubrimiento orgánico. El sitio está actualmente **bloqueado para indexación** (`robots: index false`). No existe sitemap, robots.txt, datos estructurados ni optimización para IA.

**Prioridad global:** Implementar las mejoras de Fase 1 (críticas) antes de cualquier lanzamiento de marketing orgánico.

---

## 2. Estado Actual por Área

### 2.1 Metadata (Root Layout)

| Aspecto          | Estado Actual                                                      | Evaluación                                      |
| ---------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| **title**        | "Opttius - Sistema de Gestión Óptica" + template "%s \| Opttius"   | Parcial — Falta eslogan en default              |
| **description**  | "Opttius - Sistema de gestión para ópticas y laboratorios ópticos" | Aceptable — Podría ser más persuasiva           |
| **robots**       | `{ index: false, follow: false }`                                  | **CRÍTICO** — Sitio bloqueado                   |
| **metadataBase** | No definido                                                        | Falta — Necesario para URLs absolutas en OG     |
| **openGraph**    | No definido                                                        | Falta                                           |
| **twitter**      | No definido                                                        | Falta                                           |
| **keywords**     | No definido                                                        | Falta                                           |
| **lang**         | `en` en `<html>`                                                   | Incorrecto — Audiencia es español (Chile/LATAM) |

### 2.2 Sitemap y Robots

| Archivo         | Estado    | Evaluación  |
| --------------- | --------- | ----------- |
| **sitemap.xml** | No existe | **CRÍTICO** |
| **robots.txt**  | No existe | **CRÍTICO** |

### 2.3 Datos Estructurados (JSON-LD)

| Esquema                 | Estado    | Evaluación             |
| ----------------------- | --------- | ---------------------- |
| **Organization**        | No existe | Falta                  |
| **SoftwareApplication** | No existe | Falta                  |
| **WebSite**             | No existe | Falta                  |
| **FAQPage**             | No existe | Falta (no hay FAQ aún) |
| **BreadcrumbList**      | No existe | Falta                  |

### 2.4 Páginas Públicas y Metadata por Ruta

| Ruta       | Metadata específica | Indexable                |
| ---------- | ------------------- | ------------------------ |
| `/`        | Hereda root         | Sí (pero robots bloquea) |
| `/login`   | No                  | Debería tener            |
| `/signup`  | No                  | Debería tener            |
| `/about`   | No                  | Debería tener            |
| `/legal/*` | No                  | Debería tener            |
| `/support` | No                  | Debería tener            |

### 2.5 Landing Page

| Aspecto                  | Estado                                                | Evaluación                                                      |
| ------------------------ | ----------------------------------------------------- | --------------------------------------------------------------- |
| **H1**                   | "El motor inteligente para las ópticas modernas"      | Desalineado — Eslogan oficial es "Automatiza. Controla. Crece." |
| **Client Component**     | `"use client"` en page.tsx                            | Subóptimo — Server Component preferible para SEO                |
| **Estructura semántica** | section con ids (inicio, caracteristicas, beneficios) | Aceptable                                                       |
| **Imagen Hero**          | alt="Vintage Optics Background"                       | Genérico — Mejorar con descripción óptica                       |

### 2.6 Configuración de Negocio

| Archivo       | Aspecto | Estado                                            |
| ------------- | ------- | ------------------------------------------------- |
| `business.ts` | Colores | Legacy (no Epoch)                                 |
| `business.ts` | Tagline | "Sistema de Gestión Óptica" (correcto para admin) |

---

## 3. Mejoras Detectadas (Backlog Priorizado)

### 3.1 Fase 1 — Críticas (Bloquean descubrimiento)

| ID  | Mejora                   | Archivo               | Acción                                                                        |
| --- | ------------------------ | --------------------- | ----------------------------------------------------------------------------- |
| 1.1 | **Habilitar indexación** | `src/app/layout.tsx`  | Cambiar `robots: { index: false }` a `index: true` (condicional por NODE_ENV) |
| 1.2 | **Crear sitemap.xml**    | `src/app/sitemap.ts`  | Crear archivo con rutas públicas                                              |
| 1.3 | **Crear robots.txt**     | `src/app/robots.ts`   | Crear archivo, bloquear /admin/, /api/, etc.                                  |
| 1.4 | **Añadir metadataBase**  | `src/app/layout.tsx`  | `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL)`                      |
| 1.5 | **Añadir Open Graph**    | `src/app/layout.tsx`  | openGraph, twitter cards                                                      |
| 1.6 | **Crear og-image**       | `public/og-image.png` | Imagen 1200x630 para redes sociales                                           |

### 3.2 Fase 2 — Alta Prioridad

| ID  | Mejora                   | Archivo                          | Acción                                                                                             |
| --- | ------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| 2.1 | **Corregir lang**        | `src/app/layout.tsx`             | `<html lang="es">` o `lang="es-CL"`                                                                |
| 2.2 | **JSON-LD Organization** | Nuevo componente                 | Crear `StructuredData.tsx` con Organization, SoftwareApplication, WebSite                          |
| 2.3 | **Metadata por ruta**    | `app/legal/*`, `app/about`, etc. | Añadir `metadata` export en cada page                                                              |
| 2.4 | **Hero H1 alineado**     | `HeroSection.tsx`                | Evaluar: ¿H1 = "Automatiza. Controla. Crece." o mantener actual? (Ver MARKETING_IDENTITY_STRATEGY) |
| 2.5 | **NEXT_PUBLIC_APP_URL**  | `.env.example`, Vercel           | Documentar y configurar URL canónica                                                               |

### 3.3 Fase 3 — Media Prioridad

| ID  | Mejora                       | Archivo                      | Acción                                                                   |
| --- | ---------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| 3.1 | **Keywords en metadata**     | `layout.tsx`                 | Añadir array de keywords ópticas                                         |
| 3.2 | **BreadcrumbList**           | Páginas legal, about         | JSON-LD BreadcrumbList                                                   |
| 3.3 | **FAQPage**                  | Cuando exista FAQ en landing | Crear sección FAQ + JSON-LD                                              |
| 3.4 | **Landing Server Component** | `app/page.tsx`               | Evaluar migrar a Server Component; client solo en secciones interactivas |
| 3.5 | **Alt text imágenes**        | HeroSection, etc.            | Mejorar descripciones para accesibilidad y SEO                           |

### 3.4 Fase 4 — Mejora Continua

| ID  | Mejora               | Acción                                               |
| --- | -------------------- | ---------------------------------------------------- |
| 4.1 | **Core Web Vitals**  | Auditoría Lighthouse, optimizar LCP, CLS             |
| 4.2 | **Accesibilidad**    | Auditoría axe/WAVE, corregir contraste, focus        |
| 4.3 | **Internal linking** | Enlaces entre topic clusters en blog/docs            |
| 4.4 | **Contenido AIO**    | Crear guías, FAQ, formato Q&A para citación por LLMs |
| 4.5 | **hreflang**         | Si se expande a otros mercados (es-MX, es-AR)        |

---

## 4. Riesgos Actuales

| Riesgo             | Impacto                                  | Mitigación |
| ------------------ | ---------------------------------------- | ---------- |
| Sitio no indexable | Ningún tráfico orgánico                  | Fase 1.1   |
| Sin sitemap        | Crawlers no descubren páginas            | Fase 1.2   |
| Sin JSON-LD        | LLMs y Google no entienden entidad       | Fase 2.2   |
| lang="en"          | Señal incorrecta para mercado español    | Fase 2.1   |
| Sin og-image       | Compartir en redes sin preview atractivo | Fase 1.6   |

---

## 5. Métricas de Éxito (Post-Implementación)

- **Indexación:** Páginas públicas en Google Search Console
- **Rich Results:** SoftwareApplication, Organization validados
- **Core Web Vitals:** LCP < 2.5s, CLS < 0.1
- **AIO:** Mención de Opttius en respuestas de Perplexity/ChatGPT a queries ópticas (objetivo a largo plazo)

---

## 6. Referencias

- [SEO_AIO_DISCOVERY_STRATEGY.md](./SEO_AIO_DISCOVERY_STRATEGY.md) — Estrategia
- [SEO_AIO_TECHNICAL_REFERENCE.md](./SEO_AIO_TECHNICAL_REFERENCE.md) — Implementación
- [MARKETING_IDENTITY_STRATEGY.md](./MARKETING_IDENTITY_STRATEGY.md) — Identidad
