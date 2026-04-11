# Referencia Técnica SEO + AIO — Opttius

**Versión:** 1.0  
**Fecha:** 2026-02-28  
**Para:** Desarrolladores  
**Complementa:** [SEO_AIO_DISCOVERY_STRATEGY.md](./SEO_AIO_DISCOVERY_STRATEGY.md)

---

## 1. Metadata en Next.js 14

### 1.1 Root Layout (app/layout.tsx)

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl",
  ),
  title: {
    default:
      "Opttius - Sistema de Gestión Óptica | Automatiza. Controla. Crece.",
    template: "%s | Opttius",
  },
  description:
    "Sistema de gestión para ópticas. Centraliza recetas, inventario, flujos de laboratorio y ventas. Creado por tecnólogo médico. 100% nativo para ópticas.",
  keywords: [
    "software óptica",
    "gestión óptica",
    "inventario óptica",
    "sistema óptica",
    "recetas oftálmicas",
    "laboratorio óptico",
    "POS óptica",
  ],
  authors: [{ name: "Opttius", url: "https://opttius.cl" }],
  creator: "Opttius",
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "/",
    siteName: "Opttius",
    title: "Opttius - Sistema de Gestión Óptica",
    description:
      "Automatiza. Controla. Crece. Software 100% nativo para ópticas.",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "Opttius" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Opttius - Sistema de Gestión Óptica",
    description:
      "Automatiza. Controla. Crece. Software 100% nativo para ópticas.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    // Añadir cuando existan: google: "...", yandex: "..."
  },
};
```

### 1.2 Metadata por Página (generateMetadata)

```tsx
// app/legal/privacidad/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Política de privacidad de Opttius. Cómo protegemos tus datos.",
  robots: { index: true, follow: true },
};
```

### 1.3 Páginas No Indexables (Admin, Auth)

```tsx
// app/admin/layout.tsx
export const metadata: Metadata = {
  title: "Panel de Administración",
  robots: { index: false, follow: false },
};
```

---

## 2. JSON-LD Dinámico

### 2.1 Componente Reutilizable

Crear `src/components/seo/JsonLd.tsx`:

```tsx
"use client";

import { useMemo } from "react";

interface JsonLdProps {
  data: object;
}

