# Libro Digital de Recetas — Documentación del Módulo

Documentación detallada del módulo **Libro Digital de Recetas** para ópticas Opttius. Cumple con el Código Sanitario Chileno (Libro V) y proporciona una vista centralizada de auditoría para fiscalizaciones Seremi.

> **Sincronización NotebookLM**: Ejecutar `npm run notebooklm:sync` (tras `nlm login`) para añadir esta documentación al cuaderno Extendido. Ver `docs/NOTEBOOKLM_CUADERNOS_GUIA.md`.

---

## 1. Introducción

### 1.1 Sentido y Necesidad Legal

La creación de una sección específica llamada **"Libro Digital de Recetas"** es indispensable porque el **Código Sanitario Chileno (Libro V)** exige que toda óptica lleve un registro cronológico y detallado de las recetas despachadas.

| Requisito Legal           | Implementación Opttius                        |
| ------------------------- | --------------------------------------------- |
| Registro cronológico      | Tabla `prescriptions` con `prescription_date` |
| Detalle de receta         | OD/OS (esfera, cilindro, eje, adición, PD)    |
| Fiscalización Seremi      | Vista centralizada + exportación inmediata    |
| Centralización automática | Datos capturados en venta (POS, presupuesto)  |

### 1.2 Objetivos del Módulo

1. **Cumplimiento normativo**: Mostrar y exportar el registro de recetas ante inspección sin navegar cliente por cliente.
2. **Centralización**: Fetch de todas las recetas de la organización/sucursal en una sola vista.
3. **CRUD completo**: Crear, leer, actualizar y eliminar recetas desde el módulo (reutilizando datos existentes).
4. **Ventaja competitiva**: Diferenciación frente a EvOptica, SICO y sistemas tradicionales.

### 1.3 Principios de Diseño

1. **Reutilización**: NO duplicar datos. Usar tabla `prescriptions` existente.
2. **Enfoque híbrido**: Cada cliente es dueño de sus recetas; la vista centralizada es capa de reporte/auditoría.
3. **Multi-tenant**: Aislamiento por organización y sucursal.
4. **Código limpio**: Validación Zod, RLS, respuestas API estandarizadas.
5. **Escalable**: Filtros avanzados, exportación, vinculación con OT.

---

## 2. Arquitectura de Datos

### 2.1 Modelo Existente (prescriptions)

La tabla `prescriptions` ya existe y contiene todos los campos necesarios:

```
prescriptions
├── id (UUID, PK)
├── customer_id (UUID, FK customers) — obligatorio
├── organization_id (UUID, FK organizations)
├── branch_id (UUID, FK branches)
├── prescription_date (DATE) — fecha emisión
├── expiration_date (DATE)
├── prescription_number (TEXT)
├── issued_by (TEXT) — oftalmólogo/tecnólogo médico
├── issued_by_license (TEXT)
├── OD: od_sphere, od_cylinder, od_axis, od_add, od_pd, od_near_pd
├── OS: os_sphere, os_cylinder, os_axis, os_add, os_pd, os_near_pd
├── frame_pd, height_segmentation
├── prescription_type (single_vision, bifocal, progressive, etc.)
├── lens_type, lens_material
├── prism_od, prism_os, tint_od, tint_os
├── coatings (TEXT[])
├── notes, observations, recommendations
├── is_active, is_current
└── created_at, updated_at, created_by
```

### 2.2 Relaciones

```
customers 1────* prescriptions
prescriptions 1──* lab_work_orders (prescription_id)
prescriptions 1──* quotes (prescription_id)
prescriptions 1──* appointments (prescription_id)
```

### 2.3 Vista Centralizada (Libro Digital)

La vista del Libro Digital es un **fetch** sobre `prescriptions` con:

- **Join** con `customers` para nombre, RUT, email
- **Filtros**: organization_id, branch_id (addBranchFilter)
- **Orden**: prescription_date DESC (cronológico inverso para auditoría)
- **Paginación**: page, limit

No se crea tabla nueva. Es una query con joins.

---

## 3. API

