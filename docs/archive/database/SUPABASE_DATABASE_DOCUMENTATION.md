# Documentación de Base de Datos Supabase — Opttius

**Versión:** 1.0  
**Fecha:** 2026-03-04  
**Proyecto:** Opttius — Sistema de gestión para ópticas

Esta documentación es la base de la estructura de datos del programa. Se irá ampliando con documentación de otros módulos, pero aquí se centraliza todo lo relativo a la base de datos Supabase.

---

## 1. Resumen Ejecutivo

### 1.1 Estado Actual

La base de datos de Opttius es una base de datos **multi-tenant** diseñada para ópticas, con:

- **~75 tablas** en el esquema `public`
- **Arquitectura organization + branch** para aislamiento de datos
- **RLS (Row Level Security)** habilitado en tablas críticas
- **Índices** extensivos (btree, gist para rangos)
- **Funciones RPC** para cálculos de precios, stock, permisos
- **Integración** con Supabase Auth, Storage, Realtime

### 1.2 Alcance del Dominio

| Dominio               | Tablas principales                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| SaaS / Organizaciones | organizations, subscriptions, subscription_tiers, branches                                                |
| Usuarios y permisos   | admin_users, admin_branch_access, profiles                                                                |
| CRM                   | customers, prescriptions, appointments                                                                    |
| Inventario            | products, product_branch_stock, product_variants, categories                                              |
| Lentes                | lens_families, lens_price_matrices, contact_lens_families, contact_lens_price_matrices                    |
| Ventas                | orders, order_items, order_payments, quotes                                                               |
| POS                   | pos_sessions, pos_transactions, cash_register_closures, pos_settings                                      |
| Órdenes de trabajo    | lab_work_orders, lab_work_order_status_history                                                            |
| Convenios             | agreements, agreement_purchase_orders, agreement_institutional_balances, agreement_institutional_invoices |
| Soporte               | support_tickets, optical_internal_support_tickets, saas_support_tickets                                   |
| Notificaciones        | admin_notifications, notification_settings                                                                |
| IA                    | ai_insights, ai_usage_log, chat_sessions, embeddings, memory_facts                                        |
| Operativos            | field_operations, operativo_mobile_stock, operativo_sync_queue                                            |
| Otros                 | telemetry_events, system_config, billing_documents, whatsapp_phone_numbers                                |

---

## 2. Arquitectura Multi-Tenant

### 2.1 Jerarquía

```
organizations (tenant)
  └── branches (sucursales)
        └── Datos por sucursal: product_branch_stock, pos_sessions, appointments, etc.
  └── Datos por organización: lens_families, agreements, ai_insights, etc.
```

### 2.2 Columnas de Scope

| Scope        | Columna                         | Ejemplo de tablas                                     |
| ------------ | ------------------------------- | ----------------------------------------------------- |
| Organización | `organization_id`               | organizations, admin_users, agreements, lens_families |
| Sucursal     | `branch_id`                     | branches, product_branch_stock, orders, appointments  |
| Ambos        | `organization_id` + `branch_id` | customers, quotes, lab_work_orders                    |

### 2.3 Roles y Acceso

| Rol                 | organization_id | branch_id (admin_branch_access) | Alcance              |
| ------------------- | --------------- | ------------------------------- | -------------------- |
| root/dev            | NULL            | -                               | Plataforma completa  |
| super_admin         | org             | NULL                            | Toda la organización |
| admin               | org             | branch(es)                      | Sucursales asignadas |
| employee / vendedor | org             | branch                          | Una o más sucursales |

---

## 3. Esquema de Tablas (Resumen)

### 3.1 Core SaaS

- **organizations**: Tenants del SaaS (nombre, slug, metadata)
- **subscriptions**: Suscripciones por organización (tier, estado, fechas)
- **subscription_tiers**: Planes disponibles (max_branches, max_users, etc.)
- **branches**: Sucursales por organización (código, nombre, dirección)
- **admin_users**: Usuarios administradores (rol, organization_id)
- **admin_branch_access**: Asignación usuario-sucursal (branch_id NULL = super admin)
- **profiles**: Perfil extendido de auth.users (no clientes de óptica)

### 3.2 CRM y Clientes

- **customers**: Clientes de la óptica (branch_id, organization_id, rut, nombre, etc.)
- **prescriptions**: Recetas oftalmológicas (customer_id, OD/OS, esfera, cilindro, etc.)
- **appointments**: Citas (customer_id, branch_id, appointment_date, status)
- **customer_lens_purchases**: Historial de compras de lentes por cliente

### 3.3 Catálogo e Inventario

- **categories**: Categorías de productos (parent_id para jerarquía)
- **products**: Catálogo (nombre, precio, product_type: frame, lens, accessory, service)
- **product_variants**: Variantes de producto
- **product_branch_stock**: Stock por sucursal (quantity, reserved_quantity)
- **product_option_fields** / **product_option_values**: Opciones configurables
- **inventory_movements**: Auditoría de movimientos de stock

### 3.4 Lentes

