# Flujo de Trabajos de Laboratorio – Vista del Usuario

## 1. Contexto en la vida real (Chile)

En una óptica, cuando un cliente compra **marco + lentes graduados**, el trabajo requiere montaje en laboratorio. El flujo típico es:

- El cliente elige un armazón (ej. Ray-Ban RB5228) y lentes según su receta (ej. progresivos con antirreflejo).
- La óptica puede tener **laboratorio propio** (montaje en la misma sucursal) o **laboratorio externo** (envío a terceros).
- El trabajo pasa por estados: orden confirmada → enviado al lab → recibido → montado → control de calidad → listo para retiro → entregado.
- Si el cliente paga **menos del depósito mínimo**, el trabajo queda en **retención de pago** y no aparece en la vista de taller hasta que se cobre el saldo.
- Al entregar, el sistema **valida que no haya saldo pendiente** antes de permitir marcar como entregado.

**Ejemplos concretos:**

- **María González** (RUT 12.345.678-9): Compra marco Oakley + lentes progresivos. Paga 50% de seña en el POS. El trabajo TRB-2025-0042 se crea automáticamente y aparece en la lista de trabajos.
- **Juan Pérez** (convenio Minera): Presupuesto aceptado. Admin convierte a orden de trabajo desde la ficha del presupuesto. El trabajo se envía al Laboratorio Óptico Central (externo).
- **Cliente con marco propio**: Trae su armazón. Se registra como "marco del cliente" (costo 0). Solo se cobran lentes y montaje.

**Problemas que resuelve el módulo:**

- Seguimiento del ciclo completo: desde la venta hasta la entrega.
- Vista de taller: qué trabajos están en lab, listos para retiro o pendientes.
- Trazabilidad: historial de estados, receta al momento de crear, datos del laboratorio.
- Cash-First: evitar entregar trabajos con saldo pendiente.
- Integración con POS, presupuestos, CRM y recetas.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Crear el trabajo (orígenes)

**Los trabajos NO se crean manualmente desde la sección Trabajos.** Se crean automáticamente desde:

#### Opción A: Venta en el POS (vendedor)

1. Ir a **Punto de Venta**.
2. Seleccionar cliente, agregar **marco** y **lentes** al carrito (productos que requieren montaje).
3. Procesar la venta: el cliente paga (total, parcial o seña).
4. El sistema crea la **orden** y la **orden de trabajo** (ej. TRB-2025-0042).
5. Si el pago es menor al depósito mínimo: estado `on_hold_payment` (no visible en taller).
6. Si el pago es suficiente: estado `ordered` (visible en taller).

**Qué ve el usuario:** POS con carrito. Al confirmar venta, toast de éxito y el trabajo aparece en **Trabajos**.

#### Opción B: Conversión desde presupuesto (admin)

1. Ir a **Presupuestos** → abrir un presupuesto aceptado.
2. Clic en **Convertir a orden de trabajo**.
3. El sistema genera el número TRB-YYYY-NNNN y crea el trabajo con estado `ordered`.
4. El presupuesto queda vinculado al trabajo (`converted_to_work_order_id`).

**Qué ve el usuario:** Botón "Convertir a OT" en la ficha del presupuesto. Redirección al detalle del trabajo creado.

#### Opción C: Carga al POS desde presupuesto (vendedor)

1. En **Presupuestos**, clic en **Cargar al POS**.
2. El carrito se llena con los ítems del presupuesto (marco, lentes, etc.).
3. Procesar la venta en el POS como en la Opción A.
4. El trabajo se crea desde el POS y se vincula al presupuesto.

---

### Paso 2: Ver y filtrar trabajos (admin/vendedor)

1. Ir a **Trabajos** (`/admin/work-orders`).
2. Ver las **tarjetas de resumen**: Total Trabajos, En Laboratorio, Listos para Retiro, Entregados.
3. Usar **Buscar** por número (TRB-2025-0042), cliente, marco o laboratorio.
4. Filtrar por **Estado**: Presupuesto, Ordenado, Enviado al Lab, En Laboratorio, Listo en Lab, Recibido, Montado, Control Calidad, Listo para Retiro, Entregado, Cancelado.
5. La tabla muestra: Número, Cliente, Marco, Lente, Laboratorio, Estado, Pago, Total, Acciones (Ver, Eliminar).
6. Clic en **Ver** para abrir el detalle del trabajo.

