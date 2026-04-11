# Sistema de Operativos en Terreno - Opttius

Documentación detallada del módulo de Operativos en Terreno (Field Operations) para ópticas. Base de la estructura de documentación del programa. Este módulo permite procesar volúmenes masivos de pacientes fuera de la sucursal física, aprovechando la arquitectura mobile-first de Opttius.

---

## 1. Introducción

### 1.1 Alcance

El sistema de Operativos en Terreno permite a las ópticas:

- **Preparar operativos**: Transferir stock de armazones desde la bodega central a una "bodega móvil" temporal.
- **Operar sin conexión**: Registrar pacientes, exámenes y ventas en terreno con sincronización posterior.
- **Flujo masivo**: Registro rápido, receta digital en sitio, creación de órdenes de trabajo express.
- **Consolidación**: Agrupamiento de OT para procesamiento en lote en el laboratorio.
- **Entrega**: Gestión de entrega final en la empresa cliente, cerrando el ciclo.

### 1.2 Principios de Diseño

1. **Mobile-first**: Interfaz optimizada para dispositivos móviles en terreno.
2. **Offline-first**: Funcionalidad completa sin internet, sync al recuperar conexión.
3. **Multi-tenant**: Aislamiento por organización y sucursal.
4. **Óptica-específico**: Recetas, presbicia, inventario de marcos, cumplimiento Código Sanitario.
5. **Escalabilidad**: Lógica sencilla pero efectiva, código limpio, patrones del sistema.

### 1.3 Referencia de Flujo (Especificación Original)

```
2. Proceso Digital para Operativos en Terreno

Preparación del Operativo (Modo Inventario Móvil):
- Transferencia de Stock: Digitalmente, "trasladar" armazones desde bodega central a "bodega móvil" temporal.
- Sincronización Offline/Online: Registro de pacientes y exámenes sin internet, guardado local, sync con Supabase al recuperar conexión.

Flujo de Diagnóstico y Venta Masiva:
- Registro Rápido: Formulario simplificado para inscripción masiva.
- Emisión de Receta Digital en Sitio: Tecnólogo registra examen, sistema genera receta digital válida (Código Sanitario).
- Creación de OT Express: Vincular receta con armazón del inventario móvil, descontar automáticamente.

Consolidación de Logística y Taller:
- Agrupamiento de Partida: Marcar OT del operativo como "lote único" para laboratorio.
- Seguimiento de Entrega: Módulo para gestionar entrega final en empresa cliente.
```

---

## 2. Arquitectura de Datos

### 2.1 Diagrama de Entidades

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         field_operations                                     │
│  id, name, scheduled_date, location, branch_id, organization_id, status      │
│  created_by, created_at, updated_at                                          │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    operativo_mobile_stock                                    │
│  id, field_operation_id, product_id, quantity, reserved_quantity              │
│  UNIQUE(field_operation_id, product_id)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ Transferencia desde product_branch_stock
         │ Venta en terreno → reduce quantity
         │
┌─────────────────────────────────────────────────────────────────────────────┐
│                    operativo_sync_queue                                      │
│  id, device_id, field_operation_id, entity_type, payload (JSONB)             │
│  status (pending|syncing|synced|failed), created_at, synced_at              │
└─────────────────────────────────────────────────────────────────────────────┘

lab_work_orders (extender):
  + field_operation_id (FK → field_operations)
  + operativo_batch_id (UUID, agrupa OT del mismo operativo)
  + operativo_delivered_at (timestamp entrega en empresa)
  + operativo_recipient_name (quién recibe)
