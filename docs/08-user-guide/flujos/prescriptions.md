# Flujo de Libro de Recetas – Vista del Usuario

## 1. Contexto en la vida real (Chile)

El **Código Sanitario Chileno (Libro V)** exige que toda óptica lleve un **registro cronológico y detallado** de las recetas despachadas. Antes, las ópticas usaban un libro físico donde anotaban cada receta a mano. Hoy, el Libro Digital de Recetas de Opttius cumple ese requisito de forma automática y centralizada.

**Situación típica:**

- Un paciente llega con su receta del oftalmólogo (ej. Dr. Juan Pérez, oftalmólogo de Clínica Alemana).
- El vendedor registra la receta al crear el cliente o al procesar la venta en el POS.
- Los datos (OD/OS: esfera, cilindro, eje, adición, PD) quedan guardados en el sistema.
- Si llega una **fiscalización Seremi**, el admin puede mostrar o exportar el libro en segundos, sin buscar cliente por cliente.

**Ejemplos concretos:**

- **Paciente María González** (RUT 15.234.567-8): Receta del 15/01/2025, oftalmólogo Dr. Pérez, tipo progresivo, con presbicia (adición +2.00).
- **Óptica Óptica Centro Santiago**: Tiene 3 sucursales; cada sucursal ve solo sus recetas (o el super admin ve todas).

**Problemas que resuelve el módulo:**

- Cumplir con la normativa sanitaria chilena sin libros físicos.
- Tener una vista centralizada para auditoría y fiscalización.
- Exportar CSV o Excel para entregar a la autoridad sanitaria al instante.
- Vincular recetas con órdenes de trabajo (OT) para trazabilidad.
- Identificar recetas con presbicia (adición) para presupuestos rápidos.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Registrar recetas (origen: CRM o POS)

Las recetas **no se crean desde el Libro de Recetas**, sino desde:

**Opción A – Desde la ficha del cliente (CRM):**

1. Ir a **Clientes** → seleccionar cliente (ej. María González).
2. En la ficha del cliente, ir a la pestaña **Recetas**.
3. Clic en **Nueva Receta** (o **Agregar Primera Receta** si no tiene ninguna).
4. Completar el formulario:
   - **Fecha emisión** y **Fecha vencimiento**
   - **Número de receta** (opcional)
   - **Profesional que prescribe** (oftalmólogo/tecnólogo médico)
   - **OD** (ojo derecho): esfera, cilindro, eje, adición, PD
   - **OS** (ojo izquierdo): idem
   - **PD cercana** (presbicia): od_near_pd, os_near_pd
   - **Tipo**: monofocal, bifocal, progresivo, etc.
   - **Material**, **tratamientos**, **notas**
5. Guardar: la receta queda vinculada al cliente y aparece en el Libro Digital.

**Opción B – Desde el POS al procesar una venta:**

1. En el **Punto de Venta**, seleccionar o crear cliente.
2. Al agregar productos (cristales, armazones), el sistema permite seleccionar o crear una receta.
3. Si el cliente no tiene recetas, se puede **crear una nueva** desde el selector.
4. Al procesar la venta, la receta queda registrada y vinculada al cliente.
5. La receta aparece automáticamente en el Libro de Recetas.

**Qué ve el usuario:** Formulario de receta con campos OD/OS, tipo, profesional. En el POS, selector de recetas del cliente con opción de crear nueva.

---

### Paso 2: Consultar el Libro de Recetas (admin)

1. Ir a **Libro de Recetas** (menú lateral: CRM y catálogo).
2. Seleccionar **sucursal** (si aplica): por defecto se muestran las recetas de la sucursal actual.
3. Ver la tabla centralizada con:
   - Fecha, Cliente (nombre y RUT), Profesional
   - OD y OS (resumen: esf, cil, eje, add, PD)
   - Tipo (monofocal, bifocal, progresivo)
   - Presbicia (badge si tiene adición)
   - OT vinculadas (cantidad y enlace a trabajos)
   - Acciones: Ver, Modificar, Eliminar, Ir al cliente

