# Evaluación de Base de Datos - Opttius

**Fecha:** 15 de Febrero 2026  
**Evaluador:** Senior Software Engineer (AI Assistant)  
**Referencia:** Supabase Postgres Best Practices Skill  
**Proyecto:** Opttius - Sistema SaaS Multi-Tenant para Ópticas

---

## Resumen Ejecutivo

Esta evaluación analiza el estado de la implementación de base de datos del proyecto Opttius, incluyendo migraciones, esquema, políticas RLS, índices y cumplimiento con las mejores prácticas de Supabase/PostgreSQL. El proyecto demuestra una arquitectura multi-tenant sólida con RLS extensivo, pero existen oportunidades de mejora en varios aspectos críticos.

**Calificación General: 7.5/10** ⭐⭐⭐⭐☆

| Categoría                  | Calificación | Estado       |
| -------------------------- | ------------ | ------------ |
| Migraciones y Organización | 6.5/10       | ⚠️ Mejorable |
| Esquema y Diseño           | 7.5/10       | ✅ Bueno     |
| RLS y Seguridad            | 8/10         | ✅ Muy Bueno |
| Índices y Performance      | 7/10         | ⚠️ Mejorable |
| Mejores Prácticas          | 7/10         | ⚠️ Mejorable |

---

## 1. Análisis de Migraciones

### 1.1 Estructura General

- **Total de migraciones:** ~153 archivos SQL
- **Rango temporal:** Diciembre 2024 - Febrero 2026
- **Convención de nombres:** `YYYYMMDDHHMMSS_descripcion.sql` (correcta)

### 1.2 Problemas Identificados

#### 🔴 Duplicación de Migraciones

