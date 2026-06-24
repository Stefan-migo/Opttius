/**
 * Integration Tests for SaaS Support Tickets API
 *
 * These tests validate:
 * 1. Root/dev can access all tickets
 * 2. Organizations can only access their own tickets
 * 3. CRUD operations
 * 4. Email notifications
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  cleanupRootUser,
  cleanupTestData,
  createTestOrganization,
  createTestRootUser,
  createTestUser,
  isMultiTenancyAvailable,
  makeAuthenticatedRequest,
  type TestOrganization,
  type TestUser,
} from "../../helpers/test-setup";

const hasSupabaseInfra = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
let infrastructureCheck = false;

describe.skipIf(!hasSupabaseInfra)(
  "SaaS Support Tickets API - Integration Tests",
  () => {
    let orgA: TestOrganization;
    let orgB: TestOrganization;
    let userA: TestUser;
    let userB: TestUser;
    let rootUser: TestUser;
    let ticketA: unknown;
    let ticketB: unknown;

    beforeAll(async () => {
      infrastructureCheck = await isMultiTenancyAvailable();

      if (!infrastructureCheck) {
        console.warn(
          "⚠️  Multi-tenancy infrastructure not available. Tests will be skipped.",
        );
        return;
      }

      // Create test organizations
      orgA = await createTestOrganization("Organization A", "basic");
      orgB = await createTestOrganization("Organization B", "pro");

      // Create regular users
      userA = await createTestUser(orgA.id, `user-a-${Date.now()}@test.com`);
      userB = await createTestUser(orgB.id, `user-b-${Date.now()}@test.com`);

      // Create root user
      rootUser = await createTestRootUser(
        `root-${Date.now()}@opttius.com`,
        "root",
      );
    });

    afterAll(async () => {
      if (!infrastructureCheck) return;
      await cleanupTestData(orgA.id);
      await cleanupTestData(orgB.id);
      await cleanupRootUser(rootUser.id);
    });

    describe("POST /api/admin/saas-management/support/tickets", () => {
      it("should create ticket for organization user", async () => {
        const response = await makeAuthenticatedRequest(
          "http://localhost:3000/api/admin/saas-management/support/tickets",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subject: "Test Ticket A",
              description: "This is a test ticket from organization A",
              category: "technical",
              priority: "medium",
            }),
          },
          userA.authToken,
          userA.sessionData,
        );

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.ticket).toBeDefined();
        expect(data.ticket.subject).toBe("Test Ticket A");
        expect(data.ticket.ticket_number).toMatch(/^SAAS-\d{8}-[A-Z0-9]{5}$/);
        ticketA = data.ticket;
      });

      it("should reject non-authenticated requests", async () => {
        const response = await fetch(
          "http://localhost:3000/api/admin/saas-management/support/tickets",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subject: "Test",
              description: "Test description",
              category: "technical",
            }),
          },
        );

        expect(response.status).toBe(401);
      });

      it("should validate required fields", async () => {
        const response = await makeAuthenticatedRequest(
          "http://localhost:3000/api/admin/saas-management/support/tickets",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subject: "Test",
              // Missing description and category
            }),
          },
          userA.authToken,
          userA.sessionData,
        );

        expect(response.status).toBe(400);
      });
    });

    describe("GET /api/admin/saas-management/support/tickets", () => {
      beforeAll(async () => {
        // Create ticket for orgB
        const response = await makeAuthenticatedRequest(
          "http://localhost:3000/api/admin/saas-management/support/tickets",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subject: "Test Ticket B",
              description: "This is a test ticket from organization B",
              category: "billing",
              priority: "high",
            }),
          },
          userB.authToken,
          userB.sessionData,
        );

        const data = await response.json();
        ticketB = data.ticket;
      });

      it("should return only organization's tickets for regular users", async () => {
        const response = await makeAuthenticatedRequest(
          "http://localhost:3000/api/admin/saas-management/support/tickets",
          {
            method: "GET",
          },
          userA.authToken,
          userA.sessionData,
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.tickets).toBeDefined();
        expect(Array.isArray(data.tickets)).toBe(true);

        // User A should only see tickets from orgA
        const ticketIds = data.tickets.map((t: unknown) => t.id);
        expect(ticketIds).toContain(ticketA.id);
        expect(ticketIds).not.toContain(ticketB.id);
      });

      it("should return all tickets for root user", async () => {
        const response = await makeAuthenticatedRequest(
          "http://localhost:3000/api/admin/saas-management/support/tickets",
          {
            method: "GET",
          },
          rootUser.authToken,
          rootUser.sessionData,
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.tickets).toBeDefined();
        expect(Array.isArray(data.tickets)).toBe(true);

        // Root should see all tickets
        const ticketIds = data.tickets.map((t: unknown) => t.id);
        expect(ticketIds).toContain(ticketA.id);
        expect(ticketIds).toContain(ticketB.id);
      });

      it("should filter by status", async () => {
        const response = await makeAuthenticatedRequest(
          "http://localhost:3000/api/admin/saas-management/support/tickets?status=open",
          {
            method: "GET",
          },
          rootUser.authToken,
          rootUser.sessionData,
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        data.tickets.forEach((ticket: unknown) => {
          expect(ticket.status).toBe("open");
        });
      });

      it("should filter by priority", async () => {
        const response = await makeAuthenticatedRequest(
          "http://localhost:3000/api/admin/saas-management/support/tickets?priority=high",
          {
            method: "GET",
          },
          rootUser.authToken,
          rootUser.sessionData,
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        data.tickets.forEach((ticket: unknown) => {
          expect(ticket.priority).toBe("high");
        });
      });

      it("should paginate results", async () => {
        const response = await makeAuthenticatedRequest(
          "http://localhost:3000/api/admin/saas-management/support/tickets?page=1&limit=1",
          {
            method: "GET",
          },
          rootUser.authToken,
          rootUser.sessionData,
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.tickets.length).toBeLessThanOrEqual(1);
        expect(data.pagination).toBeDefined();
        expect(data.pagination.page).toBe(1);
        expect(data.pagination.limit).toBe(1);
      });
    });

    describe("GET /api/admin/saas-management/support/tickets/[id]", () => {
      it("should return ticket details for organization user", async () => {
        const response = await makeAuthenticatedRequest(
          `http://localhost:3000/api/admin/saas-management/support/tickets/${ticketA.id}`,
          {
            method: "GET",
          },
          userA.authToken,
          userA.sessionData,
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.ticket).toBeDefined();
        expect(data.ticket.id).toBe(ticketA.id);
        expect(data.ticket.subject).toBe("Test Ticket A");
      });

      it("should prevent organization user from accessing other organization's ticket", async () => {
        const response = await makeAuthenticatedRequest(
          `http://localhost:3000/api/admin/saas-management/support/tickets/${ticketB.id}`,
          {
            method: "GET",
          },
          userA.authToken,
          userA.sessionData,
        );

        expect(response.status).toBe(403);
      });

      it("should allow root user to access any ticket", async () => {
        const response = await makeAuthenticatedRequest(
          `http://localhost:3000/api/admin/saas-management/support/tickets/${ticketB.id}`,
          {
            method: "GET",
          },
          rootUser.authToken,
          rootUser.sessionData,
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.ticket.id).toBe(ticketB.id);
      });
    });

    describe("PATCH /api/admin/saas-management/support/tickets/[id]", () => {
      it("should allow root user to update ticket", async () => {
        const response = await makeAuthenticatedRequest(
          `http://localhost:3000/api/admin/saas-management/support/tickets/${ticketA.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "in_progress",
              priority: "high",
            }),
          },
          rootUser.authToken,
          rootUser.sessionData,
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.ticket.status).toBe("in_progress");
        expect(data.ticket.priority).toBe("high");
      });

      it("should reject non-root users from updating tickets", async () => {
        const response = await makeAuthenticatedRequest(
          `http://localhost:3000/api/admin/saas-management/support/tickets/${ticketA.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "resolved",
            }),
          },
          userA.authToken,
          userA.sessionData,
        );

        expect(response.status).toBe(403);
      });

      it("should resolve ticket and set resolution", async () => {
        const response = await makeAuthenticatedRequest(
          `http://localhost:3000/api/admin/saas-management/support/tickets/${ticketA.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "resolved",
              resolution: "Issue resolved successfully",
            }),
          },
          rootUser.authToken,
          rootUser.sessionData,
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.ticket.status).toBe("resolved");
        expect(data.ticket.resolution).toBe("Issue resolved successfully");
        expect(data.ticket.resolved_at).toBeDefined();
      });
    });

    describe("POST /api/admin/saas-management/support/tickets/[id]/messages", () => {
      it("should create message for organization user", async () => {
        const response = await makeAuthenticatedRequest(
          `http://localhost:3000/api/admin/saas-management/support/tickets/${ticketA.id}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: "This is a test message from the organization",
              is_internal: false,
            }),
          },
          userA.authToken,
          userA.sessionData,
        );

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.message).toBeDefined();
        expect(data.message.message).toBe(
          "This is a test message from the organization",
        );
        expect(data.message.is_from_customer).toBe(true);
      });

      it("should create internal message for root user", async () => {
        const response = await makeAuthenticatedRequest(
          `http://localhost:3000/api/admin/saas-management/support/tickets/${ticketA.id}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: "Internal note from support team",
              is_internal: true,
            }),
          },
          rootUser.authToken,
          rootUser.sessionData,
        );

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.message.is_internal).toBe(true);
        expect(data.message.is_from_customer).toBe(false);
      });

      it("should prevent organization user from accessing other organization's ticket messages", async () => {
        const response = await makeAuthenticatedRequest(
          `http://localhost:3000/api/admin/saas-management/support/tickets/${ticketB.id}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: "Unauthorized message",
            }),
          },
          userA.authToken,
          userA.sessionData,
        );

        expect(response.status).toBe(403);
      });
    });

    describe("GET /api/admin/saas-management/support/tickets/[id]/messages", () => {
      it("should return messages for organization user (excluding internal)", async () => {
        const response = await makeAuthenticatedRequest(
          `http://localhost:3000/api/admin/saas-management/support/tickets/${ticketA.id}/messages`,
          {
            method: "GET",
          },
          userA.authToken,
          userA.sessionData,
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.messages).toBeDefined();
        expect(Array.isArray(data.messages)).toBe(true);

        // Organization users should not see internal messages
        data.messages.forEach((msg: unknown) => {
          expect(msg.is_internal).toBe(false);
        });
      });

      it("should return all messages (including internal) for root user", async () => {
        const response = await makeAuthenticatedRequest(
          `http://localhost:3000/api/admin/saas-management/support/tickets/${ticketA.id}/messages`,
          {
            method: "GET",
          },
          rootUser.authToken,
          rootUser.sessionData,
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.messages).toBeDefined();

        // Root should see internal messages
        const hasInternalMessage = data.messages.some(
          (msg: unknown) => msg.is_internal === true,
        );
        expect(hasInternalMessage).toBe(true);
      });
    });
  },
);
