---
name: marketing-identity-optical
description: Guía para construir estrategia de marketing, narrativa e identidad de marca Opttius con código limpio y mejores prácticas. Usar al trabajar en marketing, copy, landing, conversión, posicionamiento óptico, estrategia de marca, o narrativa de identidad.
---

# Marketing e Identidad Óptica — Opttius

Guía para construir estrategia de marketing, narrativa e identidad de marca con código limpio, lógica sencilla y mejores prácticas. Escalable y coherente con el sistema Opttius.

## Cuándo Usar

- Crear o editar copy de marketing (landing, emails, WhatsApp)
- Definir o ajustar estrategia de marca y narrativa
- Trabajar en conversión, posicionamiento óptico o CTAs
- Implementar secciones de landing (Hero, Features, Benefits, CTA)
- Validar coherencia entre marketing, identidad y código

## Flujo de Trabajo

1. **Leer docs de identidad:** [docs/IDENTITY.md](../../docs/IDENTITY.md), [docs/FRONTEND_IDENTITY.md](../../docs/FRONTEND_IDENTITY.md)
2. **Validar contra checklist:** Ver sección Checklist más abajo
3. **Aplicar fórmula por sección:** Hero, Problem/Solution, Features, Benefits, CTA (ver [docs/marketing/MARKETING_IDENTITY_STRATEGY.md](../../docs/marketing/MARKETING_IDENTITY_STRATEGY.md))

## Principios

- **Pragmatismo startup + autoridad clínica:** Beneficios concretos, vocabulario técnico cuando aplique
- **Evitar palabras prohibidas:** legado, forjar, santuario, maestría, pergamino, credencial, llave de acceso
- **Paleta Epoch intacta:** epoch-primary, epoch-accent, epoch-surface, epoch-background
- **CTAs accionables:** "Probar Gratis", "Iniciar sesión", "Registrarse", "Ver demo en vivo"

## Regla: Show, Don't Just Tell

Al generar copy, **siempre cuantificar el beneficio** cuando sea posible. Evitar afirmaciones vagas.

| Evitar                    | Preferir                                                                  |
| ------------------------- | ------------------------------------------------------------------------- |
| "Gestión rápida"          | "Reduce el tiempo de ingreso de recetas en un 40%"                        |
| "Control de inventario"   | "Stock por sucursal sincronizado en tiempo real"                          |
| "Presupuestos eficientes" | "Presupuestos de presbicia en minutos, no horas"                          |
| "Menos errores"           | "Órdenes verificadas: esfera, cilindro, eje sin errores de transcripción" |

## Regla: Empatía Primero

**Validar el dolor del usuario antes de ofrecer la cura.** En cada bloque de copy (Hero, Features, Benefits):

1. **Reconocer el problema** (ej: "¿Tu inventario nunca cuadra con tu caja?")
2. **Luego** presentar la solución (ej: "Stock por sucursal sincronizado con ventas")

No invertir el orden: primero empatía, después propuesta.

## Fórmula por Sección

| Sección          | Estructura                                          |
| ---------------- | --------------------------------------------------- |
| Hero             | Problema implícito + Propuesta + Origen + CTA claro |
| Problem/Solution | Problemas identificables + Soluciones concretas     |
| Features         | Badge origen + Herramientas que resuelven           |
| Benefits         | Resultados medibles + Métricas                      |
| CTA              | Beneficio + Reducción de fricción                   |

## Pilares de la Narrativa

1. Tecnólogo médico: creado por profesional de oftalmología
2. Exclusivo para ópticas: diseñado desde cero, no adaptación de CRM genérico
3. Problemas reales: recetas perdidas, tiempo administrativo, errores en laboratorio
4. Soluciones concretas: historial digital, IA que automatiza, órdenes verificadas

## Integración

- **Landing:** `src/components/landing/` — HeroSection, FeaturesSection, BenefitsSection, CTASection
- **Config:** `src/config/business.ts` — tagline, colores (alinear con Epoch)
- **Auth:** Labels "Email", "Contraseña" (no credencial, llave de acceso)
- **Admin:** Mantener coherencia visual y verbal con landing

## Checklist Antes de Publicar

- [ ] ¿El copy evita legado, forjar, santuario, maestría, pergamino, credencial, llave de acceso?
- [ ] ¿El eslogan "Automatiza. Controla. Crece." está presente donde aplica?
- [ ] ¿El badge "De la clínica al código. 100% nativo para ópticas." está visible?
- [ ] ¿Se usa tipografía sans-serif geométrica (Geist/Inter/DM Sans)?
- [ ] ¿Las formas usan rounded-xl/2xl (no rounded-arch)?
- [ ] ¿La paleta Epoch se mantiene intacta?
- [ ] ¿Los CTAs son claros y accionables?

## Restricciones de Estilo (Innegociables)

- **Arquetipo:** Lujo Tecnológico y Precisión Clínica (estilo Stripe, Apple, Vercel)
- **Paleta Epoch:** Mantener intacta. Tipografías geométricas (Geist, Inter, DM Sans)
- **Prohibidas:** legado, forjar, santuario, maestría, pergamino, credencial, llave de acceso
- **Vocabulario técnico correcto:** Dioptrías, cilindro, esfera, eje, distancia pupilar, índice de refracción, armazones, lentes oftálmicos, adición, presbicia, OD/OS

## Referencias

- **Estrategia completa:** [docs/marketing/MARKETING_IDENTITY_STRATEGY.md](../../docs/marketing/MARKETING_IDENTITY_STRATEGY.md)
- **Referencia técnica:** [REFERENCE.md](./REFERENCE.md) — Hooks de dolor, keywords SEO, snippets
- **Identidad (fuente de verdad):** [docs/IDENTITY.md](../../docs/IDENTITY.md)
- **Frontend:** [docs/FRONTEND_IDENTITY.md](../../docs/FRONTEND_IDENTITY.md)
- **Skills relacionados:** opttius-identity, frontend-design-modern
