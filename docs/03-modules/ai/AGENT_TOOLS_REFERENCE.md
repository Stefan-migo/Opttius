# Referencia de Tools del Agente IA - Opttius

Documentación detallada de cada herramienta disponible para el Agente Experto Óptico.

**Última actualización:** 2026-03-28 (Agent Tools UX: resolvers, quoteNumber, ticketNumber, prescriptionNumber, branchName, createPrescription, eliminadas updateOrderStatus/updatePaymentStatus)

---

## Índice por categoría

| Categoría                               | Tools                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [Products](#products)                   | getProducts, getProductById, createProduct, updateProduct, deleteProduct, updateInventory, getLowStockProducts |
| [Categories](#categories)               | getCategories, getCategoryById, createCategory, updateCategory, deleteCategory, getCategoryTree                |
| [Orders](#orders)                       | getOrders, getOrderById, getPendingOrders, getOrderStats                                                       |
| [Work Orders](#work-orders)             | getWorkOrders, getWorkOrderById                                                                                |
| [Customers](#customers)                 | getCustomers, getCustomerById, updateCustomer, getCustomerOrders, getCustomerStats, createCustomer             |
| [Appointments](#appointments)           | getAppointmentSlots, getAppointments, getBranchSchedule, rescheduleAppointment                                 |
| [Quotes](#quotes)                       | sendQuoteByEmail                                                                                               |
| [Prescriptions](#prescriptions)         | suggestLensFromPrescription, createPrescription                                                                |
| [Customer WhatsApp](#customer-whatsapp) | getAppointmentStatus, getQuoteStatus, getOrderStatus, confirmAppointment                                       |
| [Analytics](#analytics)                 | getDashboardStats, getRevenueTrend, getTopProducts, getSalesReport                                             |
| [Support](#support)                     | getTickets, getTicketById, updateTicketStatus, createTicketResponse                                            |
| [Business Flow](#business-flow)         | analyzeBusinessFlow                                                                                            |
| [Diagnose](#diagnose)                   | diagnoseSystem                                                                                                 |
| [Market Trends](#market-trends)         | analyzeMarketTrends                                                                                            |
| [Inventory](#inventory)                 | optimizeInventory                                                                                              |
| [Recommendations](#recommendations)     | generateRecommendations                                                                                        |
| [Import Bulk](#import-bulk)             | analyzeImportFile, executeBulkImport                                                                           |

---

## Products

### getProducts

**Descripción:** Busca y filtra productos. Devuelve una lista de productos que coinciden con los criterios.

**Parámetros:**

| Parámetro | Tipo          | Requerido | Descripción                                   |
| --------- | ------------- | --------- | --------------------------------------------- |
| search    | string        | No        | Término de búsqueda para nombre o descripción |
| category  | string (UUID) | No        | ID de categoría para filtrar                  |
| status    | enum          | No        | draft, active, archived                       |
| minPrice  | number        | No        | Precio mínimo                                 |
| maxPrice  | number        | No        | Precio máximo                                 |
| featured  | boolean       | No        | Filtrar productos destacados                  |
| inStock   | boolean       | No        | Filtrar productos con stock                   |
| limit     | number        | No        | Número de resultados (máx. 100, default: 20)  |
| page      | number        | No        | Número de página (default: 1)                 |

**Restricciones:** organizationId, currentBranchId (según contexto)

**Ejemplo conversacional:** "¿Qué productos tienes en stock?" | "Lista productos de la categoría lentes"

**Errores posibles:** "Organization ID is missing in context"

---

### getProductById

**Descripción:** Obtiene detalles de un producto por su ID, incluyendo stock por sucursal (product_branch_stock con branch name). Usar antes de updateInventory para ver en qué sucursales está el producto.

**Parámetros:**

| Parámetro | Tipo          | Requerido | Descripción     |
| --------- | ------------- | --------- | --------------- |
| productId | string (UUID) | Sí        | ID del producto |

**Restricciones:** organizationId

**Retorna:** product_branch_stock con branch(id, name), quantity, low_stock_threshold por sucursal.

**Ejemplo conversacional:** "Dame los detalles del producto X"

---

### createProduct

**Descripción:** Crea un nuevo producto en el catálogo.

**Parámetros:** name, price, description, category_id, inventory_quantity, status, etc.

**Restricciones:** organizationId, currentBranchId (según modelo)

**Ejemplo conversacional:** "Crea un producto llamado Lente Blue con precio 50000"

---

### updateProduct

**Descripción:** Actualiza un producto existente.

**Parámetros:** productId (UUID), updates (objeto con campos a actualizar)

**Restricciones:** organizationId

---

### deleteProduct

**Descripción:** Elimina un producto (soft delete o hard según implementación).

**Parámetros:** productId (UUID)

**Restricciones:** organizationId

---

### updateInventory

**Descripción:** Ajusta el inventario de un producto en una sucursal específica. Requiere sucursal cuando el usuario está en vista global. Antes de llamar, usar getProductById para ver product_branch_stock y en qué sucursales está el producto.

**Parámetros:**

| Parámetro      | Tipo          | Requerido | Descripción                                 |
| -------------- | ------------- | --------- | ------------------------------------------- |
| productId      | string (UUID) | Sí        | ID del producto                             |
| quantity       | number        | Sí        | Cantidad                                    |
| adjustmentType | enum          | No        | set, add, subtract (default: add)           |
| branchId       | string (UUID) | No\*      | Sucursal (requerido en vista global)        |
| branchName     | string        | No\*      | Nombre de sucursal (alternativa a branchId) |

\* En vista global (Super Admin sin sucursal seleccionada), branchName o branchId es obligatorio para evitar ambigüedad.

**Restricciones:** organizationId. Si currentBranchId es null/global, debe indicar branchName o branchId.

**Ejemplo conversacional:** "Agrega 10 unidades al producto X en Sucursal Centro"

---

### getLowStockProducts

**Descripción:** Obtiene productos con stock bajo.

**Parámetros:**

| Parámetro | Tipo   | Requerido | Descripción                        |
| --------- | ------ | --------- | ---------------------------------- |
| threshold | number | No        | Umbral de stock bajo (default: 5)  |
| limit     | number | No        | Límite de resultados (default: 20) |

**Restricciones:** organizationId, currentBranchId

**Ejemplo conversacional:** "¿Qué productos tienen stock bajo?"

---

## Categories

### getCategories

**Descripción:** Lista categorías de productos.

**Parámetros:** limit, page (opcionales)

**Restricciones:** organizationId

---

### getCategoryById

**Descripción:** Obtiene detalles de una categoría.

**Parámetros:** categoryId (UUID)

---

### createCategory, updateCategory, deleteCategory

**Descripción:** CRUD de categorías.

**Restricciones:** organizationId

---

### getCategoryTree

**Descripción:** Obtiene el árbol de categorías (jerárquico).

---

## Orders

### getOrders

**Descripción:** Lista órdenes con filtros opcionales.

**Parámetros:**

| Parámetro     | Tipo   | Requerido | Descripción                                                  |
| ------------- | ------ | --------- | ------------------------------------------------------------ |
| status        | enum   | No        | pending, processing, shipped, delivered, cancelled, refunded |
| paymentStatus | enum   | No        | pending, paid, failed, refunded, partially_refunded          |
| limit         | number | No        | Máx. 100 (default: 50)                                       |
| offset        | number | No        | Offset para paginación                                       |

**Restricciones:** organizationId, currentBranchId

**Ejemplo conversacional:** "¿Cuáles son las órdenes pendientes?"

---

### getOrderById

**Descripción:** Detalles de una orden específica.

**Parámetros:**

| Parámetro   | Tipo          | Requerido | Descripción                                           |
| ----------- | ------------- | --------- | ----------------------------------------------------- |
| orderId     | string (UUID) | No\*      | ID de la orden                                        |
| orderNumber | string        | No\*      | Número de orden visible en UI (alternativa a orderId) |

\* Proporcionar orderId o orderNumber.

---

### getPendingOrders

**Descripción:** Órdenes con balance pendiente.

**Parámetros:** limit (default: 20)

---

### getOrderStats

**Descripción:** Estadísticas de órdenes por período.

**Parámetros:** days (default: 30)

---

## Work Orders

### getWorkOrders

**Descripción:** Lista órdenes de trabajo (trabajos de laboratorio) con filtros opcionales por estado, sucursal y fechas.

**Parámetros:**

| Parámetro  | Tipo          | Requerido | Descripción                                                                                                                                                              |
| ---------- | ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| status     | enum          | No        | quote, ordered, on_hold_payment, sent_to_lab, in_progress_lab, ready_at_lab, received_from_lab, mounted, quality_check, ready_for_pickup, delivered, cancelled, returned |
| branchId   | string (UUID) | No\*      | Sucursal (requerido para Super Admin con vista global)                                                                                                                   |
| branchName | string        | No        | Nombre de sucursal (alternativa a branchId)                                                                                                                              |
| startDate  | string        | No        | Fecha inicio YYYY-MM-DD                                                                                                                                                  |
| endDate    | string        | No        | Fecha fin YYYY-MM-DD                                                                                                                                                     |
| limit      | number        | No        | Máx. 100 (default: 50)                                                                                                                                                   |
| offset     | number        | No        | Offset para paginación                                                                                                                                                   |

**Restricciones:** organizationId, currentBranchId o branchId

**Ejemplo conversacional:** "¿Qué órdenes de trabajo están en laboratorio?" | "Lista trabajos listos para retiro"

---

### getWorkOrderById

**Descripción:** Obtiene el detalle completo de una orden de trabajo por ID.

**Parámetros:** workOrderId (UUID)

**Restricciones:** organizationId

**Ejemplo conversacional:** "Dame los detalles de la orden de trabajo X"

---

## Customers

### getCustomers

**Descripción:** Busca y lista clientes.

**Parámetros:** search, limit, page, etc.

**Restricciones:** organizationId, currentBranchId (customers es branch-scoped)

**Ejemplo conversacional:** "Busca clientes que se llamen Juan"

---

### getCustomerById

**Descripción:** Detalles de un cliente.

**Parámetros:** customerId (UUID)

---

### updateCustomer

**Descripción:** Actualiza datos de un cliente.

**Parámetros:** customerId (UUID), updates (objeto)

---

### getCustomerOrders

**Descripción:** Historial de órdenes de un cliente.

**Parámetros:** customerId (UUID)

---

### getCustomerStats

**Descripción:** Estadísticas de un cliente (órdenes, tickets, etc.).

**Parámetros:** customerId (UUID)

---

### createCustomer

**Descripción:** Crea un nuevo cliente. Requiere al menos first_name o last_name.

**Parámetros:**

| Parámetro  | Tipo          | Requerido | Descripción                                            |
| ---------- | ------------- | --------- | ------------------------------------------------------ |
| first_name | string        | No\*      | Nombre                                                 |
| last_name  | string        | No\*      | Apellido                                               |
| email      | string        | No        | Email                                                  |
| phone      | string        | No        | Teléfono                                               |
| rut        | string        | No        | RUT chileno                                            |
| branch_id  | string (UUID) | No\*\*    | Sucursal (requerido para Super Admin con vista global) |
| branchName | string        | No        | Nombre de sucursal (alternativa a branch_id)           |
| notes      | string        | No        | Notas                                                  |

\* Al menos uno de first_name o last_name es requerido.
\*\* Si el usuario es Super Admin sin sucursal seleccionada, debe indicar branch_id.

**Restricciones:** organizationId, currentBranchId

**Ejemplo conversacional:** "Crea un cliente llamado Juan Pérez con email juan@mail.com"

---

## Appointments

### getAppointmentSlots

**Descripción:** Obtiene horarios disponibles para citas en una fecha. Usar al crear o sugerir citas.

**Parámetros:**

| Parámetro  | Tipo          | Requerido | Descripción                                            |
| ---------- | ------------- | --------- | ------------------------------------------------------ |
| date       | string        | Sí        | Fecha en formato YYYY-MM-DD                            |
| duration   | number        | No        | Duración en minutos (default: 30)                      |
| staffId    | string (UUID) | No        | ID del staff (opcional)                                |
| branchId   | string (UUID) | No\*      | Sucursal (requerido para Super Admin con vista global) |
| branchName | string        | No        | Nombre de sucursal (alternativa a branchId)            |

**Restricciones:** organizationId, currentBranchId

**Ejemplo conversacional:** "¿Qué horarios hay disponibles para el 15 de marzo en Sucursal Centro?"

---

### getAppointments

**Descripción:** Lista citas para una fecha dada. Usar cuando el usuario pregunta por citas del día o agenda.

**Parámetros:**

| Parámetro  | Tipo          | Requerido | Descripción                                            |
| ---------- | ------------- | --------- | ------------------------------------------------------ |
| date       | string        | Sí        | Fecha en formato YYYY-MM-DD                            |
| branchId   | string (UUID) | No\*      | Sucursal (requerido para Super Admin con vista global) |
| branchName | string        | No        | Nombre de sucursal (alternativa a branchId)            |
| status     | enum          | No        | scheduled, confirmed, completed, cancelled, no_show    |
| limit      | number        | No        | Máx. 100 (default: 50)                                 |

**Restricciones:** organizationId, currentBranchId o branchId

**Ejemplo conversacional:** "¿Cuáles son las citas de hoy?" | "Lista las citas del 15 de marzo"

---

### getBranchSchedule

**Descripción:** Obtiene los horarios de atención de una sucursal (working_hours, slot_duration, etc.).

**Parámetros:** branchId (opcional), branchName (alternativa a branchId)

**Restricciones:** organizationId, currentBranchId

---

### rescheduleAppointment

**Descripción:** Reprograma una cita a nueva fecha y hora. Valida disponibilidad antes de actualizar.

**Parámetros:**

| Parámetro               | Tipo          | Requerido | Descripción                                                        |
| ----------------------- | ------------- | --------- | ------------------------------------------------------------------ |
| appointmentId           | string (UUID) | No\*      | ID de la cita                                                      |
| customerName            | string        | No\*      | Nombre del cliente (alternativa, con originalAppointmentDate)      |
| originalAppointmentDate | string        | No\*      | Fecha de la cita a buscar (YYYY-MM-DD), cuando se usa customerName |
| appointmentDate         | string        | Sí        | Nueva fecha YYYY-MM-DD                                             |
| appointmentTime         | string        | Sí        | Nueva hora HH:MM                                                   |

\* Proporcionar appointmentId o (customerName + originalAppointmentDate).

**Restricciones:** organizationId

**Ejemplo conversacional:** "Reprograma la cita de Juan Pérez al 20 de marzo a las 10:00" | "Reprograma la cita [UUID] al 20 de marzo a las 10:00"

---

## Quotes

### sendQuoteByEmail

**Descripción:** Envía un presupuesto por email al cliente.

**Parámetros:**

| Parámetro   | Tipo          | Requerido | Descripción                                            |
| ----------- | ------------- | --------- | ------------------------------------------------------ |
| quoteId     | string (UUID) | No\*      | ID del presupuesto                                     |
| quoteNumber | string        | No\*      | Número de presupuesto visible en UI (ej. COT-2025-010) |
| email       | string        | Sí        | Email del destinatario                                 |

\* Proporcionar quoteId o quoteNumber.

**Restricciones:** organizationId

**Ejemplo conversacional:** "Envía el presupuesto COT-2025-010 al email cliente@mail.com"

---

## Prescriptions

### suggestLensFromPrescription

**Descripción:** Sugiere familias de lentes según la receta. Considera presbicia (adición), alto índice para prescripciones fuertes (|sphere|>=4 o |cylinder|>=2).

**Parámetros:**

| Parámetro          | Tipo          | Requerido | Descripción                                   |
| ------------------ | ------------- | --------- | --------------------------------------------- |
| prescriptionId     | string (UUID) | No\*      | ID de la receta                               |
| prescriptionNumber | string        | No\*      | Número de receta visible en UI                |
| od_sphere          | number        | No\*      | Esfera OD                                     |
| os_sphere          | number        | No\*      | Esfera OS                                     |
| od_cylinder        | number        | No        | Cilindro OD                                   |
| os_cylinder        | number        | No        | Cilindro OS                                   |
| od_add             | number        | No        | Adición OD (presbicia)                        |
| os_add             | number        | No        | Adición OS (presbicia)                        |
| prescription_type  | string        | No        | progressive, bifocal, trifocal, single_vision |

\* Proporcionar prescriptionId, prescriptionNumber, o al menos od_sphere/os_sphere.

**Restricciones:** organizationId

**Ejemplo conversacional:** "Sugiere lentes para una receta con -4.5 esfera y adición +2" | "Sugiere lentes para la receta [número]"

---

### createPrescription

**Descripción:** Agrega una receta a un cliente. Usar cuando el usuario pida agregar una receta (ej. "agrega la receta al cliente Juan Pérez"). Requiere al menos od_sphere o os_sphere. Si el usuario dice "de la foto" sin datos, pedir que proporcione esfera, cilindro, adición.

**Parámetros:**

| Parámetro           | Tipo   | Requerido | Descripción                                   |
| ------------------- | ------ | --------- | --------------------------------------------- |
| customerNameOrRut   | string | Sí        | Nombre o RUT del cliente                      |
| od_sphere           | number | No\*      | Esfera OD                                     |
| os_sphere           | number | No\*      | Esfera OS                                     |
| od_cylinder         | number | No        | Cilindro OD                                   |
| os_cylinder         | number | No        | Cilindro OS                                   |
| od_add              | number | No        | Adición OD                                    |
| os_add              | number | No        | Adición OS                                    |
| prescription_type   | string | No        | progressive, bifocal, trifocal, single_vision |
| prescription_number | string | No        | Número de receta si existe                    |
| branchName          | string | No        | Sucursal para acotar búsqueda del cliente     |

\* Al menos od_sphere o os_sphere es requerido.

**Restricciones:** organizationId

**Ejemplo conversacional:** "Agrega la receta OD -2.5, OS -2.25 al cliente Juan Pérez, RUT 18345698-9"

---

## Customer WhatsApp

Tools disponibles solo para clientes por WhatsApp (rol customer). Validan ownership.

### getAppointmentStatus

**Descripción:** Obtiene el estado de las citas del cliente.

**Parámetros:** customerId (opcional, desde contexto)

**Restricciones:** customerId debe coincidir con el wa_id del contexto.

**Ejemplo conversacional:** "¿Cuándo es mi cita?"

---

### getQuoteStatus

**Descripción:** Estado de los presupuestos del cliente.

**Parámetros:** customerId (opcional)

---

### getOrderStatus

**Descripción:** Estado de las órdenes de trabajo (lentes) del cliente.

**Parámetros:** customerId (opcional)

---

### confirmAppointment

**Descripción:** Confirma una cita del cliente.

**Parámetros:** appointmentId (UUID, requerido)

**Restricciones:** El cliente debe ser dueño de la cita.

**Ejemplo conversacional:** "Confirmo mi cita"

---

## Analytics

### getDashboardStats

**Descripción:** KPIs del dashboard (productos, órdenes, revenue, clientes).

**Parámetros:** Ninguno

**Restricciones:** organizationId

**Ejemplo conversacional:** "Dame un resumen del dashboard"

---

### getRevenueTrend

**Descripción:** Tendencia de ingresos por período.

**Parámetros:** days (default: 30)

---

### getTopProducts

**Descripción:** Productos más vendidos.

**Parámetros:** limit (default: 10), days (default: 30)

---

### getSalesReport

**Descripción:** Reporte de ventas.

**Parámetros:** startDate, endDate, days (default: 30)

---

## Support

### getTickets

**Descripción:** Lista tickets de soporte.

**Parámetros:** status, limit, etc.

**Restricciones:** organizationId, currentBranchId

---

### getTicketById

**Descripción:** Detalles de un ticket.

**Parámetros:** ticketId (UUID) o ticketNumber (ej. SUP-12345678-ABC12)

---

### updateTicketStatus

**Descripción:** Actualiza el estado de un ticket.

**Parámetros:** ticketId (UUID) o ticketNumber, status (enum)

---

### createTicketResponse

**Descripción:** Añade una respuesta a un ticket.

**Parámetros:** ticketId (UUID) o ticketNumber, content (string)

---

## Business Flow

### analyzeBusinessFlow

**Descripción:** Analiza el flujo de trabajo de la óptica e identifica cuellos de botella.

**Parámetros:** Ninguno

**Restricciones:** organizationId

**Ejemplo conversacional:** "¿Cómo puedo mejorar mi flujo de trabajo?"

---

## Diagnose

### diagnoseSystem

**Descripción:** Diagnóstico del sistema (configuración, datos, integridad).

**Parámetros:** Ninguno

**Restricciones:** organizationId

**Ejemplo conversacional:** "Diagnostica el sistema"

---

## Market Trends

### analyzeMarketTrends

**Descripción:** Analiza tendencias del mercado óptico.

**Parámetros:** Ninguno

**Restricciones:** organizationId

---

## Inventory

### optimizeInventory

**Descripción:** Sugiere optimizaciones de inventario (productos zombies, stock bajo).

**Parámetros:** Ninguno

**Restricciones:** organizationId, currentBranchId

**Ejemplo conversacional:** "¿Qué productos debería revisar en inventario?"

---

## Recommendations

### generateRecommendations

**Descripción:** Genera recomendaciones de ventas cruzadas y upselling basadas en contexto.

**Parámetros:** Ninguno (usa contexto organizacional)

**Restricciones:** organizationId

**Ejemplo conversacional:** "¿Qué productos recomiendas para aumentar ventas?"

---

## Import Bulk

### analyzeImportFile

**Descripción:** Analiza un archivo CSV/Excel subido y sugiere mapeo de columnas para importación masiva.

**Parámetros:**

| Parámetro  | Tipo   | Requerido | Descripción                                              |
| ---------- | ------ | --------- | -------------------------------------------------------- |
| fileId     | string | Sí        | Ruta de almacenamiento del archivo (ej. org_id/uuid.csv) |
| entityType | enum   | Sí        | customers o products                                     |

**Restricciones:** El archivo debe estar en el bucket import-temp.

**Ejemplo conversacional:** "Analiza este archivo para importar clientes" (con archivo adjunto)

**Errores posibles:** "Failed to download file", "File not found"

---

### executeBulkImport

**Descripción:** Ejecuta la importación masiva con el mapeo de columnas confirmado.

**Parámetros:**

| Parámetro     | Tipo          | Requerido         | Descripción                                          |
| ------------- | ------------- | ----------------- | ---------------------------------------------------- |
| fileId        | string        | Sí                | Ruta del archivo                                     |
| entityType    | enum          | Sí                | customers o products                                 |
| columnMapping | object        | Sí                | Mapa: "Header exacto del archivo" -> "campo_opttius" |
| branchId      | string (UUID) | Sí para customers | Sucursal donde importar                              |
| branchName    | string        | No                | Nombre de sucursal (alternativa a branchId)          |

**Restricciones:** Requiere confirmación del usuario antes de ejecutar. branchId obligatorio para customers.

**Ejemplo conversacional:** "Importa los clientes con el mapeo que sugeriste"

**Errores posibles:** "branchId required for customers", errores de validación por fila

---

## Contexto compartido (ToolExecutionContext)

Todas las tools reciben:

- `organizationId`: UUID de la organización
- `currentBranchId`: UUID de la sucursal (o null si vista global)
- `userId`: ID del usuario admin
- `supabase`: Cliente Supabase
- `currency`: Moneda de la organización
- `customerId`: Solo para tools de WhatsApp (cliente)

---

## Referencias

- Código fuente: `src/lib/ai/tools/`
- Tipos: `src/lib/ai/tools/types.ts`
- ToolExecutor: `src/lib/ai/agent/tool-executor.ts`
