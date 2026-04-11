# Checklist de pruebas manuales — Sistema de Administradores

**Fecha**: 2026-02-20  
**Versión del sistema**: 1.2

---

## 0. Design System y UI (v1.2)

- [ ] **Colores en listado**: Títulos en verde oscuro (epoch-primary), texto secundario legible, badges correctos (Super Admin dorado, Activo verde).
- [ ] **Colores en detalle** (`/admin/admin-users/[id]`): Sin tarjeta duplicada "Acceso a sucursales". Badges Activo/Super Admin con colores correctos.
- [ ] **Colores en edición** (`/admin/admin-users/[id]/edit`): Badge Activo verde, texto de permisos actualizado.
- [ ] **admin-card**: Hover en cards con elevación y borde dorado.
- [ ] **Registro**: Formulario con tokens correctos.

---

## 1. Paginación

- [ ] **Listado con pocos usuarios (< 20)**: La tabla muestra todos, la paginación no aparece o muestra 1 página.
- [ ] **Listado con muchos usuarios (> 20)**: Cambiar items por página (10, 20, 50, 100) y verificar que se cargan los correctos.
- [ ] **Navegar páginas**: Ir a página 2, 3, etc. y verificar que los datos cambian.
- [ ] **Contador total**: El número "Usuarios Administradores (N)" coincide con el total real.
- [ ] **Filtros + paginación**: Aplicar filtro por rol o estado y verificar que la paginación se ajusta al resultado filtrado.

---

## 2. Búsqueda server-side

- [ ] **Buscar por email**: Escribir parte de un email y verificar que aparece el usuario (tras ~400ms de debounce).
- [ ] **Buscar por nombre**: Escribir nombre o apellido y verificar que aparece el usuario.
- [ ] **Búsqueda sin resultados**: Buscar texto que no coincida; debe mostrar lista vacía.
- [ ] **Búsqueda + paginación**: Si hay muchos resultados, verificar que la paginación funciona.
- [ ] **Reset de página al buscar**: Al escribir en búsqueda, la página debe volver a 1.
- [ ] **Borrar búsqueda**: Limpiar el campo y verificar que vuelven todos los usuarios.

---

## 3. Validación organization_id (PUT/DELETE)

_Requiere al menos 2 organizaciones con usuarios._

- [ ] **Editar usuario de otra org (como admin)**: Intentar editar un usuario de otra organización (ej. manipulando la URL). Debe devolver 403.
- [ ] **Eliminar usuario de otra org (como admin)**: Mismo caso para DELETE. Debe devolver 403.
- [ ] **Root/dev**: Usuario root o dev puede editar/eliminar usuarios de cualquier organización.
- [ ] **Super_admin**: Puede editar/eliminar solo usuarios de su organización.

---

## 4. Lógica "último admin" en DELETE

- [ ] **Último admin de la org**: Si solo queda 1 admin o super_admin activo en la organización, intentar eliminarlo. Debe devolver error 400 con mensaje claro.
- [ ] **Con más de un admin**: Con 2+ admins/super_admins activos, la eliminación debe permitirse.
- [ ] **Usuario inactivo**: Los inactivos no cuentan para "último admin"; se puede eliminar si hay otro activo.

---

## 5. PermissionsEditor

- [ ] **Abrir editor**: Desde el menú de un usuario, "Editar Permisos".
- [ ] **Recursos mostrados**: Aparecen products, orders, customers, analytics, settings, admin_users, support, bulk_operations, appointments, quotes, work_orders, pos, branches.
- [ ] **Acciones**: Cada recurso muestra Leer, Crear, Actualizar, Eliminar (según corresponda).
- [ ] **Guardar permisos**: Modificar permisos y guardar. Verificar que se persisten (recargar o reabrir).
- [ ] **Analytics solo lectura**: El recurso analytics solo tiene la acción "Leer".

---

## 6. Flujos básicos (regresión)

- [ ] **Registrar nuevo usuario**: Completar formulario con rol y sucursal. Usuario creado correctamente.
- [ ] **Editar usuario**: Cambiar rol, activar/desactivar (como super_admin). Cambios aplicados.
- [ ] **Asignar sucursales**: En edición, usar BranchAccessManager para añadir/quitar sucursales.
- [ ] **Eliminar usuario**: Eliminar un usuario (que no sea el último admin). Se elimina correctamente.
- [ ] **Ver detalles**: Entrar a la ficha de un usuario. Se muestran datos, sucursales y actividad.

---

## 7. Roles y visibilidad

- [ ] **Vendedor en lista**: Un usuario con rol vendedor puede acceder a /admin/admin-users y ver la lista.
- [ ] **Admin vs Super_admin**: Admin ve solo usuarios de su org. Super_admin ve todos los de la org.
- [ ] **Solo super_admin activa/desactiva**: Un admin no puede activar/desactivar a otros; solo super_admin.

---

## Resumen rápido

| Área              | Casos críticos                                      |
| ----------------- | --------------------------------------------------- |
| Paginación        | Cambio de página, items por página, total correcto  |
| Búsqueda          | Por email, por nombre, debounce, reset página       |
| Validación org    | 403 al editar/eliminar usuario de otra org          |
| Último admin      | 400 al eliminar último admin de la org              |
| PermissionsEditor | Recursos/acciones correctos, guardado persistente   |
| Regresión         | Registro, edición, eliminación, BranchAccessManager |
