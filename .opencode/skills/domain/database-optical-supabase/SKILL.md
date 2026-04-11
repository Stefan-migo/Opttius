---
name: database-optical-supabase
description: Expert guide for building and maintaining a high-quality Supabase database for optical shops. Use when working on schema design, migrations, RLS, indexes, functions, multi-tenant architecture, or optical-specific data models. Ensures best practices, clean code, scalability, and domain logic alignment.
---

# Base de Datos Supabase para Ópticas

Guía para diseñar, construir y mantener una base de datos Supabase de alta calidad para ópticas. Cubre mejores prácticas, arquitectura multi-tenant, RLS, índices, funciones y patrones específicos del dominio óptico.

## Cuándo Usar Este Skill

- Diseñar o modificar esquema de tablas
- Crear migraciones SQL
- Definir políticas RLS (Row Level Security)
- Optimizar consultas con índices
- Implementar funciones RPC o triggers
- Revisar consistencia multi-tenant (organization_id, branch_id)
- Patrones de datos ópticos (recetas, lentes, presupuestos, órdenes de trabajo)

---

## 1. Principios Fundamentales

### 1.1 Multi-Tenant por Organización y Sucursal

| Scope            | Columna           | Uso                                       |
| ---------------- | ----------------- | ----------------------------------------- |
| **Organización** | `organization_id` | Aislamiento entre ópticas (tenants)       |
| **Sucursal**     | `branch_id`       | Datos por local (inventario, caja, citas) |

**Reglas:**

- Tablas de negocio **siempre** incluyen `organization_id` o `branch_id` según el dominio
- `branch_id` implica pertenencia a una organización (FK a branches → organizations)
- Super admin: `admin_branch_access.branch_id = NULL` → acceso global
- RLS debe validar vía `can_access_branch(auth.uid(), branch_id)` o `get_user_organization_id()`

### 1.2 Separación de Entidades

| Entidad               | Tabla                     | Propósito                                |
| --------------------- | ------------------------- | ---------------------------------------- |
| Usuarios del software | `auth.users` + `profiles` | Admins, empleados, usuarios autenticados |
| Clientes de la óptica | `customers`               | Pacientes/clientes (NO autenticados)     |
| Organizaciones        | `organizations`           | Tenants del SaaS                         |
| Sucursales            | `branches`                | Locales físicos                          |

**Nunca** confundir `profiles` con `customers`. Los clientes se crean desde el panel admin y son específicos por sucursal.

### 1.3 Nomenclatura

- Tablas: `snake_case` plural (`lab_work_orders`, `product_branch_stock`)
- Columnas: `snake_case` (`organization_id`, `created_at`)
- Índices: `idx_<tabla>_<columna(s)>` o `idx_<tabla>_<propósito>`
- Políticas RLS: descriptivas (`Admins can view work orders in their branches`)
- Funciones: `snake_case` con prefijo de dominio (`calculate_lens_price`, `update_product_stock`)

---

## 2. Esquema y Tipos de Datos

### 2.1 Tipos Recomendados

| Uso           | Tipo                              | Notas                             |
| ------------- | --------------------------------- | --------------------------------- |
| IDs           | `UUID`                            | PKs, FKs; `uuid_generate_v4()`    |
| Moneda        | `NUMERIC(10,2)` o `DECIMAL(10,2)` | Evitar FLOAT para dinero          |
| Fechas        | `TIMESTAMPTZ`                     | Siempre con zona horaria          |
| Booleanos     | `BOOLEAN`                         | `DEFAULT true/false` explícito    |
| JSON flexible | `JSONB`                           | metadata, opciones, configuración |
| Texto corto   | `TEXT`                            | Sin límite arbitrario en Postgres |
| Enums         | `CREATE TYPE ... AS ENUM`         | Para estados, tipos fijos         |

### 2.2 Columnas de Auditoría

Incluir en tablas principales:

```sql
created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
-- Opcional: created_by, updated_by (UUID → admin_users)
```

Trigger para `updated_at`:

