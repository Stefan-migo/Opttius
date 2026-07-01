# Design: Unify Rate Limiting

## Technical Approach

Consolidate three rate-limiting implementations into a single `withRateLimit()` entry point at `src/lib/rate-limiting/index.ts`. The unified function preserves the existing `(config)(request, handler)` curried signature so all ~27 routes migrate with a one-line import change. Redis is preferred when available; in-memory Map is the transparent fallback.

## Architecture Decisions

| Option                                | Tradeoff                                                                              | Decision                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Where to put the unified function** | `index.ts` (barrel) vs new `unified.ts` vs inline in `middleware.ts`                  | `index.ts` — Ponytail: fewest files, no indirection, it IS the module's public face                                                                              |
| **Signature to preserve**             | Curried `(config)(req, handler)` (27 routes use it) vs flat `(req, handler, config?)` | Curried — zero behavioral change, single import swap per route                                                                                                   |
| **Redis health check strategy**       | Ping on every request vs cached boolean with TTL                                      | Cached boolean (30s interval) — Ping adds ~1ms, cache avoids thundering herd on Redis recovery                                                                   |
| **Configs to move**                   | Merge `rateLimitConfigs` into `config.ts` vs preserve as-is                           | Preserve as-is in `index.ts` — `config.ts` is a different config scheme (auto-detect by path). Merging risks behavioral drift. Ponytail: don't touch what works. |
| **Key scoping**                       | Extract `org_id` from header vs DB query vs requireAuth param                         | Header (`x-organization-id`) — zero-latency, stateless, set by upstream auth middleware                                                                          |
| **agent/chat route**                  | Refactor to `withRateLimit` vs keep `getRateLimiter()`                                | Refactor — eliminates direct singleton dependency, gets Redis fallback for free                                                                                  |
| **`withRateLimitSecurity`**           | Remove entirely vs keep as no-op wrapper                                              | Remove — zero callers, dead code per audit H2/F10                                                                                                                |

## Data Flow

```
Request → withRateLimit(config)
              │
              ├─ Redis ping (cached 30s)?
              │   ├─ YES → RedisRateLimiter.isRateLimited(key, config)
              │   │           ├─ limited=true  → throw RateLimitError (429)
              │   │           └─ limited=false → handler() → response + headers
              │   │
              │   └─ NO/fail → in-memory Map (existing logic)
              │                   ├─ over limit  → throw RateLimitError (429)
              │                   └─ under limit → handler() → response + headers
              │
              └─ Infrastructure error (Redis ping throws, Map unknown)?
                  └─ Log warning → pass through to handler() [fail-open]
```

## File Changes

| File                                                  | Action  | Description                                                                                                      |
| ----------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/lib/rate-limiting/index.ts`                      | Rewrite | New `withRateLimit()` with Redis-first + Map fallback + org scoping + `rateLimitConfigs`                         |
| `src/lib/rate-limiting/middleware.ts`                 | Modify  | Re-export everything from `index.ts`, keep `rateLimit`/`checkRateLimit` for backward compat                      |
| `src/lib/api/middleware.ts`                           | Modify  | Remove `withRateLimit`, `rateLimitConfigs`, `RateLimitConfig` interface, `rateLimitStore`, `getClientIdentifier` |
| `src/lib/api/index.ts`                                | Modify  | Remove `withRateLimit` and `rateLimitConfigs` from re-exports                                                    |
| `src/lib/security/integration.ts`                     | Modify  | Remove `withRateLimitSecurity` function                                                                          |
| `src/lib/security/index.ts`                           | Modify  | Remove `withRateLimitSecurity` from re-exports                                                                   |
| `src/app/api/agent/chat/route.ts`                     | Modify  | Replace `getRateLimiter()` with `withRateLimit(agentConfig)`                                                     |
| `src/app/api/**/*/route.ts` (26 files)                | Modify  | Change import from `@/lib/api/middleware` to `@/lib/rate-limiting`                                               |
| `src/app/api/admin/products/productsCreateService.ts` | Modify  | Same import change (not a route but a service called by one)                                                     |
| `env.example`                                         | Modify  | Add `# REDIS_URL=redis://...`                                                                                    |

## withRateLimit() Signature & Behavior

```typescript
import { RateLimitError } from "@/lib/api/errors";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

function withRateLimit(
  config: RateLimitConfig,
): (
  request: NextRequest,
  handler: () => Promise<NextResponse>,
) => Promise<NextResponse>;
```

