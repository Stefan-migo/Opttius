# Flujo de Presupuestos – Vista del Usuario

## 1. Contexto en la vida real (Chile)

En una óptica, el **presupuesto** (cotización) es el documento que formaliza la oferta de un trabajo de lentes al cliente. El flujo típico es:

- El cliente llega con una **receta** del oftalmólogo o optometrista.
- El vendedor o admin busca un **marco** (armazón) en inventario o el cliente trae el suyo.
- Se selecciona la **familia de lentes** (monofocales, progresivos, bifocales, etc.) según la receta y preferencias.
- Se agregan **tratamientos** (anti-reflejante, filtro luz azul, etc.).
- El sistema calcula el precio según matrices de lentes, labor y IVA (19% Chile).
- El presupuesto se envía al cliente (email o impreso) o se carga directo al POS para cerrar la venta.

**Ejemplos concretos:**

- **María González** (RUT 12.345.678-9): Receta con presbicia (+2.00 adición). Presupuesto con lentes progresivos, marco Ray-Ban, anti-reflejante. Total $185.000.
- **Juan Pérez**: Trae su marco. Solo necesita recambio de cristales. Presupuesto con lente monofocal 1.67, filtro luz azul. Marco = $0.
- **Operativo Minera**: Presupuesto creado desde el operativo en terreno, vinculado a la bodega móvil.

**Problemas que resuelve el módulo:**

- Centralizar cotizaciones con receta, marco, lentes y tratamientos en un solo lugar.
- Calcular precios automáticamente según esfera, cilindro, adición y matrices de lentes.
- Soportar soluciones de presbicia: dos lentes separados, bifocales, trifocales, progresivos.
- Enviar presupuestos por email al cliente.
- Cargar presupuestos al POS para cerrar la venta sin reingresar datos.
- Convertir presupuestos aceptados en órdenes de trabajo de laboratorio.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Configurar presupuestos (admin, una vez)

1. Ir a **Presupuestos** → **Configuración**.
2. En la pestaña **General**:
   - **Mano de obra por defecto** (ej. $25.000)
   - **Porcentaje IVA** (19% Chile)
   - **Días de validez** (ej. 30 días)
   - Indicar si labor, lentes y tratamientos ya incluyen IVA
3. En **Tratamientos**: Precios por tratamiento (anti-reflejante, filtro luz azul, UV, etc.) y activar/desactivar cada uno.
4. En **Descuentos**: Descuentos por volumen (ej. 5% si monto ≥ $150.000).
5. En **Términos**: Términos y condiciones por defecto y plantilla de notas.
6. Guardar: la configuración se aplica a los nuevos presupuestos de la sucursal (o global si es super admin).

**Qué ve el usuario:** Formulario con pestañas. Cambios sin guardar se indican con alerta amarilla.

---

### Paso 2: Crear presupuesto (admin/vendedor)

1. Ir a **Presupuestos** → **Nuevo Presupuesto** (o desde perfil del cliente o desde operativo en terreno).
2. **Buscar y seleccionar cliente** (búsqueda por nombre, email, RUT).
3. **Seleccionar receta** (obligatoria para lentes graduados). Si no hay, crear una desde el CRM.
4. **Marco**:
   - Seleccionar producto del inventario (armazón) **o**
   - Marcar "Cliente trae marco" → precio marco = $0
5. **Lentes**:
   - Familia de lentes (ej. Essilor Varilux)
   - Tipo: monofocal, bifocal, trifocal, progresivo, lectura, computador, deporte
   - Material e índice
   - Tratamientos (anti-reflejante, filtro luz azul, etc.)
6. **Presbicia** (si aplica):
   - **Ninguna**: un solo par
   - **Dos lentes separados**: marco lejos + marco cerca (o cliente trae marco de cerca)
   - **Bifocal / Trifocal / Progresivo**: según receta
7. **Lentes de contacto** (si aplica): Familia, cantidad, Rx OD/OS.
8. El sistema calcula: marco + lentes + tratamientos + labor + IVA − descuentos.
9. Opcional: notas internas, notas para el cliente, descuento manual.
10. Guardar como **Borrador** o **Enviar** (cambia estado a Enviado).

**Qué ve el usuario:** Formulario extenso con secciones colapsables. Cálculo en tiempo real. Número de presupuesto generado automáticamente (COT-2025-0001).

---

### Paso 3: Gestionar presupuestos en la lista (admin/vendedor)

