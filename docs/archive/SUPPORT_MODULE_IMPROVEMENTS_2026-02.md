# Módulo de Soporte - Mejoras Implementadas 2026-02

**Fecha:** 2026-02-20  
**Alcance:** Soporte B2B, B2C (Registro de Incidentes), diseño Epoch, documentación

---

## 1. Resumen Ejecutivo

Se implementaron mejoras en el módulo de soporte de Opttius: simplificación UX (eliminación del checkbox "Nota interna" en B2C), aplicación de la identidad visual Epoch en todas las páginas de soporte, documentación de rutas API legacy vs nuevas, y reordenamiento del roadmap priorizando adjuntos y notificaciones.

---

## 2. Modificaciones Implementadas

### 2.1 Eliminación del checkbox "Nota interna" (B2C)

**Problema:** En `/admin/support/tickets/[id]` el formulario de mensajes mostraba "Nota interna (solo visible para el equipo)". Como el B2C es registro interno entre usuarios de la misma óptica, todos los mensajes son internos por definición. El checkbox era redundante.

**Cambios realizados:**

| Archivo                                                            | Cambio                                                                                                                                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/admin/support/tickets/[id]/page.tsx`                      | Eliminado checkbox y label. `defaultValues` con `is_internal: true`. Eliminado badge "Nota Interna" en lista de mensajes. Estilo unificado para mensajes (todos internos). |
| `src/lib/api/validation/zod-schemas.ts`                            | `createOpticalInternalSupportMessageSchema`: `is_internal` con `default(true)`.                                                                                            |
| `src/app/api/admin/optical-support/tickets/[id]/messages/route.ts` | Insert: `is_internal: body.is_internal ?? true`.                                                                                                                           |

**Resultado:** Los mensajes B2C se crean siempre con `is_internal: true`. Formulario más simple.

---

### 2.2 Aplicación de identidad Epoch (B2C - Registro de Incidentes)

**Archivos modificados:** `src/app/admin/support/page.tsx`, `src/app/admin/support/tickets/[id]/page.tsx`

**Cambios aplicados:**

- Títulos: `font-display`, `text-epoch-primary`, `tracking-tight`
- Subtítulos/descripciones: `text-epoch-primary/80`
- Cards: `admin-card`, `rounded-none`
- Botones primarios: `rounded-none bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase`
- Botones outline: `rounded-none border-admin-border-primary/20`
- Inputs/SelectTrigger: `rounded-none focus:border-epoch-primary focus:ring-epoch-primary/20`
- Stats cards: iconos `text-epoch-accent`, texto `text-epoch-primary`
- Fondo: `bg-epoch-background`
- Loader: `text-epoch-primary`

---

### 2.3 Aplicación de identidad Epoch (B2B)

**Archivos modificados:**

- `src/app/support/page.tsx` (portal público)
- `src/app/admin/saas-management/support/page.tsx` (panel root)
- `src/app/admin/saas-management/support/tickets/[id]/page.tsx` (no modificado en esta iteración; ya usa estilos propios)

**Cambios:** Misma lógica que B2C. Portal público y panel root ahora usan paleta Epoch, `rounded-none`, `admin-card`, `font-display`.

---

### 2.4 Documentación de rutas API

**Archivo:** `docs/SUPPORT_SYSTEM.md`

**Nueva sección "Rutas API - Mapa de Tablas y Uso":**

| Sistema                       | Tabla DB                           | Rutas API                                                | Estado                     |
| ----------------------------- | ---------------------------------- | -------------------------------------------------------- | -------------------------- |
| **Legacy**                    | `support_tickets`                  | `/api/admin/support/*`                                   | Deprecar - Redirigir a B2C |
| **B2B (SaaS)**                | `saas_support_tickets`             | `/api/support/*`, `/api/admin/saas-management/support/*` | Activo                     |
| **B2C (Registro Incidentes)** | `optical_internal_support_tickets` | `/api/admin/optical-support/*`                           | Activo                     |

**Nota:** `/admin/support/tickets/new` usa legacy. Debe redirigirse a `/admin/support`.

---

### 2.5 Roadmap actualizado

**Prioridades (orden sugerido):**

1. Adjuntos (fotos, documentos) en tickets
2. Notificaciones cuando ticket asignado o resuelto
3. Exportar reportes de incidentes por categoría/período
4. Plantillas de resolución reutilizables
5. Deprecar/redirigir `/admin/support/tickets/new` a `/admin/support`
6. Insights con IA (postergar)

---

## 3. Pendiente (No implementado)

| Ítem                     | Descripción                                                  |
| ------------------------ | ------------------------------------------------------------ |
| Adjuntos                 | Fotos y documentos en tickets (metadata JSONB existe, UI no) |
| Notificaciones           | Alertas cuando ticket asignado o resuelto                    |
| Exportar reportes        | Por categoría y período                                      |
| Plantillas de resolución | Reutilizables                                                |
| Redirección legacy       | `/admin/support/tickets/new` → `/admin/support`              |
| Insights IA              | Análisis de patrones de resolución                           |

---

## 4. Rutas de UI afectadas

| Ruta                             | Cambios                                 |
| -------------------------------- | --------------------------------------- |
| `/admin/support`                 | Epoch, rounded-none, admin-card         |
| `/admin/support/tickets/[id]`    | Epoch, checkbox eliminado, rounded-none |
| `/support`                       | Epoch (portal público B2B)              |
| `/admin/saas-management/support` | Epoch (panel root B2B)                  |

---

## 5. Referencias

- Documentación completa: `docs/SUPPORT_SYSTEM.md`
- Checklist de pruebas: `docs/SUPPORT_SYSTEM_TEST_CHECKLIST.md`
- Skill: `.cursor/skills/support-optical-supabase/SKILL.md`
