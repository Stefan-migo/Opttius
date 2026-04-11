---
name: field-operations-optical-supabase
description: Expert guide for building and maintaining the Field Operations (Operativos en Terreno) module for optical shops with Supabase. Use when working on operativos en terreno, field operations, mobile inventory, bodega móvil, sincronización offline, registro masivo de pacientes, receta digital en sitio, OT express, agrupamiento de partida, entrega en empresa cliente, or optical mass screening workflows. Covers multi-tenant architecture, offline-first sync, mobile inventory transfer, batch work order processing, and optical-specific field operation patterns.
---

# Operativos en Terreno para Ópticas con Supabase

Guía para desarrollar y mantener el módulo de Operativos en Terreno (Field Operations) de alta gama para ópticas usando Supabase y Next.js. Procesa volúmenes masivos de pacientes fuera de la sucursal física.

## Cuándo Usar Este Skill

- Preparación de operativos (transferencia stock → bodega móvil)
- Modo inventario móvil (bodega temporal por operativo)
- Sincronización offline/online (registro sin internet, sync al recuperar conexión)
- Registro masivo de pacientes en terreno
- Emisión de receta digital en sitio (Código Sanitario Chile)
- Creación de OT Express (orden de trabajo vinculada a inventario móvil)
- Agrupamiento de partida (lote único para laboratorio)
- Seguimiento de entrega en empresa cliente
- Cierre del ciclo de venta fuera del local

## Arquitectura Core

### Flujo del Operativo

```
1. PREPARACIÓN (Sucursal)
   Transferencia stock → operativo_mobile_stock (bodega móvil temporal)
   Sincronización datos al dispositivo móvil

2. EN TERRENO (Mobile, offline-first)
   Registro rápido pacientes → prescriptions → lab_work_orders (OT Express)
   Descuento automático de operativo_mobile_stock
   Cola de sync cuando offline

3. CONSOLIDACIÓN (Sucursal/Laboratorio)
   Marcar OT del operativo como "lote único"
   Procesamiento masivo en taller

4. ENTREGA (Empresa cliente)
   Módulo de entrega en sitio
   Cierre del ciclo
```

### Tablas Principales (Propuestas)

| Tabla                    | Propósito                                                                |
| ------------------------ | ------------------------------------------------------------------------ |
| `field_operations`       | Operativos (nombre, fecha, ubicación, branch_id, status)                 |
| `operativo_mobile_stock` | Stock temporal por operativo (product_id, operativo_id, quantity)        |
| `operativo_sync_queue`   | Cola de sincronización offline (device_id, entity_type, payload, status) |
| `lab_work_orders`        | Extender con `field_operation_id`, `operativo_batch_id`                  |

### Bodega Móvil vs Bodega Central

- **product_branch_stock**: Stock en sucursal física (bodega central).
- **operativo_mobile_stock**: Stock "trasladado" al operativo. Al transferir, se reduce product_branch_stock y se crea/aumenta operativo_mobile_stock.
- **Al vender en terreno**: Se reduce operativo_mobile_stock (no product_branch_stock).
- **Al cerrar operativo**: Devolución de sobrantes a product_branch_stock.

## Multi-Tenant y RLS

### Filtrado Obligatorio

1. **organization_id**: Siempre filtrar por organización.
2. **branch_id**: Operativos pertenecen a una sucursal origen.
3. **field_operation_id**: Work orders creados en operativo deben vincularse al operativo.

### Headers

- `x-branch-id`: Sucursal del operativo.
- `x-operativo-id`: Contexto de operativo activo (en terreno).
- `x-device-id`: Dispositivo móvil para sync offline.

## Sincronización Offline/Online

### Estrategia Recomendada

1. **Local-first**: IndexedDB o SQLite (via sql.js/wa-sqlite) para datos en dispositivo.
2. **Sync queue**: Tabla `operativo_sync_queue` con status: pending, syncing, synced, failed.
3. **Conflict resolution**: Last-Write-Wins (LWW) para simplicidad; versionado opcional.
4. **Service Worker**: Cache-first para assets; network-first para API con fallback a cola.
5. **Background Sync**: API Background Sync para reintentos automáticos.

### Entidades a Sincronizar

- customers (registro rápido)
- prescriptions (receta digital en sitio)
- lab_work_orders (OT Express)
- order_payments (si hay cobro en terreno)
- operativo_mobile_stock (movimientos)

### UUIDs Estables

- Usar `crypto.randomUUID()` en cliente para IDs de registros creados offline.
- Evitar remapeo al sincronizar; Supabase acepta UUIDs client-generated.

## Reglas Óptica-Específicas

### 1. Registro Rápido de Pacientes

