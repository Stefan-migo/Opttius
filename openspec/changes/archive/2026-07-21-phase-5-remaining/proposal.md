# Proposal: Phase 5 — Remaining Items (Type Safety & Code Quality)

## Intent

Complete the last 4 items of Phase 5 from the Production Readiness Roadmap: fix deferred `unknown` types in edit product forms, audit unused deps, consolidate utility paths, and enable unused-variable flags. Pure refactor — zero new features, zero behavior change.

## Scope

### In Scope

1. **T4.3/T4.4** — Type the 5 remaining `unknown` references in edit product forms using existing `useCategories()` hook + `Category` type + `OptionItem`
2. **5.5** — Run `depcheck`, audit candidates (`@radix-ui/react-toast`, `date-fns-tz`, `pino-pretty`, `@ai-sdk/*`, `ai`), remove unused, move `pino-pretty` to devDependencies
3. **5.2** — Move `src/utils/supabase/` (6 files) → `src/lib/supabase/` with a `tsconfig.json` path alias + codemod for 362 importers + mock paths in tests
4. **5.4** — Enable `noUnusedLocals` + `noUnusedParameters` in `tsconfig.json`; fix ~478 TS6133 errors across the codebase

### Out of Scope

- `ignoreBuildErrors` removal (deferred to Phase 1.3 post-production)
- Any non-supabase utility consolidation (e.g., `src/utils/` → `src/lib/`)
- Barrel cleanup beyond what's already done
- Zod-inferred submit types (Phase 6 concern)

## Capabilities

None — pure refactor. No spec-level behavior changes.

## Approach

**Item 1 (S) — Deferred typing:**

- Import `useCategories()` in `EditProductContent.tsx` (same pattern as `AddProductContent.tsx`)
- Remove `unknown[]` state for categories → typed `Category[]` from hook
- Replace `getOptions` fallback `unknown[]` → `OptionItem[]`
- Add `value: string` overload for `handleInputChange` (callers only pass string values)
- Update `useProductData` signature: `setInitialData(data: FormState)` and `setCategories(categories: Category[])`
- All types exist (`OptionItem`, `Category`, `FormState`) — no new types needed

**Item 2 (S/M) — Dependency audit:**

- `npx depcheck` → manual review of flagged packages
- Verify each candidate: grep for imports in `src/`, check test files
- `npm uninstall` confirmed unused; `npm install --save-dev pino-pretty`
- Add missing types or `@types/` if `depcheck` reports false positives for type-only packages

**Item 3 (M) — Utility consolidation:**

1. Create `src/lib/supabase/` dir, copy 6 files from `src/utils/supabase/`
2. Add path alias to `tsconfig.json`: `"@lib/supabase/*": ["./src/lib/supabase/*"]`
3. Sed/codemod: replace `@/utils/supabase/` → `@/lib/supabase/` across all files (362 matches)
4. Update 5 mock paths in `src/__tests__/unit/supabase/*.test.ts`
5. Verify `npx tsc --noEmit` passes (same error count)
6. Delete `src/utils/supabase/` dir (old path still works via alias, remove in cleanup step)

**Item 4 (L) — noUnusedLocals + noUnusedParameters:**

1. Add flags to `tsconfig.json` `compilerOptions`
2. Run `npx tsc --noEmit` to surface all 478 TS6133 errors
3. Fix in bulk: prefix unused params with `_`, remove unused locals
4. Leverage existing `eslint-plugin-unused-imports` — already covers imports, this catches the rest
5. Run last to avoid unnecessary conflict resolution with Items 1-3

## Execution Order

```
1. Item 1 (T4.3/T4.4)   — S, independent, 2 files
2. Item 2 (5.5 depcheck) — S/M, independent
3. Item 3 (5.2 move)     — M, codemod across 362 files
4. Item 4 (5.4 flags)    — L, 478 errors, runs last to minimize merge conflicts
```

Items 1 and 2 can run in parallel. Items 3 and 4 are sequential (4 should run after 3 to avoid fixing errors on files that will be moved).

## Affected Areas

| Area                                           | Impact      | Description                                                   |
| ---------------------------------------------- | ----------- | ------------------------------------------------------------- |
| `edit/[id]/_components/EditProductContent.tsx` | Modified    | 3x `unknown` → typed (categories, fallback, handler)          |
| `edit/[id]/_components/useProductData.ts`      | Modified    | 2x `unknown` → `FormState`/`Category[]`                       |
| `package.json` dependencies                    | Modified    | Remove unused, move pino-pretty to devDeps                    |
| `src/utils/supabase/*` (6 files)               | **Deleted** | Moved to `src/lib/supabase/`                                  |
| `src/lib/supabase/*` (6 files)                 | **New**     | New canonical location                                        |
| `tsconfig.json`                                | Modified    | Add `@/lib/supabase/*` alias + unused flags                   |
| 362 files importing `@/utils/supabase/*`       | Modified    | Path update to `@/lib/supabase/*`                             |
| 5 test files in `src/__tests__/unit/supabase/` | Modified    | Mock path updates                                             |
| Various `*.ts`/`*.tsx`                         | Modified    | ~478 TS6133 fixes (prefixed `_` params, remove unused locals) |

## Risks

| Risk                                                        | Likelihood | Mitigation                                                                                         |
| ----------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| Item 3 path alias collision with existing `@/lib/*` pattern | Low        | `tsconfig.json` already has `@/lib/*` → `./src/lib/*` — no collision since paths are file-specific |
| Item 3 sed miss on dynamic imports                          | Low        | `git grep "@/utils/supabase/"` covers all import patterns; dynamic imports also use same path      |
| Item 4 TS6133 false positives in test files                 | Medium     | Test files often have unused vars for setup — use `_` prefix pattern, keep ESLint overrides        |
| `depcheck` flags packages used only in scripts or config    | Low        | Manual verification of each flagged package before removal                                         |
| FormState typing breaks if data shape diverges              | Low        | `FormState` already exists — adding type param to `setInitialData` reinforces existing contract    |

## Rollback Plan

- **Item 1**: `git checkout HEAD -- EditProductContent.tsx useProductData.ts`
- **Item 2**: `npm install` to restore removed packages; revert `package.json`/`package-lock.json`
- **Item 3**: `git revert <commit>` — 6 files still exist in old location, tests still pass with old path
- **Item 4**: `git revert <commit>` — remove tsconfig flags, restore fixed files

## Dependencies

- `depcheck` v1.4.7 (available globally, no install needed)
- No external dependencies for items 1, 3, 4

## Success Criteria

- [ ] **Item 1**: Zero `unknown` references in edit product form files (`git grep "unknown"` returns 0 in target files)
- [ ] **Item 2**: `npx depcheck` shows clean report; removed packages verified by `npm ls <pkg> | grep "missing"`
- [ ] **Item 3**: `git grep "@/utils/supabase/"` returns 0 results; `npx tsc --noEmit` passes with same error count
- [ ] **Item 4**: `noUnusedLocals` + `noUnusedParameters` enabled in tsconfig; `npx tsc --noEmit` shows 0 TS6133 (or documented exceptions)
- [ ] All existing tests pass unchanged
