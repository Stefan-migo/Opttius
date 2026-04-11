---
name: seo-aio-optical-discovery
description: Expert guide for SEO and AIO (Artificial Intelligence Optimization) in Opttius optical shop SaaS. Use when working on metadata, sitemap, robots, JSON-LD, Schema.org, Open Graph, discoverability, search optimization, LLM citation, or content for Perplexity/ChatGPT. Ensures authority temática, topic clusters, and technical SEO for Next.js 14.
---

# SEO + AIO para Descubrimiento Orgánico — Opttius

Guía para construir y mantener la estrategia de descubrimiento (SEO + AIO) del SaaS óptico Opttius. Objetivo: que dueños de ópticas encuentren Opttius vía búsqueda y que LLMs lo citen como autoridad en software de gestión óptica.

## Cuándo Usar Este Skill

- Crear o modificar metadata (title, description, Open Graph)
- Implementar sitemap, robots.txt
- Añadir o revisar JSON-LD (Schema.org)
- Escribir contenido para blog, guías, FAQ
- Optimizar páginas para indexación
- Trabajar en landing, legal, about, o cualquier página pública
- Diseñar estructura de URLs o breadcrumbs

## Principios Fundamentales

### Autoridad Temática (No Keywords Aisladas)

- Estructurar contenido en **Topic Clusters**: Gestión Clínica, Inventario, POS, Laboratorio, Presupuestos, Agenda, IA.
- Cada cluster responde a un **dolor concreto** del sector óptico.
- **Vocabulario técnico obligatorio:** Dioptrías, cilindro, esfera, eje, distancia pupilar, OD/OS, presbicia, armazones, lentes oftálmicos.

### AIO: Ser Citados por LLMs

- **Respuesta directa en las primeras 30 palabras.** Sin preámbulos.
- **Formato Q&A:** Preguntas como H2/H3, respuestas concisas.
- **Alta densidad factual:** Métricas, datos concretos. Cero "fluff".
- **Estructura escaneable:** Listas, tablas, headers jerárquicos.

### Identidad de Marca

- **Eslogan:** "Automatiza. Controla. Crece."
- **Badge:** "De la clínica al código. 100% nativo para ópticas."
- **Tono:** Autoridad clínica + pragmatismo startup. Sin metáforas literarias.
- **Prohibidas:** legado, forjar, santuario, maestría, pergamino, credencial, llave de acceso.

## Reglas de Implementación

### Metadata (Next.js 14)

1. **Root layout:** `metadataBase`, `title` con template, `description`, `openGraph`, `twitter`, `robots`.
2. **Producción:** `robots: { index: true, follow: true }` para páginas públicas.
3. **Admin/Auth privadas:** `robots: { index: false, follow: false }`.
4. **lang:** `es` o `es-CL` (audiencia Chile/LATAM).

### JSON-LD (Schema.org)

1. **Obligatorios en landing:** Organization, SoftwareApplication, WebSite.
2. **Sanitizar:** Reemplazar `<` por `\u003c` en JSON-LD para evitar XSS.
3. **Ubicación:** En layout o componente de landing; múltiples scripts `application/ld+json` permitidos.

### Sitemap y Robots

1. **sitemap.ts:** Solo URLs públicas (/, /login, /signup, /about, /legal/\*, /support).
2. **robots.ts:** Disallow /admin/, /api/, /onboarding/, /checkout/, /profile/.
3. **Producción vs dev:** En dev/staging, considerar bloquear indexación.

### Estructura Semántica HTML

1. **Un solo H1** por página. Debe contener el tema principal o eslogan.
2. **H2 > H3** jerárquico. No saltar niveles.
3. **Landing H1:** Evaluar alineación con eslogan "Automatiza. Controla. Crece." según MARKETING_IDENTITY_STRATEGY.

### Enlazado Interno

- Enlazar entre topic clusters para fortalecer autoridad de dominio.
- Breadcrumbs en páginas internas (legal, about).

## Checklist Antes de Publicar Contenido/SEO

- [ ] ¿Metadata incluye title, description, Open Graph?
- [ ] ¿robots permite indexación en páginas públicas?
- [ ] ¿JSON-LD presente en landing (Organization, SoftwareApplication, WebSite)?
- [ ] ¿Estructura H1/H2/H3 correcta?
- [ ] ¿Contenido responde la pregunta en las primeras 30 palabras (AIO)?
- [ ] ¿Vocabulario técnico correcto (dioptrías, OD/OS, etc.)?
- [ ] ¿Se evitan palabras prohibidas (legado, forjar, etc.)?
- [ ] ¿lang="es" en html?

## Archivos Clave

| Archivo                                                    | Contenido                |
| ---------------------------------------------------------- | ------------------------ |
| `src/app/layout.tsx`                                       | Metadata root, robots    |
| `src/app/sitemap.ts`                                       | Sitemap dinámico         |
| `src/app/robots.ts`                                        | robots.txt               |
| `docs/marketing/SEO_AIO_DISCOVERY_STRATEGY.md`             | Estrategia completa      |
| `docs/marketing/SEO_AIO_TECHNICAL_REFERENCE.md`            | Snippets, implementación |
| `docs/marketing/SEO_AIO_CURRENT_STATE_AND_IMPROVEMENTS.md` | Estado actual, backlog   |

## Integración

- **Marketing:** [marketing-identity-optical](../../.cursor/skills/marketing-identity-optical/SKILL.md) — Copy, tono, identidad
- **Frontend:** [frontend-design-modern](../../.cursor/skills/frontend-design-modern/SKILL.md) — UI, diseño
- **Identidad:** [opttius-identity](../../.cursor/skills/opttius-identity/SKILL.md) — Marca

## Referencias

- [SEO_AIO_DISCOVERY_STRATEGY.md](../../../docs/marketing/SEO_AIO_DISCOVERY_STRATEGY.md)
- [SEO_AIO_TECHNICAL_REFERENCE.md](../../../docs/marketing/SEO_AIO_TECHNICAL_REFERENCE.md)
- [SEO_AIO_CURRENT_STATE_AND_IMPROVEMENTS.md](../../../docs/marketing/SEO_AIO_CURRENT_STATE_AND_IMPROVEMENTS.md)
- [MARKETING_IDENTITY_STRATEGY.md](../../../docs/marketing/MARKETING_IDENTITY_STRATEGY.md)
