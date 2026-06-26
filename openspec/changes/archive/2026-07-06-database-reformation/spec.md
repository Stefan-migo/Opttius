# Specification: database-reformation

## 1. Quality Gates Transversales

Estos gates aplican a TODO el cambio, en todas las fases. **No se avanza a la siguiente tarea si falla algún gate.**

| ID    | Gate                                                                                                                  | Verificación                                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| G-001 | `npm run test:run` MUST pasar con 0 failures después de cada fase                                                     | Ejecutar suite completa antes de commit                                                  |
| G-002 | `pg_dump --schema-only` diff MUST ser equivalente antes/después de cada consolidación (excepto cambios intencionales) | `diff <(pg_dump --schema-only pre-phase.sql) <(pg_dump --schema-only post-phase.sql)`    |
| G-003 | `npm run build` MUST compilar exitosamente                                                                            | `npm run build` sin errores ni warnings                                                  |
| G-004 | Cada migración MUST ser reversible                                                                                    | Rollback documentado en comentarios SQL del archivo                                      |
| G-005 | Supabase advisors MUST estar clean de security/performance warnings post-fase                                         | `supabase_get_advisors(type: "security")` y `supabase_get_advisors(type: "performance")` |

### Números Verificados vs Propuesta

La exploración real de la DB revela correcciones menores a los números de la propuesta:

| Métrica                                    | Propuesta  | Real                             | Diferencia                          |
| ------------------------------------------ | ---------- | -------------------------------- | ----------------------------------- |
| tablas sin RLS                             | 4          | 4                                | igual                               |
| SECURITY DEFINER functions sin search_path | 52 sin fix | 53 total / **2 sin search_path** | 53 total (51 ya tienen search_path) |
| FKs sin índice                             | 91         | **65**                           | sobrestimado en 26                  |
| migration files                            | 265        | 265                              | igual                               |
| remote_sync_placeholder                    | 5          | **4**                            | 1 menos                             |
| columnas lab_work_orders                   | 109        | 109                              | igual                               |
| columnas orders                            | 90         | **87**                           | 82 + metadata                       |
| columnas quotes                            | 84         | **84**                           | igual                               |

> **Nota**: El spec usa los números REALES. Tasks recibirá estos valores corregidos.

---

## 2. Fase 0 — Security Baseline

### S-001: RLS en nurture\_\* tables

**Objetivo**: Habilitar RLS en las 4 tablas `nurture_*` y crear políticas multi-tenant consistentes con el patrón existente.

**Contexto actual**: Las 4 tablas `nurture_campaigns`, `nurture_campaign_emails`, `nurture_queue`, `nurture_log` no tienen RLS habilitado. El resto del schema public tiene RLS.

**Especificación**:

1. Cada tabla MUST tener `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. Políticas MUST seguir el patrón `organization_id` existente en otras tablas del proyecto
3. Las tablas `nurture_*` NO tienen columna `organization_id` actualmente. La migración MUST:
   - Agregar `organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE` a cada tabla
   - Backfill de datos existentes (si los hay) — aunque en producción demo no hay datos, la migración debe manejar el caso
   - Hacer la columna `NOT NULL` después del backfill
4. Políticas a crear:
   - `FOR SELECT`: admin de la organización puede ver sus nurture campaigns (vía `get_user_organization_id()`)
   - `FOR INSERT`: admin de la organización puede crear
   - `FOR UPDATE`: admin de la organización puede modificar
   - `FOR DELETE`: admin de la organización puede eliminar
   - `FOR ALL`: service_role tiene acceso completo (política `USING (true)` explícita para service role)

5. **Verificación**:

```
Given: 4 nurture_* tables existen sin RLS
When:  Se ejecuta la migración S-001
Then:  SELECT schemaname, tablename, rowsecurity FROM pg_tables
       WHERE tablename LIKE 'nurture_%' → rowsecurity = true para las 4

Given: Dos organizaciones A y B existen
When:  Admin de organización A inserta un nurture_campaign
Then:  Admin de organización B NO puede SELECT sobre ese registro
```

6. **Rollback**: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` + DROP políticas + DROP COLUMN `organization_id`

---

### S-002: SECURITY DEFINER functions — SET search_path

**Objetivo**: Asegurar que toda función `SECURITY DEFINER` en schema `public` tenga `SET search_path = 'public'` para prevenir schema injection.

**Contexto actual**: 53 funciones SECURITY DEFINER en schema `public`. De ellas, **2 no tienen search_path configurado**: `handle_organization_delete` y `handle_organization_delete_fallback`. Las 51 restantes ya lo tienen.

**Especificación**:

