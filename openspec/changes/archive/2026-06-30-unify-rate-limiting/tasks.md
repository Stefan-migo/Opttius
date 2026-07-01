# Tasks: Unify Rate Limiting

## Review Workload Forecast

| Field                   | Value                              |
| ----------------------- | ---------------------------------- |
| Estimated changed lines | ~430-450                           |
| 400-line budget risk    | Medium                             |
| Chained PRs recommended | No                                 |
| Suggested split         | Single PR (safe sequential phases) |
| Delivery strategy       | ask-on-risk                        |
| Chain strategy          | size-exception                     |

### Suggested Work Units

| Unit | Goal                                                 | Notes     |
| ---- | ---------------------------------------------------- | --------- |
| 1    | PR 1: New `withRateLimit()` + migrate routes + tests | Completed |
| 2    | PR 2: Cleanup dead code + agent/chat migration       | Completed |

## Phase 1: Foundation

- [x] 1.1 Rewrite `src/lib/rate-limiting/index.ts` — unified `withRateLimit()` with Redis-first, Map fallback, org key scoping, rateLimitConfigs migration (PR 1)
- [x] 1.2 Update `src/lib/rate-limiting/middleware.ts` — re-export everything from `index.ts` (PR 1)

## Phase 2: Migration

- [x] 2.1 Batch-change 26 route files + 1 service file: import path migration (PR 1)
- [x] 2.2 Refactor `src/app/api/agent/chat/route.ts`: replace `getRateLimiter()` with `withRateLimit()` (PR 2)
- [x] 2.3 Add `# REDIS_URL=redis://...` comment to `env.example` (PR 1)

## Phase 3: Cleanup

- [x] 3.1 Remove `withRateLimit`, `rateLimitConfigs`, `RateLimitConfig`, `rateLimitStore` from `src/lib/api/middleware.ts` and their re-exports in `src/lib/api/index.ts` (PR 2). Note: `getClientIdentifier` kept — still used by `logRequest()`.
- [x] 3.2 Remove `withRateLimitSecurity` from `src/lib/security/integration.ts` and its re-export in `src/lib/security/index.ts` (PR 2)

## Phase 4: Tests

- [x] 4.1 Unit test: Redis ping fails → falls back to in-memory Map (PR 1 — 7 tests written)
- [x] 4.2 Unit test: `x-organization-id` header → key scoped as `org:{orgId}` (PR 1)
- [x] 4.3 Unit test: limit exceeded → throws `RateLimitError` (PR 1)
- [x] 4.4 Smoke test: grep zero remaining `from "@/lib/api/middleware"` rate-limit imports (PR 2 — verified)
- [x] 4.5 Smoke test: grep zero `withRateLimitSecurity` references (PR 2 — verified)
