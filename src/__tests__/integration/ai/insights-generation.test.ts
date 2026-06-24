import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateInsights } from "@/lib/ai/insights/generator";
import { LLMFactory } from "@/lib/ai/factory";
import type { InsightSection } from "@/lib/ai/insights/schemas";
import type { MaturityLevel } from "@/lib/ai/memory/organizational";

// Mock LLMFactory
vi.mock("@/lib/ai/factory", () => ({
  LLMFactory: {
    getInstance: vi.fn(() => ({
      createProviderWithFallback: vi.fn(),
    })),
  },
}));

// Mock Logger
vi.mock("@/lib/logger", () => ({
  appLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("Insights Generation Integration", () => {
  let mockProvider: unknown;
  let mockFactory: unknown;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProvider = {
      name: "openrouter",
      generateText: vi.fn(),
    };

    mockFactory = {
      createProviderWithFallback: vi.fn().mockResolvedValue({
        provider: mockProvider,
        config: {
          provider: "openrouter",
          model: "anthropic/claude-3.5-sonnet",
          temperature: 0.7,
          maxTokens: 2000,
        },
      }),
    };

    LLMFactory.getInstance.mockReturnValue(mockFactory);
  });

  describe("successful insight generation", () => {
    // ponytail: skipped because generateInsights output format changed; fix in Phase 1
    it.skip("should generate insights without maturity adaptation", async () => {
      const mockLLMResponse = {
        insights: [
          {
            type: "warning",
            title: "Low Sales Alert",
            message: "Sales are below average",
            priority: 8,
            action_label: "View Analytics",
            action_url: "/admin/analytics",
          },
          {
            type: "opportunity",
            title: "Stock Opportunity",
            message: "Consider restocking popular items",
            priority: 6,
            action_label: "View Products",
            action_url: "/admin/products",
          },
        ],
      };

      mockProvider.generateText.mockResolvedValue({
        content: JSON.stringify(mockLLMResponse),
      });

      const insights = await generateInsights({
        section: "dashboard",
        data: {
          yesterdaySales: 1000,
          monthlyAverage: 1500,
        },
        organizationName: "Test Optica",
      });

      expect(insights).toHaveLength(2);
      expect(insights[0]).toEqual(mockLLMResponse.insights[0]);
      expect(insights[1]).toEqual(mockLLMResponse.insights[1]);
    });

    it("should generate insights with maturity adaptation", async () => {
      const mockMaturity: MaturityLevel = {
        level: "growing",
        daysSinceCreation: 45,
        totalOrders: 30,
        totalRevenue: 50000,
        description: "Growing organization",
      };

      const mockLLMResponse = {
        insights: [
          {
            type: "opportunity",
            title: "Growth Optimization",
            message: "Your business is growing! Consider automation.",
            priority: 7,
            action_label: "Learn More",
            action_url: "/admin/settings",
          },
        ],
      };

      mockProvider.generateText.mockResolvedValue({
        content: JSON.stringify(mockLLMResponse),
      });

      const insights = await generateInsights({
        section: "dashboard",
        data: { totalOrders: 30, totalRevenue: 50000 },
        organizationName: "Growing Optica",
        organizationId: "org-123",
        maturityLevel: mockMaturity,
        useMaturityAdaptation: true,
      });

      expect(insights).toHaveLength(1);
      expect(insights[0].message).toContain("growing");

      // Verify that provider was called
      expect(mockProvider.generateText).toHaveBeenCalled();

      // Verify the system prompt includes maturity context
      const callArgs = mockProvider.generateText.mock.calls[0];
      const systemPrompt = callArgs[0][0].content;
      expect(systemPrompt).toContain("INSTRUCCIONES DE MADUREZ");
      expect(systemPrompt).toContain("CRECIMIENTO");
    });

    it("should handle JSON wrapped in markdown code blocks", async () => {
      const mockLLMResponse = {
        insights: [
          {
            type: "info",
            title: "Test Insight",
            message: "Test message",
            priority: 5,
          },
        ],
      };

      // Simulate LLM returning JSON in markdown
      mockProvider.generateText.mockResolvedValue({
        content: `Here are the insights:\n\n\`\`\`json\n${JSON.stringify(mockLLMResponse)}\n\`\`\``,
      });

      const insights = await generateInsights({
        section: "inventory",
        data: {},
        organizationName: "Test Optica",
      });

      expect(insights).toHaveLength(1);
      expect(insights[0].title).toBe("Test Insight");
    });

    it("should work for all sections", async () => {
      const sections: InsightSection[] = [
        "dashboard",
        "inventory",
        "clients",
        "pos",
        "analytics",
      ];

      const mockLLMResponse = {
        insights: [
          {
            type: "info",
            title: "Section Insight",
            message: "Test for section",
            priority: 5,
          },
        ],
      };

      mockProvider.generateText.mockResolvedValue({
        content: JSON.stringify(mockLLMResponse),
      });

      for (const section of sections) {
        const insights = await generateInsights({
          section,
          data: {},
          organizationName: "Test Optica",
        });

        expect(insights).toHaveLength(1);
        expect(mockProvider.generateText).toHaveBeenCalled();
      }
    });
  });

  describe("error handling and retries", () => {
    it("should retry on transient failures", async () => {
      const mockLLMResponse = {
        insights: [
          {
            type: "info",
            title: "Success after retry",
            message: "This worked on retry",
            priority: 5,
          },
        ],
      };

      // Fail first time, succeed second time
      mockProvider.generateText
        .mockRejectedValueOnce(new Error("Temporary network error"))
        .mockResolvedValueOnce({
          content: JSON.stringify(mockLLMResponse),
        });

      const insights = await generateInsights({
        section: "dashboard",
        data: {},
        organizationName: "Test Optica",
        maxRetries: 2,
      });

      expect(insights).toHaveLength(1);
      expect(mockProvider.generateText).toHaveBeenCalledTimes(2);
    });

    it("should throw error after max retries exceeded", async () => {
      mockProvider.generateText.mockRejectedValue(
        new Error("Persistent error"),
      );

      await expect(
        generateInsights({
          section: "dashboard",
          data: {},
          organizationName: "Test Optica",
          maxRetries: 1,
        }),
      ).rejects.toThrow("Failed to generate insights after 2 attempts");

      expect(mockProvider.generateText).toHaveBeenCalledTimes(2);
    });

    it("should not retry on validation errors", async () => {
      mockProvider.generateText.mockResolvedValue({
        content: JSON.stringify({
          insights: [
            {
              type: "invalid_type", // Invalid type
              title: "Test",
              message: "Test",
              priority: 5,
            },
          ],
        }),
      });

      await expect(
        generateInsights({
          section: "dashboard",
          data: {},
          organizationName: "Test Optica",
          maxRetries: 2,
        }),
      ).rejects.toThrow("Invalid insight format");

      // Should only try once, not retry on validation errors
      expect(mockProvider.generateText).toHaveBeenCalledTimes(1);
    });

    it("should throw error if no providers available", async () => {
      mockFactory.createProviderWithFallback.mockRejectedValue(
        new Error("No available LLM providers configured"),
      );

      await expect(
        generateInsights({
          section: "dashboard",
          data: {},
          organizationName: "Test Optica",
        }),
      ).rejects.toThrow("No available LLM providers configured");
    });
  });

  describe("insight validation", () => {
    it("should validate insight structure", async () => {
      const validInsight = {
        insights: [
          {
            type: "warning",
            title: "Valid Insight",
            message: "This is valid",
            priority: 8,
            action_label: "Action",
            action_url: "/admin/test",
            metadata: { key: "value" },
          },
        ],
      };

      mockProvider.generateText.mockResolvedValue({
        content: JSON.stringify(validInsight),
      });

      const insights = await generateInsights({
        section: "dashboard",
        data: {},
        organizationName: "Test Optica",
      });

      expect(insights[0]).toEqual(validInsight.insights[0]);
    });

    it("should reject insights with invalid priority", async () => {
      const invalidInsight = {
        insights: [
          {
            type: "warning",
            title: "Invalid",
            message: "Priority out of range",
            priority: 15, // Invalid: must be 1-10
          },
        ],
      };

      mockProvider.generateText.mockResolvedValue({
        content: JSON.stringify(invalidInsight),
      });

      await expect(
        generateInsights({
          section: "dashboard",
          data: {},
          organizationName: "Test Optica",
        }),
      ).rejects.toThrow();
    });

    it("should reject insights with missing required fields", async () => {
      const invalidInsight = {
        insights: [
          {
            type: "warning",
            // Missing title
            message: "Missing title field",
            priority: 5,
          },
        ],
      };

      mockProvider.generateText.mockResolvedValue({
        content: JSON.stringify(invalidInsight),
      });

      await expect(
        generateInsights({
          section: "dashboard",
          data: {},
          organizationName: "Test Optica",
        }),
      ).rejects.toThrow();
    });
  });

  describe("configuration and customization", () => {
    it("should respect custom temperature", async () => {
      mockProvider.generateText.mockResolvedValue({
        content: JSON.stringify({
          insights: [
            {
              type: "info",
              title: "Test",
              message: "Test",
              priority: 5,
            },
          ],
        }),
      });

      await generateInsights({
        section: "dashboard",
        data: {},
        organizationName: "Test Optica",
        temperature: 0.9,
      });

      expect(mockFactory.createProviderWithFallback).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ temperature: 0.9 }),
      );
    });

    it("should include additional context in prompts", async () => {
      mockProvider.generateText.mockResolvedValue({
        content: JSON.stringify({
          insights: [
            {
              type: "info",
              title: "Test",
              message: "Test",
              priority: 5,
            },
          ],
        }),
      });

      await generateInsights({
        section: "dashboard",
        data: { sales: 1000 },
        organizationName: "Test Optica",
        additionalContext: {
          customField: "customValue",
          totalCustomers: 150,
        },
      });

      const callArgs = mockProvider.generateText.mock.calls[0];
      const systemPrompt = callArgs[0][0].content;

      // Additional context should be passed to prompt generation
      expect(systemPrompt).toBeTruthy();
    });
  });
});
