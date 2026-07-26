# TypeScript Error Exploration Report — Opttius

> **Date**: 2026-07-25
> **Total Errors**: 4,353 (confirmed via `npx tsc --noEmit`)  
> **Source lines**: 5,386 (includes multi-line diagnostics)  
> **Files affected**: 916  
> **`as unknown` casts**: 655  
> **`@ts-expect-error`**: 48

---

## Phase 1: Catalog by Error Type

### Full Error Code Distribution

| Error Code | Count | % of Total | Description |
|-----------|-------|-----------|-------------|
| **TS18046** | 1,624 | 37.3% | `'x' is of type 'unknown'` |
| **TS2339** | 1,437 | 33.0% | Property does not exist on type |
| **TS2345** | 580 | 13.3% | Argument not assignable to parameter |
| TS2571 | 180 | 4.1% | Object is of type 'unknown' |
| TS2769 | 129 | 3.0% | No overload matches this call |
| TS2322 | 126 | 2.9% | Type not assignable |
| TS2698 | 47 | 1.1% | Spread types only from object types |
| TS2352 | 45 | 1.0% | Conversion of type may be mistake |
| TS2304 | 23 | 0.5% | Cannot find name |
| TS2349 | 19 | 0.4% | Expression not callable |
| TS2344 | 19 | 0.4% | Type doesn't satisfy constraint |
| TS2459 | 14 | 0.3% | Declared locally, not exported |
| TS2724 | 13 | 0.3% | |"
| TS7053 | 9 | 0.2% | Element implicitly has 'any' type |
| TS7006 | 9 | 0.2% | Parameter implicitly has 'any' type |
| TS2561 | 9 | 0.2% | Object literal may only specify known properties |
| TS2554 | 9 | 0.2% | Expected X arguments but got Y |
| Other | 31 | 0.7% | TS2538, TS2305, TS2365, TS2551, TS2582, etc. |
| **Total** | **4,353** | **100%** | |

---

## TS18046 — Detailed Classification (1,624 errors)

### Category 1: Catch Block Variables (124 errors)

**Pattern**: `catch (error/err/e)` then accessing `error.message`, `error.code`, etc.

```typescript
catch (error: unknown) {
  error.message   // TS18046
}
```

**Root files**:
- `src/lib/errors/comprehensive-handler.ts` (lines 48-56, 51-57): `handleDatabaseError(error: unknown)` accesses `.message`, `.hint`, `.details`, `.code`, `.constraint`, `.column`
- `src/lib/errors/error-classes.ts` (line 8): Construction with cause
- `src/lib/backup-service.ts` (lines 253, 259, 343, 345)
- `src/lib/saas-backup-service.ts` (lines 124, 135)

### Category 2: Validation Middleware (235 errors)

**Pattern**: `validatedBody` / `body` / `query` / `requestBody` typed as `unknown` then properties accessed

| Variable | Count | Primary File |
|----------|-------|-------------|
| `validatedBody` | 114 | `src/lib/api/services/adminQuoteService.ts` (bulk) |
| `body` | 76 | Various API routes with `request.json()` without typing |
| `query` | 39 | API routes with `url.searchParams` without typing |
| `validatedData` | 3 | `src/lib/validation/middleware.ts` |
| `requestBody` | 3 | Various |

**Root cause**: `src/lib/validation/middleware.ts` line 258:
```typescript
const validatedData: unknown = {};
// Then:
validatedData.body = schemas.body.parse(body);  // TS18046
```

### Category 3: Supabase `as unknown` Cascade (202 errors)

**Pattern**: `.single() as unknown` / `.select() as unknown` — then accessing `.data`, `.error` on result

| Variable | Count | Primary Pattern |
|----------|-------|----------------|
| `updateData` | 105 | `supabase.from().update({...}).select().single() as unknown` |
| `row` | 47 | `.select().single() as unknown` in backup-service |
| `result` | 21 | `.rpc() as unknown` / general supabase results |
| `updates` | 24 | Bulk update records cast as unknown |
| `update` | 3 | Destructured from supabase response |
| `data` | 2 | Supabase select result |

**Root cause**: `as unknown` cast on the entire supabase query chain, which destroys all type information. The result becomes `unknown`, and every subsequent `.data`, `.error`, or property access triggers TS18046 or TS2339.

**Top files**:
- `src/lib/api/services/adminQuoteService.ts` — 31 `as unknown` casts
- `src/lib/api/services/dashboardAnalyticsService.ts` — 24
- `src/lib/api/services/appointmentDetailService.ts` — 20
- `src/lib/api/services/adminProductService.ts` — 17
- `src/lib/api/services/systemConfigService.ts` — 16

### Category 4: Iteration Callbacks (409 errors)

