# Flujo de Analíticas – Vista del Usuario

## 1. Contexto en la vida real (Chile)

Una óptica necesita **tomar decisiones basadas en datos** para mejorar ventas, optimizar inventario y medir el rendimiento del negocio. El módulo de Analíticas centraliza métricas de:

- **Ingresos**: ventas POS (caja) + trabajos de laboratorio (lentes montados).
- **Trabajos de laboratorio**: cuántos se crearon, cuántos están pendientes, cuántos entregados, días promedio de entrega.
- **Presupuestos**: cuántos se generaron, cuántos se aceptaron, tasa de conversión.
- **Citas**: ocupación de agenda, completación, no-shows.
- **Clientes**: totales, nuevos en período, recurrentes.
- **Productos**: top ventas, categorías más rentables, alertas de stock bajo.
- **Incidentes**: tickets de soporte interno, tiempos de resolución.

**Ejemplos concretos:**

- **Óptica Óptica Centro (Santiago)**: El admin revisa cada lunes los ingresos de la semana vs la anterior. Si el crecimiento es negativo, revisa la pestaña Presupuestos para ver si hay muchos rechazados.
- **Óptica con 3 sucursales**: El super admin selecciona "Todas las sucursales" y ve métricas consolidadas para comparar rendimiento entre locales.
- **Óptica con convenios**: Revisa la tendencia de ventas por categoría (armazones vs lentes) para decidir qué stock reponer.

**Problemas que resuelve el módulo:**

- Evitar decisiones a ciegas: ver números reales en lugar de intuición.
- Detectar tendencias: si las citas bajan, actuar antes de que afecte ventas.
- Identificar productos que más venden y cuáles tienen stock bajo.
- Medir efectividad comercial: tasa de conversión de presupuestos.
- Monitorear incidentes internos (problemas con lentes, entregas, etc.) para mejorar el servicio.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Acceder a Analíticas (admin)

1. Ir a **Admin** → **Analíticas** (menú lateral, icono de gráficos).
2. Verificar que el plan incluya **Analíticas avanzadas** (Pro o Premium). Si no, aparece mensaje: _"Analíticas avanzadas no están incluidas en tu plan. Actualiza a Pro o Premium."_
3. La página carga con datos del período por defecto (**Últimos 30 días**).

**Qué ve el usuario:** Título "Analíticas y Reportes", selector de período (7, 30, 90, 365 días), botón **Actualizar**, y cards de KPIs principales.

---

### Paso 2: Seleccionar período y sucursal

1. En el selector **Período**, elegir:
   - **Últimos 7 días**: para revisión semanal.
   - **Últimos 30 días**: vista mensual (por defecto).
   - **Últimos 90 días**: trimestre.
   - **Último año**: tendencias anuales.
2. Si el usuario es **super admin** y tiene varias sucursales:
   - Sin sucursal seleccionada: **Vista global** (todas las sucursales de la organización).
   - Con sucursal seleccionada (selector en el header): solo datos de esa sucursal.
3. Clic en **Actualizar** para refrescar los datos (opcional; los datos se recargan al cambiar período o sucursal).

**Qué ve el usuario:** Subtítulo indica "Métricas y análisis - Todas las sucursales - Últimos X días" o "Métricas y análisis - Últimos X días" si hay sucursal seleccionada.

---

### Paso 3: Revisar KPIs principales (cards superiores)

1. **Ingresos Totales**: monto total (POS + trabajos) y % de crecimiento vs período anterior (verde si sube, rojo si baja).
2. **Trabajos Lab.**: total de trabajos, completados y pendientes.
3. **Presupuestos**: total y tasa de conversión (%).
4. **Citas**: total y % completadas.

**Qué ve el usuario:** Cuatro cards grandes con iconos y colores distintivos. Cada métrica tiene un ícono de ayuda (?) con tooltip explicativo.

---

### Paso 4: Revisar KPIs secundarios

1. **Ventas POS**: ingresos del punto de venta y número de transacciones.
2. **Ingresos Trabajos**: ingresos de órdenes de laboratorio y días promedio de entrega.
3. **Clientes**: total, nuevos en período.
4. **Productos**: total en catálogo, alertas de bajo stock y sin stock.

**Qué ve el usuario:** Cuatro cards más pequeñas debajo de las principales. Si hay productos con stock bajo o sin stock, se muestran en naranja y rojo.

---

### Paso 5: Explorar pestañas de detalle

1. **Resumen**: gráficos de tendencia de ingresos, trabajos, distribución por estado (trabajos y presupuestos).
2. **Trabajos**: métricas detalladas (total, pendientes, completados, días promedio), tendencia de trabajos por día.
3. **Presupuestos**: total, aceptados, rechazados, tasa de conversión, valor promedio, tendencia por día.
4. **Ventas**: ingresos por categoría, métodos de pago (efectivo, débito, crédito, etc.), ticket promedio POS, crecimiento.
5. **Productos**: top productos más vendidos (por ingresos), tabla de rendimiento detallado, alertas de inventario.
6. **IA**: uso de insights y herramientas de IA (si aplica).
7. **Incidentes** (si hay tickets): total, abiertos, resueltos, tiempo promedio de resolución, distribución por estado y categoría.

