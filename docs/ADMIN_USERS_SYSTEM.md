# Sistema de Gestión de Administradores y Empleados — Opttius

**Versión**: 1.2  
**Fecha**: 2026-02-20  
**Última actualización**: 2026-02-20 (Design System, admin-card, corrección duplicados)

---

## Changelog

### v1.2 — 2026-02-20 (Design System y UI)

| Mejora                | Descripción                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tokens Epoch**      | Sustitución de `azul-profundo`, `tierra-media`, `dorado`, `verde-suave` por tokens del Design System (`epoch-primary`, `muted-foreground`, `epoch-accent`, `admin-success`). |
| **Conflictos Badge**  | Badge "Activo" y "Super Administrador" usan clases válidas sin `style` inline.                                                                                               |
| **admin-card**        | Todas las Cards del módulo usan la clase `admin-card` (hover, bordes, `rounded-none`).                                                                                       |
| **Tarjeta duplicada** | Eliminado `BranchAccessManager` duplicado en `/admin/admin-users/[id]`.                                                                                                      |
| **Texto permisos**    | En edición, texto actualizado para indicar que los permisos se editan desde el listado (Editar Permisos).                                                                    |

Ver detalles en `docs/ADMIN_MODULE_DESIGN_SYSTEM_FIX_2026-02.md`.

### v1.1 — 2026-02-20

| Mejora                                 | Descripción                                                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Paginación real**                    | GET usa `limit` (default 20, max 100) y `offset`. Respuesta incluye `pagination: { total, page, limit, totalPages }`. |
| **Búsqueda server-side**               | Búsqueda por email, nombre y apellido en `profiles`. Debounce 400ms en frontend.                                      |
| **Validación organization_id**         | PUT y DELETE verifican que el usuario objetivo pertenezca a la misma organización. Root/dev excluidos.                |
| **Lógica "último admin"**              | DELETE cuenta admin + super_admin activos por org. No permite eliminar el último.                                     |
| **getDefaultPermissions centralizado** | Módulo `@/lib/admin/permissions` con permisos por rol.                                                                |
| **PermissionsEditor alineado**         | Usa acciones read/create/update/delete y recursos del backend.                                                        |

### Pendiente (backlog)

- [ ] POST `/api/admin/admin-users`: permitir super_admin (actualmente solo admin)
- [ ] Invitación por email (magic link) en lugar de contraseña
- [ ] Historial de cambios de rol/sucursal
- [ ] Exportar listado de usuarios
- [ ] Notificaciones al crear/desactivar usuario

---

## 1. Resumen ejecutivo

El sistema de administradores de Opttius gestiona los usuarios que trabajan en la óptica: administradores, empleados y vendedores. Los usuarios se agregan desde el **dashboard del super admin** (o admin de sucursal) y en el formulario se les otorga **sucursal** y **rol**.

### Principios de diseño

- **Multi-tenant**: cada organización ve solo sus usuarios
- **Jerarquía de roles**: root/dev → super_admin → admin → employee/vendedor
- **Acceso por sucursal**: control granular vía `admin_branch_access`
- **Escalable**: soporta múltiples sucursales y planes de suscripción

---

## 2. Arquitectura

### 2.1 Capas del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    GESTIÓN SAAS (root/dev)                       │
│  /admin/saas-management/users — Usuarios de todas las orgs       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              GESTIÓN ÓPTICA (super_admin / admin)                │
│  /admin/admin-users — Usuarios de la organización actual         │
│  - Listado, registro, edición, eliminación                       │
│  - Asignación de sucursal y rol                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS                                 │
│  admin_users, admin_branch_access, profiles, admin_activity_log   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Jerarquía de roles

| Rol             | Scope        | Descripción                  | Creación              |
| --------------- | ------------ | ---------------------------- | --------------------- |
| **root**        | SaaS global  | Administración de plataforma | Solo manual/seed      |
| **dev**         | SaaS global  | Desarrollo y soporte         | Solo manual/seed      |
| **super_admin** | Organización | Dueño, todas las sucursales  | root/dev, super_admin |
| **admin**       | Sucursal(es) | Gerente de sucursal          | super_admin, admin    |
| **employee**    | Sucursal     | Operaciones sin admin        | super_admin, admin    |
| **vendedor**    | Sucursal     | Ventas y citas               | super_admin, admin    |

