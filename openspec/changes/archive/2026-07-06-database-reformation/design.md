# Design: database-reformation

## Technical Approach

5 fases secuenciales, cada una con verificación doble: (1) `pg_dump --schema-only` diff pre/post = vacío para cambios no-estructurales; (2) `npm run test:run` = 0 failures.

**Principio rector**: migraciones idempotentes (`IF NOT EXISTS`), transaccionales (`BEGIN/COMMIT`), con rollback documentado. Cada fase produce 1 archivo de migración, excepto Fase 2 que produce 12.

**Live-DB corrections vs spec**:

| Métrica                             | Spec    | Live           | Acción                                    |
| ----------------------------------- | ------- | -------------- | ----------------------------------------- |
| FKs sin índice                      | 65      | 92             | Usar 92, verificar durante implementación |
| `inventory_quantity` refs en código | —       | 100+ en `src/` | **No DROP** → GENERATED column            |
| Duplicados                          | 2 pares | 4 archivos     | Confirmado: 2 pares de duplicados         |

---

## Architecture Decisions

### ADR-1: Verification via pg_dump diff (primary gate)

| Opción                       | Tradeoff                                                | Decisión                                                      |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| Solo test suite              | Tests pueden no cubrir schema completo                  | ❌ Rechazado                                                  |
| `pg_dump --schema-only` diff | No detecta cambios de datos, requiere snapshot pre/post | ✅ **Elegido** — gate primario, test suite es gate secundario |

**Rationale**: pg_dump diff garantiza equivalencia funcional del schema sin depender de cobertura de tests. El flujo exacto: (1) `pg_dump --schema-only > before.sql` (2) migración (3) `supabase db reset` (4) `pg_dump --schema-only > after.sql` (5) `diff before.sql after.sql`.

### ADR-2: GENERATED column para inventory_quantity (no DROP)

| Opción                                    | Tradeoff                                        | Decisión       |
| ----------------------------------------- | ----------------------------------------------- | -------------- |
| DROP column                               | Rompe 100+ referencias en código existente      | ❌ Rechazado   |
| DROP + refactor                           | Scope explosion, out of scope                   | ❌ Rechazado   |
| GENERATED ALWAYS AS (get_total_stock(id)) | Backward compat, stock real siempre actualizado | ✅ **Elegido** |

**Rationale**: El código depende de `products.inventory_quantity` para stock display, low-stock alerts, AI tools. La columna GENERATED materializada mantiene compatibilidad mientras la fuente de verdad migra a `product_branch_stock`. Crear función `get_product_total_stock(product_id UUID)` que suma `product_branch_stock.quantity`.

### ADR-3: No table splits for wide tables (Phase 3)

| Tabla             | Columnas | Split viable?                                          | Decisión                                                                                                                  |
| ----------------- | -------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `lab_work_orders` | 109      | Sí, agrupable en 4 sub-tablas                          | ❌ **No dividir** — no hay views existentes en el proyecto, INSTEAD OF triggers agregan complejidad sin beneficio medible |
| `orders`          | 90       | Sí (shipping, billing, POS, SII)                       | ❌ **No dividir** — mismas razones                                                                                        |
| `quotes`          | 84       | Bajo (columnas se leen juntas en flujo de presupuesto) | ❌ **No dividir** — peor relación costo/beneficio                                                                         |

**Rationale**: Ninguna tabla existente en el schema usa vistas backward-compat. Implementar el patrón desde cero para 3 tablas requiere ~300 líneas de triggers INSTEAD OF + testing. El beneficio (tablas más angostas) no justifica el riesgo de regresión. En su lugar, dejar `COMMENT ON TABLE` documentando la decisión y la agrupación lógica de columnas. Re-evaluar cuando haya un consumidor que necesite solo un subconjunto de columnas.

### ADR-4: Topological order of consolidation groups

El orden de los 12 grupos respeta dependencias FK entre dominios. Grupos 1-4 forman la base (sin dependencias externas). Grupos 5-12 dependen de grupos anteriores.

