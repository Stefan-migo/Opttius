# Análisis del Sistema de Configuración — Devolución y Mejoras

**Fecha:** 2026-02-20  
**Objetivo:** Lograr un sistema de configuración de la más alta calidad, escalable y alineado con la lógica multi-tenant y por roles.

---

## 1. Estado Actual — Resumen

### Fortalezas

| Aspecto                       | Estado          | Detalle                                                                       |
| ----------------------------- | --------------- | ----------------------------------------------------------------------------- |
| **Arquitectura multi-tenant** | ✅ Implementada | `organization_id`, `branch_id` en `system_config`                             |
| **Merge de scope**            | ✅ Correcto     | Branch > Org > Global en lectura                                              |
| **API GET**                   | ✅ Funcional    | Super admin ve global; admin ve merge global+org+branch                       |
| **API PUT**                   | ✅ Funcional    | Super admin: global o branch; admin: org/branch                               |
| **UI Config**                 | ✅ Buena        | Filtros, categorías, scope selector, org info                                 |
| **Componentes**               | ✅ Completos    | Config, Email, Notificaciones, POS/Billing, Formularios, Salud, Mantenimiento |
| **Legacy fallback**           | ✅ Presente     | Soporta DB sin org_id/branch_id                                               |
| **Sensibilidad**              | ✅ Implementada | Toggle "Mostrar sensibles", service role para writes                          |

### Áreas de Mejora

| Prioridad | Aspecto                    | Descripción                                                 |
| --------- | -------------------------- | ----------------------------------------------------------- |
| ~~Alta~~  | ~~Super admin + branch~~   | ✅ Implementado: super_admin puede guardar por sucursal     |
| **Media** | POST crear config          | No soporta org_id/branch_id al crear                        |
| **Media** | Restricción de scope en UI | Selector "Sucursal actual" para super_admin no tiene efecto |
| **Baja**  | Validación Zod             | Falta validación por value_type en API                      |
| **Baja**  | Permisos por rol en UI     | No se oculta scope branch a admin sin sucursales            |
| **Baja**  | Documentación inline       | Algunos componentes sin JSDoc                               |

---

## 2. Análisis Detallado

### 2.1 Super Admin y Config por Sucursal ✅ CORREGIDO

**Requisito:** "El super admin puede guardar configuración en modo global (se guarda en todas las sucursales) así como también puede guardar configuración independiente por sucursal."

**Estado actual (2026-02-20):**  
Implementado en `src/app/api/admin/system/config/route.ts`:

- **Super admin + sin branch_id:** Escribe en scope global (org_id=null, branch_id=null).
- **Super admin + branch_id:** Valida que la sucursal pertenezca a su organización; si es válida, escribe en scope branch (org_id, branch_id).
- **GET:** Super admin con branch_id recibe merge global + org + branch (igual que admin).

### 2.2 Selector de Scope en UI

**Estado actual:**

- `configScope`: "global" | "branch"
- `configBranchId = configScope === "branch" ? currentBranchId : null`
- Para super_admin, el API ignora `branch_id` y siempre devuelve/actualiza global

**Efecto:**  
Si super_admin selecciona "Sucursal actual", la UI muestra el selector pero los datos y el guardado siguen siendo globales. Puede generar confusión.

**Recomendación:**

- Opción A: Ocultar selector de scope para super_admin cuando solo hay config global (y no se implementa branch para super_admin).
- Opción B: Implementar soporte branch para super_admin y que el selector tenga efecto real.

### 2.3 POST (Crear Config)

**Estado actual:**  
El endpoint POST no recibe `organization_id` ni `branch_id`. Inserta con valores por defecto (probablemente null).

**Recomendación:**  
Aceptar `organization_id` y `branch_id` opcionales en el body, validar que el usuario tenga permiso para ese scope, e insertar con esos valores.

### 2.4 Restricción por Rol

**Estado actual:**