- Formulario simplificado: nombre, RUT, teléfono, email (opcional).
- branch_id = sucursal del operativo.
- organization_id = organización.
- Validar RUT con normalizeRUT.

### 2. Receta Digital en Sitio

- Tecnólogo registra examen (OD/OS, esfera, cilindro, eje, ADD, PD).
- Sistema genera receta digital válida (Código Sanitario Art. 113 BIS).
- prescription_snapshot en lab_work_order para trazabilidad.
- Cumplir requisitos de receta electrónica si aplica (firma, código verificable).

### 3. OT Express

- Creación inmediata al vender en terreno.
- Vincular: prescription_id, customer_id, frame del inventario móvil.
- Descontar de operativo_mobile_stock (no product_branch_stock).
- field_operation_id en lab_work_order.
- operativo_batch_id para agrupamiento en taller.

### 4. Agrupamiento de Partida

- operativo_batch_id: agrupa todas las OT de un operativo.
- Vista taller: filtrar por batch para procesar como lote único.
- Optimiza tiempo de montaje masivo.

### 5. Entrega en Empresa Cliente

- Módulo de entrega: listar OT del operativo pendientes de entrega.
- Marcar entregado en sitio (empresa, persona que recibe, fecha).
- Cierra ciclo de venta fuera del local.

## API Endpoints (Propuestos)

| Método | Ruta                                            | Descripción                                   |
| ------ | ----------------------------------------------- | --------------------------------------------- |
| GET    | /api/admin/field-operations                     | Lista operativos (filtros: status, branch_id) |
| POST   | /api/admin/field-operations                     | Crear operativo                               |
| GET    | /api/admin/field-operations/[id]                | Detalle + mobile_stock                        |
| PUT    | /api/admin/field-operations/[id]                | Actualizar                                    |
| POST   | /api/admin/field-operations/[id]/transfer-stock | Transferir productos a bodega móvil           |
| POST   | /api/admin/field-operations/[id]/return-stock   | Devolver sobrantes                            |
| POST   | /api/admin/field-operations/[id]/sync           | Recibir payload de sync offline               |
| GET    | /api/admin/field-operations/[id]/work-orders    | OT del operativo                              |
| POST   | /api/admin/field-operations/[id]/mark-batch     | Marcar OT como lote                           |
| POST   | /api/admin/field-operations/[id]/deliver        | Registrar entrega en empresa                  |

## Validación Zod

- createFieldOperationSchema: name, scheduled_date, location, branch_id.
- transferStockSchema: product_id, quantity, operativo_id.
- syncPayloadSchema: entity_type, payload (JSON), device_id, timestamp.
- deliverSchema: work_order_ids[], delivered_at, recipient_name, notes.

## Integración con Módulos Existentes

| Módulo        | Integración                                                 |
| ------------- | ----------------------------------------------------------- |
| Inventory     | Transferencia product_branch_stock → operativo_mobile_stock |
| Work Orders   | field_operation_id, operativo_batch_id en lab_work_orders   |
| CRM           | Registro rápido customers con branch_id del operativo       |
| Prescriptions | Creación en sitio, prescription_snapshot                    |
| POS           | Flujo simplificado para venta en terreno (sin caja física)  |

## Mejores Prácticas

### Código

- Usar getBranchContext y validateBranchAccess en todas las rutas.
- Respuestas: createApiSuccessResponse, createPaginatedResponse.
- Validación Zod obligatoria.
- Rate limiting en sync (evitar avalancha de requests).

### Offline

- PWA con Service Worker para instalación en dispositivo.
- Indicador visual de estado de conexión y cola pendiente.
- Reintentos con backoff exponencial en sync.

### UX Mobile

- Formularios con campos mínimos (registro rápido).
- Escaneo de código de barras para productos.
- Feedback inmediato (optimistic updates).

## Checklist de Calidad

- [ ] organization_id y branch_id en todas las entidades
- [ ] Transferencia stock: reducir product_branch_stock, crear operativo_mobile_stock
- [ ] OT Express: descontar operativo_mobile_stock
- [ ] Sync: cola ordenada, reintentos, conflict resolution definido
- [ ] operativo_batch_id para agrupamiento en taller
- [ ] Módulo de entrega con trazabilidad
- [ ] Validación Zod en todos los endpoints
- [ ] Respuestas API estandarizadas

## Referencias

- Documentación detallada: `docs/FIELD_OPERATIONS_SYSTEM.md`
- Inventario: `.cursor/skills/inventory-optical-supabase/SKILL.md`
- Work Orders: `.cursor/skills/work-orders-optical-supabase/SKILL.md`
- CRM: `.cursor/skills/crm-optical-supabase/SKILL.md`
- POS: `.cursor/skills/pos-optical-supabase/SKILL.md`
