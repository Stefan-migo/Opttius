# Flujo de Administradores – Vista del Usuario

## 1. Contexto en la vida real (Chile)

Una óptica con varias sucursales (ej. Óptica Visión en Santiago Centro, Providencia y Las Condes) necesita que distintos empleados accedan al sistema Opttius según su función:

- **Dueño o gerente general**: ve todo, gestiona usuarios, sucursales y configuración.
- **Gerente de sucursal**: administra su sucursal, puede crear vendedores y empleados.
- **Vendedor**: usa el POS, agenda citas, crea presupuestos y órdenes de trabajo en su sucursal.
- **Empleado**: opera sin permisos de administración (inventario, citas, órdenes) en su sucursal.

**Ejemplos concretos:**

- **Óptica Visión Ltda.** (3 sucursales): 1 super admin (dueño), 3 admins (uno por sucursal), 6 vendedores (2 por sucursal), 2 empleados (laboratorio).
- **Óptica Express** (1 sucursal): 1 admin (dueño) y 2 vendedores.
- **Cadena Óptica Nacional**: super admin corporativo, admins por región, vendedores por punto de venta.

**Problemas que resuelve el módulo:**

- Centralizar quién tiene acceso al panel de administración.
- Asignar roles y sucursales para que cada usuario vea solo lo que le corresponde.
- Evitar que un vendedor de Providencia vea datos de Las Condes.
- Activar o desactivar usuarios sin borrarlos (licencias, vacaciones, desvinculación).
- Respetar límites de usuarios según el plan de suscripción (tier).

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Ver listado de administradores (admin / super_admin)

1. Ir a **Administradores** (menú lateral, sección Configuración).
2. Ver el listado con:
   - **Tarjetas de resumen**: Total, Super Admin, Activos, Activos (30 días).
   - **Filtros**: búsqueda por email o nombre, estado (activos/inactivos).
   - **Tabla**: Usuario, Rol, Sucursal, Estado, Última Actividad, Actividad (30d), Fecha Registro, Acciones.
3. Usar la búsqueda para encontrar un usuario por email o nombre.
4. Filtrar por estado si se quiere ver solo inactivos.

**Qué ve el usuario:** Página con estadísticas, filtros y tabla paginada. Cada fila tiene un menú de acciones (Ver detalles, Editar, Editar Permisos, Activar/Desactivar, Eliminar).

---

### Paso 2: Registrar nuevo usuario (admin / super_admin)

1. En el listado, clic en **Registrar Nuevo Usuario**.
2. Completar el formulario:
   - **Nombre** y **Apellido** (opcional pero recomendado).
   - **Email** (obligatorio, único en el sistema).
   - **Rol** (obligatorio): Administrador, Vendedor, Empleado o Super Administrador (solo si quien crea es super_admin).
   - **Sucursal** (obligatorio si el rol es admin, vendedor o empleado; no aplica para super_admin).
   - **Contraseña** y **Confirmar Contraseña** (mínimo 8 caracteres).
3. Guardar: el usuario queda creado y asociado a la organización actual.
4. Redirige al listado de administradores.

**Qué ve el usuario:** Formulario con campos agrupados. Si el rol requiere sucursal y no hay sucursales, aparece un aviso. Al guardar, toast de éxito y vuelta al listado.

**Restricciones:** El sistema valida el límite de usuarios del plan (tier). Si se excede, mostrará error.

---

### Paso 3: Ver detalle de un administrador (admin / super_admin)

1. En el listado, clic en **Ver detalles** (o en el nombre del usuario).
2. Ver la información:
   - **Estado** (Activo/Inactivo) y botón para cambiar (solo super_admin).
   - **Rol** (Super Administrador, Administrador, Vendedor, Empleado).
   - **Email** y **Teléfono** (si está en el perfil).
   - **Fecha de Registro** y **Último Acceso**.
   - **Actividad (últimos 30 días)**.
   - **Asignación de sucursales** (BranchAccessManager): lista de sucursales asignadas, sucursal principal, opción de agregar o quitar (si tiene permiso).
   - **Permisos**: recursos y acciones (read, create, update, delete) por módulo.
3. Clic en **Editar Usuario** para ir a la pantalla de edición.

**Qué ve el usuario:** Tarjetas con datos del usuario, sucursales asignadas y permisos. Super admin puede activar/desactivar desde aquí.

---

### Paso 4: Editar usuario (admin / super_admin)

1. Ir al detalle del usuario y clic en **Editar Usuario** (o desde el menú del listado → Editar).
2. Modificar:
   - **Rol**: Administrador, Vendedor, Empleado, Super Administrador (solo super_admin).
   - **Estado**: Activo / Inactivo (solo super_admin puede cambiar).
   - **Asignación de sucursales**: agregar o quitar sucursales, marcar sucursal principal (vía BranchAccessManager).
3. El **email** no se puede modificar (campo deshabilitado).
4. Guardar: redirige al detalle del usuario.

**Qué ve el usuario:** Formulario con rol, estado y sección de sucursales. Mensaje indicando que los permisos granulares se editan desde el listado (Editar Permisos).

**Restricciones:** No se puede auto-desactivar ni auto-quitarse el rol super_admin. Solo super_admin puede activar/desactivar a otros.

---

### Paso 5: Editar permisos granulares (admin / super_admin)

