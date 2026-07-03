# Tasks: Add Unit Tests — API Services

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,550 across 4 PRs |
| 400-line budget risk | Low per PR |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (easy) → PR 2 (easy) → PR 3 (medium) → PR 4 (hard) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Files | Est. Lines | PR | Base |
|------|-------|-----------|----|------|
| 1 — Notification + Simple Services | `notificationService.test.ts`, `quoteSettingsService.test.ts`, `lensFamilyService.test.ts` | ~300 | PR 1 | main |
| 2 — Contact Lens Family | `contactLensFamilyService.test.ts`, `contactLensMatrixService.test.ts`, `contactLensEncargoService.test.ts` | ~280 | PR 2 | main |
| 3 — Agreement + CL Inventory | `agreementService.test.ts`, `contactLensInventoryService.test.ts` | ~400 | PR 3 | main |
| 4 — Products Service | `products/service.test.ts` | ~400 | PR 4 | main |

---

## PR 1 — Notification + Simple Services (~300 lines)

- [ ] 1.1 Create `src/__tests__/unit/lib/api/services/notificationService.test.ts` — mock `sonner`, test all 14 exports (`success`, `error`, `info`, `warning`, `loading`, `promise`, `custom`, `dismissAll`, `dismiss`, `*WithAction`). Verify option merging (`successOptions`, `errorOptions`, etc.) and dismiss return from `loading`. **Mock**: `vi.mock("sonner")`.
- [ ] 1.2 Create `src/__tests__/unit/lib/api/services/quoteSettingsService.test.ts` — mock `ApiClient` via `__aptMockClient__`, test `get()` success/error/null, `update()` success/error/null with partial data. **Mock**: `vi.mock("@/lib/api/client-helpers")`.
- [ ] 1.3 Create `src/__tests__/unit/lib/api/services/lensFamilyService.test.ts` — same ApiClient mock, test `getAll()` with/without inactive, empty array fallback, `getById()` found/not-found/error. **Mock**: `vi.mock("@/lib/api/client-helpers")`.

## PR 2 — Contact Lens Family (~280 lines)

- [ ] 2.1 Create `src/__tests__/unit/lib/api/services/contactLensFamilyService.test.ts` — ApiClient mock, test `getAll()` with `includeInactive`, `getById()` found/not-found. **Mock**: `vi.mock("@/lib/api/client-helpers")`.
- [ ] 2.2 Create `src/__tests__/unit/lib/api/services/contactLensMatrixService.test.ts` — ApiClient mock, test `calculate()` with various prescriptions (spherical, toric, multifocal), null params. **Mock**: `vi.mock("@/lib/api/client-helpers")`.
- [ ] 2.3 Create `src/__tests__/unit/lib/api/services/contactLensEncargoService.test.ts` — mock `global.fetch`, test `getAll()` with/without filters, `create()`, `updateStatus()` for each status enum, `delete()`, error handling on non-ok responses. **Mock**: `global.fetch`.

## PR 3 — Agreement + Contact Lens Inventory (~400 lines)

- [ ] 3.1 Create `src/__tests__/unit/lib/api/services/agreementService.test.ts` — ApiClient mock for 12 ApiClient-based functions (`getAgreements` with pagination fallback, `getAgreement`, CRUD, purchase orders, balances, reconcile, invoices, customers) + mock `global.fetch` for 2 raw-fetch functions (`updateAgreementStatus`, `getAgreementAnalytics`). **Mock**: dual — `vi.mock("@/lib/api/client-helpers")` + `global.fetch`.
- [ ] 3.2 Create `src/__tests__/unit/lib/api/services/contactLensInventoryService.test.ts` — ApiClient mock, test `getInventory()`, `checkStock()` across 4 branches (available/low-stock/unavailable/graduation-not-found), `createInventory()` success/null. Key: exercise the `cylinder` range matching in `checkStock`. **Mock**: `vi.mock("@/lib/api/client-helpers")`.

## PR 4 — Products Service (~400 lines)

- [ ] 4.1 Create `src/__tests__/unit/lib/api/services/products/service.test.ts` — mock `@/utils/supabase/server` returning a chainable Supabase client, test `ProductsService` class:
  - `listProducts`: organization filter, branch filter (`.or()`), search + post-process branch filter, all filter params (category, skinType, price range, featured, status, archived), sort validation fallback, pagination, lowStock/inStock/outOfStock post-filters
  - `getProductById`: found, not-found (`PGRST116`), access-denied
  - `createProduct`: validation errors (name, price), slug generation, unique slug retry, success
  - `updateProduct`: name change triggers slug regeneration, no-name-change skips slug
  - `deleteProduct`: existing product check + delete
  - Private helpers via exposed behavior: `generateSlug` normalization, `validateSortColumn` fallback, `ensureUniqueSlug` loop with excludeId
- **Mock**: `vi.mock("@/utils/supabase/server")` returning chained `.from().select().eq().order().range().single().limit()`.
