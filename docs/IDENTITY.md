# Identidad de Marca — Opttius

Documento base de la identidad del sistema. Fuente de verdad para copy, diseño y marketing.

**Última actualización:** 2026-02-22 — Pivote a Lujo Tecnológico y Precisión Clínica.

---

## 1. Resumen Ejecutivo

**Opttius** es el motor inteligente para ópticas modernas. Creado por un tecnólogo médico (profesional de salud y oftalmología), está diseñado desde cero para el sector óptico — no es una adaptación de un CRM genérico. Su arquetipo combina **autoridad clínica** con el **pragmatismo y velocidad de una startup de Silicon Valley**. No vendemos "software"; vendemos el sistema que automatiza, controla y hace crecer tu óptica.

---

## 2. Arquetipo

### Definición

| Dimensión         | Descripción                                                                    |
| ----------------- | ------------------------------------------------------------------------------ |
| **Tipo**          | Software médico de alta gama / Minimalismo SaaS                                |
| **Estética**      | Lujo tecnológico, precisión clínica, espacios limpios, tipografías geométricas |
| **Valores**       | Automatización, control, crecimiento, precisión técnica                        |
| **Audiencia**     | Ópticas y profesionales de la visión que buscan eficiencia                     |
| **Diferenciador** | De la clínica al código. 100% nativo para ópticas.                             |

### Inspiración Visual

- **Referencias:** Stripe, Apple, Vercel — minimalismo SaaS, alta tecnología
- **No:** Estilo vintage, fuentes romanas, arcos arquitectónicos, lenguaje poético

---

## 3. Narrativa y Copy

### Eslogan Principal

> **Automatiza. Controla. Crece.**

### Badge / Micro-copy

> De la clínica al código. 100% nativo para ópticas.

### Hero Subtitle

> Desde el examen visual hasta la entrega del lente. Centraliza tus recetas, inventario, flujos de laboratorio y ventas en una única plataforma.

### Tono de Voz

- **Autoridad clínica:** Creado por un tecnólogo médico que conoce el día a día de una óptica.
- **Pragmatismo startup:** Beneficios concretos, velocidad, eficiencia. Sin metáforas literarias.
- **Precisión técnica:** Vocabulario óptico cuando corresponda (recetas, OD/OS, prescripciones, laboratorio).

### Palabras Clave (usar)

| Categoría       | Ejemplos                                                       |
| --------------- | -------------------------------------------------------------- |
| Acción          | Automatiza, controla, crece, centraliza, optimiza              |
| Origen          | Tecnólogo médico, de la clínica al código, 100% nativo         |
| Especialización | Exclusivo para ópticas, diseñado para ópticas                  |
| Funcionalidad   | Recetas, inventario, laboratorio, ventas, presupuestos, agenda |
| Calidad         | Precisión, eficiencia, datos clínicos, última generación       |

### Palabras Prohibidas (eliminar por completo)

- Legado, forjar, santuario, maestría, pergamino, credencial, llave de acceso
- Cualquier término medieval o excesivamente literario

### Palabras a Evitar

- Genéricos de SaaS: "revolucionario", "disruptivo", "game-changer"
- Promesas vagas sin sustento técnico

### CTAs Principales

- **Primario:** "Probar Gratis", "Comenzar ahora", "Empezar Ahora"
- **Secundario:** "Ver demo en vivo", "Solicitar demo"
- **Auth:** "Iniciar sesión", "Registrarse", "Crear cuenta", "Email", "Contraseña"

---

## 4. Sistema Visual (Epoch)

### Paleta de Colores (intacta)

| Token            | Hex               | Uso                                                        |
| ---------------- | ----------------- | ---------------------------------------------------------- |
| epoch-primary    | #1A2B23 / #2C3E33 | Verde profundo. Títulos, fondos oscuros, botones primarios |
| epoch-accent     | #C5A059 / #C4B28C | Dorado. Acentos, CTAs, highlights                          |
| epoch-surface    | #1A1A1A           | Charcoal. Fondos oscuros, header scroll                    |
| epoch-background | #F9F7F2 / #EAE8DD | Crema. Fondos claros, cards                                |

La paleta Epoch es un **diferenciador clave** — se mantiene intacta.

---

## 5. Sistema Tipográfico (Minimalismo SaaS)

### Fuentes Principales

| Familia                             | Variable CSS  | Uso                                                       |
| ----------------------------------- | ------------- | --------------------------------------------------------- |
| **Geist** / **Inter** / **DM Sans** | `--font-sans` | Display y body. Sans-serif geométricas, modernas, limpias |

**Eliminadas:** Cinzel, Playfair Display, Lato — daban aspecto antiguo.

### Fuente de Acento (uso mínimo)

| Familia                | Variable CSS       | Uso                                                                                                     |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| **Cormorant Garamond** | `--font-cormorant` | EXCLUSIVAMENTE para itálicas decorativas sutiles (ej: una palabra clave en un título). No para lectura. |

### Jerarquía

- **Títulos:** font-sans, bold, tracking ajustado
- **Body:** font-sans, regular/medium
- **Acento decorativo:** font-cormorant italic, solo donde aporte valor visual

---

## 6. Formas y Layout (Estilo Apple/Stripe)

### Bordes

- **Cards y modales:** `rounded-xl` o `rounded-2xl` (sutiles y modernos)
- **Botones:** `rounded-xl` para coherencia
- **Badges:** `rounded-full` para pills de estado

**Eliminado:** `rounded-arch` (100px) — arcos arquitectónicos. Ya no se usan.

### Espaciado

- **Espacio negativo generoso:** `p-8`, `p-12` en secciones
- Interfaz limpia, sin ruido visual
- Bento grids minimalistas (4 columnas en desktop)

### Imágenes

- Estilo: Sobrio, profesional, óptica/visión
- Tratamiento: Grayscale por defecto, color al hover cuando aplique
- Evitar: Stock genérico de negocios, caras sonrientes exageradas

---

## 7. Estructura de la Landing

### Secciones

1. **Hero:** Eslogan "Automatiza. Controla. Crece." + subtitle + CTA principal
2. **Problema / Solución:** Contraste entre gestión manual y automatización
3. **Características:** Bento grid minimalista con features concretas
4. **Beneficios:** Métricas y resultados
5. **Precios:** Planes claros, trial destacado
6. **CTA final:** Refuerzo de acción

### Navegación y Footer

- Inicio, Características, Beneficios, Precios, Nosotros
- Labels claros: Navegación, Legal, Contacto (sin términos literarios)

---

## 8. Páginas de Auth (Login / Signup)

- Mantener paleta Epoch
- Copy directo: "Email", "Contraseña" (no "Credencial", "Llave de Acceso")
- Mensajes de éxito: "correo de confirmación" (no "pergamino digital")
- CTAs: "Iniciar sesión", "Registrarse", "Crear cuenta"

---

## 9. Consistencia con Admin

El panel de administración debe compartir:

- Paleta Epoch
- Tipografía sans-serif geométrica
- Estética minimalista y profesional
- Sin rupturas visuales entre landing y app

---

## 10. Checklist de Revisión

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

## 11. Changelog

- **2026-02-22:** Pivote a Lujo Tecnológico y Precisión Clínica. Nuevo eslogan "Automatiza. Controla. Crece.". Eliminación de Cinzel, Playfair, Lato; adopción de Geist/Inter/DM Sans. Eliminación de rounded-arch; adopción de rounded-xl/2xl. Paleta Epoch intacta.
- **2026-02-18:** Creación inicial. Reemplazo Malisha por Cormorant Garamond. Copy orientado a conversión.
