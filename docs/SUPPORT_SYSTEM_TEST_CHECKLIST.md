# Checklist de Pruebas - Sistema de Registro de Incidentes

**Fecha:** 2026-02-20  
**Versión:** Post-mejoras

---

## 1. Navegación y UI

- [ ] El menú lateral muestra "Registro de Incidentes" (no "Soporte Interno")
- [ ] La descripción del ítem es "Registro de incidentes y problemas para análisis y mejora"
- [ ] La página `/admin/support` muestra título "Registro de Incidentes"
- [ ] El badge con conteo de tickets abiertos aparece si hay tickets pendientes
- [ ] El diálogo "Crear Ticket" muestra "Registrar Incidente" como título

---

## 2. Crear Ticket

- [ ] Crear ticket sin cliente asociado (solo asunto, descripción, categoría, prioridad)
- [ ] Crear ticket con cliente (buscar por nombre/RUT/email, seleccionar)
- [ ] Crear ticket con sucursal seleccionada (si hay selector de branch)
- [ ] Validación: asunto vacío muestra error
- [ ] Validación: descripción < 10 caracteres muestra error
- [ ] Tras crear, redirige al detalle del ticket
- [ ] El ticket aparece en la lista con número OPT-YYYYMMDD-XXXXX

---

## 3. Lista de Tickets

- [ ] Lista carga correctamente
- [ ] Filtros: Estado (open, in_progress, resolved, etc.)
- [ ] Filtros: Prioridad, Categoría, Cliente, Buscar
- [ ] Paginación funciona si hay más de 20 tickets
- [ ] Stats: Total, Abiertos, En Progreso, Resueltos muestran números correctos
- [ ] Click en ticket navega a detalle

---

## 4. Detalle de Ticket

- [ ] Carga datos del ticket (asunto, descripción, cliente, sucursal, etc.)
- [ ] Muestra badges de estado, prioridad, categoría
- [ ] Muestra enlaces a orden/trabajo/cita/cotización si están relacionados
- [ ] Botón "Editar" abre diálogo de actualización
- [ ] Formulario de mensaje permite agregar mensaje (sin checkbox "Nota interna")
- [ ] Mensajes se muestran en orden cronológico
- [ ] No debe haber checkbox "Nota interna (solo visible para el equipo)", los mensajes son internos por defecto

---

## 5. Actualizar Ticket (PATCH)

- [ ] Cambiar estado (open → in_progress → resolved)
- [ ] Cambiar prioridad
- [ ] Asignar a otro usuario (si hay admin users)
- [ ] Agregar resolution y resolution_notes al resolver
- [ ] Al marcar "resolved" o "closed", se guarda `resolution_time_minutes` (verificar en DB o en analytics)
- [ ] Se crea mensaje de sistema al cambiar estado/asignación

---

## 6. response_time_minutes (Trigger)

- [ ] Crear ticket nuevo
- [ ] Agregar primer mensaje al ticket
- [ ] Verificar en DB que `first_response_at` y `response_time_minutes` se actualizaron
- [ ] `response_time_minutes` ≈ minutos entre created_at y primer mensaje

---

## 7. resolution_time_minutes (PATCH)

- [ ] Tomar un ticket existente (o crear uno)
- [ ] Cambiar status a "resolved" o "closed"
- [ ] Verificar en DB que `resolved_at`, `resolved_by` y `resolution_time_minutes` están poblados
- [ ] `resolution_time_minutes` ≈ minutos entre created_at y resolved_at

---

## 8. Usuario Root (sin organization_id)

- [ ] Login como root o dev sin organization_id
- [ ] Tener `NEXT_PUBLIC_ROOT_ORG_ID` en .env.local
- [ ] GET `/api/admin/optical-support/tickets/[id]` retorna ticket (no 403)
- [ ] PATCH `/api/admin/optical-support/tickets/[id]` funciona (no 403)
- [ ] GET `/api/admin/optical-support/tickets/[id]/messages` funciona

---

## 9. Analytics - Tab Incidentes

- [ ] Ir a `/admin/analytics`
- [ ] Existe tab "Incidentes" (junto a Ventas, Órdenes, etc.)
- [ ] KPIs: Total Tickets, Abiertos, Resueltos, Tiempo Prom. Resolución
- [ ] Gráfico de tendencia (tickets por día) se muestra si hay datos
- [ ] Pie chart "Por Estado" se muestra si hay datos
- [ ] Pie chart "Por Categoría" se muestra si hay datos
- [ ] Cambiar período (7, 30, 90 días) actualiza los datos
- [ ] Vista por sucursal filtra correctamente (si aplica)
- [ ] Vista global (super admin) muestra datos de todas las sucursales

---

## 10. Sin Errores de Consola

- [ ] Abrir DevTools (F12) → Console
- [ ] Navegar por lista, detalle, crear ticket, editar
- [ ] No debe haber `console.log` de depuración visibles
- [ ] No debe haber errores rojos (excepto los esperados en flujos de error)

---

## 11. Identidad Epoch (2026-02)

- [ ] `/admin/support`: fondo crema (epoch-background), títulos con font-display, botones rounded-none, cards con admin-card
- [ ] `/admin/support/tickets/[id]`: misma paleta, botones y inputs sin bordes redondeados
- [ ] `/support` (portal público B2B): paleta Epoch, no blue/gray genérico
- [ ] `/admin/saas-management/support` (root): paleta Epoch en tabs, cards, filtros, lista

---

## 12. Soporte B2B (Portal y Panel Root)

- [ ] `/support`: crear ticket sin login, formulario completo, éxito muestra número SAAS-YYYYMMDD-XXXXX
- [ ] `/support/ticket/[ticketNumber]`: consulta de estado (si existe)
- [ ] `/admin/saas-management/support`: panel carga solo para root/dev, tabs Tickets y Búsqueda
- [ ] Búsqueda rápida: buscar por nombre/slug/email, resultados organizaciones y usuarios

---

## Resumen por Prioridad

**Crítico (debe funcionar):**

- Crear ticket, listar, ver detalle
- Cambiar estado a resolved (con resolution_time_minutes)
- Agregar mensaje (con response_time_minutes vía trigger)
- Tab Incidentes en analytics

**Importante:**

- Filtros, asignación, root user
- Nomenclatura "Registro de Incidentes"

**Opcional:**

- Verificar valores exactos en DB para response_time_minutes y resolution_time_minutes