1. En el listado de administradores, menú de acciones del usuario → **Editar Permisos**.
2. Se abre un diálogo (PermissionsEditor) con recursos y acciones:
   - **Recursos**: orders, products, customers, analytics, settings, admin_users, support, appointments, quotes, work_orders, pos, etc.
   - **Acciones por recurso**: read, create, update, delete.
3. Marcar o desmarcar las casillas según lo que se quiera permitir.
4. Guardar: se actualizan los permisos del usuario.

**Qué ve el usuario:** Diálogo modal con matriz de permisos. Al guardar, se cierra y se refresca el listado.

---

### Paso 6: Activar o desactivar usuario (solo super_admin)

1. En el listado o en el detalle, clic en **Desactivar** o **Activar**.
2. Confirmar en el diálogo.
3. El usuario pasa a estado inactivo o activo. Los inactivos no pueden acceder al panel.

**Qué ve el usuario:** Botón en el menú de acciones (listado) o en la card de estado (detalle). Solo visible si el usuario actual es super_admin.

---

### Paso 7: Eliminar usuario (admin / super_admin)

1. En el listado, menú de acciones → **Eliminar**.
2. Confirmar en el diálogo (acción irreversible).
3. El usuario se elimina de admin_users y admin_branch_access.

**Qué ve el usuario:** Opción en rojo en el menú. No se puede eliminar al último admin/super_admin activo de la organización. No se puede auto-eliminar.

---

## 3. Diagrama simplificado

```
[Admin/Super Admin] Ir a Administradores → [Sistema] Muestra listado (filtrado por org)
        ↓
[Admin] Registrar Nuevo Usuario → [Sistema] Crea auth.users + profiles + admin_users + admin_branch_access
        ↓
[Admin] Ver detalle / Editar → [Sistema] Muestra datos, sucursales, permisos
        ↓
[Admin] Editar rol, estado, sucursales → [Sistema] Actualiza admin_users y admin_branch_access
        ↓
[Admin] Editar Permisos (desde listado) → [Sistema] Actualiza permissions (JSONB)
        ↓
[Super Admin] Activar/Desactivar → [Sistema] Actualiza is_active
        ↓
[Admin] Eliminar → [Sistema] Elimina admin_users (valida último admin, misma org)
```

---

## 4. Tabla de actores

| Actor                   | Rol                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Super Administrador** | Dueño o gerente general. Ve todos los usuarios de la organización. Crea admin, vendedor, empleado y super_admin. Activa/desactiva usuarios. Asigna sucursales (incl. acceso global con branch_id=null). |
| **Administrador**       | Gerente de sucursal. Ve y crea admin, vendedor, empleado (solo de su org). Edita rol y sucursales. No puede activar/desactivar ni crear super_admin.                                                    |
| **Vendedor**            | No tiene acceso a Administradores. Solo usa POS, citas, presupuestos, órdenes en su sucursal.                                                                                                           |
| **Empleado**            | No tiene acceso a Administradores. Opera inventario, citas, órdenes en su sucursal.                                                                                                                     |
| **root/dev**            | Gestión SaaS (fuera de este flujo). Crea usuarios en cualquier organización desde `/admin/saas-management/users`.                                                                                       |

---

## 5. Integraciones

| Módulo         | Integración                                                                    |
| -------------- | ------------------------------------------------------------------------------ |
| **CRM**        | Clientes filtrados por branch_id del admin.                                    |
| **Citas**      | Agenda por sucursal asignada.                                                  |
| **POS**        | Sesiones de caja por sucursal; vendedor/employee con pos: read, create.        |
| **Inventario** | Stock por sucursal; employee con products: read.                               |
| **Analytics**  | Métricas por organización/sucursal; admin con analytics: read.                 |
| **Soporte**    | Tickets asignables a admin_users; employee/vendedor con support: read, create. |
| **Tiers**      | Límite de usuarios por plan; validación al registrar.                          |

---

## 6. Rutas de referencia

| Acción                  | Ruta admin                     |
| ----------------------- | ------------------------------ |
| Listado administradores | `/admin/admin-users`           |
| Registrar nuevo usuario | `/admin/admin-users/register`  |
| Detalle administrador   | `/admin/admin-users/[id]`      |
| Editar administrador    | `/admin/admin-users/[id]/edit` |
| Gestión SaaS (root/dev) | `/admin/saas-management/users` |

---

## 7. Jerarquía de roles y permisos

| Rol             | Scope                | Puede crear                            | admin_users                  |
| --------------- | -------------------- | -------------------------------------- | ---------------------------- |
| **super_admin** | Toda la organización | admin, employee, vendedor, super_admin | read, create, update, delete |
| **admin**       | Una o más sucursales | admin, employee, vendedor              | read                         |
| **employee**    | Sucursal asignada    | —                                      | —                            |
| **vendedor**    | Sucursal asignada    | —                                      | —                            |

---

## 8. Notas de implementación

- **Filtros en listado**: Búsqueda por email, nombre y apellido (server-side, debounce 400ms). Filtro por rol y estado (activo/inactivo).
- **Paginación**: limit default 20, max 100. offset para página.
- **Super Admin**: Se determina por `admin_branch_access` con `branch_id = null`, no solo por el campo `role`.
- **Permisos granulares**: Se editan desde el listado con PermissionsEditor; en la pantalla de edición solo se muestra información.
- **BranchAccessManager**: Permite agregar/quitar sucursales y marcar sucursal principal. Super admin puede tener branch_id=null (acceso global).
