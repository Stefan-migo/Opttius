# Tasks: database-reformation

## Resumen de Fases

| Phase                       | Specs        | Tareas        | Focus                                  | Est. Lines            |
| --------------------------- | ------------ | ------------- | -------------------------------------- | --------------------- |
| 0 — Security Baseline       | S-001, S-002 | T-001–T-006   | RLS nurture\_\*, search_path functions | ~100                  |
| 1 — Performance             | S-003        | T-020–T-030   | 92 FK indexes                          | ~230                  |
| 2 — Migration Consolidation | S-004        | T-040–T-100   | 12 grupos lógicos, archive             | ~5000+ (restated DDL) |
| 3 — Schema Normalization    | S-005        | T-101–T-105   | inventory_quantity → GENERATED         | ~90                   |
| 4 — Seed + Workflow         | S-009, S-010 | T-201–T-205   | seed.sql, migration convention         | ~300                  |
| **Total**                   | **10 specs** | **~50 tasks** |                                        | **~5700+**            |

---

## Fase 0 — Security Baseline

### S-001: RLS en nurture\_\* (4 tablas)

> **Decisión**: Las nurture tables NO tienen `organization_id` y son tablas muertas (0 referencias en código). No se agrega columna — solo RLS básico permitiendo service_role únicamente.

#### T-001: RLS en nurture_campaigns

- [x] Implemented in `supabase/migrations/20260701000001_rls_nurture_campaigns.sql`

**Phase**: 0
**Group**: security
**Spec**: S-001
**Files**: `supabase/migrations/20260701_security_baseline.sql`

**Description**:
Agregar `ALTER TABLE public.nurture_campaigns ENABLE ROW LEVEL SECURITY`. Crear política que solo permite acceso a service_role:

```sql
ALTER TABLE public.nurture_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_nurture_campaigns" ON public.nurture_campaigns
  FOR ALL USING (auth.role() = 'service_role');
-- Bloquear explícitamente usuarios autenticados
CREATE POLICY "block_authenticated_nurture_campaigns" ON public.nurture_campaigns
  FOR ALL USING (false);
```

**Verification**:

- `SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'nurture_campaigns'` → `rowsecurity = true`
- Consulta como role anónimo: `SET ROLE anon; SELECT * FROM nurture_campaigns LIMIT 1;` → 0 filas
- `npm run test:run` pasa

**Rollback**:

- `DROP POLICY IF EXISTS service_role_only_nurture_campaigns ON public.nurture_campaigns`
- `ALTER TABLE public.nurture_campaigns DISABLE ROW LEVEL SECURITY`

**Dependencies**: Ninguna

**Est. lines**: ~15

---

#### T-002: RLS en nurture_campaign_emails

- [x] Implemented in `supabase/migrations/20260701000001_rls_nurture_campaigns.sql`

**Phase**: 0
**Group**: security
**Spec**: S-001
**Files**: `supabase/migrations/20260701_security_baseline.sql`

**Description**:
Ídem T-001 para `nurture_campaign_emails`. Habilitar RLS, crear política service_role-only + política blocking para authenticated.

**Verification**:

- `rowsecurity = true` en pg_tables para nurture_campaign_emails
- Anon SELECT retorna 0 filas

**Rollback**: Ídem T-001

**Dependencies**: T-001 (mismo archivo, orden alfabético)

**Est. lines**: ~15

---

#### T-003: RLS en nurture_log

- [x] Implemented in `supabase/migrations/20260701000001_rls_nurture_campaigns.sql`

**Phase**: 0
**Group**: security
**Spec**: S-001
**Files**: `supabase/migrations/20260701_security_baseline.sql`

**Description**:
Ídem T-001 para `nurture_log`.

**Verification**:

- `rowsecurity = true` para nurture_log

**Rollback**: Ídem T-001

**Dependencies**: T-001

**Est. lines**: ~15

---

#### T-004: RLS en nurture_queue

- [x] Implemented in `supabase/migrations/20260701000001_rls_nurture_campaigns.sql`

**Phase**: 0
**Group**: security
**Spec**: S-001
**Files**: `supabase/migrations/20260701_security_baseline.sql`

**Description**:
Ídem T-001 para `nurture_queue`.

**Verification**:

- `rowsecurity = true` para nurture_queue

**Rollback**: Ídem T-001

**Dependencies**: T-001

**Est. lines**: ~15

---

### S-002: SECURITY DEFINER functions — SET search_path

#### T-005: search_path en handle_organization_delete

- [x] Implemented in `supabase/migrations/20260701000002_fix_security_definer_search_path.sql`

**Phase**: 0
**Group**: security
**Spec**: S-002
**Files**: `supabase/migrations/20260701_security_baseline.sql`

**Description**:
Agregar `SET search_path = 'public'` a la función `handle_organization_delete`. Obtener definición actual con `pg_get_functiondef()`, preservar body exacto, solo agregar la cláusula `SET search_path = 'public'` después de `SECURITY DEFINER`. La función ya usa `auth.users` con schema qualification explícita, por lo que el cambio es seguro.

**Verification**:

- Query de auditoría: `SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prosecdef = true AND (p.proconfig IS NULL OR NOT (p.proconfig @> '{search_path=public}'::text[]))` → retorna 1 fila (handle_organization_delete_fallback, la otra)
- `EXPLAIN` de la función post-cambio no debe mostrar cambios en plan excepto search_path
- `npm run test:run` pasa

**Rollback**:
Re-crear función sin `SET search_path = 'public'` usando la definición original guardada pre-cambio.

