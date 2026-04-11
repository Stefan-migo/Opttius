# SEO + AIO — Referencia Extendida

Detalle técnico para el skill seo-aio-optical-discovery. Consultar cuando se necesiten snippets concretos o especificaciones adicionales.

---

## Intenciones de Búsqueda (Search Intents)

| Tipo                    | Ejemplo                                                                       | Estrategia                                           |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Transaccional**       | "comprar software óptica", "sistema gestión óptica precio"                    | Landing, CTAs, pricing                               |
| **Informacional**       | "cómo reducir mermas en óptica", "qué es inventario fantasma"                 | Guías, blog, FAQ                                     |
| **Conversacional (IA)** | "¿Cuál es el mejor software para controlar inventario de lentes progresivos?" | AIO: respuesta directa, datos factuales, formato Q&A |
| **Navegacional**        | "Opttius login", "Opttius precios"                                            | Branded queries, metadata                            |

---

## Topic Clusters

| Cluster            | Tema                         | Keywords Long-tail                                                   |
| ------------------ | ---------------------------- | -------------------------------------------------------------------- |
| **Inventario**     | Mermas, stock por sucursal   | "cómo reducir mermas en óptica", "inventario fantasma óptica"        |
| **Laboratorio**    | Órdenes, verificación OD/OS  | "errores refracción traspaso laboratorio", "distancia pupilar orden" |
| **Presbicia**      | Presupuestos, adición        | "retención pacientes presbicia", "presupuesto lentes progresivos"    |
| **Tratamientos**   | Antirreflejo, fotocromáticos | "rentabilidad antirreflejo lentes", "margen fotocromáticos"          |
| **Multi-sucursal** | Caja, ventas por sucursal    | "control ventas por sucursal óptica", "cierre caja multi-sucursal"   |

---

## Snippets JSON-LD

### Organization (mínimo)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Opttius",
  "url": "https://opttius.cl",
  "logo": "https://opttius.cl/logo-opttius.svg",
  "description": "Sistema de gestión para ópticas. Automatiza. Controla. Crece."
}
```

### SoftwareApplication (mínimo)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Opttius",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "Sistema de gestión para ópticas. Centraliza recetas, inventario, flujos de laboratorio y ventas. Creado por tecnólogo médico. 100% nativo para ópticas.",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": { "@type": "Organization", "name": "Opttius" }
}
```

### FAQPage (ejemplo)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "¿Qué es Opttius?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Opttius es un sistema de gestión para ópticas que centraliza recetas, inventario, flujos de laboratorio y ventas. Creado por tecnólogo médico, 100% nativo para ópticas."
      }
    }
  ]
}
```

---

## Rutas Públicas (Indexables)

```
/
/login
/signup
/about
/legal/privacidad
/legal/terminos
/legal/cookies
/legal/seguridad
/support
```

---

## Rutas No Indexables

```
/admin/*
/api/*
/onboarding/*
/checkout/*
/profile
/reset-password
```

---

## Variables de Entorno

```env
NEXT_PUBLIC_APP_URL=https://opttius.cl
```

Usar en metadataBase, sitemap, robots, JSON-LD.
