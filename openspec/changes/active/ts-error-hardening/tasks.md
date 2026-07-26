# Tasks: ts-error-hardening

## Review Workload Forecast

| Field                   | Value           |
| ----------------------- | --------------- |
| Estimated changed lines | ~2,450          |
| 400-line budget risk    | Medium          |
| Chained PRs recommended | Yes             |
| Suggested split         | 12 stacked PRs  |
| Delivery strategy       | auto-chain      |
| Chain strategy          | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Dependency Graph

```
PR1 (generic) ─┬─ PR3 (services) ── PR4 (api/remaining) ── PR6 (components) ── PR7 (app/admin)
               ├─ PR5 (ai) ───────────────────────────────────────────────── PR11 (ai-standalone)
PR2 (middleware) ────────────────────────────────────────── PR8 (api-dynamic) ── PR9 (api-dynamic-2)
PR10 (non-ai standalone) ──────────────────────────────────────────────────────── PR12 (toggle)
```

PR1 and PR2 are independent of each other. PR10 is independent of all. PR12 depends on ALL.

---

### PR 1 (Phase 2): Fix `createClient<T>` generic

**Files**: `src/lib/supabase/server.ts`, `src/lib/supabase/service-role.ts`

- **server.ts**: Thread `<T>` through `createClient()`: change `return createServerClient<Database>(...)` to `return createServerClient<T>(...)`. In `createClientFromRequest`, change `createSupabaseClient<Database>(...)` to `createSupabaseClient<T>(...)` and `createClient()` to `createClient<T>()`.
- **service-role.ts**: Re-export only — no change needed (server.ts change propagates).
- **Verify**: `npx tsc --noEmit` — 53 errors from missing generic should vanish.
- **Rollback**: `git revert HEAD`
- **Est. lines**: ~10

---

### PR 2 (Phase 4): Fix `validatedData: unknown`

**Files**: `src/lib/validation/middleware.ts`

- Line 258: `const validatedData: unknown = {}` → `const validatedData: Record<string, unknown> = {}`
- **Verify**: `npx tsc --noEmit` — TS18046 from `validatedData.*` property access should drop.
- **Rollback**: `git revert HEAD`
- **Est. lines**: ~3

---

### PR 3 (Phase 1): Services batch 1 — top 4 toxic files

**Files**: `src/lib/api/services/adminQuoteService.ts`, `adminOrderService.ts`, `adminProductService.ts`, `adminAppointmentService.ts`

- Replace every `as unknown` on `.from()` query results with typed destructure: `as { data: Tables<'table_name'>['Row'] | null }` for `.single()`, `as { data: Tables<'table_name'>['Row'][] | null }` for multi-row. Replace `p as unknown` downstream casts once upstream is typed. For RPC calls, remove `as unknown` (generated types handle it).
- Only services/ dir — 4 files, ~100 `as unknown` removals.
- `supabase-rpc.ts` `IsAdminParams` fallback types: no change needed per design (keep as fallback).
- **Verify**: `npx tsc --noEmit` — TS18046 count drops by ~400. `npm run test:run` passes.
- **Rollback**: `git revert HEAD`
- **Est. lines**: ~350

---

### PR 4 (Phase 1): Services remaining + branch-middleware type boundary

**Files**: All remaining `src/lib/api/services/*.ts` (19 files) + `src/lib/api/branch-middleware.ts`

- **Services**: Same `as unknown` pattern as PR 3 — remove all casts on `.from()` and `.rpc()` results, replace with `Tables<>` types.
- **branch-middleware.ts**: `addBranchFilter(query: unknown` → `query: any`, `addBranchFilterForBranchScopedTable(query: unknown` → `query: any`, `SupabaseClient<unknown>` → `SupabaseClient<any>`. The `any` is intentional — Postgrest type chain is not worth threading through polymorphic utilities.
- **Verify**: `npx tsc --noEmit`. `npm run test:run` passes.
- **Rollback**: `git revert HEAD`
- **Est. lines**: ~380

---

### PR 5 (Phase 1): AI module — tools + insights

**Files**: `src/lib/ai/tools/**/*.ts` (all tool files), `src/lib/ai/agent/**/*.ts`, `src/lib/ai/embeddings/**/*.ts`, `src/lib/ai/providers/**/*.ts`, `src/lib/ai/utils/*.ts`, `src/lib/ai/*.ts`

- Same `as unknown` removal pattern on Supabase calls. For LLM response data with genuinely dynamic shapes, add `@ts-expect-error // LLM response shape is dynamic` instead of `as unknown`.
- **Verify**: `npx tsc --noEmit`. `npm run test:run` passes.
- **Rollback**: `git revert HEAD`
- **Est. lines**: ~300

---

### PR 6 (Phase 1): Components/admin

