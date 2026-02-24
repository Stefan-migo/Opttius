# Auditoría de Identidad — Opttius

Registro del pivote de diseño: de Lujo Clásico/Vintage a Lujo Tecnológico y Precisión Clínica.

**Fecha de pivote:** 2026-02-22  
**Objetivo:** Proyectar una imagen SaaS moderna (estilo Stripe, Apple, Vercel) manteniendo la paleta Epoch como diferenciador.

---

## 1. Resumen del Pivote

El cliente decidió **pivotar** la identidad visual y narrativa de Opttius:

| Antes (Lujo Clásico/Vintage)             | Después (Lujo Tecnológico)                     |
| ---------------------------------------- | ---------------------------------------------- |
| Fuentes romanas (Cinzel, Playfair, Lato) | Sans-serif geométricas (Geist, Inter, DM Sans) |
| Arcos arquitectónicos (rounded-arch)     | Bordes sutiles (rounded-xl, rounded-2xl)       |
| Lenguaje poético/literario               | Pragmatismo startup + autoridad clínica        |
| "Forjar legado", "santuario", "maestría" | "Automatiza. Controla. Crece."                 |

---

## 2. Debilidades y Desalineaciones (Pre-Pivote)

### 2.1 Tipografía como Bloqueador

| Aspecto              | Problema                                       | Impacto                                     |
| -------------------- | ---------------------------------------------- | ------------------------------------------- |
| **Cinzel**           | Fuente serif con aspecto antiguo/medieval      | Bloqueaba la percepción de software moderno |
| **Playfair Display** | Cursivas literarias en títulos                 | Proyectaba imagen vintage, no SaaS          |
| **Lato**             | Sans-serif genérica, poco distintiva para tech | No transmitía "alta tecnología"             |

**Conclusión:** La tipografía antigua era un **bloqueador crítico** para proyectar una imagen SaaS moderna y de precisión clínica.

### 2.2 Formas como Bloqueador

| Aspecto          | Problema                       | Impacto                                  |
| ---------------- | ------------------------------ | ---------------------------------------- |
| **rounded-arch** | Arcos de 100px entre secciones | Estética arquitectónica, no minimalista  |
| **rounded-none** | Bordes rectos en todo          | Demasiado rígido para SaaS contemporáneo |

**Conclusión:** Los arcos arquitectónicos y bordes rectos impedían alinearse con referencias como Stripe, Apple y Vercel.

### 2.3 Copy como Bloqueador

| Términos eliminados   | Motivo                                      |
| --------------------- | ------------------------------------------- |
| Legado, forjar        | Lenguaje medieval, no pragmático            |
| Santuario, maestría   | Excesivamente literario                     |
| Pergamino, credencial | Confuso para usuarios                       |
| Llave de acceso       | Metáfora innecesaria; "Contraseña" es claro |

---

## 3. Prioridades de Implementación (Post-Pivote)

### Prioridad Alta

1. **Migrar tipografía** a Geist, Inter o DM Sans (sans-serif geométricas).
2. **Implementar nuevo copy** en landing:
   - Eslogan: "Automatiza. Controla. Crece."
   - Badge: "De la clínica al código. 100% nativo para ópticas."
   - Hero subtitle: "Desde el examen visual hasta la entrega del lente..."
3. **Reemplazar rounded-arch** por transiciones lineales o bordes sutiles (rounded-xl).
4. **Actualizar botones y cards** a rounded-xl o rounded-2xl.

### Prioridad Media

5. **Eliminar referencias** a Cinzel, Playfair, Lato en componentes.
6. **Mantener Cormorant Garamond** solo para acentos decorativos mínimos (una palabra en itálica).
7. **Sincronizar businessConfig** con paleta Epoch (eliminar legacy #AE0000).

### Prioridad Baja

8. **Revisar texturas** (carbon fibre) — evaluar si reducen o eliminar para mayor minimalismo.
9. **Validar espaciado** — asegurar p-8, p-12 en secciones clave.

---

## 4. Fortalezas Conservadas

| Elemento         | Decisión | Motivo                                          |
| ---------------- | -------- | ----------------------------------------------- |
| **Paleta Epoch** | Mantener | Diferenciador clave; verde/dorado/crema único   |
| **Narrativa**    | Refinar  | "Tecnólogo médico" + "100% nativo" — mantener   |
| **Bento grids**  | Mantener | Layout minimalista, compatible con nuevo estilo |
| **Imágenes**     | Mantener | Grayscale/hover coherente con estética limpia   |

---

## 5. Checklist de Migración

Para completar el pivote en código:

- [ ] Tipografía: Geist/Inter/DM Sans como font principal
- [ ] Eliminar Cinzel, Playfair, Lato de imports y tailwind
- [ ] Eslogan "Automatiza. Controla. Crece." en Hero
- [ ] Badge "De la clínica al código. 100% nativo para ópticas."
- [ ] Hero subtitle actualizado
- [ ] rounded-arch eliminado; usar rounded-xl/2xl
- [ ] Auth: "Email", "Contraseña" (no credencial, llave de acceso)
- [ ] businessConfig colores alineados con Epoch
- [ ] FRONTEND_IDENTITY.md actualizado
- [ ] Skills opttius-identity y frontend-design-modern actualizados

---

## 6. Conclusión

Este documento registra el **pivote exitoso** de la identidad de Opttius hacia un estilo **Software Médico de Alta Gama / Minimalista**. La tipografía antigua (Cinzel, Playfair, Lato) y las formas (arcos) fueron identificadas como bloqueadores para proyectar una imagen SaaS moderna. La paleta Epoch se conserva como activo diferenciador. La fuente de verdad actual es **IDENTITY.md**.