1. Las 2 funciones sin search_path MUST ser alteradas para incluir `SET search_path = 'public'`
2. MUST NO cambiar la lógica de negocio: solo agregar `SET search_path = 'public'` en la definición
3. La migración debe ser idempotente: verificar si la función existe antes de modificar

```
Given: Función handle_organization_delete existe como SECURITY DEFINER sin search_path
When:  Se ejecuta migración S-002
Then:  pg_get_functiondef(oid) DEBE incluir 'SET search_path = public'
       Y la lógica de negocio DEBE ser idéntica (diff solo en search_path)

Given: Función handle_organization_delete_fallback existe como SECURITY DEFINER sin search_path
When:  Se ejecuta migración S-002
Then:  Ídem caso anterior
```

4. **Verificación adicional**: Query que audita todas las SECURITY DEFINER functions:

```sql
SELECT p.proname, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = true
  AND (p.proconfig IS NULL OR NOT (p.proconfig @> '{search_path=public}'::text[]));
```

MUST retornar 0 filas después de aplicar la migración.

5. **Rollback**: Re-crear cada función sin la cláusula `SET search_path`. Como son trigger functions, guardar la definición original antes del cambio.

6. **Riesgo**: `handle_organization_delete` y `handle_organization_delete_fallback` son trigger functions que operan sobre `auth.users`. Agregar `search_path = 'public'` no debería afectar porque acceden a `auth.users` con schema qualification explícita. Verificar con `EXPLAIN` post-cambio.

---

## 3. Fase 1 — Performance (Indexes)

### S-003: Missing FK indexes

**Objetivo**: Crear índices para todas las foreign keys que carecen de índice, mejorando performance de JOINs.

**Contexto actual**: 303 FKs totales en schema `public`. De ellas, **65 no tienen índice** sobre la columna FK (verificado con pg_catalog a nivel de columna individual, no por coincidencia de nombre).

**Especificación**:

1. Los 65 índices faltantes identificados por `supabase_execute_sql` con el query de pg_catalog detallado (no coincidencia de nombres) deben crearse
2. Convención de nombres: `idx_<tabla>_<columna>` (ej: `idx_admin_users_created_by`, `idx_orders_purchase_order_id`)
3. Los índices parciales son aceptables donde la columna tenga muchos NULLs
4. La migración debe agruparse en 1 archivo SQL con todos los CREATE INDEX CONCURRENTLY (no bloqueante)

**Lista completa de FKs sin índice** (65):