**Files**: `src/components/admin/**/*.ts`, `src/components/admin/**/*.tsx`

- Remove `as unknown` on Supabase query results in components. Replace with `Tables<>` types. Remove downstream `item as unknown` that cascaded from now-typed queries.
- Target: CreateQuoteForm, CashRegister, and other admin components with `as unknown` patterns.
- **Verify**: `npx tsc --noEmit`. `npm run test:run` passes.
- **Rollback**: `git revert HEAD`
- **Est. lines**: ~400 (tight — split into 6a/6b if needed)

---

### PR 7 (Phase 1): App/admin routes + remaining scattered

**Files**: `src/app/admin/**/*.ts`, `src/app/api/**/*.ts` (non-dynamic `.from()` calls), any remaining files with `as unknown` not covered by PRs 3-6.

- Remove `as unknown` on all hardcoded `supabase.from("table_literal")` calls. The typed client already handles these — casts were destroying inference.
- **Verify**: `npx tsc --noEmit`. `npm run test:run` passes.
- **Rollback**: `git revert HEAD`
- **Est. lines**: ~350

---

### PR 8 (Phase 5): API routes batch 1 — dynamic `from()` + helper ✅

**Files**: `src/types/supabase-helpers.ts` (add helper), `src/app/api/admin/orders/**/*.ts`, `src/app/api/admin/work-orders/**/*.ts`, other API routes with dynamic table variables.

- ✅ **Add `fromTable()` helper** to `src/types/supabase-helpers.ts`:
  ```ts
  type TableName = keyof Database["public"]["Tables"];
  export function fromTable<T extends TableName>(
    supabase: SupabaseClient<Database>,
    table: T,
  ) {
    return supabase.from(table);
  }
  ```
- ✅ Replace `supabase.from(tableVariable)` with `fromTable(supabase, tableVariable)` — fixed in `src/lib/notifications/_helpers/create-notification.ts` (dynamic `mapping.table`). Removed 1 TS2769 error.
- ✅ No dynamic `from(variable)` calls remain in `src/app/api/admin/` (cleaned by PR 7).
- ✅ `backup-service.ts` left as-is: dynamic table iteration over 40+ tables makes `fromTable` inapplicable (TS2589).
- **Branch**: `fix/thread-supabase-generic-pr8`
- **Verify**: `npx tsc --noEmit` — `supabase-helpers.ts` compiles clean. 1 error removed in `create-notification.ts`. `npm run test:run` — 42/48 pass (pre-existing failures: DB/Redis unavailable).
- **Est. lines**: ~16

---

### PR 9 (Phase 5): API routes batch 2 + lib/\* remaining

**Files**: Remaining `src/app/api/**/*.ts` with dynamic `.from()`, `src/lib/backup-service.ts`, `src/lib/notifications/_helpers/create-notification.ts`, other `src/lib/*.ts` files.

- Use `fromTable()` helper for dynamic table names in backup-service and notification helper. Remove `as unknown` from remaining hardcoded table name calls.
- **Verify**: `npx tsc --noEmit`. `npm run test:run` passes.
- **Rollback**: `git revert HEAD`
- **Est. lines**: ~200

---

### PR 10 (Phase 6): Non-AI standalone fixes

**Files**: Scattered — catch blocks, iteration callbacks across `src/` excluding `src/lib/ai/`.

- Add `instanceof Error` guards where `catch (error: unknown)` accesses `error` directly without narrowing (target: ~39 occurrences). Add explicit callback param types for `.map()`, `.filter()`, `.forEach()` where param is implicitly `unknown`.
- **Verify**: `npx tsc --noEmit`. `npm run test:run` passes.
- **Rollback**: `git revert HEAD`
- **Est. lines**: ~300

---

### PR 11 (Phase 6): AI module standalone + `@ts-expect-error` markers

**Files**: `src/lib/ai/**/*.ts` — LLM response handling, streaming, provider interfaces.

- Add `@ts-expect-error // LLM response shape is dynamic` where AI library returns genuinely unpredictable types. Add `instanceof Error` guards in AI-specific catch blocks. Fix iteration callbacks in AI tools.
- **Verify**: `npx tsc --noEmit`. `npm run test:run` passes.
- **Rollback**: `git revert HEAD`
- **Est. lines**: ~200

---

### PR 12 (Phase 6): Remove `ignoreBuildErrors` + final validation

**Files**: `next.config.js`

- Change `typescript: { ignoreBuildErrors: true }` → `typescript: { ignoreBuildErrors: false }` (line 12).
- **Pre-condition**: `npx tsc --noEmit` exits 0 before this change.
- **Verify**: `npx tsc --noEmit` exits 0. `npm run test:run` passes. CI type-checking is now active.
- **Rollback**: `git revert HEAD &&` restore `ignoreBuildErrors: true`.
- **Est. lines**: ~1
