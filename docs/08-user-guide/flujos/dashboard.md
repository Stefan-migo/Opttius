# Flujo de Dashboard – Vista del Usuario

## 1. Contexto en la vida real (Chile)

El administrador o dueño de una óptica inicia su jornada entrando al sistema. Necesita una **visión ejecutiva** al instante: cuánto vendió el mes pasado, cuántas citas tiene hoy, si hay productos con bajo stock, cuántos trabajos de laboratorio están pendientes. Sin un dashboard centralizado, tendría que revisar varios módulos (POS, agenda, inventario, taller) para armar ese panorama.

**Ejemplos concretos:**

- **Óptica Providencia (Santiago)**: El admin abre Opttius a las 8:00 y ve: ingresos del mes $4.200.000 (+12% vs mes anterior), 8 citas hoy (5 confirmadas), 3 alertas de inventario (lentes de contacto marca X), 12 trabajos en taller (4 pendientes, 6 en progreso, 2 listos).
- **Óptica multi-sucursal**: Un super_admin con sucursales en Providencia y Las Condes puede elegir ver el **resumen global** (todas las sucursales) o filtrar por una sucursal específica desde el selector de sucursal.
- **Vendedor en mostrador**: Usa el Dashboard para buscar rápido un cliente por nombre o RUT antes de atenderlo, o para localizar un producto en el catálogo.

**Problemas que resuelve el módulo:**

- Centralizar KPIs clave en una sola pantalla (ingresos, citas, inventario, clientes, trabajos, presupuestos).
- Alertar sobre inventario crítico (bajo stock) para evitar quedar sin producto en venta.
- Accesos rápidos a POS, agenda, taller, catálogo y clientes sin navegar por el menú.
- Búsqueda rápida de cliente o producto desde el propio dashboard.
- Crear una cita nueva sin salir del resumen ejecutivo.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Acceder al Dashboard (admin / vendedor)

1. Iniciar sesión en Opttius.
2. Ir a **Admin** (o ser redirigido automáticamente tras el login).
3. La ruta `/admin` muestra el **Resumen Ejecutivo** (Dashboard principal).

**Qué ve el usuario:** Título "Resumen Ejecutivo" con subtítulo "Visión general del negocio • Operaciones del día". Botones de acción: Actualizar, POS, Agenda, Taller. Si es super_admin, un selector de sucursal en el header permite ver datos de una sucursal o de todas (vista global).

---

### Paso 2: Revisar alertas de inventario (admin)

1. Si hay productos con **bajo stock**, aparece un banner rojo debajo del header.
2. El banner muestra: cantidad de alertas, nombres de los primeros productos afectados (ej. "Lentes de contacto Acuvue, Cristales progresivos...") y un botón **GESTIONAR ARCHIVO**.
3. Clic en **GESTIONAR ARCHIVO** → redirige a `/admin/products?filter=low_stock` para revisar y reponer stock.

**Qué ve el usuario:** Card de alerta con icono de advertencia. Mensaje tipo: "3 Alertas de Inventario – Artículos críticos: Lentes X, Cristales Y y 1 más".

---

### Paso 3: Revisar KPIs (admin / vendedor)

1. Debajo del header (y del banner de alertas, si existe) hay **4 tarjetas de KPIs**:
   - **Rendimiento Mensual**: Ingresos del mes actual, % cambio vs mes anterior (ej. +12,3%).
   - **Agenda del Día**: Citas de hoy, cuántas confirmadas.
   - **Inventario Activo**: Total de unidades en catálogo, alertas críticas o "Archivo Saludable".
   - **Cartera de Clientes**: Total de clientes, cuántos nuevos en el ciclo (ej. +15 este ciclo).

2. Cada tarjeta muestra el contexto: "Sucursal: Providencia" o "Todas las sucursales" (super_admin en vista global).

**Qué ve el usuario:** Grid de 4 cards con iconos, números grandes y etiquetas descriptivas. En móvil, las cards se adaptan a 2 columnas.

---

### Paso 4: Ver evolución de ingresos y estado operativo (admin)