Behavior:

- **Limit exceeded** (either backend): throw `RateLimitError` (status 429) — **fail-closed**
- **Redis infrastructure down**: log warning, fall through to in-memory Map — **fail-open**
- **Both Redis AND Map fail**: impossible in practice (Map is local), but if Map somehow throws → log + pass through
- **Rate limit headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` set on response (same as current)

## Redis Fallback Logic

```typescript
let redisHealthy: boolean | null = null;
let lastHealthCheck = 0;
const HEALTH_CACHE_TTL = 30_000;

async function isRedisAvailable(): Promise<boolean> {
  const now = Date.now();
  if (redisHealthy !== null && now - lastHealthCheck < HEALTH_CACHE_TTL)
    return redisHealthy;
  try {
    const client = getRedisClient();
    await client.connect(); // lazyConnect — no-op if connected
    const result = await client.ping();
    redisHealthy = result === "PONG";
  } catch {
    redisHealthy = false;
    logger.warn("Redis unavailable, falling back to in-memory rate limiting");
  }
  lastHealthCheck = now;
  return redisHealthy;
}
```

Ponytail: cached boolean, not a circuit breaker library. 30s interval avoids repeated pings on a dead Redis.

## Key Scoping Strategy

```typescript
function resolveKey(request: NextRequest): string {
  // 1. Org-scoped (authenticated routes)
  const orgId = request.headers.get("x-organization-id");
  if (orgId) return `org:${orgId}`;

  // 2. IP-based (fallback, current behavior)
  const xff = request.headers.get("x-forwarded-for");
  const ip =
    xff?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.ip ||
    "unknown";
  const ua = (request.headers.get("user-agent") || "unknown").slice(0, 50);
  return `${ip}:${ua}`;
}
```

If `keyGenerator` is passed in config (as some routes do), it takes precedence over `resolveKey`.

## Migration Approach

**Batch-safe (single PR) — no feature flag needed**:

1. **Phase A**: Build new `withRateLimit()` in `src/lib/rate-limiting/index.ts` — function is live but no routes call it yet
2. **Phase B**: Update `src/lib/rate-limiting/middleware.ts` to re-export from `index.ts`
3. **Phase C**: Batch-change all 27 imports + `agent/chat` route — automated grep+replace, each file is a mechanical one-line edit
4. **Phase D**: Remove dead code from `src/lib/api/middleware.ts`, `src/lib/api/index.ts`, `src/lib/security/integration.ts`, `src/lib/security/index.ts`
5. **Phase E**: Update `env.example`

Interleaving risk: **none**. The old `withRateLimit` in `api/middleware.ts` is untouched until Phase D, so at any point you can revert the import change and everything works.

**PR budget**: ~320 lines changed (26 route files × ~2 lines = 52, + 6 files with substantive edits ~120, + 2 files deleted/simplified ~50, + env.example 1 line). Under 400-line guard.

## Test Plan

| Layer | What                             | Approach                                                                                     |
| ----- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| Unit  | `withRateLimit()` fallback logic | Mock Redis ping fails → confirm Map used. Mock Redis OK → confirm `isRateLimited` called.    |
| Unit  | Org-scoped key                   | Request with `x-organization-id: org_123` → key is `org:org_123`                             |
| Unit  | 429 on limit exceeded            | Hit limit → throws `RateLimitError` with 429                                                 |
| Smoke | Import migration                 | `grep` for `from "@/lib/api/middleware"` after migration → zero remaining rate-limit imports |
| Smoke | Dead code removal                | `grep` for `withRateLimitSecurity` after removal → zero hits                                 |
| E2E   | Route-level parity               | Call a route that uses `rateLimitConfigs.general` → same limit behavior                      |

## Rollback Plan

1. Revert all import changes: `git checkout -- src/app/api/`
2. Restore `withRateLimit` + `rateLimitConfigs` in `src/lib/api/middleware.ts` (revert file)
3. Restore `withRateLimitSecurity` in `src/lib/security/integration.ts` (revert file)
4. Redis changes in `env.example` are additive only — no rollback needed
5. If rolled back, `src/lib/rate-limiting/index.ts` still works (never imported by old code path)

**Total rollback**: `git checkout` on ~6 files, no data migration.