1. Ir a **Presupuestos**.
2. **Filtros**: Estado (Borrador, Enviado, Aceptado, Rechazado, Expirado, Convertido) y búsqueda por número, cliente, email o marco.
3. **Acciones por presupuesto**:
   - **Ver**: ir al detalle
   - **Cargar al POS**: ir al POS con el presupuesto precargado (solo si no está aceptado ni convertido)
   - **Eliminar**: solo si no está aceptado ni convertido
4. **Cambiar estado** (selector en la fila): Borrador ↔ Enviado ↔ Aceptado ↔ Rechazado ↔ Expirado. No se puede cambiar si ya está convertido.
5. Los presupuestos **expirados** se marcan automáticamente según la fecha de validez configurada.

**Qué ve el usuario:** Tabla con número, cliente, marco, lente, total, estado, fecha y fecha de expiración. Paginación.

---

### Paso 4: Detalle del presupuesto (admin/vendedor)

1. Clic en **Ver** en un presupuesto.
2. **Pestañas**:
   - **Resumen**: Cliente, receta, marco(s), lente(s), total
   - **Detalles**: Receta completa (OD/OS), detalles del marco, lente, tratamientos
   - **Precios**: Desglose (marco, lente, tratamientos, labor, IVA, descuento, total)
3. **Acciones**:
   - **Cargar al POS**: Redirige al POS con el presupuesto cargado en el carrito
   - **Enviar Presupuesto**: Diálogo para enviar por email (usa email del cliente o uno ingresado)
   - **Imprimir**: Abre ventana de impresión con el presupuesto formateado
   - **Ver Trabajo**: Si ya fue convertido, enlace al trabajo de laboratorio
4. Si el presupuesto está convertido, no se puede cargar al POS ni cambiar estado.

**Qué ve el usuario:** Página con header (número, cliente, estado), botones de acción y tres pestañas con la información completa.

---

### Paso 5: Enviar presupuesto por email (admin/vendedor)

1. En el detalle del presupuesto, clic en **Enviar Presupuesto**.
2. Si el cliente tiene email, se muestra por defecto; si no, se debe ingresar.
3. Confirmar envío: el presupuesto se envía y el estado pasa a **Enviado** (si estaba en Borrador).
4. El cliente recibe el email con el detalle del presupuesto.

**Qué ve el usuario:** Diálogo con campo de email y botón Enviar. Toast de éxito.

---

### Paso 6: Cargar presupuesto al POS y cerrar venta (vendedor)

1. Desde la lista o detalle, clic en **Cargar al POS**.
2. Se redirige al **Punto de Venta** con el presupuesto precargado:
   - Cliente seleccionado
   - Carrito con items: marco, lente(s), tratamientos, labor
   - Totales calculados
3. El vendedor puede ajustar cantidades o agregar productos antes de procesar.
4. Al **procesar la venta**, el sistema:
   - Crea la orden de venta
   - Crea la orden de trabajo (OT) de laboratorio vinculada al presupuesto
   - Actualiza el presupuesto: `converted_to_work_order_id` y estado
   - Descuenta stock del inventario

**Qué ve el usuario:** POS con carrito lleno. Proceso de pago normal (efectivo, tarjeta, etc.). Al finalizar, el presupuesto queda "convertido" y se puede ver la OT desde el detalle.

---

### Paso 7: Convertir a orden de trabajo (sin venta directa)

En algunos flujos (ej. cliente paga después, convenio institucional), el presupuesto se puede convertir directamente en orden de trabajo sin pasar por el POS:

1. El endpoint `POST /api/admin/quotes/[id]/convert` crea la OT desde el presupuesto.
2. El presupuesto queda vinculado a la OT y con estado aceptado.
3. La OT se gestiona desde **Trabajos de Laboratorio**.

**Nota:** En la UI actual, la conversión directa se realiza típicamente vía POS (Paso 6). La conversión sin venta puede usarse desde integraciones o flujos específicos.

---

### Paso 8: Presupuestos desde operativo en terreno (admin/vendedor)

1. Ir a **Operativos en Terreno** → [Operativo] → **Clientes**.
2. Clic en **Nuevo presupuesto** para un cliente del operativo.
3. El presupuesto se crea con `field_operation_id` vinculado.
4. En la lista de presupuestos, si se accede con `?field_operation_id=...`, se filtran solo los del operativo.
5. Al cargar al POS desde el operativo, la venta y la OT se vinculan al operativo (stock móvil).

**Qué ve el usuario:** Banner "Presupuestos del operativo: [nombre]" y enlace para volver al operativo.