```

### 2.2 Tabla `field_operations`

| Columna                | Tipo        | Nullable | Descripción                                        |
| ---------------------- | ----------- | -------- | -------------------------------------------------- |
| id                     | UUID        | NO       | PK, gen_random_uuid()                              |
| name                   | TEXT        | NO       | Nombre del operativo                               |
| scheduled_date         | DATE        | NO       | Fecha programada                                   |
| location               | TEXT        | YES      | Ubicación (empresa, dirección)                     |
| branch_id              | UUID        | NO       | FK branches (sucursal origen)                      |
| organization_id        | UUID        | NO       | FK organizations                                   |
| status                 | TEXT        | NO       | draft, prepared, in_progress, completed, cancelled |
| created_by             | UUID        | YES      | FK auth.users                                      |
| created_at, updated_at | TIMESTAMPTZ | YES      | Auditoría                                          |

**Status**: draft → prepared (stock transferido) → in_progress (en terreno) → completed (cerrado).

### 2.3 Tabla `operativo_mobile_stock`

| Columna                | Tipo        | Nullable | Descripción             |
| ---------------------- | ----------- | -------- | ----------------------- |
| id                     | UUID        | NO       | PK                      |
| field_operation_id     | UUID        | NO       | FK field_operations     |
| product_id             | UUID        | NO       | FK products (armazones) |
| quantity               | INTEGER     | NO       | Stock en bodega móvil   |
| reserved_quantity      | INTEGER     | NO       | Reservado (default 0)   |
| created_at, updated_at | TIMESTAMPTZ | YES      | Auditoría               |

**UNIQUE**(field_operation_id, product_id).

### 2.4 Tabla `operativo_sync_queue`

| Columna            | Tipo        | Nullable | Descripción                                     |
| ------------------ | ----------- | -------- | ----------------------------------------------- |
| id                 | UUID        | NO       | PK                                              |
| device_id          | TEXT        | NO       | Identificador del dispositivo                   |
| field_operation_id | UUID        | NO       | FK field_operations                             |
| entity_type        | TEXT        | NO       | customer, prescription, lab_work_order, payment |
| payload            | JSONB       | NO       | Datos a sincronizar                             |
| status             | TEXT        | NO       | pending, syncing, synced, failed                |
| error_message      | TEXT        | YES      | Si failed                                       |
| created_at         | TIMESTAMPTZ | NO       | Momento de creación                             |
| synced_at          | TIMESTAMPTZ | YES      | Momento de sync exitoso                         |

### 2.5 Extensiones a `lab_work_orders`

| Columna                  | Tipo        | Descripción                    |
| ------------------------ | ----------- | ------------------------------ |
| field_operation_id       | UUID        | FK field_operations (nullable) |
| operativo_batch_id       | UUID        | Agrupa OT del mismo operativo  |
| operativo_delivered_at   | TIMESTAMPTZ | Fecha entrega en empresa       |
| operativo_recipient_name | TEXT        | Persona que recibe             |

---

## 3. Flujos de Negocio

### 3.1 Preparación del Operativo

```
1. Admin crea field_operation (status: draft)
2. Admin selecciona productos (armazones) y cantidades
3. POST /field-operations/[id]/transfer-stock
   - Reduce product_branch_stock (branch_id = sucursal)
   - Inserta/actualiza operativo_mobile_stock
4. Status → prepared
5. Sincronización inicial al dispositivo (datos del operativo + mobile_stock)
```

### 3.2 En Terreno (Offline-First)

```
1. Tecnólogo abre app en dispositivo, selecciona operativo
2. Sin conexión:
   - Registro paciente → guardar en IndexedDB + operativo_sync_queue (payload)
   - Examen/receta → prescriptions (local) + sync queue
   - Venta/OT Express → lab_work_order (local) + reducir operativo_mobile_stock (local)
   - Todo con UUIDs client-generated
3. Al recuperar conexión:
   - Procesar cola operativo_sync_queue en orden
   - POST /field-operations/[id]/sync con batch de payloads
   - Servidor: insertar/actualizar en Supabase, marcar synced
   - Conflict resolution: LWW (Last-Write-Wins)
```

### 3.3 OT Express (Orden de Trabajo en Terreno)

```
1. Cliente seleccionado (o creado rápido)
2. Receta creada en sitio (examen del tecnólogo)
3. Marco seleccionado del operativo_mobile_stock
4. Crear lab_work_order:
   - customer_id, prescription_id, frame_product_id
   - field_operation_id, operativo_batch_id (= field_operation_id o agrupador)
   - status: ordered
5. Reducir operativo_mobile_stock.quantity para el product_id
6. Si hay pago en terreno: order_payments (opcional, según flujo caja móvil)
```

### 3.4 Consolidación en Taller

```
1. Vista taller: filtrar lab_work_orders por field_operation_id o operativo_batch_id
2. Marcar "lote único" para procesamiento masivo
3. Flujo normal: sent_to_lab → in_progress_lab → ready_at_lab → received_from_lab → mounted → quality_check → ready_for_pickup
4. Todas las OT del operativo se procesan como grupo
```

### 3.5 Entrega en Empresa Cliente

```
1. Módulo de entrega: listar OT del operativo con status ready_for_pickup
2. Seleccionar OT a entregar
3. Registrar: operativo_delivered_at, operativo_recipient_name, notas
4. Status → delivered
5. Cierra ciclo de venta fuera del local
```

### 3.6 Cierre del Operativo

```
1. Devolver sobrantes: POST /field-operations/[id]/return-stock
   - operativo_mobile_stock → product_branch_stock (aumentar)
   - Eliminar o zerear operativo_mobile_stock
