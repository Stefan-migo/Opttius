/**
 * Unit tests for NotificationService
 *
 * Tests createNotification with various notification types,
 * routing scenarios (branch, org, SaaS), disabled types,
 * and error handling.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/supabase/server", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import type { Mock } from "vitest";

import { NotificationService } from "@/lib/notifications/notification-service";
import { createServiceRoleClient } from "@/utils/supabase/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSupabase() {
  const single = vi.fn().mockResolvedValue({ data: null, error: null });
  const insert = vi.fn();
  const rpc = vi.fn();

  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single,
    insert,
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);

  (createServiceRoleClient as Mock).mockReturnValue({
    from: vi.fn(() => chain),
    rpc,
  });

  return { chain, single, insert, rpc };
}

// ---------------------------------------------------------------------------
// createNotification
// ---------------------------------------------------------------------------

describe("NotificationService.createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Basic in-app notification ─────────────────────────────────────

  it("creates an in-app notification successfully", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({
      data: { enabled: true, priority: "high" },
      error: null,
    });
    insert.mockResolvedValue({ error: null });

    const result = await NotificationService.createNotification({
      type: "quote_new",
      title: "Nuevo Presupuesto",
      message: "Presupuesto #001 creado",
      relatedEntityType: "quote",
      relatedEntityId: "quote-1",
      actionUrl: "/admin/quotes/quote-1",
      organizationId: "org-1",
      branchId: "branch-1",
    });

    expect(result.success).toBe(true);

    expect(insert).toHaveBeenCalledTimes(1);
    const payload = insert.mock.calls[0][0];
    expect(payload.type).toBe("quote_new");
    expect(payload.organization_id).toBe("org-1");
    expect(payload.branch_id).toBe("branch-1");
    expect(payload.priority).toBe("high");
    expect(payload.created_by_system).toBe(true);
  });

  // ── SaaS notification (root, no branch/org) ───────────────────────

  it("creates a SaaS notification with targetAdminRole=root", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({
      data: { enabled: true },
      error: null,
    });
    insert.mockResolvedValue({ error: null });

    const result = await NotificationService.createNotification({
      type: "support_ticket_new",
      title: "Nuevo ticket",
      message: "Ticket de soporte",
      targetAdminRole: "root",
    });

    expect(result.success).toBe(true);
    const payload = insert.mock.calls[0][0];
    expect(payload.organization_id).toBeNull();
    expect(payload.branch_id).toBeNull();
    expect(payload.target_admin_role).toBe("root");
  });

  // ── Branch resolution (branchId→orgId) ────────────────────────────

  it("resolves organization_id from branch when not provided", async () => {
    const { chain, insert, rpc } = mockSupabase();
    chain.single.mockResolvedValue({
      data: { organization_id: "org-from-branch" },
      error: null,
    });
    rpc.mockResolvedValue({ data: { enabled: true }, error: null });
    insert.mockResolvedValue({ error: null });

    const result = await NotificationService.createNotification({
      type: "work_order_new",
      title: "Nuevo Trabajo",
      message: "WO-001 creado",
      branchId: "branch-1",
    });

    expect(result.success).toBe(true);
    const payload = insert.mock.calls[0][0];
    expect(payload.organization_id).toBe("org-from-branch");
    expect(payload.branch_id).toBe("branch-1");
  });

  // ── Disabled notification type ────────────────────────────────────

  it("skips creation when notification type is disabled", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({
      data: { enabled: false },
      error: null,
    });

    const result = await NotificationService.createNotification({
      type: "low_stock",
      title: "Stock bajo",
      message: "Producto X sin stock",
      organizationId: "org-1",
    });

    expect(result.success).toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });

  // ── RPC error → assumes enabled ──────────────────────────────────

  it("proceeds with default priority when RPC errors", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({ data: null, error: new Error("RPC error") });
    insert.mockResolvedValue({ error: null });

    const result = await NotificationService.createNotification({
      type: "custom",
      title: "Test",
      message: "Fallback to enabled",
      organizationId: "org-1",
    });

    expect(result.success).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0].priority).toBe("medium");
  });

  // ── Insert error ──────────────────────────────────────────────────

  it("returns error when insert fails", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({ data: { enabled: true }, error: null });
    insert.mockResolvedValue({ error: new Error("Insert failed") });

    const result = await NotificationService.createNotification({
      type: "sale_new",
      title: "Venta",
      message: "Nueva venta",
      organizationId: "org-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Insert failed");
  });

  // ── Catches thrown errors ─────────────────────────────────────────

  it("catches thrown errors gracefully", async () => {
    (createServiceRoleClient as Mock).mockImplementation(() => {
      throw new Error("Unexpected crash");
    });

    const result = await NotificationService.createNotification({
      type: "system_alert",
      title: "Alert",
      message: "System down",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unexpected crash");
  });

  // ── Priority from settings ────────────────────────────────────────

  it("uses priority from notification settings", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({ data: { enabled: true, priority: "urgent" }, error: null });
    insert.mockResolvedValue({ error: null });

    await NotificationService.createNotification({
      type: "security_alert",
      title: "Security",
      message: "Alert",
      organizationId: "org-1",
      priority: "low",
    });

    expect(insert.mock.calls[0][0].priority).toBe("urgent");
  });

  // ── Related entity resolution (order) ─────────────────────────────

  it("resolves org/branch from related entity when not provided", async () => {
    const { chain, single, insert, rpc } = mockSupabase();

    // Branch query is skipped (no branchId).
    // Single call to resolve entity from orders table.
    chain.single.mockResolvedValue({
      data: {
        organization_id: "org-from-order",
        branch_id: "branch-from-order",
      },
      error: null,
    });

    rpc.mockResolvedValue({ data: { enabled: true }, error: null });
    insert.mockResolvedValue({ error: null });

    const result = await NotificationService.createNotification({
      type: "order_new",
      title: "Nuevo Pedido",
      message: "Order #123",
      relatedEntityType: "order",
      relatedEntityId: "order-123",
    });

    expect(result.success).toBe(true);
    const payload = insert.mock.calls[0][0];
    expect(payload.organization_id).toBe("org-from-order");
    expect(payload.branch_id).toBe("branch-from-order");
  });

  // ── Empty/null branchId → null in insert ──────────────────────────

  it("inserts null branch_id when not provided", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({ data: { enabled: true }, error: null });
    insert.mockResolvedValue({ error: null });

    await NotificationService.createNotification({
      type: "system_update",
      title: "Update",
      message: "System updated",
      organizationId: "org-1",
    });

    expect(insert.mock.calls[0][0].branch_id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Specific notification helpers (smoke tests)
// ---------------------------------------------------------------------------

describe("NotificationService helper methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("notifyNewQuote calls createNotification with correct params", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({ data: { enabled: true }, error: null });
    insert.mockResolvedValue({ error: null });

    await NotificationService.notifyNewQuote("q-1", "QT-001", "Juan Pérez", 50000, "b-1");

    expect(insert.mock.calls[0][0].type).toBe("quote_new");
    expect(insert.mock.calls[0][0].branch_id).toBe("b-1");
  });

  it("notifyNewWorkOrder calls createNotification", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({ data: { enabled: true }, error: null });
    insert.mockResolvedValue({ error: null });

    await NotificationService.notifyNewWorkOrder("wo-1", "WO-001", "María García", 75000, "b-1");

    expect(insert.mock.calls[0][0].type).toBe("work_order_new");
    expect(insert.mock.calls[0][0].title).toBe("Nuevo Trabajo");
  });

  it("notifyAppointmentCancelled calls createNotification", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({ data: { enabled: true }, error: null });
    insert.mockResolvedValue({ error: null });

    await NotificationService.notifyAppointmentCancelled(
      "a-1", "Pedro López", "2025-07-15", "10:30", "b-1",
    );

    expect(insert.mock.calls[0][0].type).toBe("appointment_cancelled");
    expect(insert.mock.calls[0][0].message).toContain("Pedro López");
  });

  it("notifySaasSupportTicketNew sets targetAdminRole=root", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({ data: { enabled: true }, error: null });
    insert.mockResolvedValue({ error: null });

    await NotificationService.notifySaasSupportTicketNew(
      "t-1", "TK-001", "Problema con facturación", "cliente@test.cl", "Óptica Test",
    );

    expect(insert.mock.calls[0][0].target_admin_role).toBe("root");
    expect(insert.mock.calls[0][0].organization_id).toBeNull();
    expect(insert.mock.calls[0][0].branch_id).toBeNull();
  });

  it("notifySaasSupportTicketAssigned sets targetAdminId", async () => {
    const { insert, rpc } = mockSupabase();
    rpc.mockResolvedValue({ data: { enabled: true }, error: null });
    insert.mockResolvedValue({ error: null });

    await NotificationService.notifySaasSupportTicketAssigned(
      "t-1", "TK-001", "Urgente", "admin-42",
    );

    expect(insert.mock.calls[0][0].target_admin_id).toBe("admin-42");
  });
});
