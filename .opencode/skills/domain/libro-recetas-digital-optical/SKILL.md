---
name: libro-recetas-digital-optical
description: Expert guide for building and maintaining the Digital Recipe Book (Libro Digital de Recetas) module for optical shops with Supabase. Use when working on libro de recetas, registro de recetas despachadas, cumplimiento Código Sanitario Chile, Seremi fiscalización, recetas centralizadas, exportación auditoría, vinculación receta-OT, presbicia en recetas, or optical regulatory compliance. Covers multi-tenant architecture, RLS, centralized prescription view, legal compliance, and Chilean optical regulatory patterns.
---

# Libro Digital de Recetas para Ópticas con Supabase

Guía para desarrollar y mantener el módulo **Libro Digital de Recetas** de alta gama para ópticas usando Supabase y Next.js. Cumple con el Código Sanitario Chileno (Libro V) y posiciona a Opttius como herramienta que entiende la normativa sanitaria chilena.

## Cuándo Usar Este Skill

- Libro Digital de Recetas (registro cronológico de recetas despachadas)
- Vista centralizada de recetas para auditoría y fiscalización Seremi
- CRUD de recetas desde módulo autónomo (reutilizando tabla `prescriptions`)
- Filtros avanzados (RUT paciente, fecha emisión, profesional que prescribe)
- Vinculación receta ↔ orden de trabajo (OT)
- Exportación multiformato (CSV, XLS) para autoridad sanitaria
- Alertas de recetas próximas a vencer (fidelización)
- Módulo de presbicia destacado (adición lejana/cercana)

## Sentido y Necesidad Legal

### Código Sanitario Chileno (Libro V)

El Código Sanitario exige que **toda óptica lleve un registro cronológico y detallado** de las recetas despachadas. El Libro Digital de Recetas es la implementación digital de este requisito.

| Requisito                 | Implementación                                                             |
| ------------------------- | -------------------------------------------------------------------------- |
| Registro cronológico      | `prescription_date` + orden por fecha descendente                          |
| Detalle de receta         | OD/OS (esfera, cilindro, eje, adición, PD) en tabla `prescriptions`        |
| Fiscalización Seremi      | Vista centralizada + exportación inmediata sin navegar cliente por cliente |
| Centralización automática | Datos capturados en venta (POS, presupuesto) y volcados a tabla maestra    |

### Beneficio Estratégico

Resuelve el "dolor" del óptico independiente: miedo al desorden y multas por incumplimiento del Libro de Recetas físico. Posiciona a Opttius frente a EvOptica o SICO como herramienta que entiende la normativa.

## Arquitectura Core

### Enfoque Híbrido (Recomendado)

- **Modelo de datos**: Cada cliente "es dueño" de sus recetas (`prescriptions.customer_id`). Se preserva falla clínica e historial individual.
- **Vista centralizada**: Capa de reporte y auditoría que hace **fetch** de todas las recetas (join con `customers`) para el Libro Digital.
- **Sin duplicación**: NO crear tabla paralela. Reutilizar `prescriptions` existente.

### Tabla `prescriptions` (Existente)