- **lens_families**: Familias de lentes oftálmicos (organización)
- **lens_price_matrices**: Matrices de precio (esfera, cilindro, adición)
- **contact_lens_families**: Familias de lentes de contacto
- **contact_lens_price_matrices**: Matrices de precio lentes de contacto

### 3.5 Ventas y Pagos

- **orders**: Órdenes de venta (branch_id, customer_id opcional)
- **order_items**: Ítems de orden
- **order_payments**: Pagos por orden
- **quotes**: Presupuestos (customer_id, prescription_id)
- **payment_installments**: Cuotas
- **payments**: Registro de pagos (gateways)
- **payment_gateways_config**: Configuración de pasarelas

### 3.6 POS y Caja

- **pos_sessions**: Sesiones de caja (branch_id, opened_at, closed_at)
- **pos_transactions**: Transacciones por sesión
- **pos_settings**: Configuración POS por sucursal
- **cash_register_closures**: Cierres de caja (branch_id, closure_date)

### 3.7 Órdenes de Trabajo

- **lab_work_orders**: Órdenes de laboratorio (quote_id, customer_id, branch_id)
- **lab_work_order_status_history**: Historial de estados

### 3.8 Convenios

- **agreements**: Convenios con instituciones
- **agreement_purchase_orders**: Órdenes de compra (OC)
- **agreement_institutional_balances**: Saldos institucionales
- **agreement_institutional_invoices**: Facturas institucionales
- **agreement_institutional_invoice_balances**: Vinculación factura-saldo
- **agreement_customers**: Clientes vinculados a convenios

### 3.9 Operativos en Terreno

- **field_operations**: Operativos (fecha, sucursal, estado)
- **operativo_mobile_stock**: Stock móvil por operativo
- **operativo_sync_queue**: Cola de sincronización offline

### 3.10 Soporte

- **support_tickets** / **support_messages**: Soporte B2C
- **optical_internal_support_tickets**: Soporte interno óptica
- **saas_support_tickets**: Soporte B2B SaaS

### 3.11 IA y Chat

- **chat_sessions** / **chat_messages**: Historial de chat
- **ai_insights**: Insights generados por IA
- **ai_usage_log**: Log de uso de IA
- **embeddings** / **memory_facts**: RAG y memoria organizacional

### 3.12 Sistema

- **system_config**: Configuración global
- **system_email_templates**: Plantillas de email
- **system_health_metrics**: Métricas de salud
- **system_maintenance_log**: Log de mantenimiento
- **telemetry_events** / **telemetry_aggregates** / **telemetry_config**: Telemetría
- **organization_settings**: Configuración por organización

---

## 4. Funciones RPC Principales

| Función                                                                                          | Propósito                     |
| ------------------------------------------------------------------------------------------------ | ----------------------------- |
| `calculate_lens_price(lens_family_id, sphere, cylinder, addition, sourcing_type)`                | Precio de lente oftálmico     |
| `calculate_contact_lens_price(contact_lens_family_id, sphere, cylinder, axis, addition, org_id)` | Precio lente de contacto      |
| `update_product_stock(product_id, branch_id, quantity_change, reserve)`                          | Actualizar stock en sucursal  |
| `get_product_stock(product_id, branch_id)`                                                       | Obtener stock disponible      |
| `calculate_order_balance(order_id)`                                                              | Saldo pendiente de orden      |
| `can_access_branch(user_id, branch_id)`                                                          | Verificar acceso a sucursal   |
| `is_super_admin(user_id)`                                                                        | Es super admin                |
| `get_user_organization_id()`                                                                     | organization_id del usuario   |
| `normalize_rut_for_search(rut)`                                                                  | RUT normalizado para búsqueda |
| `collect_system_health_metrics()`                                                                | Recolectar métricas de salud  |
| `cleanup_expired_demo_organizations()`                                                           | Limpiar demos expirados       |

---

## 5. Índices y Rendimiento

### 5.1 Tipos de Índices

- **B-tree**: FKs, filtros por status, fechas, organization_id, branch_id
- **GIST**: Rangos numéricos en matrices de precios (sphere, cylinder, addition)
- **Parciales**: `WHERE rut IS NOT NULL`, `WHERE is_read = false`

### 5.2 Índices Críticos

- `idx_customers_rut`, `idx_customers_rut_normalized` (búsqueda RUT)
- `idx_orders_branch_id`, `idx_orders_created_at`
- `idx_appointments_branch`, `idx_appointments_date`
- `idx_product_branch_stock_product_branch` (UNIQUE)
- `idx_lens_matrices_*` (GIST para rangos)

---

## 6. Row Level Security (RLS)

### 6.1 Patrón General

- Super admin: `is_super_admin(auth.uid())` → acceso total
- Admin org: `organization_id IN (SELECT organization_id FROM admin_users WHERE id = auth.uid())`
- Admin branch: `branch_id IN (SELECT branch_id FROM admin_branch_access WHERE admin_user_id = auth.uid())`

### 6.2 Tablas con RLS

