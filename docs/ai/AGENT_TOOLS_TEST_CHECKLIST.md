# Checklist de Testing Manual - Tools del Agente IA

Guía para probar cada herramienta del agente conversando con el chat.

**Última actualización:** 2026-03-28 (Agent Tools UX: eliminadas updateOrderStatus/updatePaymentStatus, añadidos resolvers por nombres/números, createPrescription)

**Cómo usar:** Abre el chat en `/admin`, inicia una conversación y usa las frases de prueba. Marca cada ítem al completar.

---

## Resumen de tools (51 en chat admin + 4 en WhatsApp)

| #     | Categoría           | Tool                                                                                                           |
| ----- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1-8   | Products            | getProducts, getProductById, createProduct, updateProduct, deleteProduct, updateInventory, getLowStockProducts |
| 9-14  | Categories          | getCategories, getCategoryById, createCategory, updateCategory, deleteCategory, getCategoryTree                |
| 15-19 | Orders              | getOrders, getOrderById, getPendingOrders, getOrderStats                                                       |
| 22-23 | Work Orders         | getWorkOrders, getWorkOrderById                                                                                |
| 24-30 | Customers           | getCustomers, getCustomerById, updateCustomer, getCustomerOrders, getCustomerStats, createCustomer             |
| 31-34 | Appointments        | getAppointmentSlots, getAppointments, getBranchSchedule, rescheduleAppointment                                 |
| 35    | Quotes              | sendQuoteByEmail                                                                                               |
| 36-37 | Prescriptions       | suggestLensFromPrescription, createPrescription                                                                |
| 38-41 | Analytics           | getDashboardStats, getRevenueTrend, getTopProducts, getSalesReport                                             |
| 42-45 | Support             | getTickets, getTicketById, updateTicketStatus, createTicketResponse                                            |
| 46-50 | Business & Diagnose | analyzeBusinessFlow, diagnoseSystem, analyzeMarketTrends, optimizeInventory, generateRecommendations           |
| 51-52 | Import Bulk         | analyzeImportFile, executeBulkImport                                                                           |
| 53-56 | Customer WhatsApp   | getAppointmentStatus, getQuoteStatus, getOrderStatus, confirmAppointment                                       |

---

## Products

| #   | Tool                | Frase de prueba                                               | Resultado esperado                             | Probado |
| --- | ------------------- | ------------------------------------------------------------- | ---------------------------------------------- | ------- |
| 1   | getProducts         | "¿Qué productos tienes?"                                      | Lista de productos con nombre, precio, stock   | ☐       |
| 2   | getProducts         | "Busca productos con stock bajo"                              | Productos filtrados o mensaje si no hay        | ☐       |
| 3   | getProductById      | "Dame los detalles del producto [nombre]"                     | Detalles completos del producto                | ☐       |
| 4   | getLowStockProducts | "¿Qué productos tienen stock bajo?"                           | Lista de productos con stock <= umbral         | ☐       |
| 5   | createProduct       | "Crea un producto de prueba llamado Test Lente, precio 10000" | Producto creado (verificar en /admin/products) | ☐       |
| 6   | updateProduct       | "Actualiza el precio del producto Test Lente a 15000"         | Precio actualizado                             | ☐       |
| 7   | updateInventory     | "Ajusta el stock del producto Test Lente a 5 unidades"        | Inventario actualizado                         | ☐       |
| 8   | deleteProduct       | "Elimina el producto Test Lente"                              | Producto eliminado o desactivado               | ☐       |

**Casos edge:** Sin productos, búsqueda sin resultados, producto inexistente.

---

## Categories

