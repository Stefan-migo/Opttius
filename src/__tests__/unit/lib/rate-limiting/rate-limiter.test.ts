import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ----------------------------------------------------------------
// Mocks — defined before all imports so vi.mock takes effect first
// ----------------------------------------------------------------
vi.mock("@/lib/redis/client", () => ({
  getRedisClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  appLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// ----------------------------------------------------------------
// Subject under test
// ----------------------------------------------------------------
import { GENERAL_RATE_LIMIT } from "@/lib/rate-limiting/config";
import { __resetRedisHealth, withRateLimit } from "@/lib/rate-limiting/index";
// Spy targets
import * as redisRateLimiterModule from "@/lib/rate-limiting/redis-rate-limiter";
import { getRedisClient } from "@/lib/redis/client";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return {
    url: "http://localhost:3000/api/test",
    headers: h,
    nextUrl: { pathname: "/api/test" },
  } as unknown as NextRequest;
}

function okHandler() {
  return vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
}

function makeMockRedis() {
  return { ping: vi.fn() };
}

function makeMockLimiter(
  overrides?: Partial<{ limited: boolean; remaining: number; current: number }>,
) {
  const now = Date.now();
  return {
    isRateLimited: vi.fn().mockResolvedValue({
      limited: false,
      remaining: 99,
      resetTime: now + 60_000,
      current: 1,
      ...overrides,
    }),
  };
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------
describe("withRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Force Redis health to be re-evaluated on next call
    __resetRedisHealth();
  });

  // ─── Redis available ──────────────────────────────────────────
  it("should use RedisRateLimiter when Redis ping succeeds", async () => {
    const mockRedis = makeMockRedis();
    mockRedis.ping.mockResolvedValue("PONG");
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as unknown);

    const limiter = makeMockLimiter();
    const getLimiterSpy = vi
      .spyOn(redisRateLimiterModule, "getRateLimiter")
      .mockReturnValue(limiter as unknown);

    const handler = okHandler();
    const response = await withRateLimit(GENERAL_RATE_LIMIT)(
      createMockRequest(),
      handler,
    );

    expect(response.status).toBe(200);
    expect(getLimiterSpy).toHaveBeenCalledTimes(1);
    expect(limiter.isRateLimited).toHaveBeenCalledTimes(1);
  });

  // ─── Redis unavailable ────────────────────────────────────────
  it("should fall back to in-memory Map when Redis ping fails", async () => {
    const mockRedis = makeMockRedis();
    mockRedis.ping.mockRejectedValue(new Error("ECONNREFUSED"));
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as unknown);

    const getLimiterSpy = vi.spyOn(redisRateLimiterModule, "getRateLimiter");

    const handler = okHandler();
    const response = await withRateLimit(GENERAL_RATE_LIMIT)(
      createMockRequest(),
      handler,
    );

    expect(response.status).toBe(200);
    // Redis path must NOT be called
    expect(getLimiterSpy).not.toHaveBeenCalled();
    // Handler must still execute
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // ─── Rate limit exceeded → 429 ────────────────────────────────
  it("should return 429 when rate limit is exceeded", async () => {
    const mockRedis = makeMockRedis();
    mockRedis.ping.mockResolvedValue("PONG");
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as unknown);

    const limiter = makeMockLimiter({
      limited: true,
      remaining: 0,
      current: 100,
    });
    vi.spyOn(redisRateLimiterModule, "getRateLimiter").mockReturnValue(
      limiter as unknown,
    );

    const handler = okHandler();
    const response = await withRateLimit(GENERAL_RATE_LIMIT)(
      createMockRequest(),
      handler,
    );

    expect(response.status).toBe(429);
    // Handler must NOT be called when rate limited
    expect(handler).not.toHaveBeenCalled();
  });

  // ─── Organisation-scoped key ──────────────────────────────────
  it("should use organisation ID from header as rate-limit key", async () => {
    const mockRedis = makeMockRedis();
    mockRedis.ping.mockResolvedValue("PONG");
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as unknown);

    const limiter = makeMockLimiter();
    vi.spyOn(redisRateLimiterModule, "getRateLimiter").mockReturnValue(
      limiter as unknown,
    );

    const handler = okHandler();
    const request = createMockRequest({ "x-organization-id": "org-abc-123" });
    await withRateLimit(GENERAL_RATE_LIMIT)(request, handler);

    const keyArg = limiter.isRateLimited.mock.calls[0][0] as string;
    expect(keyArg).toContain("org-abc-123");
  });

  // ─── IP-based key (no org header) ─────────────────────────────
  it("should fall back to IP-based key when no organisation header", async () => {
    const mockRedis = makeMockRedis();
    mockRedis.ping.mockResolvedValue("PONG");
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as unknown);

    const limiter = makeMockLimiter();
    vi.spyOn(redisRateLimiterModule, "getRateLimiter").mockReturnValue(
      limiter as unknown,
    );

    const handler = okHandler();
    const request = createMockRequest({ "x-forwarded-for": "10.0.0.42" });
    await withRateLimit(GENERAL_RATE_LIMIT)(request, handler);

    const keyArg = limiter.isRateLimited.mock.calls[0][0] as string;
    expect(keyArg).toContain("10.0.0.42");
  });

  // ─── Fail-open: Redis crashes mid-check → falls to in-memory ─
  it("should fall back to in-memory when Redis check throws mid-flight", async () => {
    const mockRedis = makeMockRedis();
    mockRedis.ping.mockResolvedValue("PONG");
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as unknown);

    // Simulate Redis being available but the rate limiter itself throwing
    const limiter = makeMockLimiter();
    limiter.isRateLimited.mockRejectedValue(new Error("Redis OOM"));
    vi.spyOn(redisRateLimiterModule, "getRateLimiter").mockReturnValue(
      limiter as unknown,
    );

    const handler = okHandler();
    const response = await withRateLimit(GENERAL_RATE_LIMIT)(
      createMockRequest(),
      handler,
    );

    // Should fall through and still work
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // ─── In-memory fallback rate limiting ─────────────────────────
  it("should return 429 from in-memory fallback when limit reached", async () => {
    const mockRedis = makeMockRedis();
    mockRedis.ping.mockRejectedValue(new Error("ECONNREFUSED"));
    vi.mocked(getRedisClient).mockReturnValue(mockRedis as unknown);

    // Use a very low limit to force 429
    const tightConfig = { ...GENERAL_RATE_LIMIT, limit: 1 };

    const handler = okHandler();
    const request = createMockRequest();

    // First call — should pass
    const res1 = await withRateLimit(tightConfig)(request, handler);
    expect(res1.status).toBe(200);

    // Second call — should hit the limit
    const res2 = await withRateLimit(tightConfig)(request, handler);
    expect(res2.status).toBe(429);
  });
});