**Qué ve el usuario:** Lista paginada con filtros. Búsqueda en tiempo real. Badges de estado y pago. Botón Ver para ir al detalle.

---

### Paso 3: Gestionar el flujo del trabajo (admin)

1. Abrir el **detalle del trabajo** (`/admin/work-orders/[id]`).
2. Ver el **timeline de flujo**: Presupuesto → Ordenado → Enviado al Lab → Recibido → Montado → Control Calidad → Listo para Retiro → Entregado.
3. El estado actual se marca con badge verde "ACTUAL".
4. Clic en **Cambiar Estado** para avanzar o corregir el estado.
5. Si se cambia a **Enviado al Lab**, completar:
   - **Nombre del laboratorio** (obligatorio)
   - Contacto, número de orden del lab, fecha estimada de entrega
6. Confirmar: el estado se actualiza y se registra en el historial.

**Qué ve el usuario:** Timeline interactivo (vertical en móvil, horizontal en desktop). Diálogo "Cambiar Estado" con selector y campos de laboratorio si aplica. Historial de estados en la pestaña Historial.

---

### Paso 4: Entregar el trabajo (admin)

1. Cuando el trabajo está en **Listo para Retiro**, clic en el paso "Entregado" del timeline o en **Cambiar Estado** → Entregado.
2. Se abre el diálogo **Entregar Trabajo**.
3. El sistema **verifica el saldo** de la orden asociada (si viene del POS):
   - Si hay **saldo pendiente**: muestra error con el monto y botón "Cobrar Saldo Pendiente" (redirige al POS).
   - Si **saldo = 0**: permite confirmar la entrega.
4. Clic en **Confirmar Entrega**: el trabajo pasa a estado `delivered`.
5. Se envía notificación al cliente (si está configurado).

**Qué ve el usuario:** Diálogo con mensaje de confirmación o alerta de saldo pendiente. Botón para ir al POS a cobrar si aplica.

---

### Paso 5: Imprimir orden para laboratorio (admin)

1. En el detalle del trabajo, clic en **Imprimir**.
2. Se abre una ventana con el documento formateado:
   - Cabecera: nombre de la óptica, número de trabajo
   - Cliente, marco, lente, receta (OD/OS con esfera, cilindro, eje, add, PD)
   - Información del laboratorio (si aplica)
   - Notas internas y del lab
   - Total, depósito, saldo pendiente
3. Imprimir o guardar como PDF desde el navegador.

**Qué ve el usuario:** Documento listo para enviar al laboratorio externo o para uso interno.

---

### Paso 6: Editar estado de pago (admin)

1. En la **lista de trabajos**, clic en el badge de estado de pago (Pendiente, Parcial, Pagado, Reembolsado).
2. Se abre un selector para cambiar el estado.
3. Seleccionar el nuevo estado y confirmar.
4. Útil para corregir pagos registrados fuera del POS o para marcar reembolsos.

**Qué ve el usuario:** Badge clickeable que abre dropdown. Cambio inmediato tras confirmar.

---

### Paso 7: Eliminar trabajo (admin)

1. En la lista o en el detalle, clic en **Eliminar** (icono de papelera).
2. Confirmar en el diálogo.
3. **Restricciones**: No se puede eliminar si estado = entregado o payment_status = paid/partial (salvo con `allowDelivered` en API).
4. Si el trabajo tiene presupuesto vinculado, el presupuesto también se elimina.

**Qué ve el usuario:** Botón Eliminar deshabilitado en trabajos entregados o pagados. Diálogo de confirmación con advertencia si hay presupuesto vinculado.

---

## 3. Diagrama simplificado

```
[Cliente] Compra marco + lentes en óptica
        ↓
[Vendedor] POS: procesa venta → [Sistema] Crea orden + trabajo (TRB-YYYY-NNNN)
        ↓
[Sistema] Si pago < depósito mínimo → on_hold_payment (no visible en taller)
        ↓
[Admin] Trabajos: ve lista → Cambiar estado → Enviado al Lab (completa datos lab)
        ↓
[Laboratorio externo] Recibe trabajo, monta lentes
        ↓
[Admin] Cambiar estado → Recibido → Montado → Control Calidad → Listo para Retiro
        ↓
[Admin] Entregar → [Sistema] Valida saldo = 0
        ↓
[Cliente] Retira trabajo → [Admin] Confirmar Entrega → delivered
```