| #   | Tabla                             | Columna FK                | Tabla destino                    |
| --- | --------------------------------- | ------------------------- | -------------------------------- |
| 1   | admin_users                       | created_by                | admin_users                      |
| 2   | agreement_institutional_balances  | invoice_id                | agreement_institutional_invoices |
| 3   | agreement_institutional_balances  | purchase_order_id         | agreement_purchase_orders        |
| 4   | agreement_institutional_invoices  | organization_id           | organizations                    |
| 5   | cart_items                        | variant_id                | product_variants                 |
| 6   | contact_lens_encargos             | created_by                | admin_users                      |
| 7   | credit_notes                      | pos_session_id            | pos_sessions                     |
| 8   | customer_lens_purchases           | product_id                | products                         |
| 9   | customer_satisfaction_surveys     | customer_id               | customers                        |
| 10  | customer_satisfaction_surveys     | work_order_id             | lab_work_orders                  |
| 11  | demo_requests                     | assigned_to               | admin_users                      |
| 12  | demo_requests                     | organization_id           | organizations                    |
| 13  | internal_order_status_history     | changed_by                | admin_users                      |
| 14  | internal_orders                   | assigned_driver_id        | drivers                          |
| 15  | internal_orders                   | assigned_vehicle_id       | vehicles                         |
| 16  | lab_work_orders                   | frame_product_id          | products                         |
| 17  | lab_work_orders                   | pos_order_id              | orders                           |
| 18  | lens_catalog_products             | lens_product_id           | lens_products                    |
| 19  | lens_catalog_products             | mapped_design_id          | lens_designs                     |
| 20  | lens_catalog_products             | mapped_material_id        | lens_materials                   |
| 21  | lens_price_matrices               | organization_id           | organizations                    |
| 22  | lens_products                     | catalog_product_id        | lens_catalog_products            |
| 23  | lens_products                     | category_id               | categories                       |
| 24  | memory_facts                      | source_session_id         | chat_sessions                    |
| 25  | nurture_log                       | campaign_email_id         | nurture_campaign_emails          |
| 26  | nurture_log                       | campaign_id               | nurture_campaigns                |
| 27  | nurture_log                       | queue_id                  | nurture_queue                    |
| 28  | nurture_queue                     | campaign_email_id         | nurture_campaign_emails          |
| 29  | nurture_queue                     | campaign_id               | nurture_campaigns                |
| 30  | optical_internal_support_messages | sender_id                 | admin_users                      |
| 31  | optical_internal_support_tickets  | created_by_user_id        | admin_users                      |
| 32  | optical_internal_support_tickets  | related_appointment_id    | appointments                     |
| 33  | optical_internal_support_tickets  | related_order_id          | orders                           |
| 34  | optical_internal_support_tickets  | related_quote_id          | quotes                           |
| 35  | optical_internal_support_tickets  | related_work_order_id     | lab_work_orders                  |
| 36  | optical_internal_support_tickets  | resolved_by               | admin_users                      |
| 37  | order_items                       | variant_id                | product_variants                 |
| 38  | orders                            | purchase_order_id         | agreement_purchase_orders        |
| 39  | pos_sale_idempotency              | order_id                  | orders                           |
| 40  | pos_sale_idempotency              | work_order_id             | lab_work_orders                  |
| 41  | profiles                          | preferred_branch_id       | branches                         |
| 42  | quotes                            | far_lens_product_id       | lens_products                    |
| 43  | quotes                            | frame_product_id          | products                         |
| 44  | quotes                            | lens_product_id           | lens_products                    |
| 45  | quotes                            | lens_supplier_id          | lens_suppliers                   |
| 46  | quotes                            | near_lens_product_id      | lens_products                    |
| 47  | quotes                            | prescription_id           | prescriptions                    |
| 48  | referrals                         | converted_demo_request_id | demo_requests                    |
| 49  | referrals                         | converted_organization_id | organizations                    |
| 50  | saas_support_messages             | sender_id                 | admin_users                      |
| 51  | saas_support_templates            | created_by                | admin_users                      |
| 52  | saas_support_tickets              | created_by_user_id        | admin_users                      |
| 53  | saas_support_tickets              | resolved_by               | admin_users                      |
| 54  | support_templates                 | category_id               | support_categories               |
| 55  | support_templates                 | created_by                | admin_users                      |
| 56  | support_tickets                   | category_id               | support_categories               |
| 57  | support_tickets                   | order_id                  | orders                           |
| 58  | support_tickets                   | resolved_by               | admin_users                      |
| 59  | survey_invitations                | customer_id               | customers                        |
| 60  | system_config                     | last_modified_by          | admin_users                      |
| 61  | system_email_templates            | created_by                | admin_users                      |
| 62  | system_maintenance_log            | executed_by               | admin_users                      |
| 63  | tier_change_audit                 | changed_by_user_id        | admin_users                      |
| 64  | workflow_definitions              | created_by                | admin_users                      |
| 65  | workflow_executions               | created_by                | admin_users                      |

5. **Verificación**:

```
Given: pg_catalog contiene la lista de FKs sin índice
When:  Se ejecuta migración S-003
Then:  El query de auditoría retorna EXACTAMENTE 0 filas
       (mismo query usado para detectar las 65)

And:   pg_size_pretty(pg_total_relation_size('idx_<name>')) es positivo para cada nuevo índice
```

**Caso borde**: Índices compuestos. Si una tabla tiene una FK en columna A y OTRA FK en columna A+B, y ya existe índice en (A), no crear otro redundante. Verificar cada caso.

6. **Impacto**: Los índices `CONCURRENTLY` no bloquean escrituras pero toman más tiempo. En DB local (sin carga concurrente), pueden crearse sin `CONCURRENTLY` para simplicidad. El migration file debe usar `CONCURRENTLY` por documentación.

---

## 4. Fase 2 — Migration Consolidation

### S-004: Consolidación en 12 grupos lógicos

**Objetivo**: Reemplazar 265 archivos de migración individuales (~46 fixes, 4 placeholders, 5 duplicadas, 4 remote_sync) con ~12 migraciones consolidadas por dominio, ejecutables en orden, equivalentes al estado actual de la DB.

**Contexto actual**: 265 archivos en `supabase/migrations/`, incluyendo 4 archivos `remote_sync_placeholder.sql`, duplicados, y numerosas migraciones de fix que corrigen la anterior. No hay seed.sql. No hay convención documentada.

**Especificación**:

**4.1 Reglas generales de consolidación**

1. CADA grupo consolidado MUST ejecutarse dentro de un transaction block (`BEGIN; ... COMMIT;`)
2. CADA statement DDL MUST usar `IF NOT EXISTS` / `IF EXISTS` para idempotencia
3. El `pg_dump --schema-only` de la DB actual MUST ser equivalente al resultado de aplicar las 12 migraciones en orden sobre una DB vacía
4. Las migraciones originales (265 archivos) MUST moverse a `supabase/migrations/archive/` comprimidas en ZIP con nombre `supabase/migrations/archive/202501-202604_original_265_migrations.zip`
5. Cada migración consolidada DEBE incluir comentarios con la referencia al archivo original y fecha

