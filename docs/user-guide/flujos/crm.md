# Flujo de Clientes (CRM) – Vista del Usuario

## 1. Contexto en la vida real (Chile)

En una óptica, cada persona que llega (paciente, cliente, trabajador de convenio) debe quedar registrada para poder:

- Hacer seguimiento de recetas, citas y presupuestos.
- Vincular ventas del POS y trabajos de laboratorio a un cliente concreto.
- Recordar datos de contacto (email, teléfono, RUT) para envío de presupuestos y recordatorios.
- Identificar clientes de convenios (empresas, sindicatos) para aplicar descuentos y cobranza institucional.
- Consultar historial de compras y analíticas (total gastado, ticket promedio, productos favoritos).

**Situaciones típicas:**

- **Cliente walk-in**: Llega a la óptica sin cita. En recepción se registra con nombre, apellido, teléfono y RUT. Luego se agenda cita o se crea presupuesto.
- **Cliente de convenio**: Trabajador de Codelco o afiliado a sindicato. Se busca por RUT o nombre para verificar que está en convenio y aplicar copago.
- **Operativo en terreno**: Se crean clientes vinculados al operativo desde la pestaña Clientes del operativo; heredan el operativo en recetas y presupuestos.
- **Cita sin cliente previo**: Se agenda una cita como “invitado” y, al asistir, se registra como cliente formal.

**Problemas que resuelve el módulo:**

- Centralizar la información del cliente en un solo lugar (ficha única).
- Evitar duplicados por RUT y email por sucursal.
- Conectar recetas → presupuestos → órdenes de trabajo / ventas POS.
- Segmentar clientes (nuevo, primera compra, regular, VIP) para analíticas y fidelización.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Ver lista de clientes (admin / vendedor)

1. Ir a **Clientes** en el menú lateral.
2. Ver tarjetas de resumen: **Total Clientes**, **Clientes Activos**, **Nuevos Este Mes** (según sucursal seleccionada).
3. Usar filtros:
   - **Búsqueda**: nombre, email, teléfono o RUT (con debounce automático).
   - **Convenio**: Todos o un convenio específico.
   - **Estado**: Todos, Activos o Inactivos.
4. La tabla muestra: nombre, contacto, RUT, estado (Activo/Inactivo, Convenio), fecha de registro.
5. Acciones por fila: **Ver** (detalle) y **Editar**.

### Paso 2: Crear nuevo cliente (admin / vendedor)

1. Clic en **Nuevo Cliente** (o desde operativo: **Clientes** → **Agregar cliente**).
2. Completar formulario:
   - **Información personal**: Nombre, Apellido (obligatorios), Email, Teléfono, RUT (formato automático 12.345.678-9).
   - **Dirección**: Calle, complemento, ciudad, provincia, código postal, país.
   - **Notas**: Opcional.
3. Si se crea desde un operativo, el cliente queda vinculado al operativo.
4. Guardar: el cliente se crea en la sucursal actual y aparece en la lista.

### Paso 3: Ver detalle del cliente (admin / vendedor)

1. En la lista, clic en **Ver** (icono ojo) del cliente.
2. Se abre la ficha con:
   - **Cabecera**: Nombre, email, segmento (Nuevo, Primera Compra, Regular, VIP), badge de Cliente convenio si aplica.
   - **Tarjetas**: Total Gastado, Total Pedidos, Ticket Promedio, Cliente Desde.
   - **Pestañas**: Resumen, Recetas, Citas, Presupuestos, Compras, Analíticas, Convenios (si tiene uso de convenios).

### Paso 4: Editar cliente (admin / vendedor)

1. Desde la lista: clic en **Editar**.
2. O desde el detalle: botón **Editar** en la cabecera.
3. Modificar campos (nombre, apellido, email, teléfono, RUT, dirección, notas).
4. Guardar: se actualiza la ficha y se vuelve a la lista o al detalle.

### Paso 5: Gestionar recetas desde el cliente (admin / vendedor)

1. En el detalle del cliente, pestaña **Recetas**.
2. Clic en **Nueva Receta** o **Agregar Primera Receta**.
3. Completar formulario de receta oftalmológica (OD/OS, esfera, cilindro, eje, ADD, PD, etc.).
4. Guardar: la receta queda vinculada al cliente.
5. Editar receta existente: clic en **Editar** de la receta.

### Paso 6: Gestionar citas desde el cliente (admin / vendedor)

1. En el detalle del cliente, pestaña **Citas**.
2. Clic en **Nueva Cita** o **Agendar Primera Cita**.
3. Completar: tipo (examen de vista, consulta, ajuste, entrega, etc.), fecha, hora, duración, motivo, notas.
4. Guardar: la cita queda vinculada al cliente.

### Paso 7: Crear presupuesto desde el cliente (admin / vendedor)