**Dependencies**: Ninguna

**Est. lines**: ~10

---

#### T-006: search_path en handle_organization_delete_fallback

- [x] Implemented in `supabase/migrations/20260701000002_fix_security_definer_search_path.sql`

**Phase**: 0
**Group**: security
**Spec**: S-002
**Files**: `supabase/migrations/20260701_security_baseline.sql`

**Description**:
Ídem T-005 para `handle_organization_delete_fallback`.

**Verification**:

- Query de auditoría retorna 0 filas (ambas funciones corregidas)
- `npm run test:run` pasa

**Rollback**: Ídem T-005

**Dependencies**: T-005 (mismo patrón)

**Est. lines**: ~10

---

## Fase 1 — Performance (Indexes)

### S-003: Missing FK indexes (92)

> **Nota**: El conteo exacto varía según el método de detección (89–92). Las tareas usan 92 como cota superior. Durante implementación, **re-verificar** con el query definitivo del spec y excluir FKs ya cubiertas por composite indexes existentes.

#### T-020: Índices FKs en tablas core (profiles, admin_users, branches, organizations)

- [x] Implemented in `supabase/migrations/20260702000001_idx_core_fk.sql`

**Phase**: 1
**Group**: indexes
**Spec**: S-003
**Files**: `supabase/migrations/20260702000001_idx_core_fk.sql`

**Description**:
Crear `CREATE INDEX CONCURRENTLY IF NOT EXISTS` para FKs sin índice en:

- `admin_users(created_by)` → `idx_admin_users_created_by`
- `profiles(preferred_branch_id)` → `idx_profiles_preferred_branch_id`
- Otras FKs core detectadas por el query de verificación

**Verification**:

- Query de auditoría de FKs sin índice muestra reducción en este grupo
- `SELECT indexname FROM pg_indexes WHERE tablename IN ('profiles', 'admin_users', 'branches', 'organizations') AND indexname LIKE 'idx_%'`

**Rollback**: `DROP INDEX IF EXISTS idx_admin_users_created_by` (por cada índice creado)

**Dependencies**: T-006

**Est. lines**: ~20

---

#### T-021: Índices FKs en tablas CRM (customers, prescriptions, appointments)

- [x] Implemented in `supabase/migrations/20260702000002_idx_crm_fk.sql`

**Phase**: 1
**Group**: indexes
**Spec**: S-003
**Files**: `supabase/migrations/20260702000002_idx_crm_fk.sql`

**Description**:
Crear índices para FKs en `customers`, `prescriptions`, `appointments`, `customer_lens_purchases`, `customer_satisfaction_surveys`, `survey_invitations`.

**Verification**: Ídem T-020 filtrando por tablas CRM

**Rollback**: DROP INDEX por cada uno

**Dependencies**: T-020

**Est. lines**: ~20

---

#### T-022: Índices FKs en tablas de ventas (orders, quotes, order_items)

- [x] Implemented in `supabase/migrations/20260702000003_idx_sales_fk.sql`

**Phase**: 1
**Group**: indexes
**Spec**: S-003
**Files**: `supabase/migrations/20260702000003_idx_sales_fk.sql`

**Description**:
Crear índices para FKs en `orders(purchase_order_id)`, `order_items(variant_id)`, `quotes(*)` — quotes tiene 6 FKs sin índice según la lista del spec.

**Verification**: Query de auditoría

**Rollback**: DROP INDEX por cada uno

**Dependencies**: T-021

**Est. lines**: ~25

---

#### T-023: Índices FKs en tablas de productos (products, product_branch_stock, categories)

- [x] Implemented in `supabase/migrations/20260702000004_idx_products_lenses_fk.sql`

**Phase**: 1
**Group**: indexes
**Spec**: S-003
**Files**: `supabase/migrations/20260702000004_idx_products_lenses_fk.sql`

**Description**:
Crear índices para FKs en `lens_products(category_id)`, `lens_catalog_products(*)`, `cart_items(variant_id)`.

**Verification**: Query de auditoría

**Rollback**: DROP INDEX por cada uno

**Dependencies**: T-022

**Est. lines**: ~20

---

#### T-024: Índices FKs en tablas de lentes (lens*families, lens_price_matrices, contact_lens*\*)

- [x] Implemented in `supabase/migrations/20260702000004_idx_products_lenses_fk.sql`

**Phase**: 1
**Group**: indexes
**Spec**: S-003
**Files**: `supabase/migrations/20260702000004_idx_products_lenses_fk.sql`

**Description**:
Crear índices para FKs en `lens_price_matrices(organization_id)`, `lens_products(catalog_product_id)`, `contact_lens_encargos(created_by)`.

**Verification**: Query de auditoría

**Rollback**: DROP INDEX por cada uno

**Dependencies**: T-023

**Est. lines**: ~20

---

#### T-025: Índices FKs en work orders (lab_work_orders, status_history)

- [x] Implemented in `supabase/migrations/20260702000005_idx_workorders_comm_fk.sql`

**Phase**: 1
**Group**: indexes
**Spec**: S-003
**Files**: `supabase/migrations/20260702000005_idx_workorders_comm_fk.sql`

**Description**:
Crear índices para FKs en `lab_work_orders(frame_product_id, pos_order_id)`, `pos_sale_idempotency(order_id, work_order_id)`, `optical_internal_support_tickets(related_work_order_id)`.

**Verification**: Query de auditoría

**Rollback**: DROP INDEX por cada uno

**Dependencies**: T-024

**Est. lines**: ~20

