# Sistema de Configuración — Opttius

**Última actualización:** 2026-02-20  
**Versión:** 1.0  
**Base documental para el módulo Sistema**

---

## 1. Resumen Ejecutivo

El módulo **Sistema** (Administración del Sistema) es el centro de configuración de la aplicación Opttius. Permite gestionar parámetros globales y por sucursal, siguiendo una arquitectura multi-tenant con control por roles.

### Alcance del Módulo

| Sección                | Descripción                                                  | Scope                 |
| ---------------------- | ------------------------------------------------------------ | --------------------- |
| **Configuración**      | Parámetros generales (contacto, ecommerce, inventario, etc.) | Global / Org / Branch |
| **Información Óptica** | Nombre, logo, slogan (organización)                          | Org                   |
| **Email**              | Plantillas de correo                                         | Org                   |
| **Notificaciones**     | Tipos de notificación y prioridades                          | Org / Branch          |
| **Boletas y Facturas** | Configuración POS y facturación por sucursal                 | Branch                |
| **Formularios**        | Opciones de productos, clientes, citas, presupuestos, POS    | Org                   |
| **Salud**              | Métricas del sistema                                         | Global                |
| **Mantenimiento**      | Backups, auditoría, estado del sistema                       | Org / Branch          |

---

## 2. Arquitectura Multi-Tenant y Roles

### 2.1 Jerarquía de Scope

```
Global (org_id=null, branch_id=null)
    └── Aplica a TODAS las organizaciones (solo super_admin/root)

Org (org_id=X, branch_id=null)
    └── Aplica a TODAS las sucursales de la organización

Branch (org_id=X, branch_id=Y)
    └── Aplica solo a la sucursal Y
```

### 2.2 Regla de Resolución (Merge)

Al leer configuración, se aplica la prioridad: **Branch > Org > Global**.

```typescript
// mergeConfigsByScope: branch (3) > org (2) > global (1)
// Si existe config en branch, se usa; si no, org; si no, global.
```

### 2.3 Permisos por Rol

| Rol                   | Config Global     | Config Org        | Config Branch                            |
| --------------------- | ----------------- | ----------------- | ---------------------------------------- |
| **root/dev**          | Lectura/Escritura | —                 | —                                        |
| **super_admin**       | Lectura/Escritura | —                 | Lectura/Escritura (sucursales de su org) |
| **admin**             | Lectura (hereda)  | Lectura/Escritura | Lectura/Escritura                        |
| **employee/vendedor** | —                 | —                 | Solo lectura (según políticas)           |

### 2.4 Tabla `system_config`

| Columna            | Tipo        | Descripción                                  |
| ------------------ | ----------- | -------------------------------------------- |
| `id`               | UUID        | PK                                           |
| `config_key`       | string      | Clave única por scope                        |
| `config_value`     | JSONB       | Valor (string, number, boolean, json, array) |
| `description`      | string      | Descripción opcional                         |
| `category`         | string      | general, contact, ecommerce, inventory, etc. |
| `is_public`        | boolean     | Visible sin auth                             |
| `is_sensitive`     | boolean     | Oculto por defecto (tokens, keys)            |
| `value_type`       | string      | string, number, boolean, json, array         |
| `organization_id`  | UUID        | NULL = global                                |
| `branch_id`        | UUID        | NULL = org-level                             |
| `last_modified_by` | UUID        | FK a auth.users                              |
| `updated_at`       | timestamptz | Trigger                                      |

**Índice único:** `(config_key, COALESCE(organization_id::text, ''), COALESCE(branch_id::text, ''))`

---

## 3. API de Configuración

### 3.1 GET `/api/admin/system/config`

**Query params:**

- `category` — Filtrar por categoría
- `public_only` — Solo configs públicas
- `branch_id` — Scope de sucursal (o header `x-branch-id`)

**Lógica:**

- **Super admin:** Devuelve solo configs globales (`org_id=null`, `branch_id=null`)
- **Admin org:** Devuelve merge de global + org + branch (si `branch_id`)

### 3.2 PUT `/api/admin/system/config`

**Body:**

```json
{
  "updates": [{ "config_key": "tax_rate", "config_value": 19 }],
  "branch_id": "uuid-opcional"
}
```

**Headers:** `x-branch-id` (alternativa a body)

**Lógica:**

- **Super admin:** Siempre escribe en scope global (`targetOrgId=null`, `targetBranchId=null`)
- **Admin org:** Escribe en org o branch según `branch_id`

---

## 4. Categorías de Configuración

| Categoría    | Uso                         | Ejemplos                                   |
| ------------ | --------------------------- | ------------------------------------------ |
| `general`    | Sitio, idioma, zona horaria | site_name, timezone, language              |
| `contact`    | Contacto de la óptica       | address, phone_number, contact_email       |
| `ecommerce`  | Comercio y facturación      | currency, tax_rate, shipping_cost          |
| `inventory`  | Inventario                  | low_stock_threshold, auto_low_stock_alerts |
| `membership` | Membresías                  | membership_trial_days                      |
| `email`      | SMTP, Resend                | smtp_host, resend_api_key                  |
| `system`     | Mantenimiento, sesión       | maintenance_mode, session_timeout          |
| `business`   | Horarios, citas online      | business_hours, enable_online_appointments |

