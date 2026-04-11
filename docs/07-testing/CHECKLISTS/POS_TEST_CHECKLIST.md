# Checklist de Pruebas Manuales — POS

**Fecha:** 2026-02-22  
**Módulo:** Point of Sale (Terminal de ventas)

---

## 1. Caja (Cash Register)

- [ ] **Abrir caja**: Ir a `/admin/cash-register`, ingresar monto inicial, abrir. Verificar que se crea `pos_session`.
- [ ] **Una sesión por sucursal**: No permitir abrir segunda caja si ya hay una abierta en la sucursal.
- [ ] **Cerrar caja**: Obtener resumen del día, ingresar efectivo real y datáfono, cerrar. Verificar `cash_register_closure` creado.
- [ ] **Reabrir caja**: (Solo admin) Reabrir un cierre del día. Verificar que se puede operar de nuevo.
- [ ] **Historial de cierres**: Listar cierres por fecha, ver detalle de un cierre.
- [ ] **Branch obligatorio**: Cambiar sucursal y verificar que la caja es por sucursal (datos aislados).

---

## 2. Ventas básicas

- [ ] **Venta sin caja abierta**: Intentar vender sin caja → debe mostrar error o impedir.
- [ ] **Venta de producto físico**: Agregar producto al carrito, procesar venta. Verificar `order`, `order_items`, `order_payments`, reducción de stock.
- [ ] **Venta de accesorio**: Producto tipo accessory, verificar que reduce stock en `product_branch_stock`.
- [ ] **Venta de servicio**: Producto tipo service, verificar que NO reduce stock.
- [ ] **Cliente opcional**: Venta de accesorio sin cliente asociado (si está permitido).
- [ ] **Cliente obligatorio para work order**: Venta con marco + lentes sin cliente → debe exigir cliente.

---

## 3. Pagos

- [ ] **Pago único efectivo**: Procesar venta solo con efectivo. Verificar `order_payments` con `payment_method_type: cash`.
- [ ] **Pago único tarjeta**: Procesar venta con débito o crédito. Verificar método correcto.
- [ ] **Split payment**: Venta con efectivo + tarjeta. Verificar múltiples `order_payments` con métodos correctos.
- [ ] **Saldo pendiente**: Crear orden con pago parcial (depósito < total). Abrir diálogo "Saldo pendiente", registrar abono. Verificar `order.payment_status` actualizado.
- [ ] **Métodos válidos**: cash, debit_card, credit_card, transfer, check. Rechazar métodos inválidos.

---

## 4. Presupuesto → POS

- [ ] **Cargar presupuesto**: Desde `/admin/quotes`, clic "Cargar al POS" o ir a POS con `?quoteId=uuid`. Verificar que items del presupuesto aparecen en carrito.
- [ ] **Presupuesto ya convertido**: Intentar cargar presupuesto con status `converted_to_work` → debe rechazar.
- [ ] **Procesar venta desde presupuesto**: Cargar presupuesto, completar venta. Verificar vínculo `quote_id` en work order si aplica.

---

## 5. Órdenes de trabajo desde POS

- [ ] **Venta marco + lentes**: Agregar marco (manual o inventario) + lente. Procesar venta. Verificar que se crea `lab_work_order`.
- [ ] **Marco del cliente**: Opción "Marco del cliente" → precio marco = 0, no reduce stock.
- [ ] **Presbicia (dos lentes)**: Solución `two_separate` con far_lens + near_lens. Verificar costos y work order.
- [ ] **Cash-First (depósito insuficiente)**: Pago parcial < minDeposit → work order en `on_hold_payment`, no visible en taller.
- [ ] **Cash-First (depósito suficiente)**: Pago parcial >= minDeposit → work order en `ordered`, visible en taller.

---

## 6. Búsqueda y UX

- [ ] **Búsqueda de productos**: Buscar por nombre, SKU, código de barras. Verificar debounce y resultados.
- [ ] **Búsqueda de clientes**: Al seleccionar cliente, buscar por nombre, RUT, email. Verificar sugerencias.
- [ ] **Escaneo de código de barras**: (Si implementado) Escanear producto, verificar que se agrega al carrito.
- [ ] **Selector de sucursal**: Cambiar sucursal en header. Verificar que POS usa la sucursal seleccionada.

---

## 7. Multi-sucursal

- [ ] **Stock por sucursal**: Producto con stock en sucursal A, vender en sucursal B. Verificar que solo reduce stock de B (o crea registro si no existe).
- [ ] **Caja por sucursal**: Abrir caja en sucursal 1, cambiar a sucursal 2. Verificar que debe abrir caja en sucursal 2 por separado.

---

## Resumen rápido

| Área        | Casos críticos                          |
| ----------- | --------------------------------------- |
| Caja        | Abrir, cerrar, una sesión por branch    |
| Ventas      | Producto físico, servicio, stock        |
| Pagos       | Único, split, saldo pendiente           |
| Presupuesto | Cargar al POS, procesar                 |
| Work order  | Marco+lentes, Cash-First, marco cliente |
