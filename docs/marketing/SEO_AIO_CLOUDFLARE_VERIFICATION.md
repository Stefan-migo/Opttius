# Configuración Cloudflare y Verificación SEO + AIO — Opttius

**Versión:** 1.0  
**Fecha:** 2026-03-01  
**Objetivo:** Permitir GPTBot y ClaudeBot para AIO; verificar sitemap limpio.

---

## 1. robots.txt — Desactivar Cloudflare Managed robots.txt

Cloudflare añade su propio bloque de robots.txt **antes** del generado por Next.js. Ese bloque incluye `Disallow: /` para GPTBot y ClaudeBot, lo que impide que los crawlers de IA indexen el sitio para AIO.

### Solución: Desactivar "Instruct AI bot traffic with robots.txt"

**Dashboard nuevo (2024+):**

1. Ir a [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Seleccionar el dominio **opttius.cl**
3. Ir a **Security** > **Settings** (o **Security Settings**)
4. Filtrar por **Bot traffic**
5. Buscar **"Instruct AI bot traffic with robots.txt"**
6. **Desactivar** el toggle

**Dashboard clásico:**

1. **Security** > **Bots**
2. **Configure Bot Fight Mode**
3. Desactivar **"Instruct bot traffic with robots.txt"**

### Resultado esperado

Tras desactivar, el robots.txt servido será únicamente el generado por Next.js (`src/app/robots.ts`), que incluye:

- `User-agent: *` — Allow `/`, Disallow `/admin/`, `/api/`, etc.
- `User-agent: GPTBot` — Allow `/`, Disallow rutas privadas
- `User-agent: ChatGPT-User` — Allow `/`, Disallow rutas privadas
- `User-agent: ClaudeBot` — Allow `/`, Disallow rutas privadas
- `Sitemap: https://www.opttius.cl/sitemap.xml`

### Referencia

- [Cloudflare: Managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)

---

## 2. sitemap.xml — Verificar ausencia de script tags

Si al abrir `https://opttius.cl/sitemap.xml` o `https://www.opttius.cl/sitemap.xml` en el navegador ves etiquetas `<script>`, suelen ser inyecciones de **extensiones de Chrome** (p. ej. el ID `eppiocemhmnlbhjplcgkofciiegomcon` es típico de extensiones).

### Verificación con curl

```bash
curl -s https://www.opttius.cl/sitemap.xml
```

El XML debe contener solo `<urlset>`, `<url>`, `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>`. No debe haber `<script>`.

### Verificación en modo incógnito

Abrir la URL en una ventana de incógnito (sin extensiones) y comprobar que el XML se ve limpio.

### Si curl muestra script tags

Si `curl` también muestra `<script>`, el problema está en el servidor. Revisar:

- Middleware que inyecte scripts
- Configuración de Vercel/Cloudflare que modifique la respuesta
- Headers `Content-Type: application/xml` o `application/xml; charset=utf-8`

---

## 3. Checklist de verificación post-implementación

| Verificación        | Cómo                                                                                                                                  | Estado esperado                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| robots.txt          | `curl https://www.opttius.cl/robots.txt`                                                                                              | Sin bloqueo de GPTBot/ClaudeBot                         |
| sitemap.xml         | `curl https://www.opttius.cl/sitemap.xml`                                                                                             | XML limpio, sin `<script>`                              |
| Google Rich Results | [Prueba de resultados enriquecidos](https://search.google.com/test/rich-results)                                                      | SoftwareApplication válido                              |
| Schema.org          | [Validator](https://validator.schema.org/)                                                                                            | 0 errores en Organization, SoftwareApplication, WebSite |
| Open Graph          | [Facebook Debugger](https://developers.facebook.com/tools/debug/) o [Twitter Card Validator](https://cards-dev.twitter.com/validator) | og-image.png correcta                                   |