| #   | Tool            | Frase de prueba                                         | Resultado esperado                          | Probado |
| --- | --------------- | ------------------------------------------------------- | ------------------------------------------- | ------- |
| 9   | getCategories   | "Lista las categorías de productos"                     | Lista de categorías                         | ☐       |
| 10  | getCategoryById | "Dame los detalles de la categoría [nombre]"            | Detalles de la categoría                    | ☐       |
| 11  | getCategoryTree | "Muéstrame el árbol de categorías"                      | Estructura jerárquica                       | ☐       |
| 12  | createCategory  | "Crea una categoría llamada Accesorios"                 | Categoría creada                            | ☐       |
| 13  | updateCategory  | "Renombra la categoría Accesorios a Accesorios Ópticos" | Categoría actualizada                       | ☐       |
| 14  | deleteCategory  | "Elimina la categoría Accesorios Ópticos"               | Categoría eliminada (si no tiene productos) | ☐       |

---

## Orders

| #   | Tool             | Frase de prueba                                  | Resultado esperado                                             | Probado |
| --- | ---------------- | ------------------------------------------------ | -------------------------------------------------------------- | ------- |
| 15  | getOrders        | "¿Cuáles son las órdenes pendientes?"            | Lista de órdenes con status pending                            | ☐       |
| 16  | getOrders        | "Muéstrame las órdenes pagadas del último mes"   | Órdenes con payment_status paid                                | ☐       |
| 17  | getOrderById     | "Dame los detalles de la orden [número]"         | Detalles completos con items (usar order_number visible en UI) | ☐       |
| 18  | getPendingOrders | "¿Hay órdenes con balance pendiente?"            | Órdenes con pago parcial o pendiente                           | ☐       |
| 19  | getOrderStats    | "Estadísticas de órdenes de los últimos 30 días" | Resumen numérico (total, completadas, etc.)                    | ☐       |

**Nota:** updateOrderStatus y updatePaymentStatus fueron eliminadas (payment-first logic, estados desde POS).

**Casos edge:** Sin órdenes, orden inexistente, order_number inválido.

---

## Work Orders

| #   | Tool             | Frase de prueba                                                | Resultado esperado                                        | Probado |
| --- | ---------------- | -------------------------------------------------------------- | --------------------------------------------------------- | ------- |
| 22  | getWorkOrders    | "¿Qué órdenes de trabajo están en laboratorio?"                | Lista de órdenes con status sent_to_lab                   | ☐       |
| 23  | getWorkOrders    | "Muéstrame los trabajos listos para retiro en Sucursal Centro" | Órdenes con status ready_for_pickup (branchName aceptado) | ☐       |
| 24  | getWorkOrderById | "Dame los detalles de la orden de trabajo [número]"            | Detalles completos (cliente, marco, lentes, montos)       | ☐       |

**Casos edge:** Sin sucursal seleccionada (debe pedir branchId o branchName), orden inexistente.

---

## Customers

| #   | Tool              | Frase de prueba                                             | Resultado esperado                | Probado |
| --- | ----------------- | ----------------------------------------------------------- | --------------------------------- | ------- |
| 25  | getCustomers      | "Busca clientes que se llamen Juan"                         | Lista de clientes que coinciden   | ☐       |
| 26  | getCustomers      | "Lista los últimos 10 clientes"                             | 10 clientes más recientes         | ☐       |
| 27  | getCustomerById   | "Dame los datos del cliente [nombre]"                       | Detalles del cliente              | ☐       |
| 28  | getCustomerOrders | "¿Qué órdenes tiene el cliente [nombre]?"                   | Historial de órdenes del cliente  | ☐       |
| 29  | getCustomerStats  | "Estadísticas del cliente [nombre]"                         | Resumen (órdenes, tickets, etc.)  | ☐       |
| 30  | updateCustomer    | "Actualiza el teléfono del cliente [nombre] a +56912345678" | Cliente actualizado               | ☐       |
| 31  | createCustomer    | "Crea un cliente llamado María López, email maria@test.com" | Cliente creado en sucursal actual | ☐       |
| 31b | createCustomer    | "Crea un cliente en Sucursal Centro llamado Pedro Sánchez"  | Cliente creado (usar branchName)  | ☐       |

**Casos edge:** Cliente inexistente, búsqueda sin resultados, Super Admin sin sucursal.

