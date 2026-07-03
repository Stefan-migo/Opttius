# Tasks: Add Unit Tests — Remaining Modules

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | PR | Base | Est. Lines |
|------|------|----|------|------------|
| 1 | Utils (5 files) | PR 1 | main | ~350 |
| 2 | Validation (3 files) | PR 2 | main | ~350 |
| 3 | API infra (4 files) | PR 3 | main | ~350 |
| 4 | Domain constants (4 files) | PR 4 | main | ~300 |

## Phase 1: Utils — PR 1 (~350 lines)

- [ ] 1.1 `utils/formatting.test.ts` — `formatDate`, `formatCurrency`, `formatPhone`, `formatRUT`: valid inputs, null/undefined, boundary values, special chars. No mocks.
- [ ] 1.2 `utils/date-timezone.test.ts` — `parseCLDate`, `toCLTimezone`: CL dates, DST edges, invalid/empty/null. No mocks.
- [ ] 1.3 `utils/branch.test.ts` — branch filter/build helpers: empty list, single/multiple branches, edge values. No mocks.
- [ ] 1.4 `utils/tax-config.test.ts` — tax constants + helpers: all keys present, types correct, defaults. No mocks.
- [ ] 1.5 `utils/chatExport.test.ts` — chat export JSON/MD: empty messages, special chars, long content, null fields. No mocks.

## Phase 2: Validation — PR 2 (~350 lines)

- [ ] 2.1 `validation/zod-helpers.test.ts` — `parseAndValidateBody`, `parseAndValidateQuery`: valid/invalid payloads, empty body, missing fields, type coercion. Inline `NextRequest` mock.
- [ ] 2.2 `validation/schemas.test.ts` — email, phone, RUT, URL, pagination via `safeParse`: valid/invalid/boundary/empty/null. No mocks.
- [ ] 2.3 `validation/organization-schemas.test.ts` — org schemas: valid org, missing fields, name limits, RUT format. No mocks.

## Phase 3: API Infra — PR 3 (~350 lines)

- [ ] 3.1 `api/client-helpers.test.ts` — `get`/`post`/`put`/`del` via `__aptMockClient__`: success, network error, non-ok, timeout. Mock: `__aptMockClient__` on `globalThis`.
- [ ] 3.2 `api/response-helpers.test.ts` — `extractDataFromResponse` + helpers: data present, null, empty array, nested paths, error shapes. No mocks.
- [ ] 3.3 `admin/permissions.test.ts` — role→permissions map: each role returns correct set, invalid role→empty. No mocks.
- [ ] 3.4 `saas/tier-config.test.ts` — `getTierConfig`, `canUpgrade`, limits: each tier returns correct config, valid/invalid upgrade paths, limits enforce. No mocks.

## Phase 4: Domain Constants — PR 4 (~300 lines)

- [ ] 4.1 `notifications/constants.test.ts` — notification types, channels, labels: all keys present, types match, icon/label maps complete. No mocks.
- [ ] 4.2 `logger/index.test.ts` — pino wrapper: info/warn/error/child logger, level filtering. Mock: `vi.mock("pino")`.
- [ ] 4.3 `error-reporting/core.test.ts` — sentry wrapper: `captureException`, `setUser`, `withScope`, error filtering, init config. Mock: `vi.mock("@/lib/logger")`.
- [ ] 4.4 `lens-matrices/constants.test.ts` — lens matrix template rows: all categories present, row structure, keys/types match. No mocks.