**Pattern**: Callback parameters in `.map()`, `.filter()`, `.reduce()`, `.forEach()` without type annotations

| Var | Count | Common Context |
|-----|-------|---------------|
| `p` | 82 | `products.map((p) => ...)` / `array.filter((p) => ...)` |
| `o` | 70 | `orders.map((o) => ...)` |
| `a` | 43 | Various |
| `b` | 37 | Various |
| `c` | 48 | `customers.map((c) => ...)` / categories |
| `r` | 27 | `result.map((r) => ...)` |
| `t` | 24 | `tickets.map((t) => ...)` |
| `f` | 21 | Various |
| `q` | 14 | `quotes.map((q) => ...)` |
| `i` | 13 | Index variable |
| `e` | 12 | Various |
| Others | 18 | `x`, `s`, `u`, `v` |

### Category 5: Named Business Variables (501 errors)

| Variable | Count | Typical Source |
|----------|-------|---------------|
| `product` | 66 | `products.map((product) => ...)` / `as unknown` cascade |
| `order` | 66 | `orders.map((order) => ...)` / destructured from unknown |
| `item` | 51 | `.map((item) => ...)` / generic list iteration |
| `appointment` | 26 | Appointment-related queries |
| `payment` | 23 | Payment processing |
| `customer` | 21 | Customer queries |
| `user` | 18 | Auth/user queries |
| `ticket` | 18 | Support ticket queries |
| `branch` | 17 | Branch queries |
| `quote` | 14 | Quote queries |
| `frame` | 14 | Product frame queries |
| `prescription` | 9 | Prescription queries |
| `workOrder` / `wo` | 9 | Work order queries |
| `material` | 12 | Lens material |
| Others | 141 | `tc`, `cnm`, `msg`, `bc`, `acc`, `sub`, `stat`, `cat`, `cn`, `guestCustomerData`, `lensInfoRecord`, `backupData`, `sanitized`, `branchContext`, etc. |

---

## TS2339 — Detailed Classification (1,437 errors)

### Subtype 1: Property on `'never'` (732 errors — 51%)

**Pattern**: `supabase.from("table")` where `"table"` is a string variable, not a literal → result is `never`

```typescript
const tableName = someCondition ? "orders" : "quotes";
supabase.from(tableName).select("id")  // error TS2339 on never
```

**Top files**:
- `src/app/api/admin/work-orders/route.ts` — 24
- `src/app/api/admin/orders/[id]/route.ts` — 24
- `src/app/api/admin/work-orders/[id]/status/route.ts` — 23
- `src/app/api/admin/orders/[id]/cancel/route.ts` — 21
- `src/app/api/admin/products/import/route.ts` — 20
- `src/app/api/admin/support/tickets/route.ts` — 19
- `src/app/api/admin/agreements/[id]/invoices/[invoiceId]/pdf/route.ts` — 18
- Many more API route files with 10-18 errors each

### Subtype 2: Property on `'{}'` (444 errors — 31%)

**Pattern**: Destructuring or accessing properties on an empty object type (comes from `as unknown` cascade → `as {}` pattern or default generic parameter)

```typescript
const { data } = await supabase.from("orders").select() as unknown as {};
data.id  // Property 'id' does not exist on type '{}'
```

**Top properties accessed**:
- `id` — 70 times
- `message` — 19
- `data` — 13
- `order_payments` — 11
- `error` — 11
- `total_amount` — 9
- `name` — 9
- `status` — 8
- `organization_id` — 8
- `payment_status` — 7
- `success` — 6
- `mp_payment_method` — 6
- `issues` — 6
- `created_at` — 6

### Subtype 3: Property on `'unknown'` (156 errors — 11%)

**Pattern**: `as unknown` cast result, then property access without narrowing

### Subtype 4: Other (105 errors — 7%)

Includes `SelectQueryError`, `PaymentService`, `ResultOne`, `PostgrestQueryBuilder`, etc.

---

## TS2345 — Detailed Classification (580 errors)

| Pattern | Count | Description |
|---------|-------|-------------|
| `IsAdminParams` → `undefined` | 128 | `.rpc("is_admin", params as IsAdminParams)` — TypeScript doesn't accept because RPC expects `undefined` |
| `Record<string, unknown>` → `ToolExecutionContext` | 54 | AI tool context typing |
| `{ user_id: string }` → `undefined` | 26 | same as IsAdminParams |
| `string | null` → `{}` | 25 | null not assignable to string params |
| Supabase client type mismatch | 49 | Generic type param mismatch on `createClientFromRequest<T>` |
| `unknown` → specific types | 38 | Various untyped values passed to typed functions |
| `number | null` → `number` | 9 | Email formatting |
| `any` → `never` | 8 | From `as unknown` cascade |

---

