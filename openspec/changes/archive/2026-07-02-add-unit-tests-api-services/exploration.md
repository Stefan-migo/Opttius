## Exploration: add-unit-tests-api-services

### Current State

The project uses **Vitest** with `globals: true`, `jsdom` environment. Tests follow a co-located pattern in `src/__tests__/unit/lib/` mirroring source paths. The first change in Fase 5 (billing-errors-middleware) was archived today — it covered `errorService.ts`, `errors.ts`, `comprehensive-handler.ts`, all middleware files, and `payment-service.ts`.

**7 API service files ALREADY have tests** from the previous `test-api-services` change:
| File | Lines | Test | Lines |
|------|-------|------|-------|
| `appointmentService.ts` | 325 | ✅ `appointmentService.test.ts` | 440 |
| `customerService.ts` | 501 | ✅ `customerService.test.ts` | 442 |
| `productService.ts` | 592 | ✅ `productService.test.ts` | 389 |
| `quoteService.ts` | 412 | ✅ `quoteService.test.ts` | 442 |
| `orderService.ts` | 351 | ✅ `orderService.test.ts` | 445 |
| `posService.ts` | 417 | ✅ `posService.test.ts` | 461 |
| `errorService.ts` | 380 | ✅ `errorService.test.ts` | 277 |

**Total: 7 tested, 9 untested** (8 standalone files + `products/service.ts` subdirectory).

---

### Untested Service Files

#### 🔴 HIGH Priority

**1. `agreementService.ts` — 478 lines — MEDIUM difficulty**
- **Pattern**: ApiClient-based (8 functions) + raw fetch (2 functions: `updateAgreementStatus`, `getAgreementAnalytics`)
- **Exports**: `getAgreements`, `getAgreement`, `createAgreement`, `updateAgreement`, `updateAgreementStatus`, `getPurchaseOrders`, `createPurchaseOrder`, `updatePurchaseOrder`, `getInstitutionalBalances`, `reconcileBalances`, `getAgreementInvoices`, `getAgreementInvoice`, `getAgreementAnalytics`, `getAgreementCustomers` + barrel `agreementService` object
- **Complexity**: MEDIUM — 14 exported functions, mostly ApiClient wrappers. 2 functions use raw `fetch` (different mock). `getAgreements` and `getAgreementCustomers` have fallback pagination logic. `reconcileBalances` returns a complex nested response.
- **Why HIGH priority**: B2B agreements, purchase orders (OCs), institutional balance reconciliation — core business module.

**2. `products/service.ts` — 571 lines — HARD difficulty**
- **Pattern**: Supabase-dependent class (`ProductsService`)
- **Exports**: `ProductsService` class with `listProducts`, `getProductById`, `createProduct`, `updateProduct`, `deleteProduct` + private helpers (`validateSortColumn`, `filterProductsByBranch`, `filterLowStockProducts`, `filterInStockProducts`, `filterOutOfStockProducts`, `generateSlug`, `ensureUniqueSlug`)
- **Complexity**: **HARD** — Supabase chain mocking (`.from().select().eq().order().range().single()`), complex filtering/pagination logic, multi-tenant scoping (`organizationId`, `branchId`, `isSuperAdmin`), slug generation and uniqueness enforcement. The `listProducts` function alone is ~190 lines with 6 filter branches.
- **Why HIGH priority**: Core product management with complex business logic. Different mock pattern from ApiClient services.

**3. `notificationService.ts` — 355 lines — EASY difficulty**
- **Pattern**: Pure sonner wrappers
- **Exports**: `success`, `error`, `info`, `warning`, `loading`, `promise`, `custom`, `dismissAll`, `dismiss`, `successWithAction`, `errorWithAction`, `infoWithAction`, `warningWithAction`, `NotificationService` object, `toast` (re-export)
- **Complexity**: **EASY** — All functions delegate to `sonner` toast methods. Mock `sonner` module and verify delegation + option merging.
- **Why MEDIUM priority**: Used everywhere in the app for user-facing notifications, but trivial to test.

---

#### 🟡 MEDIUM Priority

**4. `contactLensInventoryService.ts` — 143 lines — EASY/MEDIUM difficulty**
- **Pattern**: ApiClient-based class + business logic
- **Exports**: `contactLensInventoryService` singleton with `getInventory`, `checkStock`, `createInventory`
- **Complexity**: MEDIUM — `checkStock` has real branching logic (sphere/cylinder range matching, quantity thresholds) plus a catch-all fallback. Worth testing the business logic paths.
- **Why MEDIUM**: Has actual business logic beyond CRUD wrapping.

**5. `contactLensEncargoService.ts` — 154 lines — EASY difficulty**
- **Pattern**: Raw `fetch` (no ApiClient)
- **Exports**: `contactLensEncargoService` object with `getAll`, `create`, `updateStatus`, `delete`
- **Complexity**: **EASY** — 4 CRUD methods, all use raw `fetch`. Different mock pattern than ApiClient (mock `globalThis.fetch`). Status transitions have a fixed enum.
- **Why MEDIUM**: Different fetch pattern means a separate mock setup.

---

#### 🟢 LOW Priority (Trivial Services)

