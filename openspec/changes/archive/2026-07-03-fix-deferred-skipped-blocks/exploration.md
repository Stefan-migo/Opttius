## Exploration: fix-deferred-skipped-blocks

### Current State

This is a follow-up to the archived `fix-core-functionality-test` change. The first pass fixed 5 Group A tests (simple assertion updates) and infra issues (pool config, duplicate files, corrupt filenames). **11 remaining skipped test blocks** from Groups B and D still need fixes:

- **Group B** (9 blocks): Module-level changes — API signatures shifted, rendering changed, hooks evolved
- **Group D** (2 blocks): Route behavior changed — webhook routes use different import/mock patterns

All 11 are `describe.skip` / `it.skip` with `// ponytail: skipped — X; fix in Phase 1` comments.

### Per-Block Analysis

| # | File | Line | Test Name | Root Cause | Fix Type | Effort |
|---|------|------|-----------|------------|----------|--------|
| 1 | `src/__tests__/unit/lib/ai/tools/analytics_tools.test.ts` | 30 | **describe** "Analytics Tools" | Mock context has `userId` instead of `organizationId`; mock supabase chain doesn't match actual query patterns; tools expect `context.organizationId` | **Complex** | ~45 min |
| 2 | `src/__tests__/security/phase1-security.test.ts` | 221 | **describe** "Rate Limiting System" | `isRateLimited` now returns object `{limited, remaining, resetTime, current}` not boolean; test at line 265 expects `result.toBe(true)`; error-path mock uses old Redis API (`incr`/`expire` vs `zremrangebyscore`/`zadd`/`zcard`) | **Medium** | ~20 min |
| 3 | `src/__tests__/security/phase2-security.test.ts` | 44 | **describe** "Phase 2 Security" | Severity-to-logger mapping changed: `low→debug`, `medium→info`, `high→warn`, `critical→error`; tests expect `appLogger.info` for low severity; `monitor.logEvent(event as unknown)` signature violation; `flushEvents` message changed; `sendAlert` format changed | **Complex** | ~40 min |
| 4 | `src/__tests__/security/phase3-security.test.ts` | 38 | **describe** "Phase 3 Security" | Mock `@/lib/security` returns `{}` for all exports; behavioralAnalytics/incidentResponse/threatDetector are empty objects — any method call throws; mock approach fundamentally broken for actual method calls | **Complex** | ~60 min |
| 5 | `src/components/admin/CreateQuoteForm/__tests__/useQuoteForm.test.ts` | 33 | "should initialize with default form data" | `DEFAULT_FORM_DATA` now includes `customer_own_near_frame: false` — missing field in expected `.toEqual()` | **Simple** | ~5 min |
| 6 | `src/components/admin/CreateAppointmentForm/__tests__/useScheduleSettings.test.ts` | 21 | **describe** "useScheduleSettings" | Hook takes optional `props` param; `ScheduleSettings` interface changed (flat `working_days[]` + `start_time`/`end_time` instead of nested `working_hours{}`); mock auth has `user: null` so hook returns early; API response is `data.data ?? data.settings`; uses `getBranchHeader()` instead of raw `x-branch-id` | **Medium** | ~25 min |
| 7 | `src/components/admin/CreateAppointmentForm/__tests__/AppointmentDetails.test.tsx` | 7 | **describe** "AppointmentDetails" | Component rendering changed to shadcn/ui Select + Card layout; `getByRole("combobox")` finds 2 Selects (type + status); Radix Select doesn't render items in DOM until open; some label text changed | **Medium** | ~25 min |
| 8 | `src/components/admin/CreateAppointmentForm/__tests__/CustomerSelection.test.tsx` | 13 | **describe** "CustomerSelection" | Component rendering changed — portal-based dropdown, switch label "Cliente Registrado" is inside component; onGuestModeToggle receives switch's `onCheckedChange` value directly; `customerSearch` now >= 1 for dropdown | **Medium** | ~25 min |
| 9 | `src/components/admin/CreateAppointmentForm/__tests__/useAvailability.test.ts` | 326 | "should handle empty available slots response" | Hook crashes on `scheduleSettings` being null/undefined when accessing `scheduleSettings.min_advance_booking_hours` in a template literal; the mock setup gives valid settings so the "empty slots" test should actually work IF the hook doesn't crash — root cause may be elsewhere (e.g. `getBranchHeader` import in test environment) | **Simple** | ~10 min |
| 10 | `src/__tests__/integration/api/webhooks/flow.test.ts` | 46 | **describe** "Flow Webhook API" | Route uses `new FlowGateway()` (not `PaymentGatewayFactory.getGateway("flow")`) and `new PaymentService(supabase)` from `@/lib/payments/flow/gateway` and `@/lib/payments/services/payment-service` — mocks of `@/lib/payments` don't intercept these imports; `createWebhookClient()` not mocked | **Complex** | ~45 min |
| 11 | `src/__tests__/integration/api/webhooks/nowpayments.test.ts` | 54 | "should process a valid webhook" | Route imports `PaymentService` from `@/lib/payments/services/payment-service` (not `@/lib/payments`); mock only covers `@/lib/payments`; `createWebhookClient()` not mocked; real Supabase client creation fails | **Medium** | ~25 min |

