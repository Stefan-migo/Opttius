# Exploration: Fase 3 — Data & Performance (4 items)

**Date**: 2026-07-01
**Author**: sdd-explore sub-agent
**Status**: Complete

---

## 1. fix-rls-org-scope-wave-1

### Current State

**Prior work already done:**

- `database-multitenancy-gaps` proposal → completed via migration `20260701000009_fix_order_items_payments_org_id.sql` — added `organization_id` + org-scoped RLS to `order_items` and `order_payments`
- `fix-payment-gateways-config-rls` → completed via migration `20260701000012_fix_payment_gateways_config_rls.sql` — replaced `USING(true)` SELECT policy on `payment_gateways_config` with org-scoped RLS

**Remaining gaps identified in consolidated schema (`20260701000000_schema_complete.sql`):**

- Several tables use `EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())` which checks "is any admin" WITHOUT org scoping:
  - `product_option_fields` — delete/insert/update/select all use org-blind EXISTS
  - `product_option_values` — delete/insert/update/select all use org-blind EXISTS
  - `customer_lens_purchases` — delete/insert/update/select all use org-blind EXISTS
  - `agreement_customers` — SELECT uses org-blind `EXISTS`
  - `agreement_institutional_invoice_balances` — INSERT/SELECT use org-blind `EXISTS`
  - `agreement_institutional_invoices` — INSERT/SELECT use org-blind `EXISTS`
  - `notification_settings` — UPDATE uses org-blind `EXISTS`
  - `system_maintenance_log` — all operations use org-blind `EXISTS`
  - `system_health_metrics` — all operations use org-blind `EXISTS`

**Verified no `USING(true)` policies remain for business tables** — all `USING(true)` findings are either:

- Service-role policies (legitimate)
- `Public can view subscription tiers for landing` (intentional public)
- The old `payment_gateways_config` policy (already fixed in migration 12)

### Affected Files

- `supabase/migrations/20260701000000_schema_complete.sql` — base schema (needs new migration to patch)
- New migration file needed: `YYMMDDHHMMSS_fix_rls_org_scope_wave_1.sql`

### Effort Estimate

| Sub-item                           | Tables    | Effort                     |
| ---------------------------------- | --------- | -------------------------- |
| RLS audit & identify all 6 tables  | N/A       | S (already partially done) |
| Add organization_id + new policies | ~6 tables | M                          |
| Test RLS policies with assertions  | N/A       | S                          |
| **Total**                          |           | **M**                      |

### Risks and Dependencies

| Risk                                     | Level  | Notes                                                                                             |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Merge conflicts with existing migrations | Low    | Only new migration file, no edits to existing ones                                                |
| Breaking existing app queries            | Medium | Some tables used by application code — needs superset testing (new RLS should be superset of old) |
| Backfill NOT NULL constraint unsafe      | Low    | Requires verifying referential integrity first                                                    |

**Dependencies:** None on other Fase 3 items
**Blocking others:** No

---

## 2. dashboard-api-optimization

### Current State

**Dashboard API** (`src/app/api/admin/dashboard/route.ts` — 756 lines):

- Fetches ALL raw data (no pagination except appointments limit 10) from 5+ tables via `Promise.all`
- Does ALL aggregation IN-MEMORY: status distributions, revenue calculations, trend bucketing (36-day loop), top products, etc.
- No caching whatsoever (only analytics API uses `unstable_cache`)
- Revenue trend computed by iterating daily buckets and in-memory filtering — O(n²) behavior for 365-day periods

**Analytics API** (`src/app/api/admin/analytics/dashboard/route.ts` — 996 lines):

- Similar pattern: bulk fetch + in-memory aggregation
- Uses `unstable_cache` at route level (not granular materialized views)
- More complex: handles support metrics, payment methods, category revenue

**Dashboard page** (`AdminDashboardContent.tsx` — 373 lines):

- Uses `useState` + `useEffect` + `fetch` — no React Query
- Manual loading/error/refreshing state management
- Refetches on branch or period change with `useEffect` dependency

**No materialized views exist** in the entire database.

### Affected Files

- `src/app/api/admin/dashboard/route.ts` — rewrite with materialized views
- `src/app/api/admin/analytics/dashboard/route.ts` — rewrite with materialized views
- `src/lib/analytics/analytics-service.ts` — potential new materialized view queries
- `supabase/migrations/` — new migration for materialized views
- `src/app/admin/_components/AdminDashboardContent.tsx` — could benefit but not required

### Effort Estimate

| Sub-item                                                         | Effort |
| ---------------------------------------------------------------- | ------ |
| Create materialized views (daily KPI aggregates, revenue trends) | M      |
| Rewrite dashboard API to query views + paginate                  | M      |
| Rewrite analytics API to query views + paginate                  | L      |
| Add refresh strategy (cron job or triggers)                      | S      |
| **Total**                                                        | **L**  |

### Risks and Dependencies

