import { describe, expect, it } from "vitest";

import {
  InsightFeedbackSchema,
  InsightSchema,
  InsightSectionSchema,
  InsightsResponseSchema,
  InsightTypeSchema,
} from "@/lib/ai/insights/schemas";

describe("AI Insights Schemas", () => {
  describe("InsightTypeSchema", () => {
    it("should validate valid insight types", () => {
      expect(() => InsightTypeSchema.parse("warning")).not.toThrow();
      expect(() => InsightTypeSchema.parse("opportunity")).not.toThrow();
      expect(() => InsightTypeSchema.parse("info")).not.toThrow();
      expect(() => InsightTypeSchema.parse("neutral")).not.toThrow();
    });

    it("should reject invalid insight types", () => {
      expect(() => InsightTypeSchema.parse("invalid")).toThrow();
      expect(() => InsightTypeSchema.parse("error")).toThrow();
    });
  });

  describe("InsightSectionSchema", () => {
    it("should validate valid sections", () => {
      expect(() => InsightSectionSchema.parse("dashboard")).not.toThrow();
      expect(() => InsightSectionSchema.parse("inventory")).not.toThrow();
      expect(() => InsightSectionSchema.parse("clients")).not.toThrow();
      expect(() => InsightSectionSchema.parse("pos")).not.toThrow();
      expect(() => InsightSectionSchema.parse("analytics")).not.toThrow();
    });

    it("should reject invalid sections", () => {
      expect(() => InsightSectionSchema.parse("invalid")).toThrow();
      expect(() => InsightSectionSchema.parse("products")).toThrow();
    });
  });

  describe("InsightSchema", () => {
    it("should validate a valid insight", () => {
      const validInsight = {
        type: "warning",
        title: "Test Title",
        message: "Test message",
        priority: 5,
      };

      expect(() => InsightSchema.parse(validInsight)).not.toThrow();
    });

    it("should validate insight with optional fields", () => {
      const insightWithOptional = {
        type: "opportunity",
        title: "Test Title",
        message: "Test message",
        priority: 8,
        action_label: "View Details",
        action_url: "https://example.com",
        metadata: { productIds: [1, 2, 3] },
      };

      expect(() => InsightSchema.parse(insightWithOptional)).not.toThrow();
    });

    it("should reject invalid insight types", () => {
      const invalidInsight = {
        type: "invalid_type",
        title: "Test",
        message: "Test",
        priority: 5,
      };

      expect(() => InsightSchema.parse(invalidInsight)).toThrow();
    });

    it("should enforce title character limit (100)", () => {
      const invalidInsight = {
        type: "warning",
        title: "A".repeat(101), // Exceeds 100 char limit
        message: "Test",
        priority: 5,
      };

      expect(() => InsightSchema.parse(invalidInsight)).toThrow();
    });

    it("should enforce message character limit (500)", () => {
      const invalidInsight = {
        type: "warning",
        title: "Test",
        message: "A".repeat(501), // Exceeds 500 char limit
        priority: 5,
      };

      expect(() => InsightSchema.parse(invalidInsight)).toThrow();
    });

    it("should enforce action_label character limit (50)", () => {
      const invalidInsight = {
        type: "warning",
        title: "Test",
        message: "Test",
        priority: 5,
        action_label: "A".repeat(51), // Exceeds 50 char limit
      };

      expect(() => InsightSchema.parse(invalidInsight)).toThrow();
    });

    it("should validate action_url format", () => {
      const invalidInsight = {
        type: "warning",
        title: "Test",
        message: "Test",
        priority: 5,
        action_url: "not-a-valid-url",
      };

      expect(() => InsightSchema.parse(invalidInsight)).toThrow();
    });

    it("should enforce priority range (1-10)", () => {
      const invalidLow = {
        type: "warning",
        title: "Test",
        message: "Test",
        priority: 0, // Below minimum
      };

      const invalidHigh = {
        type: "warning",
        title: "Test",
        message: "Test",
        priority: 11, // Above maximum
      };

      expect(() => InsightSchema.parse(invalidLow)).toThrow();
      expect(() => InsightSchema.parse(invalidHigh)).toThrow();
    });

    it("should accept valid priority range", () => {
      const minPriority = {
        type: "warning",
        title: "Test",
        message: "Test",
        priority: 1,
      };

      const maxPriority = {
        type: "warning",
        title: "Test",
        message: "Test",
        priority: 10,
      };

      expect(() => InsightSchema.parse(minPriority)).not.toThrow();
      expect(() => InsightSchema.parse(maxPriority)).not.toThrow();
    });
  });

  describe("InsightsResponseSchema", () => {
    it("should validate a valid insights response", () => {
      const validResponse = {
        insights: [
          {
            type: "warning",
            title: "Test Warning",
            message: "Test message",
            priority: 8,
          },
          {
            type: "opportunity",
            title: "Test Opportunity",
            message: "Test message",
            priority: 6,
          },
        ],
      };

      expect(() => InsightsResponseSchema.parse(validResponse)).not.toThrow();
    });

    it("should require at least one insight", () => {
      const invalidResponse = {
        insights: [],
      };

      expect(() => InsightsResponseSchema.parse(invalidResponse)).toThrow();
    });

    it("should validate all insights in array", () => {
      const invalidResponse = {
        insights: [
          {
            type: "warning",
            title: "Valid",
            message: "Valid",
            priority: 5,
          },
          {
            type: "invalid", // Invalid type
            title: "Invalid",
            message: "Invalid",
            priority: 5,
          },
        ],
      };

      expect(() => InsightsResponseSchema.parse(invalidResponse)).toThrow();
    });
  });

  describe("InsightFeedbackSchema", () => {
    it("should validate valid feedback scores", () => {
      for (let score = 1; score <= 5; score++) {
        expect(() => InsightFeedbackSchema.parse({ score })).not.toThrow();
      }
    });

    it("should reject scores below 1", () => {
      expect(() => InsightFeedbackSchema.parse({ score: 0 })).toThrow();
      expect(() => InsightFeedbackSchema.parse({ score: -1 })).toThrow();
    });

    it("should reject scores above 5", () => {
      expect(() => InsightFeedbackSchema.parse({ score: 6 })).toThrow();
      expect(() => InsightFeedbackSchema.parse({ score: 10 })).toThrow();
    });

    it("should reject non-integer scores", () => {
      expect(() => InsightFeedbackSchema.parse({ score: 3.5 })).toThrow();
      expect(() => InsightFeedbackSchema.parse({ score: 2.7 })).toThrow();
    });
  });
});