### 3.1 Endpoints Existentes (por cliente)

| Método | Ruta                                                     | Descripción               |
| ------ | -------------------------------------------------------- | ------------------------- |
| GET    | /api/admin/customers/[id]/prescriptions                  | Lista recetas del cliente |
| POST   | /api/admin/customers/[id]/prescriptions                  | Crear receta              |
| GET    | /api/admin/customers/[id]/prescriptions/[prescriptionId] | Detalle                   |
| PUT    | /api/admin/customers/[id]/prescriptions/[prescriptionId] | Actualizar                |
| DELETE | /api/admin/customers/[id]/prescriptions/[prescriptionId] | Eliminar                  |

Estos endpoints se reutilizan. El Libro Digital puede abrir un modal o redirigir al perfil del cliente para editar.

### 3.2 Nuevos Endpoints (Libro Digital)

#### GET /api/admin/prescriptions

Lista centralizada de recetas con filtros y paginación.

**Query params:**

| Parámetro | Tipo   | Descripción                     |
| --------- | ------ | ------------------------------- |
| q, search | string | Búsqueda por nombre o RUT       |
| rut       | string | RUT del paciente (normalizado)  |
| date_from | date   | Fecha emisión desde             |
| date_to   | date   | Fecha emisión hasta             |
| issued_by | string | Profesional que prescribe       |
| branch_id | uuid   | Sucursal (o header x-branch-id) |
| page      | number | Página (default 1)              |
| limit     | number | Por página (default 20)         |

**Respuesta:** Paginada con `createPaginatedResponse`. Cada item incluye:

- Datos de prescription
- customer: { id, first_name, last_name, rut, email }
- work_orders_count: número de OT vinculadas

**Filtrado:**

- `addBranchFilter` para branch_id y organization_id
- Join: prescriptions LEFT JOIN customers ON prescriptions.customer_id = customers.id
- Subquery o join para count de lab_work_orders por prescription_id

#### GET /api/admin/prescriptions/export

Exportar recetas en CSV o XLS para Seremi.

**Query params:**

| Parámetro | Tipo   | Descripción |
| --------- | ------ | ----------- | ---- |
| format    | string | csv         | xlsx |
| date_from | date   | Opcional    |
| date_to   | date   | Opcional    |
| branch_id | uuid   | Opcional    |

**Respuesta:** Archivo descargable (Content-Disposition: attachment).

---

## 4. Filtros de Búsqueda Avanzada

Obligatorios para ventaja competitiva:

| Filtro            | Implementación                                              |
| ----------------- | ----------------------------------------------------------- |
| **RUT paciente**  | `customers.rut` con `normalizeRUT()` y `ilike`              |
| **Nombre**        | `customers.first_name`, `last_name` con `ilike`             |
| **Fecha emisión** | `prescriptions.prescription_date` entre date_from y date_to |
| **Profesional**   | `prescriptions.issued_by` con `ilike`                       |
| **Número receta** | `prescriptions.prescription_number` con `ilike`             |
| **Sucursal**      | `prescriptions.branch_id` o header x-branch-id              |

---

## 5. Vinculación con Órdenes de Trabajo (OT)

### 5.1 Regla

La receta no debe ser un dato aislado. Debe estar amarrada a un flujo donde, si existe receta, se genere automáticamente una OT vinculada para evitar errores manuales de transcripción hacia el laboratorio.

### 5.2 Estado Actual

- `lab_work_orders.prescription_id` → FK a prescriptions
- `lab_work_orders.prescription_snapshot` → JSONB con receta al momento de crear
- POS (process-sale) y Quote convert ya vinculan prescription_id

### 5.3 Mejoras para Libro Digital

- En la tabla del Libro, mostrar columna "OT vinculadas" con count y link.
- Botón "Crear OT desde receta" que abre flujo de creación de work order con prescription_id pre-cargado.

---

## 6. Módulo de Presbicia

### 6.1 Contexto

El segmento de pacientes con presbicia es un motor de demanda inelástico en Chile. La tabla debe destacar claramente los campos de adición lejana/cercana.