1. **Gráfico Evolución de Ingresos**: Área chart con ingresos por período.
2. Selector de período: **7 días**, **30 días**, **3 meses**, **12 meses**.
3. **Gráfico Estado Operativo**: Pie chart con distribución de trabajos de laboratorio:
   - En progreso (enviados al lab, en lab, montados, etc.)
   - Pendientes (ordenados, no enviados)
   - Concluidos (entregados)

4. Si hay ventas, aparece también **Best Sellers**: top 5 productos por ingresos (bar chart horizontal en desktop, lista en móvil).

**Qué ve el usuario:** Dos gráficos principales (evolución de ingresos + estado operativo). Un tercer gráfico (Best Sellers) si hay datos. Empty state si no hay registros: "Falta de registros para el análisis operativo" o "Sin actividad operativa en el taller".

---

### Paso 5: Revisar citas del día (admin / vendedor)

1. Sección **Citas de Hoy** con lista de hasta 10 citas del día.
2. Cada fila muestra: hora, duración, nombre del cliente, tipo de cita, badge de estado (Programada, Confirmada, Completada, Cancelada, No asistió).
3. Clic en una cita → redirige a `/admin/appointments` para gestionar la agenda.
4. Botón **GESTIONAR AGENDA** → `/admin/appointments`.

**Qué ve el usuario:** Card con lista de citas ordenadas por hora. Si no hay citas: "Tranquilidad absoluta para este ciclo – No hay registros de citas programadas para el día de hoy."

---

### Paso 6: Acciones rápidas (admin / vendedor)

1. Panel **Acciones Rápidas** (lado derecho en desktop, arriba de los gráficos en móvil):
   - **LOCALIZAR CLIENTE**: Clic abre modal de búsqueda. Escribir mínimo 2 caracteres (nombre, email o RUT); debounce 300 ms. Resultados → clic lleva a `/admin/customers/[id]`.
   - **IDENTIFICAR PRODUCTO**: Clic abre modal de búsqueda. Escribir nombre, SKU o código de barras. Resultados → clic lleva a `/admin/products/edit/[id]`.
   - **Nueva Cita Médica**: Abre modal con formulario de creación de cita. Al guardar, cierra modal, refresca dashboard y muestra toast "AGENDAMIENTO COMPLETADO".
   - **Catálogo** → `/admin/products`.
   - **Clientes** → `/admin/customers`.
   - Enlace **Ver Documentación** → `/admin/docs`.

**Qué ve el usuario:** Panel con botones de búsqueda (LOCALIZAR CLIENTE, IDENTIFICAR PRODUCTO), botón "Nueva Cita Médica" y botones Catálogo/Clientes. Al hacer clic en un botón de búsqueda, se abre un modal; al escribir y seleccionar un resultado, navega al detalle del cliente o producto.

---

### Paso 7: Navegar a otros módulos desde el header (admin / vendedor)

1. **Actualizar**: Botón con icono de refresh. Recarga los datos del dashboard manualmente.
2. **POS**: Botón principal → `/admin/pos` (Venta Rápida).
3. **AGENDA**: → `/admin/appointments`.
4. **TALLER**: → `/admin/work-orders`. Si hay trabajos pendientes, muestra un badge con el número (ej. 4).

**Qué ve el usuario:** Botones en el header. El badge en Taller solo aparece cuando hay trabajos pendientes.

---

## 3. Diagrama simplificado

```
[Admin/Vendedor] Inicia sesión → [Sistema] Redirige a /admin
        ↓
[Sistema] Carga datos (KPIs, citas, inventario, gráficos) según sucursal
        ↓
[Admin] Revisa alertas de inventario → [Admin] Clic "GESTIONAR ARCHIVO" → /admin/products?filter=low_stock
        ↓
[Admin] Revisa KPIs (ingresos, citas, inventario, clientes)
        ↓
[Admin] Cambia período del gráfico (7/30/90/365 días) → [Sistema] Actualiza Evolución de Ingresos
        ↓
[Admin] Busca cliente/producto en Acciones Rápidas → [Sistema] Muestra resultados → [Admin] Clic → /admin/customers/[id] o /admin/products/edit/[id]
        ↓
[Admin] Clic "Nueva Cita Médica" → [Modal] Formulario → [Admin] Guarda → [Sistema] Cierra modal, refresca dashboard
        ↓
[Admin] Clic en cita del día o "GESTIONAR AGENDA" → /admin/appointments
        ↓
[Admin] Clic POS / TALLER / AGENDA → Navega al módulo correspondiente
```