**Qué ve el usuario:** Tabla con todas las recetas de la sucursal (o de todas si es super admin). En móvil, tarjetas en lugar de tabla.

---

### Paso 3: Filtrar y buscar recetas (admin)

1. En el Libro de Recetas, usar la barra de filtros:
   - **Buscar**: nombre, RUT o email del cliente
   - **RUT**: RUT específico (ej. 15.234.567-8)
   - **Profesional**: oftalmólogo que prescribe (ej. "Dr. Pérez")
   - **Fecha desde** y **Fecha hasta**: rango de fecha de emisión
2. Clic en **Buscar** (o aplicar filtros al cargar).
3. La tabla se actualiza con los resultados. Paginación si hay muchas recetas.

**Qué ve el usuario:** Filtros que permiten encontrar recetas por paciente, profesional o período. Ideal para fiscalización o auditoría interna.

---

### Paso 4: Ver detalle de una receta (admin)

1. En la tabla, clic en el icono **Ver** (ojo) de una receta.
2. Se abre un modal con el detalle completo:
   - Datos del paciente (nombre, RUT)
   - Fecha emisión, vencimiento, número de receta
   - Profesional que prescribe
   - OD y OS completos (esfera, cilindro, eje, adición, PD, PD cercana)
   - Tipo, material, tratamientos, notas
3. Desde el modal: **Cerrar** o **Modificar** para editar.

**Qué ve el usuario:** Vista completa de la receta en formato legible, lista para mostrar a fiscalización o para verificar datos.

---

### Paso 5: Modificar o eliminar una receta (admin)

**Modificar:**

1. En la tabla, clic en el icono **Modificar** (lápiz) o desde el modal de ver → **Modificar**.
2. Se abre el formulario de receta con los datos actuales.
3. Editar los campos necesarios y guardar.
4. La tabla se actualiza.

**Eliminar:**

1. En la tabla, clic en el icono **Eliminar** (papelera).
2. Confirmar en el diálogo: "¿Está seguro de eliminar esta receta?"
3. La receta se elimina y desaparece del Libro. **Esta acción no se puede deshacer.**

**Qué ve el usuario:** Formulario de edición reutilizado del CRM. Diálogo de confirmación antes de eliminar.

---

### Paso 6: Exportar para fiscalización Seremi (admin)

1. En el Libro de Recetas, clic en **CSV** o **Excel** (botones en la cabecera).
2. El sistema genera un archivo con las recetas según los filtros activos (fecha, sucursal).
3. El archivo se descarga con nombre `libro-recetas-YYYY-MM-DD.csv` o `.xlsx`.
4. El admin puede entregar el archivo a la autoridad sanitaria en segundos.

**Qué ve el usuario:** Descarga inmediata. Formato compatible con Excel. Columnas: fecha, RUT, nombre, profesional, OD/OS, tipo, etc.

---

### Paso 7: Ir al cliente o a las OT vinculadas (admin)

1. **Ir al cliente:** Clic en el icono de usuario en la fila → redirige a la ficha del cliente (`/admin/customers/[id]`).
2. **Ver OT vinculadas:** Si la receta tiene órdenes de trabajo, aparece un enlace "X OT" que lleva a la lista de trabajos (`/admin/work-orders`).

**Qué ve el usuario:** Navegación rápida entre Libro de Recetas, CRM y Trabajos de Laboratorio.

---

## 3. Diagrama simplificado

```
[Vendedor/Admin] Crea receta desde CRM (ficha cliente) o POS
        ↓
[Sistema] Guarda en prescriptions (customer_id, branch_id, OD/OS, profesional, etc.)
        ↓
[Admin] Abre Libro de Recetas → Ve tabla centralizada
        ↓
[Admin] Filtra por RUT, fecha, profesional → Busca receta
        ↓
[Admin] Ver detalle / Modificar / Eliminar
        ↓
[Fiscalización Seremi] Llega a la óptica
        ↓
[Admin] Exporta CSV o Excel → Entrega archivo en segundos
        ↓
[Admin] Opcional: desde receta → Ver cliente / Ver OT vinculadas
```