**Qué ve el usuario:** Pestañas horizontales. En cada una, gráficos de barras, líneas, área o circular. Algunos gráficos permiten alternar entre vista de barras y líneas.

---

### Paso 6: Interpretar tendencias y tomar acción

1. **Tendencia de ingresos en baja**: revisar pestaña Presupuestos (¿muchos rechazados?) y Ventas (¿qué categorías caen?).
2. **Muchos trabajos pendientes**: ir a Trabajos de Laboratorio para priorizar entregas.
3. **Productos con bajo stock**: ir a Inventario para reponer.
4. **Tasa de conversión de presupuestos baja**: revisar proceso comercial o precios.
5. **Incidentes por categoría**: identificar patrones (ej. muchos "Problema con lente") para mejorar procesos.

**Qué ve el usuario:** Los datos son de solo lectura. Las acciones se realizan en los módulos correspondientes (Inventario, Presupuestos, Trabajos, etc.).

---

## 3. Diagrama simplificado

```
[Admin] Entra a Analíticas
        ↓
[Sistema] Valida plan (Pro/Premium) + rol admin
        ↓
[Admin] Selecciona período (7/30/90/365) y sucursal (opcional)
        ↓
[Sistema] Calcula KPIs desde POS, trabajos, presupuestos, citas, inventario, incidentes
        ↓
[Admin] Ve cards de KPIs + gráficos por pestaña
        ↓
[Admin] Interpreta datos → Toma acción en otros módulos (Inventario, Presupuestos, etc.)
```

---

## 4. Tabla de actores

| Actor            | Rol                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Admin óptica** | Revisa analíticas, interpreta métricas, toma decisiones de negocio (reposición, priorización, mejora de procesos). |
| **Super admin**  | Vista global de todas las sucursales; compara rendimiento entre locales.                                           |
| **Sistema**      | Agrega datos de POS, trabajos, presupuestos, citas, inventario e incidentes; calcula KPIs y tendencias.            |

---

## 5. Integraciones

| Módulo                      | Integración                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------- |
| **POS**                     | Ingresos de ventas (cash_register_closures o orders), métodos de pago, transacciones.   |
| **Trabajos de laboratorio** | Total, pendientes, completados, cancelados, días promedio entrega, tendencia.           |
| **Presupuestos**            | Total, aceptados, rechazados, convertidos, tasa de conversión, valor promedio.          |
| **Citas**                   | Total, completadas, no-show, tasa de completación.                                      |
| **CRM (Clientes)**          | Total clientes, nuevos en período, recurrentes.                                         |
| **Inventario**              | Productos totales, bajo stock, sin stock, top productos, ingresos por categoría.        |
| **Registro de Incidentes**  | Total tickets, abiertos, resueltos, tiempo promedio resolución, por estado y categoría. |
| **IA**                      | Insights y uso de herramientas (pestaña IA).                                            |

---

## 6. Rutas y pantallas

| Ruta               | Descripción                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/analytics` | Página única de Analíticas. Incluye selector de período, KPIs, pestañas (Resumen, Trabajos, Presupuestos, Ventas, Productos, IA, Incidentes). |

---

## 7. Requisitos y restricciones

| Aspecto            | Detalle                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Plan**           | Analíticas avanzadas requiere plan **Pro** o **Premium**. Planes básicos ven mensaje de actualización.                |
| **Rol**            | Solo usuarios con rol admin (is_admin) pueden acceder.                                                                |
| **Vista sucursal** | Admin con sucursal asignada: solo ve datos de su sucursal. Super admin sin sucursal: vista global de la organización. |
| **Caché**          | Los datos se cachean unos minutos (configurable). Botón **Actualizar** fuerza recálculo.                              |
| **Período**        | Mínimo 7 días, máximo 365 días.                                                                                       |

---

## 8. Fuentes de datos (referencia técnica)

| Métrica           | Fuente                                                            |
| ----------------- | ----------------------------------------------------------------- |
| Ingresos POS      | `cash_register_closures` (preferido) o `orders` con `is_pos_sale` |
| Ingresos trabajos | `lab_work_orders` con `payment_status = paid`                     |
| Trabajos          | `lab_work_orders`                                                 |
| Presupuestos      | `quotes`                                                          |
| Citas             | `appointments`                                                    |
| Clientes          | `customers`                                                       |
| Inventario        | `product_branch_stock` (no `products.inventory_quantity`)         |
| Incidentes        | `optical_internal_support_tickets`                                |