---

## 3. Modelo de datos

### 3.1 admin_users

| Campo                  | Tipo        | Descripción                                       |
| ---------------------- | ----------- | ------------------------------------------------- |
| id                     | UUID        | FK a auth.users, PK                               |
| email                  | TEXT        | Email único                                       |
| role                   | TEXT        | root, dev, super_admin, admin, employee, vendedor |
| permissions            | JSONB       | Permisos granulares por recurso                   |
| is_active              | BOOLEAN     | Usuario activo                                    |
| organization_id        | UUID        | FK a organizations (null para root/dev)           |
| last_login             | TIMESTAMPTZ | Último acceso                                     |
| created_at, updated_at | TIMESTAMPTZ | Auditoría                                         |
| created_by             | UUID        | Quién creó (opcional)                             |

### 3.2 admin_branch_access

| Campo         | Tipo        | Descripción                           |
| ------------- | ----------- | ------------------------------------- |
| id            | UUID        | PK                                    |
| admin_user_id | UUID        | FK a admin_users                      |
| branch_id     | UUID        | FK a branches, **NULL = super admin** |
| role          | TEXT        | manager, staff, viewer                |
| is_primary    | BOOLEAN     | Sucursal principal                    |
| created_at    | TIMESTAMPTZ | Auditoría                             |

**Constraint**: UNIQUE(admin_user_id, branch_id)

### 3.3 Relaciones

- `admin_users` → `profiles` (id = profiles.id)
- `admin_users` → `organizations` (organization_id)
- `admin_branch_access` → `admin_users`, `branches`
- `admin_activity_log` → `admin_users` (admin_user_id)

---

## 4. Flujos de usuario

### 4.1 Registrar nuevo usuario (crear cuenta + admin)

**Ruta**: `/admin/admin-users/register`  
**API**: `POST /api/admin/admin-users/register`

**Pasos**:

1. Usuario (admin/super_admin) completa formulario: email, contraseña, nombre, apellido, rol, sucursal
2. Backend crea usuario en `auth.users` (service role)
3. Trigger crea/actualiza `profiles`
4. Se inserta en `admin_users` con `organization_id` del creador
5. Se inserta en `admin_branch_access` (o branch_id=null si super_admin)
6. Se valida límite de usuarios del tier

**Validaciones**:

- Email no existente
- Contraseña ≥ 8 caracteres
- Rol permitido según jerarquía
- Sucursal pertenece a la organización (si aplica)
- Límite de usuarios del plan

### 4.2 Crear administrador desde usuario existente

**API**: `POST /api/admin/admin-users`

Cuando el usuario ya tiene cuenta en la app:

- Se busca en `profiles` por email
- Se inserta en `admin_users` con branch_ids
- Se crean filas en `admin_branch_access`

### 4.3 Editar usuario

**Ruta**: `/admin/admin-users/[id]/edit`  
**API**: `PUT /api/admin/admin-users/[id]`

**Campos editables**:

- role
- is_active (solo super_admin)
- permissions (opcional)
- branch_access (vía BranchAccessManager)

**Restricciones**:

- No auto-desactivación
- No auto-quitar super_admin
- Solo super_admin puede activar/desactivar otros
- Validación: solo se puede editar usuarios de la misma organización (root/dev excluidos)

### 4.4 Eliminar usuario

**API**: `DELETE /api/admin/admin-users/[id]`

**Restricciones**:

- No auto-eliminación
- No eliminar el último admin/super_admin activo de la organización (validación por organization_id)
- Validación: solo se puede eliminar usuarios de la misma organización (root/dev excluidos)
- CASCADE elimina admin_branch_access

---

## 5. Permisos por rol