---

## 4. Tabla de actores

| Actor                       | Rol                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| **Admin óptica**            | Consulta el Libro, filtra, exporta para fiscalización, modifica o elimina recetas si hay error.   |
| **Vendedor**                | Registra recetas desde el POS al procesar ventas; puede crear recetas desde la ficha del cliente. |
| **Paciente/Cliente**        | Entrega la receta física al llegar a la óptica; no interactúa con el Libro Digital.               |
| **Fiscalizador Seremi**     | Recibe el archivo exportado (CSV/Excel) como evidencia del cumplimiento del Código Sanitario.     |
| **Oftalmólogo/Profesional** | Emite la receta; su nombre se registra en el campo "Profesional que prescribe".                   |

---

## 5. Integraciones

| Módulo                           | Integración                                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CRM (Clientes)**               | Las recetas viven en el cliente (`prescriptions.customer_id`). El Libro es una vista agregada. Crear/editar recetas desde la pestaña Recetas del cliente. |
| **POS**                          | Al vender con receta, los datos se capturan y persisten en `prescriptions`. El Libro los refleja automáticamente.                                         |
| **Trabajos de Laboratorio (OT)** | Cada receta puede tener OT vinculadas (`lab_work_orders.prescription_id`). El Libro muestra el conteo y enlace a las OT.                                  |
| **Presupuestos**                 | Los presupuestos pueden vincularse a una receta (`quotes.prescription_id`). Futuro: "Crear presupuesto desde receta" con datos pre-cargados.              |
| **Sistema**                      | Configuración de tiempo de expiración por defecto de recetas (`prescription_expiration_months`) en Sistema → Recetas.                                     |
| **Notificaciones**               | Cron `/api/cron/prescription-expiring` envía emails cuando una receta está por vencer (30 días).                                                          |

---

## 6. Rutas y pantallas

| Ruta                    | Descripción                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `/admin/prescriptions`  | Libro de Recetas: tabla centralizada, filtros, exportación, acciones por receta.    |
| `/admin/customers/[id]` | Ficha del cliente: pestaña **Recetas** para crear y editar recetas del cliente.     |
| `/admin/pos`            | Punto de venta: selector de recetas del cliente; crear receta si no existe.         |
| `/admin/work-orders`    | Trabajos de laboratorio: enlace desde el Libro para ver OT vinculadas a una receta. |

---

## 7. Campos clave de una receta

| Campo                           | Descripción                                                       |
| ------------------------------- | ----------------------------------------------------------------- |
| **OD**                          | Ojo derecho: esfera, cilindro, eje, adición, PD                   |
| **OS**                          | Ojo izquierdo: idem                                               |
| **Presbicia**                   | Si tiene adición (od_add, os_add) o PD cercana; badge en la tabla |
| **Tipo**                        | Monofocal, bifocal, progresivo, etc.                              |
| **Profesional**                 | Oftalmólogo o tecnólogo médico que prescribe                      |
| **Fecha emisión / vencimiento** | Para control de vigencia y alertas de fidelización                |

---

## 8. Notas de implementación

- **Filtro por sucursal:** Si el usuario tiene sucursal asignada, solo ve recetas de esa sucursal. Super admin con vista "global" ve todas las sucursales de la organización.
- **Sin botón "Nueva receta" en el Libro:** La creación se hace desde CRM o POS. El Libro es vista de consulta, auditoría y exportación.
- **Exportación:** Respeta los filtros de fecha y sucursal activos. Formatos: CSV y XLSX (Excel).
- **Eliminación:** Usa el endpoint `DELETE /api/admin/customers/[id]/prescriptions/[prescriptionId]`. No se puede deshacer.
