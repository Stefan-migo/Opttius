# Flujo de Registro de Incidentes (Soporte B2C) – Vista del Usuario

## 1. Contexto en la vida real (Chile)

Una óptica atiende diariamente a clientes que pueden tener problemas con sus lentes, marcos, entregas, pagos o citas. El **Registro de Incidentes** es un sistema interno donde el personal de la óptica documenta estos casos para:

- Dar seguimiento a cada problema hasta su resolución
- Identificar patrones recurrentes (ej. problemas con cierto proveedor de lentes)
- Mejorar el servicio basándose en datos concretos
- Cumplir con tiempos de respuesta y resolución

**Importante:** El cliente **no crea tickets**. Son los empleados, vendedores o admins de la óptica quienes registran los incidentes cuando un cliente reporta un problema en tienda, por teléfono o por otro canal.

**Ejemplos concretos:**

- **Problema con lente:** Cliente Juan Pérez (RUT 12.345.678-9) reclama que los lentes bifocales le dan mareo. El vendedor registra el incidente, categoría "Problema con Lente", prioridad Alta.
- **Problema con entrega:** La Sra. María González esperaba sus lentes hace 5 días. El encargado de sucursal Centro crea un ticket, vincula la orden de trabajo y asigna al técnico de laboratorio.
- **Queja del cliente:** Un cliente insatisfecho con el trato recibido. El admin registra la queja para análisis y mejora del servicio.
- **Problema de pago:** Discrepancia en el monto cobrado vs. lo facturado. Se documenta para conciliación.

**Problemas que resuelve el módulo:**

- Centralizar todos los incidentes con clientes en un solo lugar
- Evitar que los problemas queden "en el aire" sin seguimiento
- Asignar responsables y medir tiempos de resolución
- Generar datos para analítica (categorías más frecuentes, tiempo promedio de resolución)
- Base para insights con IA y recomendaciones de mejora

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Crear un incidente (empleado, vendedor o admin)

1. Ir a **Registro de Incidentes** (menú lateral) → **Crear Ticket**.
2. Se abre un diálogo. Completar:
   - **Categoría** (obligatorio): Problema con Lente, Problema con Marco, Problema con Receta, Problema con Entrega, Problema con Pago, Problema con Cita, Queja del Cliente, Problema de Calidad, Otro
   - **Prioridad** (obligatorio): Baja, Media, Alta, Urgente
   - **Cliente** (opcional): Buscar por nombre, RUT o email. Si el problema está relacionado con un cliente específico, vincularlo.
   - **Asunto** (obligatorio): Resumen breve del problema (ej. "Lentes bifocales dan mareo - Juan Pérez")
   - **Descripción** (obligatorio): Detalle del problema, qué se hizo o se está haciendo para resolverlo (mínimo 10 caracteres)
3. Guardar: el ticket se crea con número único (ej. OPT-20250301-00001) y se redirige al detalle del ticket.

**Qué ve el usuario:** Diálogo con formulario. Al guardar, toast de éxito y redirección al detalle del ticket recién creado.

---

### Paso 2: Ver lista de incidentes y filtrar

1. En **Registro de Incidentes**, ver:
   - **Stats:** Total, Abiertos, En Progreso, Resueltos
   - **Filtros:** Estado, Prioridad, Categoría, Cliente, Sucursal (si Super Admin), Buscar (por número de ticket, asunto)
2. Aplicar filtros según necesidad (ej. solo "En Progreso", solo "Problema con Entrega").
3. Clic en un ticket para ir al detalle.

**Qué ve el usuario:** Cards con métricas, panel de filtros, lista de tickets con badges de estado, prioridad, categoría, cliente y sucursal. Paginación si hay muchos tickets.

---

### Paso 3: Gestionar el ticket (asignar, actualizar estado, agregar mensajes)

1. En el **detalle del ticket** (`/admin/support/tickets/[id]`):
   - Ver descripción, cliente vinculado, sucursal, entidades relacionadas (orden, trabajo de laboratorio, presupuesto, cita)
   - Clic en **Editar** para actualizar:
     - **Estado:** Abierto → Asignado → En Progreso → Esperando Cliente → Resuelto → Cerrado
     - **Prioridad:** Baja, Media, Alta, Urgente
     - **Asignar a:** Seleccionar empleado/admin responsable
     - **Resolución:** Descripción de cómo se resolvió el problema
     - **Notas de Resolución:** Información adicional
2. En la sección **Conversación**, agregar mensajes (notas internas) para documentar avances, llamadas al cliente, etc.
3. Guardar cambios: el ticket se actualiza y el historial queda registrado.

**Qué ve el usuario:** Página con detalles del ticket, sidebar con info del cliente y enlaces a órdenes/trabajos/citas relacionadas. Formulario para agregar mensajes. Diálogo "Editar" para cambiar estado, prioridad, asignación y resolución.

---

### Paso 4: Resolver y cerrar

1. Cuando el problema está resuelto, en **Editar**:
   - Cambiar **Estado** a "Resuelto"
   - Completar **Resolución** (obligatorio para documentar la solución)
   - Opcionalmente **Notas de Resolución**