### 6.2 Campos Relevantes

- `od_add`, `os_add` — Adición
- `od_near_pd`, `os_near_pd` — PD cercana
- `prescription_type`: bifocal, trifocal, progressive

### 6.3 Funcionalidad

- En la vista Libro, columna "Presbicia" con badge si od_add o os_add presentes.
- Acción "Crear presupuesto desde receta" que pre-carga datos de presbicia para presupuestos rápidos.

---

## 7. Exportabilidad Multiformato

### 7.1 Requisito

La exportación debe ser compatible con **CSV** y **XLS** (Excel). Es la "llave" que permite a los dueños de ópticas entregar datos a la autoridad sanitaria en segundos.

### 7.2 Implementación

- **CSV**: Generar con librería como `papaparse` o manualmente.
- **XLS**: Usar `xlsx` (SheetJS) o similar.
- Columnas: fecha, RUT, nombre, profesional, OD (esf, cil, eje, add, PD), OS (idem), tipo, número receta, sucursal.

---

## 8. Seguimiento de Garantías y Recurrencia

### 8.1 Alertas de Fidelización

Utilizar la data de la tabla para implementar alertas: notificar al usuario cuando una receta esté por cumplir un año para invitar al paciente a un nuevo control.

### 8.2 Estado Actual

- Cron `/api/cron/prescription-expiring` ya envía emails para recetas con expiration_date en 30 días.
- Extensión: notificación en panel admin (admin_notifications) para recordatorio de control.

---

## 9. Multi-Tenant y RLS

### 9.1 Filtrado

1. **organization_id**: Siempre filtrar por organización del admin.
2. **branch_id**: Si x-branch-id presente y no "global", filtrar por branch_id.
3. **Super admin**: Con "global" ve todas las sucursales de la organización.

### 9.2 Políticas RLS (prescriptions)

Ya configuradas en `20260204000001_add_multitenancy_to_prescriptions.sql`:

- SELECT: organization_id = get_user_organization_id() OR is_root_user()
- ALL: Mismo criterio con WITH CHECK.

---

## 10. UI/UX Propuesta

### 10.1 Ruta

`/admin/prescriptions` o `/admin/libro-recetas`

### 10.2 Componentes

1. **Tabla principal**: Filas = recetas con datos de cliente (nombre, RUT), fecha, profesional, OD/OS resumido, tipo, OT vinculadas.
2. **Filtros**: Barra con RUT, nombre, fecha desde/hasta, profesional, sucursal.
3. **Acciones por fila**: Ver detalle, Editar (abre modal o redirige a cliente), Crear presupuesto, Crear OT.
4. **Exportar**: Botón "Exportar CSV" / "Exportar Excel".
5. **Paginación**: Estándar del sistema.

### 10.3 Responsive

- Tabla con scroll horizontal en móvil.
- Filtros colapsables en móvil.

---

## 11. Plan de Implementación

### Fase 1: API y datos

1. Crear GET /api/admin/prescriptions con join customers, addBranchFilter, paginación.
2. Implementar filtros (RUT, fecha, profesional).
3. Añadir work_orders_count por receta.

### Fase 2: Exportación

1. Crear GET /api/admin/prescriptions/export.
2. Soporte CSV y XLS.

### Fase 3: UI

1. Página /admin/prescriptions.
2. Tabla con datos y filtros.
3. Acciones: ver, editar, crear presupuesto.

### Fase 4: Mejoras

1. "Crear OT desde receta".
2. Notificaciones admin para recetas próximas a vencer.
3. Badge presbicia en tabla.

---

## 12. Referencias

- Skill: `.cursor/skills/libro-recetas-digital-optical/SKILL.md`
- CRM: `docs/CRM_SYSTEM.md`, `.cursor/skills/crm-optical-supabase/SKILL.md`
- Work Orders: `docs/WORK_ORDERS_SYSTEM.md`
- Quotes: `.cursor/skills/quotes-optical-supabase/SKILL.md`
- Migraciones: `supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql`, `20260204000001_add_multitenancy_to_prescriptions.sql`
