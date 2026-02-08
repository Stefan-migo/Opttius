/**
 * Test Setup File
 * Global test configuration and utilities
 */

import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
// @ts-ignore - Setting NODE_ENV for test environment
process.env.NODE_ENV = "test";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
console.log = vi.fn();
console.info = vi.fn();
console.warn = vi.fn();
console.error = vi.fn();

// Global test utilities
(global as any).testUtils = {
  // Create mock user
  createMockUser: (overrides = {}) => ({
    id: "test-user-id",
    email: "test@example.com",
    role: "user",
    ...overrides,
  }),

  // Create mock organization
  createMockOrganization: (overrides = {}) => ({
    id: "test-org-id",
    name: "Test Organization",
    slug: "test-org",
    ...overrides,
  }),

  // Create mock response
  createMockResponse: (data: any, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }),
};

// Cleanup after each test
import { afterEach } from "vitest";
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// Setup for integration tests
export const setupIntegrationTest = () => {
  // Reset mocks
  vi.clearAllMocks();

  // Setup common mocks for integration tests
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  });
};

// Teardown for integration tests
export const teardownIntegrationTest = () => {
  // Clean up any test-specific state
  localStorage.clear();
};