export function JsonLd({ data }: JsonLdProps) {
  const jsonString = useMemo(
    () => JSON.stringify(data).replace(/</g, "\\u003c"),
    [data],
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}
```

**Nota de seguridad:** Reemplazar `<` por `\u003c` previene XSS en JSON-LD.

### 2.2 Schemas por Página

**Landing (SoftwareApplication + Organization):**

```tsx
// src/components/landing/StructuredData.tsx
import { JsonLd } from "@/components/seo/JsonLd";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl";

export function LandingStructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Opttius",
    url: baseUrl,
    logo: `${baseUrl}/logo-opttius.svg`,
    description:
      "Sistema de gestión para ópticas. Automatiza. Controla. Crece.",
  };

  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Opttius",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Sistema de gestión para ópticas. Centraliza recetas, inventario, flujos de laboratorio y ventas. Creado por tecnólogo médico. 100% nativo para ópticas.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: { "@type": "Organization", name: "Opttius" },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Opttius",
    url: baseUrl,
    description: "Sistema de gestión para ópticas.",
    publisher: { "@type": "Organization", name: "Opttius" },
  };

  return (
    <>
      <JsonLd data={organization} />
      <JsonLd data={softwareApp} />
      <JsonLd data={website} />
    </>
  );
}
```

**FAQPage (cuando exista sección FAQ):**

```tsx
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Qué es Opttius?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Opttius es un sistema de gestión para ópticas que centraliza recetas, inventario, flujos de laboratorio y ventas. Creado por tecnólogo médico, 100% nativo para ópticas.",
      },
    },
    // ... más preguntas
  ],
};
```

**BreadcrumbList:**

```tsx
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: baseUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "Privacidad",
      item: `${baseUrl}/legal/privacidad`,
    },
  ],
};
```

---

## 3. Sitemap (app/sitemap.ts)

```ts
import { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    "",
    "/login",
    "/signup",
    "/about",
    "/legal/privacidad",
    "/legal/terminos",
    "/legal/cookies",
    "/legal/seguridad",
    "/support",
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
```

---

## 4. Robots (app/robots.ts)

```ts
import { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl";

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    return {
      rules: { userAgent: "*", allow: "/", disallow: "/" },
      sitemap: undefined,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/onboarding/",
          "/checkout/",
          "/profile/",
          "/reset-password/",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/onboarding/",
          "/checkout/",
          "/profile/",
        ],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/onboarding/",
          "/checkout/",
          "/profile/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

---

## 5. Estructura de URLs

| Ruta            | Propósito                          | Indexable                 |
| --------------- | ---------------------------------- | ------------------------- |
| `/`             | Landing                            | Sí                        |
| `/login`        | Inicio de sesión                   | Sí (para branded queries) |
| `/signup`       | Registro                           | Sí                        |
| `/about`        | Nosotros                           | Sí                        |
| `/legal/*`      | Legal (privacidad, términos, etc.) | Sí                        |
| `/support`      | Soporte B2C                        | Sí                        |
| `/admin/*`      | Panel admin                        | No                        |
| `/onboarding/*` | Onboarding                         | No                        |
| `/checkout/*`   | Checkout                           | No                        |
| `/profile`      | Perfil usuario                     | No                        |

### Breadcrumbs

- **Landing:** Inicio
- **Legal:** Inicio > [Privacidad | Términos | Cookies | Seguridad]
- **About:** Inicio > Nosotros

---

## 6. Checklist de Implementación

### Fase 1 — Crítico

- [ ] Cambiar `robots: { index: false }` a `index: true` en root layout (solo producción)
- [ ] Crear `app/sitemap.ts`
- [ ] Crear `app/robots.ts`
- [ ] Añadir `metadataBase` y Open Graph
- [ ] Añadir JSON-LD (Organization, SoftwareApplication, WebSite) en landing

### Fase 2 — Alta Prioridad

- [ ] Metadata específica por ruta pública (legal, about, login, signup)
- [ ] Crear `opengraph-image.png` (1200x630)
- [ ] Corregir `lang` en `<html>`: `es` o `es-CL`
- [ ] Añadir `NEXT_PUBLIC_APP_URL` en env

### Fase 3 — Media Prioridad

- [ ] FAQPage JSON-LD cuando exista sección FAQ
- [ ] BreadcrumbList en páginas internas
- [ ] Validar con [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Validar con [Schema Markup Validator](https://validator.schema.org/)

### Fase 4 — Mejora Continua

- [ ] Core Web Vitals (Lighthouse)
- [ ] Accesibilidad (axe, WAVE)
- [ ] Internal linking entre topic clusters

---

## 7. Variables de Entorno

```env
NEXT_PUBLIC_APP_URL=https://opttius.cl
```

Usar en `metadataBase`, sitemap, robots, JSON-LD.

---

## 8. Cloudflare y Verificación en Producción

Si usas Cloudflare, su "Managed robots.txt" bloquea GPTBot y ClaudeBot por defecto. Ver [SEO_AIO_CLOUDFLARE_VERIFICATION.md](./SEO_AIO_CLOUDFLARE_VERIFICATION.md) para desactivarlo y permitir crawlers de IA.

Para verificar el sitemap sin artefactos de extensiones del navegador: `curl -s https://www.opttius.cl/sitemap.xml`

---

## 9. Referencias Externas

- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Next.js JSON-LD Guide](https://nextjs.org/docs/app/guides/json-ld)
- [Next.js Sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Next.js Robots](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Schema.org SoftwareApplication](https://schema.org/SoftwareApplication)
- [Schema.org Organization](https://schema.org/Organization)
- [Google Search Central](https://developers.google.com/search)
