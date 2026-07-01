# Proposal: Unify Rate Limiting

## Intent

Consolidate three rate-limiting implementations (in-memory Map, Redis, observer) into one. Current state: the in-memory Map (used by ~20 routes) doesn't scale, the Redis implementation (used only by agent/chat) fails open when Redis is down, and the observer in `security/integration.ts` is dead code. Audit findings H2 and F10.

## Scope

### In Scope

- Single `withRateLimit()` function in `src/lib/rate-limiting/` that prefers Redis (ioredis sliding window) but falls back to in-memory Map when Redis is unavailable
- Fail-closed on limit exceeded (429), fail-open only on infrastructure failure (Redis down → log + allow)
- Org-scoped keys for authenticated endpoints (key by `organization_id` instead of IP)
- Wire existing ~20 routes currently importing from `src/lib/api/middleware.ts` to the new unified implementation
- Add `REDIS_URL` to `env.example`
- Remove `withRateLimit` from `src/lib/api/middleware.ts` (both the function and `rateLimitConfigs`)
- Remove `withRateLimitSecurity` from `src/lib/security/integration.ts`

### Out of Scope

- Setting up Redis infrastructure for production (separate DevOps task)
- Horizontal scaling improvements beyond what Redis provides
- IP blocking (the Redis rate-limiter's `blockIP` feature — unused, adds complexity)
- Per-endpoint rate limit configuration changes (migrate existing configs as-is)
- Splitting the agent/chat route's direct `getRateLimiter()` usage (refactored as part of the unified middleware)

## Capabilities

### New Capabilities

- None (pure refactor — existing behavior preserved)

### Modified Capabilities

- None (no spec-level behavior change)

## Approach

1. Migrate the in-memory `withRateLimit(config)(request, handler)` signature from `src/lib/api/middleware.ts` into `src/lib/rate-limiting/middleware.ts`, adding a Redis-first fallback layer.
2. The new `withRateLimit` tries Redis first (`getRedisClient().ping()` → healthy?), falls back to the same Map-based store on failure.
3. For authenticated requests (`requireAuth` called before/beside), extract `organization_id` from the user session for the rate limit key instead of IP.
4. Change all `@/lib/api/middleware` imports to `@/lib/rate-limiting` across ~27 files.
5. Delete the old `withRateLimit`, `rateLimitConfigs` from `src/lib/api/middleware.ts` and `withRateLimitSecurity` from `src/lib/security/integration.ts`.
6. Update `env.example` with `REDIS_URL`.

## Migration Path

All routes already call `withRateLimit`. Migration is a single import change per file: `@/lib/api/middleware` → `@/lib/rate-limiting`. The function signature stays identical. No behavioral change for existing routes until Redis is configured.

## Affected Areas

| Area                                  | Impact   | Description                                     |
| ------------------------------------- | -------- | ----------------------------------------------- |
| `src/lib/rate-limiting/middleware.ts` | Modified | Add Redis-first + Map fallback, org-scoped keys |
| `src/lib/rate-limiting/index.ts`      | Modified | Export `rateLimitConfigs` for backward compat   |
| `src/lib/api/middleware.ts`           | Modified | Remove `withRateLimit`, `rateLimitConfigs`      |
| `src/lib/security/integration.ts`     | Modified | Remove `withRateLimitSecurity`                  |
| `src/app/api/**/route.ts` (~27 files) | Modified | Import path change only                         |
| `env.example`                         | Modified | Add `REDIS_URL`                                 |

## Risks

| Risk                                        | Likelihood | Mitigation                                                                       |
| ------------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| Redis ping in request path adds latency     | Low        | Ping is sub-ms; cache healthy state in a boolean flag per interval               |
| Fallback Map diverges from Redis behavior   | Low        | Same configs, same key scheme, same window logic                                 |
| Missed a route during import migration      | Med        | Grep all `from "@/lib/api/middleware"` imports — batch-enumerate before starting |
| Agent chat uses `getRateLimiter()` directly | Low        | Route is already in scope; refactor to use unified `withRateLimit`               |

## Rollback Plan

Revert the import changes and restore `withRateLimit` + `rateLimitConfigs` in `src/lib/api/middleware.ts`. The Redis changes in `env.example` are additive only (no rollback needed).

## Dependencies

- `ioredis` (already installed)

## Success Criteria

- [ ] All ~27 existing routes pass rate limiting with same configs before and after
- [ ] With `REDIS_URL` unset, rate limiting uses in-memory fallback (existing behavior preserved)
- [ ] With `REDIS_URL` set and Redis reachable, keys are stored in Redis (sliding window)
- [ ] Authenticated routes with `organization_id` key by org, not IP
- [ ] `agent/chat` route uses the unified `withRateLimit` instead of direct `getRateLimiter()`
- [ ] No reference to `withRateLimit` or `rateLimitConfigs` remains in `src/lib/api/middleware.ts`
- [ ] No reference to `withRateLimitSecurity` remains in `src/lib/security/integration.ts`
