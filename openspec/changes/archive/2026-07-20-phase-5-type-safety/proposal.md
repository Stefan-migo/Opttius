# Proposal: Phase 5 — Type Safety + Barrel Cleanup

## Intent

Replace 26 unchecked `any`/`as unknown` casts in product forms with proper types, and delete a zero-importer barrel file. Pure refactor — zero behavior change, zero new dependencies. Complements Phase 3 (data/RLS) which runs in parallel with no overlap.

## Scope

### In Scope

- **5.1** — Replace 26 `any`/`as unknown` across 11 product form files using existing service types + a minimal `OptionItem` interface
- **5.3** — Delete `src/lib/api/index.ts` (confirmed 0 importers)

### Out of Scope

- `FormState` interface overhaul (62 string fields, intentionally loose by design)
- Zod-inferred submit types (Phase 6 concern)
- Supabase generated types for form display (80+ cols, string/number mismatch)
- Any barrel beyond `lib/api/index.ts` (services barrel: 46 importers, deferred)

## Capabilities

None — pure refactor. No new or modified spec-level behavior.

## Approach

**5.1 — Service types + OptionItem:**

1. Define `OptionItem = { value: string; label: string }` in a shared file under `src/app/admin/products/_types/`
2. Replace 22 `as any[]` casts on option arrays → `as OptionItem[]`
3. Use `CreateProductData`/`UpdateProductData` from `productService.ts` for the 2 submit boundary `as unknown` casts
4. Add `featured_image?: string` and `gallery?: string[]` to the local `Product` interface in `useProducts.ts` → eliminates 4 `as unknown` in `ProductGrid.tsx`

**5.3 — Barrel deletion:**

1. Delete `src/lib/api/index.ts`
2. No importer migration needed (alternate paths already used)

Combined effort: ~2-3 hours. No test changes needed (compiler catches type errors).

## Affected Areas

### 5.1 — Product Forms (any →

proper types)

| Area                                            | Impact   | Description                                      |
| ----------------------------------------------- | -------- | ------------------------------------------------ |
| `add/_components/AddProductContent.tsx`         | Modified | 1 `as unknown` → `CreateProductData`             |
| `add/_components/AddProductBasicInfo.tsx`       | Modified | 2 `as any[]` → `OptionItem[]`                    |
| `add/_components/AddProductFrameSpecs.tsx`      | Modified | 5 `as any[]` → `OptionItem[]`                    |
| `add/_components/AddProductLensSpecs.tsx`       | Modified | 3 `as any[]` → `OptionItem[]`                    |
| `edit/[id]/_components/EditProductContent.tsx`  | Modified | `value: unknown`, `unknown[]` → typed            |
| `edit/[id]/_components/ProductBasicInfo.tsx`    | Modified | 2 `as any[]` → `OptionItem[]`                    |
| `edit/[id]/_components/ProductFrameSpecs.tsx`   | Modified | 5 `as any[]` → `OptionItem[]`                    |
| `edit/[id]/_components/ProductLensSpecs.tsx`    | Modified | 3 `as any[]` → `OptionItem[]`                    |
| `edit/[id]/_components/productSubmitHandler.ts` | Modified | 1 `as unknown` → `UpdateProductData`             |
| `edit/[id]/_components/useProductData.ts`       | Modified | `unknown[]` categories, `unknown` setInitialData |
| `components/ProductGrid.tsx`                    | Modified | 4 `as unknown` → typed Product fields            |

### 5.3 — Barrel Cleanup

| Area                   | Impact      | Description              |
| ---------------------- | ----------- | ------------------------ |
| `src/lib/api/index.ts` | **Deleted** | Dead barrel, 0 importers |

## Risks

| Risk                                                       | Likelihood | Mitigation                                                         |
| ---------------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `gallery` arrives as `Json \| null` from Supabase          | Low        | Check service layer transformation; use optional chaining          |
| Missed dynamic import of barrel                            | Very Low   | Grep `@/lib/api` confirmed 0 hits; no dynamic patterns in codebase |
| Form component co-opts `OptionItem` for runtime validation | Low        | `OptionItem` is a compile-time interface only — no runtime impact  |

## Rollback Plan

- **5.1**: Revert the 11 modified files via `git checkout HEAD -- <files>` — no schema changes to collide with
- **5.3**: Restore `src/lib/api/index.ts` from git (deleted file, no migration needed)

## Dependencies

- None. Both tasks are self-contained.

## Success Criteria

- [ ] TypeScript compiles with `strict: true` — zero `any`/`unknown` in the 11 product form files
- [ ] `src/lib/api/index.ts` is deleted and `git grep "@/lib/api"` returns zero results
- [ ] All existing product form tests pass unchanged
- [ ] Product form submissions (create + update) produce identical payload shapes (verified by TypeScript — no runtime logic changed)
