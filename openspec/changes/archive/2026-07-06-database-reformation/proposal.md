# Proposal: database-reformation

## Intent

Eliminar deuda técnica acumulada en 265 migraciones (46 fix, 4 duplicadas, 5 placeholders) y sellar brechas de seguridad multi-tenant (4 tablas sin RLS, 52 funciones SECURITY DEFINER sin search_path). Consolidar historia migratoria en 10-12 grupos lógicos por dominio, normalizar schema sobredimensionado (3 tablas >80 cols), y establecer workflow de migraciones mantenible con seed funcional.

## Scope

### In Scope

- RLS en 4 nurture\_\* tables + SET search_path en 52 SECURITY DEFINER functions
- 91 índices para FKs huérfanas
- 265 migs → 10-12 grupos consolidados; archivo histórico comprimido en `supabase/migrations/archive/`
- Eliminar `products.inventory_quantity` + `product_variants.inventory_quantity` (fuente única: `product_branch_stock`)
- Evaluar split de `lab_work_orders` (109 cols), `orders` (90 cols), `quotes` (84 cols) con vistas backward-compat
- 5 archivos `remote_sync_placeholder.sql` eliminados
- `seed.sql` con datos demo funcionales (2 tenants, 3 sucursales)
- Documentar convención `YYYYMMDD_descripcion_corta.sql`

### Out of Scope

- Remote/GitHub DB sync (cambio aparte)
- Auth schema (`auth.users`) o frontend/backend business logic
- Refactor de RPCs existentes (solo seguridad)

## Approach

5 fases secuenciales, cada paso en transacción verificada con `pg_dump --schema-only` diff + `npm run test:run`.

### Phase 0 — Security Baseline

- Snapshot pre-cambio con `pg_dump --schema-only`
- RLS en 4 nurture\_\* tables + políticas branch-scoped
- `SET search_path = 'public'` en 52 SECURITY DEFINER functions
- Verificación: pg_dump diff + tests + advisors

### Phase 1 — Performance (Indexes)

- Identificar las 91 FKs sin índice vía `pg_indexes` vs `information_schema.table_constraints`
- Crear índices en batch (1 migración por dominio)
- `EXPLAIN ANALYZE` en queries representativas por dominio (CRM, POS, Work Orders)
- Verificación: test suite + advisors

### Phase 2 — Migration Consolidation

Archivar 265 migs originales en ZIP. Crear ~12 grupos consolidados:

| Grupo | Dominio                        | # Migs | Foco                                                                           |
| ----- | ------------------------------ | ------ | ------------------------------------------------------------------------------ |
| 1     | Core Auth & Orgs               | ~15    | organizations, branches, admin_users, profiles, roles, subscriptions, tiers    |
| 2     | CRM & Customers                | ~12    | customers, prescriptions, RUT search, multi-tenancy                            |
| 3     | Products & Inventory           | ~10    | products, categories, product_branch_stock, variants, tax, inventory movements |
| 4     | Lens Systems                   | ~15    | lens_families, lens_price_matrices, contact_lens_families, treatments          |
| 5     | Quotes & Work Orders           | ~12    | quotes, quote_items, lab_work_orders, status history, lens fields              |
| 6     | Orders & Payments              | ~14    | orders, order_items, billing, payment gateways, credit_notes                   |
| 7     | POS & Cash                     | ~10    | pos_sessions, pos_transactions, cash_register, process_pos_sale                |
| 8     | Appointments & Schedule        | ~8     | appointments, schedule_settings, availability functions                        |
| 9     | AI, Config & Notifications     | ~12    | ai_insights, system_config, admin_notifications, organization_settings         |
| 10    | Email System                   | ~12    | email_templates (all versions), email_send_events, b2b/b2c                     |
| 11    | Field Ops, Agreements, Support | ~12    | field_operations, agreements, support_tickets, lead_management, surveys        |
| 12    | Seed & Demo Data               | ~10    | seed*demo*\* migrations, demo reset/cleanup                                    |
| —     | Fix/removals                   | ~8     | duplicate removals, placeholders, standalone fixes sin dominio                 |

