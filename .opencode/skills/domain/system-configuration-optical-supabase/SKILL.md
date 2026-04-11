---
name: system-configuration-optical-supabase
description: Expert guide for building and maintaining the optical shop system configuration module with Supabase. Use when working on Sistema, configuración, system_config, admin settings, global vs branch config, multi-tenant settings, organization config, or optical shop system administration. Covers multi-tenant architecture, role-based scope (super_admin global, admin org/branch), and optical-specific configuration patterns.
---

# Sistema de Configuración para Ópticas con Supabase

Guía para desarrollar y mantener el módulo **Sistema** (configuración) de Opttius con código limpio, lógica sencilla y mejores prácticas.

## Cuándo Usar Este Skill

- Implementar o modificar la sección Sistema / Configuración
- Configuraciones globales vs por sucursal
- Parámetros de óptica (IVA, stock, horarios, contacto)
- Integración de system_config con otros módulos
- Permisos por rol (super_admin, admin) en configuración
- Plantillas de email, notificaciones, facturación

---

## 1. Arquitectura de Scope

### Jerarquía

```
Global (org_id=null, branch_id=null)  → Super admin, aplica a todas las orgs
Org (org_id=X, branch_id=null)        → Admin, aplica a todas las sucursales
Branch (org_id=X, branch_id=Y)        → Admin, aplica solo a sucursal Y
```

### Regla de Merge

Al leer: **Branch > Org > Global**. Si existe config en branch, se usa; si no, org; si no, global.

### Permisos por Rol

| Rol                   | Puede leer            | Puede escribir                     |
| --------------------- | --------------------- | ---------------------------------- |
| **super_admin**       | Global                | Global (_mejora: permitir branch_) |
| **admin**             | Global + Org + Branch | Org + Branch                       |
| **employee/vendedor** | Según RLS             | No                                 |

---

## 2. Modelo de Datos

### system_config

- `config_key`, `config_value` (JSONB), `category`, `value_type`
- `organization_id` (NULL = global), `branch_id` (NULL = org-level)
- `is_sensitive`, `is_public`, `last_modified_by`
- Índice único: `(config_key, COALESCE(organization_id::text,''), COALESCE(branch_id::text,''))`

### Categorías Óptica-Relevantes

- `general`, `contact`, `ecommerce`, `inventory`, `business`, `email`, `system`
- Evitar: `appointments`, `branches`, `telemetry` en la UI principal (gestión separada)

---

## 3. API y Hooks

### GET /api/admin/system/config

- Query: `category`, `public_only`, `branch_id` (o header `x-branch-id`)
- Super admin: solo global
- Admin: merge global + org + branch

### PUT /api/admin/system/config

- Body: `{ updates: [{ config_key, config_value }], branch_id? }`
- Super admin: siempre global
- Admin: org o branch según `branch_id`

### useSystemConfig({ branchId })

- `branchId` null → scope org/global
- `branchId` definido → scope branch

---

## 4. Buenas Prácticas

### 4.1 Código

- Validar `config_value` con Zod según `value_type`
- No loguear valores de configs `is_sensitive`
- Usar `createServiceRoleClient()` para operaciones con configs sensibles
- Soportar legacy schema (DB sin org_id/branch_id) con fallback

### 4.2 UX

- Mostrar "Sin guardar" cuando hay cambios locales
- Guardar por clave individual, no todo el formulario
- Selector de scope claro: "Todas las sucursales" vs "Sucursal actual"
- Ocultar configs sensibles por defecto (toggle "Mostrar sensibles")

### 4.3 Óptica-Específico

- `tax_rate`: típicamente 19 (Chile)
- RUT: validar formato en facturación
- `low_stock_threshold`: considerar por sucursal vía `product_branch_stock`
- `business_hours`: formato legible para horarios de atención

### 4.4 Seguridad

- RLS en `system_config` por organización
- Super admin: políticas que permiten global
- Auditoría: `last_modified_by`, `updated_at`

---

## 5. Componentes del Módulo

| Componente               | Responsabilidad                                 |
| ------------------------ | ----------------------------------------------- |
| **SystemConfig**         | CRUD de system_config, filtros, org info        |
| **FormOptionsConfig**    | Opciones de formularios (product_option_fields) |
| **NotificationSettings** | Tipos y prioridades de notificación             |
| **POSBillingSettings**   | POS + facturación por sucursal                  |
| **SystemHealth**         | Métricas de salud                               |
| **SystemMaintenance**    | Backups, auditoría, estado                      |

---

## 6. Integraciones

- **Tax:** `tax-config.ts` lee `tax_rate` de system_config
- **Organizaciones:** nombre, logo, slogan en `organizations`, no system_config
- **Resend:** `resend_api_key` en system_config
- **Telemetry:** `telemetry_enabled` (SaaS, root/dev)

---

## 7. Referencias

- Documentación: `docs/SYSTEM_CONFIGURATION.md`
- API: `src/app/api/admin/system/config/route.ts`
- Hook: `src/app/admin/system/hooks/useSystemConfig.ts`
- Migración multi-tenant: `20260216024133_add_multitenancy_to_system_config.sql`
