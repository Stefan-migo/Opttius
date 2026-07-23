# Design: Phase 5 — Remaining Items (Type Safety & Code Quality)

> **Type**: Pure refactor — 4 independent items, each with a single univocal approach.
> **Spec**: `openspec/changes/phase-5-remaining/spec.md`

## Technical Approach

4 items, 0 architectural decisions. Each maps to a mechanical transformation with a single correct implementation path:

| Item          | What                                      | Pattern                                                                                                      |
| ------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1 (T4.3/T4.4) | Type `unknown` refs in edit product forms | Import `useCategories()` hook, replace `unknown` with existing types (`OptionItem`, `FormState`, `Category`) |
| 2 (5.5)       | Dependency audit                          | `depcheck` → manual verify → `npm uninstall` / move to devDeps                                               |
| 3 (5.2)       | Move `utils/supabase/` → `lib/supabase/`  | Copy 6 files, sed import paths, delete old dir                                                               |
| 4 (5.4)       | Enable unused-variable flags              | Add 2 tsconfig flags, bulk-fix TS6133 with `_` prefix / remove unused                                        |

## Architecture Decisions

None. This is mechanical refactor — every choice is forced by the codebase pattern.

**Item 1 notes:**

- `useCategories()` already exists and is used in `AddProductContent.tsx` — exact same pattern
- `OptionItem` is already exported from `@/app/admin/products/_types`
- `Category` is already exported from `@/app/admin/products/hooks/useCategories`
- `FormState` is already exported from `./types.ts` (co-located)
- No new types needed. No new dependencies. No hooks beyond what's already proven.

**Item 3 notes:**

- The existing path alias `"@/lib/*": ["./src/lib/*"]` already resolves `@/lib/supabase/*` correctly once files exist there. Explicit `@/lib/supabase/*` alias is redundant and skipped.
- `@/utils/supabase/` appears in ~362 `src/` imports + 39 `src/__tests__/` imports (search-and-replace covers both)
- The 6 source files are: `client.ts`, `server.ts`, `service-role.ts`, `root-admin.ts`, `cron.ts`, `webhook.ts`

## Execution Plan

```
Order: Item 1 → Item 2 → Item 3 → Item 4
(1 & 2 are independent, 3 should run before 4 to avoid fixing TS6133 on moved files)
```

### Item 1 — Type `unknown` refs in edit product forms

**Files:**

- `src/app/admin/products/edit/[id]/_components/EditProductContent.tsx`
- `src/app/admin/products/edit/[id]/_components/useProductData.ts`

**Changes:**

`EditProductContent.tsx` (4 `unknown` → typed):

