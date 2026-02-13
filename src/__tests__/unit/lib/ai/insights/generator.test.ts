import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateInsights,
  generateSingleInsight,
} from "@/lib/ai/insights/generator";
import { LLMFactory } from "@/lib/ai/factory";

// Mock LLMFactory
vi.mock("@/lib/ai/factory", () => ({
  LLMFactory: {
    getInstance: vi.fn(() => ({
      createProviderWithFallback: vi.fn(),
    })),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  appLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Insight Generator", () => {
  let mockProvider: any;
  let mockFactory: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProvider = {
      name: "openai",
      generateText: vi.fn(),
    };

    mockFactory = {
      createProviderWithFallback: vi.fn().mockResolvedValue({
        provider: mockProvider,
        config: {
          temperature: 0.7,
          maxTokens: 2000,
        },
      }),
    };

    vi.mocked(LLMFactory.getInstance).mockReturnValue(mockFactory as any);
  });

  describe("generateInsights", () => {
    it("should generate insights for dashboard section", async () => {
      const mockLLMResponse = {
        content: JSON.stringify({
          insights: [
            {
              type: "warning",
              title: "Ventas por debajo del promedio",
              message: "Ayer vendiste un 15% menos que tu promedio mensual.",
              priority: 8,
              action_label: "Ver Trabajos Atrasados",
              action_url:
                "http://localhost:3000/admin/work-orders?status=overdue",
            },
          ],
        }),
      };

      mockProvider.generateText.mockResolvedValue(mockLLMResponse);

      const dashboardData = {
        yesterdaySales: 50000,
        monthlyAverage: 58823,
        dailyGoal: 60000,
        overdueWorkOrders: 3,
        pendingQuotes: 5,
      };

      const insights = await generateInsights({
        section: "dashboard",
        data: dashboardData,
        organizationName: "Test Organization",
      });

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe("warning");
      expect(insights[0].priority).toBe(8);
      expect(insights[0].title).toBe("Ventas por debajo del promedio");
    });

    it("should handle LLM errors gracefully", async () => {
      mockProvider.generateText.mockRejectedValue(new Error("API Error"));

      await expect(
        generateInsights({
          section: "dashboard",
          data: {},
          organizationName: "Test Organization",
          maxRetries: 0, // No retries for faster test
        }),
      ).rejects.toThrow("Failed to generate insights");
    });

    it("should retry on failure", async () => {
      // First call fails, second succeeds
      mockProvider.generateText
        .mockRejectedValueOnce(new Error("Temporary error"))
        .mockResolvedValueOnce({
          content: JSON.stringify({
            insights: [
              {
                type: "info",
                title: "Test",
                message: "Test message",
                priority: 5,
              },
            ],
          }),
        });

      const insights = await generateInsights({
        section: "dashboard",
        data: {},
        organizationName: "Test Organization",
        maxRetries: 1,
      });

      expect(insights).toHaveLength(1);
      expect(mockProvider.generateText).toHaveBeenCalledTimes(2);
    });

    it("should validate insight schema correctly", async () => {
      // Mock invalid LLM response (invalid type)
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

      await expect(
        generateInsights({
          section: "dashboard",
          data: {},
          organizationName: "Test Organization",
        }),
      ).rejects.toThrow();
    });

    it("should parse JSON from markdown code blocks", async () => {
      const mockResponseWithMarkdown = {
        content: `Here's the response:
\`\`\`json
{
  "insights": [
    {
      "type": "warning",
      "title": "Test",
      "message": "Test message",
      "priority": 5
    }
  ]
}
\`\`\``,
      };

      mockProvider.generateText.mockResolvedValue(mockResponseWithMarkdown);

      const insights = await generateInsights({
        section: "dashboard",
        data: {},
        organizationName: "Test Organization",
      });

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe("warning");
    });

    it("should handle no available LLM providers", async () => {
      mockFactory.createProviderWithFallback.mockRejectedValue(
        new Error("No available LLM providers configured"),
      );

      await expect(
        generateInsights({
          section: "dashboard",
          data: {},
          organizationName: "Test Organization",
        }),
      ).rejects.toThrow("No available LLM providers configured");
    });
  });

  describe("generateSingleInsight", () => {
    it("should return highest priority insight", async () => {
      const mockLLMResponse = {
        content: JSON.stringify({
          insights: [
            {
              type: "info",
              title: "Low Priority",
              message: "Test",
              priority: 3,
            },
            {
              type: "warning",
              title: "High Priority",
              message: "Test",
              priority: 9,
            },
            {
              type: "opportunity",
              title: "Medium Priority",
              message: "Test",
              priority: 6,
            },
          ],
        }),
      };

      mockProvider.generateText.mockResolvedValue(mockLLMResponse);

      const insight = await generateSingleInsight({
        section: "dashboard",
        data: {},
        organizationName: "Test Organization",
      });

      expect(insight).not.toBeNull();
      expect(insight?.priority).toBe(9);
      expect(insight?.type).toBe("warning");
    });

    it("should throw error if no insights generated (schema requires at least one)", async () => {
      const mockLLMResponse = {
        content: JSON.stringify({
          insights: [],
        }),
      };

      mockProvider.generateText.mockResolvedValue(mockLLMResponse);

      await expect(
        generateSingleInsight({
          section: "dashboard",
          data: {},
          organizationName: "Test Organization",
        }),
      ).rejects.toThrow();
    });
  });
});
