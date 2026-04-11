/**
 * Integration Tests for Generate Insights API
 *
 * These tests validate:
 * 1. Insight generation with mocked LLM
 * 2. Schema validation
 * 3. Database persistence
 * 4. Error handling
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { LLMFactory } from "@/lib/ai/factory";

import {
  cleanupTestData,
  createTestOrganization,
  createTestUser,
  isMultiTenancyAvailable,
  makeAuthenticatedRequest,
  type TestOrganization,
  type TestUser,
} from "../../helpers/test-setup";

// Mock LLMFactory
vi.mock("@/lib/ai/factory", () => ({
  LLMFactory: {
    getInstance: vi.fn(),
  },
}));

let infrastructureCheck = false;

describe("Generate Insights API - Integration Tests", () => {
  let org: TestOrganization;
  let user: TestUser;
  let mockFactory: unknown;
  let mockProvider: unknown;

  beforeAll(async () => {
    infrastructureCheck = await isMultiTenancyAvailable();

    if (!infrastructureCheck) {
      console.warn(
        "⚠️  Multi-tenancy infrastructure not available. Tests will be skipped.",
      );
      return;
    }

    org = await createTestOrganization("Test Org", "basic");
    user = await createTestUser(org.id, "test@example.com");
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockProvider = {
      name: "openai",
      generateText: vi.fn(),
    };

    mockFactory = {
      createProviderWithFallback: vi.fn().mockResolvedValue({
        provider: mockProvider,
        config: { temperature: 0.7, maxTokens: 2000 },
      }),
    };

    vi.mocked(LLMFactory.getInstance).mockReturnValue(mockFactory as unknown);
  });

  afterAll(async () => {
    if (infrastructureCheck && org?.id) {
      await cleanupTestData(org.id);
    }
  });

  it("should generate insights for dashboard", async () => {
    if (!infrastructureCheck) {
      return;
    }

    // Mock LLM response
    const mockLLMResponse = {
      content: JSON.stringify({
        insights: [
          {
            type: "warning",
            title: "Ventas por debajo del promedio",
            message: "Ayer vendiste un 15% menos que tu promedio mensual.",
            priority: 8,
            action_label: "Ver Trabajos Atrasados",
            action_url: "/admin/work-orders?status=overdue",
          },
        ],
      }),
    };

    mockProvider.generateText.mockResolvedValue(mockLLMResponse);

    const response = await makeAuthenticatedRequest(
      "/api/ai/insights/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "dashboard",
          data: {
            yesterdaySales: 50000,
            monthlyAverage: 58823,
            dailyGoal: 60000,
            overdueWorkOrders: 3,
          },
        }),
      },
      user.authToken,
      user.sessionData,
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.insights).toBeDefined();
    expect(data.insights.length).toBeGreaterThan(0);
    expect(data.insights[0].type).toBe("warning");
    expect(data.insights[0].organization_id).toBe(org.id);
  });

  it("should handle LLM errors gracefully", async () => {
    if (!infrastructureCheck) {
      return;
    }

    mockProvider.generateText.mockRejectedValue(new Error("LLM API Error"));

    const response = await makeAuthenticatedRequest(
      "/api/ai/insights/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "dashboard",
          data: {},
        }),
      },
      user.authToken,
      user.sessionData,
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should validate insight schema", async () => {
    if (!infrastructureCheck) {
      return;
    }

    // Mock invalid LLM response
    const mockInvalidResponse = {
      content: JSON.stringify({
        insights: [
          {
            type: "invalid_type", // Invalid
            title: "A".repeat(200), // Too long
            // Missing required fields
          },
        ],
      }),
    };

    mockProvider.generateText.mockResolvedValue(mockInvalidResponse);

    const response = await makeAuthenticatedRequest(
      "/api/ai/insights/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "dashboard",
          data: {},
        }),
      },
      user.authToken,
      user.sessionData,
    );

    expect(response.status).toBe(500);
  });

  it("should handle no LLM providers configured", async () => {
    if (!infrastructureCheck) {
      return;
    }

    mockFactory.createProviderWithFallback.mockRejectedValue(
      new Error("No available LLM providers configured"),
    );

    const response = await makeAuthenticatedRequest(
      "/api/ai/insights/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "dashboard",
          data: {},
        }),
      },
      user.authToken,
      user.sessionData,
    );

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toContain("AI service is not configured");
  });

  it("should require authentication", async () => {
    if (!infrastructureCheck) {
      return;
    }

    const response = await fetch(
      "http://localhost:3000/api/ai/insights/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "dashboard",
          data: {},
        }),
      },
    );

    expect(response.status).toBe(401);
  });
});