**4.2 Los 12 grupos consolidados**

#### Grupo 1 — Core Schema (Core Auth & Organizations)

- **Dominio**: organizations, branches, profiles, admin_users, roles
- **Migs originales**: ~15 (desde 20241220000000 hasta 20260128000001)
- **Contenido**:
  - `CREATE TABLE IF NOT EXISTS organizations`
  - `CREATE TABLE IF NOT EXISTS branches`
  - `CREATE TABLE IF NOT EXISTS profiles`
  - `CREATE TABLE IF NOT EXISTS admin_users`
  - `CREATE TABLE IF NOT EXISTS admin_branch_access`
  - `subscription_tiers`, `subscriptions` (estructura inicial)
  - RLS policies base, triggers base
  - Funciones helper: `is_admin`, `is_super_admin`, `is_root_user`, `is_employee`,
    `get_user_organization_id`, `get_admin_role`, `can_access_branch`,
    `get_user_branches`, `get_current_branch_id`
  - `handle_new_user`, `handle_new_admin_user`
  - `handle_organization_delete`, `handle_organization_delete_fallback` (con search_path)
- **Rollback**: DROP de todas las tablas creadas (orden inverso por FKs)

#### Grupo 2 — CRM & Customers

- **Dominio**: customers, prescriptions, customer data, RUT search
- **Migs originales**: ~12
- **Contenido**:
  - `customers` table completa
  - `prescriptions` table
  - `customer_lens_purchases`
  - Funciones: RUT search, customer lookup
  - RLS policies
- **Rollback**: DROP tablas

#### Grupo 3 — Products & Inventory

- **Dominio**: products, categories, inventory, variants
- **Migs originales**: ~10
- **Contenido**:
  - `categories` (con default categories)
  - `products` (SIN columna `inventory_quantity` — se migra en Fase 3)
  - `product_variants` (SIN columna `inventory_quantity`)
  - `product_branch_stock` (con `quantity`, `reserved_quantity`, `available_quantity`,
    `low_stock_threshold`, `reorder_point`)
  - `inventory_movements`
  - `product_option_fields`, `product_option_values`
  - Funciones: `decrement_inventory`
  - RLS policies
- **Rollback**: DROP tablas

#### Grupo 4 — Lenses (Lens Systems)

- **Dominio**: lens_families, price_matrices, contact_lenses, treatments
- **Migs originales**: ~15
- **Contenido**:
  - `lens_families` (con `organization_id`)
  - `lens_price_matrices` (con rangos sphere/cylinder/addition, GIST index opcional)
  - `contact_lens_families`, `contact_lens_price_matrices`
  - `contact_lens_inventory`, `contact_lens_encargos`
  - `treatments`
  - `lens_materials`, `lens_designs`, `lens_suppliers`, `lens_supplier_catalogs`
  - `lens_catalog_products`, `lens_products`, `lens_product_pricing`
  - `lens_mountings`, `lens_indexes`, `lens_supplier_services`
  - Funciones: `calculate_lens_price`, `calculate_contact_lens_price`,
    `calculate_lens_product_price`, `create_lens_family_full`,
    `create_lens_product_full`, `validate_treatment_compatibility`
  - RLS policies
- **Rollback**: DROP tablas (orden inverso)

#### Grupo 5 — Branches & Multi-tenancy

- **Dominio**: Extensión multi-tenant, organization_settings, tier changes
- **Migs originales**: ~8
- **Contenido**:
  - `organization_settings` (depósito mínimo, currency, country)
  - `tier_change_audit`
  - Extensiones RLS a tablas existentes (las migraciones que agregaron `organization_id` a tablas)
  - `sync_children_organization_id_from_parent`
  - `sync_status_history_organization_id`
  - `validateTierLimit` function si existe
- **Rollback**: DROP de tablas agregadas, revert cambios RLS

#### Grupo 6 — Quotes & Work Orders

- **Dominio**: quotes, quote_items, lab_work_orders, status history
- **Migs originales**: ~12
- **Contenido**:
  - `quotes` (84 columnas — ver Fase 3 para posible split)
  - `quote_settings`
  - `lab_work_orders` (109 columnas — ver Fase 3)
  - `lab_work_order_status_history`
  - Funciones: `check_and_expire_quotes`, `expire_quotes`, `update_work_order_status`
  - Triggers: `check_quote_prescription_customer_match` (de la skill)
- **Rollback**: DROP tablas