### Detailed Fix Notes

#### #1 — analytics_tools.test.ts (Complex, ~45 min)

**Root cause**: The AI tool source code uses `context.organizationId` but the test provides `context.userId`. Supabase query chain patterns also changed (e.g. `.from("order_items").select("...").gte(...).order(...)`). Three separate tools with different query patterns.

**Fix needed**:
1. Add `organizationId: "test-org-id"` to `mockContext`
2. Rewrite supabase mock to properly simulate supabase-js thenable builder pattern per tool
3. Alternatively: refactor tools to accept a test-friendly context or use a test helper for supabase mocking

**Ponytail option**: The tools are already tested indirectly through integration tests. Consider converting this to simplified smoke tests (just verify tool.execute returns object with `success` property) rather than full behavioral tests.

#### #2 — phase1-security.test.ts (Medium, ~20 min)

**Root cause**: `isRateLimited` now returns `{ limited: boolean, remaining: number, resetTime: number, current: number }` instead of a boolean. Line 265: `expect(result).toBe(true)` fails. Mock `mockImplementationOnce` uses old Redis API (`incr`/`expire` vs `zremrangebyscore`/`zadd`/`pexpire`/`zcard`).

**Fix needed**:
1. Line 265: Change `expect(result).toBe(true)` → `expect(result.limited).toBe(true)`
2. Fix error-path mock to match current Redis API methods
3. Verify `mockImplementationOnce` is applied before `rateLimiter` constructor call (currently `rateLimiter` is created in `beforeEach` before the mock takes effect — need to create `rateLimiter` AFTER setting up the error mock)

#### #3 — phase2-security.test.ts (Complex, ~40 min)

**Root cause**: `SecurityMonitor.logToAppLogger()` severity-to-logger mapping changed:
| Severity | Old logger method | New logger method |
|----------|------------------|-------------------|
| low | info | debug |
| medium | warn | info |
| high | warn | warn (unchanged) |
| critical | error | error (unchanged) |

Tests expect all old mappings. Additionally:
- `monitor.logEvent(event as unknown)` in bulk tests passes a full `SecurityEvent` object as the first arg (`eventType`), which violates `logEvent(eventType: SecurityEventType, ...)`
- `sendAlert("title", "desc", severity, events, actions)` — alerting system logs `channelCount` based on eligible channels, not all channels
- `flushEvents()` log message format changed from "Security events flushed" to "... flushed successfully" or similar
- Deduplication at line 434: expects `appLogger.debug` with "Alert deduplicated" — but dedup is inside `sendAlert` which already logs "Sending security alert" with `appLogger.info`

**Fix needed**: Comprehensive assertion updates across all describe blocks. Add `severity` to `logEvent` options where tests pass `"high"` severity. Fix bulk event calls that use `event as unknown`.

