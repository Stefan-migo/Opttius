/**
 * Integration Tests for AI Insights API
 *
 * These tests validate:
 * 1. Basic CRUD operations
 * 2. Multi-tenancy data isolation
 * 3. Section filtering
 * 4. Dismiss and feedback actions
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestOrganization,
  createTestUser,
  cleanupTestData,
  makeAuthenticatedRequest,
  isMultiTenancyAvailable,
  type TestOrganization,
  type TestUser,
} from "../../helpers/test-setup";

let infrastructureCheck = false;

describe("AI Insights API - Integration Tests", () => {
  let orgA: TestOrganization;
  let orgB: TestOrganization;
  let userA: TestUser;
  let userB: TestUser;
  let insightA: any;
  let insightB: any;

  beforeAll(async () => {
    infrastructureCheck = await isMultiTenancyAvailable();

    if (!infrastructureCheck) {
      console.warn(
        "⚠️  Multi-tenancy infrastructure not available. Tests will be skipped.",
      );
      return;
    }

    // Create two test organizations
    orgA = await createTestOrganization("Organization A", "basic");
    orgB = await createTestOrganization("Organization B", "basic");

    // Create users for each organization
    userA = await createTestUser(orgA.id, "user-a@test.com");
    userB = await createTestUser(orgB.id, "user-b@test.com");

    // Create test insights directly in DB (using service role)
    const { createServiceRoleClient } = await import("@/utils/supabase/server");
    const supabase = createServiceRoleClient();

    const { data: insightAData } = await supabase
      .from("ai_insights")
      .insert({
        organization_id: orgA.id,
        section: "dashboard",
        type: "warning",
        title: "Org A Warning",
        message: "Test message for org A",
        priority: 8,
        is_dismissed: false,
      })
      .select()
      .single();

    const { data: insightBData } = await supabase
      .from("ai_insights")
      .insert({
        organization_id: orgB.id,
        section: "dashboard",
        type: "info",
        title: "Org B Info",
        message: "Test message for org B",
        priority: 5,
        is_dismissed: false,
      })
      .select()
      .single();

    insightA = insightAData;
    insightB = insightBData;
  });

  afterAll(async () => {
    if (infrastructureCheck) {
      if (orgA?.id) await cleanupTestData(orgA.id);
      if (orgB?.id) await cleanupTestData(orgB.id);
    }
  });

  describe("GET /api/ai/insights", () => {
    it("should fetch insights for section", async () => {
      if (!infrastructureCheck) {
        return;
      }

      const response = await makeAuthenticatedRequest(
        "/api/ai/insights?section=dashboard",
        { method: "GET" },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.insights).toBeDefined();
      expect(Array.isArray(data.insights)).toBe(true);
      expect(data.insights.length).toBeGreaterThan(0);
    });

    it("should filter dismissed insights", async () => {
      if (!infrastructureCheck) {
        return;
      }

      // Create a dismissed insight
      const { createServiceRoleClient } = await import(
        "@/utils/supabase/server"
      );
      const supabase = createServiceRoleClient();

      const { data: dismissedInsight } = await supabase
        .from("ai_insights")
        .insert({
          organization_id: orgA.id,
          section: "dashboard",
          type: "neutral",
          title: "Dismissed Insight",
          message: "This should not appear",
          priority: 1,
          is_dismissed: true,
        })
        .select()
        .single();

      const response = await makeAuthenticatedRequest(
        "/api/ai/insights?section=dashboard",
        { method: "GET" },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      const dismissed = data.insights.find(
        (i: any) => i.id === dismissedInsight?.id,
      );
      expect(dismissed).toBeUndefined();
    });

    it("should order by priority", async () => {
      if (!infrastructureCheck) {
        return;
      }

      // Create insights with different priorities
      const { createServiceRoleClient } = await import(
        "@/utils/supabase/server"
      );
      const supabase = createServiceRoleClient();

      await supabase.from("ai_insights").insert([
        {
          organization_id: orgA.id,
          section: "dashboard",
          type: "info",
          title: "Low Priority",
          message: "Test",
          priority: 2,
        },
        {
          organization_id: orgA.id,
          section: "dashboard",
          type: "warning",
          title: "High Priority",
          message: "Test",
          priority: 9,
        },
        {
          organization_id: orgA.id,
          section: "dashboard",
          type: "opportunity",
          title: "Medium Priority",
          message: "Test",
          priority: 5,
        },
      ]);

      const response = await makeAuthenticatedRequest(
        "/api/ai/insights?section=dashboard",
        { method: "GET" },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      const priorities = data.insights.map((i: any) => i.priority);
      expect(priorities).toEqual([...priorities].sort((a, b) => b - a));
    });

    it("should respect organization isolation", async () => {
      if (!infrastructureCheck) {
        return;
      }

      // User A should only see org A insights
      const responseA = await makeAuthenticatedRequest(
        "/api/ai/insights?section=dashboard",
        { method: "GET" },
        userA.authToken,
        userA.sessionData,
      );

      const dataA = await responseA.json();
      const orgAInsights = dataA.insights.filter(
        (i: any) => i.organization_id === orgA.id,
      );
      expect(orgAInsights.length).toBeGreaterThan(0);

      // User B should only see org B insights
      const responseB = await makeAuthenticatedRequest(
        "/api/ai/insights?section=dashboard",
        { method: "GET" },
        userB.authToken,
        userB.sessionData,
      );

      const dataB = await responseB.json();
      const orgBInsights = dataB.insights.filter(
        (i: any) => i.organization_id === orgB.id,
      );
      expect(orgBInsights.length).toBeGreaterThan(0);

      // User A should not see org B insights
      const userASeesOrgB = dataA.insights.some(
        (i: any) => i.organization_id === orgB.id,
      );
      expect(userASeesOrgB).toBe(false);
    });
  });

  describe("POST /api/ai/insights/:id/dismiss", () => {
    it("should handle dismiss action", async () => {
      if (!infrastructureCheck || !insightA) {
        return;
      }

      const response = await makeAuthenticatedRequest(
        `/api/ai/insights/${insightA.id}/dismiss`,
        { method: "POST" },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.insight.is_dismissed).toBe(true);
    });

    it("should not allow dismissing other organization insights", async () => {
      if (!infrastructureCheck || !insightB) {
        return;
      }

      // User A tries to dismiss org B insight
      const response = await makeAuthenticatedRequest(
        `/api/ai/insights/${insightB.id}/dismiss`,
        { method: "POST" },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/ai/insights/:id/feedback", () => {
    it("should handle feedback action", async () => {
      if (!infrastructureCheck || !insightA) {
        return;
      }

      const response = await makeAuthenticatedRequest(
        `/api/ai/insights/${insightA.id}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: 5 }),
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.insight.feedback_score).toBe(5);
    });

    it("should validate feedback score range", async () => {
      if (!infrastructureCheck || !insightA) {
        return;
      }

      // Score too high
      const responseHigh = await makeAuthenticatedRequest(
        `/api/ai/insights/${insightA.id}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: 10 }),
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(responseHigh.status).toBe(400);

      // Score too low
      const responseLow = await makeAuthenticatedRequest(
        `/api/ai/insights/${insightA.id}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: 0 }),
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(responseLow.status).toBe(400);
    });
  });
});