---

## 4. Tabla de actores

| Actor                   | Rol                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin óptica**        | Ve lista de trabajos, cambia estados, envía al lab, registra recepción y montaje, control de calidad, entrega, imprime orden para lab, edita estado de pago, elimina trabajos (con restricciones). |
| **Vendedor**            | Procesa ventas en POS que generan trabajos; carga presupuestos al POS.                                                                                                                             |
| **Cliente**             | Compra marco + lentes; paga en caja; retira el trabajo cuando está listo.                                                                                                                          |
| **Laboratorio externo** | Recibe el trabajo (orden impresa o digital), monta los lentes, devuelve el trabajo a la óptica.                                                                                                    |

---

## 5. Integraciones

| Módulo                    | Integración                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **POS**                   | process-sale crea work order al vender marco + lentes; valida depósito mínimo (Cash-First); vincula pos_order_id; deliver valida saldo con calculate_order_balance. |
| **Presupuestos**          | Convert crea work order desde presupuesto aceptado; load-to-pos permite vender desde presupuesto y crear trabajo vía POS; quote_id vincula trabajo y presupuesto.   |
| **CRM (Clientes)**        | customer_id obligatorio; enlace "Ver Cliente" en detalle del trabajo.                                                                                               |
| **Recetas**               | prescription_id y prescription_snapshot (receta al momento de crear); PrescriptionFullDisplay en detalle; datos para laboratorio.                                   |
| **Inventario**            | frame_product_id; stock de marco se reduce en POS (salvo customer_own_frame).                                                                                       |
| **Operativos en Terreno** | Trabajos con field_operation_id; listado filtrado por operativo; entrega en empresa.                                                                                |
| **Soporte**               | Tickets pueden vincularse a work_order_id; enlace desde ticket al trabajo.                                                                                          |
| **Analíticas**            | Métricas de trabajos: total, por período, por estado, ingresos.                                                                                                     |

---

## 6. Rutas y pantallas

| Ruta                      | Descripción                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/work-orders`      | Lista de trabajos con filtros, búsqueda, paginación y tarjetas de resumen.                                                                |
| `/admin/work-orders/[id]` | Detalle con timeline de flujo, pestañas (Resumen, Detalles, Precios, Historial), acciones (Cambiar Estado, Imprimir, Eliminar, Entregar). |

---

## 7. Estados del trabajo

| Estado                                   | Significado                       | Visible en Taller |
| ---------------------------------------- | --------------------------------- | ----------------- |
| **Presupuesto** (quote)                  | Presupuesto no confirmado.        | No                |
| **Retención de pago** (on_hold_payment)  | Pago insuficiente (Cash-First).   | No                |
| **Ordenado** (ordered)                   | Orden confirmada, lista para lab. | Sí                |
| **Enviado al Lab** (sent_to_lab)         | Enviado a laboratorio externo.    | Sí                |
| **En Laboratorio** (in_progress_lab)     | En proceso en el lab.             | Sí                |
| **Listo en Lab** (ready_at_lab)          | Listo en lab, pendiente retiro.   | Sí                |
| **Recibido** (received_from_lab)         | Recibido, pendiente montaje.      | Sí                |
| **Montado** (mounted)                    | Lentes montados.                  | Sí                |
| **Control Calidad** (quality_check)      | En control de calidad.            | Sí                |
| **Listo para Retiro** (ready_for_pickup) | Listo para que el cliente retire. | Sí                |
| **Entregado** (delivered)                | Entregado al cliente.             | -                 |
| **Cancelado** (cancelled)                | Trabajo cancelado.                | -                 |
| **Devuelto** (returned)                  | Devuelto por cliente.             | -                 |

---

## 8. Notas de implementación

- **Número de trabajo**: Formato TRB-YYYY-NNNN (ej. TRB-2025-0001). Único por año. Generado por RPC `generate_work_order_number()`.
- **Marco del cliente**: Si `customer_own_frame = true`, frame_cost = 0 y no se reduce stock de inventario.
- **Presbicia**: Soluciones soportadas: none, two_separate (dos pares), bifocal, trifocal, progressive.
- **Filtro por sucursal**: Si el usuario tiene sucursal asignada, solo ve trabajos de esa sucursal. Super admin ve todos.
- **Notificaciones**: work_order_new, work_order_status_change, work_order_completed (al entregar).