---

## Appointments

| #   | Tool                  | Frase de prueba                                                         | Resultado esperado                                             | Probado |
| --- | --------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- | ------- |
| 32  | getAppointmentSlots   | "¿Qué horarios hay disponibles para el 15 de marzo en Sucursal Centro?" | Lista de slots disponibles (branchName aceptado)               | ☐       |
| 33  | getAppointments       | "¿Cuáles son las citas de hoy?" o "Lista las citas del 15 de marzo"     | Lista de citas por fecha con hora, cliente, estado             | ☐       |
| 34  | getBranchSchedule     | "¿Cuáles son los horarios de atención de Sucursal Centro?"              | working_hours, slot_duration (branchName aceptado)             | ☐       |
| 35  | rescheduleAppointment | "Reprograma la cita de Juan Pérez al 20 de marzo a las 10:00"           | Cita actualizada (usar customerName + originalAppointmentDate) | ☐       |

**Casos edge:** Sin sucursal seleccionada (debe pedir branchId o branchName), fecha sin slots, slot ocupado (debe rechazar con horarios alternativos).

---

## Quotes

| #   | Tool             | Frase de prueba                                               | Resultado esperado                             | Probado |
| --- | ---------------- | ------------------------------------------------------------- | ---------------------------------------------- | ------- |
| 36  | sendQuoteByEmail | "Envía el presupuesto COT-2025-010 al email cliente@mail.com" | Email enviado (usar quoteNumber visible en UI) | ☐       |

**Casos edge:** Presupuesto inexistente, email inválido, quote de otra organización.

---

## Prescriptions

| #   | Tool                        | Frase de prueba                                                            | Resultado esperado                                          | Probado |
| --- | --------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | ------- |
| 37  | suggestLensFromPrescription | "Sugiere lentes para una receta con -4 esfera y adición +2"                | Familias compatibles (progresivos, alto índice)             | ☐       |
| 38  | suggestLensFromPrescription | "¿Qué lentes recomiendas para la receta [número]?"                         | Sugerencias basadas en receta (prescriptionNumber aceptado) | ☐       |
| 39  | createPrescription          | "Agrega la receta OD -2.5, OS -2.25 al cliente Juan Pérez, RUT 18345698-9" | Receta creada y vinculada al cliente                        | ☐       |

**Casos edge:** Receta inexistente, datos incompletos, cliente no encontrado.

---

## Analytics

| #   | Tool              | Frase de prueba                             | Resultado esperado                 | Probado |
| --- | ----------------- | ------------------------------------------- | ---------------------------------- | ------- |
| 40  | getDashboardStats | "Dame un resumen del dashboard"             | KPIs (productos, órdenes, revenue) | ☐       |
| 41  | getRevenueTrend   | "¿Cómo va la tendencia de ingresos?"        | Datos de revenue por período       | ☐       |
| 42  | getTopProducts    | "¿Cuáles son los 5 productos más vendidos?" | Top productos por ventas           | ☐       |
| 43  | getSalesReport    | "Reporte de ventas del último mes"          | Resumen de ventas                  | ☐       |

---

## Support

| #   | Tool                 | Frase de prueba                                                      | Resultado esperado                          | Probado |
| --- | -------------------- | -------------------------------------------------------------------- | ------------------------------------------- | ------- |
| 44  | getTickets           | "¿Hay tickets de soporte abiertos?"                                  | Lista de tickets                            | ☐       |
| 45  | getTicketById        | "Dame los detalles del ticket SUP-12345678-ABC12"                    | Detalles del ticket (ticketNumber aceptado) | ☐       |
| 46  | updateTicketStatus   | "Marca el ticket SUP-12345678-ABC12 como resuelto"                   | Estado actualizado                          | ☐       |
| 47  | createTicketResponse | "Añade una respuesta al ticket SUP-12345678-ABC12: Ya está resuelto" | Respuesta creada                            | ☐       |