#### Grupo 7 — POS & Payments

- **Dominio**: orders, payments, POS sessions, cash register, credit notes
- **Migs originales**: ~14
- **Contenido**:
  - `orders` (87 columnas — ver Fase 3 para posible split)
  - `order_items` (con `variant_id` FK indexada)
  - `order_payments`
  - `pos_sessions`, `pos_transactions`
  - `pos_settings`
  - `cash_register_closures`
  - `payments`, `webhook_events`, `payment_gateways_config`, `payment_installments`
  - `credit_notes`, `credit_note_movements`
  - `pos_sale_idempotency`
  - Funciones: `process_pos_sale`, `generate_credit_note_number`,
    `update_pos_session_cash`
  - RLS policies
- **Rollback**: DROP tablas

#### Grupo 8 — Work Orders & Appointments

- **Dominio**: appointments, schedule
- **Migs originales**: ~8
- **Contenido**:
  - `appointments` (con guest customer support)
  - `schedule_settings`
  - Funciones de disponibilidad: `check_appointment_availability`,
    `get_available_time_slots` (con todas las correcciones)
  - RLS policies
- **Rollback**: DROP tablas

#### Grupo 9 — Communications (Notifications, Emails, Templates, WhatsApp)

- **Dominio**: notifications, email system, WhatsApp
- **Migs originales**: ~14
- **Contenido**:
  - `admin_notifications` (con `organization_id`)
  - `notification_settings`
  - `system_email_templates` (versión consolidada, sin duplicados)
  - `email_send_events`
  - `whatsapp_phone_numbers`
  - Funciones: `get_notification_priority`, `get_notification_setting_effective`,
    `get_unread_notification_count`, `is_notification_enabled`,
    `mark_all_notifications_read`, `mark_notification_read`,
    `notify_admin_low_stock`, `notify_admin_new_order`,
    `cleanup_old_notifications`, `log_admin_activity`
  - RLS policies
- **Rollback**: DROP tablas

#### Grupo 10 — Support

- **Dominio**: B2C support, SaaS support, optical internal support
- **Migs originales**: ~5
- **Contenido**:
  - `support_categories`, `support_tickets`, `support_messages`, `support_templates`
  - `saas_support_tickets`, `saas_support_messages`, `saas_support_templates`
  - `optical_internal_support_tickets`, `optical_internal_support_messages`
  - RLS policies
- **Rollback**: DROP tablas

#### Grupo 11 — Agreements, Field Ops, CRM Extras

- **Dominio**: conventions, field operations, lead management, surveys, referrals, churn
- **Migs originales**: ~15
- **Contenido**:
  - `agreements`, `agreement_purchase_orders`, `agreement_institutional_balances`
  - `agreement_customers`, `agreement_institutional_invoices`,
    `agreement_institutional_invoice_balances`
  - `field_operations`, `operativo_mobile_stock`, `operativo_sync_queue`
  - `internal_orders`, `internal_order_items`, `internal_order_status_history`
  - `drivers`, `vehicles`
  - `survey_invitations`, `customer_satisfaction_surveys`
  - `referrals`, `cancellation_reasons`, `churn_signals_log`
  - `lead_activities`, `lead_scoring_rules`, `lead_scoring_logs`,
    `lead_scoring_demographic_rules`, `lead_email_communications`
  - `account_activities`, `account_documents`
  - `workflow_definitions`, `workflow_executions`
  - `inventory_transfers`, `inventory_transfer_items`
  - Funciones: `sync_agreement_customers_on_order`
  - RLS policies
- **Rollback**: DROP tablas

#### Grupo 12 — AI, Telemetry & Demo System

- **Dominio**: AI, embeddings, telemetry, demo data, system config
- **Migs originales**: ~20
- **Contenido**:
  - `chat_sessions` (con `organization_id`)
  - `chat_messages`
  - `embeddings` (pgvector)
  - `ai_insights`
  - `ai_usage_log`
  - `memory_facts`
  - `telemetry_events`, `telemetry_aggregates`, `telemetry_config`
  - `system_config` (multitenant)
  - `system_maintenance_log`, `system_health_metrics`
  - `user_tour_progress`
  - `demo_requests`, `lead_activities`
  - `opticas_access_tokens`
  - `saas_backups`, `saas_audit_log`
  - Funciones: `search_embeddings`, `search_embeddings_small`,
    `search_memory_facts`, `optimize_database`, `cleanup_expired_demo_organizations`,
    `create_demo_organization_for_user`, `delete_demo_request_and_org`,
    `seed_demo_organization_data`, `seed_demo_mirada_clara`,
    `reset_demo_organization`
  - Seed functions (no data, solo estructura)
  - RLS policies
