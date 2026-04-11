---
name: admin-users-optical-supabase
description: Expert guide for building and maintaining the optical shop admin/employee management system with Supabase. Use when working on administradores, gestión de empleados, admin_users, admin_branch_access, roles (admin, super_admin, employee, vendedor), branch assignment, permissions, or optical staff management workflows. Covers multi-tenant architecture, RLS, organization-scoped users, and optical-specific role hierarchy.
---

# Admin Users (Óptica) — Guía para gestión de administradores y empleados

Esta skill entrega indicaciones para un sistema de gestión de usuarios de la óptica (administradores y empleados) que sea **funcional, escalable y seguro** en Next.js + Supabase.

## Cuándo usar esta skill

- Implementar o modificar gestión de administradores/empleados de la óptica
- Crear o editar usuarios con rol y sucursal
- Asignar acceso a sucursales (`admin_branch_access`)
- Definir o revisar permisos por rol
- Revisar RLS y políticas de acceso para `admin_users`
- Flujos de registro desde super admin vs admin de sucursal

---

## 1. Arquitectura de roles

| Rol             | Scope                | Uso típico              |
| --------------- | -------------------- | ----------------------- |
| **root/dev**    | Multi-tenant (SaaS)  | Gestión plataforma      |
| **super_admin** | Toda la organización | Dueño / Gerente general |
| **admin**       | Una o más sucursales | Gerente de sucursal     |
| **employee**    | Sucursal asignada    | Operaciones sin admin   |
| **vendedor**    | Sucursal asignada    | Ventas y citas          |

**Super Admin** se determina por `admin_branch_access` con `branch_id = null`, no solo por el campo `role`.

---

## 2. Modelo de datos

### admin_users

- `id` (FK a auth.users)
- `email`, `role`, `permissions` (JSONB)
- `is_active`, `organization_id`
- `last_login`, `created_at`, `updated_at`, `created_by`

### admin_branch_access

- `admin_user_id`, `branch_id` (NULL = super admin)
- `role`: manager | staff | viewer
- `is_primary`: sucursal principal

### Reglas

- Un usuario pertenece a **una organización** (`organization_id`)
- root/dev tienen `organization_id = null`
- Acceso a sucursales vía `admin_branch_access`
- Super admin: fila con `branch_id = null`

---

## 3. Flujos de creación de usuarios

### Desde Super Admin (Gestión SaaS)

- Dashboard `/admin/saas-management/users`
- Crea usuarios con organización y sucursal
- API: `/api/admin/saas-management/users` y `/api/admin/admin-users/register`

### Desde Admin de Óptica

- `/admin/admin-users/register`
- Usuario se crea en la **organización actual** del admin
- Requiere: email, contraseña, rol, sucursal (si aplica)
- API: `POST /api/admin/admin-users/register`

### Crear administrador desde usuario existente

- Si el usuario ya existe en `profiles`, usar flujo "Crear Administrador" (no registro)
- API: `POST /api/admin/admin-users` con `email`, `branch_ids`, `is_super_admin`

---

## 4. Buenas prácticas

### 4.1 Aislamiento multi-tenant

- **Siempre** filtrar por `organization_id` en consultas de admin_users (excepto root/dev)
- Validar que `branch_id` pertenezca a la organización del usuario
- No exponer usuarios de otras organizaciones

### 4.2 Validación de roles

- Root/dev: pueden crear cualquier rol
- Super admin: admin, employee, vendedor, super_admin (de su org)
- Admin: admin, employee, vendedor
- Validar límites de tier (usuarios por plan) antes de crear

### 4.3 Asignación de sucursal

- admin, employee, vendedor: **requieren** al menos una sucursal
- super_admin: acceso global (branch_id = null)
- Usar `admin_branch_access` con `role`: manager (admin) o staff (employee/vendedor)

### 4.4 Permisos por defecto

- Centralizar en `getDefaultPermissions(role)` — evitar duplicación
- employee/vendedor: sin admin_users, analytics limitado, pos completo
- admin: admin_users solo lectura

### 4.5 Seguridad

- No permitir auto-desactivación ni auto-eliminación
- No permitir auto-quitarse super_admin
- Evitar eliminar el último admin activo de la organización
- Usar RPCs `is_admin`, `get_admin_role`, `is_super_admin` para verificación

---

## 5. API y componentes

| Ruta                                        | Método         | Uso                                 |
| ------------------------------------------- | -------------- | ----------------------------------- |
| `/api/admin/admin-users`                    | GET            | Lista (filtrada por org)            |
| `/api/admin/admin-users`                    | POST           | Crear admin desde usuario existente |
| `/api/admin/admin-users/register`           | POST           | Crear usuario nuevo + admin         |
| `/api/admin/admin-users/[id]`               | GET/PUT/DELETE | Detalle, actualizar, eliminar       |
| `/api/admin/admin-users/[id]/branch-access` | GET/POST       | Gestionar sucursales                |

### Componentes clave

- `BranchAccessManager`: asignar/editar sucursales
- `PermissionsEditor`: editar permisos granulares
- Página register: formulario con rol + sucursal

---

## 6. Checklist de implementación

- [ ] Filtrar admin_users por organization_id (no root/dev)
- [ ] Validar branch_id pertenece a la org
- [ ] Asignar branch_access al crear usuario
- [ ] Respetar jerarquía de roles al crear/editar
- [ ] Validar límite de usuarios del tier
- [ ] Log de actividad en admin_activity_log
- [ ] Paginación en listado (limit/offset)
- [ ] Búsqueda server-side por email/nombre

---

## Referencia

- Documentación detallada: [docs/ADMIN_USERS_SYSTEM.md](../../docs/ADMIN_USERS_SYSTEM.md)
- Supabase Auth: skill `supabase-auth`
- CRM óptico: skill `crm-optical-supabase`