Todas las tablas de negocio tienen RLS habilitado. Las políticas siguen el patrón de permisos por rol y scope.

### 6.3 Service Role

Algunas tablas tienen política explícita para service role (ej. `products` con `allow service role full access`).

---

## 7. Mejoras Identificadas

Las siguientes mejoras han sido identificadas durante el análisis. Se recomienda priorizarlas según impacto y esfuerzo.

### 7.1 Críticas

#### 7.1.1 `collect_system_health_metrics` — Métricas incorrectas

**Problema:** La función usa `profiles` para contar `total_customers` y `products.inventory_quantity` para `low_stock_products`.

**Contexto:** El sistema separó `customers` de `profiles` y el inventario vive en `product_branch_stock`.

**Solución propuesta:**

```sql
-- Reemplazar total_customers:
FROM public.customers WHERE is_active = true;

-- Reemplazar low_stock_products (requiere lógica por sucursal o agregada):
FROM public.product_branch_stock pbs
JOIN public.products p ON p.id = pbs.product_id
WHERE pbs.quantity <= pbs.low_stock_threshold
  AND p.status = 'active';
```

**Archivo:** `supabase/migrations/20250116210000_create_system_admin_tools.sql` (o nueva migración de fix)

---

#### 7.1.2 FK circular en `categories`

**Problema:** `pg_dump` reporta circular foreign-key en `categories` (parent_id → id).

**Impacto:** Puede complicar operaciones de dump/restore y orden de inserción.

**Solución propuesta:**

- Verificar que `parent_id` tenga `ON DELETE SET NULL`
- Considerar `DEFERRABLE` si hay inserciones en lote que dependan del orden
- Documentar el orden correcto de inserción para seeds

---

### 7.2 Medias

#### 7.2.1 Políticas RLS duplicadas o contradictorias

**Problema:** Algunas tablas (ej. `products`, `categories`) tienen políticas que permiten `true` para INSERT/UPDATE junto con políticas más restrictivas para admin.

**Recomendación:** Revisar políticas legacy de ecommerce (`Allow insert products`, `Allow update products`) y consolidar con políticas multi-tenant.

---

#### 7.2.2 `support_tickets.customer_id` vs `auth.uid()`

**Problema:** Políticas de soporte B2C referencian `customer_id = auth.uid()`, pero los clientes de óptica están en `customers` y no tienen auth.

**Recomendación:** Validar si el soporte B2C sigue activo para usuarios autenticados (profiles) o si debe migrarse a `customers` con otro mecanismo de identificación.

---

#### 7.2.3 Deprecación de columnas en `products`

**Problema:** `products` aún tiene `inventory_quantity`, `track_inventory`, `low_stock_threshold` que están deprecadas a favor de `product_branch_stock`.

**Recomendación:** Crear migración que marque estas columnas como deprecated (comentarios) y eventualmente eliminarlas cuando no haya referencias.

---

### 7.3 Menores

#### 7.3.1 Comentarios en tablas

**Recomendación:** Añadir `COMMENT ON TABLE` y `COMMENT ON COLUMN` en tablas críticas para documentación y herramientas de exploración.

---

#### 7.3.2 Telemetría y retención

**Recomendación:** Revisar que `cleanup_old_telemetry_data` y `archive_old_telemetry_data` estén programados (cron) y que la retención por organización sea coherente con `telemetry_config`.

---

## 8. Configuración Auth (Manual en Dashboard)

### Leaked Password Protection

Supabase puede rechazar contraseñas comprometidas (HaveIBeenPwned). **Activar manualmente** en:

**Dashboard → Authentication → Settings → Password** → activar "Leaked password protection"

Ref: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

## 9. Comandos Útiles (Supabase CLI)

```bash
# Dump esquema local
npx supabase db dump --local --schema public

# Dump esquema remoto (requiere link)
npx supabase db dump --linked

# Listar proyectos
npx supabase projects list

# Generar tipos TypeScript
npx supabase gen types typescript --local > src/types/database.types.ts

# Ejecutar migraciones
npx supabase db push
npx supabase migration up
```

---

## 10. Referencias

- **Skill de base de datos:** `.cursor/skills/database-optical-supabase/SKILL.md`
- **Supabase Postgres Best Practices:** skill `supabase-postgres-best-practices`
- **Skills por dominio:** crm-optical-supabase, inventory-optical-supabase, pos-optical-supabase, work-orders-optical-supabase, agreements-optical-supabase, etc.
- **Documentación Supabase:** https://supabase.com/docs
- **PostgreSQL:** https://www.postgresql.org/docs/

---

## 11. Changelog de esta Documentación

| Fecha      | Cambio                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-04 | Creación inicial. Análisis de esquema, RLS, índices. Mejoras identificadas documentadas.                                     |
| 2026-03-04 | Migración 20260330000000: vistas con security_invoker; RLS en order_payments y pos_sale_idempotency.                         |
| 2026-04-02 | Migración 20260402000000: SET search_path en funciones; eliminación políticas RLS permisivas; Admin manage product_variants. |
