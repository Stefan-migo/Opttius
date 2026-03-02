# Flujo de Punto de Venta (POS) – Vista del Usuario

## 1. Contexto en la vida real (Chile)

El **Punto de Venta (POS)** es el terminal donde la óptica registra todas las ventas: armazones, cristales, lentes de contacto, accesorios, lentes de sol y servicios. En Chile, el flujo típico incluye:

- **Venta directa**: El cliente paga en caja (efectivo, tarjeta, transferencia).
- **Venta con trabajo de laboratorio**: Marco + lentes requieren montaje; se crea una **orden de trabajo (OT)** que va al taller.
- **Venta desde presupuesto**: El vendedor cargó un presupuesto previamente; lo trae al POS y cobra.
- **Venta con convenio**: El trabajador paga solo el **copago** (ej. 20%); la empresa paga el resto.
- **Caja**: Antes de vender, el vendedor debe **abrir la caja** con un monto inicial; al cierre del día, **cierra la caja** y concilia efectivo y datáfono.

**Ejemplos concretos:**

- **Óptica Centro Santiago**: Vendedor abre caja con $50.000 de fondo. Cliente compra lentes de sol por $89.900. Paga con tarjeta. Se emite boleta electrónica.
- **Cliente con presupuesto**: María tiene un presupuesto por marco + cristales progresivos. El vendedor carga el presupuesto al POS, confirma datos y cobra. Se crea la OT para el laboratorio.
- **Trabajador de Minera Escondida**: Convenio 20% copago. Compra armazón + lentes por $250.000. Paga $50.000 (copago) en caja. El saldo institucional ($200.000) queda pendiente de cobro a la empresa.

**Problemas que resuelve el módulo:**

- Registrar ventas con trazabilidad (orden, pagos, sesión de caja).
- Crear órdenes de trabajo automáticamente cuando hay marco + lentes.
- Gestionar caja (apertura, cierre, conciliación).
- Integrar con presupuestos, convenios, inventario y facturación SII (boletas, facturas).

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Abrir la caja (obligatorio antes de vender)

1. Ir a **Caja** (enlace desde el header del POS o desde **Órdenes** → Caja).
2. Seleccionar la **sucursal** (si hay varias).
3. Si la caja está cerrada, ver el botón **Abrir Caja**.
4. Ingresar el **monto inicial** (ej. $50.000) — efectivo con el que se inicia el día.
5. Clic en **Abrir Caja**: se crea la sesión de caja y queda abierta.

**Qué ve el usuario:** Pantalla de Caja con estado (abierta/cerrada). Si está cerrada, formulario con monto inicial. Al abrir, mensaje de éxito y el POS permite ventas.

**Importante:** Sin caja abierta, el POS bloquea el botón **Cobrar** y muestra un aviso para ir a abrir la caja.

---

### Paso 2: Venta simple (accesorios, lentes de sol, productos físicos)

1. Ir a **Punto de Venta** (`/admin/pos`).
2. Buscar el producto por **nombre**, **SKU** o **código de barras** (input con escáner).
3. Agregar al carrito (clic o Enter).
4. (Opcional) Seleccionar **cliente** si se desea vincular la venta.
5. Seleccionar **método de pago**: efectivo, débito, crédito o transferencia.
6. Si es efectivo: ingresar monto recibido; el sistema calcula el vuelto.
7. Clic en **Cobrar**.
8. Se procesa la venta: se crea la orden, se reduce el stock, se emite boleta (si está configurado).
9. Opción de **imprimir recibo** (térmico 80mm o A4).

**Qué ve el usuario:** Carrito con items, totales, selector de pago. Diálogo de pago con método y monto. Recibo o boleta al finalizar.

---

### Paso 3: Venta con marco + lentes (orden de trabajo)

1. En el POS, agregar al carrito:
   - **Marco**: buscar por nombre/SKU o seleccionar "Marco manual" si no está en inventario.
   - **Lentes**: seleccionar familia de lentes, tipo (monofocal, progresivo, bifocal), material.
   - **Tratamientos** (opcionales): antirreflejo, fotocromático, etc.
   - **Mano de obra** (montaje): se agrega automáticamente según configuración.
2. Seleccionar **receta** del cliente (obligatorio para lentes con graduación).
3. El sistema calcula el precio del lente según la **matriz de precios** (esfera, cilindro, adición).
4. Si hay **presbicia** (dos lentes separados): elegir solución (progresivo, bifocal, dos lentes separados) y completar datos de lejos y cerca.
5. **Cliente obligatorio**: debe estar seleccionado para crear la orden de trabajo.
6. Procesar el pago como en venta simple.
7. Si el pago es **menor al depósito mínimo** configurado: la OT queda en estado **on_hold_payment** (no visible en taller hasta abonar).
8. Si el pago es suficiente: la OT pasa a **ordered** y aparece en **Trabajos** para el laboratorio.