---

## 3. Diagrama simplificado

```
[Admin] Configura presupuestos (labor, IVA, tratamientos, validez)
                              ↓
[Admin/Vendedor] Crea presupuesto: cliente + receta + marco + lentes + tratamientos
                              ↓
[Sistema] Calcula precios (matrices, labor, IVA) → Número COT-YYYY-NNNN
                              ↓
[Admin/Vendedor] Envía por email O Imprime O Carga al POS
                              ↓
[Cliente] Recibe presupuesto, decide
                              ↓
[Vendedor] Carga al POS → Procesa venta
                              ↓
[Sistema] Crea orden + OT, actualiza presupuesto (convertido), descuenta stock
                              ↓
[Admin] Gestiona OT en Trabajos de Laboratorio
```

---

## 4. Tabla de actores

| Actor                        | Rol                                                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin óptica**             | Configura presupuestos (labor, IVA, tratamientos, descuentos), crea presupuestos, envía por email, imprime, carga al POS, convierte, elimina borradores. |
| **Vendedor**                 | Crea presupuestos, envía, imprime, carga al POS y procesa ventas.                                                                                        |
| **Cliente**                  | Recibe presupuesto por email o impreso, decide aceptar o rechazar.                                                                                       |
| **Optometrista/Oftalmólogo** | Emite la receta que se vincula al presupuesto (fuera del sistema).                                                                                       |

---

## 5. Integraciones

| Módulo                      | Integración                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------- |
| **CRM**                     | Cliente obligatorio; recetas del cliente; crear presupuesto desde perfil del cliente. |
| **Libro de Recetas**        | Receta vinculada al presupuesto; validación cliente-receta.                           |
| **Inventario**              | Marco desde productos; stock se descuenta al procesar venta en POS.                   |
| **POS**                     | Carga presupuesto al carrito; process-sale crea OT y actualiza presupuesto.           |
| **Trabajos de Laboratorio** | Presupuesto convertido genera OT; enlace desde detalle del presupuesto.               |
| **Operativos en Terreno**   | Presupuestos vinculados al operativo; filtro por operativo; stock móvil.              |
| **Convenios**               | Si la venta en POS usa convenio, el presupuesto puede heredar contexto de convenio.   |

---

## 6. Rutas de referencia

| Acción                    | Ruta admin                                              |
| ------------------------- | ------------------------------------------------------- |
| Listado presupuestos      | `/admin/quotes`                                         |
| Nuevo presupuesto         | Diálogo desde `/admin/quotes` (botón Nuevo Presupuesto) |
| Detalle presupuesto       | `/admin/quotes/[id]`                                    |
| Configuración             | `/admin/quotes/settings`                                |
| Cargar al POS             | `/admin/pos?quoteId=[id]`                               |
| Presupuestos de operativo | `/admin/quotes?field_operation_id=[id]`                 |

---

## 7. Estados del presupuesto

| Estado         | Descripción           | Acciones permitidas                                |
| -------------- | --------------------- | -------------------------------------------------- |
| **Borrador**   | Editable, no enviado  | Editar, enviar, cargar al POS, convertir, eliminar |
| **Enviado**    | Enviado al cliente    | Cargar al POS, convertir, reenviar, cambiar estado |
| **Aceptado**   | Cliente aceptó        | Convertir a OT (si no convertido)                  |
| **Rechazado**  | Cliente rechazó       | Solo visualización                                 |
| **Expirado**   | Pasó fecha de validez | Solo visualización (automático)                    |
| **Convertido** | Vinculado a OT        | Solo visualización; enlace a la OT                 |

---

## 8. Notas de implementación

- **Número de presupuesto**: Formato `COT-YYYY-NNNN` (ej. COT-2025-0001). Secuencial por año. Generado por RPC `generate_quote_number()`.
- **Expiración automática**: Al listar presupuestos, se ejecuta `check_and_expire_quotes`; los que superan la fecha de validez pasan a "Expirado".
- **Prescripción obligatoria**: Para lentes graduados (ópticos), la receta es obligatoria. La receta debe pertenecer al mismo cliente.
- **Marco del cliente**: `customer_own_frame = true` → precio marco = $0, no se descuenta stock.
- **Presbicia two_separate**: Marco lejos + marco cerca (o cliente trae marco cerca). Se soporta en create, load-to-pos y convert.
- **Filtro por sucursal**: Si el usuario tiene sucursal seleccionada, solo ve presupuestos de esa sucursal. Super admin con vista global ve todos.