| Campo                                          | Tipo        | Descripción                               |
| ---------------------------------------------- | ----------- | ----------------------------------------- |
| id                                             | UUID        | PK                                        |
| customer_id                                    | UUID        | FK customers (obligatorio)                |
| organization_id                                | UUID        | Multi-tenant                              |
| branch_id                                      | UUID        | Sucursal                                  |
| prescription_date                              | DATE        | Fecha emisión                             |
| expiration_date                                | DATE        | Vencimiento                               |
| prescription_number                            | TEXT        | Número receta                             |
| issued_by                                      | TEXT        | Oftalmólogo/tecnólogo médico              |
| issued_by_license                              | TEXT        | Nº licencia profesional                   |
| od_sphere, od_cylinder, od_axis, od_add, od_pd | DECIMAL     | Ojo derecho                               |
| os_sphere, os_cylinder, os_axis, os_add, os_pd | DECIMAL     | Ojo izquierdo                             |
| od_near_pd, os_near_pd                         | DECIMAL     | PD cercana (presbicia)                    |
| prescription_type                              | TEXT        | single_vision, bifocal, progressive, etc. |
| lens_type, lens_material                       | TEXT        | Tipo y material                           |
| prism_od, prism_os, tint_od, tint_os           | TEXT        | Especiales                                |
| coatings                                       | TEXT[]      | Tratamientos                              |
| notes, observations, recommendations           | TEXT        | Notas                                     |
| is_active, is_current                          | BOOLEAN     | Estado                                    |
| created_at, updated_at, created_by             | TIMESTAMPTZ | Auditoría                                 |

### Relaciones

```
customers 1──* prescriptions (customer_id)
prescriptions 1──* lab_work_orders (prescription_id)
prescriptions 1──* quotes (prescription_id)
prescriptions 1──* appointments (prescription_id)
```

## API Endpoints

### Existente (por cliente)

| Método | Ruta                                                     | Descripción               |
| ------ | -------------------------------------------------------- | ------------------------- |
| GET    | /api/admin/customers/[id]/prescriptions                  | Lista recetas del cliente |
| POST   | /api/admin/customers/[id]/prescriptions                  | Crear receta              |
| GET    | /api/admin/customers/[id]/prescriptions/[prescriptionId] | Detalle                   |
| PUT    | /api/admin/customers/[id]/prescriptions/[prescriptionId] | Actualizar                |
| DELETE | /api/admin/customers/[id]/prescriptions/[prescriptionId] | Eliminar                  |

### Nuevo (Libro Digital - Vista Centralizada)

| Método | Ruta                            | Descripción                                                                   |
| ------ | ------------------------------- | ----------------------------------------------------------------------------- |
| GET    | /api/admin/prescriptions        | Lista centralizada con filtros (RUT, fecha, profesional, branch) y paginación |
| GET    | /api/admin/prescriptions/export | Exportar CSV/XLS para Seremi                                                  |

**Query params para GET /api/admin/prescriptions:**

- `q` / `search`: Búsqueda por nombre cliente o RUT
- `rut`: RUT del paciente (normalizado)
- `date_from`, `date_to`: Rango de fecha de emisión
- `issued_by`: Profesional que prescribe
- `branch_id`: Sucursal (o usar header x-branch-id)
- `page`, `limit`: Paginación

## Multi-Tenant y RLS

### Filtrado Obligatorio

1. **organization_id**: Siempre filtrar por organización del admin.
2. **branch_id**: Si usuario tiene sucursal (x-branch-id), filtrar por branch_id. Super admin con "global" ve todas las sucursales de la org.
3. **addBranchFilter**: Usar `addBranchFilter` de `@/lib/api/branch-middleware` para queries de prescriptions (via join con customers o prescriptions.branch_id).

### Políticas RLS (prescriptions)

Ya existen en migración `20260204000001_add_multitenancy_to_prescriptions.sql`:

- SELECT: `organization_id = get_user_organization_id()` OR `is_root_user(auth.uid())`
- ALL (INSERT/UPDATE/DELETE): Mismo criterio con WITH CHECK.

## Filtros de Búsqueda Avanzada (Obligatorios)

El Libro Digital debe permitir búsquedas instantáneas por:

| Filtro                    | Campo                             | Tipo                            |
| ------------------------- | --------------------------------- | ------------------------------- |
| RUT paciente              | customers.rut                     | Normalizar con `normalizeRUT()` |
| Nombre paciente           | customers.first_name, last_name   | ilike                           |
| Fecha emisión             | prescriptions.prescription_date   | date_from, date_to              |
| Profesional que prescribe | prescriptions.issued_by           | ilike                           |
| Número receta             | prescriptions.prescription_number | ilike                           |
| Sucursal                  | prescriptions.branch_id           | eq                              |