- **Rollback**: DROP tablas

**Archivos a eliminar** (no consolidar, solo archivar):

- 4 `remote_sync_placeholder.sql` → mover a archive, NO incluir en ninguna consolidada
- Migraciones duplicadas (ej: `remove_reviews_system` x2, `fix_cash_register_status_and_reopen` x2) → la última versión es la correcta
- Migraciones placeholder → mover a archive sin incluir

**Verificación de equivalencia**:

```
Given: DB actual con 265 migraciones aplicadas
When:  Se aplican las 12 migraciones consolidadas sobre una DB limpia (supabase db reset)
Then:  pg_dump --schema-only de ambos estados DEBE ser idéntico
       (diff retorna 0 líneas de diferencia)

Given: 265 archivos originales
When:  Se ejecuta script de archive
Then:  supabase/migrations/ contiene 12 archivos .sql
       supabase/migrations/archive/ contiene 1 archivo ZIP con los 265 originales
```

---

## 5. Fase 3 — Schema Normalization

### S-005: inventory_quantity deprecation

**Objetivo**: Eliminar `products.inventory_quantity` y `product_variants.inventory_quantity` como fuentes de verdad. La única fuente de stock es `product_branch_stock.quantity`.

**Contexto actual**:

- `products` tiene columna `inventory_quantity INTEGER`
- `product_variants` tiene columna `inventory_quantity INTEGER`
- `product_branch_stock` existe con `quantity`, `reserved_quantity`, `available_quantity` (GENERATED)

**Especificación**:

1. MUST verificar que ningún código backend/frontend referencia `products.inventory_quantity` o `product_variants.inventory_quantity`
   - Buscar en todo el proyecto con grep: `grep -r "inventory_quantity" --include="*.{ts,tsx,js,jsx}" src/`
2. Crear función de agregación `get_product_total_stock(product_id UUID)` que suma `product_branch_stock.quantity` para ese producto
3. La columna `inventory_quantity` en ambas tablas:
   - Opción A: Convertir en `GENERATED ALWAYS AS (get_product_total_stock(id)) STORED` (virtual materializada)
   - Opción B: Simplemente DROP
4. **Decisión**: Si hay código legacy que referencia la columna, usar Opción A (generada). Si no, Opción B.
5. La migración debe incluir un `DO $$` block que verifique que `product_branch_stock` tiene datos consistentes antes de hacer el cambio

```
Given: products tiene inventory_quantity con valor legacy
When:  Se ejecuta migración S-005
Then:  SELECT inventory_quantity FROM products WHERE id = <x>
       DEBE ser igual a SELECT SUM(quantity) FROM product_branch_stock WHERE product_id = <x>

Given: No hay código que referencie inventory_quantity
When:  Se ejecuta migración S-005
Then:  DROP COLUMN inventory_quantity en ambas tablas
       O convertida a GENERATED si hay código legacy
```

6. **Rollback**: Si se DROP, `ALTER TABLE ... ADD COLUMN inventory_quantity INTEGER`

---

### S-006: lab_work_orders splitting (evaluación)

**Objetivo**: Evaluar el split de `lab_work_orders` (109 columnas) en tablas relacionadas 1:1.

**Contexto actual**: `lab_work_orders` tiene 109 columnas que mezclan datos de prescripción, frame, lentes, laboratorio, delivery, pricing, y warranty.

**Especificación**:

1. Evaluar splitting en:
   - `lab_work_orders` (header: ~35 columnas base: id, order_number, dates, customer, status, pricing)
   - `lab_work_order_lenses` (~30 col: lens_type, materials, treatments, prescription)
   - `lab_work_order_delivery` (~15 col: delivery tracking, warranty)
   - `lab_work_order_notes` (~10 col: internal_notes, customer_notes, lab_notes, quality_notes)

2. **Criterio de decisión**:
   - Dividir SOLO SI las columnas agrupadas son mayoritariamente NULL y/o tienen baja cardinalidad de acceso
   - NO dividir si el split empeora la performance (más JOINs para queries comunes)
   - NO dividir si el split complejiza la API sin beneficio medible

3. **Si se divide**:
   - MUST crear vista `public.lab_work_orders` con mismo nombre y schema de columnas que la tabla original → backward compat total
   - Las queries existentes NO deben requerir cambios
   - `INSERT/UPDATE` contra la vista requiere `INSTEAD OF` triggers

4. **Si NO se divide**:
   - Agregar `COMMENT ON TABLE lab_work_orders IS '...'` documentando por qué no se dividió
   - Considerar agregar columnas _deprecated_ y mover solo si hay necesidad real