## TS2571 — 'Object is of type unknown' (180 errors)

**Top files**:
- `src/components/admin/CreateQuoteForm/CreateQuoteFormCustomerSection.tsx` — 17
- `src/components/admin/CreateQuoteForm/CreateQuoteFormFrameSection.tsx` — 16
- `src/lib/api/services/systemConfigService.ts` — 12
- `src/components/admin/CreateQuoteForm/useQuoteSubmit.ts` — 10
- Various test files — ~26

---

## Phase 2: Root Cause Analysis

### Root Cause 1: The `as unknown` Epidemic (HIGHEST IMPACT)

**Affects**: ~1,800+ errors (TS18046 + TS2339 + TS2571 cascade)

**Pattern**:
```typescript
const { data, error } = await supabase
  .from("quotes")
  .select("*")
  .eq("id", id)
  .single() as unknown;  // ← destroys all type info
```

**Why it exists**: Developers couldn't resolve Supabase's strict typing (especially with `.single()` returning `{ data: T | null, error: PostgrestError | null }` vs `{ data: T, error: null } | { data: null, error: PostgrestError }`), so they used `as unknown` to escape.

**Cascade effect**: Once `x` is `unknown`:
1. `x.message` → TS18046
2. `x as {}` then `x.id` → TS2339 on `'{}'`
3. Pass to function expecting typed param → TS2345
4. `x ? [x].map(p => ...)` → TS18046 on `p`

**Fix approach**: Replace `as unknown` with proper type assertions using the generated `Database` types. Use `Tables<'quotes'>['Row']` or supabase-generated types.