| Risk                        | Level  | Notes                                                                          |
| --------------------------- | ------ | ------------------------------------------------------------------------------ |
| Materialized view staleness | Medium | Need refresh strategy — cron job or `REFRESH MATERIALIZED VIEW CONCURRENTLY`   |
| Design complexity           | Medium | Must decide which aggregations are worth materializing vs. computed on the fly |
| Cache invalidation          | Low    | Analytics data is inherently time-bucketed — daily refresh is natural          |

**Dependencies:** None on other Fase 3 items
**Blocking others:** No

---

## 3. react-query-migration

### Current State

**Already in place:**

- `@tanstack/react-query` v5.90.19 is installed with `@tanstack/react-query-devtools`
- `QueryProvider` wraps the app in `src/layout.tsx` with 1-min staleTime
- Used extensively in: Products (useProducts, useCategories, useProductStats), System (useSystemConfig, useSystemHealth, useBackups, useSurveyConfig, useSurveyResponses)

**NOT using React Query (targets):**

- **AdminDashboardContent.tsx** — `useState` + `useEffect` + `fetch('/api/admin/dashboard')`
- **AnalyticsContent.tsx** (1208 lines) — `useState` + `useEffect` + `fetch('/api/admin/analytics/dashboard')`
- **AppointmentsContent.tsx** (1232 lines) — `useState` + `useEffect` + Supabase queries
- **WorkOrdersContent.tsx** (746 lines) — `useState` + `useEffect` + fetch
- **CustomersContent.tsx** (581 lines) — `useState` + `useEffect` + fetch

The recommended 3 content components for migration:

1. **AdminDashboardContent** — most visible page, high refetch frequency on branch/period change
2. **AnalyticsContent** — heavy data dependency, benefits from caching/background refetch
3. **AppointmentsContent** — moderate complexity, good middle-ground

### Affected Files

- `src/app/admin/_components/AdminDashboardContent.tsx` — migrate to useQuery
- `src/app/admin/analytics/_components/AnalyticsContent.tsx` — migrate to useQuery
- `src/app/admin/appointments/_components/AppointmentsContent.tsx` — migrate to useQuery
- New hooks: `src/app/admin/hooks/useDashboard.ts`, `useAnalytics.ts`, `useAppointments.ts`

### Effort Estimate

| Sub-item                                                               | Effort |
| ---------------------------------------------------------------------- | ------ |
| Create shared data hooks (useDashboard, useAnalytics, useAppointments) | M      |
| Migrate AdminDashboardContent to React Query                           | S      |
| Migrate AnalyticsContent to React Query                                | M      |
| Migrate AppointmentsContent to React Query                             | M      |
| **Total**                                                              | **M**  |

### Risks and Dependencies

| Risk                        | Level | Notes                                                  |
| --------------------------- | ----- | ------------------------------------------------------ |
| Breaking existing data flow | Low   | Pattern well-established in products/system modules    |
| Overfetching on mount       | Low   | staleTime: 60s prevents unnecessary refetches          |
| Cache key collisions        | Low   | Simple key naming convention follows existing patterns |

**Dependencies:** None on other Fase 3 items
**Blocking others:** No — but note: could be done AFTER or IN PARALLEL with item 4 (split-monolithic), since extracting hooks first actually simplifies the splitting later.

---

## 4. split-monolithic-content-components

### Current State

**Largest content components (all "use client"):**

| File                                | Lines | Current Pattern                                     |
| ----------------------------------- | ----- | --------------------------------------------------- |
| `SystemAdminContent.tsx`            | 1396  | Client component with all rendering + data fetching |
| `WorkOrderDetailContent.tsx`        | 1257  | Same pattern                                        |
| `AppointmentsContent.tsx`           | 1232  | Same pattern                                        |
| `AnalyticsContent.tsx`              | 1208  | Same pattern — uses `useEffect` + `fetch` directly  |
| `UsersManagementContent.tsx`        | 1039  | Same pattern                                        |
| `OpticalInternalSupportContent.tsx` | 1035  | Same pattern                                        |
| `LensMatricesContent.tsx`           | 1006  | Same pattern                                        |

All are client components (`"use client"`) that could be split into:

- **Server shell**: Layout, auth check, meta tags (can be async server component)
- **Client island**: Interactive data-fetching + rendering (lazy loaded)

The recommended 3 candidates for phase 1:

1. **AnalyticsContent** — 1208 lines, pure data display with chart components
2. **AppointmentsContent** — 1232 lines, has complex calendar + table UI
3. **WorkOrderDetailContent** — 1257 lines, complex detail view with multiple sections

### Affected Files

- `src/app/admin/analytics/page.tsx` + `_components/AnalyticsContent.tsx` — split into server shell + client island
- `src/app/admin/appointments/page.tsx` + `_components/AppointmentsContent.tsx` — split
- `src/app/admin/work-orders/[id]/page.tsx` + `_components/WorkOrderDetailContent.tsx` — split
- New: `.server.tsx` wrapping components

### Effort Estimate