| Migración 1                                     | Migración 2                                            | Problema                                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260209100000_create_telemetry_system.sql`    | `20260210020309_create_telemetry_system.sql`           | **Duplicado casi idéntico** - Ambas crean `telemetry_events`, `telemetry_aggregates`, `telemetry_config`. La segunda es redundante (usa `CREATE TABLE IF NOT EXISTS`). |
| `20260121000000_create_lens_price_matrices.sql` | `20260129000000_create_lens_families_and_matrices.sql` | **Tablas duplicadas** - `lens_families` y `lens_price_matrices` creadas en ambas. La segunda añade campos adicionales.                                                 |

**Recomendación:** Consolidar migraciones duplicadas. Eliminar la migración de telemetry más reciente si no aporta cambios sustanciales, o documentar explícitamente la razón de la duplicación.

#### 🟡 Migraciones de "Fix" en Cascada

Existen **8 migraciones consecutivas** (20260215100000 - 20260215100007) dedicadas a corregir la función `seed_demo_organization_data`:

- `fix_reset_demo_500.sql`
- `reset_demo_skip_missing_credit_notes.sql`
- `fix_reset_demo_uuid_format.sql`
- `fix_reset_demo_on_conflict_partial_index.sql`
- `fix_reset_demo_appointment_type.sql`
- etc.

**Problema:** Indica que el proceso de seed demo no fue suficientemente validado antes de múltiples deploys. Cada fix genera una migración nueva.

**Recomendación:**

- Consolidar la función `seed_demo_organization_data` en una sola migración bien probada.
- Usar el archivo `docs/SEED_CONSTRAINTS_REFERENCE.md` como checklist obligatorio antes de cada cambio al seed.
- Considerar mover la lógica de seed a `supabase/seed.sql` o scripts separados no versionados como migraciones.

#### 🟡 Mezcla de Concerns

Las migraciones mezclan:

- **Schema changes** (CREATE TABLE, ALTER TABLE)
- **Seed data** (INSERT en subscription_tiers, datos demo)
- **Funciones de negocio** (seed_demo_organization_data con 250+ líneas)
- **Fix de bugs** en funciones existentes

**Recomendación:** Separar claramente:

1. Migraciones de schema (estructura)
2. Migraciones de seed inicial (datos de referencia)
3. Funciones de utilidad/demo en archivos separados o en seed scripts

### 1.3 Aspectos Positivos

- ✅ Uso consistente de `CREATE TABLE IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS` para idempotencia
- ✅ Comentarios en migraciones complejas (ej: `20260215100006` explica ON CONFLICT con partial indexes)
- ✅ Uso de `ON CONFLICT DO UPDATE/NOTHING` donde corresponde
- ✅ Documentación de constraints en `SEED_CONSTRAINTS_REFERENCE.md`

---

## 2. Esquema y Diseño de Tablas

### 2.1 Primary Keys

**Evaluación según Best Practices (schema-primary-keys):**

| Práctica                          | Estado         | Observación                                                                                                              |
| --------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Evitar UUIDv4 random              | ⚠️ Parcial     | **Todas las tablas usan `gen_random_uuid()` o `uuid_generate_v4()`** - Causa fragmentación de índices en tablas grandes. |
| Preferir IDENTITY para single-DB  | ❌ No aplicado | No hay tablas con `bigint generated always as identity`.                                                                 |
| UUIDv7 para sistemas distribuidos | ❌ No usado    | Requeriría extensión `pg_uuidv7`.                                                                                        |

**Recomendación:** Para tablas de alto volumen (orders, telemetry_events, appointments), considerar:

- Mantener UUID si se necesita para APIs públicas o federación
- Evaluar migración a UUIDv7 cuando esté disponible en Supabase
- Para tablas nuevas pequeñas, UUID actual es aceptable

### 2.2 Identificadores (schema-lowercase-identifiers)

✅ **Cumplimiento total:** Todas las tablas y columnas usan `snake_case` en minúsculas. No se encontraron identificadores entrecomillados con mixed-case.

### 2.3 Foreign Keys e Índices (schema-foreign-key-indexes)

**Best Practice:** Postgres NO indexa automáticamente columnas FK. Los JOINs y CASCADE sin índice causan full table scans.

**Análisis de migraciones:**

| Tabla                | FK Columnas                                   | Índice Creado             | Estado       |
| -------------------- | --------------------------------------------- | ------------------------- | ------------ |
| orders               | customer_id, branch_id, organization_id       | idx_orders_org, etc.      | ✅ Parcial   |
| order_items          | order_id, product_id                          | Implícito en PK/FK        | ⚠️ Verificar |
| products             | category_id, branch_id, organization_id       | idx_products_org          | ✅           |
| appointments         | customer_id, branch_id, organization_id       | idx_appointments_org      | ✅           |
| lab_work_orders      | customer_id, branch_id, prescription_id, etc. | idx_lab_work_orders_org   | ✅           |
| telemetry_events     | user_id, organization_id                      | No explícito en migración | ⚠️ Revisar   |
| internal_order_items | internal_order_id                             | No explícito              | ⚠️ Revisar   |

**Recomendación:** Ejecutar la query de detección de FKs sin índice:

```sql
SELECT conrelid::regclass AS table_name, a.attname AS fk_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );
```

### 2.4 Organización de Tablas

La estructura refleja bien el dominio óptico:

- **Core:** organizations, branches, admin_users, customers
- **Productos:** products, categories, product_variants, product_branch_stock
- **Óptica:** prescriptions, quotes, lab_work_orders, lens_families, lens_price_matrices
- **Operaciones:** orders, order_items, appointments, pos_sessions
- **SaaS:** subscriptions, subscription_tiers, payment_gateways_config
- **Soporte:** saas_support_tickets, optical_internal_support_tickets

---

## 3. Row Level Security (RLS)

### 3.1 Cobertura

✅ **RLS habilitado** en las tablas principales revisadas:

- categories, products, orders, appointments, customers
- organizations, branches, subscriptions
- lens_families, lens_price_matrices
- telemetry_events, telemetry_aggregates
- internal_orders, drivers, vehicles
- saas_support_tickets, optical_internal_support_tickets

### 3.2 Patrones de Políticas

**Patrón multi-tenant correcto:**

```sql
-- Uso de get_user_organization_id() para aislamiento
organization_id = public.get_user_organization_id()
OR (is_root_user(auth.uid()))
```

**Función auxiliar bien diseñada:**

- `get_user_organization_id()` - SECURITY DEFINER, SET search_path = public
- `is_root_user()` - Para super admins

### 3.3 Optimización de Performance (security-rls-performance)

**Problema potencial:** Las políticas repiten subconsultas como:

```sql
EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true)
```

**Best Practice:** Envolver `auth.uid()` en subquery para que se evalúe una vez:

```sql
-- En lugar de: auth.uid() = user_id (llamado por fila)
-- Usar: (SELECT auth.uid()) = user_id (llamado una vez, cacheado)
```

**Recomendación:** Revisar políticas con múltiples `auth.uid()` y reemplazar por `(SELECT auth.uid())`.

### 3.4 FORCE ROW LEVEL SECURITY

⚠️ **No se encontró** `ALTER TABLE ... FORCE ROW LEVEL SECURITY` en las migraciones.

**Implicación:** Los propietarios de tablas (rol `postgres`/`supabase_admin`) pueden bypassear RLS. En Supabase esto es esperado para operaciones de servicio, pero para tablas críticas con datos sensibles, considerar FORCE RLS.

### 3.5 Compatibilidad hacia atrás en políticas

Varias políticas incluyen `OR organization_id IS NULL` para "backward compatibility during migration". Esto puede ser un **riesgo de seguridad** si quedan filas con `organization_id` NULL que no deberían ser accesibles.

**Recomendación:** Planificar migración de datos para eliminar NULLs y remover esta cláusula en políticas futuras.

---

## 4. Índices y Performance

### 4.1 Índices Existentes

El proyecto crea índices en:

- `organization_id` (partial: `WHERE organization_id IS NOT NULL`) - ✅ Buen uso de partial indexes
- `branch_id` en tablas multi-sucursal
- `slug`, `email`, `order_number` para lookups
- Columnas de filtrado frecuente (status, created_at)

### 4.2 Índices Faltantes Potenciales

Para tablas de alto volumen, considerar:

- `telemetry_events(organization_id, timestamp)` - Para queries de analytics por org y rango de fechas
- `orders(created_at)` - Para reportes temporales
- `appointments(branch_id, appointment_date)` - Para disponibilidad
- `lab_work_orders(status)` - Para filtros por estado

### 4.3 JSONB

Tablas con columnas JSONB (payload, performance_data, metadata): considerar índices GIN para búsquedas si se filtran por contenido JSON con frecuencia.

---

## 5. Código de Aplicación y Acceso a BD

### 5.1 Patrón de Uso

- **Supabase Client:** `createClient()` desde `@/utils/supabase/client` (cliente) y `@/utils/supabase/server` (API routes)
- **Queries:** Uso de `.from("table_name")` con filtros y joins
- **Service Role:** Usado en `schedule-settings` para operaciones que requieren bypass RLS (`supabaseServiceRole`)

### 5.2 Consideraciones

- Las API routes usan el cliente autenticado por defecto → RLS aplica correctamente
- Service role solo donde es necesario (ej: upsert de schedule_settings)
- No se detectaron queries raw SQL inseguras o concatenación de strings

---

## 6. Recomendaciones Prioritarias

### Prioridad Alta (1-2 semanas)

1. **Auditar FKs sin índice**  
   Ejecutar la query de detección y crear índices para todas las columnas FK que no tengan uno.

2. **Consolidar migraciones de seed demo**  
   Unificar las 8 migraciones de fix en una sola migración que defina `seed_demo_organization_data` correctamente, con validación previa contra `SEED_CONSTRAINTS_REFERENCE.md`.

3. **Eliminar o documentar migración telemetry duplicada**  
   Decidir si `20260210020309` aporta cambios; si no, eliminarla del historial (o marcar como no aplicable en nuevos proyectos).

### Prioridad Media (2-4 semanas)

4. **Optimizar políticas RLS**  
   Reemplazar `auth.uid()` por `(SELECT auth.uid())` en políticas complejas para evitar evaluación por fila.

5. **Revisar cláusulas `organization_id IS NULL`**  
   Planificar migración de datos para eliminar NULLs y endurecer políticas.

6. **Añadir índices compuestos**  
   Para `telemetry_events`, `orders`, `appointments` según patrones de query reales.

### Prioridad Baja (Backlog)

7. **Evaluar UUIDv7**  
   Cuando Supabase soporte `pg_uuidv7`, considerar para tablas nuevas de alto volumen.

8. **FORCE ROW LEVEL SECURITY**  
   En tablas con datos sensibles (payments, admin_users) si el modelo de permisos lo requiere.

9. **Documentar esquema**  
   Generar diagrama ER actualizado y documentación de tablas para onboarding.

---

## 7. Comandos Útiles para Validación

```bash
# Listar estado de migraciones (requiere Supabase CLI)
supabase migration list

# Dump del esquema para revisión
supabase db dump --schema public

# Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies WHERE schemaname = 'public';
```

---

## 8. Conclusión

El proyecto Opttius presenta una base de datos bien estructurada para un SaaS multi-tenant de ópticas, con RLS implementado de forma comprehensiva y un esquema que refleja correctamente el dominio. Las principales áreas de mejora son:

- **Organización de migraciones:** Reducir duplicación y consolidar fixes
- **Índices:** Garantizar cobertura en todas las FKs y columnas de filtrado críticas
- **Optimización RLS:** Pequeños ajustes para mejor performance
- **Documentación:** Mantener `SEED_CONSTRAINTS_REFERENCE.md` y considerar diagrama ER

Con las recomendaciones aplicadas, el proyecto estaría en posición óptima para escalar y mantener la base de datos a largo plazo.

---

_Documento generado como parte de la evaluación de arquitectura y mejores prácticas del proyecto Opttius._