### Permisos por defecto (resumen)

| Recurso      | admin | employee | vendedor |
| ------------ | ----- | -------- | -------- |
| orders       | CRUD  | R, C, U  | R, C, U  |
| products     | CRUD  | R        | R        |
| customers    | CRUD  | R, C, U  | R, C, U  |
| analytics    | R     | —        | —        |
| settings     | R, U  | —        | —        |
| admin_users  | R     | —        | —        |
| support      | CRUD  | R, C     | R, C     |
| appointments | CRUD  | R, C, U  | R, C, U  |
| quotes       | CRUD  | R, C, U  | R, C, U  |
| work_orders  | CRUD  | R, U     | R, U     |
| pos          | —     | R, C     | R, C     |

---

## 6. API Reference

### GET /api/admin/admin-users

**Query params**: `role`, `status`, `search`, `limit`, `offset`

**Respuesta**: `{ adminUsers: [...], pagination: { total, page, limit, totalPages } }`

**Filtros**:

- Por organization_id (excepto root/dev)
- Por role, status (active/inactive)
- Por search: email, first_name, last_name (en profiles)

**Paginación**: `limit` default 20, max 100. `offset` para página.

### POST /api/admin/admin-users/register

**Body**: `{ email, password, firstName, lastName, role, branch_id }`

**Respuesta**: `{ success, user: { id, email, role, organization_id } }`

### GET /api/admin/admin-users/[id]

**Respuesta**: Admin user con branches, profile, activityHistory, analytics

### PUT /api/admin/admin-users/[id]

**Body**: `{ role?, permissions?, is_active? }`

### DELETE /api/admin/admin-users/[id]

**Respuesta**: `{ success: true }`

### GET/POST /api/admin/admin-users/[id]/branch-access

Gestionar asignación de sucursales.

---

## 7. Componentes UI

| Componente          | Ubicación                                | Uso                        |
| ------------------- | ---------------------------------------- | -------------------------- |
| AdminUsersPage      | `/admin/admin-users/page.tsx`            | Listado, filtros, acciones |
| RegisterUserPage    | `/admin/admin-users/register/page.tsx`   | Formulario registro        |
| EditAdminUserPage   | `/admin/admin-users/[id]/edit/page.tsx`  | Edición rol, estado        |
| BranchAccessManager | `@/components/admin/BranchAccessManager` | Asignar sucursales         |
| PermissionsEditor   | `@/components/admin/PermissionsEditor`   | Permisos granulares        |

---

## 8. RLS y seguridad

- `admin_users`: políticas por organization_id y rol
- `admin_branch_access`: solo ver/editar según permisos
- Funciones SECURITY DEFINER: `is_admin`, `get_admin_role`, `is_super_admin`, `is_employee`
- Service role solo en servidor para operaciones que requieren bypass RLS

---

## 9. Integración con otros módulos

- **CRM**: clientes filtrados por branch_id del admin
- **Citas**: agenda por sucursal asignada
- **POS**: sesiones de caja por sucursal
- **Inventario**: stock por sucursal
- **Analytics**: métricas por organización/sucursal

---

## 10. Módulos y archivos clave

| Archivo                                           | Descripción                                                  |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `src/lib/admin/permissions.ts`                    | getDefaultPermissions, PERMISSION_RESOURCES, ACTION_LABELS   |
| `src/app/api/admin/admin-users/route.ts`          | GET (listado paginado), POST (crear desde usuario existente) |
| `src/app/api/admin/admin-users/register/route.ts` | POST (crear usuario nuevo + admin)                           |
| `src/app/api/admin/admin-users/[id]/route.ts`     | GET, PUT, DELETE con validación organization_id              |

---

## 11. Mejoras futuras (backlog)

- [ ] POST `/api/admin/admin-users`: permitir super_admin además de admin
- [ ] Invitación por email (magic link) en lugar de contraseña
- [ ] Historial de cambios de rol/sucursal
- [ ] Exportar listado de usuarios
- [ ] Notificaciones al crear/desactivar usuario