## Vinculación con Órdenes de Trabajo (OT)

- **Regla**: La receta no debe ser un dato aislado. Si existe receta, debe poder generarse automáticamente una OT vinculada.
- **Flujo**: Al crear OT desde presupuesto o POS, se usa `prescription_id` y se guarda `prescription_snapshot` en lab_work_orders.
- **Libro Digital**: Mostrar en cada fila si la receta tiene OT vinculada (count de lab_work_orders con prescription_id).
- **Evitar errores**: Transcripción manual hacia laboratorio se minimiza al usar prescription_snapshot.

## Módulo de Presbicia

- **Segmento clave**: Pacientes con presbicia son motor de demanda inelástico en Chile.
- **Campos a destacar**: `od_add`, `os_add`, `od_near_pd`, `os_near_pd`.
- **Presupuestos rápidos**: Desde la sección de recetas, permitir "Crear presupuesto desde receta" con datos de adición pre-cargados.

## Exportabilidad Multiformato

- **Formatos**: CSV, XLS (Excel).
- **Contenido**: Todas las columnas relevantes para auditoría (fecha, RUT, nombre, profesional, OD/OS, tipo, etc.).
- **Uso**: Entregar a autoridad sanitaria en segundos ante fiscalización.
- **Endpoint**: GET /api/admin/prescriptions/export?format=csv|xlx&date_from=&date_to=&branch_id=

## Seguimiento de Garantías y Recurrencia

- **Alertas de fidelización**: Notificar cuando receta esté por cumplir 1 año (expiration_date en 30 días).
- **Cron existente**: `/api/cron/prescription-expiring` ya envía emails para recetas próximas a vencer.
- **Extensión**: Añadir notificación en admin (admin_notifications) para recordatorio de control.

## Integración con Otros Módulos

### CRM (customers)

- Recetas viven en customer. El Libro Digital es vista agregada.
- Al editar receta desde Libro, redirigir o abrir modal en contexto del cliente.

### Work Orders

- Mostrar badge "OT vinculada" en fila de receta.
- Link a OT desde receta.

### Quotes

- "Crear presupuesto desde receta" pre-carga prescription_id.

### POS (process-sale)

- Al vender con receta, los datos se capturan y persisten en prescriptions. El Libro los refleja automáticamente.

## Validación Zod

- Reutilizar schemas existentes de `CreatePrescriptionForm` y API customers/prescriptions.
- Para export: validar `format` (csv|xlsx), `date_from`, `date_to` como opcionales.

## Checklist de Calidad

- [ ] Filtro organization_id en todas las queries
- [ ] addBranchFilter o equivalente para branch_id
- [ ] Búsqueda RUT con normalización (normalizeRUT, formatRUT)
- [ ] Filtros: fecha, profesional, número receta
- [ ] Paginación en GET /api/admin/prescriptions
- [ ] Export CSV/XLS funcional
- [ ] CRUD reutiliza endpoints existentes (customers/[id]/prescriptions)
- [ ] Vista Libro muestra join con customers (nombre, RUT)
- [ ] Indicador de OT vinculada por receta
- [ ] Respuestas API: createPaginatedResponse, createApiSuccessResponse

## Referencias

- Documentación detallada: `docs/LIBRO_RECETAS_DIGITAL.md`
- API prescriptions por cliente: `src/app/api/admin/customers/[id]/prescriptions/`
- Tabla prescriptions: `supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql`
- Multi-tenancy prescriptions: `supabase/migrations/20260204000001_add_multitenancy_to_prescriptions.sql`
- CRM: `.cursor/skills/crm-optical-supabase/SKILL.md`
- Work Orders: `.cursor/skills/work-orders-optical-supabase/SKILL.md`
- Quotes: `.cursor/skills/quotes-optical-supabase/SKILL.md`