**Casos edge:** Sin tickets, ticket inexistente.

---

## Business & Diagnose

| #   | Tool                    | Frase de prueba                                    | Resultado esperado           | Probado |
| --- | ----------------------- | -------------------------------------------------- | ---------------------------- | ------- |
| 48  | analyzeBusinessFlow     | "¿Cómo puedo mejorar mi flujo de trabajo?"         | Análisis con sugerencias     | ☐       |
| 49  | diagnoseSystem          | "Diagnostica el sistema"                           | Resumen de salud del sistema | ☐       |
| 50  | analyzeMarketTrends     | "¿Qué tendencias hay en el mercado óptico?"        | Análisis de tendencias       | ☐       |
| 51  | optimizeInventory       | "¿Qué productos debería revisar en inventario?"    | Sugerencias de optimización  | ☐       |
| 52  | generateRecommendations | "¿Qué productos recomiendas para aumentar ventas?" | Recomendaciones contextuales | ☐       |

---

## Import Bulk

| #   | Tool              | Frase de prueba                                                                              | Resultado esperado                          | Probado |
| --- | ----------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- | ------- |
| 53  | analyzeImportFile | Adjuntar CSV y: "Analiza este archivo para importar clientes"                                | Mapeo sugerido, muestra de filas            | ☐       |
| 54  | executeBulkImport | Tras analyzeImportFile: "Importa los clientes en Sucursal Centro con el mapeo que sugeriste" | Importación ejecutada (branchName aceptado) | ☐       |

**Casos edge:** Archivo vacío, columnas no reconocidas, branchId/branchName faltante para customers.

---

## Customer WhatsApp (probar por WhatsApp)

| #   | Tool                 | Frase de prueba               | Resultado esperado                      | Probado |
| --- | -------------------- | ----------------------------- | --------------------------------------- | ------- |
| 55  | getAppointmentStatus | "¿Cuándo es mi cita?"         | Citas del cliente (o "No tienes citas") | ☐       |
| 56  | getQuoteStatus       | "¿Cómo van mis presupuestos?" | Estado de presupuestos                  | ☐       |
| 57  | getOrderStatus       | "¿Mi orden está lista?"       | Estado de órdenes de trabajo            | ☐       |
| 58  | confirmAppointment   | "Confirmo mi cita"            | Cita confirmada                         | ☐       |

**Casos edge:** Cliente no identificado (wa_id no en customers), sin citas/presupuestos/órdenes.

---

## Checklist general

- [ ] Todas las tools de products responden correctamente
- [ ] Filtros por sucursal funcionan (si hay varias sucursales)
- [ ] Super Admin con vista global: el agente pregunta sucursal cuando es necesario
- [ ] Errores se muestran de forma amigable (no stack traces)
- [ ] Tools destructivas (delete, update) requieren confirmación o contexto claro
- [ ] Import bulk: flujo analyze → confirmar mapeo → execute funciona

---

## Notas de testing

1. **Proveedor LLM:** Usar DeepSeek o el proveedor configurado. Verificar que tool calls se ejecuten.
2. **Logs:** En consola del navegador, los errores de tools se registran (Tool Execution Error).
3. **Sucursal:** Si eres Super Admin, prueba con y sin sucursal seleccionada. Tools que requieren branch: createCustomer, getAppointmentSlots, getBranchSchedule.
4. **WhatsApp:** Probar con número de cliente registrado en customers.phone.
5. **Identificadores visibles:** El agente acepta nombres y números visibles en la UI, no UUIDs. Usa: quote_number (COT-2025-010), ticket_number (SUP-123...), order_number, branchName, customerName, prescription_number. Para sendQuoteByEmail usa el número de presupuesto; para rescheduleAppointment usa nombre del cliente + fecha; para suggestLensFromPrescription usa prescription_number o datos de dioptrías.
6. **Formato de fecha:** getAppointmentSlots y rescheduleAppointment usan YYYY-MM-DD (ej. 2026-03-15).
