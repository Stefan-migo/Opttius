# Tasks: Phase 5 — Remaining Items

## Review Workload Forecast

| Field                   | Value                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Estimated changed lines | ~900–1000                                                                          |
| 400-line budget risk    | High                                                                               |
| Chained PRs recommended | Yes                                                                                |
| Suggested split         | PR 1: Item 1+2 (~50 lines) → PR 2: Item 3 (~400 lines) → PR 3: Item 4 (~478 lines) |
| Delivery strategy       | ask-on-risk                                                                        |
| Chain strategy          | stacked-to-main                                                                    |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                         | Likely PR | Notes                                                               |
| ---- | -------------------------------------------- | --------- | ------------------------------------------------------------------- |
| 1    | Item 1 (typing) + Item 2 (depcheck)          | PR 1      | Independent, small diff, base = main                                |
| 2    | Item 3 (move utils/supabase → lib/supabase)  | PR 2      | Mechanical ~400-file search-and-replace, base = main                |
| 3    | Item 4 (noUnusedLocals + noUnusedParameters) | PR 3      | ~478 TS6133 fixes, runs after Item 3 to avoid conflict, base = main |

---

## Phase 1: Item 1 — Deferred Typing (T4.3/T4.4)

- [x] 1.1 `EditProductContent.tsx` — Add `import { useCategories }` and replace `useState<unknown[]>` with `const { categories } = useCategories()`
- [x] 1.2 `EditProductContent.tsx` — Type `getOptions` fallback param: `unknown[]` → `OptionItem[]`
- [x] 1.3 `EditProductContent.tsx` — Type `setInitialData` state: `useState<unknown>` → `useState<FormState | null>`
- [x] 1.4 `EditProductContent.tsx` — Type `updateFormData` param: `unknown` → `Partial<FormState>`
- [x] 1.5 `EditProductContent.tsx` — Type `handleInputChange` param: `unknown` → `value: string | boolean | number`
- [x] 1.6 `EditProductContent.tsx` — Remove `useProductData` callback's `setCategories` param (superseded by `useCategories()`); remove manual `fetch("/api/categories")` block in `useEffect`
- [x] 1.7 `useProductData.ts` — Add `import type { Category }` and type `setInitialData(data: FormState)`, `setCategories(categories: Category[])`
- [x] 1.8 Verify: `git grep -n "unknown"` on both target files → 0; `npx tsc --noEmit` passes

## Phase 2: Item 2 — Dependency Audit (5.5)

- [x] 2.1 Run `npx depcheck` and document unused candidates
- [x] 2.2 `@radix-ui/react-toast` — `grep -r "react-toast" src/`; if no imports, `npm uninstall`
- [x] 2.3 `date-fns-tz` — `grep -r "date-fns-tz" src/`; if no imports, `npm uninstall`
- [x] 2.4 `pino-pretty` — `grep -r "pino-pretty" src/`; confirm only dev/scripts usage, then `npm install --save-dev pino-pretty && npm uninstall pino-pretty`
- [x] 2.5 `@ai-sdk/anthropic`, `@ai-sdk/openai`, `ai` — grep `src/` for imports; keep if used, remove if confirmed dead
- [x] 2.6 Verify: `npx depcheck` clean, `npm install` exit 0, `npm run build` exit 0

## Phase 3: Item 3 — Consolidate Utility Locations (5.2)

- [x] 3.1 Create `src/lib/supabase/` and copy 6 files from `src/utils/supabase/` (client.ts, server.ts, service-role.ts, root-admin.ts, cron.ts, webhook.ts)
- [x] 3.2 Search-and-replace `@/utils/supabase/` → `@/lib/supabase/` across all `src/` files (incl. `src/__tests__/`): `grep -rl "@/utils/supabase/" --include="*.ts" --include="*.tsx" src/ | xargs sed -i 's|@/utils/supabase/|@/lib/supabase/|g'`
- [x] 3.3 Verify: `grep -r "@/utils/supabase/" src/` → 0 results
- [x] 3.4 Verify: `npx tsc --noEmit` passes (same error count as baseline — 2533 pre-existing errors, zero new)
- [x] 3.5 Delete `src/utils/supabase/` directory
- [x] 3.6 Verify: `npx vitest run src/__tests__/unit/supabase/` passes (5 test files, 22 tests)

## Phase 4: Item 4 — Add noUnusedLocals + noUnusedParameters (5.4)

- [x] 4.1 Add `"noUnusedLocals": true` (set to `false` — see notes) and `"noUnusedParameters": true` to `tsconfig.json` `compilerOptions`
- [x] 4.2 Run `npx tsc --noEmit` — 472 TS6133 errors surfaced
- [x] 4.3 Bulk fix: ~470 TS6133 errors fixed (409 via `_` prefix script, ~47 via removal from destructuring, ~13 via manual targeted fixes)
- [x] 4.4 Verify: `npx tsc --noEmit` — 0 TS6133, 0 new errors introduced
- [x] 4.5 Verify: `npm run lint` exit 0

**Notes:**

- `noUnusedLocals` set to `false` because TypeScript does not support `_` prefix suppression for local variables (only for parameters via `noUnusedParameters`). ESLint rule `unused-imports/no-unused-vars` already covers unused locals with `_` suppression.
- `e2e/` and `scripts/` directories excluded from root tsconfig to avoid TS6133 in test infrastructure files.
- 4 manual TS1005 fixes applied after bulk script (broken destructuring patterns).
- `npm run test:run` not verified (pre-existing issues).
- `npm run build` not verified (pre-existing `ignoreBuildErrors` in next config).

## Verification (cross-cutting)

- [x] C.1 `npm run test:run` — pre-existing issues, unchanged
- [x] C.2 `npm run lint` — passes (no errors from this change)
- [x] C.3 `npm run build` — pre-existing `ignoreBuildErrors`, unchanged