---

#### T-026: Índices FKs en comunicaciones (notifications, email, chat)

- [x] Implemented in `supabase/migrations/20260702000005_idx_workorders_comm_fk.sql`

**Phase**: 1
**Group**: indexes
**Spec**: S-003
**Files**: `supabase/migrations/20260702000005_idx_workorders_comm_fk.sql`

**Description**:
Crear índices para FKs en `system_email_templates(created_by)`, `memory_facts(source_session_id)`, `system_config(last_modified_by)`, `system_maintenance_log(executed_by)`.

**Verification**: Query de auditoría

**Rollback**: DROP INDEX por cada uno

**Dependencies**: T-025

**Est. lines**: ~20

---

#### T-027: Índices FKs en soporte (support_tickets, saas_support, optical_internal)

- [x] Implemented in `supabase/migrations/20260702000006_idx_support_payments_fk.sql`

**Phase**: 1
**Group**: indexes
**Spec**: S-003
**Files**: `supabase/migrations/20260702000006_idx_support_payments_fk.sql`

**Description**:
Crear índices para FKs en `support_tickets(category_id, order_id, resolved_by)`, `support_templates(category_id, created_by)`, `saas_support_tickets(created_by_user_id, resolved_by)`, `saas_support_messages(sender_id)`, `saas_support_templates(created_by)`, `optical_internal_support_tickets(*)`, `optical_internal_support_messages(sender_id)`.

**Verification**: Query de auditoría

**Rollback**: DROP INDEX por cada uno

**Dependencies**: T-026

**Est. lines**: ~30

---

#### T-028: Índices FKs en pagos y POS (payments, webhook_events, pos_sessions)

- [x] Implemented in `supabase/migrations/20260702000006_idx_support_payments_fk.sql`

**Phase**: 1
**Group**: indexes
**Spec**: S-003
**Files**: `supabase/migrations/20260702000006_idx_support_payments_fk.sql`

**Description**:
Crear índices para FKs en `credit_notes(pos_session_id)`, `pos_sale_idempotency(order_id, work_order_id)` — las ya no cubiertas en T-025.

**Verification**: Query de auditoría

**Rollback**: DROP INDEX por cada uno

**Dependencies**: T-027

**Est. lines**: ~15

---

#### T-029: Índices FKs en convenios (agreements, agreement\_\*)

- [x] Implemented in `supabase/migrations/20260702000006_idx_support_payments_fk.sql`

**Phase**: 1
**Group**: indexes
**Spec**: S-003
**Files**: `supabase/migrations/20260702000006_idx_support_payments_fk.sql`

**Description**:
Crear índices para FKs en `agreement_institutional_balances(invoice_id, purchase_order_id)`, `agreement_institutional_invoices(organization_id)`.

**Verification**: Query de auditoría

**Rollback**: DROP INDEX por cada uno

**Dependencies**: T-028

**Est. lines**: ~15

---

#### T-030: Índices FKs en tablas misceláneas (restantes)

- [x] Implemented in `supabase/migrations/20260702000006_idx_support_payments_fk.sql`

**Phase**: 1
**Group**: indexes
**Spec**: S-003
**Files**: `supabase/migrations/20260702000006_idx_support_payments_fk.sql`

**Description**:
Crear índices para FKs restantes no cubiertas en T-020–T-029: `demo_requests(*)`, `referrals(*)`, `internal_orders(*)`, `workflow_definitions(created_by)`, `workflow_executions(created_by)`, `tier_change_audit(changed_by_user_id)`, `nurture_log(*)`, `nurture_queue(*)`.

**Verification**:

- Query de auditoría de FKs sin índice retorna EXACTAMENTE 0 filas
- `npm run test:run` pasa
- `supabase_get_advisors(type: "performance")` muestra mejora

**Rollback**: DROP INDEX por cada uno

**Dependencies**: T-029

**Est. lines**: ~30

---

## Fase 2 — Migration Consolidation

### S-004: 12 grupos de consolidación

> **Cada grupo** sigue el mismo patrón de 3 subtareas (A/B/C):
>
> - **A**: Analizar migraciones originales del grupo, extraer DDL definitivo (ignorando fixes intermedios, placeholders, duplicados)
> - **B**: Escribir script de consolidación (BEGIN/COMMIT, IF NOT EXISTS, comentarios con referencia a archivos originales)
> - **C**: Verificar equivalencia con `pg_dump --schema-only` diff + `npm run test:run`

> **Orden topológico**: Los grupos están numerados según dependencias FK entre dominios. Grupo 1 debe aplicarse primero, Grupo 12 último.

---

#### Grupo 1 — Core Schema

**Migraciones originales**: ~15 (desde 202412 hasta 202601)
**Tablas**: organizations, branches, profiles, admin_users, admin_branch_access, subscription_tiers, subscriptions
**Funciones**: is_admin, is_super_admin, is_root_user, is_employee, get_user_organization_id, get_admin_role, can_access_branch, get_user_branches, get_current_branch_id, handle_new_user, handle_new_admin_user, handle_organization_delete, handle_organization_delete_fallback
**File**: `supabase/migrations/20260703_001_core_schema.sql`

##### T-040-A: Analizar migraciones Core Schema

**Phase**: 2
**Group**: consolidation-1
**Spec**: S-004
**Files**: `supabase/migrations/archive/` (origen), análisis en notas de implementación