#### #4 — phase3-security.test.ts (Complex, ~60 min)

**Root cause**: `vi.mock("@/lib/security", () => ({...}))` replaces all exports with `{}`. But `behavioralAnalytics`, `incidentResponse`, `threatDetector` are empty objects. Any call like `behavioralAnalytics.recordUserAction(...)` throws TypeError. The mock was added to avoid the import cycle (`@/lib/security/index.ts` ↔ `@/lib/security/phase3-integration.ts` which imports from several modules).

**Two approaches**:
1. **Mock properly**: Replace empty `{}` mocks with `vi.fn()` stubs for each method used in tests (recordUserAction, getUserBaseline, analyzeUserBehavior, etc.)
2. **Skip permanently**: These tests test speculative Phase 3 components (behavioral analytics, threat detection) that may never be fully implemented. The actual `phase3-integration.ts` orchestrator is real but the sub-modules it wraps may not have real implementations.

**Recommended**: Approach 2 — these are characterization/skeleton tests for future features. If the Phase 3 security features are real, use approach 1 with proper method mocks.

#### #5 — useQuoteForm.test.ts (Simple, ~5 min)

**Root cause**: `DEFAULT_FORM_DATA` now includes `customer_own_near_frame: false` (line 85 of source). Test expects exact `toEqual()` match at line 36-97.

**Fix needed**: Add `customer_own_near_frame: false` to the expected object in the `toEqual()` call at line 36.

#### #6 — useScheduleSettings.test.ts (Medium, ~25 min)

**Root cause**: Multiple differences between test assumptions and current hook:
1. Hook now takes optional `props?: UseScheduleSettingsProps` parameter
2. `ScheduleSettings` interface: flat fields (`working_days: string[]`, `start_time: string`, `end_time: string`, `slot_duration_minutes: number`) instead of nested `working_hours: { monday: { open, close, is_working_day }, ... }`
3. Auth mock needs `user: { id: "test-user" }` and `loading: false` for hook to proceed past the early-return guard
4. API response parsed as `data.data ?? data.settings` — test provides `{ settings: ... }` which works but only by accident
5. Uses `getBranchHeader(branchIdForRequest)` which may produce different header format than `{"x-branch-id": "test-branch-123"}`

**Fix needed**: Update `mockAuthContext` to provide real user. Update `mockScheduleSettings` to match new `ScheduleSettings` interface. Fix `global.fetch` mock to match actual header format from `getBranchHeader`.

#### #7 — AppointmentDetails.test.tsx (Medium, ~25 min)

**Root cause**: Component now uses shadcn/ui `Select` (Radix UI) with portal dropdown. Key issues:
1. `getByRole("combobox")` matches 2 elements (two Select components for type + status)
2. Radix Select options aren't in the DOM until the Select is opened
3. Many tests try to `getByText("Examen de la Vista")` etc. which requires opening the Select first
4. Label text changed: "Motivo" → "Motivo de la Cita"

**Fix needed**: Tests need to open Select dropdowns before querying option text. Use `getAllByRole("combobox")` for the initial render check. Update label assertions to match new text.

#### #8 — CustomerSelection.test.tsx (Medium, ~25 min)

**Root cause**: Component rendering changed to use portal for dropdown and different layout. Key issues:
1. "Cliente Registrado" is now a `<Label>` in a Switch container — still in DOM, should be findable
2. Switch `onCheckedChange` receives `(checked: boolean)` directly, passed through to `onGuestModeToggle`
3. `customerSearch.length >= 1` required for dropdown, not `> 0`
4. Dropdown uses portal (`createPortal`) — fixed positioning may cause layout issues in jsdom

**Fix needed**: Update guest mode toggle expectations (test at line 163 expects `onGuestModeToggle(false)` which IS correct since `checked={!isGuestCustomer}` toggles from true→false when switching TO guest). Update search threshold assertions. Most tests may work as-is with jsdom.