```
Grupo 1 (Core Schema) ──→ Grupo 2 (CRM) ──→ Grupo 5 (Multi-tenancy)
     │                                          │
     ├──→ Grupo 3 (Products)                    │
     │       └──→ Grupo 4 (Lenses)              │
     │                                          │
     └──────────────────────────────────────────┴──→ Grupo 6 (Quotes & WOs)
                                                         │
                                                    Grupo 7 (POS/Payments)
                                                         │
                                                    Grupo 8 (Appointments)
                                                         │
                                              ┌──────────┴──────────┐
                                         Grupo 9 (Comms)     Grupo 10 (Support)
                                                                     │
                                                            Grupo 11 (Agreements)
                                                                     │
                                                            Grupo 12 (AI/Demo)
```

**Grupo 5 (Multi-tenancy)** va DESPUÉS de CRM porque extiende tablas existentes con `organization_id`. **Grupo 6** (Quotes & WOs) necesita Grupos 2, 3, 4.

### ADR-5: Idempotence + transactional wrapping in consolidated migs

Cada grupo consolidado envuelve TODO en una transacción (`BEGIN; ... COMMIT;`). Cada DDL statement usa `IF NOT EXISTS` / `IF EXISTS`. Excepción: `CREATE INDEX CONCURRENTLY` en Phase 1 va fuera de transacción.

**Consecuencia**: Si un grupo falla a mitad de camino, toda la transacción revierte. Esto es intencional — no queremos medio-grupo aplicado.

---

## Per-Phase Design

### Phase 0 — Security Baseline (S-001, S-002)

**Migration file**: `supabase/migrations/20260701_security_baseline.sql`

**S-001 RLS for nurture\_\***:

- 4 tablas: `nurture_campaigns`, `nurture_campaign_emails`, `nurture_queue`, `nurture_log`
- Paso 1: `ALTER TABLE ... ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE`
- Paso 2: Backfill (no hay datos actuales, pero idempotente)
- Paso 3: `ALTER COLUMN organization_id SET NOT NULL`
- Paso 4: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- Políticas: `FOR ALL USING (get_user_organization_id() = organization_id OR is_super_admin(auth.uid()))`

```sql
-- Pattern for each nurture table
ALTER TABLE public.nurture_campaigns ADD COLUMN IF NOT EXISTS organization_id UUID;
-- (backfill if needed)
ALTER TABLE public.nurture_campaigns ALTER COLUMN organization_id SET NOT NULL;
-- Add FK
ALTER TABLE public.nurture_campaigns ADD CONSTRAINT nurture_campaigns_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- Enable RLS
ALTER TABLE public.nurture_campaigns ENABLE ROW LEVEL SECURITY;
-- Policies
CREATE POLICY "org_access_nurture_campaigns" ON public.nurture_campaigns
  FOR ALL USING (
    get_user_organization_id() = organization_id
    OR is_super_admin(auth.uid())
  );
```

**S-002 search_path on SECURITY DEFINERs**:

- 2 funciones: `handle_organization_delete`, `handle_organization_delete_fallback`
- Única diferencia: agregar `SET search_path = 'public'` en la definición
- Body idéntico (ya usa `auth.users` con schema qualification)
- `pg_get_functiondef()` para preservar body exacto

### Phase 1 — Performance — Indexes (S-003)

**Migration file**: `supabase/migrations/20260702_missing_fk_indexes.sql` (NOTA: sin CONCURRENTLY en archivo local, CONCURRENTLY en doc para prod)

- **92 FKs without index** (live count) — agrupar en 1 archivo
- Batches por tabla destino para legibilidad
- Convención: `idx_<tabla>_<columna>`

```sql
-- Snippet pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_users_created_by
  ON public.admin_users(created_by);
-- ... 91 más
```

### Phase 2 — Migration Consolidation (S-004)

**12 consolidation files**, una transacción por archivo:

| #   | File                                   | Content focus                                                                 |
| --- | -------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | `20260703_001_core_schema.sql`         | orgs, branches, profiles, admin_users, roles, helper functions, RLS base      |
| 2   | `20260703_002_crm_customers.sql`       | customers, prescriptions, customer_lens_purchases, RUT search                 |
| 3   | `20260703_003_products_inventory.sql`  | products (sin inventory_quantity), categories, product_branch_stock, variants |
| 4   | `20260703_004_lenses.sql`              | lens_families, price_matrices, contact_lenses, treatments, suppliers          |
| 5   | `20260703_005_multi_tenancy.sql`       | organization_settings, tier_change_audit, RLS extensions                      |
| 6   | `20260703_006_quotes_work_orders.sql`  | quotes, quote_settings, lab_work_orders, status history                       |
| 7   | `20260703_007_pos_payments.sql`        | orders, order_items, payments, POS sessions, credit notes                     |
| 8   | `20260703_008_appointments.sql`        | appointments, schedule_settings, availability functions                       |
| 9   | `20260703_009_communications.sql`      | notifications, email templates, WhatsApp tables                               |
| 10  | `20260703_010_support.sql`             | B2C/B2B support, optical internal tickets                                     |
| 11  | `20260703_011_agreements_fieldops.sql` | agreements, field ops, leads, surveys, referrals, workflows                   |
| 12  | `20260703_012_ai_telemetry_demo.sql`   | AI insights, embeddings, telemetry, demo functions                            |

**Archive**: 265 original files → `supabase/migrations/archive/202501-202607_original_265_migrations.zip`. Excluir del ZIP de vuelta: los 4 `remote_sync_placeholder.sql` se archivan pero NO se consolidan.

### Phase 3 — Schema Normalization (S-005)

**Migration file**: `supabase/migrations/20260704_normalize_inventory.sql`

- Crear función `get_product_total_stock(pid UUID) RETURNS INTEGER LANGUAGE SQL STABLE`
- `ALTER TABLE products ADD COLUMN inventory_quantity INTEGER GENERATED ALWAYS AS (get_product_total_stock(id)) STORED`
- Aplicar mismo patrón para `product_variants.inventory_quantity`
- `COMMENT ON COLUMN products.inventory_quantity IS 'Deprecated. GENERATED from product_branch_stock. Do not write directly.'`
- Las 3 tablas anchas reciben `COMMENT ON TABLE` documentando decisión de no dividir con agrupación lógica de columnas

### Phase 4 — Seed + Workflow (S-009, S-010)

**Seed**: `supabase/seed.sql` — bloque transaccional, UUIDs fijos, idempotente.

**Convention doc**: `docs/database/MIGRATION_CONVENTION.md` — template, naming, pre-merge checklist, comandos.

---

## Live-DB Discrepancies (Design-time verified)

| Item                           | Spec         | Live DB   | Design Impact                                                                                      |
| ------------------------------ | ------------ | --------- | -------------------------------------------------------------------------------------------------- |
| FKs sin índice                 | 65           | 92        | Tasks debe usar 92 + verificar si 27 adicionales son falsos positivos (composite indexes) o reales |
| `inventory_quantity` en código | asumido bajo | 100+ refs | **Crítico**: fuerza GENERATED column, no DROP                                                      |
| `get_product_total_stock`      | existente?   | NO existe | Crear función nueva                                                                                |
| nurture\_\*.organization_id    | necesita add | NO existe | ADD COLUMN necesario                                                                               |

---

## Testing Strategy

| Layer       | What                            | How                                                     |
| ----------- | ------------------------------- | ------------------------------------------------------- |
| Schema diff | Equivalencia pre/post cada fase | `pg_dump --schema-only` diff = 0 lines                  |
| Unit        | Suite existente                 | `npm run test:run` = 0 failures                         |
| Build       | Compilación                     | `npm run build` = 0 errors                              |
| Security    | Advisors                        | `supabase_get_advisors` clean en security + performance |

---

## Open Questions

- [ ] **FK count discrepancy**: Spec dice 65, live DB muestra 92. Tasks debe re-verificar con la query exacta del spec antes de generar la migración. Posible causa: el spec usó `pg_indexes` por coincidencia de nombre; live usa `pg_index.indkey` que es más preciso pero puede incluir FKs cubiertas por composite indexes.
- [ ] **Nurture tables + organization_id**: ¿hay algún código frontend que cree nurture campaigns y deba actualizarse para incluir organization_id? (scope de implementación, no de diseño)