**Excluidas en UI:** `appointments`, `branches`, `telemetry` (gestión separada)

---

## 5. Componentes del Módulo Sistema

### 5.1 Página Principal (`/admin/system`)

- **Tabs:** Resumen, Configuración, Email, Notificaciones, Boletas y Facturas, Formularios, Salud, Mantenimiento
- **Scope selector:** "Todas las sucursales" vs "Sucursal actual" (solo si `hasMultipleBranches`)
- **Hooks:** `useSystemConfig`, `useSystemHealth`, `useBackups`

### 5.2 SystemConfig

- Filtro por categoría
- Toggle "Mostrar configuraciones sensibles"
- Card especial: Información de la Óptica (nombre, logo, slogan) — API `/api/admin/organizations/current`
- Guardado individual por config (botón "Guardar" por clave)

### 5.3 FormOptionsConfig

- Opciones de formularios: productos, clientes, citas, presupuestos, POS, global
- API: `/api/admin/product-options?form_type=...`
- No usa `system_config`; usa tablas `product_option_fields` y `product_option_values`

### 5.4 POSBillingSettings

- Configuración POS (min_deposit_percent, etc.)
- Configuración de facturación por sucursal (`branch_billing_settings`)
- Impresora, logo, encabezado, pie de página

### 5.5 NotificationSettings

- Tipos de notificación (quote_new, work_order_new, low_stock, etc.)
- Scope: `organization_id`, `branch_id`
- API: `/api/admin/notifications/settings`

---

## 6. Mejores Prácticas

### 6.1 Código

1. **Validación:** Usar Zod para validar `config_value` según `value_type`
2. **Sensibilidad:** No loguear valores de configs `is_sensitive`
3. **Legacy:** La API soporta fallback si `organization_id`/`branch_id` no existen (migraciones antiguas)

### 6.2 UX

1. **Feedback:** Mostrar "Sin guardar" cuando hay cambios locales
2. **Guardado:** Guardar por clave, no todo el formulario
3. **Scope:** Dejar claro si la config aplica a "Todas las sucursales" o "Sucursal actual"

### 6.3 Seguridad

1. **RLS:** Políticas en `system_config` filtran por admin y organización
2. **Sensibles:** Usar `createServiceRoleClient()` para operaciones con configs sensibles
3. **Auditoría:** `last_modified_by` y `updated_at` para trazabilidad

### 6.4 Óptica-Específico

1. **IVA Chile:** `tax_rate` típicamente 19
2. **RUT:** Validar formato en configs de facturación
3. **Horarios:** `business_hours` en formato legible para ópticas
4. **Stock:** `low_stock_threshold` por sucursal vía `product_branch_stock`

---

## 7. Permisos en Mantenimiento

Las acciones de mantenimiento y backups requieren rol en `["admin", "super_admin", "root", "dev"]`. Todas las acciones están **scopeadas por organización** (`organization_id` obligatorio); usuarios root/dev con `organization_id` null reciben 400.

| Acción            | Rol mínimo | Scope | Notas                    |
| ----------------- | ---------- | ----- | ------------------------ |
| backup_database   | admin      | Org   | Requiere organization_id |
| clean_logs        | admin      | Org   |                          |
| optimize_database | admin      | Org   |                          |
| security_audit    | admin      | Org   |                          |
| test_email        | admin      | Org   |                          |
| system_status     | admin      | Org   |                          |
| clear_memory      | admin      | Org   |                          |
| Listar backups    | admin      | Org   | Filtrado por org         |
| Restaurar backup  | admin      | Org   | Solo backups de la org   |
| Eliminar backup   | admin      | Org   | Solo backups de la org   |

**Archivos:** `src/app/api/admin/system/maintenance/route.ts`, `src/app/api/admin/system/backups/route.ts`

**Nota:** Root/dev sin `organization_id` no pueden ejecutar estas acciones (400). Mejora futura: permitir a root/dev operar sobre cualquier org.

---

## 8. Integraciones

- **Tax:** `src/lib/utils/tax-config.ts` — Lee `tax_rate` de system_config
- **Telemetry:** `system_config` para `telemetry_enabled` (SaaS)
- **Resend:** `resend_api_key` en system_config para emails
- **Organizaciones:** Logo, nombre, slogan en `organizations`, no en system_config

---

## 9. Referencias

- Migración multi-tenant: `supabase/migrations/20260216024133_add_multitenancy_to_system_config.sql`
- API config: `src/app/api/admin/system/config/route.ts`
- Hook: `src/app/admin/system/hooks/useSystemConfig.ts`
- Skill: `.cursor/skills/system-configuration-optical-supabase/SKILL.md`
