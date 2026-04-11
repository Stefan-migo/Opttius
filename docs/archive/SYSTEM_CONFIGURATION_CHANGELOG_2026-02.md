# Changelog — Módulo Sistema de Configuración (2026-02-20)

**Notebook ID:** e071bebc-ce79-4b32-a040-61a6a9c331a3

---

## Resumen Ejecutivo

Se implementaron cuatro mejoras al módulo Sistema siguiendo el plan de `SYSTEM_CONFIGURATION_ANALYSIS.md`. Este documento detalla las modificaciones realizadas y lo que queda pendiente para pruebas manuales.

---

## 1. Modificaciones Implementadas

### 1.1 POST crear config: soportar organization_id y branch_id ✅

**Archivo:** `src/app/api/admin/system/config/route.ts`

**Cambios:**

- El endpoint POST ahora acepta `branch_id` en el body o en el header `x-branch-id`
- Reutiliza la misma lógica de scope que PUT:
  - **Super admin sin branch_id:** Inserta en scope global (org_id=null, branch_id=null)
  - **Super admin con branch_id:** Valida que la sucursal pertenezca a su org; inserta en scope branch
  - **Admin:** Inserta en org o branch según branch_id (valida branch si aplica)
- Se reemplazó el bypass de admin check: ahora verifica `admin_users` y retorna 403 si no es admin
- Inserta con `organization_id` y `branch_id` según el scope calculado
- Fallback para legacy schema (DB sin columnas org/branch): reintenta sin esas columnas si falla

### 1.2 Validación Zod de config_value según value_type ✅

**Archivos:**

- `src/lib/api/validation/zod-schemas.ts`: Nueva función `createConfigValueSchema(valueType)`
- `src/app/api/admin/system/config/route.ts`: Uso en POST y PUT

**Cambios:**

- Schema por tipo: `string`, `number`, `boolean`, `json`, `array`
- **POST:** Valida `config_value` antes de insertar; retorna 400 con mensaje si falla
- **PUT:** Valida cada update según `value_type` del config existente (o inferido para nuevos mercadopago\_\*)
- Valores inválidos se rechazan con mensaje claro (ej. "El valor debe ser un número válido")

### 1.3 Documentación de permisos en Mantenimiento ✅

**Archivos:**

- `docs/SYSTEM_CONFIGURATION.md`: Nueva sección "7. Permisos en Mantenimiento"
- `src/app/api/admin/system/maintenance/route.ts`: JSDoc con @requires
- `src/app/api/admin/system/backups/route.ts`: JSDoc en GET, POST, DELETE

**Contenido:**

- Tabla de acciones (backup_database, clean_logs, security_audit, etc.) con rol mínimo (admin) y scope (Org)
- Nota: root/dev sin `organization_id` reciben 400
- Referencia a archivos de implementación

### 1.4 JSDoc en componentes clave ✅

**Archivos modificados:**

- `src/app/admin/system/hooks/useSystemConfig.ts`
- `src/app/admin/system/components/SystemConfig.tsx`
- `src/app/admin/system/components/FormOptionsConfig.tsx`
- `src/app/admin/system/components/SystemOverview.tsx`
- `src/app/admin/system/components/SystemMaintenance.tsx`
- `src/components/admin/NotificationSettings.tsx`

**Contenido:** Descripción, @param para props principales, propósito de cada componente.

---

## 2. Pendientes (No implementados en esta iteración)

| Item                                        | Descripción                                                                                                                                 | Prioridad |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Root/dev sin org                            | Usuarios root/dev con `organization_id` null no pueden usar Mantenimiento/Backups (400). Mejora futura: permitir operar sobre cualquier org | Baja      |
| FormOptionsConfig scope                     | Definir si opciones de formularios son org o branch; si branch, agregar selector y filtrar por branch en API                                | Baja      |
| Tests unitarios                             | Tests para `mergeConfigsByScope`, `createConfigValueSchema`, API config                                                                     | Baja      |
| Ocultar scope branch a admin sin sucursales | Si admin no tiene sucursales asignadas, considerar ocultar o deshabilitar "Sucursal actual"                                                 | Baja      |

---

## 3. Archivos de Referencia

| Documento               | Ubicación                                                       |
| ----------------------- | --------------------------------------------------------------- |
| Documentación principal | `docs/SYSTEM_CONFIGURATION.md`                                  |
| Análisis y plan         | `docs/SYSTEM_CONFIGURATION_ANALYSIS.md`                         |
| Skill para agentes      | `.cursor/skills/system-configuration-optical-supabase/SKILL.md` |
| API config              | `src/app/api/admin/system/config/route.ts`                      |
| Schema Zod              | `src/lib/api/validation/zod-schemas.ts`                         |

---

## 4. Checklist de Pruebas Manuales

Usar este checklist para verificar que las modificaciones funcionan correctamente.

### 4.1 Configuración General (Tab Config)