1. En el detalle del cliente, pestaña **Presupuestos**.
2. Clic en **Nuevo Presupuesto** o **Crear Primer Presupuesto**.
3. Completar formulario (marco, lente, receta asociada, precios).
4. Si el cliente tiene operativo vinculado, el presupuesto hereda el operativo.
5. Guardar: el presupuesto queda vinculado al cliente y puede convertirse en orden de trabajo o venta POS.

### Paso 8: Buscar cliente en POS o Presupuestos (vendedor)

1. En el POS o al crear presupuesto, usar el campo de búsqueda de cliente.
2. Escribir nombre, email, teléfono o RUT (mín. 1 carácter en POS, 2 en búsqueda general).
3. El sistema muestra hasta 20 resultados coincidentes.
4. Seleccionar cliente: se cargan sus recetas para elegir la que aplica al presupuesto o venta.

### Paso 9: Consultar analíticas del cliente (admin)

1. En el detalle del cliente, pestaña **Analíticas**.
2. Si tiene pedidos: ver **Productos Favoritos** (top 5), **Distribución de Estados**, **Tendencia de Gastos** (últimos 12 meses).
3. Si no tiene pedidos: mensaje indicando que las analíticas estarán disponibles tras la primera compra.

---

## 3. Diagrama simplificado

```
[Admin/Vendedor] Ir a Clientes → Ver lista (filtros, búsqueda)
        ↓
[Admin/Vendedor] Nuevo Cliente → Completar formulario (nombre, RUT, contacto, dirección)
        ↓
[Sistema] Valida duplicados (email, RUT por sucursal), límite tier, crea cliente
        ↓
[Admin/Vendedor] Ver detalle → Pestañas: Recetas, Citas, Presupuestos, Compras, Analíticas
        ↓
[Admin/Vendedor] Nueva Receta / Nueva Cita / Nuevo Presupuesto (desde ficha)
        ↓
[Vendedor] En POS: busca cliente por RUT/nombre → Selecciona → Procesa venta
        ↓
[Sistema] Vincula orden por email al historial del cliente; actualiza analíticas
```

---

## 4. Tabla de actores

| Actor            | Rol                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| **Admin óptica** | Crea y edita clientes, gestiona recetas, citas y presupuestos desde la ficha, consulta analíticas y convenios. |
| **Vendedor**     | Registra clientes nuevos, busca clientes en POS y presupuestos, crea recetas y presupuestos desde la ficha.    |
| **Cliente**      | Persona atendida en la óptica; no tiene cuenta en el sistema; sus datos se gestionan desde el panel admin.     |
| **Recepción**    | Suele actuar como admin/vendedor: registra walk-ins y agenda citas.                                            |

---

## 5. Integraciones

| Módulo                      | Integración                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recetas**                 | Recetas vinculadas a `customer_id`; se crean y editan desde la ficha del cliente.                                                           |
| **Citas**                   | Citas vinculadas a `customer_id` y `branch_id`; se crean desde la ficha. Citas sin cliente (guest) se convierten en cliente al registrarse. |
| **Presupuestos**            | Presupuestos vinculados a `customer_id`; se crean desde la ficha; heredan `field_operation_id` si el cliente pertenece a un operativo.      |
| **POS**                     | Búsqueda de clientes por nombre, email, teléfono, RUT; órdenes vinculadas por email al historial del cliente.                               |
| **Trabajos de laboratorio** | OT vinculadas a presupuestos que a su vez están vinculados a clientes.                                                                      |
| **Convenios**               | Clientes con compras bajo convenio muestran pestaña **Convenios** con historial de uso (órdenes, copago, institucional).                    |
| **Operativos en terreno**   | Clientes con `field_operation_id`; se crean desde el operativo; recetas y presupuestos heredan el operativo.                                |
| **Inventario**              | No directo; las compras del cliente se reflejan en analíticas (productos favoritos, gastos).                                                |

---

## 6. Rutas y pantallas

| Ruta                                           | Descripción                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `/admin/customers`                             | Lista de clientes (filtros, búsqueda, paginación, stats).                                    |
| `/admin/customers?field_operation_id=[id]`     | Lista filtrada por operativo.                                                                |
| `/admin/customers/new`                         | Formulario nuevo cliente.                                                                    |
| `/admin/customers/new?field_operation_id=[id]` | Nuevo cliente vinculado al operativo.                                                        |
| `/admin/customers/[id]`                        | Detalle con pestañas: Resumen, Recetas, Citas, Presupuestos, Compras, Analíticas, Convenios. |
| `/admin/customers/[id]/edit`                   | Formulario editar cliente.                                                                   |

---

## 7. Segmentos de cliente

| Segmento           | Criterio                                                    |
| ------------------ | ----------------------------------------------------------- |
| **Nuevo**          | Sin pedidos.                                                |
| **Primera Compra** | 1–3 pedidos.                                                |
| **Regular**        | 4–10 pedidos.                                               |
| **VIP**            | 11+ pedidos.                                                |
| **En Riesgo**      | (Reservado para lógica futura: inactividad, cancelaciones). |
