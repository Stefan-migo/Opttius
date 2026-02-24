# Checklist de Pruebas Manuales — Presupuestos

**Fecha:** 2026-02-22  
**Módulo:** Quotes (Presupuestos / Cotizaciones)

---

## 1. Listado

- [ ] **Página de presupuestos**: `/admin/quotes` carga correctamente.
- [ ] **Listado**: Tabla con presupuestos. Verificar columnas: número, cliente, fecha, total, estado.
- [ ] **Filtros**: Filtrar por estado (draft, sent, accepted, rejected, expired, converted_to_work).
- [ ] **Filtro por cliente**: Buscar por customer_id, customer_rut o customer_email. Verificar resultados.
- [ ] **Paginación**: Si hay muchos presupuestos, verificar paginación.
- [ ] **Selector de sucursal**: Cambiar sucursal. Verificar que los presupuestos se filtran por branch.
- [ ] **Expiración automática**: Presupuestos con expiration_date pasada deben mostrarse como expired (o actualizarse al listar).

---

## 2. Crear presupuesto

- [ ] **Formulario crear**: Botón "Nuevo presupuesto" o ruta equivalente.
- [ ] **Cliente obligatorio**: Seleccionar cliente. Verificar que es requerido.
- [ ] **Prescripción**: Para lentes graduados, asociar prescripción del mismo cliente. Verificar validación.
- [ ] **Marco**: Seleccionar marco de inventario (frame_product_id) o "Marco del cliente" (customer_own_frame).
- [ ] **Marco del cliente**: customer_own_frame=true → frame_price=0. Ingresar frame_name, frame_brand para trazabilidad.
- [ ] **Lente**: Seleccionar lens_family_id, lens_type, lens_material. Verificar que el precio se calcula desde matriz.
- [ ] **Presbicia**: Solución two_separate con far_lens + near_lens. Verificar costos.
- [ ] **Tratamientos**: Agregar tratamientos (antirreflejante, etc.). Verificar precios desde quote_settings.
- [ ] **Labor**: Costo de mano de obra. Verificar desde quote_settings o override manual.
- [ ] **IVA**: Verificar que tax_amount se calcula según quote_settings.
- [ ] **Descuento**: Aplicar descuento. Verificar que total se actualiza.
- [ ] **Número de presupuesto**: Verificar formato COT-YYYY-NNNN, único.
- [ ] **Guardar borrador**: Status draft. Verificar que se puede editar después.

---

## 3. Editar presupuesto

- [ ] **Solo draft/sent**: Presupuestos en draft o sent pueden editarse. accepted, converted, rejected, expired no.
- [ ] **Modificar items**: Cambiar marco, lente, cantidades. Verificar recálculo de totales.
- [ ] **Persistencia**: Guardar cambios. Verificar que se reflejan en detalle.

---

## 4. Estados y transiciones

- [ ] **Enviar**: Cambiar status a sent. (Puede incluir envío por email). Verificar cambio.
- [ ] **Aceptar**: Marcar como accepted. Verificar que habilita "Convertir a orden de trabajo".
- [ ] **Rechazar**: Marcar como rejected. Verificar que no permite convertir ni cargar al POS.
- [ ] **Expirado**: Presupuesto con expiration_date pasada. Verificar que status=expired (automático o manual).
- [ ] **Convertido**: Tras convertir a work order, status=converted_to_work. Verificar que no permite editar ni cargar al POS.

---

## 5. Enviar por email

- [ ] **Enviar presupuesto**: Acción "Enviar" o "Enviar por email". Verificar que se envía (o simula) con template correcto.
- [ ] **Variables**: Verificar que el email incluye datos del presupuesto (número, items, total, cliente).
- [ ] **Reenviar**: Presupuesto en sent. Reenviar. Verificar que funciona.

---

## 6. Cargar al POS

- [ ] **Cargar presupuesto**: Desde listado o detalle, "Cargar al POS". Verificar redirección a POS con items cargados.
- [ ] **URL directa**: Ir a `/admin/pos?quoteId=uuid`. Verificar que el carrito se carga con items del presupuesto.
- [ ] **No permitir si convertido**: Presupuesto converted_to_work. Verificar que "Cargar al POS" está deshabilitado o rechaza.
- [ ] **No permitir si aceptado (sin convertir)**: Según reglas, puede o no permitir. Verificar comportamiento.

---

## 7. Convertir a orden de trabajo

- [ ] **Convertir**: Presupuesto en draft o sent. Acción "Convertir a orden de trabajo". Verificar que se crea lab_work_order.
- [ ] **Datos copiados**: Marco, lentes, prescripción, costos. Verificar que el work order tiene los datos correctos.
- [ ] **Quote actualizado**: quote.status=accepted, converted_to_work_order_id= nuevo work order. Verificar vínculo.
- [ ] **No permitir si ya convertido**: Verificar que rechaza segunda conversión.
- [ ] **Presbicia two_separate**: Si el presupuesto tiene far + near, verificar que el work order los incluye.

---

## 8. Configuración (quote_settings)

- [ ] **Página configuración**: `/admin/quotes/settings` carga.
- [ ] **Labor por defecto**: default_labor_cost. Verificar que se usa en nuevos presupuestos.
- [ ] **IVA**: default_tax_percentage. Verificar cálculo.
- [ ] **Días de expiración**: default_expiration_days. Verificar que expiration_date se calcula al crear.
- [ ] **Tratamientos**: treatment_prices (JSONB). Verificar que los precios se aplican.
- [ ] **Por sucursal**: Configuración por branch. Verificar que cada sucursal puede tener valores distintos.

---

## Resumen rápido

| Área          | Casos críticos                                          |
| ------------- | ------------------------------------------------------- |
| Crear         | Cliente, prescripción, marco, lente, presbicia, totales |
| Estados       | draft, sent, accepted, rejected, expired, converted     |
| Enviar        | Email con variables correctas                           |
| Cargar al POS | Items cargados, no permitir si convertido               |
| Convertir     | Work order creado, datos copiados, quote actualizado    |
| Config        | Labor, IVA, expiración, tratamientos                    |
