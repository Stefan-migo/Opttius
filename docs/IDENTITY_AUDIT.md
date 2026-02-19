# Auditoría de Identidad — Opttius

Análisis del estado actual de la identidad del sistema frente al arquetipo objetivo y recomendaciones de mejora.

**Fecha**: 2026-02-18  
**Objetivo**: Lograr una identidad de la más alta calidad, escalable y coherente en todo el sistema.

---

## 1. Resumen Ejecutivo

La identidad actual tiene **bases sólidas** (estética Epoch, tipografía, paleta) pero presenta **inconsistencias** entre componentes y **desalineación** con la narrativa objetivo (tecnólogo médico, exclusivo para ópticas, pragmatismo). La sección de precios y la configuración de negocio no siguen la lógica Epoch. Se recomienda una serie de ajustes para elevar la identidad a estándar de alta gama.

---

## 2. Fortalezas Actuales

### 2.1 Estética Visual (Landing Principal)

- **Paleta Epoch** bien aplicada en Hero, Features, Benefits, CTA, Footer
- **Tipografía** coherente: Cinzel (display), Playfair (serif), Lato (body)
- **Formas** distintivas: arcos, bento grid, bordes rectos
- **Imágenes** con tratamiento grayscale y overlays coherentes
- **Espaciado** generoso y legible

### 2.2 Copy de Hero y Features

- "Excelencia en Gestión Óptica" — alineado
- "Software de Legado para la Óptica Moderna" — tono elegante
- "Transforme la gestión de su óptica con una herramienta que fusiona la precisión técnica con la elegancia" — bien balanceado
- Features con descripciones concretas (Gestión de Pacientes IA, POS, etc.)

### 2.3 Páginas de Auth (Login / Signup)

- Estética Epoch coherente
- Copy distintivo ("Credencial", "Llave de Acceso", "Sincronizar Acceso")
- Layout split con branding visual

### 2.4 CRM y Documentación

- CRM_SYSTEM.md bien estructurado
- Óptica-first: recetas, prescripciones, citas, presupuestos

---

## 3. Debilidades y Desalineaciones

### 3.1 Narrativa Ausente

| Aspecto                     | Estado                                | Recomendación                                                                            |
| --------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Origen tecnólogo médico** | No aparece en ninguna sección         | Añadir en Hero o About: "Creado por un tecnólogo médico con experiencia en oftalmología" |
| **Exclusivo para ópticas**  | Implícito en "Gestión Óptica"         | Hacer explícito: "No es una adaptación. Diseñado para ópticas, desde cero."              |
| **Pragmatismo**             | Mezclado con mucho lenguaje literario | Reducir "legado", "forjar", "orden", "santuario" en favor de beneficios concretos        |

### 3.2 Inconsistencias de Configuración

**`businessConfig`** (`src/config/business.ts`):

- `tagline`: "Sistema de Gestión Óptica" — genérico
- `colors.primary`: `#AE0000` (rojo) — **no coincide con Epoch** (verde/dorado)
- `colors.secondary`, `accent`: Paleta distinta a Epoch
- **Acción**: Sincronizar con colores Epoch o documentar que businessConfig es para admin/legacy

### 3.3 Sección de Precios (PricingSection)

- Usa `bg-[var(--admin-bg-primary)]`, `font-cormorant` (antes font-malisha), `text-gray-900`, `text-primary`, `rounded-[3rem]`
- **No usa** paleta Epoch ni tipografía Epoch
- **Resultado**: Ruptura visual respecto al resto de la landing
- **Acción**: Migrar a estética Epoch (epoch-background, font-display, font-serif, colores epoch)

### 3.4 Footer — Labels Confusos

| Actual       | Problema               | Sugerencia                                        |
| ------------ | ---------------------- | ------------------------------------------------- |
| Exploración  | Poco claro             | "Navegación" o mantener si se valida con usuarios |
| Manuscritos  | Muy literario, confuso | "Legal"                                           |
| Corresponsal | Muy literario, confuso | "Contacto"                                        |
| Despacho     | Inusual para email     | "Email"                                           |
| Audiencias   | Inusual para teléfono  | "Teléfono"                                        |

### 3.5 Copy Excesivamente Literario

Ejemplos que pueden confundir o restar pragmatismo:

- **Login**: "Ingrese al santuario de la gestión óptica" — "santuario" puede sonar pretencioso
- **Signup éxito**: "pergamino digital" — preferir "correo de confirmación"
- **Signup**: "Términos de Élite", "Soberanía de Datos" — "Términos de Privacidad" más estándar
- **Footer**: "CREADO PARA EL EXIGENTE" — bien si se mantiene el tono; revisar si no genera fricción

### 3.6 Tailwind vs CSS Variables

- `tailwind.config.ts` define `epoch.primary: "#2C3E33"` y `epoch.accent: "#C4B28C"`
- `globals.css` usa `--primary: #1A2B23` y `--accent: #C5A059`
- **Inconsistencia menor** entre tokens; unificar para evitar desvíos en futuros componentes

---

## 4. Recomendaciones Prioritarias

### Prioridad Alta

1. **Añadir narrativa de origen** en Hero o sección dedicada:
   - "Creado por un tecnólogo médico. Exclusivo para ópticas."
2. **Unificar PricingSection** con estética Epoch (colores, tipografía, bordes).
3. **Sincronizar businessConfig** con paleta Epoch o documentar su uso.
4. **Revisar labels del footer** (Manuscritos → Legal, Corresponsal → Contacto).

### Prioridad Media

5. **Moderar copy literario** en auth (santuario → espacio profesional; pergamino → correo).
6. **Unificar tokens** epoch entre tailwind y globals.css.
7. **Añadir sección "Por qué Opttius"** o "Nuestra historia" con narrativa de tecnólogo médico.

### Prioridad Baja

8. **Validar con usuarios** términos como "Exploración", "CREADO PARA EL EXIGENTE".
9. **A/B test** de copy más pragmático vs. actual en CTAs.

---

## 5. Checklist de Implementación

Para elevar la identidad a estándar de alta gama:

- [ ] Narrativa de tecnólogo médico visible en landing
- [ ] PricingSection con estética Epoch
- [ ] businessConfig alineado con Epoch
- [ ] Footer con labels claros (Legal, Contacto)
- [ ] Copy de auth moderado (sin "santuario", "pergamino")
- [ ] Tokens Epoch unificados en tailwind y globals
- [ ] Documentación de identidad (IDENTITY.md) como referencia
- [ ] Skill opttius-identity para guiar futuros agentes

---

## 6. Changelog

- **2026-02-18**: Reemplazo de Malisha por Cormorant Garamond (font-cormorant) en PricingSection, TestimonialsSection, admin/notifications.
- **2026-02-18**: Fase 2 — Copy orientado a conversión. Hero, Problem/Solution, CTA, Benefits, Features, Footer, Auth y Pricing actualizados. Narrativa tecnólogo médico y exclusivo para ópticas como pilares. CTAs claros ("Probar Gratis", "Comenzar prueba gratis"). Labels footer (Navegación, Legal, Contacto).

## 7. Conclusión

La identidad actual tiene **potencial de alta gama** y una base visual sólida. Las mejoras principales son: **clarificar la narrativa** (origen, especialización), **unificar la estética** (PricingSection, businessConfig) y **equilibrar el copy** (menos literario donde opaque la funcionalidad). Con estos ajustes, Opttius puede alcanzar una identidad coherente, escalable y de la más alta calidad.
