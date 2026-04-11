# Flujo de Productos e Inventario – Vista del Usuario

## 1. Contexto en la vida real (Chile)

Una óptica necesita mantener un **catálogo de productos** (armazones, lentes de lectura, accesorios, servicios) y controlar el **stock por sucursal**. El inventario es la base para:

- Saber qué productos hay disponibles en cada sucursal.
- Evitar vender productos sin stock o con stock insuficiente.
- Recibir alertas cuando el stock baja (ej. quedan 3 Ray-Ban Wayfarer en Providencia).
- Registrar recepciones de mercadería y ajustes (inventario físico, mermas).
- Integrar con el POS: al vender un armazón, el stock se descuenta automáticamente.
- Gestionar familias de lentes oftálmicos y de contacto (stock separado del catálogo de productos).

**Situaciones típicas:**

- **Nueva sucursal**: Se crean productos en el catálogo (compartido por toda la organización) y se asigna stock inicial por sucursal.
- **Recepción de pedido**: Llegan 50 armazones Ray-Ban RB2140. El admin ingresa a **Productos** → edita el producto → ajusta stock (+50) o usa **Operaciones Masivas** para varios productos.
- **Stock bajo**: El sistema muestra alertas cuando el stock disponible es menor o igual al umbral (ej. 5 unidades). El admin puede filtrar "Solo stock bajo" para priorizar reposición.
- **Venta en POS**: Al procesar una venta de un armazón, el stock se descuenta automáticamente de la sucursal seleccionada.
- **Operativo en terreno**: El stock se transfiere a la bodega móvil del operativo; las ventas descuentan de esa bodega, no de la sucursal.

**Problemas que resuelve el módulo:**

- Separar **catálogo** (datos maestros: nombre, precio, SKU, especificaciones) de **inventario** (cantidad por sucursal).
- Stock independiente por sucursal: Providencia puede tener 10 unidades y Las Condes 5 del mismo producto.
- Tipos de producto con reglas distintas: armazones y accesorios consumen stock; servicios y lentes oftálmicos no.
- Alertas de stock bajo configurables por producto/sucursal.
- Importación masiva desde CSV para cargar catálogo y stock inicial.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Ver catálogo e inventario (admin / vendedor)

1. Ir a **Productos** en el menú lateral (o **Control de Inventario**).
2. **Seleccionar sucursal** en el selector de sucursal (obligatorio para ver stock; si no se selecciona, aparece advertencia).
3. Ver pestañas: **Productos**, **Categorías**, **Familias Ópticas**, **Familias Contacto**.
4. En la pestaña **Productos**:
   - Tarjetas de resumen: Total productos, Stock bajo, etc.
   - Acciones rápidas: **Ver stock bajo** (filtra productos con stock ≤ umbral).
   - Filtros: búsqueda (nombre, SKU, marca, código de barras), categoría, estado (Activo/Borrador/Archivado), **Solo stock bajo**.
   - Vista: **Cuadrícula** o **Tabla**.
   - Listado: imagen, nombre, precio, stock disponible, estado, categoría.
5. Acciones por producto: **Editar**, **Ver detalle**, **Eliminar** (archivar).

### Paso 2: Agregar producto nuevo (admin)

1. Clic en **Agregar producto** (o desde la pestaña Productos).
2. Completar formulario por secciones:

   **Tipo de Producto y Categoría**
   - Tipo: Armazón, Lente, Accesorio o Servicio.
   - Categoría general (opcional).

   **Información Básica**
   - Nombre (obligatorio), slug (se genera automáticamente), descripción.

   **Precios e Inventario**
   - Precio (obligatorio).
   - Cantidad en stock (sucursal actual): stock inicial para la sucursal seleccionada.
   - Umbral de stock bajo (ej. 5): alerta cuando el disponible sea ≤ este valor.
   - El precio ya incluye IVA (checkbox).

   **Marca y Modelo** (si no es servicio)
   - Marca, fabricante, número de modelo.

   **Códigos de Identificación**
   - SKU (único por producto).
   - Código de barras (para escaneo en POS).

   **Imagen del Producto**
   - Subir imagen destacada.

   **Especificaciones del Armazón** (solo si tipo = Armazón)
   - Tipo (completo, media montura, aviador, etc.), material, forma, género, tamaño, color.
   - Medidas: ancho de lente, puente, largo de varilla (mm).
   - Características: bisagras de resorte, almohadillas ajustables, etc.

   **Especificaciones del Lente** (solo si tipo = Lente)
   - Tipo (lectura, sol, seguridad), material, índice, protección UV.
   - Filtro luz azul, fotocromático, disponible con receta.
   - Tratamientos y recubrimientos.

   **Garantía e Información Adicional**
   - Garantía (meses), requiere receta, personalizable.