1. Add import: `import { useCategories } from "@/app/admin/products/hooks/useCategories";`
2. Add import: `import type { OptionItem } from "@/app/admin/products/_types";`
3. Replace `const [categories, setCategories] = useState<unknown[]>([]);` with `const { categories } = useCategories();` (remove manual `useState` + `useEffect` fetch block for categories)
4. Change `getOptions` signature: `fallback: OptionItem[] = []` (was `unknown[]`)
5. Change `setInitialData` state: `useState<FormState | null>(null)` (was `unknown`)
6. Change `updateFormData`: `updates: Partial<FormState>` (was `unknown`)
7. Change `handleInputChange` param: `value: string` (was `unknown`)
8. Remove unused `setCategories` from `useProductData` callback (it's no longer needed — categories come from hook)
9. Clean up: remove the `fetch("/api/categories")` block inside `useEffect` (lines 333-338 in current; now handled by `useCategories()`)

`useProductData.ts` (2 `unknown` → typed):

1. Change `setInitialData: (data: FormState) => void` (was `unknown`)
2. Change `setCategories: (categories: Category[]) => void` (was `unknown[]`)
3. Add import: `import type { Category } from "@/app/admin/products/hooks/useCategories";`

**Verify:**

```bash
git grep -n "unknown" src/app/admin/products/edit/\[id\]/_components/EditProductContent.tsx
git grep -n "unknown" src/app/admin/products/edit/\[id\]/_components/useProductData.ts
# Both should return 0
npx tsc --noEmit 2>&1 | head -20
```

### Item 2 — Dependency audit

**Commands:**

```bash
npx depcheck
# Manually verify each flagged candidate by grepping src/ for imports
npm uninstall <confirmed-unused-packages>
npm install --save-dev pino-pretty    # move from deps to devDeps
npm install                           # verify clean install
npx tsc --noEmit                      # verify no breakage
npm run build                         # verify build passes
```

**Candidates to verify:**
| Package | Check | Expectation |
|---------|-------|-------------|
| `@radix-ui/react-toast` | `grep -r "react-toast" src/` | Used? (sonner is primary toast, but check for direct radix usage) |
| `date-fns-tz` | `grep -r "date-fns-tz" src/` | Used? |
| `pino-pretty` | `grep -r "pino-pretty" src/` | Only used in dev/scripts → move to devDeps |
| `@ai-sdk/anthropic` | `grep -r "@ai-sdk/anthropic" src/` | Used by AI module? |
| `@ai-sdk/openai` | `grep -r "@ai-sdk/openai" src/` | Used by AI module? |
| `ai` | `grep -r "from \"ai\"" src/` | Used by AI module? |

**Decision per candidate is forced by grep result. No architectural choice.**

**Verify:**

```bash
npx depcheck              # clean
npm ls pino-pretty        # only in devDependencies
npm run build             # exit 0
```

### Item 3 — Move `utils/supabase/` → `lib/supabase/`

**Commands (sequential):**

```bash
# 1. Create target dir
mkdir -p src/lib/supabase/

# 2. Copy 6 files (preserve git history by copy + later delete, not mv)
cp src/utils/supabase/*.ts src/lib/supabase/

# 3. Search-and-replace all imports in src/
#    Use sed on ALL files under src/ matching the old path
#    This covers both src/ and src/__tests__/
# ponytail: single sed covers 400+ matches, no codemod needed
cd src && \
  grep -rl "@/utils/supabase/" --include="*.ts" --include="*.tsx" . | \
  xargs -r sed -i 's|@/utils/supabase/|@/lib/supabase/|g'

# 4. Verify zero remaining
grep -r "@/utils/supabase/" src/    # should return 0

# 5. Verify new path works
npx tsc --noEmit                    # same error count as baseline

# 6. Delete old directory
rm -rf src/utils/supabase/

# 7. Run tests
npx vitest run src/__tests__/unit/supabase/
```

**Files touched:** All files in `src/` + `src/__tests__/` that import from `@/utils/supabase/*` (~400 files, search-and-replace across all).

**Test file mock paths** — these are caught by the same sed because `vi.mock("@/utils/supabase/...")` uses the same path string. The sed covers `@/utils/supabase/` everywhere, not just import statements. Confirm with `grep` after replacement.

**File contents verified identical:**

```bash
diff -r src/utils/supabase/ src/lib/supabase/
# No output = identical
```

### Item 4 — `noUnusedLocals` + `noUnusedParameters`

**tsconfig.json changes:**

```json
"compilerOptions": {
  // ... existing ...
  "noUnusedLocals": true,
  "noUnusedParameters": true,
}
```

**Bulk fix strategy:**

```bash
# 1. Add flags to tsconfig.json
# 2. Run type-check to surface all TS6133 errors
npx tsc --noEmit 2>&1 | tee /tmp/ts6133-errors.txt

# 3. Fix pattern:
#    - Unused parameters: prefix with _
#    - Unused locals: remove the declaration
#    - Unused imports: already handled by eslint-plugin-unused-imports

# 4. Iterate until npx tsc --noEmit returns 0

# 5. Run tests + lint to verify nothing broke
npm run test:run
npm run lint
```

**Key rules:**

- Test file unused vars → `_` prefix (not removal — test setup vars are intentionally unused)
- Named exports that are type-only used → check they're actually consumed
- Do NOT fix errors outside TS6133 — only those surfaced by the two new flags
- Run AFTER item 3 to avoid fixing errors on files that will be moved

## File Changes

| Item | File                                                                  | Action | Description                                                                |
| ---- | --------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| 1    | `src/app/admin/products/edit/[id]/_components/EditProductContent.tsx` | Modify | Type 4 `unknown` → typed; replace manual fetch with `useCategories()` hook |
| 1    | `src/app/admin/products/edit/[id]/_components/useProductData.ts`      | Modify | Type 2 `unknown` → `FormState`/`Category[]`                                |
| 2    | `package.json`                                                        | Modify | Remove unused deps; move `pino-pretty` → devDependencies                   |
| 2    | `package-lock.json`                                                   | Modify | Auto-generated by npm install/uninstall                                    |
| 3    | `src/lib/supabase/client.ts`                                          | Create | Copy from `src/utils/supabase/client.ts`                                   |
| 3    | `src/lib/supabase/server.ts`                                          | Create | Copy from `src/utils/supabase/server.ts`                                   |
| 3    | `src/lib/supabase/service-role.ts`                                    | Create | Copy from `src/utils/supabase/service-role.ts`                             |
| 3    | `src/lib/supabase/root-admin.ts`                                      | Create | Copy from `src/utils/supabase/root-admin.ts`                               |
| 3    | `src/lib/supabase/cron.ts`                                            | Create | Copy from `src/utils/supabase/cron.ts`                                     |
| 3    | `src/lib/supabase/webhook.ts`                                         | Create | Copy from `src/utils/supabase/webhook.ts`                                  |
| 3    | `src/utils/supabase/` (dir, 6 files)                                  | Delete | Old location after migration                                               |
| 3    | ~400 files across `src/` + `src/__tests__/`                           | Modify | Search-and-replace `@/utils/supabase/` → `@/lib/supabase/`                 |
| 4    | `tsconfig.json`                                                       | Modify | Add `noUnusedLocals: true`, `noUnusedParameters: true`                     |
| 4    | Various `*.ts`/`*.tsx`                                                | Modify | Prefix unused params with `_`, remove unused locals                        |

## Testing Strategy

| Item | What               | Approach                                                         |
| ---- | ------------------ | ---------------------------------------------------------------- |
| 1    | Type correctness   | `npx tsc --noEmit` on target files                               |
| 1    | No behavior change | `npx vitest run` (form component tests)                          |
| 2    | Clean depcheck     | `npx depcheck` shows no unexpected unused                        |
| 2    | Build integrity    | `npm run build` exit 0                                           |
| 3    | Imports resolved   | `grep -r "@/utils/supabase/" src/` → 0                           |
| 3    | Tests pass         | `npx vitest run src/__tests__/unit/supabase/`                    |
| 3    | No new TS errors   | `npx tsc --noEmit` same error count (baseline captured pre-move) |
| 4    | Zero TS6133        | `npx tsc --noEmit` exit 0                                        |
| C    | Cross-cutting      | `npm run test:run`, `npm run lint`, `npm run build` all exit 0   |

## Rollback

| Item | Rollback                                                                                 |
| ---- | ---------------------------------------------------------------------------------------- |
| 1    | `git checkout HEAD -- EditProductContent.tsx useProductData.ts`                          |
| 2    | `npm install` to restore removed packages; revert `package.json`/`package-lock.json`     |
| 3    | `git revert <commit>` — old files still at `src/utils/supabase/` (deleted in final step) |
| 4    | `git revert <commit>` — remove tsconfig flags, restore fixed files                       |

Each item is independently revertible via `git revert <commit>`.

## Open Questions

None. Every item has a single mechanical approach with no tradeoffs.