**Qué ve el usuario:** Formulario expandido con receta, familia de lentes, presbicia, tratamientos. Total calculado. Al cobrar, se crea la orden y la OT.

---

### Paso 4: Cargar presupuesto al POS

1. En el POS, clic en **Cargar presupuesto** (o llegar con `?quote=<uuid>` en la URL).
2. Buscar el presupuesto por **número**, **cliente** o **fecha**.
3. Seleccionar el presupuesto de la lista.
4. Clic en **Cargar**: los items del presupuesto (marco, lentes, tratamientos, mano de obra) se agregan al carrito.
5. El **cliente** y la **receta** se asocian automáticamente si estaban en el presupuesto.
6. Revisar y ajustar si es necesario; luego procesar el pago normalmente.

**Qué ve el usuario:** Diálogo con lista de presupuestos del cliente. Al cargar, el carrito se llena con los items. Puede editar cantidades o precios antes de cobrar.

---

### Paso 5: Venta con convenio (copago institucional)

1. En el POS, antes de cobrar, seleccionar **Convenio** y **Orden de compra (OC)** en los selectores.
2. Agregar productos al carrito (marco, lentes, etc.).
3. El sistema calcula automáticamente:
   - **Copago** (ej. 20%): lo que paga el trabajador en caja.
   - **Saldo institucional** (ej. 80%): lo que paga la empresa.
4. El trabajador paga solo el **copago** (efectivo, tarjeta, etc.).
5. Al procesar: se crea la orden con `copago_amount` e `institutional_amount`.
6. El saldo institucional queda pendiente de cobro en **Convenios** → Cobranza pendiente.

**Qué ve el usuario:** Selectores de convenio y OC. Total dividido en "A pagar (copago)" e "Institucional (pendiente)". Solo se cobra el copago.

---

### Paso 6: Pagos parciales y saldos pendientes

1. Si el cliente paga un **monto menor al total** (ej. abono inicial):
   - En el diálogo de pago, activar **Pago parcial** e ingresar el monto del abono.
   - El saldo queda pendiente.
2. Para **abonar** a una orden con saldo pendiente:
   - En el POS, clic en **Saldos pendientes**.
   - Buscar la orden por número, cliente o RUT.
   - Seleccionar la orden y ver el monto pendiente.
   - Ingresar monto a abonar, método de pago y referencia fiscal.
   - Clic en **Registrar abono**.
3. Al saldar el total: la orden pasa a `payment_status = paid`.

**Qué ve el usuario:** Diálogo de saldos pendientes con tabla de órdenes. Formulario de abono con monto y método. Comprobante de abono imprimible.

---

### Paso 7: Cerrar la caja (fin del día)

1. Ir a **Caja** (`/admin/cash-register`).
2. Clic en **Cerrar Caja**.
3. El sistema muestra un **resumen del día**:
   - Ventas totales (efectivo, débito, crédito, transferencia).
   - Efectivo esperado (apertura + ventas en efectivo).
4. Ingresar:
   - **Efectivo contado**: monto físico en caja.
   - **Total débito** y **Total crédito** del datáfono (para conciliar).
   - **Notas** o **discrepancias** (opcional).
5. Clic en **Cerrar Caja**: se cierra la sesión y se crea el registro de cierre.
6. Si se cerró por error: **Reabrir** (solo admin) para continuar vendiendo el mismo día.

**Qué ve el usuario:** Resumen con totales, formulario de conciliación. Al cerrar, la caja queda cerrada y no se pueden hacer ventas hasta abrir de nuevo.

---

### Paso 8: Devoluciones (reembolsos)

1. Desde el POS o desde **Órdenes**, seleccionar la orden a devolver.
2. Abrir el **diálogo de devolución** (Reembolsar).
3. Indicar **cantidad** a devolver por cada item (o todos).
4. Ingresar **motivo** de la devolución.
5. Seleccionar **método de reembolso** (efectivo, tarjeta, etc.).
6. Confirmar: se procesa el reembolso y se genera nota de crédito (si aplica SII).

**Qué ve el usuario:** Diálogo con items de la orden, cantidades editables, motivo y método. Confirmación y mensaje de éxito.

---

## 3. Diagrama simplificado