3. Guardar como **Borrador** (revisar antes de publicar) o **Guardar Producto** (publicar activo).
4. El producto se crea en el catálogo y, si se indicó cantidad, se registra stock en `product_branch_stock` para la sucursal actual.

### Paso 3: Editar producto y ajustar stock (admin)

1. En la lista, clic en **Editar** del producto.
2. Modificar datos: nombre, precio, descripción, especificaciones, imagen, etc.
3. En la sección **Precios e Inventario**:
   - **Cantidad en stock**: establecer nueva cantidad o ajustar (+/-).
   - **Umbral de stock bajo**: cambiar el valor de alerta.
4. Guardar: se actualiza el producto y el stock en la sucursal actual.

### Paso 4: Operaciones masivas (admin)

1. Ir a **Productos** → **Operaciones Masivas** (o desde el menú de productos).
2. Filtrar productos: búsqueda, categoría, estado.
3. Seleccionar productos (checkbox por fila o "Seleccionar todos").
4. Elegir operación:
   - **Cambiar Estado**: Activo, Borrador, Archivado.
   - **Cambiar Categoría**: asignar categoría a varios productos.
   - **Ajustar Precios**: por porcentaje o monto fijo.
   - **Ajustar Inventario**: establecer cantidad o agregar/quitar (+/-).
   - **Duplicar Productos**: crear copias.
   - **Archivar Productos**: eliminación suave (recuperable).
   - **Eliminar Permanentemente**: eliminación irreversible.
5. Completar parámetros (ej. para inventario: tipo de ajuste y valor).
6. Aplicar: se ejecuta la operación sobre los productos seleccionados.

### Paso 5: Importar y exportar (admin)

**Exportar CSV**

1. En Operaciones Masivas, clic en **Exportar CSV**.
2. Se descarga un archivo con productos (nombre, precio, stock, categoría, estado, etc.).

**Importar CSV**

1. En Operaciones Masivas, clic en **Importar CSV**.
2. Seleccionar modo: Crear (solo nuevos), Actualizar (solo existentes), Crear/Actualizar (ambos).
3. Subir archivo CSV con columnas compatibles (nombre, descripción, precio, stock, estado, categoría, etc.).
4. Revisar resultados: creados, actualizados, omitidos, errores.

### Paso 6: Gestionar categorías (admin)

1. En **Productos**, pestaña **Categorías**.
2. Ver y editar categorías del catálogo (ej. Armazones, Lentes de Sol, Accesorios).
3. Las categorías se usan para filtrar y organizar productos.

### Paso 7: Familias de lentes oftálmicos y de contacto (admin)

1. En **Productos**, pestañas **Familias Ópticas** y **Familias Contacto**.
2. Las familias de lentes tienen stock en tablas separadas (`lens_families`, `contact_lens_families`).
3. Los lentes oftálmicos se montan en órdenes de trabajo; no consumen stock del catálogo de productos.
4. Crear/editar familias desde las pestañas o enlaces a `/admin/lens-families` y `/admin/contact-lens-families`.

### Paso 8: Venta en POS (vendedor) — integración automática

1. En el POS, al agregar un producto al carrito (armazón, accesorio con stock).
2. Al procesar la venta, el sistema:
   - Excluye productos sin stock físico (servicios, lentes oftálmicos, marcos manuales).
   - Obtiene la sucursal del contexto (obligatorio).
   - Reduce el stock en `product_branch_stock` para esa sucursal.
3. El vendedor no hace nada manual: el stock se actualiza solo.

---

## 3. Diagrama simplificado

```
[Admin] Crea producto + stock inicial (sucursal actual)
        ↓
[Sistema] products INSERT + product_branch_stock INSERT/update_product_stock
        ↓
[Admin] Edita producto / Ajusta stock / Operaciones masivas
        ↓
[Vendedor] POS: agrega producto al carrito → Procesa venta
        ↓
[Sistema] update_product_stock(product_id, branch_id, -quantity)
        ↓
[product_branch_stock] quantity -= quantity
        ↓
[Admin] Filtra "Solo stock bajo" → Ve alertas → Repone stock
```