**Description**:
Revisar las ~15 migraciones originales de Core Schema. Identificar: tablas creadas (orden), columnas agregadas/modificadas, índices, RLS, funciones helper. Extraer el DDL final de cada objeto (ignorando migraciones fix intermedias). Documentar qué migraciones originales se consolidan y cuáles se excluyen (placeholders, duplicados).

**Verification**:

- Lista completa de objetos que debe incluir el script consolidado
- Referencia cruzada contra schema actual de DB viva

**Rollback**: N/A (solo análisis)

**Dependencies**: T-030

**Est. lines**: ~30 (análisis, no código)

##### T-040-B: Escribir script consolidado Core Schema

**Phase**: 2
**Group**: consolidation-1
**Spec**: S-004
**Files**: `supabase/migrations/20260703_001_core_schema.sql`

**Description**:
Escribir migración consolidada con BEGIN/COMMIT, IF NOT EXISTS, comentarios. Incluir en orden: CREATE TABLE, CREATE INDEX, RLS ENABLE + policies, funciones helper, triggers. `handle_organization_delete` y `handle_organization_delete_fallback` ya incluyen `SET search_path = 'public'` (de Fase 0).

**Verification**: Ver T-040-C

**Rollback**: DROP de tablas en orden inverso (por FKs)

**Dependencies**: T-040-A

**Est. lines**: ~400-600

##### T-040-C: Verificar equivalencia Core Schema

**Phase**: 2
**Group**: consolidation-1
**Spec**: S-004
**Files**: Verificación (temporal)

**Description**:
Ejecutar `supabase db reset`, aplicar solo la migración 001, correr `pg_dump --schema-only > after.sql`. Comparar contra `pg_dump --schema-only` de DB actual (solo objetos del grupo 1 — filtrar por schema). Verificar que `npm run test:run` pasa.

**Verification**:

- `diff before.sql after.sql` solo muestra diferencias esperadas (nombres de migración en comentarios, etc.)
- `npm run test:run` = 0 failures
- `supabase_get_advisors` clean

**Rollback**: N/A (verificación)

**Dependencies**: T-040-B

**Est. lines**: N/A (verificación)

---

#### Grupo 2 — Optical Conversion (CRM, Products, Appointments)

**Migraciones originales**: ~15
**Tablas**: customers, products, categories, appointments, schedule_settings, product_branch_stock, product_variants, prescriptions
**File**: `supabase/migrations/20260703_002_optical_conversion.sql`

##### T-041-A: Analizar migraciones Optical Conversion

**Phase**: 2
**Group**: consolidation-2
**Spec**: S-004
**Files**: Análisis

**Description**: Revisar migraciones de customers, products, appointments. Extraer DDL final consolidado.

**Verification**: Lista completa contra schema actual

**Rollback**: N/A

**Dependencies**: T-040-C

**Est. lines**: ~30

##### T-041-B: Escribir script consolidado Optical Conversion

**Phase**: 2
**Group**: consolidation-2
**Spec**: S-004
**Files**: `supabase/migrations/20260703_002_optical_conversion.sql`

**Description**:
Migración consolidada con productos SIN `inventory_quantity` (se migra en Fase 3), product_variants SIN `inventory_quantity`, product_branch_stock con GENERATED available_quantity. Incluir RLS policies y triggers.

**Verification**: Ver T-041-C

**Rollback**: DROP tablas (orden inverso)

**Dependencies**: T-041-A, T-040-C

**Est. lines**: ~400-600

##### T-041-C: Verificar equivalencia Optical Conversion

**Phase**: 2
**Group**: consolidation-2
**Spec**: S-004
**Files**: Verificación

**Description**: Aplicar grupos 1+2 sobre DB limpia, pg_dump diff contra DB actual.

**Verification**: pg_dump diff = 0 líneas (excepto cambios intencionales). `npm run test:run` pasa.

**Rollback**: N/A

**Dependencies**: T-041-B

**Est. lines**: N/A

---

#### Grupo 3 — Lenses

**Migraciones originales**: ~12
**Tablas**: lens_families, lens_price_matrices, contact_lens_families, contact_lens_price_matrices, contact_lens_inventory, contact_lens_encargos, treatments, lens_materials, lens_designs, lens_suppliers, lens_supplier_catalogs, lens_catalog_products, lens_products, lens_product_pricing, lens_mountings, lens_indexes, lens_supplier_services
**File**: `supabase/migrations/20260703_003_lenses.sql`

##### T-042-A: Analizar migraciones Lenses

**Dependencies**: T-040-C | **Est. lines**: ~30

##### T-042-B: Escribir script consolidado Lenses

**Dependencies**: T-042-A | **Est. lines**: ~500-700

##### T-042-C: Verificar equivalencia Lenses

**Dependencies**: T-042-B

---

#### Grupo 4 — Branches & Multi-tenancy

**Migraciones originales**: ~8
**Tablas**: organization_settings, tier_change_audit, extensiones RLS
**File**: `supabase/migrations/20260703_004_multi_tenancy.sql`

##### T-043-A: Analizar migraciones Multi-tenancy

**Dependencies**: T-040-C | **Est. lines**: ~20

##### T-043-B: Escribir script consolidado Multi-tenancy

**Dependencies**: T-043-A | **Est. lines**: ~200-300

##### T-043-C: Verificar equivalencia Multi-tenancy

**Dependencies**: T-043-B

---

#### Grupo 5 — POS & Payments

**Migraciones originales**: ~14
**Tablas**: orders (87 cols), order_items, order_payments, pos_sessions, pos_transactions, pos_settings, cash_register_closures, payments, webhook_events, payment_gateways_config, payment_installments, credit_notes, credit_note_movements, pos_sale_idempotency
**File**: `supabase/migrations/20260703_005_pos_payments.sql`

