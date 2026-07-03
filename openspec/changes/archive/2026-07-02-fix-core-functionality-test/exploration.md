## Exploration: fix-core-functionality-test

### Current State

The test suite has 167 test files across 4 main locations, with 2202 passing tests and 14 skipped. All currently-passing tests pass, BUT there are **52 vitest Worker exited unexpectedly** crashes during a full suite run. These are infrastructure-level crashes where vitest worker processes die — likely OOM, hang, or unhandled errors.

Three structural problems exist concurrently:
1. **Worker crashes** — test infrastructure instability
2. **Skipped tests** — 20 `describe.skip`/`it.skip` blocks from recent SDD cycles (billing-errors-middleware, api-services, remaining-modules)
3. **Incomplete tests** — weak assertions, `expect(true).toBe(true)`, mocks that test their own mock behavior

### Affected Areas

#### Worker Crash Sources (infra-level)

| File | Lines | Suspect Cause |
|------|-------|---------------|
| `src/app/admin/pos/components/POSAdvancedSale.char.test.tsx` | 725 | 18+ vi.mock calls + dynamic render + jsdom overhead |
| `src/app/api/admin/pos/process-sale/processSale.char.test.ts` | 764 | Largest test file, complex mock chains |
| `src/__tests__/unit/lib/api/services/agreementService.test.ts` | 719 | 10 vi.mock/vi.hoisted calls, globalThis shared state |
| `src/components/admin/CreateQuoteForm/__tests__/CreateQuoteForm.char.test.ts` | 690 | Multiple vi.mock + type check patterns |
| `src/__tests__/unit/lib/api/services/products/service.test.ts` | 683 | Complex mock service hierarchy |
| `src/lib/cash-register/__tests__/payment-aggregator.test.ts` | 539 | Complex integration mock patterns |
| `src/__tests__/unit/lib/errors/comprehensive-handler.test.ts` | 592 | Heavy error simulation |
| `src/tests/security/phase2-security.test.ts` | 821 | **DUPLICATE** of `src/__tests__/security/phase2-security.test.ts` (874 lines) — both included |
| `D:\proyect\Opttius-app\DproyectOpttius-appsrc__tests__unitliberrors_debug-import.test.ts` | 11 | **Corrupted filename** at project root — vitest may try to process it |

**Root causes for crashes:**
- **No pool/worker config** in `vitest.config.ts` — uses defaults, no `pool: 'forks'` or `pool: 'threads'` tuning, no `maxWorkers` limit. On a dev machine, vitest spawns workers aggressively.
- **jsdom environment for ALL tests** — including pure utility/type tests. Unnecessary DOM overhead.
- **Duplicate test files** — `src/tests/security/phase2-security.test.ts` and `src/__tests__/security/phase2-security.test.ts` both match `src/**/*.test.ts`, doubling a 874-line test.
- **Corrupt filename** — file at root level `D...debug-import.test.ts` created by a past encoding error.
- **`.import.test.tsx` files** — 3 files using `await import()` with 30s timeout per test, large components loaded dynamically.

#### Skipped Tests (20 blocks with `.skip`)

All have a `// ponytail: skipped — X; fix in Phase 1` comment linking to a root cause:

| # | File | Test Name | Root Cause |
|---|------|-----------|------------|
| 1 | `unit/components/ai/InsightCard.test.tsx` | "should call onFeedback when rated" | Component passes extra arg (5, undefined) |
| 2 | `integration/api/webhooks/nowpayments.test.ts` | "should process a valid webhook successfully" | Route crashes on valid webhook |
| 3 | `integration/api/webhooks/flow.test.ts` | **describe** "Flow Webhook API" | Route returns 500 on graceful errors |
| 4 | `unit/lib/ai/tools/analytics_tools.test.ts` | **describe** "Analytics Tools" | Mocks incomplete after code changes |
| 5 | `unit/lib/ai/insights/schemas.test.ts` | "should require at least one insight" | Schema relaxed to allow empty insights |
| 6 | `unit/lib/ai/insights/generator.test.ts` | "should throw error if no insights generated" | Generator no longer throws |
| 7 | `integration/ai/insights-generation.test.ts` | "should generate insights without maturity adaptation" | Output format changed |
| 8 | `components/.../useQuoteForm.test.ts` | "should initialize with default form data" | Hook formData changed |
| 9 | `lib/email/__tests__/template-variables.test.ts` | **describe** "getDefaultVariables" | Field names changed |
| 10 | `components/.../AppointmentDetails.test.tsx` | **describe** "AppointmentDetails" | Rendering changed |
| 11 | `components/.../CustomerSelection.test.tsx` | **describe** "CustomerSelection" | Rendering changed |
| 12 | `components/.../useScheduleSettings.test.ts` | **describe** "useScheduleSettings" | Hook behavior changed |
| 13 | `components/.../useAvailability.test.ts` | "should handle empty available slots response" | Hook crashes on null |
| 14 | `security/phase1-security.test.ts` | **describe** "Rate Limiting System" | isRateLimited returns object not boolean |
| 15 | `security/phase2-security.test.ts` | **describe** "Phase 2 Security" | API signatures changed |
| 16 | `security/phase3-security.test.ts` | **describe** "Phase 3 Security" | Import cycle in security module |
| 17 | `src/tests/security/phase2-security.test.ts` | **describe** "Phase 2 Security" | Same as #15 (duplicate file) |
| 18 | `integration/api/saas-management/support-tickets.test.ts` | **describe** (skipIf) | No Supabase infra |
| 19 | `integration/api/payments.test.ts` | **describe** (skipIf) | No Supabase infra |
| 20 | `integration/api/customers.test.ts` | **describe** (skipIf) | No Supabase infra |

#### Incomplete / Weak Tests

**Placeholder assertions:**
- `src/__tests__/unit/lib/saas/tier-config.test.ts:44` — `expect(true).toBe(true)` for unlimited tier case
- `src/__tests__/security/phase1-security.test.ts:169` — `expect(true).toBe(true)` placeholder

**`expect.any(String/Number/Object/Function)` (28 instances)** where specific values should be validated:
- `timestamp: expect.any(String)` in response/errors tests (3 files: `response.test.ts`, `errors.test.ts`, `error-handler.test.ts`)
- `expect.any(Object)` in service tests (11 files: `agreementService`, `customerService`, `orderService`, `posService`, `quoteService`, `productService`, `notificationService`, etc.)
- `expect.any(Error)` in error handler tests (3 files)
- `expect.any(Function)` in callback tests (3 files)

**Mock-that-tests-itself patterns:**
- `core-functionality.test.ts` — all tests mock `global.fetch` and test the mock response. They never exercise real API routes. 100% mock coverage of the network layer = 0% real validation.
- API service tests — every test mocks `ApiClient` methods, `sonner`, `errorService`, and `global.fetch`. The tests validate mock interactions, not actual service behavior.
- `.import.test.tsx` files (3 files, 11 tests) — only check that dynamic imports resolve. No real validation.

**Tests with only `toBeDefined()` assertions:**
- `admin-navigation.test.ts` — type exports only
- `SupportMetrics.import.test.tsx` — module exports only
- `DashboardCharts.import.test.tsx` — module exports only

**Empty test body:**
- `InsightCard.test.tsx:63` — `it.skip("should call onFeedback when rated", () => {})` — empty body

**Characterization tests (`.char.test.ts`, 4 files):**
- Type/interface validation only — not behavioral tests
- `CreateQuoteForm.char.test.ts` (690 lines) — types, constants, formatting
- `cashRegister.char.test.ts` (546 lines) — types, constants, formatting
- `POSAdvancedSale.char.test.tsx` (725 lines) — component with 18+ mocks
- `processSale.char.test.ts` (764 lines) — API handler characterization

### Approaches