| Sub-item                                                         | Effort |
| ---------------------------------------------------------------- | ------ |
| Split AnalyticsContent (server shell + client data island)       | M      |
| Split AppointmentsContent (server shell + client data island)    | M      |
| Split WorkOrderDetailContent (server shell + client data island) | M      |
| **Total**                                                        | **M**  |

### Risks and Dependencies

| Risk                                          | Level   | Notes                                                                           |
| --------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| Moving "use client" boundary too aggressively | Low-Mid | Some components use hooks deep in render tree — need careful boundary placement |
| Performance regression                        | Low     | Client islands may increase JS payload if not properly code-split               |
| Lost interactivity                            | Low     | Server components can't use hooks — must clear separation                       |

**Dependencies:** None on other Fase 3 items
**Relation to item 3:** These items are COMPLEMENTARY, not conflicting. If you do React Query migration first, the splitting is easier (hooks extracted). If you split first, the React Query migration is easier (smaller components to touch). **Recommending order: 3 first, then 4.**

---

## Priority Recommendation

### Order

```
1. fix-rls-org-scope-wave-1       ← URGENT (security: multi-tenant data isolation)
2. react-query-migration           ← MEDIUM (UX + dev ergonomics)
3. split-monolithic-content-components  ← MEDIUM (code health + performance)
4. dashboard-api-optimization      ← LOWER (performance, not security)
```

### Why This Order

1. **RLS first**: Multi-tenant data leaks are the highest business risk. Even though 3 of 6 target tables are already fixed, the remaining ~6 tables with org-blind `EXISTS` patterns are a real vulnerability. Any admin from Org A could potentially read data from Org B if they guess table names. This is a security gap.

2. **React Query second**: It's the lowest-risk migration (existing patterns already proven), it has the quickest visible UX win (loading states, caching, background refetch), and it naturally decomposes components which feeds item 4. Do this WHILE the RLS migration is being reviewed/deployed.

3. **Split monolithic third**: Now that hooks are extracted from React Query migration, the splitting is mechanical. Each 1000+ line component gets a clear server/client boundary. This is pure code health with no security impact.

4. **Dashboard API last**: Materialized views + pagination is the highest complexity and highest risk item. It requires schema changes, a refresh strategy, and careful benchmark validation. It also has the LEAST business urgency — the current dashboard works, it's just slow for large datasets. Let the other items land first.

### Can They be Parallelized?

| Pair  | Can parallelize?    | Notes                                                                                                   |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| 1 + 2 | **YES**             | Completely independent — DB migration vs. frontend hooks                                                |
| 1 + 3 | **YES**             | Completely independent                                                                                  |
| 1 + 4 | **YES**             | Both DB changes but different files — careful with migration ordering                                   |
| 2 + 3 | **NO (sequential)** | Do 3 first (extract hooks) to make 4 easier, or do 4 first then 3 — either order works but not parallel |
| 2 + 4 | **YES**             | Independent concerns                                                                                    |
| 3 + 4 | **NO (sequential)** | They touch the same components                                                                          |

### Can Any Be Split Into Smaller Sub-Items?

- **fix-rls-org-scope-wave-1**: Split by table — 3 sub-items (one per ~2 tables each). Each is ~10 lines of SQL. Safe to do as one PR.
- **react-query-migration**: Split by component — 3 sub-items (AdminDashboard, Analytics, Appointments). Each is independent. **Recommended: 3 separate PRs.**
- **split-monolithic**: Split by component — 3 sub-items. Each is independent. **Recommended: 3 separate PRs.**
- **dashboard-api-optimization**: Split into (a) create materialized views migration, (b) rewrite dashboard API, (c) rewrite analytics API. Parts (b) and (c) can be parallelized.

### Start With

**fix-rls-org-scope-wave-1** — but re-scoped to just the remaining tables that need organization-level isolation. The original 6-table estimate was written before `order_items`, `order_payments`, and `payment_gateways_config` were fixed. We should:

1. Run a comprehensive RLS audit on all 98 tables
2. Build a precise list of $n$ remaining tables (likely 4-6)
3. Fix them all in one wave-1 migration

Then immediately parallel into **react-query-migration** for DashboardContent (the highest-traffic page).

---

## Return Envelope

**Status**: success
**Summary**: Explored all 4 Fase 3 items. RLS gaps partially fixed already but ~4-6 tables remain. React Query infrastructure ready but 3 major content components still use raw useState/useEffect. 7 files over 1,000 lines identified for splitting. Dashboard API does all computation in-memory with no materialized views.
**Artifacts**: `openspec/changes/explore/fase-3-items.md` | `Engram sdd/explore/fase-3-items`
**Next**: sdd-propose for the selected item (recommended: `fix-rls-org-scope-wave-1`)
**Risks**: None identified that block proceeding
**Skill Resolution**: paths-injected — 7 skills (sdd-phase-common, sdd-explore, database-optical-supabase, supabase-auth, dashboard-optical-supabase, analytics-optical-supabase, frontend-design-modern)