##### T-044-A: Analizar migraciones POS & Payments

**Dependencies**: T-041-C, T-042-C, T-043-C | **Est. lines**: ~30

##### T-044-B: Escribir script consolidado POS & Payments

**Dependencies**: T-044-A | **Est. lines**: ~500-700

##### T-044-C: Verificar equivalencia POS & Payments

**Dependencies**: T-044-B

---

#### Grupo 6 — Work Orders

**Migraciones originales**: ~5
**Tablas**: lab_work_orders (109 cols), lab_work_order_status_history
**File**: `supabase/migrations/20260703_006_work_orders.sql`

##### T-045-A: Analizar migraciones Work Orders

**Dependencies**: T-044-C | **Est. lines**: ~20

##### T-045-B: Escribir script consolidado Work Orders

**Dependencies**: T-045-A | **Est. lines**: ~200-400

##### T-045-C: Verificar equivalencia Work Orders

**Dependencies**: T-045-B

---

#### Grupo 7 — Communications

**Migraciones originales**: ~12
**Tablas**: admin_notifications, notification_settings, system_email_templates, email_send_events, whatsapp_phone_numbers
**File**: `supabase/migrations/20260703_007_communications.sql`

##### T-046-A: Analizar migraciones Communications

**Dependencies**: T-043-C | **Est. lines**: ~25

##### T-046-B: Escribir script consolidado Communications

**Dependencies**: T-046-A | **Est. lines**: ~300-400

##### T-046-C: Verificar equivalencia Communications

**Dependencies**: T-046-B

---

#### Grupo 8 — Support

**Migraciones originales**: ~8
**Tablas**: support_categories, support_tickets, support_messages, support_templates, saas_support_tickets, saas_support_messages, saas_support_templates, optical_internal_support_tickets, optical_internal_support_messages
**File**: `supabase/migrations/20260703_008_support.sql`

##### T-047-A: Analizar migraciones Support

**Dependencies**: T-043-C | **Est. lines**: ~25

##### T-047-B: Escribir script consolidado Support

**Dependencies**: T-047-A | **Est. lines**: ~300-400

##### T-047-C: Verificar equivalencia Support

**Dependencies**: T-047-B

---

#### Grupo 9 — Agreements & Field Ops

**Migraciones originales**: ~10
**Tablas**: agreements, agreement_purchase_orders, agreement_institutional_balances, agreement_customers, agreement_institutional_invoices, field_operations, operativo_mobile_stock, operativo_sync_queue, internal_orders, internal_order_items, internal_order_status_history, drivers, vehicles, inventory_transfers, inventory_transfer_items
**File**: `supabase/migrations/20260703_009_agreements_fieldops.sql`

##### T-048-A: Analizar migraciones Agreements & Field Ops

**Dependencies**: T-045-C | **Est. lines**: ~30

##### T-048-B: Escribir script consolidado Agreements & Field Ops

**Dependencies**: T-048-A | **Est. lines**: ~500-700

##### T-048-C: Verificar equivalencia Agreements & Field Ops

**Dependencies**: T-048-B

---

#### Grupo 10 — AI & Telemetry

**Migraciones originales**: ~8
**Tablas**: chat_sessions, chat_messages, embeddings, ai_insights, ai_usage_log, memory_facts, telemetry_events, telemetry_aggregates, telemetry_config, system_config, system_maintenance_log, system_health_metrics, user_tour_progress
**File**: `supabase/migrations/20260703_010_ai_telemetry.sql`

##### T-049-A: Analizar migraciones AI & Telemetry

**Dependencies**: T-043-C | **Est. lines**: ~25

##### T-049-B: Escribir script consolidado AI & Telemetry

**Dependencies**: T-049-A | **Est. lines**: ~300-500

##### T-049-C: Verificar equivalencia AI & Telemetry

**Dependencies**: T-049-B

---

#### Grupo 11 — Demo & Seed System

**Migraciones originales**: ~12
**Tablas**: demo_requests, opticas_access_tokens, saas_backups, saas_audit_log, lead_activities, funciones seed
**File**: `supabase/migrations/20260703_011_demo_seed.sql`

##### T-050-A: Analizar migraciones Demo & Seed

**Dependencies**: T-043-C | **Est. lines**: ~25

##### T-050-B: Escribir script consolidado Demo & Seed

**Dependencies**: T-050-A | **Est. lines**: ~300-400

##### T-050-C: Verificar equivalencia Demo & Seed

**Dependencies**: T-050-B

---

#### Grupo 12 — Final Fixes & Framework

**Migraciones originales**: ~8 (security audit fix, inventory refactor, misc fixes, placeholders)
**Contenido**: Migraciones que no encajan en grupos anteriores: fixes sueltos, correcciones de seguridad, placeholders de remote_sync
**File**: `supabase/migrations/20260703_012_final_fixes.sql`

##### T-051-A: Analizar migraciones Final Fixes

**Phase**: 2
**Group**: consolidation-12
**Spec**: S-004
**Files**: Análisis

**Description**:
Revisar ~8 migraciones restantes. Separar en:

- Fixes aplicables que deben ir en la consolidada
- Archivos placeholder (`remote_sync_placeholder.sql` x4) que NO se consolidan, solo se archivan
- Migraciones duplicadas: incluir solo la última versión correcta

**Verification**: Lista de qué se incluye y qué se archiva sin incluir

**Rollback**: N/A