---

## 4. Tabla de actores

| Actor            | Rol                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Admin óptica** | Crea/edita productos, ajusta stock, operaciones masivas, importa/exporta CSV, gestiona categorías y familias de lentes. |
| **Vendedor**     | Consulta catálogo y stock; las ventas en POS descuentan stock automáticamente.                                          |
| **Cliente**      | No interactúa directamente con el inventario; ve disponibilidad implícita en presupuestos y ventas.                     |
| **Sistema**      | Actualiza stock en ventas POS, operativos en terreno y ajustes manuales.                                                |

---

## 5. Integraciones

| Módulo                      | Integración                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **POS**                     | Al procesar venta, reduce stock de productos con `product_id` real (excluye frame-manual, lens-, treatments-, labor-, discount-). Excluye `product_type = service`. Usa sucursal del contexto. |
| **Operativos en Terreno**   | Stock móvil en `operativo_mobile_stock`; transferencia desde `product_branch_stock`; ventas del operativo descuentan del stock móvil.                                                          |
| **Presupuestos**            | Pueden reservar stock (reserved_quantity) para presupuestos pendientes (según implementación).                                                                                                 |
| **Trabajos de Laboratorio** | Lentes oftálmicos se montan en OT; stock en `lens_families`, no en `products`. Marcos manuales no tienen product_id.                                                                           |
| **Dashboard**               | Muestra alertas de stock bajo y KPIs de inventario.                                                                                                                                            |
| **Categorías**              | Filtran y organizan productos; se gestionan en la pestaña Categorías.                                                                                                                          |

---

## 6. Rutas y pantallas

| Ruta                           | Descripción                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `/admin/products`              | Listado principal con pestañas: Productos, Categorías, Familias Ópticas, Familias Contacto.             |
| `/admin/products/add`          | Formulario de alta de producto (tipo, datos básicos, precios, stock inicial, especificaciones ópticas). |
| `/admin/products/edit/[id]`    | Formulario de edición de producto y ajuste de stock.                                                    |
| `/admin/products/[slug]`       | Detalle del producto (vista pública o admin).                                                           |
| `/admin/products/bulk`         | Operaciones masivas: filtros, selección, exportar CSV, importar CSV, ajustes masivos.                   |
| `/admin/products/options`      | Opciones de producto (tipos, materiales, formas, etc.).                                                 |
| `/admin/lens-families`         | Familias de lentes oftálmicos.                                                                          |
| `/admin/contact-lens-families` | Familias de lentes de contacto.                                                                         |

---

## 7. Tipos de producto y reglas de stock

| Tipo                      | Consume stock en product_branch_stock | Notas                                                         |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| **Armazón (frame)**       | Sí                                    | Marcos físicos; stock por sucursal.                           |
| **Accesorio (accessory)** | Sí                                    | Fundas, líquidos, lentes de sol.                              |
| **Lente (lens)**          | No\*                                  | \*Lentes oftálmicos: stock en lens_families; se montan en OT. |
| **Servicio (service)**    | No                                    | Mano de obra, consultas.                                      |

**Productos sin stock físico (IDs temporales):**

- `frame-manual-*`: Marco ingresado manualmente en POS.
- `lens-*`: Lente oftálmico (familia).
- `treatments-*`: Tratamientos.
- `labor-*`: Mano de obra.
- `discount-*`: Descuentos.
- `contact-lens-*`: Lentes de contacto (pueden tener stock según implementación).

---

## 8. Consideraciones técnicas (para referencia)

- **Catálogo vs inventario**: `products` = datos maestros; `product_branch_stock` = cantidad por sucursal.
- **Sucursal obligatoria**: Para crear/actualizar stock, el usuario debe tener sucursal seleccionada (salvo super admin).
- **RPC**: `update_product_stock(product_id, branch_id, quantity_change, reserve)` para cambios de stock.
- **Stock disponible**: `available_quantity = quantity - reserved_quantity`.
- **Umbral de alerta**: `low_stock_threshold` configurable por producto/sucursal (default 5).
