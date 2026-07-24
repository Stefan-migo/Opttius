# Spec: Phase 5 — Remaining Items (Type Safety & Code Quality)

> **Type**: Refactor — pure structural changes. Zero behavioral impact.
> **Proposal**: `openspec/changes/phase-5-remaining/proposal.md`

## Invariants (what MUST NOT change)

| Invariant                                                      | Scope     | Violation would look like                                                 |
| -------------------------------------------------------------- | --------- | ------------------------------------------------------------------------- |
| Public API of `src/lib/supabase/*` exports                     | Item 3    | Any export renamed, removed, or changed signature                         |
| Component behavior in `EditProductContent.tsx`                 | Item 1    | Form renders differently, submits different data, or shows different UI   |
| `FormState`, `Category`, `OptionItem` type definitions         | Item 1    | Any of these types modified                                               |
| Runtime dependency behavior                                    | Item 2    | A removed package is still imported at runtime; a kept package is removed |
| `tsconfig.json` `compilerOptions` not related to the two flags | Item 4    | Any existing compilerOption changed or removed                            |
| All existing test assertions                                   | Items 1–4 | Any test fails or requires update beyond import paths                     |
| `src/utils/` non-supabase files                                | Item 3    | Any utility outside `src/utils/supabase/` is moved or touched             |

## Acceptance Criteria

Each criterion maps to a verifiable command or check:

### Item 1 — T4.3/T4.4: Type `unknown` refs in edit product forms

| #   | Criterion                                                    | Verification                                                                                          |
| --- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 1.1 | Zero `unknown` references remain in `EditProductContent.tsx` | `grep -n "unknown" src/app/admin/inventory/products/edit/[id]/_components/EditProductContent.tsx` → 0 |
| 1.2 | Zero `unknown` references remain in `useProductData.ts`      | `grep -n "unknown" src/app/admin/inventory/products/edit/[id]/_components/useProductData.ts` → 0      |
| 1.3 | `setInitialData` accepts `FormState` (not `unknown`)         | TypeScript compiles without TS6133 or TS2322 in target files                                          |
| 1.4 | `setCategories` accepts `Category[]` (not `unknown[]`)       | Same as 1.3                                                                                           |
| 1.5 | No new type definitions added                                | All types used (`FormState`, `Category`, `OptionItem`) pre-exist                                      |

### Item 2 — 5.5: Dependency audit

| #   | Criterion                                                 | Verification                                                          |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| 2.1 | Unused runtime dependencies removed from `package.json`   | `npx depcheck` reports them as unused; `npm ls <pkg>` shows "missing" |
| 2.2 | `pino-pretty` moved to `devDependencies`                  | `npm ls pino-pretty --all` shows only in devDeps                      |
| 2.3 | No dependency removed that is imported anywhere in `src/` | `grep -r "from '<pkg>'" src/` confirms import exists for kept deps    |
| 2.4 | `npm install` completes without peer-dependency warnings  | `npm install` exit code 0                                             |
| 2.5 | `npm run build` passes                                    | Exit code 0                                                           |

### Item 3 — 5.2: Move `utils/supabase/` → `lib/supabase/`

| #   | Criterion                                                       | Verification                                                           |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 3.1 | All 6 files exist at `src/lib/supabase/` with identical content | `diff -r src/utils/supabase/ src/lib/supabase/` → No output            |
| 3.2 | Zero imports of `@/utils/supabase/` remain in `src/`            | `grep -r "@/utils/supabase/" src/` → 0 results                         |
| 3.3 | All imports use `@/lib/supabase/` alias                         | `grep -r "@/lib/supabase/" src/` matches all 362 previous import sites |
| 3.4 | Mock paths in `src/__tests__/unit/supabase/` updated            | Tests pass: `npx vitest run src/__tests__/unit/supabase/`              |
| 3.5 | `npx tsc --noEmit` produces no new errors                       | Error count same as before the move (baseline captured pre-move)       |
| 3.6 | `src/utils/supabase/` directory deleted                         | `ls src/utils/supabase/` returns "No such file or directory"           |

### Item 4 — 5.4: `noUnusedLocals` + `noUnusedParameters`

| #   | Criterion                                                                                 | Verification                                                                             |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 4.1 | `noUnusedLocals: true` in `tsconfig.json` `compilerOptions`                               | Present in file                                                                          |
| 4.2 | `noUnusedParameters: true` in `tsconfig.json` `compilerOptions`                           | Present in file                                                                          |
| 4.3 | Zero TS6133 errors in `npx tsc --noEmit`                                                  | Exit code 0                                                                              |
| 4.4 | All `_`-prefixed parameters are intentional (unused by design, not accidentally prefixed) | Manual review of `git diff --stat` — `_` prefix only on params that are genuinely unused |
| 4.5 | No test file modified beyond adding `_` prefix or removing locals                         | Same test count, same test assertions                                                    |

### Cross-cutting

| #   | Criterion               | Verification                   |
| --- | ----------------------- | ------------------------------ |
| C.1 | All existing tests pass | `npm run test:run` exit code 0 |
| C.2 | Linter passes           | `npm run lint` exit code 0     |
| C.3 | Build succeeds          | `npm run build` exit code 0    |

## Non-goals

| Non-goal                                                         | Rationale                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Remove `ignoreBuildErrors` from `next.config.js`                 | Deferred to Phase 1.3 post-production (per proposal)                      |
| Consolidate `src/utils/` → `src/lib/` for non-supabase utilities | Out of scope — only supabase paths move                                   |
| Barrel cleanup beyond what's already done                        | Out of scope — proposal explicitly excludes it                            |
| Zod-inferred submit types (`z.infer<>`) for forms                | Phase 6 concern (per proposal)                                            |
| Rename or restructure files inside `src/lib/supabase/`           | Scope is move-only — files keep names and exports                         |
| Add new tests                                                    | No behavioral change, no new tests needed                                 |
| Remove deprecated but still-used packages                        | Only remove packages confirmed unused by `depcheck` + manual verification |
| Fix TS errors unrelated to the two new flags                     | Only TS6133 errors surfaced by enabling the two flags                     |

## Execution Order (from proposal)

```
1. Item 1 (T4.3/T4.4)   — Independent
2. Item 2 (5.5 depcheck) — Independent, parallel with Item 1
3. Item 3 (5.2 move)     — Sequential after 1-2
4. Item 4 (5.4 flags)    — Runs last to minimize conflict resolution with 1-3
```

## Rollback

See proposal rollback plan (`proposal.md`). Each item is independently revertible via `git revert <commit>`.