---

## 4. Tabla de actores

| Actor            | Rol                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin óptica** | Revisa resumen ejecutivo, alertas de inventario, KPIs y gráficos; gestiona citas desde el dashboard; usa accesos rápidos a POS, agenda, taller, catálogo y clientes. |
| **Super admin**  | Puede ver vista global (todas las sucursales) o filtrar por sucursal con el BranchSelector.                                                                          |
| **Vendedor**     | Usa el dashboard para buscar clientes y productos rápidamente antes de atender; crea citas; accede a POS y agenda.                                                   |
| **Sistema**      | Agrega datos de órdenes, cierres de caja, inventario, citas, trabajos y presupuestos; filtra por sucursal u organización según contexto.                             |

---

## 5. Integraciones

| Módulo                   | Integración                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **POS**                  | Botón "POS" en header → `/admin/pos`. Ingresos calculados desde `cash_register_closures` o `orders` (completed/paid).                                                   |
| **Agenda (Citas)**       | Citas del día, botón "AGENDA", "GESTIONAR AGENDA", modal "Nueva Cita Médica" → `/admin/appointments`.                                                                   |
| **Taller (Work Orders)** | Badge de pendientes en botón "TALLER", gráfico Estado Operativo (pie) → `/admin/work-orders`.                                                                           |
| **Inventario**           | Alerta bajo stock, KPI Inventario Activo, botón "GESTIONAR ARCHIVO" → `/admin/products?filter=low_stock`. Usa `product_branch_stock`, no `products.inventory_quantity`. |
| **CRM (Clientes)**       | KPI Cartera, búsqueda "LOCALIZAR CLIENTE", botón Clientes → `/admin/customers`.                                                                                         |
| **Presupuestos**         | KPIs de presupuestos (total, pendientes, convertidos) en API; no se muestran como cards en la UI actual.                                                                |
| **Analytics**            | Enlace desde navegación lateral → `/admin/analytics` (análisis profundo, tier Pro/Premium).                                                                             |
| **IA**                   | Insights diarios (cron), Chatbot con contexto `dashboard` (flotante en esquina).                                                                                        |

---

## 6. Rutas de referencia

| Acción                            | Ruta admin                         |
| --------------------------------- | ---------------------------------- |
| Dashboard principal               | `/admin`                           |
| POS                               | `/admin/pos`                       |
| Agenda                            | `/admin/appointments`              |
| Taller                            | `/admin/work-orders`               |
| Productos (con filtro bajo stock) | `/admin/products?filter=low_stock` |
| Clientes                          | `/admin/customers`                 |
| Detalle cliente                   | `/admin/customers/[id]`            |
| Editar producto                   | `/admin/products/edit/[id]`        |
| Analíticas                        | `/admin/analytics`                 |
| Documentación                     | `/admin/docs`                      |

---

## 7. Notas de implementación

- **Filtro por sucursal**: Header `x-branch-id` con UUID de sucursal o `"global"` (solo super_admin). Los datos se filtran por `branch_id` o por `organization_id` en vista global.
- **Ingresos**: Se prefieren `cash_register_closures.total_sales` cuando hay cierres confirmados; si no, se usa `orders` con `status === "completed"` o `payment_status === "paid"`.
- **Inventario**: Siempre `product_branch_stock` (quantity, low_stock_threshold). Nunca `products.inventory_quantity`.
- **Período del gráfico**: 7, 30, 90 o 365 días. Validado en API (7–365).
- **Refresh**: Manual con botón Actualizar; también se recarga al cambiar sucursal o período.
- **Empty states**: Mensajes orientados a la acción cuando no hay datos (ej. "Falta de registros para el análisis operativo", "Sin actividad operativa en el taller", "Tranquilidad absoluta para este ciclo" en citas).