```
Given: lab_work_orders tiene 109 columnas
When:  Se evalúa split agrupando por dominio (lens, delivery, lab, notes)
Then:  Decisión documentada en spec (dividir o no dividir)
       Si divide → vista backward-compat creada
       Si no divide → comentario de tabla explicando decisión
```

5. **Rollback**: Si se divide, dropear vista y nuevas tablas, restaurar tabla original desde backup de migración.

---

### S-007: orders splitting (evaluación)

**Objetivo**: Evaluar el split de `orders` (87 columnas) en tablas relacionadas.

**Contexto actual**: `orders` tiene 87 columnas mezclando order header, shipping, billing, POS metadata, SII (facturación chilena), payment gateway data, y agreement fields.

**Especificación**:

1. Evaluar splitting en:
   - `orders` (header: ~30 columnas base)
   - `order_shipping` (~10 col: shipping address, tracking, carrier)
   - `order_billing` (~15 col: billing address, SII data, tax breakdown)
   - `order_payment_gateway` (~15 col: MP metadata, payment gateway fields)
   - `order_pos` (~10 col: POS-specific fields)

2. **Criterio de decisión**: Mismos criterios que S-006.

3. **Si se divide**: MUST crear vista `public.orders` para backward compat.

```
Given: orders tiene 87 columnas
When:  Se evalúa split
Then:  Decisión documentada
```

4. **Rollback**: Ídem S-006.

---

### S-008: quotes splitting (evaluación)

**Objetivo**: Evaluar el split de `quotes` (84 columnas) en tablas relacionadas.

**Contexto actual**: `quotes` tiene 84 columnas mezclando quote header, frame data, lens data, pricing, presbyopia solutions, contact lens options, y field operations.

**Especificación**:

1. Evaluar splitting en:
   - `quotes` (header: ~30 columnas base)
   - `quote_lens_options` (~25 col: lens type, materials, treatments, presbyopia)
   - `quote_frame` (~15 col: frame details, near frame)
   - `quote_contact_lens` (~10 col: contact lens specific fields)
   - `quote_pricing_breakdown` (~10 col: costs breakdown)

2. **Criterio de decisión**: Mismos criterios que S-006 y S-007. Quotes es la tabla con MENOS probabilidad de beneficiarse del split porque sus columnas se leen JUNTAS en la mayoría de las queries (presupuesto completo).

3. **Si se divide**: MUST crear vista `public.quotes` para backward compat.

```
Given: quotes tiene 84 columnas
When:  Se evalúa split
Then:  Decisión documentada
```

4. **Rollback**: Ídem S-006.

---

## 6. Fase 4 — Seed + Workflow

### S-009: seed.sql funcional

**Objetivo**: Crear `supabase/seed.sql` con datos demo mínimos funcionales que permita `supabase db reset` + trabajo inmediato.

**Contexto actual**: No existe seed.sql. Los datos demo se insertaban vía migraciones separadas (seed_demo_organization, seed_demo_mirada_clara, etc.) que serán consolidadas en Fase 2.

**Especificación**:

1. El archivo MUST llamarse `supabase/seed.sql`
2. MUST incluir datos demo mínimos funcionales:
   - 1 organización demo (nombre: "Óptica Mirada Clara")
   - 2-3 sucursales (Casa Matriz, Providencia, opcional: Vitacura)
   - 2 admin users (super_admin + admin) con auth.users entries
   - 1 admin_branch_access (super_admin con acceso global)
   - Categorías base (Marcos, Lentes Oftálmicos, Lentes de Contacto, Accesorios)
   - 5-10 productos demo (marcos, accesorios)
   - 2-3 familias de lentes (básica, progresivo, digital)
   - 1-2 matrices de precio por familia
   - 5-10 clientes demo con RUTs chilenos realistas
   - 2-3 citas de ejemplo
   - Configuraciones base (organization_settings, system_config, pos_settings)

3. MUST ser **idempotente**: usar `INSERT INTO ... ON CONFLICT (id) DO NOTHING` o verificar existencia previa. Esto permite ejecutar `supabase db reset` + seed múltiples veces.

4. MUST usar UUIDs fijos predecibles (ej: `00000000-0000-0000-0000-000000000001` para la organización) para que funciones seed existentes funcionen.

5. NO debe incluir datos masivos (la demo data histórica se puede seed por separado).

6. Debe correr dentro de un bloque `BEGIN/COMMIT` transaccional.

```
Given: DB vacía post-supabase db reset
When:  Se ejecuta supabase/seed.sql
Then:  Organización demo existe con admin users funcionales
       Sucursales existen con stock asignado
       Clientes demo existen con RUTs válidos
       Citas demo existen con estado correcto

Given: DB ya tiene datos (seed corrido previamente)
When:  Se ejecuta seed.sql nuevamente
Then:  La DB NO tiene duplicados
       Los datos se mantienen consistentes
```

