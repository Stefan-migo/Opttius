# Flujo de Operativos en Terreno – Vista del Usuario

## 1. Contexto en la vida real (Chile)

Una óptica realiza **operativos en terreno** cuando va a empresas, sindicatos o instituciones (mineras, bancos, municipalidades, colegios) para atender a muchos pacientes fuera de la sucursal. El flujo típico es:

- La óptica firma un acuerdo con la empresa (ej. Codelco, BancoEstado, sindicato de profesores).
- El día del operativo, el equipo lleva armazones y equipos a la empresa.
- Se registran pacientes, se hacen exámenes y se generan recetas digitales en sitio.
- Se crean presupuestos y órdenes de trabajo (OT) vinculadas al operativo.
- Las OT se procesan en el laboratorio y luego se entregan en la empresa.

**Problemas que resuelve el módulo:**

- Organizar stock móvil (bodega temporal) sin mezclarlo con la sucursal.
- Vincular clientes, presupuestos, recetas y trabajos al operativo.
- Registrar entregas en la empresa con trazabilidad.
- Mantener el flujo integrado con CRM, presupuestos, POS y trabajos de laboratorio.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Crear el operativo (admin)

1. Ir a **Operativos en Terreno** → **Nuevo operativo**.
2. Completar: **Nombre** (ej. "Operativo Minera Escondida - Marzo 2025"), **Fecha programada**, **Ubicación** (empresa o dirección), **Sucursal**.
3. Guardar: el operativo se crea con estado **En Preparación**.

### Paso 2: Transferir stock a la bodega móvil (admin)

1. En el detalle del operativo, ir a la pestaña **Stock Móvil**.
2. Si no hay stock, hacer clic en **Transferir stock** (o ir a **Preparar**).
3. Seleccionar **producto** (armazón) y **cantidad** desde el inventario de la sucursal.
4. Confirmar: el stock se descuenta de la bodega central y se suma a la bodega móvil del operativo.

### Paso 3: Gestionar clientes del operativo (admin/vendedor)

1. En el detalle del operativo, usar el botón **Clientes** o la pestaña **Clientes**.
2. **Agregar cliente**: formulario con nombre, apellido, teléfono, email, RUT (formato automático).
3. El cliente queda vinculado al operativo (`field_operation_id`).
4. Acciones por cliente: **Ver**, **Nueva receta**, **Nuevo presupuesto**, **Editar**, **Eliminar**.

### Paso 4: Crear recetas y presupuestos (admin/vendedor)

1. **Receta**: desde la pestaña Clientes, clic en el icono de receta del cliente → formulario de receta.
2. **Presupuesto**: clic en el icono de presupuesto del cliente → formulario de presupuesto (solo clientes del operativo).
3. También se puede crear desde la página del cliente (`/admin/customers/[id]`): recetas y presupuestos heredan el operativo del cliente.

### Paso 5: Vender en el POS en modo operativo (vendedor)

1. En el detalle del operativo, clic en **Abrir POS**.
2. El POS se abre con `field_operation_id` en la URL.
3. Al procesar la venta, la orden y las OT se vinculan al operativo.
4. El stock se descuenta de la bodega móvil (no de la sucursal).

### Paso 6: Seguimiento de trabajos (admin)

1. Pestaña **Trabajos**: lista de OT del operativo.
2. Ver cliente, número de OT, estado y monto.
3. Enlace **Ver** para ir al detalle de cada trabajo.

### Paso 7: Registrar entrega en la empresa (admin)

1. Pestaña **Entrega**: OT con estado **ready_for_pickup**.
2. Seleccionar las OT a entregar.
3. Completar **Nombre del receptor** y **Notas**.
4. Clic en **Registrar entrega**: se registra la entrega y se cierra el ciclo.

### Paso 8: Cambiar estado del operativo (admin)

1. Selector de estado en la cabecera del operativo.
2. Estados: **Borrador** → **Preparado** → **En terreno** → **Completado** o **Cancelado**.

---

## 3. Diagrama simplificado

```
[Admin] Crea operativo (En Preparación)
        ↓
[Admin] Transfiere stock → Bodega móvil
        ↓
[Admin/Vendedor] Agrega clientes + recetas + presupuestos
        ↓
[Vendedor] Abre POS en modo operativo → Procesa ventas
        ↓
[Sistema] Crea OT vinculadas al operativo, descuenta stock móvil
        ↓
[Laboratorio] Procesa OT (flujo normal)
        ↓
[Admin] Pestaña Entrega → Selecciona OT listas → Registra receptor
        ↓
[Ciclo cerrado] Operativo completado
```

---

## 4. Tabla de actores

| Actor                   | Rol                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Admin óptica**        | Crea operativos, transfiere stock, gestiona clientes, registra entregas, cambia estado. |
| **Vendedor**            | Agrega clientes, crea recetas y presupuestos, usa el POS en modo operativo.             |
| **Cliente/Paciente**    | Persona atendida en el operativo (trabajador, afiliado, etc.).                          |
| **Laboratorio**         | Procesa las OT del operativo como flujo normal.                                         |
| **Receptor en empresa** | Persona que recibe las OT entregadas en la empresa.                                     |

---

## 5. Integraciones

| Módulo                      | Integración                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **CRM (Clientes)**          | Clientes con `field_operation_id`; filtro por operativo; herencia de operativo en recetas y presupuestos creados desde la ficha del cliente. |
| **Presupuestos**            | Presupuestos con `field_operation_id`; solo clientes del operativo al crear desde el operativo.                                              |
| **POS**                     | Apertura con `?field_operation_id=xxx`; órdenes y OT vinculadas al operativo; descuento de stock móvil.                                      |
| **Trabajos de laboratorio** | OT con `field_operation_id`; listado filtrado por operativo.                                                                                 |
| **Inventario**              | Transferencia desde `product_branch_stock` a `operativo_mobile_stock`; descuento en ventas del operativo.                                    |
| **Recetas**                 | Recetas con `field_operation_id` heredado del cliente.                                                                                       |
| **Citas**                   | Citas con `field_operation_id` heredado del cliente.                                                                                         |

---

## 6. Rutas y pantallas

| Ruta                                   | Descripción                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `/admin/field-operations`              | Lista de operativos (filtros por estado, búsqueda, paginación).                        |
| `/admin/field-operations/new`          | Crear operativo (nombre, fecha, ubicación, sucursal).                                  |
| `/admin/field-operations/[id]`         | Detalle con pestañas: Resumen, Clientes, Presupuestos, Stock Móvil, Trabajos, Entrega. |
| `/admin/field-operations/[id]/prepare` | Transferir stock a la bodega móvil.                                                    |
| `/admin/pos?field_operation_id=[id]`   | POS en modo operativo.                                                                 |

---

## 7. Estados del operativo

| Estado         | Significado                                              |
| -------------- | -------------------------------------------------------- |
| **Borrador**   | Recién creado, sin stock transferido.                    |
| **Preparado**  | Stock transferido a la bodega móvil, listo para terreno. |
| **En terreno** | Operativo en curso.                                      |
| **Completado** | Ciclo cerrado.                                           |
| **Cancelado**  | Operativo anulado.                                       |
