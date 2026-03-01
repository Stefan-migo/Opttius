# Estrategia de Marketing, Narrativa e Identidad de Marca — Opttius

**Versión:** 1.1  
**Fecha:** 2026-02-28  
**Base:** Documento maestro para estrategia de marketing, narrativa e identidad. Complementa [IDENTITY.md](../IDENTITY.md) y [FRONTEND_IDENTITY.md](../FRONTEND_IDENTITY.md).

---

## 1. Resumen Ejecutivo

### Objetivo

Definir una estrategia de marketing, narrativa e identidad de marca de alta gama para Opttius, escalable, coherente con el sistema y alineada con el arquetipo **Lujo Tecnológico y Precisión Clínica** (pivote 2026-02-22).

### Alcance

- **Marketing:** Canales, fórmulas de copy, segmentación, escalabilidad.
- **Narrativa:** Pilares, tono de voz, storytelling.
- **Identidad:** Sistema Epoch, checklist de consistencia, implementación técnica.

### Relación con Documentos

| Documento                                               | Rol                                        |
| ------------------------------------------------------- | ------------------------------------------ |
| [IDENTITY.md](../IDENTITY.md)                           | Fuente de verdad para copy, diseño y marca |
| [FRONTEND_IDENTITY.md](../FRONTEND_IDENTITY.md)         | Especificación técnica del sistema visual  |
| [COPY_IMPROVEMENT_PLAN.md](../COPY_IMPROVEMENT_PLAN.md) | Fórmula por sección (Hero, Features, etc.) |

---

## 2. Estrategia de Marketing

### 2.1 Canales Principales

| Canal            | Prioridad | Uso                                                       |
| ---------------- | --------- | --------------------------------------------------------- |
| **Landing Page** | Principal | Reducir fricción, conversión, posicionamiento             |
| **Email**        | Alta      | Bienvenida, recordatorios de citas, alertas de inventario |
| **WhatsApp**     | Alta      | Soporte B2C, recordatorios, conversaciones con IA         |
| **Contenido**    | Media     | Blog, guías, casos de uso                                 |

### 2.2 Fórmula por Sección (Landing)

| Sección              | Estructura                                          |
| -------------------- | --------------------------------------------------- |
| **Hero**             | Problema implícito + Propuesta + Origen + CTA claro |
| **Problem/Solution** | Problemas identificables + Soluciones concretas     |
| **Features**         | Badge origen + Herramientas que resuelven           |
| **Benefits**         | Resultados medibles + Métricas                      |
| **CTA**              | Beneficio + Reducción de fricción                   |
| **Footer**           | Descripción clara + Labels estándar                 |

### 2.3 Segmentación por Madurez

- **Nuevas ópticas:** Mensaje de bienvenida, onboarding guiado, soporte especializado.
- **Ópticas establecidas:** Insights avanzados, multi-sucursal, automatización con IA.

### 2.4 Escalabilidad

- **Multi-sucursal:** Promover la capacidad de gestionar inventarios y ventas independientes por sucursal.
- **IA:** Automatización de insights, análisis de tendencias, resúmenes diarios.
- **Fidelización B2B:** Soporte robusto, registro de incidentes, análisis de patrones.

### 2.5 Matriz Problema-Solución

Mapeo entre funcionalidad técnica, dolor del usuario y solución narrativa. Usar para copy, landing y contenido.

| Funcionalidad Técnica                                       | Dolor del Usuario                                       | Solución Narrativa                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| Multi-tenant database + branch scoping                      | "No sé cuánto vendo en la sucursal Norte"               | Control centralizado en tiempo real por sucursal                           |
| Historial digital de recetas (OD/OS, esfera, cilindro, eje) | "Pierdo recetas en papel o las transcribo mal"          | Historial clínico digital, sin errores de transcripción                    |
| product_branch_stock + alertas bajo stock                   | "Mi inventario nunca cuadra con mi caja"                | Stock por sucursal sincronizado con ventas                                 |
| Órdenes de laboratorio verificadas (Cash-First)             | "Envío trabajos al taller sin depósito y pierdo dinero" | Órdenes liberadas solo con depósito mínimo                                 |
| Agenda + slots configurables                                | "Pierdo citas o tengo huecos sin explicación"           | Agenda centralizada con disponibilidad en tiempo real                      |
| Presupuestos con matrices de lentes                         | "Tardo horas en armar un presupuesto de presbicia"      | Presupuestos en minutos con adición lejana/cercana                         |
| IA + insights por madurez                                   | "No sé qué vender ni cuándo reponer"                    | Insights adaptados a tu nivel: desde bienvenida hasta analista estratégico |
| Integración WhatsApp + recordatorios                        | "Los pacientes no vienen a retirar sus lentes"          | Recordatorios automáticos, menos lentes abandonados                        |

---

## 3. Narrativa y Storytelling

### 3.1 Pilares

