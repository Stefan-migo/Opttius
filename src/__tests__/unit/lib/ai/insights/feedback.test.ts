import { describe, it, expect, vi, beforeEach } from "vitest";
import { InsightFeedbackSystem } from "@/lib/ai/insights/feedback";
import type {
  InsightFeedback,
  DatabaseInsight,
} from "@/lib/ai/insights/schemas";

// Mock Supabase - create a proper chainable mock
const createMockSupabase = () => {
  const mock = {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  return mock;
};

let mockSupabase: ReturnType<typeof createMockSupabase>;

describe("InsightFeedbackSystem", () => {
  let feedbackSystem: InsightFeedbackSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    feedbackSystem = new InsightFeedbackSystem(mockSupabase as any);
  });

  describe("collectFeedback", () => {
    it("should update insight with feedback score", async () => {
      const insightId = "insight-123";
      const feedback: InsightFeedback = { score: 5 };

      mockSupabase.eq.mockResolvedValue({ error: null });

      await feedbackSystem.collectFeedback(insightId, feedback);

      expect(mockSupabase.from).toHaveBeenCalledWith("ai_insights");
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          feedback_score: 5,
          updated_at: expect.any(String),
        }),
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", insightId);
    });

    it("should handle high scores (>= 4)", async () => {
      const insightId = "insight-456";
      const highFeedback: InsightFeedback = { score: 4 };

      mockSupabase.eq.mockResolvedValue({ error: null });

      await expect(
        feedbackSystem.collectFeedback(insightId, highFeedback),
      ).resolves.not.toThrow();

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ feedback_score: 4 }),
      );
    });

    it("should handle low scores (< 4)", async () => {
      const insightId = "insight-789";
      const lowFeedback: InsightFeedback = { score: 2 };

      mockSupabase.eq.mockResolvedValue({ error: null });

      await expect(
        feedbackSystem.collectFeedback(insightId, lowFeedback),
      ).resolves.not.toThrow();

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ feedback_score: 2 }),
      );
    });

    it("should throw error if database update fails", async () => {
      const insightId = "insight-error";
      const feedback: InsightFeedback = { score: 3 };

      const dbError = new Error("Database connection failed");
      mockSupabase.eq.mockResolvedValue({ error: dbError });

      await expect(
        feedbackSystem.collectFeedback(insightId, feedback),
      ).rejects.toThrow();
    });
  });

  describe("getPersonalizedInsights", () => {
    const mockInsights: DatabaseInsight[] = [
      {
        id: "insight-1",
        organization_id: "org-123",
        section: "dashboard",
        type: "warning",
        title: "High Priority Insight",
        message: "This needs attention",
        priority: 9,
        is_dismissed: false,
        metadata: {},
        created_at: "2026-02-06T10:00:00Z",
        updated_at: "2026-02-06T10:00:00Z",
      },
      {
        id: "insight-2",
        organization_id: "org-123",
        section: "dashboard",
        type: "info",
        title: "Medium Priority Insight",
        message: "This is informational",
        priority: 5,
        is_dismissed: false,
        metadata: {},
        created_at: "2026-02-06T09:00:00Z",
        updated_at: "2026-02-06T09:00:00Z",
      },
      {
        id: "insight-3",
        organization_id: "org-123",
        section: "dashboard",
        type: "opportunity",
        title: "Low Priority Insight",
        message: "This is an opportunity",
        priority: 3,
        is_dismissed: false,
        metadata: {},
        created_at: "2026-02-06T08:00:00Z",
        updated_at: "2026-02-06T08:00:00Z",
      },
    ];

    it("should fetch insights for organization and section", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: mockInsights,
        error: null,
      });

      const insights = await feedbackSystem.getPersonalizedInsights(
        "org-123",
        "dashboard",
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("ai_insights");
      expect(mockSupabase.select).toHaveBeenCalledWith("*");
      expect(mockSupabase.eq).toHaveBeenCalledWith(
        "organization_id",
        "org-123",
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("section", "dashboard");
      expect(mockSupabase.eq).toHaveBeenCalledWith("is_dismissed", false);
      expect(insights).toEqual(mockInsights);
    });

    it("should order by priority descending", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: mockInsights,
        error: null,
      });

      await feedbackSystem.getPersonalizedInsights("org-123", "dashboard");

      expect(mockSupabase.order).toHaveBeenCalledWith("priority", {
        ascending: false,
      });
    });

    it("should order by created_at descending as secondary sort", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: mockInsights,
        error: null,
      });

      await feedbackSystem.getPersonalizedInsights("org-123", "inventory");

      expect(mockSupabase.order).toHaveBeenNthCalledWith(1, "priority", {
        ascending: false,
      });
      expect(mockSupabase.order).toHaveBeenNthCalledWith(2, "created_at", {
        ascending: false,
      });
    });

    it("should limit results to 20 insights", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: mockInsights,
        error: null,
      });

      await feedbackSystem.getPersonalizedInsights("org-123", "clients");

      expect(mockSupabase.limit).toHaveBeenCalledWith(20);
    });

    it("should return empty array if no insights found", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: null,
      });

      const insights = await feedbackSystem.getPersonalizedInsights(
        "org-123",
        "pos",
      );

      expect(insights).toEqual([]);
    });

    it("should throw error if database query fails", async () => {
      const dbError = new Error("Query failed");
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        feedbackSystem.getPersonalizedInsights("org-123", "analytics"),
      ).rejects.toThrow("Query failed");
    });

    it("should filter out dismissed insights", async () => {
      const mixedInsights = [
        ...mockInsights,
        {
          id: "insight-dismissed",
          organization_id: "org-123",
          section: "dashboard",
          type: "warning",
          title: "Dismissed Insight",
          message: "This was dismissed",
          priority: 10,
          is_dismissed: true,
          metadata: {},
          created_at: "2026-02-06T11:00:00Z",
          updated_at: "2026-02-06T11:00:00Z",
        },
      ];

      mockSupabase.limit.mockResolvedValue({
        data: mockInsights, // Should not include dismissed
        error: null,
      });

      const insights = await feedbackSystem.getPersonalizedInsights(
        "org-123",
        "dashboard",
      );

      expect(mockSupabase.eq).toHaveBeenCalledWith("is_dismissed", false);
      expect(insights).not.toContainEqual(
        expect.objectContaining({ is_dismissed: true }),
      );
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle concurrent feedback submissions", async () => {
      mockSupabase.eq.mockResolvedValue({ error: null });

      const feedbacks = [
        feedbackSystem.collectFeedback("insight-1", { score: 5 }),
        feedbackSystem.collectFeedback("insight-2", { score: 4 }),
        feedbackSystem.collectFeedback("insight-3", { score: 3 }),
      ];

      await expect(Promise.all(feedbacks)).resolves.not.toThrow();
      expect(mockSupabase.update).toHaveBeenCalledTimes(3);
    });

    it("should handle invalid organization ID gracefully", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const insights = await feedbackSystem.getPersonalizedInsights(
        "invalid-org-id",
        "dashboard",
      );

      expect(insights).toEqual([]);
    });
  });
});
