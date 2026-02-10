/**
 * Mock Supabase Client for Testing
 * Provides mock implementations of Supabase client methods
 */

import { vi } from "vitest";

export const createMockSupabaseClient = () => {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockNeq = vi.fn();
  const mockOr = vi.fn();
  const mockContains = vi.fn();
  const mockGte = vi.fn();
  const mockLte = vi.fn();
  const mockOrder = vi.fn();
  const mockRange = vi.fn();
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockRpc = vi.fn();

  // Chain the mock methods to return the chainable object
  const chainableObject = {
    select: mockSelect,
    eq: mockEq,
    neq: mockNeq,
    or: mockOr,
    contains: mockContains,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete
  };

  // Make each method return the chainable object
  mockSelect.mockReturnValue(chainableObject);
  mockEq.mockReturnValue(chainableObject);
  mockNeq.mockReturnValue(chainableObject);
  mockOr.mockReturnValue(chainableObject);
  mockContains.mockReturnValue(chainableObject);
  mockGte.mockReturnValue(chainableObject);
  mockLte.mockReturnValue(chainableObject);
  mockOrder.mockReturnValue(chainableObject);
  mockRange.mockReturnValue(chainableObject);
  mockSingle.mockReturnValue(chainableObject);
  mockInsert.mockReturnValue(chainableObject);
  mockUpdate.mockReturnValue(chainableObject);
  mockDelete.mockReturnValue(chainableObject);

  return {
    from: mockFrom.mockReturnValue(chainableObject),
    rpc: mockRpc
  };
};

// Mock the entire Supabase module
export const mockSupabaseModule = {
  createClient: vi.fn(() => createMockSupabaseClient()),
  createClientFromRequest: vi.fn(() => ({
    client: createMockSupabaseClient(),
    getUser: vi.fn()
  }))
};

export default mockSupabaseModule;