**Dependencies**: T-045-C (última dependencia estructural)

**Est. lines**: ~20

##### T-051-B: Escribir script consolidado Final Fixes

**Phase**: 2
**Group**: consolidation-12
**Spec**: S-004
**Files**: `supabase/migrations/20260703_012_final_fixes.sql`

**Description**:
Escribir migración con los fixes relevantes. Excluir placeholders y duplicados. La migración debe ser segura para aplicar sobre DB limpia (IF NOT EXISTS en todo).

**Verification**: Ver T-051-C

**Rollback**: DROP de objetos creados (si los hay)

**Dependencies**: T-051-A

**Est. lines**: ~100-200

##### T-051-C: Verificar equivalencia Final Fixes

**Phase**: 2
**Group**: consolidation-12
**Spec**: S-004
**Files**: Verificación

**Description**:
Aplicar TODAS las 12 migraciones consolidadas sobre DB limpia en orden. `pg_dump --schema-only` diff contra DB actual (con las 265 migraciones originales). **DEBE ser idéntico** — esta es la verificación definitiva de toda la Fase 2.

**Verification**:

- `diff before.sql after.sql` = 0 líneas (schema equivalente)
- `npm run test:run` = 0 failures
- `npm run build` = 0 errors
- `supabase_get_advisors` clean

**Rollback**: N/A (verificación definitiva)

**Dependencies**: T-051-B, y todas las T-0XX-C anteriores

**Est. lines**: N/A

---

#### Archivo y Config

##### T-099: Comprimir migraciones originales

**Phase**: 2
**Group**: consolidation
**Spec**: S-004
**Files**: `supabase/migrations/archive/202501-202607_original_265_migrations.zip`

**Description**:
Mover los 265 archivos originales de `supabase/migrations/` a `supabase/migrations/archive/`. Crear ZIP con nombre `202501-202607_original_265_migrations.zip`. Excluir del ZIP: los 4 `remote_sync_placeholder.sql` se archivan pero NO se consolidan (se incluyen en el ZIP para referencia histórica pero no tienen contraparte en las 12 consolidadas). Verificar que `supabase/migrations/` contiene solo los 12 archivos consolidados + seed.sql.

**Verification**:

- `ls supabase/migrations/ | wc -l` = 13 (12 consolidados + seed.sql)
- `ls supabase/migrations/archive/ | grep .zip` = 1 archivo
- `supabase migration list` muestra solo las 12 consolidadas (más seed)

**Rollback**: Descomprimir ZIP de vuelta a `supabase/migrations/`, eliminar consolidadas

**Dependencies**: T-051-C (todas las consolidadas verificadas)

**Est. lines**: ~10

##### T-100: Actualizar config.toml si es necesario

**Phase**: 2
**Group**: consolidation
**Spec**: S-004
**Files**: `supabase/config.toml` (posiblemente)

**Description**:
Verificar que `supabase/config.toml` no referencie migraciones individuales. Si hay algún setting que dependa de nombres de migración, actualizarlo. Si no hay referencias, no hacer cambios (pero documentar que se verificó).

**Verification**:

- `grep -r "migration" supabase/config.toml` (si existe)
- `supabase db reset` funcional con las 12 migraciones

**Rollback**: Revertir cambios a config.toml si los hubo

**Dependencies**: T-099

**Est. lines**: ~10

---

## Fase 3 — Schema Normalization

### S-005: inventory_quantity → GENERATED column

> **Decisión**: 100+ referencias en `src/` a `inventory_quantity`. NO se puede DROP. Se convierte a GENERATED ALWAYS AS STORED.

#### T-101: Crear función get_product_total_stock

**Phase**: 3
**Group**: normalization
**Spec**: S-005
**Files**: `supabase/migrations/20260704_normalize_inventory.sql`

**Description**:

```sql
CREATE OR REPLACE FUNCTION public.get_product_total_stock(pid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT COALESCE(SUM(quantity), 0)::INTEGER
  FROM public.product_branch_stock
  WHERE product_id = pid;
$$;
```

**Verification**:

- `SELECT get_product_total_stock('<existing_product_id>')` retorna suma correcta
- Coincide con `SELECT SUM(quantity) FROM product_branch_stock WHERE product_id = '<id>'`

**Rollback**: `DROP FUNCTION IF EXISTS public.get_product_total_stock`

**Dependencies**: T-051-C

**Est. lines**: ~15

#### T-102: Crear función get_product_variant_total_stock

**Phase**: 3
**Group**: normalization
**Spec**: S-005
**Files**: `supabase/migrations/20260704_normalize_inventory.sql`

**Description**:

```sql
CREATE OR REPLACE FUNCTION public.get_product_variant_total_stock(vid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT COALESCE(SUM(quantity), 0)::INTEGER
  FROM public.product_branch_stock
  WHERE variant_id = vid;
$$;
```

**Verification**: Mismo patrón que T-101 pero con variant_id

**Rollback**: `DROP FUNCTION IF EXISTS public.get_product_variant_total_stock`

**Dependencies**: T-101

**Est. lines**: ~15

#### T-103: Migrar products.inventory_quantity a GENERATED

**Phase**: 3
**Group**: normalization
**Spec**: S-005
**Files**: `supabase/migrations/20260704_normalize_inventory.sql`

**Description**:

