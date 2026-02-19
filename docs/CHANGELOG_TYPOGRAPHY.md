# Changelog Tipografía — Reemplazo Malisha por Cormorant Garamond

**Fecha:** 2026-02-18

## Cambio

- **Fuente anterior:** Malisha (cursive)
- **Fuente nueva:** Cormorant Garamond (serif)
- **Clase Tailwind:** `font-cormorant` (antes `font-malisha`)

## Motivo

Malisha no convencía para la estética Epoch (sobria, exclusiva). Cormorant Garamond es una fuente elegante, refinada y sobria, adecuada para títulos alternativos, precios y secciones secundarias.

## Archivos modificados

- `src/app/layout.tsx` — Añadido Cormorant_Garamond de next/font/google
- `src/app/globals.css` — Reemplazado --font-malisha por --font-cormorant
- `tailwind.config.ts` — Reemplazado malisha por cormorant
- `src/components/landing/PricingSection.tsx` — font-malisha → font-cormorant
- `src/components/landing/TestimonialsSection.tsx` — font-malisha → font-cormorant
- `src/app/admin/notifications/page.tsx` — font-malisha → font-cormorant

## Jerarquía tipográfica actual

| Clase          | Fuente             | Uso                           |
| -------------- | ------------------ | ----------------------------- |
| font-display   | Cinzel             | Títulos principales           |
| font-cormorant | Cormorant Garamond | Títulos alternativos, precios |
| font-serif     | Playfair Display   | Acentos, cursiva              |
| font-body      | Lato               | Cuerpo, descripciones         |