### Phase 3 — Schema Normalization

- Migrar `products.inventory_quantity` y `product_variants.inventory_quantity` → función de agregación sobre `product_branch_stock`
- Evaluar split de las 3 tablas anchas:
  - `lab_work_orders` (109 cols): separar `lens_prescription_data` + `delivery_data` + `lab_data` en tablas relacionadas 1:1
  - `orders` (90 cols): separar `shipping_data` + `billing_metadata`
  - `quotes` (84 cols): separar `lens_options` + `pricing_breakdown`
  - Cada split produce vista `\`public.<tabla>\`` con mismo nombre y schema = compat backward total

### Phase 4 — Seed + Workflow

- `supabase/seed.sql`: 2 organizaciones, 3 sucursales, productos base, clientes demo, citas de ejemplo
- `docs/database/MIGRATION_WORKFLOW.md`: convención `YYYYMMDD_descripcion_corta.sql`, comandos de creación/rollback, checklist pre-merge
- Verificación: `supabase db reset` + smoke test funcional

## Risks & Mitigations

| Risk                                                | Likelihood | Mitigation                                                                  |
| --------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| Split de tablas rompe queries existentes            | Medium     | Vistas backward-compat con mismo nombre y schema. Test suite antes de merge |
| Migs consolidadas no replican exactamente DB actual | Low        | Diff pg_dump --schema-only antes/después de cada fase                       |
| seed.sql se vuelve obsoleto sin mantenimiento       | Medium     | Seed mínimo (datos demo esenciales); scripts de demo data separados         |
| SET search_path rompe funciones cross-schema        | Low        | Auditoría manual de cada función target antes del cambio                    |
| Drop de inventory_quantity rompe código legacy      | Low        | Verificar que ningún backend/frontend referencie esas columnas              |

## Estimated Effort

| Fase                | Tareas         | Archivos            | Líneas cambio (netas)     |
| ------------------- | -------------- | ------------------- | ------------------------- |
| 0 — Security        | 3              | 1-2 migs            | +180 (RLS + search_path)  |
| 1 — Indexes         | 2              | 1 mig               | +91 índices (~90 líneas)  |
| 2 — Consolidation   | 12             | 12 migs + ZIP       | +1200 / -265 files        |
| 3 — Normalization   | 4              | 2-6 migs            | ~250-400 (+vistas, -cols) |
| 4 — Seed + Workflow | 3              | 2 archivos          | ~150 seed + ~50 doc       |
| **Total**           | **~24 tareas** | **~18-23 archivos** | **~1700-2100 líneas**     |

## Success Criteria

- [ ] `npm run test:run` pasa completo en cada fase
- [ ] pg_dump --schema-only idéntico pre/post por fase (excepto cambios intencionales)
- [ ] 4 nurture\_\* tables con RLS branch-scoped habilitado
- [ ] 52 funciones SECURITY DEFINER con `SET search_path = 'public'`
- [ ] 91 FKs con índice (verificado via `pg_indexes`)
- [ ] 265 migs archivadas en ZIP, ~12 consolidadas aplican correctamente
- [ ] `products.inventory_quantity` y `product_variants.inventory_quantity` eliminadas
- [ ] `supabase db reset` + seed.sql produce DB funcional con datos demo
- [ ] Convención documentada en `docs/database/MIGRATION_WORKFLOW.md`

## Rollback Plan

| Escenario                | Acción                                                    |
| ------------------------ | --------------------------------------------------------- |
| Fase individual falla    | Revertir migración de esa fase → no avanzar               |
| Consolidación incorrecta | `supabase migration repair` + re-aplicar ZIP histórico    |
| Split rompe consumidor   | Vistas backward-compat permiten revertir sin tocar código |
| Seed corrupto            | Es idempotente — `supabase db reset` + re-ejecutar        |
