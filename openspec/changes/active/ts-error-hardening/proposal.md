# Proposal: ts-error-hardening

## Intent
Eliminate 4,353 TS errors across 916 files to remove `ignoreBuildErrors: true` from `next.config.js`, enabling CI type-checking and catching real type issues at build time.

## Scope

**In**: 655 `as unknown` removal (Ph1), `createClientFromRequest<T>` generic fix (Ph2), IsAdminParams RPC typing (Ph3), validation middleware `validatedData: unknown` (Ph4), dynamic `.from(tableVariable)` typed table map (Ph5), remaining standalone fixes (Ph6), remove `ignoreBuildErrors` from `next.config.js`.

**Out**: No runtime behavior changes, no `tsconfig.json` strict mode changes, no `.js` → `.ts` migration, no Supabase schema changes.

## Capabilities

None — pure type-fix refactor. No spec-level behavior changes.

## Approach

6 phases in dependency order, delivered as stacked PRs (≤400 changed lines each).

| Phase | Fix | Errors | Files | Risk | PRs |
|-------|-----|--------|-------|------|-----|
| 1 | `as unknown` → `Tables<>['Row']` | ~1,800 | 180 | HIGH | 5 |
| 2 | `createClientFromRequest<T>` generic | ~53 | 2 | LOW | 1 |
| 3 | IsAdminParams RPC boundary cast | ~128 | 130 | LOW | 1 |
| 4 | Middleware `validatedData` → `Record<string, unknown>` | ~117 | 15 | LOW | 1 |
| 5 | Dynamic `.from()` typed table map helper | ~732 | 200 | MED | 2 |
| 6 | Standalone fixes + `ignoreBuildErrors` toggle | ~500 | 300 | LOW-MED | 2 |

### PR Slicing

| PR | Phase | Scope | Est. Lines |
|----|-------|-------|------------|
| 1 | 1 | `src/lib/api/services/*` — top 4 toxic files | ~350 |
| 2 | 1 | `src/lib/api/services/*` remaining | ~380 |
| 3 | 1 | `src/lib/ai/*` insights + chat helpers | ~300 |
| 4 | 1 | `src/components/admin/*` CreateQuoteForm, CashRegister | ~400 |
| 5 | 1 | `src/app/admin/*` + remaining `as unknown` | ~350 |
| 6 | 2 | `src/lib/supabase/server.ts` generic fix | ~10 |
| 7 | 3 | IsAdminParams RPC boundary cast | ~10 |
| 8 | 4 | `middleware.ts` + 10 consumer files | ~30 |
| 9 | 5 | API routes batch 1 (orders, work-orders) | ~200 |
| 10 | 5 | API routes batch 2 (remaining dynamic `from()`) | ~200 |
| 11 | 6 | Non-AI standalone fixes | ~300 |
| 12 | 6 | AI module + `next.config.js` toggle | ~200 |

All PRs stacked-to-main. PR 12 is the last — removes `ignoreBuildErrors`.

## Affected Areas

| Area | Impact | Detail |
|------|--------|--------|
| `src/lib/api/services/*` | Modified | `as unknown` → `Tables<>` |
| `src/lib/supabase/server.ts` | Modified | `createClientFromRequest<T>` generic |
| `src/lib/validation/middleware.ts` | Modified | `validatedData: unknown` → typed |
| `src/app/api/admin/*` | Modified | Dynamic `.from()` + standalone |
| `src/components/admin/*` | Modified | `as unknown` cascade downstream |
| `src/lib/ai/*` | Modified | LLM response `@ts-expect-error` |
| `next.config.js` | Modified | Remove `ignoreBuildErrors` (PR 12) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Type cascade introduces runtime regression | Medium | Stacked PRs per service area; `npm run test:run` after each |
| AI module LLM responses have genuinely dynamic shapes | Low | `@ts-expect-error // LLM response shape is dynamic` |
| Generated types drift mid-work | Low | Regenerate `supabase.generated.ts` before start |

## Rollback Plan

Per-PR revert — each PR merges independently via stacked-to-main. Full rollback: `git revert <merge-commit> &&` restore `ignoreBuildErrors: true` in `next.config.js`.

## Dependencies

- `supabase.generated.ts` regenerated before Phase 1
- Existing `type-infrastructure` spec outputs (typed `SupabaseClient<Database>` params)
- Supabase `Tables<>` utility type available from generated types

## Success Criteria

- [ ] `npx tsc --noEmit` exits with code 0
- [ ] `ignoreBuildErrors` removed from `next.config.js`
- [ ] `npm run test:run` passes
- [ ] No runtime regressions from type-only changes