1. **Tecnólogo médico:** Creado por profesional de oftalmología que conoce el día a día.
2. **Exclusivo para ópticas:** No es adaptación de CRM genérico; diseñado desde cero.
3. **Problemas reales:** Recetas perdidas, tiempo administrativo, errores en laboratorio.
4. **Soluciones concretas:** Historial digital, IA que automatiza, órdenes verificadas.
5. **CTAs accionables:** "Probar Gratis", "Comenzar prueba gratis", "Ver demo en vivo".

### 3.2 Tono de Voz

- **Autoridad clínica:** Tecnólogo médico, precisión oftalmológica.
- **Pragmatismo startup:** Beneficios concretos, velocidad, eficiencia.
- **Sin metáforas literarias:** Eliminar legado, forjar, santuario, maestría, pergamino, credencial, llave de acceso.

### 3.3 Palabras Clave (usar)

| Categoría       | Ejemplos                                                       |
| --------------- | -------------------------------------------------------------- |
| Acción          | Automatiza, controla, crece, centraliza, optimiza              |
| Origen          | Tecnólogo médico, de la clínica al código, 100% nativo         |
| Especialización | Exclusivo para ópticas, diseñado para ópticas                  |
| Funcionalidad   | Recetas, inventario, laboratorio, ventas, presupuestos, agenda |
| Calidad         | Precisión, eficiencia, datos clínicos, última generación       |

### 3.4 Palabras Prohibidas

- Legado, forjar, santuario, maestría, pergamino, credencial, llave de acceso.
- Cualquier término medieval o excesivamente literario.

### 3.5 Palabras a Evitar

- Genéricos de SaaS: "revolucionario", "disruptivo", "game-changer".
- Promesas vagas sin sustento técnico.

### 3.6 Pilares de Contenido Estratégico (SEO y Autoridad Clínica)

Cinco pilares de contenido que demuestran autoridad clínica y resuelven dolores reales. No temas genéricos; cada uno aborda un problema concreto del sector óptico.

| Pilar                               | Tema                                                                                           | Dolor que Resuelve                                                              | Formato Sugerido                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| **1. Inventario y Mermas**          | Mermas por inventario fantasma: cómo detectar y corregir desfases entre stock físico y sistema | "Mi inventario nunca cuadra"; pérdidas por robo interno o errores de registro   | Guía técnica + checklist                |
| **2. Precisión en Laboratorio**     | Errores de refracción en el traspaso a laboratorio: esfera, cilindro, eje, distancia pupilar   | Errores en órdenes que generan devoluciones y pérdida de confianza del paciente | Caso de estudio + flujo de verificación |
| **3. Retención y Presbicia**        | Retención de pacientes con presbicia: adición lejana/cercana, bifocales, progresivos           | Abandono de pacientes presbíopes por presupuestos confusos o lentos             | Guía de conversión + matriz de precios  |
| **4. Rentabilidad de Tratamientos** | Rentabilidad de tratamientos antirreflejo, fotocromáticos y blue light                         | No saber qué tratamientos aportan margen real vs. costo de laboratorio          | Análisis de márgenes + comparativa      |
| **5. Multi-sucursal y Caja**        | Control de caja y ventas por sucursal sin duplicar esfuerzo administrativo                     | "No sé cuánto vende cada sucursal"; cierres de caja manuales y errores          | Guía operativa + métricas clave         |

**Vocabulario técnico obligatorio en contenido:** Dioptrías, cilindro, esfera, eje, distancia pupilar, índice de refracción, armazones, lentes oftálmicos, adición, presbicia.

### 3.7 Prueba Social (Testimonios y Casos de Éxito)

Directrices para presentar testimonios y casos de éxito sin romper la estética minimalista (Lujo Tecnológico).

**Principios:**

- **Datos duros primero:** Métricas concretas (ej: "Redujo errores de laboratorio en 40%", "Ahorra 3 horas semanales en presupuestos").
- **Foto profesional:** Retrato sobrio, fondo neutro o ambiente de óptica; no selfies ni fondos informales.
- **Citas breves y específicas:** Máximo 2 líneas. Evitar frases vagas ("Excelente producto", "Lo recomiendo").
- **Formato card:** `rounded-xl`, paleta Epoch, tipografía sans-serif. Sin bordes decorativos ni elementos vintage.

**Estructura recomendada para testimonial:**

```
[Métrica destacada en negrita]
[Cita breve y específica — 1-2 líneas]
[Nombre, cargo, óptica]
[Foto profesional]
```

**Casos de éxito:** Mismo criterio. Incluir: problema inicial (cuantificado), solución implementada, resultado (número o %). Máximo 150 palabras por caso.

---

## 4. Identidad de Marca

### 4.1 Sistema Epoch

