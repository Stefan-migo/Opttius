# Proposal: Phase 6.2 — TypeScript Error Resolution

## Intent

3,217 TS errors with `tsc --noEmit` across 336 files. Not 3,217 bugs — ~10 propagating type patterns inflating noise. This blocks CI type-checking, slows onboarding, and hides real type issues.

## Scope

### In Scope

- Fix all TS errors to reach `tsc --noEmit` = 0
- Fix by pattern, not by file — 6 categories (supabase:unknown, body:unknown, useState\<T>, query destructuring, JSON.parse, type mismatches)
- Batch strategy: Batch 1 (top-10 files), Batch 2-5 (remaining patterns)
- AI module included except where LLM response types require deeper analysis

### Out of Scope

- No runtime behavior changes — type-only fixes
- No migration of `.js` files to `.ts`
- No strict-mode config changes beyond current `tsconfig.json`

## Capabilities

### New Capabilities

None — pure type-fix refactor. No spec-level behavior changes.

### Modified Capabilities

None — no requirements are changing.

## Approach

Fix by propagating pattern, not by file:

1. **supabase: unknown** (~500): tipar parámetro como `SupabaseClient<Database>` en admin services
2. **body: unknown** (~300): tipar request bodies con interfaces/zod
3. **useState() sin tipo** (~500): agregar `useState<T>()`
4. **Supabase query destructuring** (~900): `supabase.from<"table">(...)` explícito
5. **JSON.parse sin `as`** (~400): agregar `as Type`
6. **Type mismatches reales** (~600): fixes puntuales

Batches run in descending order of impact. Each batch is independent and reversible.

## Affected Areas

| Area               | Impact   | Description                                            |
| ------------------ | -------- | ------------------------------------------------------ |
| `src/admin/*`      | Modified | ~500 errors: supabase param, body, query destructuring |
| `src/app/*`        | Modified | ~400 errors: useState, useState, props sin tipo        |
| `src/services/*`   | Modified | ~300 errors: query destructuring sin tipo              |
| `src/components/*` | Modified | ~300 errors: props unknown, JSON.parse                 |
| `src/ai/*`         | Modified | ~200 errors: LLM response types (higher risk)          |
| `src/lib/*`        | Modified | ~200 errors: utility functions mal tipadas             |

## Risks

| Risk                                                  | Likelihood | Mitigation                                               |
| ----------------------------------------------------- | ---------- | -------------------------------------------------------- |
| AI module LLM responses have genuinely dynamic shapes | Medium     | Batch 5 reserved — manually review each AI file          |
| Cascade: fixing one file breaks another               | Low        | Fix by pattern reduces cascade; CI per batch             |
| Overly permissive types hide real bugs                | Low        | Prefer precise types; `any` only as explicit last resort |

## Rollback Plan

Per-batch revert: each batch is a self-contained commit. Revert individual batch commit if it introduces regressions. Full rollback = `git revert <merge-commit>`.

## Dependencies

None. Pure type-fix refactor. No schema changes, no new packages.

## Success Criteria

- [ ] `npx tsc --noEmit` produces 0 errors
- [ ] Existing tests pass (`npm run test:run`)
- [ ] No new runtime regressions from type-only changes
