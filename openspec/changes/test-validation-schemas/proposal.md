# Proposal: test-validation-schemas

## Intent

API validation Zod schemas (`src/lib/validation/schemas/`) gate every mutation in Opttius — customers, products, POS, quotes, work orders. Zero test coverage on 5 out of 6 schema files means validation bugs (wrong required fields, missing transforms, broken refinements) ship silently. The existing `appointments.test.ts` proves the pattern works; extend it to the remaining high-traffic schemas.

## Scope

### In Scope
- Unit tests for `src/lib/validation/schemas/customers.ts` — `customerBaseSchema`, `createCustomerSchema`, `updateCustomerSchema`, `searchCustomerSchema`
- Unit tests for `src/lib/validation/schemas/products.ts` — `createProductSchema`, `updateProductSchema`, `searchProductSchema`
- Unit tests for `src/lib/validation/schemas/quotes.ts` — `createQuoteSchema`
- Unit tests for `src/lib/validation/schemas/pos.ts` — `processSaleSchema`, `createPaymentIntentSchema`, `pendingBalancePaySchema`
- Unit tests for `src/lib/validation/schemas/work-orders.ts` — `createWorkOrderSchema`
- Tests cover: required fields, optional fields, default values, type coercion, enum validation, min/max constraints, custom refinements, preprocess transforms, edge/null cases
- Each schema: 10-15 test cases following `appointments.test.ts` pattern (describe blocks: "field validation", "optional fields", enum/refine subsections)

### Out of Scope
- Schemas NOT in scope: `agreements.ts`, `lenses.ts`, `optical-support.ts`, `saas-support.ts`, `saas-management.ts`, `field-operations.ts` — deferred to separate change
- Integration tests — pure unit tests, no Supabase mocks needed since Zod schemas are pure functions
- No production code changes — tests only

## Capabilities

None — pure test coverage. No behavioral or spec-level changes.

## Approach

One test file per schema, co-located under `src/__tests__/unit/lib/validation/schemas/`. Follow the existing `appointments.test.ts` pattern exactly:

**Pattern:**
- `import { describe, expect, it } from "vitest"`
- Direct import of schemas via `@/lib/validation/schemas/<name>`
- `schema.safeParse()` for every assertion
- Group tests by concern: field validation, default values, enum values, refinements, edge cases
- Reusable `validPayload` object per schema for spread-based overrides

**Test files to create:**
- `src/__tests__/unit/lib/validation/schemas/customers.test.ts`
- `src/__tests__/unit/lib/validation/schemas/products.test.ts`
- `src/__tests__/unit/lib/validation/schemas/quotes.test.ts`
- `src/__tests__/unit/lib/validation/schemas/pos.test.ts`
- `src/__tests__/unit/lib/validation/schemas/work-orders.test.ts`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/__tests__/unit/lib/validation/schemas/customers.test.ts` | New | Tests for customer schemas (customerBaseSchema, create/update/search) |
| `src/__tests__/unit/lib/validation/schemas/products.test.ts` | New | Tests for product schemas (create/update/search) |
| `src/__tests__/unit/lib/validation/schemas/quotes.test.ts` | New | Tests for createQuoteSchema |
| `src/__tests__/unit/lib/validation/schemas/pos.test.ts` | New | Tests for processSaleSchema, createPaymentIntentSchema, pendingBalancePaySchema |
| `src/__tests__/unit/lib/validation/schemas/work-orders.test.ts` | New | Tests for createWorkOrderSchema |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Schema uses external utils (e.g. `isValidRUTFormat` in customerBaseSchema) | Low | Zod schemas import these at parse time — test will catch if they throw. If needed, `vi.mock("@/lib/utils/rut")` |
| `processSaleSchema` has 3 refinements (total calc, payment sum, agreement+PO) | Low | Test each refine independently with valid base + one bad field |

## Rollback Plan

Delete the 5 test files. No production code changed — instant revert.

## Dependencies

- Vitest already configured (`package.json` scripts, `vitest.config` exists)
- `appointments.test.ts` exists as reference pattern

## Success Criteria

- [ ] `npx vitest run src/__tests__/unit/lib/validation/schemas/` — all tests pass
- [ ] Each of the 5 test files has ≥10 test cases
- [ ] All existing tests still pass (`npm run test:run`)
- [ ] Coverage for `src/lib/validation/schemas/` increases measurably