**645 unique `as unknown` casts** across the codebase (that's the epicenter).

### Root Cause 2: Unparameterized Iteration Callbacks

**Affects**: ~500 errors (TS18046 in .map()/.filter() callbacks)

**Pattern**:
```typescript
orders?.filter((o) => {  // 'o' is unknown because 'orders' is unknown
  const orderDate = new Date(o.created_at);  // TS18046
});
```

**Fix**: Upstream fix (Root Cause 1) eliminates most of these. Only ~50 need standalone generic typing.

### Root Cause 3: Validation Middleware Design Flaw

**Affects**: ~117 errors in `src/lib/validation/middleware.ts` + all `validatedBody` usage

**Pattern**: `const validatedData: unknown = {}` then property assignment

```typescript
const validatedData: unknown = {};
validatedData.body = schemas.body.parse(body);  // TS18046
```

**Fix**: Change to `Record<string, unknown>` or better, a typed generic approach.

### Root Cause 4: IsAdminParams RPC Typing Issue

**Affects**: 128 TS2345 errors

**Pattern**:
```typescript
supabase.rpc("is_admin", { user_id: user.id } as IsAdminParams)
```

Supabase's generated RPC typing doesn't match the defined `IsAdminParams` type. The RPC function expects a `json` parameter, not the structured type.

**Fix**: Cast to `any` at the RPC boundary or fix the RPC type definition in generated types.

### Root Cause 5: Dynamic Table Name Access (TS2339 on 'never')

**Affects**: 732 TS2339 errors

**Pattern**: `supabase.from(tableNameString)` where `tableNameString` is a variable, not a string literal

**Fix**: Use `as const` or a typed table name map, or cast through `any` at the access point.

### Root Cause 6: `createClientFromRequest<T>` Generic Mismatch

**Affects**: 49 TS2345 + 4 TS2322 SupabaseClient type errors

**Pattern**:
```typescript
export async function createClientFromRequest<T = Database>(...) 
// returns SupabaseClient<T> but callers pass Database directly
```

The generic `T` creates an inference issue. `SupabaseClient<Database>` is not assignable to `SupabaseClient<T>`.

---

## Phase 3: Module Distribution

| Module | Errors | Files | `as unknown` | Primary Error Type |
|--------|-------|-------|-------------|-------------------|
| `src/app/api/` | 2,109 | 241 | 109 | TS2339 on 'never' (dynamic `.from()`) |
| `src/lib/api/` | 587 | 17 | 129 | TS18046 + TS2339 from `as unknown` |
| `src/lib/ai/` | 549 | 81 | 17 | TS18046 (iteration callbacks) + TS2345 (ToolExecutionContext) |
| `src/components/admin/` | 495 | 48 | 118 | TS18046 + TS2571 (from `as unknown` cascade) |
| `src/app/admin/` | 379 | 71 | 55 | TS18046 + TS2339 |
| `src/lib/email/` | 55 | 9 | 1 | TS18046 + TS2322 (type mismatch) |
| `src/lib/saas/` | 21 | 1 | 0 | TS2769 + TS2339 (missing table in generated types) |
| `src/lib/cash-register/` | 13 | 2 | 1 | TS18046 (from unknown) |
| `src/lib/errors/` | 10 | 2 | 1 | TS18046 (catch block) |
| `src/lib/telemetry/` | 8 | 2 | 0 | TS18046 + TS2698 |
| `src/lib/payments/` | 5 | 3 | 5 | TS18046 |
| `src/lib/validation/` | 4 | 1 | 0 | TS18046 (validatedData pattern) |
| `src/lib/supabase/` | 4 | 1 | 0 | TS2322 (generic mismatch) |
| `src/lib/notifications/` | 4 | 1 | 2 | TS2769 |
| `src/lib/billing/` | 3 | 1 | 3 | TS2571 |
| `src/types/` | 2 | 1 | 0 | TS2300 (duplicate identifier) |
| `src/utils/` | 2 | 1 | 0 | TS2322 (generic mismatch) |
| `e2e/` | 8 | 2 | 0 | TS2339 on 'never' |
| Other | 74 | ~35 | | Various |
| **Total** | **~4,353** | **916** | **655** | |

---

## Phase 4: Effort Estimation

### Dependency Graph (Fix Order)

```
Fix 1: as unknown removal (root cause #1)
  ├── Unblocks: ~1,800 TS18046 + TS2339 + TS2571 errors
  ├── Unblocks: ~409 iteration callback TS18046 (indirect)
  └── Requires: proper type generation + Tables<> usage

Fix 2: createClientFromRequest<T> generic fix (root cause #6)
  ├── Unblocks: ~53 SupabaseClient type errors
  ├── Small scope: 2 files (server.ts x2)
  └── Independent from Fix 1

Fix 3: IsAdminParams RPC type (root cause #4)
  ├── Unblocks: 128 TS2345 errors
  ├── Small scope: cast at RPC boundary
  └── Can be done independently

Fix 4: Validation middleware typing (root cause #3)
  ├── Unblocks: ~117 errors (validatedBody cascade)
  ├── Small scope: 1 file (middleware.ts) + ~10 consumer files
  └── Can be done independently

Fix 5: Dynamic table name (root cause #5)
  ├── Unblocks: 732 TS2339 on 'never'
  ├── Large scope: ~200 API route files
  └── Pattern: consistent fix for string-literal table access
```

### Effort by Category

| Category | Files | Lines to Change | Risk | Dependencies |
|----------|-------|----------------|------|-------------|
| **A. `as unknown` removal** (Root Cause 1) | ~180 files | ~1,500-2,000 | **HIGH** | None (can be systematic) |
| **B. `createClientFromRequest<T>`** (Root Cause 6) | 2 files | ~10 | **LOW** | None |
| **C. IsAdminParams RPC typing** (Root Cause 4) | ~130 files | ~130 | **LOW** | None |
| **D. Validation middleware** (Root Cause 3) | ~15 files | ~30 | **LOW** | None |
| **E. Dynamic table name** (Root Cause 5) | ~200 files | ~200 | **MEDIUM** | None |
| **F. Remaining standalone** | ~300 files | ~500 | **LOW-MED** | After A |

### Recommended Strategy

1. **Phase A** (highest ROI): Remove `as unknown` systematically across ~180 files. This eliminates ~41% of all errors (1,800 out of 4,353) in one sweep.

2. **Phase B+C+D** (low-hanging fruit): Fix the RPC typing, client generic, and validation middleware. These are small, safe, independent changes that remove ~300 more errors.

3. **Phase E** (medium effort): Fix dynamic table name access. Pattern: create a helper that casts `supabase.from()` through a table name map.

4. **Phase F** (mopping up): Remaining ~500 standalone errors across files.

**Total estimated work**: 5-8 focused PRs over 2-3 sessions.

---

## Key Files to Read for SDD Proposal

| File | Errors | Key Pattern |
|------|--------|------------|
| `src/lib/api/services/adminQuoteService.ts` | 176 | 31 `as unknown` casts in 499 lines |
| `src/lib/api/services/adminProductService.ts` | 98 | 17 `as unknown` casts in 260 lines |
| `src/lib/api/services/dashboardAnalyticsService.ts` | 63 | 24 `as unknown` casts in 416 lines |
| `src/lib/api/services/appointmentDetailService.ts` | 55 | 20 `as unknown` casts |
| `src/lib/ai/insights/prepare-data.ts` | 53 | Iteration callback (`o: unknown` pattern) |
| `src/lib/supabase/server.ts` | 4 | Generic mismatch on `createClientFromRequest<T>` |
| `src/lib/validation/middleware.ts` | 4 | `validatedData: unknown = {}` |
| `src/lib/errors/comprehensive-handler.ts` | 10 | `error: unknown` access |
| `src/types/supabase.ts` | 2 | Duplicate `SupabaseClient` export |
