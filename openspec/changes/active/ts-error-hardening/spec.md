# Spec: ts-error-hardening — TypeScript Error Elimination

## Context

4,353 TS errors across 916 files block `tsc --noEmit` from passing. `next.config.js` has `typescript: { ignoreBuildErrors: true }`. This is a zero-runtime-behavior refactor: replace `as unknown`, fix generic propagation, type RPC boundaries, fix validation middleware types, add dynamic `.from()` table map, and fix standalone errors.

Depends on `openspec/specs/type-infrastructure/spec.md` (typed client factories already done — fixes ~1,691 TS18046). This spec eliminates the remainder.

## Global Constraints

| Constraint | Value |
|---|---|
| Runtime changes | Zero — type-only |
| `tsconfig.json` strict | Unchanged |
| Tests | `npm run test:run` MUST pass after each PR |
| PR size | ≤400 changed lines each |
| Verification | `npx tsc --noEmit` MUST exit 0 after Phase 6 |

---

## Phase 1 — Remove `as unknown` superset casts

### ADDED Requirement: P1.1 — Direct cast to Tables<>

Every `as unknown` suffix on a Supabase `.from()` query result MUST be replaced with `as unknown as Tables<'TableName'>['Row']` or a destructured equivalent using proper generated types. `as any` is FORBIDDEN.

#### Scenario: Single row query
- GIVEN `const { data } = await supabase.from("quotes").select("*").single() as unknown`
- WHEN replaced
- THEN it MUST become `as { data: Tables<'quotes'>['Row'] | null }` (destructured) or the full expression MUST use `Tables<'quotes'>['Row']`

#### Scenario: Multi-row query
- GIVEN `const { data: customers } = await supabase.from("customers").select("*") as unknown`
- WHEN replaced
- THEN it MUST become `as { data: Tables<'customers'>['Row'][] | null }`

#### Scenario: Insert/update return (non-Row shape)
- GIVEN supabase `.insert(...).select().single() as unknown`
- WHEN the returned shape differs from Row (e.g. insert with `select(*)`)
- THEN MUST use `Tables<'table_name'>['Insert']` or the exact returned shape if Row does not match

### ADDED Requirement: P1.2 — Downstream product casts

After P1.1, any remaining `p as unknown` or `item as unknown` pattern that follows from previously-typed query results MUST be removed — the upstream type is now concrete.

#### Scenario: Product variable cast
- GIVEN `const p = product as unknown` (on a now-typed `product`)
- WHEN upstream source is now `Tables<'products'>['Row']`
- THEN `as unknown` MUST be removed, unused type assertions MUST be eliminated

### Verification: `npx tsc --noEmit` TS18046 count MUST drop by ~1,800

---

## Phase 2 — Fix `createClientFromRequest<T>` generic propagation

### ADDED Requirement: P2.1 — Generic flows through callers

`createClientFromRequest<T = Database>` in `src/lib/supabase/server.ts` already accepts a generic. ~53 callers pass no generic, defaulting to `Database`. All callers MUST pass `<Database>` explicitly if the default is not resolving at the call site.

#### Scenario: Caller with implicit Database default
- GIVEN `const { client } = await createClientFromRequest(request)`
- WHEN `client` property access shows TS18046
- THEN call MUST become `createClientFromRequest<Database>(request)`

### Verification: Zero TS18046 from `createClientFromRequest` calls

---

## Phase 3 — IsAdminParams RPC boundary typing

### ADDED Requirement: P3.1 — RPC calls use typed generics

Every `supabase.rpc("is_admin", ...)` call MUST replace `as unknown` casts with proper typing using `RPCResult` / `RPCParams` from `src/types/supabase-rpc.ts`.

#### Scenario: is_admin with explicit type
- GIVEN `const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id } as unknown)`
- WHEN fixed
- THEN the call MUST be `await supabase.rpc("is_admin", { user_id: user.id } satisfies IsAdminParams)` and result typed with `as { data: IsAdminResult }`

#### Scenario: is_super_admin, is_root_user, is_employee
- GIVEN any of the RPC functions defined in `RPCFunctionMap`
- WHEN fixed
- THEN MUST use corresponding `*Params` / `*Result` types from `src/types/supabase-rpc.ts`