#### #9 — useAvailability.test.ts (Simple, ~10 min)

**Root cause**: The test at line 326 is skipped with "hook crashes on null". But looking at the source, `useAvailability` handles `scheduleSettings` at line 42-47 with `if (!scheduleSettings) { return; }` guard. The mock setup provides valid `scheduleSettings`. The "empty slots" test provides `slots: []` which hits the `data.slots && data.slots.length > 0` check at line 88 and correctly sets empty array.

**Potential hidden issue**: The hook`console.log` at line 59 accesses `scheduleSettings?.min_advance_booking_hours` in template literal which COULD crash if `scheduleSettings` is null — but the test provides valid settings.

**Fix needed**: Simply remove `.skip` and run the test. If it crashes, the issue is likely the `mockScheduleSettings` not matching the expected structure (e.g., `start_time`, `end_time` missing from mock). Add those fields if needed.

#### #10 — flow.test.ts (Complex, ~45 min)

**Root cause**: The route now uses `new FlowGateway()` directly (from `@/lib/payments/flow/gateway`) and `new PaymentService(supabase)` (from `@/lib/payments/services/payment-service`). The test mocks `@/lib/payments` which doesn't intercept these imports. `createWebhookClient()` is also unmocked.

**Fix needed**: Either:
a) Rewrite test mocks to intercept `@/lib/payments/flow/gateway` and `@/lib/payments/services/payment-service` and `@/utils/supabase/webhook`
b) Update the route to use `PaymentGatewayFactory.getGateway("flow")` for consistency with other webhook routes (but this changes production code)

#### #11 — nowpayments.test.ts (Medium, ~25 min)

**Root cause**: Route imports `PaymentService` from `@/lib/payments/services/payment-service` (not `@/lib/payments`). Mock at `@/lib/payments` provides `PaymentService: vi.fn(...)` but it's never used. `createWebhookClient()` not mocked.

**Fix needed**: Add `vi.mock("@/lib/payments/services/payment-service")` and `vi.mock("@/utils/supabase/webhook")`. The rest of the mock setup (PaymentGatewayFactory) should work since it IS imported from `@/lib/payments`.

### Affected Areas

All 11 test files + their corresponding source files:

**Test files to unskip and fix:**
- `src/__tests__/unit/lib/ai/tools/analytics_tools.test.ts`
- `src/__tests__/security/phase1-security.test.ts`
- `src/__tests__/security/phase2-security.test.ts`
- `src/__tests__/security/phase3-security.test.ts`
- `src/components/admin/CreateQuoteForm/__tests__/useQuoteForm.test.ts`
- `src/components/admin/CreateAppointmentForm/__tests__/useScheduleSettings.test.ts`
- `src/components/admin/CreateAppointmentForm/__tests__/AppointmentDetails.test.tsx`
- `src/components/admin/CreateAppointmentForm/__tests__/CustomerSelection.test.tsx`
- `src/components/admin/CreateAppointmentForm/__tests__/useAvailability.test.ts`
- `src/__tests__/integration/api/webhooks/flow.test.ts`
- `src/__tests__/integration/api/webhooks/nowpayments.test.ts`

**Source files (for reference during fix, no changes needed):**
- `src/lib/ai/tools/analyzeMarketTrends.ts`
- `src/lib/ai/tools/optimizeInventory.ts`
- `src/lib/ai/tools/generateRecommendations.ts`
- `src/lib/rate-limiting/redis-rate-limiter.ts`
- `src/lib/security/monitoring.ts`
- `src/lib/security/alerting.ts`
- `src/lib/security/events.ts`
- `src/lib/security/index.ts`
- `src/lib/security/shared.ts`
- `src/lib/security/phase3-integration.ts`
- `src/components/admin/CreateQuoteForm/hooks/useQuoteForm.ts`
- `src/components/admin/CreateAppointmentForm/hooks/useScheduleSettings.ts`
- `src/components/admin/CreateAppointmentForm/hooks/useAvailability.ts`
- `src/components/admin/CreateAppointmentForm/AppointmentDetails.tsx`
- `src/components/admin/CreateAppointmentForm/CustomerSelection.tsx`
- `src/app/api/webhooks/flow/route.ts`
- `src/app/api/webhooks/nowpayments/route.ts`