2. Status → completed
3. Auditoría: total pacientes, total OT, total entregados
```

---

## 4. Sincronización Offline/Online

### 4.1 Arquitectura de Sync

| Capa       | Tecnología                       | Propósito                      |
| ---------- | -------------------------------- | ------------------------------ |
| UI         | React/Next.js                    | Formularios, listados          |
| Domain     | Services                         | Lógica de negocio              |
| Local DB   | IndexedDB (idb) o SQLite         | Persistencia en dispositivo    |
| Sync Queue | operativo_sync_queue             | Cola de operaciones pendientes |
| Network    | Supabase REST                    | API remota                     |
| Background | Service Worker + Background Sync | Reintentos automáticos         |

### 4.2 Estrategia de Conflictos

- **Last-Write-Wins (LWW)**: Para simplicidad inicial. El servidor acepta el último update por `updated_at`.
- **Mejora futura**: Version vectors o CRDTs para colaboración multi-dispositivo.

### 4.3 Entidades Sincronizables

| entity_type    | Tabla destino   | Campos clave en payload                                              |
| -------------- | --------------- | -------------------------------------------------------------------- |
| customer       | customers       | first_name, last_name, rut, phone, branch_id, organization_id        |
| prescription   | prescriptions   | customer*id, od*\_, os\_\_, pd, exam_date                            |
| lab_work_order | lab_work_orders | customer*id, prescription_id, frame*\_, lens\_\_, field_operation_id |
| payment        | order_payments  | order_id, amount, method (si aplica caja móvil)                      |

### 4.4 Flujo de Sync

```
Dispositivo (offline)                Servidor
       │                                  │
       │  POST /sync (batch)              │
       │  [{entity: customer, payload},   │
       │   {entity: prescription, ...}]   │
       │ ──────────────────────────────► │
       │                                  │  Validar, insertar
       │                                  │  Actualizar operativo_sync_queue
       │  { synced: [...], failed: [...] } │
       │ ◄──────────────────────────────  │
       │  Marcar local como synced        │
       │  Limpiar cola local              │
```

---

## 5. Receta Digital en Sitio

### 5.1 Marco Legal (Chile)

- **Código Sanitario Art. 113 BIS**: El tecnólogo médico con mención en oftalmología está autorizado para prescribir y adaptar lentes ópticos tras detectar vicios de refracción.
- **Receta electrónica**: Puede extenderse en "documento gráfico o electrónico" (Código Sanitario).
- **Requisitos**: Firma electrónica avanzada (FEA) si aplica; código identificador verificable.

### 5.2 Implementación

- Formulario de examen: OD (esfera, cilindro, eje), OS (idem), ADD, PD.
- Generar prescription en Supabase con prescription_snapshot.
- Incluir en lab_work_order para trazabilidad.
- PDF o documento digital descargable para el paciente (opcional).

---

## 6. API Endpoints

### 6.1 Field Operations

| Método | Ruta                                            | Descripción                                         |
| ------ | ----------------------------------------------- | --------------------------------------------------- |
| GET    | /api/admin/field-operations                     | Lista (filtros: status, branch_id, organization_id) |
| POST   | /api/admin/field-operations                     | Crear operativo                                     |
| GET    | /api/admin/field-operations/[id]                | Detalle + mobile_stock                              |
| PUT    | /api/admin/field-operations/[id]                | Actualizar                                          |
| POST   | /api/admin/field-operations/[id]/transfer-stock | Transferir productos a bodega móvil                 |
| POST   | /api/admin/field-operations/[id]/return-stock   | Devolver sobrantes                                  |
| POST   | /api/admin/field-operations/[id]/sync           | Recibir payload de sync offline                     |
| GET    | /api/admin/field-operations/[id]/work-orders    | OT del operativo                                    |
| POST   | /api/admin/field-operations/[id]/deliver        | Registrar entrega en empresa                        |

### 6.2 Validación Zod (Esquemas)

```typescript
// createFieldOperationSchema
{
  name: z.string().min(1),
  scheduled_date: z.date(),
  location: z.string().optional(),
  branch_id: z.uuid(),
}

// transferStockSchema
{
  product_id: z.uuid(),
  quantity: z.number().int().positive(),
}

// syncPayloadSchema
{
  device_id: z.string(),
  items: z.array(z.object({
    entity_type: z.enum(['customer', 'prescription', 'lab_work_order', 'payment']),
    payload: z.record(z.unknown()),
    local_id: z.string().uuid(), // UUID client-generated
  })),
}

