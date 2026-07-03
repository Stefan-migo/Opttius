# Proposal: add-unit-tests-remaining-modules

## Intent

16 modules across utils, validation, API infra, and domain have zero test coverage despite containing core business logic (formatting, Zod schemas, permissions, tier config, logger wrapper, error reporting). Building on the ~385 tests from previous Fase 5 changes, this closes coverage gaps on modules requiring minimal or no mocking.

## Scope

### In Scope
- 16 test files, one per module, covering every exported function/constant
- Each function: success path, edge cases (null inputs, boundary values, type coercion)
- Zod schemas: valid/invalid payloads via `safeParse` for every schema
- Constants: structural integrity (keys, types, completeness)
- Logger/error-reporting: mock underlying lib (pino, Sentry)

### Out of Scope
- Integration tests with real HTTP/DB — pure unit tests only
- No production code changes
- Modules covered in previous Fase 5 changes (API services, validation schemas, AI tools, payments)

## Capabilities

None — pure test coverage. No behavioral or spec-level changes.

## Approach

One test file per module, co-located under `src/__tests__/unit/lib/` following same dir hierarchy. Existing patterns (`describe/it/expect`, `safeParse`, `__aptMockClient__`) from prior changes.

**Mocking needs (0–2 per file):**

| Module | Mocks |
|--------|-------|
| `formatting.ts` | None — pure date/currency/RUT formatting |
| `date-timezone.ts` | None — pure date math on `Intl` |
| `branch.ts` | None — pure filter/build helpers |
| `tax-config.ts` | `vi.fn()` on `global.fetch` — reads from `/api/admin/system/config` |
| `chatExport.ts` | None — pure JSON/MD serialization |
| `zod-helpers.ts` | Inline `NextRequest`/`NextResponse` objects (no `vi.mock`) |
| `schemas.ts` | None — pure Zod primitives |
| `organization-schemas.ts` | None — pure Zod primitives |
| `client-helpers.ts` | `__aptMockClient__` on `globalThis` — established pattern |
| `response-helpers.ts` | None — pure response data extraction |
| `permissions.ts` | None — pure role→permissions map |
| `tier-config.ts` | None — constants + pure limit checks |
| `notifications/constants.ts` | None — pure key/icon/label maps |
| `logger/index.ts` | `vi.mock("pino")` — 1 line |
| `error-reporting/core.ts` | `vi.mock("@/lib/logger")` — 1 line |
| `lens-matrices/constants.ts` | None — pure template rows |

## Affected Areas

| Area | Impact |
|------|--------|
| `src/__tests__/unit/lib/utils/formatting.test.ts` | New |
| `src/__tests__/unit/lib/utils/date-timezone.test.ts` | New |
| `src/__tests__/unit/lib/utils/branch.test.ts` | New |
| `src/__tests__/unit/lib/utils/tax-config.test.ts` | New |
| `src/__tests__/unit/lib/utils/chatExport.test.ts` | New |
| `src/__tests__/unit/lib/validation/zod-helpers.test.ts` | New |
| `src/__tests__/unit/lib/validation/schemas.test.ts` | New |
| `src/__tests__/unit/lib/validation/organization-schemas.test.ts` | New |
| `src/__tests__/unit/lib/api/client-helpers.test.ts` | New |
| `src/__tests__/unit/lib/api/response-helpers.test.ts` | New |
| `src/__tests__/unit/lib/admin/permissions.test.ts` | New |
| `src/__tests__/unit/lib/saas/tier-config.test.ts` | New |
| `src/__tests__/unit/lib/notifications/constants.test.ts` | New |
| `src/__tests__/unit/lib/logger/index.test.ts` | New |
| `src/__tests__/unit/lib/error-reporting/core.test.ts` | New |
| `src/__tests__/unit/lib/lens-matrices/constants.test.ts` | New |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| zod-helpers depends on `NextRequest`/`NextResponse` | Low | Inline mock with minimal required fields |
| tax-config uses real `fetch` — async test | Low | `vi.fn()` with mock resolved value |

## Rollback Plan

Delete the 16 test files. No production code changed — instant revert.

## Dependencies

- Vitest already configured. Existing test patterns proven across 22 test files.

## Success Criteria

- [ ] All 16 test files pass with `npx vitest run src/__tests__/unit/lib/`
- [ ] Every exported function/constant across the 16 modules has ≥1 assertion
- [ ] All existing tests still pass (`npm run test:run`)
- [ ] Coverage for affected lib/ subdirectories increases measurably