```
[Vendedor] Abre caja (monto inicial) → [Sistema] Sesión abierta
        ↓
[Cliente] Llega a óptica → [Vendedor] POS: busca producto / carga presupuesto
        ↓
[Vendedor] Agrega items al carrito (marco, lentes, accesorios)
        ↓
[Vendedor] Selecciona cliente (si OT) + receta (si lentes) + convenio (si aplica)
        ↓
[Vendedor] Cobra: método de pago, monto
        ↓
[Sistema] Crea orden + order_payments + (lab_work_order si marco+lentes)
        ↓
[Sistema] Reduce stock + emite boleta/factura (SII)
        ↓
[Vendedor] Imprime recibo (opcional)
        ↓
[Fin del día] [Vendedor] Cierra caja: efectivo contado, datáfono, conciliación
        ↓
[Sistema] Cierra sesión, crea cash_register_closure
```

---

## 4. Tabla de actores

| Actor                     | Rol                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| **Vendedor**              | Abre caja, procesa ventas en el POS, carga presupuestos, cobra copagos, imprime recibos.    |
| **Admin óptica**          | Configura POS (depósito mínimo, boletas), cierra/reabre caja, revisa cierres y movimientos. |
| **Cliente**               | Paga en caja (efectivo, tarjeta, transferencia); recibe recibo o boleta.                    |
| **Trabajador (convenio)** | Paga solo el copago; el saldo lo paga la empresa.                                           |
| **Laboratorio**           | Recibe las OT creadas desde el POS (marco + lentes) y las procesa.                          |

---

## 5. Integraciones

| Módulo                      | Integración                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Caja (Cash Register)**    | Caja abierta obligatoria para ventas. Cada pago se vincula a la sesión de caja. Cierre diario con conciliación. |
| **Presupuestos**            | Cargar presupuesto al carrito vía `load-to-pos`. Items, cliente y receta se transfieren.                        |
| **Convenios**               | Selector de convenio y OC. Cálculo de copago e institucional. Saldo pendiente en módulo Convenios.              |
| **Trabajos de laboratorio** | Creación automática de OT cuando hay marco + lentes. Estado según depósito (on_hold_payment / ordered).         |
| **CRM (Clientes)**          | Búsqueda de clientes en el POS. Cliente obligatorio si hay work order.                                          |
| **Inventario**              | Reducción de stock en `product_branch_stock` al vender productos físicos.                                       |
| **Recetas**                 | Vinculación de receta en lens_data para trazabilidad y precio de lentes.                                        |
| **Billing (SII)**           | Emisión de boletas y facturas electrónicas. Notas de crédito en devoluciones.                                   |
| **Operativos en terreno**   | POS con `?field_operation_id=xxx`; ventas vinculadas al operativo; stock desde bodega móvil.                    |

---

## 6. Rutas y pantallas

| Ruta                                 | Descripción                                                 |
| ------------------------------------ | ----------------------------------------------------------- |
| `/admin/pos`                         | Punto de venta principal (carrito, búsqueda, pago).         |
| `/admin/pos?quote=<uuid>`            | POS con presupuesto precargado desde URL.                   |
| `/admin/pos?field_operation_id=<id>` | POS en modo operativo (bodega móvil).                       |
| `/admin/cash-register`               | Caja: abrir, cerrar, historial de cierres, órdenes del día. |
| `/admin/cash-register/[id]`          | Detalle de un cierre de caja (conciliación, movimientos).   |
| `/admin/cash-register/orders/[id]`   | Detalle de orden (desde Caja).                              |
| `/admin/system` (pestaña POS)        | Configuración: depósito mínimo, boletas, facturas.          |

---

## 7. Configuración POS (Sistema)

En **Sistema** → **Configuración POS y Boletas**:

- **Depósito mínimo (%)**: Porcentaje del total que debe pagar el cliente para liberar la OT en taller (ej. 50%).
- **Depósito mínimo ($)**: Monto fijo alternativo (opcional).
- **Boletas y facturas**: Configuración SII, folios, razón social, etc.

---

## 8. Notas de implementación

- **Caja obligatoria**: El POS verifica cada ~30 segundos si la caja está abierta. Si está cerrada, bloquea el botón Cobrar.
- **Branch obligatorio**: El usuario debe tener sucursal seleccionada (excepto super admin en vista global).
- **Cash-First**: Si el pago es menor al depósito mínimo, la OT queda `on_hold_payment` y no aparece en el taller hasta que se abone.
- **Marco del cliente**: Si `customer_own_frame: true`, el precio del marco es 0 pero se registra para la OT.
- **Presbicia**: Opciones: progresivo, bifocal, dos lentes separados (far + near).
- **Escáner de códigos de barras**: Input con foco; al escanear y Enter, se busca el producto por código.
