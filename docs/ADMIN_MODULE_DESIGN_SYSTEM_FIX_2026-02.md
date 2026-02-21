# Módulo Administradores — Mejoras Design System y UI (2026-02-20)

**Versión**: 1.0  
**Fecha**: 2026-02-20

---

## 1. Resumen ejecutivo

Se implementaron correcciones de consistencia visual y UX en el módulo de Administradores (gestión de empleados), alineando tokens de color con el Design System Epoch, resolviendo conflictos de estilos, eliminando duplicados y aplicando la clase `admin-card` en todo el módulo.

---

## 2. Modificaciones realizadas

### 2.1 Fase 1 — Correcciones críticas

| Cambio                            | Archivo(s)                                                             | Descripción                                                                                                                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Eliminación de duplicado**      | `admin-users/[id]/page.tsx`                                            | Se eliminó el segundo bloque de `BranchAccessManager` que mostraba la tarjeta "Acceso a sucursales" duplicada.                                                                                                                                  |
| **Conflictos de color en Badges** | `[id]/page.tsx`, `[id]/edit/page.tsx`                                  | Badge "Activo": reemplazado `bg-verde-suave text-primary` + `style` inline por `bg-admin-success text-admin-text-on-dark`. Badge "Super Administrador": `bg-dorado text-primary` → `bg-epoch-accent text-epoch-primary`.                        |
| **Tokens de color**               | `page.tsx`, `register/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx` | Sustitución de tokens indefinidos: `text-azul-profundo` → `text-epoch-primary`, `text-tierra-media` → `text-muted-foreground`, `text-dorado` → `text-epoch-accent`, `text-verde-suave` → `text-admin-success`, `bg-dorado` → `bg-epoch-accent`. |

### 2.2 Fase 2 — admin-card

Se añadió la clase `admin-card` a todas las Cards del módulo admin-users para unificar hover, bordes y `border-radius: 0`:

- **Listado** (`page.tsx`): 6 Cards (4 stats, filtros, tabla)
- **Registro** (`register/page.tsx`): 1 Card
- **Detalle** (`[id]/page.tsx`): 3 Cards (error, info principal, permisos)
- **Edición** (`[id]/edit/page.tsx`): 2 Cards

### 2.3 Fase 3 — Texto de permisos

En `[id]/edit/page.tsx`, se actualizó el bloque "Permissions Info" para reflejar que existe `PermissionsEditor`:

- **Antes**: "Los administradores tienen acceso completo a todas las funciones del sistema. Los permisos se gestionan automáticamente."
- **Después**: "Los permisos granulares se pueden editar desde el menú de acciones del usuario en el listado de administradores (Editar Permisos)."

### 2.4 Fase 4 — Tokens en otros módulos

- **Analytics** (`analytics/page.tsx`): `text-dorado`, `bg-dorado/10`, `border-dorado/20` → tokens Epoch.
- **Support templates** (`support/templates/page.tsx`): `text-dorado` → `text-epoch-accent`.
- **Support tickets/new** y **work-orders/[id]**: ya usaban tokens correctos.

---

## 3. Mapeo de tokens (referencia)

| Token eliminado                                  | Reemplazo Epoch/Admin                            |
| ------------------------------------------------ | ------------------------------------------------ |
| `text-azul-profundo`                             | `text-epoch-primary`                             |
| `text-tierra-media`                              | `text-muted-foreground`                          |
| `text-dorado`                                    | `text-epoch-accent`                              |
| `text-verde-suave`                               | `text-admin-success`                             |
| `bg-dorado`                                      | `bg-epoch-accent`                                |
| `bg-verde-suave`                                 | `bg-admin-success`                               |
| `bg-dorado/10`, `border-dorado/20`               | `bg-epoch-accent/10`, `border-epoch-accent/20`   |
| `bg-azul-profundo/10`, `border-azul-profundo/20` | `bg-epoch-primary/10`, `border-epoch-primary/20` |

---

## 4. Pendiente (backlog)

- [ ] **POST admin-users para super_admin**: Permitir crear super_admin desde el endpoint POST.
- [ ] **Invitación por email (magic link)**: Sustituir registro con contraseña por flujo de invitación.
- [ ] **Historial de cambios**: Tabla o log de cambios de rol/sucursal por admin.
- [ ] **Exportar listado**: Botón para exportar usuarios (CSV/Excel).
- [ ] **Notificaciones**: Emails al crear o desactivar usuario.
- [ ] **Tokens en más archivos**: products/bulk, products/[slug], cash-register, saas-management, etc. aún usan tokens legacy.

---

## 5. Checklist de pruebas manuales

### 5.1 Design System y UI

- [ ] **Colores en listado**: Títulos en verde oscuro (epoch-primary), texto secundario legible, badges con colores correctos (Super Admin dorado, Activo verde).
- [ ] **Colores en detalle** (`/admin/admin-users/[id]`): Sin tarjeta duplicada "Acceso a sucursales". Badges Activo/Super Admin con colores correctos.
- [ ] **Colores en edición** (`/admin/admin-users/[id]/edit`): Badge Activo verde, texto de permisos actualizado.
- [ ] **admin-card**: Hover en cards con elevación (`translateY(-2px)`) y borde dorado.
- [ ] **Registro**: Formulario con tokens correctos, card con admin-card.

### 5.2 Paginación

- [ ] Listado con pocos usuarios (< 20): tabla completa, paginación mínima o ausente.
- [ ] Listado con muchos usuarios (> 20): cambiar 10, 20, 50, 100 items por página.
- [ ] Navegar páginas y verificar que los datos cambian.
- [ ] Contador total correcto en "Usuarios Administradores (N)".

### 5.3 Búsqueda server-side

- [ ] Buscar por email (debounce ~400ms).
- [ ] Buscar por nombre o apellido.
- [ ] Búsqueda sin resultados muestra lista vacía.
- [ ] Reset de página al buscar.

### 5.4 PermissionsEditor

- [ ] Abrir desde menú "Editar Permisos".
- [ ] Recursos: products, orders, customers, analytics, settings, admin_users, support, bulk_operations, appointments, quotes, work_orders, pos, branches.
- [ ] Guardar permisos y verificar persistencia.

### 5.5 Flujos básicos

- [ ] Registrar nuevo usuario con rol y sucursal.
- [ ] Editar usuario: cambiar rol, activar/desactivar (como super_admin).
- [ ] Asignar sucursales con BranchAccessManager.
- [ ] Eliminar usuario (que no sea el último admin).
- [ ] Ver detalles de usuario.

### 5.6 Roles y seguridad

- [ ] Solo super_admin puede activar/desactivar otros.
- [ ] Admin no puede editar usuarios de otra organización (403).
- [ ] No se puede eliminar el último admin/super_admin activo de la org.

---

## 6. Archivos modificados

| Archivo                                        | Cambios                                         |
| ---------------------------------------------- | ----------------------------------------------- |
| `src/app/admin/admin-users/page.tsx`           | Tokens, admin-card                              |
| `src/app/admin/admin-users/register/page.tsx`  | Tokens, admin-card                              |
| `src/app/admin/admin-users/[id]/page.tsx`      | Duplicado eliminado, tokens, Badges, admin-card |
| `src/app/admin/admin-users/[id]/edit/page.tsx` | Tokens, Badges, admin-card, texto permisos      |
| `src/app/admin/analytics/page.tsx`             | Tokens                                          |
| `src/app/admin/support/templates/page.tsx`     | Tokens                                          |