### Verification: Zero TS errors from RPC calls

---

## Phase 4 — Validation middleware `validatedData: unknown`

### ADDED Requirement: P4.1 — `withValidation` handler preserves Zod-inferred types

`const validatedData: unknown = {}` in `src/lib/validation/middleware.ts` line 258 MUST be typed as `Record<string, unknown>` with `validatedData.body`, `validatedData.query`, and `validatedData.path` properties carrying the Zod-inferred types.

#### Scenario: Body validation access
- GIVEN `withValidation({ body: z.object({ email: z.string() }) }, (validatedData) => ...)`
- WHEN `validatedData.body` is accessed
- THEN its type MUST be `z.infer<typeof schema>` (not `unknown`)

### Verification: Zero TS18046 from `validatedData.*` property access

---

## Phase 5 — Dynamic `.from(tableVariable)` typed table map

### ADDED Requirement: P5.1 — Table name to type mapping helper

A type-safe helper MUST exist that maps runtime table name strings to their `Tables<>` types, eliminating TS2339 from dynamic `supabase.from(tableVariable)` calls.

#### Scenario: Dynamic table access
- GIVEN `const tableName = "products"` (a variable, not a literal)
- WHEN calling `supabase.from(tableName).select("*")`
- THEN the result MUST have typed `.data` matching `Tables<'products'>['Row']`

#### Scenario: Multiple tables in same route
- GIVEN a route using both `"orders"` and `"work_orders"` as dynamic table names
- WHEN both are used via the helper
- THEN each MUST resolve to its correct `Tables<>` type independently

### Verification: Zero TS2339 errors from dynamic `.from()` calls

---

## Phase 6 — Standalone fixes + final toggle

### ADDED Requirement: P6.1 — Catch block error narrowing

Every `catch (error) { error instanceof Error }` block that triggers TS2571 MUST be narrowed properly.

#### Scenario: Typed catch
- GIVEN `catch (error: unknown) { if (error instanceof Error) { error.message } }`
- WHEN `error` has no explicit annotation
- THEN `catch (error: unknown)` MUST be used or the `instanceof` guard MUST be present

### ADDED Requirement: P6.2 — Iteration callback annotations

Missing type annotations on `.map()`, `.filter()`, `.forEach()` callbacks where the callback parameter is implicitly `unknown` MUST be annotated.

### ADDED Requirement: P6.3 — `ignoreBuildErrors` removal

After all phases pass `npx tsc --noEmit` with exit code 0, `next.config.js` line 12 MUST change `typescript: { ignoreBuildErrors: true }` to `typescript: { ignoreBuildErrors: false }`.

#### Scenario: Last PR toggle
- GIVEN all previous phases merged and `tsc --noEmit` passes
- WHEN PR 12 changes `next.config.js`
- THEN `ignoreBuildErrors` MUST be `false`

---

## PR Slicing (from proposal)

| PR | Phase | Scope | Files | Lines |
|----|-------|-------|-------|-------|
| 1 | 1 | `src/lib/api/services/*` top 4 | ~25 | 350 |
| 2 | 1 | `src/lib/api/services/*` remaining | ~35 | 380 |
| 3 | 1 | `src/lib/ai/*` insights + chat | ~40 | 300 |
| 4 | 1 | `src/components/admin/*` | ~30 | 400 |
| 5 | 1 | `src/app/admin/*` + remaining | ~50 | 350 |
| 6 | 2 | `src/lib/supabase/server.ts` | 2 | 10 |
| 7 | 3 | IsAdminParams RPC boundary | ~130 | 10 |
| 8 | 4 | `middleware.ts` + consumers | ~15 | 30 |
| 9 | 5 | API routes batch 1 | ~50 | 200 |
| 10 | 5 | API routes batch 2 | ~50 | 200 |
| 11 | 6 | Non-AI standalone | ~200 | 300 |
| 12 | 6 | AI module + `next.config.js` | ~100 | 200 |

## Rollback

Per-PR revert via stacked-to-main. Full rollback: `git revert <merge-commit> &&` restore `ignoreBuildErrors: true` in `next.config.js`.