7. **Rollback**: No aplica. Es idempotente — se puede simplemente re-ejecutar `supabase db reset`.

---

### S-010: Convención de migraciones futuras

**Objetivo**: Documentar el workflow de migraciones para que futuros cambios sigan el mismo patrón.

**Archivo destino**: `docs/database/MIGRATION_CONVENTION.md`

**Especificación**:

1. El archivo DEBE documentar:

   a. **Naming convention**:
   - Archivo: `YYYYMMDD_descripcion_corta.sql`
   - Ejemplo: `20260715_add_prescription_expiry_alert.sql`
   - Sin números de secuencia arbitrarios (timestamp-based ordering)

   b. **Template de migración**:

   ```sql
   -- Migration: YYYYMMDD_descripcion_corta
   -- Description: <qué hace esta migración>
   --
   -- Rollback:
   --   <comandos SQL para revertir>
   --   Migration: YYYYMMDD_descripcion_corta (rollback)

   BEGIN;

   -- <migration logic here>

   COMMIT;
   ```

   c. **Reglas**:
   - MUST usar `IF NOT EXISTS` / `IF EXISTS` para idempotencia
   - MUST incluir comentario de rollback
   - MUST incluir en transacción explícita (`BEGIN/COMMIT`)
   - `CREATE INDEX CONCURRENTLY` no puede ir dentro de transacción
   - Para cambios destructivos, MUST documentar procedimiento de rollback manual

   d. **Pre-merge checklist**:
   - [ ] `supabase db reset` funciona limpio
   - [ ] `npm run test:run` pasa sin failures
   - [ ] `npm run build` compila sin errores
   - [ ] No hay `FIXME` o `TODO` en la migración
   - [ ] Si modifica tablas existentes, verificar que `pg_dump --schema-only` es correcto

   e. **Comandos**:

   ```bash
   # Nueva migración
   supabase migration new <descripcion_corta>

   # Reset + seed
   supabase db reset

   # Ver estado
   supabase migration list

   # Reparar (si falló)
   supabase migration repair --status applied <version>
   ```

2. Verificación: el archivo DEBE existir y ser legible post-implementación.

---

## 7. Resumen de Especificaciones

| Spec ID | Fase | Descripción                               | Prioridad | Depende de |
| ------- | ---- | ----------------------------------------- | --------- | ---------- |
| S-001   | 0    | RLS en nurture\_\* tables                 | HIGH      | —          |
| S-002   | 0    | search_path en SECURITY DEFINER functions | HIGH      | —          |
| S-003   | 1    | Missing FK indexes                        | HIGH      | S-002      |
| S-004   | 2    | Migration consolidation (12 grupos)       | HIGH      | S-003      |
| S-005   | 3    | inventory_quantity deprecation            | MEDIUM    | S-004      |
| S-006   | 3    | lab_work_orders split evaluation          | MEDIUM    | S-004      |
| S-007   | 3    | orders split evaluation                   | MEDIUM    | S-004      |
| S-008   | 3    | quotes split evaluation                   | MEDIUM    | S-004      |
| S-009   | 4    | seed.sql funcional                        | HIGH      | S-004      |
| S-010   | 4    | Migration convention doc                  | MEDIUM    | S-004      |

### Assessment de Correcciones vs Propuesta

| Item                                       | Propuesta Decía              | Realidad                                 | Acción                       |
| ------------------------------------------ | ---------------------------- | ---------------------------------------- | ---------------------------- |
| SECURITY DEFINER functions sin search_path | "52 functions"               | 53 total, solo 2 sin search_path (no 52) | Tasks debe reflejar 2, no 52 |
| FKs sin índice                             | "91"                         | 65                                       | Tasks usar 65                |
| remote_sync_placeholder                    | "5 archivos"                 | 4 archivos                               | Tasks usar 4                 |
| Grupos de consolidación                    | ~10-12 con nombres distintos | 12 grupos específicos según instrucción  | Tasks: 12 grupos exactos     |

---

## 8. Return Envelope

**Status**: success
**Summary**: Spec created for `database-reformation`. 10 specifications (S-001 through S-010) across 5 phases with verified real DB numbers. Quality gates documented.
**Artifacts**: `openspec/changes/database-reformation/spec.md`
**Next**: sdd-design or sdd-tasks
**Risks**: Minor: proposal overestimated FK index count (91→65) and functions needing search_path (52→2). Not blockers, but tasks must use corrected numbers.
**Skill Resolution**: paths-injected — 2 skills (`database-optical-supabase`, `_shared`)