| #   | Caso                              | Pasos                                                                                                                                  | Resultado esperado                                                             |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Admin — Config global             | 1. Login como admin. 2. Ir a Sistema > Config. 3. Seleccionar "Todas las sucursales". 4. Cambiar un valor (ej. tax_rate). 5. Guardar   | Se guarda correctamente. Toast éxito                                           |
| 2   | Admin — Config por sucursal       | 1. Login como admin. 2. Seleccionar una sucursal en el header. 3. En Config, elegir "Sucursal actual". 4. Cambiar un valor. 5. Guardar | Se guarda para esa sucursal. Al cambiar sucursal, el valor puede ser distinto  |
| 3   | Super admin — Config global       | 1. Login como super_admin. 2. En Config, "Todas las sucursales". 3. Cambiar valor. 4. Guardar                                          | Se guarda en scope global (aplica a todas las orgs)                            |
| 4   | Super admin — Config por sucursal | 1. Login como super_admin. 2. Seleccionar sucursal en header. 3. En Config, "Sucursal actual". 4. Cambiar valor. 5. Guardar            | Se guarda para esa sucursal de su org. Error si sucursal no pertenece a su org |
| 5   | Validación Zod — número inválido  | 1. En Config, editar tax_rate. 2. Ingresar texto "abc". 3. Guardar                                                                     | Error 400: "El valor debe ser un número válido"                                |
| 6   | Validación Zod — boolean          | 1. Editar config boolean (ej. auto_low_stock_alerts). 2. Cambiar valor. 3. Guardar                                                     | Se guarda correctamente                                                        |
| 7   | Config sensibles                  | 1. Click "Mostrar configuraciones sensibles". 2. Ver que aparecen (ej. resend_api_key)                                                 | Se muestran. Al ocultar, desaparecen                                           |
| 8   | Información Óptica                | 1. Editar nombre, slogan, logo. 2. Guardar                                                                                             | Se actualiza. Header refleja cambios (puede requerir refresh)                  |

### 4.2 Email, Notificaciones, Formularios

| #   | Caso                   | Pasos                                                                                                            | Resultado esperado           |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 9   | Plantillas Email       | 1. Tab Email. 2. Listar/editar plantilla                                                                         | Carga sin error              |
| 10  | Notificaciones — scope | 1. Tab Notificaciones. 2. Cambiar scope global/branch si hay múltiples sucursales. 3. Activar/desactivar un tipo | Se guarda según scope        |
| 11  | Formularios            | 1. Tab Formularios. 2. Seleccionar tipo (Productos, Clientes, etc.). 3. Editar opciones                          | Carga y guarda correctamente |

### 4.3 Boletas y Facturas (POS Billing)

| #   | Caso                 | Pasos                                                                                     | Resultado esperado         |
| --- | -------------------- | ----------------------------------------------------------------------------------------- | -------------------------- |
| 12  | POS Settings         | 1. Tab Boletas y Facturas. 2. Sub-tab POS. 3. Cambiar min_deposit_percent                 | Se guarda                  |
| 13  | Billing por sucursal | 1. Con sucursal seleccionada. 2. Sub-tab Facturación. 3. Editar datos (RUT, nombre, etc.) | Se guarda para la sucursal |

### 4.4 Salud y Mantenimiento

| #   | Caso                | Pasos                                                | Resultado esperado                                         |
| --- | ------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| 14  | Salud               | 1. Tab Salud. 2. Ver métricas. 3. Click "Actualizar" | Muestra estado (healthy/warning/critical)                  |
| 15  | Backup              | 1. Tab Mantenimiento. 2. "Backup Base de Datos"      | Crea backup. Muestra diálogo con detalles                  |
| 16  | Listar backups      | 1. En Mantenimiento, ver lista de backups            | Lista backups de la org (si hay)                           |
| 17  | Restaurar backup    | 1. Seleccionar backup. 2. Restaurar. 3. Confirmar    | Restaura (¡cuidado en prod!)                               |
| 18  | Auditoría seguridad | 1. "Verificar Seguridad"                             | Muestra diálogo con issues o "No se encontraron problemas" |
| 19  | Estado sistema      | 1. "Estado Sistema"                                  | Muestra reporte (usuarios, productos, etc.)                |

### 4.5 Permisos y Errores

| #   | Caso             | Pasos                                                                    | Resultado esperado            |
| --- | ---------------- | ------------------------------------------------------------------------ | ----------------------------- |
| 20  | Usuario no admin | 1. Login como usuario sin rol admin. 2. Intentar acceder a /admin/system | Redirige a onboarding o login |
| 21  | Admin sin org    | 1. (Si existe) Admin con organization_id null. 2. Mantenimiento > Backup | 400 "Organization not found"  |

---

**Nota:** Las pruebas 4, 5, 6 y 21 dependen de tener datos de prueba (super_admin, múltiples sucursales, admin sin org). Ajustar según el entorno.