- Sistema: visible para todos los admins (layout no filtra por rol en Sistema).
- Algunas acciones (ej. backups) pueden requerir super_admin; revisar políticas en APIs de mantenimiento.

**Recomendación:**  
Documentar qué pestañas/acciones requieren super_admin vs admin. Considerar ocultar o deshabilitar "Mantenimiento" avanzado (restore, etc.) para admin sin permiso.

### 2.5 FormOptionsConfig

**Estado actual:**  
Usa `product_option_fields` y `product_option_values`, no `system_config`. No tiene scope org/branch explícito en la UI.

**Recomendación:**  
Confirmar si las opciones de formularios son org-level (compartidas por sucursales) o branch-level. Si son branch-level, agregar selector de scope y filtrar por branch en la API.

### 2.6 NotificationSettings

**Estado actual:**  
Recibe `branchId`, `organizationId`, `configScope`. Usa API `/api/admin/notifications/settings` con query params. Bien integrado con el patrón global/branch.

### 2.7 POSBillingSettings

**Estado actual:**

- POS: `min_deposit_percent`, etc. (posiblemente org o branch).
- Billing: `branch_billing_settings` por sucursal.
- Super_admin con `isGlobalView` (sin branch) recibe toast "Debe seleccionar una sucursal" al intentar configurar. Correcto.

---

## 3. Plan de Mejoras Sugerido

### Fase 1 — Crítica (1–2 días)

1. ~~**Super admin + branch**~~ ✅ Completado (2026-02-20)

2. **UI scope para super_admin** ✅
   - El selector "Sucursal actual" envía `branch_id` vía `useSystemConfig({ branchId })` y el API ahora soporta branch para super_admin. El BranchSelector en el header permite elegir sucursal.

### Fase 2 — Importante (2–3 días)

3. **POST con scope**
   - Añadir `organization_id`, `branch_id` opcionales al body.
   - Validar permisos antes de insertar.
   - Mantener compatibilidad con llamadas sin scope (global para super_admin, org para admin).

4. **Validación Zod**
   - Definir schemas por `value_type` (string, number, boolean, json, array).
   - Validar `config_value` en PUT y POST antes de persistir.

5. **Permisos en Mantenimiento**
   - Revisar qué acciones requieren super_admin (ej. restore backup, security audit).
   - Documentar y aplicar restricciones en API y UI.

### Fase 3 — Mejoras (1–2 días)

6. **FormOptionsConfig scope**
   - Definir si es org o branch.
   - Si es branch: agregar selector y filtrar por branch en API.

7. **Documentación y tests**
   - JSDoc en hooks y componentes clave.
   - Tests unitarios para `mergeConfigsByScope` y para la API de config.

---

## 4. Checklist de Calidad

| Criterio                   | Estado                    |
| -------------------------- | ------------------------- |
| Multi-tenant correcto      | ✅                        |
| Roles respetados           | ✅                        |
| Código limpio              | ✅                        |
| Validación de inputs       | ⚠️ (falta Zod)            |
| UX clara de scope          | ⚠️ (super_admin confuso)  |
| Documentación              | ✅ (docs + skill creados) |
| Escalabilidad              | ✅                        |
| Seguridad (RLS, sensibles) | ✅                        |

---

## 5. Conclusión

El sistema de configuración tiene una base sólida: multi-tenant, merge de scope, componentes completos y buena separación de responsabilidades. La corrección implementada permite que **super_admin guarde configuración tanto global como por sucursal**, cumpliendo el requisito. Las mejoras pendientes (validación Zod, POST con scope, documentación de permisos) elevarán aún más la calidad del módulo.

**Documentación creada:**

- `docs/SYSTEM_CONFIGURATION.md` — Documentación detallada
- `.cursor/skills/system-configuration-optical-supabase/SKILL.md` — Skill para agentes
- Fuentes añadidas a NotebookLM para contexto del proyecto
