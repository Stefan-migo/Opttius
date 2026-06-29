# Proposal: test-ai-tools

## Intent

AI agent tools (`src/lib/ai/tools/`) are the highest-risk module in the system — the agent executes these against real data. 23 source files, only 2 test files. The existing analytics_tools test is `describe.skip`'d. The only passing test (`filtering.test.ts`) tests role-gating, not actual tool execution. Zero coverage on tool logic means regressions ship undetected.

## Scope

### In Scope
- Unit tests for **appointment tools** (4 tools: getAppointmentSlots, getAppointments, getBranchSchedule, rescheduleAppointment)
- Unit tests for **prescription tools** (2 tools: suggestLensFromPrescription, createPrescription)
- Unit tests for **customer tools** (6 tools: getCustomers, getCustomerById, updateCustomer, getCustomerOrders, getCustomerStats, deleteCustomer)
- Unit tests for **product tools** (6 tools: getProducts, getProductById, createProduct, updateProduct, getLowStockProducts, updateInventory)
- Tests cover input validation (Zod schemas), success paths, and known error paths (missing orgId, empty results, not-found)

### Out of Scope
- Integration tests with real Supabase — unit tests mock Supabase entirely
- Tests for less-used tools (analytics, orders, quotes, support, etc.) — future change
- Repairing the skipped analytics_tools test — separate change

## Capabilities

None — this change is pure test coverage, no behavioral or spec-level changes.

## Approach

One test file per tool module, co-located tests under `src/__tests__/unit/lib/ai/tools/`. Follow existing Vitest + vi.mock patterns from `filtering.test.ts`.

**Mocking strategy:**
- `vi.mock("@/lib/ai/tools/resolvers")` — all 4 tool modules depend on resolvers for branch/customer/prescription lookups
- `vi.mock("@/lib/presbyopia-helpers")` — prescription tool uses lens math helpers
- Supabase client is passed via `ToolExecutionContext` — supply a `vi.fn()`-based mock object with chainable `.from().select().eq()` etc.
- No real DB calls, no network — pure unit tests

**Test files to create:**
- `src/__tests__/unit/lib/ai/tools/appointments.test.ts`
- `src/__tests__/unit/lib/ai/tools/prescriptions.test.ts`
- `src/__tests__/unit/lib/ai/tools/customers.test.ts`
- `src/__tests__/unit/lib/ai/tools/products.test.ts`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/__tests__/unit/lib/ai/tools/appointments.test.ts` | New | Tests for appointment tools |
| `src/__tests__/unit/lib/ai/tools/prescriptions.test.ts` | New | Tests for prescription tools |
| `src/__tests__/unit/lib/ai/tools/customers.test.ts` | New | Tests for customer tools |
| `src/__tests__/unit/lib/ai/tools/products.test.ts` | New | Tests for product tools |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mock incompleteness — Supabase chain mock doesn't match actual query chain | Medium | Verify against actual tool code; add assertion on called `.from()` table name |
| Flaky time-dependent tests (date math, `new Date()`) | Low | Use `vi.useFakeTimers()` where needed |

## Rollback Plan

Delete the 4 test files. No production code changes — zero rollback risk.

## Dependencies

- None — pure test dependency (Vitest already configured)

## Success Criteria

- [ ] All 4 test files pass with `npx vitest run src/__tests__/unit/lib/ai/tools/`
- [ ] Coverage for `src/lib/ai/tools/` increases from ~5% to >40% (line coverage)
- [ ] No flaky tests — 3 consecutive runs pass
- [ ] Tests validate both success and error paths for each tool
