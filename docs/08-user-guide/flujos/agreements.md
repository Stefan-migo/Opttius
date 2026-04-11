# Flujo de Convenios – Vista del Usuario

## 1. Contexto en la vida real (Chile)

Una óptica firma un convenio con una empresa (ej. minera, banco), un sindicato o una mutual. El acuerdo típico es:

- El trabajador paga un **copago** (ej. 20%) en la óptica al momento de la compra.
- La empresa/sindicato paga el **resto** (ej. 80%).
- La empresa emite **órdenes de compra (OC)** para autorizar cada compra del trabajador.
- El descuento del trabajador se hace por **planilla** (RR.HH. descuenta del sueldo).
- Cuando la institución paga a la óptica, el admin **concilia** las ventas y puede generar una **factura institucional** agrupada.

**Ejemplos concretos:**

- **Minera Escondida Ltda.** (RUT 96.573.210-5): Convenio empresa, 20% copago, OC obligatoria.
- **Sindicato de Profesores**: Convenio sindicato, 15% copago, descuento por planilla.
- **Mutual de Seguridad**: Convenio mutual, cobertura según plan.

**Problemas que resuelve el módulo:**

- Centralizar convenios, OC y cobranza institucional en un solo lugar.
- Evitar errores de cálculo entre copago e institucional.
- Exportar planilla para que RR.HH. procese el descuento del sueldo.
- Conciliar cobranza masiva cuando la institución paga (transferencia, cheque).
- Generar facturas agrupadas a la institución al conciliar.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Configurar el convenio (admin)

1. Ir a **Convenios** → **Nuevo convenio**.
2. Completar:
   - **Nombre del convenio** (ej. "Minera X - Sucursal Centro")
   - **Tipo**: Empresa, Sindicato o Mutual
   - **Razón social institucional** (ej. "Minera Escondida Ltda.")
   - **RUT institucional** (formato automático: 12.345.678-9)
   - **Contacto**: nombre, email, teléfono (RR.HH. o sindicato)
   - **Vigencia**: desde / hasta (hasta opcional = indefinido)
   - **% Copago**: porcentaje que paga el trabajador en el POS (ej. 20)
   - **% Descuento** (opcional): descuento sobre precio lista
   - **Notas** (opcional)
3. Guardar: el convenio queda **activo** y visible en el detalle.

**Qué ve el usuario:** Formulario con campos agrupados. Al guardar, redirige al detalle del convenio.

---

### Paso 2: Registrar órdenes de compra (OC)

1. En el detalle del convenio, ir a la sección **Órdenes de compra**.
2. Clic en **Registrar OC** (o ir a `/admin/agreements/[id]/purchase-orders/new`).
3. Completar:
   - **Número OC** (ej. "OC-2025-001234")
   - **Fecha emisión** (opcional)
   - **Vigencia hasta** (opcional)
   - **Monto máximo** (opcional): límite autorizado por la empresa
   - **Notas** (opcional)
4. Guardar: la OC queda **activa** y disponible en el POS.

**Qué ve el usuario:** Lista de OC con estado, monto usado y máximo. Botón para registrar nueva OC.

---

### Paso 3: Venta en el POS (vendedor)

1. En el **Punto de Venta**, al iniciar una venta, seleccionar **Convenio** y **Orden de compra (OC)**.
2. Agregar productos al carrito (armazones, cristales, lentes de contacto).
3. El sistema calcula automáticamente:
   - **Copago** (ej. 20%): lo que paga el trabajador en caja
   - **Saldo institucional** (ej. 80%): lo que paga la empresa
4. El trabajador paga solo el copago (efectivo, tarjeta, etc.).
5. Se genera la orden con `copago_amount` e `institutional_amount`.
6. Se crea un **balance institucional pendiente** por el monto a cargo de la institución.

**Qué ve el usuario:** POS con selector de convenio y OC. Total dividido en copago (a pagar) e institucional (pendiente de cobro).

---

### Paso 4: Cobranza pendiente y conciliación (admin)

1. Ir a **Convenios** → [Convenio] → **Cobranza pendiente** (o botón "Ver detalle" en la card de cobranza).
2. Ver la lista de ventas institucionales **pendientes de pago** (orden, cliente, monto, fecha).
3. Seleccionar los balances a conciliar (checkbox por fila o "Seleccionar todos").
4. Clic en **Conciliar seleccionados**.
5. En el diálogo:
   - **Referencia de pago** (ej. "Transferencia Nº 12345", "Cheque 001")
   - **Generar factura a institución** (checkbox, por defecto activado)
6. Confirmar: los balances pasan a **pagado** y, si se marcó, se genera una **factura institucional** agrupada.

**Qué ve el usuario:** Tabla con total pendiente, checkboxes, botón de conciliar. Diálogo con referencia y opción de factura. Toast de éxito con folio de factura si se generó.