### Approaches

#### 1. All-in-one — fix all 11 blocks in one pass
- **Pros**: Single change, clean sweep, no more skipped tests
- **Cons**: Very large diff (~8-11 files changed), hard to review, high risk of breaking tests
- **Effort**: High (3-4 hours)

#### 2. Split by group — Group B (module tests) then Group D (route tests)
- **Pros**: 2 manageable batches, each independently verifiable
- **Cons**: Still large per-batch diffs, Group B alone is 9 files
- **Effort**: Medium-High (2-3 hours total)

#### 3. Prioritized — fix simple/medium first, split complex into separate changes
- **Pros**: Quick wins first (#5, #9 in <15 min), medium items next (#2, #6, #7, #8, #11), complex items deferred (#1, #3, #4, #10)
- **Cons**: 4 items remain deferred after this change
- **Effort**: Low-Medium (1-1.5 hours for simple+medium)

#### 4. Minimal viable fix — fix what's definitively broken, remove what's obsolete
- **Pros**: Fastest path to removing all `describe.skip`/`it.skip`, pragmatic
- **Cons**: Some tests may have weaker assertions than ideal
- **Effort**: Low (45 min - 1 hour)

### Recommended Approach

**Approach 3 (Prioritized)** for these reasons:

1. **Simple fixes (#5, #9)** are trivially cheap — unskip both in < 15 min
2. **Medium fixes (#2, #6, #8, #11)** have clear root causes and well-scoped fixes — ~25 min each
3. **#7 (AppointmentDetails)** is medium but may be harder due to Radix Select interaction in jsdom — mark as medium-high
4. **#1 (analytics_tools)** needs a complete mock rewrite — complex
5. **#3 (phase2-security)** has 874 lines of tests with pervasive assertion changes — complex
6. **#4 (phase3-security)** may be better to skip permanently if those modules are speculative
7. **#10 (flow.test.ts)** needs mock restructure or route changes — complex

### Fix Timeline

| Priority | Block | Est. Time | Approach |
|----------|-------|-----------|----------|
| P0 | #5 useQuoteForm | 5 min | Add missing field to expected object |
| P0 | #9 useAvailability | 10 min | Unskip, add missing fields to mock if needed |
| P1 | #2 phase1-security | 20 min | Fix assertion + mock order |
| P1 | #6 useScheduleSettings | 25 min | Update mock data + auth + headers |
| P1 | #7 AppointmentDetails | 25 min | Fix query selectors, open Select before assertions |
| P1 | #8 CustomerSelection | 20 min | Minor assertion updates |
| P1 | #11 nowpayments | 25 min | Add missing mocks |
| P2 | #1 analytics_tools | 45 min | Rewrite supabase mock |
| P2 | #3 phase2-security | 40 min | Pervasive assertion updates |
| P2 | #10 flow.test | 45 min | Mock restructuring |
| P3 | #4 phase3-security | 30 min | Keep skipped OR replace mock |

### Risks

- **Complex mock rewrites (#1, #3, #10)** may introduce new bugs in the mock setup that make tests pass incorrectly (false positives)
- **Phase3-security (#4)** may be testing code that doesn't have real implementations — verify the actual modules exist before fixing tests
- **Flow webhook test (#10)** may need production code changes if the route can't be properly mocked — risk of changing behavior
- **Some tests use `vi.mock` at top level** which is hoisted — make sure any new `vi.mock` calls don't conflict
- **`act()` warnings** in React hook tests may indicate state updates happening outside `act()`, particularly in `useScheduleSettings` tests with async effects
- **jsdom limitations** in AppointmentDetails/CustomerSelection tests: portal rendering, fixed positioning, and Radix UI Select may behave differently in test environment