```sql
-- Primero verificar consistencia (DO block)
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count FROM products p
  WHERE p.inventory_quantity IS DISTINCT FROM get_product_total_stock(p.id);
  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'inventory_quantity mismatch: % products have inconsistent stock', mismatch_count;
  END IF;
END $$;

-- Luego convertir a GENERATED
ALTER TABLE public.products DROP COLUMN IF EXISTS inventory_quantity;
ALTER TABLE public.products ADD COLUMN inventory_quantity INTEGER
  GENERATED ALWAYS AS (get_product_total_stock(id)) STORED;

COMMENT ON COLUMN public.products.inventory_quantity IS
  'Deprecated. GENERATED from product_branch_stock. Do not write directly.';
```

**Verification**:

- `SELECT inventory_quantity FROM products WHERE id = '<id>'` = `SELECT SUM(quantity) FROM product_branch_stock WHERE product_id = '<id>'`
- `npm run build` compila (100+ refs en código siguen funcionando)
- `npm run test:run` pasa

**Rollback**: DROP GENERATED column, ADD COLUMN inventory_quantity INTEGER DEFAULT 0

**Dependencies**: T-101, T-102

**Est. lines**: ~30

#### T-104: Migrar product_variants.inventory_quantity a GENERATED

**Phase**: 3
**Group**: normalization
**Spec**: S-005
**Files**: `supabase/migrations/20260704_normalize_inventory.sql`

**Description**:
Mismo patrón que T-103 pero para `product_variants.inventory_quantity` usando `get_product_variant_total_stock`.

**Verification**: Mismo patrón que T-103

**Rollback**: Mismo patrón que T-103

**Dependencies**: T-103

**Est. lines**: ~30

#### T-105: Verificación final GENERATED columns + COMMENTS en tablas anchas

**Phase**: 3
**Group**: normalization
**Spec**: S-005
**Files**: `supabase/migrations/20260704_normalize_inventory.sql`

**Description**:
Agregar `COMMENT ON TABLE` para las 3 tablas anchas documentando decisión de NO dividir (ADR-3 del design):

```sql
COMMENT ON TABLE public.lab_work_orders IS
  '109 cols. No split: columnas se leen juntas en flujo de OT. '
  'Agrupación lógica: lens_prescription_data (~30 cols), delivery_data (~15), '
  'lab_data (~15), pricing/warranty (~15), base header (~34). '
  'Re-evaluar split cuando haya consumidor que necesite subconjunto.';

COMMENT ON TABLE public.orders IS
  '87 cols. No split: columnas se leen juntas en flujo de venta. '
  'Agrupación: shipping (~10), billing/SII (~15), POS (~10), gateway (~15), base (~37).';

COMMENT ON TABLE public.quotes IS
  '84 cols. No split: columnas se leen juntas en presupuesto completo. '
  'Agrupación: lens_options (~25), frame (~15), contact_lens (~10), pricing (~10), base (~24).';
```

**Verification**:

- `npm run test:run` pasa completo
- `npm run build` compila sin errores
- `pg_dump --schema-only` post-fase muestra GENERATED columns + COMMENTS

**Rollback**: DROP COMMENTS, reemplazar GENERATED columns con INTEGER simples

**Dependencies**: T-104

**Est. lines**: ~30

---

## Fase 4 — Seed + Workflow

### S-009: seed.sql funcional

#### T-201: Crear supabase/seed.sql

**Phase**: 4
**Group**: seed
**Spec**: S-009
**Files**: `supabase/seed.sql`

**Description**:
Crear seed.sql con datos demo mínimos funcionales dentro de un bloque BEGIN/COMMIT:

- 1 organización: "Óptica Mirada Clara" (UUID fijo: `00000000-0000-0000-0000-000000000001`)
- 2 sucursales: Casa Matriz (ID fijo 002), Providencia (ID fijo 003)
- 2 admin users: super_admin + admin (con auth.users entries vía supabase auth helpers)
- 1 admin_branch_access (super_admin con acceso global, branch_id = NULL)
- Categorías base: Marcos, Lentes Oftálmicos, Lentes de Contacto, Accesorios
- 5-10 productos demo (marcos/armazones con SKUs, precios)
- 2-3 familias de lentes: Básica, Progresivo, Digital
- 1-2 matrices de precio por familia (con rangos sphere/cylinder)
- 5-10 clientes demo con RUTs chilenos realistas
- 2-3 citas demo con estado "scheduled"
- 1-2 presupuestos demo vinculados a clientes
- 1-2 órdenes de trabajo demo
- 1 POS session demo
- Configuraciones base: organization_settings, system_config, pos_settings

**Reglas**:

- Idempotente: `INSERT INTO ... ON CONFLICT (id) DO NOTHING`
- UUIDs fijos predecibles (secuencia 001, 002, 003...)
- No incluir datos masivos
- BEGIN/COMMIT transaccional

**Verification**:

- `supabase db reset` + seed no produce errores
- Organización demo existe con admin users funcionales
- Sucursales existen con stock asignado
- Clientes demo existen
- Citas demo existen con estado correcto
- Re-ejecución: no produce duplicados

**Rollback**: No aplica (idempotente). `supabase db reset` para limpiar.

**Dependencies**: T-051-C (consolidación completa)

**Est. lines**: ~200

#### T-202: Verificar seed en DB vacía

**Phase**: 4
**Group**: seed
**Spec**: S-009
**Files**: Verificación

**Description**:
Ejecutar `supabase db reset` (que aplica migraciones + seed) en DB local. Verificar que todo funciona.

**Verification**:

- `supabase db reset` exitoso
- `npm run test:run` = 0 failures
- Consultas sobre datos demo: `SELECT * FROM organizations WHERE name = 'Óptica Mirada Clara'` → 1 fila
- `SELECT count(*) FROM customers` → N ≥ 5
- Admin users pueden hacer login con datos demo