1. **Surgical fix — unstuck workers, fix skipped tests inline**
   - Add `pool: 'forks'`, `maxWorkers: 2`, and `testTimeout: 30000` in vitest config
   - Set per-environment: pure unit tests use `environment: 'node'` instead of jsdom
   - Delete duplicate `src/tests/security/phase2-security.test.ts`
   - Delete corrupt root-level `D...debug-import.test.ts` file
   - Fix each skipped test by updating assertions to match current behavior
   - Replace `expect(true).toBe(true)` and weak matchers with real validation
   - Pros: Fixes crashes immediately, clears all debt in one pass
   - Cons: 20 skipped items to fix, each requires understanding what changed
   - Effort: Medium-High

2. **Minimal — only stop crashes, defer incomplete tests**
   - Add `pool: 'forks'` + `maxWorkers` + per-env config (same as approach 1 infra fixes)
   - Delete duplicate file and corrupt file
   - Do NOT fix any skipped tests — leave them as-is
   - Do NOT strengthen weak assertions (mark as `ponytail:` debt entries)
   - Pros: Fastest path, 0 risk of breaking passing tests
   - Cons: Debt accumulates, skipped tests stay skipped, weak tests stay weak
   - Effort: Low

3. **Targeted — fix crashes + group skipped tests by root cause**
   - Same infra fixes as approaches 1+2
   - Group the 20 skipped blocks into categories:
     - **Group A: Simple assertion updates** (InsightCard, schemas, generator) — fix inline
     - **Group B: Module-level changes** (phase security tests, email, webhooks) — need code inspection first
     - **Group C: External infra dependent** (skipIf tests) — leave as-is, document
     - **Group D: Route behavior changed** (flow, nowpayments) — need to update mocks
   - Fix Group A immediately, defer Groups B+D to separate SDD change
   - Add proper environment config per test file
   - Pros: Balances fix speed with meaningful progress, clear grouping for later
   - Cons: Group B+D items stay skipped; need a follow-up change
   - Effort: Medium

### Recommendation

**Approach 3 (Targeted)** — for these reasons:

1. The worker crashes are THE priority — 52 crashes make the test suite unreliable. The infra fixes (`pool: 'forks'`, `maxWorkers`, per-environment config, duplicate + corrupt file cleanup) are essential regardless.
2. The skipped tests have a clear pattern: most are `// ponytail: skipped — fix in Phase 1`. Group A (simple assertion updates) can be fixed quickly with low risk. Groups B+D need deeper code investigation and should be a separate change.
3. The weak assertion improvements (`expect.any` → specific values, `expect(true).toBe(true)` → real validation) should be done opportunistically when fixing skipped tests in the same file — don't create a separate "strengthen assertions" pass.
4. The `.import.test.tsx` files with 30s timeouts should be reduced to 10s to avoid blocking workers.

### Delivery Strategy

- **Worker crashes fix**: Config changes only — `pool: 'forks'`, `maxWorkers: 3`, per-environment config, delete duplicate + corrupt files. Low risk.
- **Skipped tests Group A** (5 tests): Fix inline — update assertions to match current code. Low risk.
- **Weak assertions**: Fix opportunistically in files visited for Group A. Replace `expect(true).toBe(true)` and tighten `expect.any()` where trivial.
- **`.import.test.tsx` timeout reduction**: Change 30s → 10s.
- **Remaining skipped tests** (Groups B+D, ~12 blocks): Defer to a follow-up change.

### Risks

- **Worker crash config changes might not resolve all 52 crashes** — need to run full suite to verify. Some crashes may be genuine OOM from the largest test files that need file-level splitting.
- **Fixing skipped tests could break if the underlying code changed** since the `// ponytail:` comment was written — each fix needs verification against current code.
- **Changing `expect.any(String)` to specific values** could introduce false failures if the value format is variable (e.g., timestamps). Only tighten where format is predictable.
- **Per-environment config** (`environment: 'node'` for pure unit tests) could break tests that rely on jsdom globals indirectly.
- **Deleting `src/tests/security/phase2-security.test.ts`** means losing the alternative version — validate that `src/__tests__/security/phase2-security.test.ts` is the correct one to keep.

### Ready for Proposal

Yes. The infra fixes (worker crashes) are well-understood and low-risk. The skipped test fix scoping is clear. Proceed to sdd-propose with **Approach 3 (Targeted)**.
