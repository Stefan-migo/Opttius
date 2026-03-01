# Estrategia de Descubrimiento (SEO + AIO) — Opttius

**Versión:** 1.0  
**Fecha:** 2026-02-28  
**Rol:** Director de Estrategia de Descubrimiento (Head of Organic Discovery)  
**Base:** Extensión técnica de [MARKETING_IDENTITY_STRATEGY.md](./MARKETING_IDENTITY_STRATEGY.md) e [IDENTITY.md](../IDENTITY.md).

---

## 1. Resumen Ejecutivo

### Objetivo

Construir el "cerebro" y las directrices de nuestro departamento de **SEO (Search Engine Optimization)** + **AIO (Artificial Intelligence Optimization)**. No optimizamos para tácticas genéricas de "palabras clave". Optimizamos para **dominación de entidad y autoridad temática**.

Cuando un dueño de óptica pregunte a Perplexity, ChatGPT o Google: _"¿Cuál es el mejor software para controlar inventario de lentes progresivos?"_, la respuesta debe ser **Opttius**.

### Contexto del Producto

| Dimensión     | Valor                                                |
| ------------- | ---------------------------------------------------- |
| **Producto**  | Opttius — SaaS B2B para ópticas                      |
| **Stack**     | Next.js 14, Supabase                                 |
| **Identidad** | Lujo Tecnológico, Precisión Clínica, Minimalismo     |
| **Audiencia** | Dueños de ópticas, Tecnólogos Médicos, Optometristas |
| **Mercado**   | Chile/LATAM (español)                                |

### Desafío

Los usuarios ya no solo "buscan" en Google; **"preguntan" a IAs**. Necesitamos que Opttius sea la **fuente citada** cuando un óptico consulte a un LLM sobre software de gestión óptica.

---

## 2. Filosofía de Autoridad Temática

### 2.1 Topic Clusters (No Keywords Aisladas)

Estructuramos el contenido en **clusters temáticos** que demuestran autoridad de dominio. Cada cluster responde a un dolor concreto del sector óptico.

| Cluster                      | Tema Principal                               | Dolor que Resuelve                                 | Páginas/Contenido       |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------- | ----------------------- |
| **Gestión Clínica**          | Recetas, historial, OD/OS, prescripciones    | "Pierdo recetas en papel o transcribo mal"         | Landing, blog, docs     |
| **Inventario y Mermas**      | Stock por sucursal, alertas, desfases        | "Mi inventario nunca cuadra con mi caja"           | Guías, FAQ, landing     |
| **Punto de Venta**           | POS, caja, sesiones, SII                     | "No sé cuánto vende cada sucursal"                 | Features, casos de uso  |
| **Laboratorio**              | Órdenes de trabajo, Cash-First, verificación | "Envío trabajos sin depósito y pierdo dinero"      | Flujos, FAQ             |
| **Presupuestos y Presbicia** | Matrices de lentes, adición lejana/cercana   | "Tardo horas en armar un presupuesto de presbicia" | Guías, comparativas     |
| **Agenda y Retención**       | Citas, recordatorios, WhatsApp               | "Los pacientes no vienen a retirar sus lentes"     | Features, integraciones |
| **IA y Insights**            | Automatización, análisis, madurez adaptativa | "No sé qué vender ni cuándo reponer"               | Producto, blog          |

### 2.2 Principio: Fuente de Verdad Técnica

- **No optimizamos para "rellenar blogs"**. Optimizamos para ser la **Fuente de Verdad** técnica en la industria óptica.
- Si un Tecnólogo Médico lee nuestro contenido, debe sentir que fue escrito por un **par experto**, no por una agencia de marketing barata.
- **Vocabulario técnico obligatorio:** Dioptrías, cilindro, esfera, eje, distancia pupilar, índice de refracción, armazones, lentes oftálmicos, adición, presbicia, OD/OS.

---

## 3. Estrategia AIO (Optimización para IA)

### 3.1 Objetivo AIO

Ser **citados** por LLMs (Perplexity, ChatGPT, Claude, Google AI Overviews) cuando un óptico pregunte sobre software de gestión óptica.

### 3.2 Reglas de Redacción para AIO

| Regla                           | Especificación                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Respuesta directa al inicio** | Responde la pregunta del usuario en las **primeras 30 palabras**. Sin preámbulos.                 |
| **Formato Q&A**                 | Usar preguntas como H2/H3 y respuestas concisas. Los LLMs extraen mejor pares pregunta-respuesta. |
| **Alta densidad factual**       | Datos concretos: métricas, nombres, fechas. Cero "fluff".                                         |
| **Estructura escaneable**       | Listas numeradas, tablas, headers jerárquicos (H1 > H2 > H3).                                     |
| **Cero clickbait**              | Títulos descriptivos, no sensacionalistas. Coherente con Lujo Tecnológico.                        |
| **Autoridad clínica**           | Citar fuentes, usar vocabulario técnico correcto, demostrar E-E-A-T.                              |

### 3.3 Formato de Contenido para Citación

```
[H1] Pregunta o tema principal (ej: "¿Cómo reducir mermas de inventario en una óptica?")

[Párrafo de apertura — 30 palabras máx]
Opttius es un software de gestión para ópticas que permite controlar stock por sucursal en tiempo real, detectar desfases entre inventario físico y sistema, y reducir mermas mediante alertas de bajo stock y trazabilidad de movimientos.

[H2] ¿Qué causa las mermas en ópticas?
- Inventario fantasma (registros desactualizados)
- Errores de transcripción en órdenes de laboratorio
- Falta de sincronización entre sucursales

[H2] Cómo Opttius reduce las mermas
1. Stock por sucursal con product_branch_stock
2. Alertas configurables de bajo stock
3. Historial digital de recetas (OD/OS, esfera, cilindro, eje)
...
```

