# Marketing e Identidad Óptica — Referencia Extendida

Detalle técnico para el skill marketing-identity-optical. Consultar cuando se necesiten ejemplos concretos o especificaciones adicionales.

---

## Hooks de Dolor (Pain Points)

Frases de gancho basadas en problemas reales de las ópticas. Usar en headlines, CTAs secundarios, emails y contenido.

| Categoría          | Ejemplos                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Recetas**        | "¿Cansado de perder recetas en papel?", "¿Transcribes recetas a mano y cometes errores?"                    |
| **Inventario**     | "¿Tu inventario nunca cuadra con tu caja?", "¿Descuadres entre stock físico y sistema?"                     |
| **Laboratorio**    | "¿Envías órdenes al taller sin depósito y pierdes dinero?", "¿Errores de esfera o cilindro en el traspaso?" |
| **Presupuestos**   | "¿Tardas horas en armar un presupuesto de presbicia?", "¿Presupuestos confusos que espantan pacientes?"     |
| **Agenda**         | "¿Pierdes citas o tienes huecos sin explicación?", "¿Los pacientes no vienen a retirar sus lentes?"         |
| **Multi-sucursal** | "¿No sabes cuánto vende cada sucursal?", "¿Cierres de caja manuales y errores?"                             |

---

## Keywords SEO (Long-tail)

Derivadas de los Pilares de Contenido Estratégico. Priorizar en títulos, meta descripciones y contenido.

- **Inventario:** "cómo reducir mermas en óptica", "inventario fantasma óptica", "desfase stock físico sistema óptica"
- **Laboratorio:** "errores refracción traspaso laboratorio", "verificar esfera cilindro eje orden", "distancia pupilar orden laboratorio"
- **Presbicia:** "retención pacientes presbicia", "presupuesto lentes progresivos óptica", "adición lejana cercana presupuesto"
- **Tratamientos:** "rentabilidad antirreflejo lentes", "margen fotocromáticos óptica", "blue light rentabilidad"
- **Multi-sucursal:** "control ventas por sucursal óptica", "cierre caja multi-sucursal", "inventario por sucursal óptica"

---

## Copy Oficial (Snippets)

### Hero

```
Eslogan (título): "Automatiza. Controla. Crece."
Badge: "De la clínica al código. 100% nativo para ópticas."
Subtitle: "Desde el examen visual hasta la entrega del lente. Centraliza tus recetas, inventario, flujos de laboratorio y ventas en una única plataforma."
CTA primario: "Probar Gratis"
CTA secundario: "Ver demo en vivo"
```

### Auth

```
Labels: "Email", "Contraseña"
CTAs: "Iniciar sesión", "Registrarse", "Crear cuenta"
```

### CTAs Principales

- Primario: "Probar Gratis", "Comenzar ahora", "Empezar Ahora"
- Secundario: "Ver demo en vivo", "Solicitar demo"

---

## Tokens Tailwind (Epoch)

```css
/* Colores */
bg-epoch-primary   text-epoch-primary   border-epoch-primary
bg-epoch-accent    text-epoch-accent    border-epoch-accent
bg-epoch-surface   bg-epoch-background

/* Tipografía */
font-sans      /* Geist/Inter/DM Sans - principal */
font-cormorant /* Cormorant - acento decorativo mínimo */

/* Formas */
rounded-xl     /* Cards, botones */
rounded-2xl    /* Modales, secciones */
rounded-full   /* Badges, pills */
```

---

## Ubicación de Archivos

| Archivo                                             | Contenido                  |
| --------------------------------------------------- | -------------------------- |
| `src/components/landing/HeroSection.tsx`            | Hero, eslogan, badge, CTAs |
| `src/components/landing/FeaturesSection.tsx`        | Bento grid de features     |
| `src/components/landing/BenefitsSection.tsx`        | Métricas y beneficios      |
| `src/components/landing/CTASection.tsx`             | CTA final                  |
| `src/components/landing/ProblemSolutionSection.tsx` | Problema/Solución          |
| `src/config/business.ts`                            | Tagline, colores, branding |

---

## Vocabulario Técnico (Obligatorio)

Usar en contenido de autoridad clínica: dioptrías, cilindro, esfera, eje, distancia pupilar, índice de refracción, armazones, lentes oftálmicos, adición, presbicia, OD/OS.

---

## Mejoras Pendientes (2026-02-28)

| Prioridad | Archivo         | Acción                                   |
| --------- | --------------- | ---------------------------------------- |
| Alta      | HeroSection.tsx | Título → "Automatiza. Controla. Crece."  |
| Alta      | business.ts     | Colores → Epoch (#1A2B23, #C5A059, etc.) |
| Media     | business.ts     | Tagline → "Automatiza. Controla. Crece." |