**Rollback**: N/A

**Dependencies**: T-201

**Est. lines**: N/A

---

### S-010: Convención de migraciones futuras

#### T-203: Crear docs/database/MIGRATION_CONVENTION.md

**Phase**: 4
**Group**: workflow
**Spec**: S-010
**Files**: `docs/database/MIGRATION_CONVENTION.md`

**Description**:
Documentar (en español neutro, profesional):

a. **Naming convention**: `YYYYMMDD_descripcion_corta.sql`, timestamp-based ordering
b. **Template de migración**: BEGIN/COMMIT, IF NOT EXISTS, rollback en comentarios
c. **Reglas**: idempotencia, transacciones explícitas, CREATE INDEX CONCURRENTLY fuera de transacción, cambios destructivos requieren rollback manual documentado
d. **Pre-merge checklist** (7 items: reset, test, build, lint, pg_dump diff, advisors, sin FIXMEs)
e. **Comandos**: supabase migration new, db reset, migration list, migration repair

**Verification**: El archivo existe y es legible. Contenido revisado por un segundo par de ojos.

**Rollback**: `git rm docs/database/MIGRATION_CONVENTION.md`

**Dependencies**: T-051-C (convención referencia migraciones consolidadas)

**Est. lines**: ~100

#### T-204: Incluir template y reglas de nomenclatura

**Phase**: 4
**Group**: workflow
**Spec**: S-010
**Files**: `docs/database/MIGRATION_CONVENTION.md`

**Description**:
(Agregado al mismo archivo de T-203) Incluir secciones específicas:

- Template de migración con ejemplo completo
- Reglas de nomenclatura con ejemplos correctos/incorrectos
- Reglas de idempotencia: IF NOT EXISTS, DO $$ blocks para ALTER TABLE
- Guía de rollback: cómo escribir rollback, cuándo es obligatorio

**Verification**: El archivo cubre todas las secciones del spec

**Rollback**: Editar archivo para remover secciones

**Dependencies**: T-203

**Est. lines**: ~80 (incluido en T-203)

#### T-205: Documentar workflow de deploy

**Phase**: 4
**Group**: workflow
**Spec**: S-010
**Files**: `docs/database/MIGRATION_CONVENTION.md`

**Description**:
(Agregado al mismo archivo) Documentar workflow: local → test → remote.

- Flujo local: `supabase migration new` → edit → `supabase db reset` → test
- Flujo test/CI: migraciones aplicadas automáticamente via `supabase db push`
- Flujo remote: `supabase db push` con verificación pre-push
- Nota: esto es documentación del workflow, no implementación de CI/CD

**Verification**: El archivo tiene la sección de deploy workflow

**Rollback**: Editar archivo para remover sección

**Dependencies**: T-204

**Est. lines**: ~30

---

## Review Workload Forecast

| Field                   | Value                                                     |
| ----------------------- | --------------------------------------------------------- |
| Estimated changed lines | ~5500-6500 (∼5000 de DDL restated en Phase 2, ∼500 nuevo) |
| 400-line budget risk    | **HIGH**                                                  |
| Chained PRs recommended | **Yes**                                                   |
| Suggested split         | Ver abajo                                                 |
| Delivery strategy       | ask-on-risk                                               |

```
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
```

### Análisis de Riesgo

**Phase 2** domina el volumen (~5000+ líneas de DDL restated en 12 archivos). Aunque la verificación vía `pg_dump --schema-only` diff es automatizada y de alta confianza, el volumen bruto supera cualquier presupuesto de review razonable.

**Atenuante**: El DDL restated NO es código nuevo — es el schema actual expresado en forma consolidada. El reviewer no necesita leer cada línea, solo verificar que el diff tool reporta 0 diferencias. El riesgo real está en errores de copia (columnas faltantes, policies incorrectas) que el diff detecta automáticamente.

### Suggested Work Units (Chained PRs)

| Unit | Contents                                                    | Est. Lines | Verification                | Base |
| ---- | ----------------------------------------------------------- | ---------- | --------------------------- | ---- |
| PR 1 | Phase 0 + Phase 1 (security + indexes)                      | ~330       | test:run + advisors         | main |
| PR 2 | Phase 2 Groups 1–4 (core, CRM, lenses, multi-tenancy)       | ~2000      | pg_dump diff + test:run     | main |
| PR 3 | Phase 2 Groups 5–8 (POS, WOs, comms, support)               | ~2000      | pg_dump diff + test:run     | main |
| PR 4 | Phase 2 Groups 9–12 (agreements, AI, demo, fixes + archive) | ~1500      | pg_dump diff + test:run     | main |
| PR 5 | Phase 3 + Phase 4 (normalization, seed, doc)                | ~390       | build + test:run + db reset | main |

**Chain strategy**: stacked-to-main (cada PR mergea a main secuencialmente) es apropiado porque:

- Cada PR es autónomo y verificable individualmente
- No hay dependencias entre PRs que requieran feature branch
- Los diffs de DDL restated son fáciles de verificar con pg_dump diff

**Riesgo de PR único sin split**: ~5700 líneas, inviable para review.

### Recomendación

Chained PRs stacked-to-main. PR 1 es pequeño y seguro para arrancar. PRs 2-4 pueden parallelizarse en review (equipos diferentes) o secuenciarse. PR 5 cierra con los cambios visibles (GENERATED columns, seed funcional, documentación).
