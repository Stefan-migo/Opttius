import { describe, expect,it } from "vitest";

import {
  getRecentContextSchema,
  saveMemorySchema,
  saveSessionSummarySchema,
  searchOrgMemorySchema,
} from "../memory";

describe("memory tool schemas", () => {
  describe("searchOrgMemorySchema", () => {
    it("parses valid params", () => {
      const result = searchOrgMemorySchema.parse({
        query: "customer preferences",
        limit: 5,
      });
      expect(result.query).toBe("customer preferences");
      expect(result.limit).toBe(5);
    });

    it("applies default limit", () => {
      const result = searchOrgMemorySchema.parse({ query: "test" });
      expect(result.query).toBe("test");
      expect(result.limit).toBe(10);
    });

    it("rejects missing query", () => {
      expect(() => searchOrgMemorySchema.parse({})).toThrow();
    });
  });

  describe("saveMemorySchema", () => {
    it("parses valid params with defaults", () => {
      const result = saveMemorySchema.parse({ content: "remember this" });
      expect(result.content).toBe("remember this");
      expect(result.category).toBe("fact");
      expect(result.importance).toBe(1);
    });

    it("parses all fields", () => {
      const result = saveMemorySchema.parse({
        content: "important decision",
        category: "decision",
        importance: 5,
      });
      expect(result.category).toBe("decision");
      expect(result.importance).toBe(5);
    });

    it("rejects invalid category", () => {
      expect(() =>
        saveMemorySchema.parse({ content: "x", category: "invalid" }),
      ).toThrow();
    });

    it("rejects missing content", () => {
      expect(() => saveMemorySchema.parse({})).toThrow();
    });
  });

  describe("getRecentContextSchema", () => {
    it("parses with custom limit", () => {
      const result = getRecentContextSchema.parse({ limit: 15 });
      expect(result.limit).toBe(15);
    });

    it("applies default limit", () => {
      const result = getRecentContextSchema.parse({});
      expect(result.limit).toBe(5);
    });
  });

  describe("saveSessionSummarySchema", () => {
    it("parses valid params with defaults", () => {
      const result = saveSessionSummarySchema.parse({
        summary: "Great session",
      });
      expect(result.summary).toBe("Great session");
      expect(result.messageCount).toBe(0);
      expect(result.tokenCount).toBe(0);
    });

    it("parses all optional fields", () => {
      const result = saveSessionSummarySchema.parse({
        summary: "Summary",
        messageCount: 10,
        tokenCount: 500,
        screenRoute: "/dashboard",
        sessionId: "abc-123",
      });
      expect(result.messageCount).toBe(10);
      expect(result.tokenCount).toBe(500);
      expect(result.screenRoute).toBe("/dashboard");
      expect(result.sessionId).toBe("abc-123");
    });

    it("rejects missing summary", () => {
      expect(() => saveSessionSummarySchema.parse({})).toThrow();
    });
  });
});