---

### Paso 5: Facturas a institución (admin)

1. En el detalle del convenio, ver la card **Facturas a institución**.
2. Lista de facturas emitidas: folio (FAC-INST-000001), fecha, monto, estado.
3. Acciones por factura:
   - **Ver**: ir al detalle de la factura
   - **Descargar**: abrir el PDF/HTML de la factura
4. Clic en **Ver todas** para ir a la lista completa de facturas del convenio.
5. En el detalle de factura: datos de la institución, período, items (órdenes incluidas), totales, botón **Descargar PDF**.

**Qué ve el usuario:** Card con tabla de últimas facturas. Página de listado con filtros. Página de detalle con items y totales.

---

### Paso 6: Exportar planilla (admin)

1. En el detalle del convenio, clic en **Export planilla**.
2. Se descarga un archivo (CSV/Excel) con:
   - RUT trabajador
   - Nombre
   - Monto a descontar
   - Número de orden
   - Fecha de compra
3. RR.HH. de la empresa procesa el archivo en su sistema de nómina para descontar del sueldo.

**Qué ve el usuario:** Botón que abre el archivo en nueva pestaña. Formato compatible con Libro de Remuneraciones Electrónico (LRE) o plantillas bancarias.

---

### Paso 7: Analítica y clientes del convenio (admin)

1. En el detalle del convenio, ver las cards de **analítica**:
   - Órdenes totales
   - Clientes únicos
   - Ventas totales
   - Eficiencia de cobranza (%)
2. Sección **Clientes del convenio**: tabla con clientes que han comprado bajo el convenio.
   - Nombre, RUT, órdenes, última compra, total copago, total institucional
   - Enlace para ver el detalle del cliente

**Qué ve el usuario:** KPIs en cards. Tabla de clientes con paginación.

---

## 3. Diagrama simplificado

```
[Admin] Crea convenio → [Admin] Registra OC
                              ↓
[Trabajador] Va a óptica → [Vendedor] POS: selecciona convenio + OC
                              ↓
[Sistema] Calcula copago (20%) + institucional (80%)
                              ↓
[Trabajador] Paga copago en caja
                              ↓
[Sistema] Crea balance institucional pendiente
                              ↓
[Admin] Export planilla → [RR.HH.] Descuenta del sueldo
                              ↓
[Empresa] Paga a óptica (transferencia/cheque)
                              ↓
[Admin] Conciliación: marca balances pagados + genera factura institucional
                              ↓
[Admin] Descarga factura PDF para enviar a institución
```

---

## 4. Tabla de actores

| Actor              | Rol                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Admin óptica**   | Crea convenios, registra OC, concilia cobranza, genera facturas institucionales, exporta planilla, revisa analítica. |
| **Vendedor**       | Elige convenio y OC en el POS, cobra solo el copago al trabajador.                                                   |
| **Trabajador**     | Cliente que paga el copago en el punto de venta.                                                                     |
| **RR.HH. empresa** | Recibe planilla de la óptica y descuenta del sueldo del trabajador.                                                  |
| **Empresa**        | Paga el saldo institucional a la óptica; recibe facturas agrupadas.                                                  |

---

## 5. Integraciones

| Módulo          | Integración                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------- |
| **POS**         | Selección de convenio y OC; cálculo de copago e institucional; creación de balances pendientes. |
| **CRM**         | Clientes vinculados al convenio; filtro por convenio; badge "Cliente convenio".                 |
| **Work Orders** | Orden de trabajo hereda `agreement_id` de la orden.                                             |
| **Billing**     | Factura institucional agrupada al conciliar; DTE con referencia a OC (si aplica SII).           |

---

## 6. Rutas de referencia

| Acción                   | Ruta admin                                      |
| ------------------------ | ----------------------------------------------- |
| Listado convenios        | `/admin/agreements`                             |
| Nuevo convenio           | `/admin/agreements/new`                         |
| Detalle convenio         | `/admin/agreements/[id]`                        |
| Registrar OC             | `/admin/agreements/[id]/purchase-orders/new`    |
| Cobranza pendiente       | `/admin/agreements/[id]/institutional-balances` |
| Facturas institucionales | `/admin/agreements/[id]/invoices`               |
| Detalle factura          | `/admin/agreements/[id]/invoices/[invoiceId]`   |

---

## 7. Notas de implementación

- **Filtros en listado**: Estado (activo, suspendido, expirado, cancelado) y tipo (empresa, sindicato, mutual).
- **Filtro por sucursal**: Si el usuario tiene sucursal asignada, solo ve convenios de esa sucursal o org-wide.
- **Factura institucional**: Se genera al conciliar con la opción "Generar factura a institución" activada. Folio: FAC-INST-000001 (secuencial por sucursal).
- **Export planilla**: Endpoint GET que devuelve archivo CSV/Excel para descarga directa.