// deliverSchema
{
  work_order_ids: z.array(z.uuid()),
  delivered_at: z.date(),
  recipient_name: z.string(),
  notes: z.string().optional(),
}
```

---

## 7. Integración con Módulos Existentes

| Módulo             | Integración                                                                             |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Inventory**      | RPC update_product_stock para transferencia; operativo_mobile_stock como tabla separada |
| **Work Orders**    | Extender lab_work_orders con field_operation_id, operativo_batch_id                     |
| **CRM**            | customerService.create con branch_id del operativo                                      |
| **Prescriptions**  | Creación desde formulario de examen en terreno                                          |
| **POS**            | Flujo simplificado para venta en terreno (sin caja física obligatoria, o caja móvil)    |
| **Branch Context** | getBranchContext, addBranchFilter, validateBranchAccess                                 |

---

## 8. Estructura de Carpetas (Propuesta)

```
src/
  app/
    admin/
      field-operations/
        page.tsx              # Lista operativos
        [id]/
          page.tsx           # Detalle operativo
          prepare/
            page.tsx         # Transferir stock
          deliver/
            page.tsx         # Módulo entrega
    api/
      admin/
        field-operations/
          route.ts           # GET, POST
          [id]/
            route.ts         # GET, PUT
            transfer-stock/
              route.ts
            return-stock/
              route.ts
            sync/
              route.ts
            work-orders/
              route.ts
            deliver/
              route.ts
  components/
    admin/
      FieldOperations/
        OperativoList.tsx
        OperativoForm.tsx
        TransferStockForm.tsx
        SyncStatusIndicator.tsx
        DeliverForm.tsx
  lib/
    field-operations/
      sync-service.ts        # Lógica de sync offline
      mobile-stock-helpers.ts
```

---

## 9. Mejoras Futuras Descubiertas

Las siguientes mejoras han sido identificadas durante la investigación y diseño del módulo:

### 9.1 Sincronización

- **RxDB + Supabase Plugin**: Evaluar RxDB para sincronización offline-first con conflict resolution automático (git-like).
- **Sync delta**: Sincronizar solo cambios (delta) en lugar de payloads completos para reducir ancho de banda.
- **Versionado**: Implementar version vectors para conflict resolution más robusto en escenarios multi-dispositivo.

### 9.2 Inventario

- **Transferencias entre sucursales**: El módulo de operativos puede ser base para implementar transferencias product_branch_stock entre branches (actualmente en backlog).
- **Auditoría de movimientos**: Registrar en inventory_movements los movimientos de operativo_mobile_stock.

### 9.3 UX Mobile

- **PWA instalable**: Service Worker para cache-first de assets; instalación en dispositivo como app.
- **Escaneo de códigos**: Integración con cámara para escanear barcode de productos en transferencia y venta.
- **Indicador de conexión**: Badge visible de estado online/offline y cantidad de items pendientes de sync.

### 9.4 Código Sanitario

- **Firma electrónica**: Implementar FEA para recetas digitales si la normativa lo requiere.
- **Código verificable**: QR o código único para validación de receta en farmacia/óptica.

### 9.5 Caja Móvil

- **Sesión de caja por operativo**: Si se cobra en terreno, considerar pos_sessions con branch_id = operativo (o virtual branch para operativos).
- **Cierre de caja móvil**: Flujo de cierre al terminar el operativo.

### 9.6 Analytics

- **Métricas por operativo**: KPIs: pacientes atendidos, OT creadas, entregadas, revenue por operativo.
- **Dashboard de operativos**: Vista consolidada de operativos activos y completados.

---

## 10. Checklist de Implementación

- [ ] Migración: crear tablas field_operations, operativo_mobile_stock, operativo_sync_queue
- [ ] Migración: extender lab_work_orders con field_operation_id, operativo_batch_id, operativo_delivered_at, operativo_recipient_name
- [ ] API: CRUD field-operations
- [ ] API: transfer-stock, return-stock
- [ ] API: sync (endpoint para recibir payloads offline)
- [ ] API: deliver
- [ ] RLS: políticas para field_operations, operativo_mobile_stock, operativo_sync_queue
- [ ] UI: Lista y detalle operativos
- [ ] UI: Formulario transferencia stock
- [ ] UI: Módulo entrega
- [ ] Offline: IndexedDB + sync queue (cliente)
- [ ] Validación Zod en todos los endpoints
- [ ] Integración con BranchContext, organization_id
- [ ] Documentación: actualizar OPTTIUS_SKILLS_INDEX.md

---

## 11. Referencias

- **Skill**: `.cursor/skills/field-operations-optical-supabase/SKILL.md`
- **Inventario**: `docs/INVENTORY_SYSTEM.md`
- **Work Orders**: `docs/WORK_ORDERS_SYSTEM.md`
- **CRM**: `docs/CRM_SYSTEM.md`
- **POS**: `docs/POS_SYSTEM.md`
- **Código Sanitario Chile**: Art. 113 BIS (Ley 20.470)
- **Offline-first**: RxDB Supabase Plugin, IndexedDB, Background Sync API
- **NotebookLM**: Cuaderno Cerebro `e071bebc-ce79-4b32-a040-61a6a9c331a3`