2. Guardar: el sistema calcula automáticamente el tiempo de resolución (`resolution_time_minutes`).
3. Opcionalmente cambiar a "Cerrado" cuando el ticket ya no requiere seguimiento.

**Qué ve el usuario:** Al marcar Resuelto, el ticket deja de permitir agregar mensajes. Aparece alerta indicando que puede crear un nuevo ticket si necesita más información.

---

### Paso 5: Analítica (admin)

1. Ir a **Analíticas** → pestaña **Incidentes**.
2. Ver métricas:
   - Total tickets, Abiertos, Resueltos
   - Tiempo promedio de resolución
   - Distribución por categoría (gráfico de torta)
   - Distribución por estado
   - Tendencia de tickets por día

**Qué ve el usuario:** Dashboard con KPIs y gráficos para identificar patrones y mejorar el servicio.

---

## 3. Diagrama simplificado

```
[Cliente] Reporta problema en tienda/teléfono
              ↓
[Empleado/Vendedor] Registro de Incidentes → Crear Ticket
              ↓
[Sistema] Crea ticket (OPT-YYYYMMDD-XXXXX), estado: Abierto
              ↓
[Admin/Empleado] Asigna responsable → Estado: Asignado
              ↓
[Responsable] Trabaja en el caso → Estado: En Progreso
              ↓
[Responsable] Agrega mensajes (notas, avances)
              ↓
[Responsable] Si espera respuesta del cliente → Estado: Esperando Cliente
              ↓
[Responsable] Resuelve → Completa Resolución → Estado: Resuelto
              ↓
[Sistema] Calcula resolution_time_minutes
              ↓
[Admin] Revisa analítica (categorías, tiempos, tendencias)
```

---

## 4. Tabla de actores

| Actor                   | Rol                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin óptica**        | Crea incidentes, asigna responsables, actualiza estados, resuelve tickets, revisa analítica. Super Admin puede ver tickets de todas las sucursales. |
| **Vendedor / Empleado** | Registra incidentes cuando un cliente reporta un problema en tienda. Puede agregar mensajes y ver tickets de su sucursal.                           |
| **Cliente**             | Reporta el problema en persona, por teléfono o otro canal. No interactúa con el sistema; el personal de la óptica documenta el caso.                |

---

## 5. Integraciones

| Módulo           | Integración                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **CRM**          | Vinculación de cliente al ticket (búsqueda por nombre, RUT, email). Enlace al detalle del cliente desde el ticket.             |
| **Work Orders**  | Ticket puede vincularse a una orden de trabajo (`related_work_order_id`). Enlace directo al trabajo desde el detalle.          |
| **Quotes**       | Ticket puede vincularse a un presupuesto (`related_quote_id`).                                                                 |
| **Appointments** | Ticket puede vincularse a una cita (`related_appointment_id`).                                                                 |
| **Orders**       | Ticket puede vincularse a una orden (`related_order_id`).                                                                      |
| **Analytics**    | Métricas de incidentes (total, abiertos, resueltos, tiempo promedio, por categoría, tendencias) en el dashboard de analíticas. |

---

## 6. Rutas de referencia

| Acción                  | Ruta admin                                |
| ----------------------- | ----------------------------------------- |
| Listado de incidentes   | `/admin/support`                          |
| Crear ticket (diálogo)  | `/admin/support` → botón "Crear Ticket"   |
| Detalle de ticket       | `/admin/support/tickets/[id]`             |
| Analítica de incidentes | `/admin/analytics` → pestaña "Incidentes" |

---

## 7. Categorías y estados

### Categorías

| Slug               | Descripción          |
| ------------------ | -------------------- |
| lens_issue         | Problema con Lente   |
| frame_issue        | Problema con Marco   |
| prescription_issue | Problema con Receta  |
| delivery_issue     | Problema con Entrega |
| payment_issue      | Problema con Pago    |
| appointment_issue  | Problema con Cita    |
| customer_complaint | Queja del Cliente    |
| quality_issue      | Problema de Calidad  |
| other              | Otro                 |

### Estados del ciclo de vida

| Estado           | Descripción                     |
| ---------------- | ------------------------------- |
| open             | Abierto, sin asignar            |
| assigned         | Asignado a empleado/admin       |
| in_progress      | En progreso                     |
| waiting_customer | Esperando respuesta del cliente |
| resolved         | Resuelto                        |
| closed           | Cerrado                         |

---

## 8. Notas de implementación

- **Filtro por sucursal:** Usuarios normales ven solo tickets de su sucursal. Super Admin en vista global puede filtrar por sucursal o ver todas.
- **Métricas automáticas:** Al insertar el primer mensaje, se calcula `response_time_minutes`. Al cambiar estado a Resuelto o Cerrado, se calcula `resolution_time_minutes`.
- **Número de ticket:** Formato `OPT-YYYYMMDD-XXXXX` (único por organización).
- **Mensajes:** Son notas internas del equipo. El cliente no ve la conversación; es documentación interna para seguimiento.