```sql
CREATE TRIGGER update_<tabla>_updated_at
  BEFORE UPDATE ON public.<tabla>
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### 2.3 Evitar

- `inventory_quantity` en `products` (usar `product_branch_stock`)
- `customer_id` referenciando `profiles` (usar `customers`)
- FKs circulares sin `ON DELETE SET NULL` o `DEFERRABLE`
- Tablas sin RLS en `public`

---

## 3. Row Level Security (RLS)

### 3.1 Regla de Oro

**Toda tabla en `public` debe tener RLS habilitado** y políticas explícitas.

```sql
ALTER TABLE public.<tabla> ENABLE ROW LEVEL SECURITY;
```

### 3.2 Funciones de Ayuda

| Función                             | Uso                               |
| ----------------------------------- | --------------------------------- |
| `is_admin(uid)`                     | Usuario es admin                  |
| `is_super_admin(uid)`               | Super admin (organización global) |
| `get_admin_role(uid)`               | Rol del admin                     |
| `get_user_organization_id()`        | organization_id del admin         |
| `can_access_branch(uid, branch_id)` | Acceso a sucursal                 |

### 3.3 Patrón de Políticas

- **Super admin**: `is_super_admin(auth.uid())` → acceso total
- **Admin org**: `organization_id IN (SELECT organization_id FROM admin_users WHERE id = auth.uid())`
- **Admin branch**: `branch_id IN (SELECT branch_id FROM admin_branch_access WHERE admin_user_id = auth.uid())`
- **Service role**: Política explícita `USING (true)` para operaciones internas

### 3.4 Políticas por Operación

Definir políticas separadas por `FOR SELECT`, `FOR INSERT`, `FOR UPDATE`, `FOR DELETE` cuando sea necesario. Evitar políticas `USING` con `WITH CHECK` demasiado permisivas.

---

## 4. Índices

### 4.1 Obligatorios

- **FKs**: Índice en toda columna FK usada en JOINs o filtros
- **Filtros frecuentes**: `organization_id`, `branch_id`, `status`, `created_at`
- **Búsquedas**: `customers_rut`, `customers_email`, `products_sku`

### 4.2 Índices Parciales

Para columnas con muchos NULL o valores repetidos:

```sql
CREATE INDEX idx_customers_rut ON customers(rut) WHERE rut IS NOT NULL;
CREATE INDEX idx_admin_notifications_unread ON admin_notifications(is_read) WHERE is_read = false;
```

### 4.3 Índices Compuestos

Para consultas filtradas por múltiples columnas:

```sql
CREATE INDEX idx_orders_branch_created ON orders(branch_id, created_at DESC);
CREATE INDEX idx_ai_insights_org_section ON ai_insights(organization_id, section);
```

### 4.4 GIST para Rangos

Para matrices de precios (esfera, cilindro, adición):

```sql
CREATE INDEX idx_lens_matrices_sphere_range ON lens_price_matrices
  USING gist (numrange(sphere_min::numeric, sphere_max::numeric, '[]'));
```

---

## 5. Funciones y RPCs

### 5.1 SECURITY DEFINER

Usar `SECURITY DEFINER` cuando la función debe ejecutarse con privilegios elevados (ej. bypass RLS):

```sql
CREATE OR REPLACE FUNCTION public.calculate_lens_price(...)
RETURNS TABLE(...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  ...
$$;
```

### 5.2 search_path

Siempre `SET search_path = 'public'` en funciones SECURITY DEFINER para evitar inyección de esquema.

### 5.3 Validaciones en Triggers

Usar triggers para integridad de negocio:

```sql
CREATE TRIGGER check_quote_prescription_customer_match
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION check_quote_prescription_customer_match();
```

---

## 6. Migraciones

### 6.1 Convención de Nombres

`YYYYMMDDHHMMSS_descripcion_corta.sql`

Ejemplo: `20260304000001_add_currency_country_to_organization_settings.sql`

### 6.2 Idempotencia

- Usar `CREATE TABLE IF NOT EXISTS`
- Usar `CREATE INDEX IF NOT EXISTS`
- Para `ALTER TABLE`, verificar existencia antes:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'x' AND column_name = 'y') THEN
    ALTER TABLE x ADD COLUMN y TEXT;
  END IF;
END $$;
```

### 6.3 Rollback

Documentar en comentarios los pasos de rollback manual si la migración es destructiva.

---

## 7. Patrones Ópticos Específicos

### 7.1 Inventario

- `products`: catálogo (datos maestros)
- `product_branch_stock`: stock por sucursal (`quantity`, `reserved_quantity`, `available_quantity` GENERATED)
- Lentes oftálmicos: `lens_families` + `lens_price_matrices` (no consumen stock de products)
- Lentes de contacto: `contact_lens_families` + `contact_lens_price_matrices`

### 7.2 Flujo de Venta

- `quotes` → `lab_work_orders` (presupuesto a OT)
- `quotes` → `orders` (presupuesto a venta directa)
- `orders` → `order_payments` (pagos)
- `pos_sessions` → `pos_transactions` (caja)

### 7.3 CRM

- `customers` (branch_id, organization_id)
- `prescriptions` → `customer_id`
- `appointments` → `customer_id`, `branch_id`
- `quotes` → `customer_id`, `prescription_id`

### 7.4 Convenios

- `agreements` → `agreement_purchase_orders`
- `agreement_institutional_balances` → saldos por órdenes
- `agreement_institutional_invoices` → facturación institucional

---

## 8. Checklist de Calidad

- [ ] RLS habilitado en todas las tablas `public`
- [ ] Todas las FKs tienen índice
- [ ] organization_id y branch_id en tablas de negocio
- [ ] Funciones SECURITY DEFINER con `search_path`
- [ ] Sin referencias a `profiles` para clientes (usar `customers`)
- [ ] Sin uso de `products.inventory_quantity` (usar `product_branch_stock`)
- [ ] Migraciones con nombres descriptivos y orden cronológico
- [ ] Comentarios en tablas/columnas críticas (`COMMENT ON`)

---

## Referencia

- Documentación detallada: [docs/database/SUPABASE_DATABASE_DOCUMENTATION.md](../../docs/database/SUPABASE_DATABASE_DOCUMENTATION.md)
- Supabase Postgres Best Practices: skill `supabase-postgres-best-practices`
- Otros skills ópticos: crm, inventory, pos, work-orders, agreements, etc.
