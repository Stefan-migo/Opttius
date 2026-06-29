import { vi } from "vitest";

/**
 * Creates a thenable mock query builder for Supabase chainable queries.
 * All chain methods return the builder itself (chainable).
 * The builder has `.then()` so `await builder` resolves to `resolveValue`.
 */
export function createMockBuilder<T = unknown>(resolveValue?: T) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    in: vi.fn(() => builder),
    contains: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    then: (onfulfilled?: (v: T) => unknown) =>
      Promise.resolve(resolveValue).then(onfulfilled),
  };
  return builder as ReturnType<typeof vi.fn> & typeof builder;
}

export function createMockSupabase() {
  return { from: vi.fn(), rpc: vi.fn() };
}

export const UUID = {
  ORG: "11111111-1111-1111-1111-111111111111",
  BRANCH: "22222222-2222-2222-2222-222222222222",
  USER: "33333333-3333-3333-3333-333333333333",
  CUSTOMER: "44444444-4444-4444-4444-444444444444",
  PRODUCT: "55555555-5555-5555-5555-555555555555",
  APPOINTMENT: "66666666-6666-6666-6666-666666666666",
  PRESCRIPTION: "77777777-7777-7777-7777-777777777777",
  OTHER_BRANCH: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  OTHER_ORG: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
};

export function makeContext(overrides?: Record<string, unknown>) {
  return {
    supabase: createMockSupabase(),
    userId: UUID.USER,
    organizationId: UUID.ORG,
    currentBranchId: UUID.BRANCH,
    ...overrides,
  } as Record<string, unknown>;
}

export const MOCK_BRANCH = { id: UUID.BRANCH, name: "Sucursal Centro" };