**6. `contactLensFamilyService.ts` — 101 lines — EASY difficulty**
- **Pattern**: ApiClient-based class (identical pattern to `lensFamilyService`)
- **Exports**: `contactLensFamilyService` singleton with `getAll`, `getById`
- **Complexity**: **EASY** — 2 methods, both return data or null. Can be tested together with lensFamilyService in one file or separately.

**7. `contactLensMatrixService.ts` — 86 lines — EASY difficulty**
- **Pattern**: ApiClient-based class
- **Exports**: `contactLensMatrixService` singleton with `calculate`
- **Complexity**: **EASY** — 1 method. Smallest file in the services directory.

**8. `lensFamilyService.ts` — 96 lines — EASY difficulty**
- **Pattern**: ApiClient-based class
- **Exports**: `lensFamilyService` singleton with `getAll`, `getById`
- **Complexity**: **EASY** — 2 methods, identical structure to `contactLensFamilyService`. Very little business logic.

**9. `quoteSettingsService.ts` — 117 lines — EASY difficulty**
- **Pattern**: ApiClient-based class
- **Exports**: `quoteSettingsService` singleton with `get`, `update`
- **Complexity**: **EASY** — 2 methods, no business logic, thin ApiClient wrappers.

---

### Existing Test Pattern (from `appointmentService.test.ts`)

The reference pattern for ApiClient-based services:

```typescript
// 1. Mock ApiClient — share mock instance via globalThis
vi.mock("@/lib/api/client-helpers", () => {
  const client = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
  (globalThis as any).__aptMockClient__ = client;

  function isSuccess(r: Record<string, unknown>): boolean {
    return r?.success === true;
  }
  function unwrapData<T>(response: Record<string, unknown>): T {
    if (isSuccess(response)) return response.data as T;
    throw new Error((response?.error as any)?.message ?? "Unknown error");
  }

  class MockApiClient { constructor() { return client; } }
  return { ApiClient: MockApiClient, isSuccess, unwrapData };
});

// 2. Mock sonner if needed
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

// 3. Helper to get mock client
function getMockClient() { return (globalThis as any).__aptMockClient__; }

// 4. Arrange: set up mock return value
getMockClient().get.mockResolvedValue({ success: true, data: mockData, meta: { pagination: {...} } });

// 5. Act
const result = await someFunction(params);

// 6. Assert
expect(result.data).toEqual(expected);
expect(getMockClient().get).toHaveBeenCalledWith(expect.stringContaining("/api/admin/..."));
```

For **raw fetch** services (`contactLensEncargoService`): mock `global.fetch` directly.

For **Supabase-dependent** services (`products/service.ts`): mock `@supabase/supabase-js` and the chain pattern (`.from().select().eq().single()`). Reference: `root-middleware.test.ts` Supabase mock pattern.

---

### Summary

| Priority | File | Lines | Difficulty | Mock Pattern |
|----------|------|-------|------------|--------------|
| 🔴 HIGH | `agreementService.ts` | 478 | MEDIUM | ApiClient (8) + raw fetch (2) |
| 🔴 HIGH | `products/service.ts` | 571 | HARD | Supabase chain mock |
| 🔴 HIGH | `notificationService.ts` | 355 | EASY | Mock `sonner` |
| 🟡 MEDIUM | `contactLensInventoryService.ts` | 143 | MEDIUM | ApiClient + business logic |
| 🟡 MEDIUM | `contactLensEncargoService.ts` | 154 | EASY | Mock `global.fetch` |
| 🟢 LOW | `contactLensFamilyService.ts` | 101 | EASY | ApiClient |
| 🟢 LOW | `contactLensMatrixService.ts` | 86 | EASY | ApiClient |
| 🟢 LOW | `lensFamilyService.ts` | 96 | EASY | ApiClient |
| 🟢 LOW | `quoteSettingsService.ts` | 117 | EASY | ApiClient |

**Total untested lines:** 2,101 (8 files + 1 subdirectory)

### src/lib/ directories with 0 test coverage
- `src/lib/api/services/` — 8 untested files (core focus of this change)
- `src/lib/api/services/products/` — untested `service.ts` (571 lines, Supabase-dependent)
- All other `src/lib/` service-like directories have partial coverage (saas, billing, analytics, inventory all have some tests)

### Recommendation

**Build order:** notificationService → agreementService → contactLens*Services + lensFamilyService + quoteSettingsService → contactLensEncargoService → products/service.ts

1. **notificationService** first (easiest win, pure delegations)
2. **agreementService** (highest business value, but follow established ApiClient pattern)
3. **Small services** (contactLensFamily, contactLensMatrix, lensFamily, quoteSettings) — batch them, same pattern
4. **contactLensEncargoService** (raw fetch pattern — introduces new mock)
5. **contactLensInventoryService** (has actual business logic in `checkStock`)
6. **products/service.ts** (hardest — Supabase mock, complex logic, save for last)

### Ready for Proposal
**Yes.** Complete landscape mapped. Clear prioritization by business criticality and technical complexity. Existing test pattern documented.

Approach for proposal: Follow co-located pattern from `appointmentService.test.ts` exactly. Each file gets its own test. The `products/service.ts` will need a different mock strategy (Supabase chain vs ApiClient).