| Token            | Hex               | Uso                                                        |
| ---------------- | ----------------- | ---------------------------------------------------------- |
| epoch-primary    | #1A2B23 / #2C3E33 | Verde profundo. Títulos, fondos oscuros, botones primarios |
| epoch-accent     | #C5A059 / #C4B28C | Dorado. Acentos, CTAs, highlights                          |
| epoch-surface    | #1A1A1A           | Charcoal. Fondos oscuros, header scroll                    |
| epoch-background | #F9F7F2 / #EAE8DD | Crema. Fondos claros, cards                                |

### 4.2 Tipografía

- **Principal:** Geist, Inter o DM Sans (sans-serif geométricas).
- **Acento decorativo (mínimo):** Cormorant Garamond solo para itálicas sutiles.

### 4.3 Formas

- **Cards y modales:** `rounded-xl` o `rounded-2xl` (sutiles y modernos).
- **Botones:** `rounded-xl`.
- **Badges:** `rounded-full` para pills.

### 4.4 Checklist de Consistencia

Antes de publicar cambios de copy o diseño:

- [ ] ¿El copy evita por completo legado, forjar, santuario, maestría, pergamino, credencial, llave de acceso?
- [ ] ¿El eslogan "Automatiza. Controla. Crece." está presente donde aplica?
- [ ] ¿El badge "De la clínica al código. 100% nativo para ópticas." está visible?
- [ ] ¿Se usa tipografía sans-serif geométrica (Geist/Inter/DM Sans)?
- [ ] ¿Las formas usan rounded-xl/2xl (no rounded-arch ni rounded-none)?
- [ ] ¿El espacio negativo es generoso (p-8, p-12)?
- [ ] ¿La paleta Epoch se mantiene intacta?
- [ ] ¿Los CTAs son claros y accionables?

---

## 5. Implementación Técnica

### 5.1 Ubicación de Copy

| Ubicación                          | Contenido                                                       |
| ---------------------------------- | --------------------------------------------------------------- |
| `src/components/landing/`          | HeroSection, FeaturesSection, BenefitsSection, CTASection, etc. |
| `src/config/business.ts`           | Branding, tagline, colores, features                            |
| `src/app/(auth)/login/`, `signup/` | Labels de auth                                                  |

### 5.2 Variables de Negocio

- `businessConfig.name`, `displayName`, `tagline`
- `businessConfig.colors` (alinear con Epoch)
- `businessConfig.admin.title`, `subtitle`

### 5.3 Tokens de Diseño (Tailwind)

```css
bg-epoch-primary  text-epoch-primary  border-epoch-primary
bg-epoch-accent   text-epoch-accent   border-epoch-accent
bg-epoch-surface  bg-epoch-background
font-sans     /* Geist/Inter/DM Sans */
font-cormorant /* Acento decorativo mínimo */
```

---

## 6. Mejoras Detectadas

Lista priorizada de mejoras identificadas durante el análisis (2026-02-28):

| Prioridad | Mejora                             | Archivo                                  | Acción                                                 |
| --------- | ---------------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| **Alta**  | Hero title no usa eslogan oficial  | `src/components/landing/HeroSection.tsx` | Cambiar título a "Automatiza. Controla. Crece."        |
| **Alta**  | Colores legacy en businessConfig   | `src/config/business.ts`                 | Reemplazar por tokens Epoch (#1A2B23, #C5A059, etc.)   |
| **Media** | Tagline desactualizado             | `src/config/business.ts`                 | Actualizar a "Automatiza. Controla. Crece." o variante |
| **Media** | Fuentes NotebookLM desactualizadas | NotebookLM Cerebro                       | Sincronizar IDENTITY.md, FRONTEND_IDENTITY.md          |
| **Baja**  | Textura carbon-fibre en Hero       | `src/components/landing/HeroSection.tsx` | Evaluar si mantener para minimalismo                   |

---

## 7. Referencias

- [IDENTITY.md](../IDENTITY.md) — Fuente de verdad identidad
- [FRONTEND_IDENTITY.md](../FRONTEND_IDENTITY.md) — Especificación visual
- [IDENTITY_AUDIT.md](../IDENTITY_AUDIT.md) — Registro del pivote
- [COPY_IMPROVEMENT_PLAN.md](../COPY_IMPROVEMENT_PLAN.md) — Fórmula por sección
- [SEO_AIO_DISCOVERY_STRATEGY.md](./SEO_AIO_DISCOVERY_STRATEGY.md) — Estrategia SEO + AIO
- [.cursor/skills/opttius-identity/SKILL.md](../../.cursor/skills/opttius-identity/SKILL.md) — Skill identidad
- [.cursor/skills/frontend-design-modern/SKILL.md](../../.cursor/skills/frontend-design-modern/SKILL.md) — Skill frontend
- [.cursor/skills/marketing-identity-optical/SKILL.md](../../.cursor/skills/marketing-identity-optical/SKILL.md) — Skill marketing e identidad
- [.cursor/skills/seo-aio-optical-discovery/SKILL.md](../../.cursor/skills/seo-aio-optical-discovery/SKILL.md) — Skill SEO + AIO
