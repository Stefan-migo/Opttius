# Tasks: Phase 5 — Type Safety + Barrel Cleanup

## Review Workload Forecast

| Field                   | Value                                             |
| ----------------------- | ------------------------------------------------- |
| Estimated changed lines | ~200-300                                          |
| 400-line budget risk    | Low                                               |
| Chained PRs recommended | Yes                                               |
| Suggested split         | PR 1: Barrel cleanup → PR 2: Product forms typing |
| Delivery strategy       | auto-chain                                        |
| Chain strategy          | stacked-to-main                                   |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                                   | Likely PR | Notes                                 |
| ---- | ------------------------------------------------------ | --------- | ------------------------------------- |
| 1    | Delete dead barrel `src/lib/api/index.ts`              | PR 1      | Trivial, independent, no test changes |
| 2    | Type-safety for 26 `any`/`as unknown` in product forms | PR 2      | 11 files, stacked on PR 1 base = main |

## Phase 1: Barrel Cleanup (5.3)

- [x] 1.1 Delete `src/lib/api/index.ts` — confirmed 0 importers via grep, no migration needed
- [x] 1.2 Verify `git grep "@/lib/api"` returns zero results

## Phase 2: Shared Types (5.1 foundation)

- [x] 2.1 Create `src/app/admin/products/_types/index.ts` with `OptionItem = { value: string; label: string }`
- [x] 2.2 Add `featured_image?: string | null` and `gallery?: string[] | null` to local `Product` interface in `src/app/admin/products/hooks/useProducts.ts`

## Phase 3: Replace `any` Casts in Option Arrays

- [x] 3.1 `add/_components/AddProductBasicInfo.tsx` — 2 `as any[]` → typed `OptionItem[]`/`Category[]`
- [x] 3.2 `add/_components/AddProductFrameSpecs.tsx` — 5 `as any[]` → `OptionItem[]`
- [x] 3.3 `add/_components/AddProductLensSpecs.tsx` — 3 `as any[]` → `OptionItem[]`
- [x] 3.4 `edit/[id]/_components/ProductBasicInfo.tsx` — 2 `as any[]` → typed (`OptionItem[]`, `as {id,name}`)
- [x] 3.5 `edit/[id]/_components/ProductFrameSpecs.tsx` — 5 `as any[]` → `OptionItem[]`
- [x] 3.6 `edit/[id]/_components/ProductLensSpecs.tsx` — 3 `as any[]` → `OptionItem[]`

## Phase 4: Fix Submit Boundaries and Gallery Access

- [x] 4.1 `add/_components/AddProductContent.tsx` — `as unknown` → `as CreateProductData`
- [x] 4.2 `edit/[id]/_components/productSubmitHandler.ts` — `as unknown` → `as UpdateProductData`
- [ ] 4.3 `edit/[id]/_components/EditProductContent.tsx` — `unknown` → typed categories (future PR)
- [ ] 4.4 `edit/[id]/_components/useProductData.ts` — `unknown[]` → `OptionItem[]`, `unknown` → typed (future PR)
- [x] 4.5 `components/ProductGrid.tsx` — 4 `as unknown` → use typed `featured_image`/`gallery` from local Product interface

## Phase 5: Verification

- [x] 5.1 Run `npx tsc --noEmit --strict` — confirmed zero type errors across all modified files (1466→1460 total, 6 fewer)
- [x] 5.2 Run existing product form tests — confirmed all 113 product tests pass unchanged (2 pre-existing failures unrelated)