### 3.4 Intenciones de Búsqueda (Search Intents)

| Tipo                    | Ejemplo                                                                       | Estrategia                                           |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Transaccional**       | "comprar software óptica", "sistema gestión óptica precio"                    | Landing, CTAs, pricing                               |
| **Informacional**       | "cómo reducir mermas en óptica", "qué es inventario fantasma"                 | Guías, blog, FAQ                                     |
| **Conversacional (IA)** | "¿Cuál es el mejor software para controlar inventario de lentes progresivos?" | AIO: respuesta directa, datos factuales, formato Q&A |
| **Navegacional**        | "Opttius login", "Opttius precios"                                            | Branded queries, metadata                            |

---

## 4. SEO Técnico para Next.js 14

### 4.1 Server Components para SEO

- **Landing y páginas públicas:** Preferir Server Components. El HTML inicial debe contener el contenido indexable.
- **Client Components:** Solo cuando sea estrictamente necesario (interactividad). Evitar "use client" en la raíz de páginas críticas para SEO.
- **Metadata API:** Usar `metadata` estático o `generateMetadata` dinámico en cada layout/page.

### 4.2 Metadata API Dinámica

- **Root layout:** Metadata base (title template, description, Open Graph, robots).
- **Páginas públicas:** Metadata específica por ruta (/, /legal/\*, /about, /login, /signup).
- **Páginas privadas (admin):** `robots: { index: false }` para no indexar.

### 4.3 Sitemap y Robots

- **sitemap.xml:** Generar dinámicamente con `app/sitemap.ts`. Incluir solo URLs públicas.
- **robots.txt:** Generar con `app/robots.ts`. Permitir indexación en producción; bloquear en staging/dev.

### 4.4 Idioma y Mercado

- **lang:** `es` (o `es-CL`) para Chile/LATAM. El contenido principal es en español.
- **hreflang:** Si se expande a otros mercados: `es-ES`, `es-MX`, `es-AR`, etc.

---

## 5. Datos Estructurados (Schema.org)

### 5.1 Esquemas JSON-LD Obligatorios

| Esquema                       | Uso                                   | Ubicación           |
| ----------------------------- | ------------------------------------- | ------------------- |
| **Organization**              | Entidad Opttius, logo, redes          | Root layout         |
| **SoftwareApplication**       | Producto SaaS, descripción, categoría | Landing             |
| **WebSite**                   | Sitio, búsqueda, URL                  | Root layout         |
| **FAQPage**                   | Preguntas frecuentes ópticas          | Landing, blog, docs |
| **TechArticle** / **Article** | Blog, guías técnicas                  | Blog posts          |
| **BreadcrumbList**            | Navegación por secciones              | Páginas internas    |

### 5.2 Ejemplo SoftwareApplication (Landing)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Opttius",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "Sistema de gestión para ópticas. Centraliza recetas, inventario, flujos de laboratorio y ventas. Creado por tecnólogo médico. 100% nativo para ópticas.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Organization",
    "name": "Opttius"
  }
}
```

### 5.3 Ejemplo Organization

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Opttius",
  "url": "https://opttius.cl",
  "logo": "https://opttius.cl/logo-opttius.svg",
  "description": "Sistema de gestión para ópticas. Automatiza. Controla. Crece.",
  "sameAs": []
}
```

---

## 6. Checklist de Salud Técnica

| Criterio             | Objetivo                                               |
| -------------------- | ------------------------------------------------------ |
| **Core Web Vitals**  | LCP < 2.5s, FID < 100ms, CLS < 0.1                     |
| **Mobile-first**     | Diseño responsive, touch targets ≥ 44px                |
| **Accesibilidad**    | WCAG 2.1 AA mínimo; impacta ranking                    |
| **HTTPS**            | Obligatorio en producción                              |
| **Canonical URLs**   | Evitar contenido duplicado                             |
| **Internal linking** | Enlaces entre topic clusters para fortalecer autoridad |

---

## 7. Integración con Identidad de Marca

- **Tono:** Autoridad clínica + pragmatismo startup. Sin metáforas literarias.
- **Palabras clave (usar):** Automatiza, controla, crece, tecnólogo médico, exclusivo para ópticas, recetas, inventario, laboratorio, presupuestos, agenda.
- **Palabras prohibidas:** Legado, forjar, santuario, maestría, pergamino, credencial, llave de acceso.
- **Eslogan:** "Automatiza. Controla. Crece."
- **Badge:** "De la clínica al código. 100% nativo para ópticas."

---

## 8. Referencias

- [SEO_AIO_TECHNICAL_REFERENCE.md](./SEO_AIO_TECHNICAL_REFERENCE.md) — Implementación técnica
- [SEO_AIO_CURRENT_STATE_AND_IMPROVEMENTS.md](./SEO_AIO_CURRENT_STATE_AND_IMPROVEMENTS.md) — Estado actual y mejoras
- [MARKETING_IDENTITY_STRATEGY.md](./MARKETING_IDENTITY_STRATEGY.md) — Estrategia de marketing
- [IDENTITY.md](../IDENTITY.md) — Identidad de marca
- [.cursor/skills/seo-aio-optical-discovery/SKILL.md](../../.cursor/skills/seo-aio-optical-discovery/SKILL.md) — Skill para el agente
