import { beforeEach, describe, expect, it, vi } from "vitest";

import { appointmentTools } from "../appointments";
import { createMockBuilder, createMockSupabase, UUID, makeContext } from "./helpers";

// ponytail: vi.mock hoisting means factories can't use imported variables (UUID here)
vi.mock("../resolvers", () => ({
  resolveBranchByName: vi.fn().mockResolvedValue(
    "22222222-2222-2222-2222-222222222222",
  ),
}));

vi.mock("@/utils/supabase/server", () => ({
  createServiceRoleClient: vi.fn(),
}));

describe("appointmentTools", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  describe("getAppointmentSlots", () => {
    const tool = appointmentTools.find((t) => t.name === "getAppointmentSlots")!;

    it("returns available slots on success", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({
          data: { id: UUID.BRANCH, organization_id: UUID.ORG },
          error: null,
        }),
      );
      mockSupabase.rpc.mockResolvedValue({
        data: [
          { time_slot: "09:00", available: true },
          { time_slot: "10:00", available: false },
          { time_slot: "11:00", available: true },
        ],
        error: null,
      });

      const result = await tool.execute(
        { date: "2026-07-01" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        date: "2026-07-01",
        duration: 30,
        availableCount: 2,
        availableSlots: ["09:00", "11:00"],
      });
    });

    it("fails when organizationId is missing", async () => {
      const result = await tool.execute(
        { date: "2026-07-01" },
        makeContext({ supabase: mockSupabase, organizationId: null }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Organization ID is missing in context");
    });

    it("fails when no branchId", async () => {
      const result = await tool.execute(
        { date: "2026-07-01" },
        makeContext({ supabase: mockSupabase, currentBranchId: null }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Selecciona una sucursal");
    });

    it("fails on invalid date", async () => {
      const result = await tool.execute(
        { date: "01-07-2026" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
    });

    it("fails when branch belongs to other org", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({
          data: { id: UUID.OTHER_BRANCH, organization_id: UUID.OTHER_ORG },
          error: null,
        }),
      );

      const result = await tool.execute(
        { date: "2026-07-01" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Sucursal no encontrada o no pertenece a la organización",
      );
    });

    it("fails on RPC error", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({
          data: { id: UUID.BRANCH, organization_id: UUID.ORG },
          error: null,
        }),
      );
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error("RPC failed"),
      });

      const result = await tool.execute(
        { date: "2026-07-01" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("RPC failed");
    });
  });

  describe("getAppointments", () => {
    const tool = appointmentTools.find((t) => t.name === "getAppointments")!;

    it("returns appointments for a date", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({
          data: [
            { id: UUID.APPOINTMENT, appointment_date: "2026-07-01", status: "scheduled" },
          ],
          error: null,
        }),
      );

      const result = await tool.execute(
        { date: "2026-07-01" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.appointments).toHaveLength(1);
      expect(result.message).toContain("1 cita(s)");
    });

    it("fails without orgId", async () => {
      const result = await tool.execute(
        { date: "2026-07-01" },
        makeContext({ supabase: mockSupabase, organizationId: null }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Organization ID is missing in context");
    });

    it("filters by status", async () => {
      const builder = createMockBuilder({
        data: [{ id: UUID.APPOINTMENT, status: "completed" }],
        error: null,
      });
      mockSupabase.from.mockReturnValue(builder);

      await tool.execute(
        { date: "2026-07-01", status: "completed" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(builder.eq).toHaveBeenCalledWith("status", "completed");
    });
  });

  describe("getBranchSchedule", () => {
    const tool = appointmentTools.find((t) => t.name === "getBranchSchedule")!;

    it("returns schedule settings", async () => {
      mockSupabase.from.mockImplementation((table: string) =>
        table === "schedule_settings"
          ? createMockBuilder({ data: { slot_duration_minutes: 20 }, error: null })
          : createMockBuilder({ data: { id: UUID.BRANCH, organization_id: UUID.ORG }, error: null }),
      );

      const result = await tool.execute({}, makeContext({ supabase: mockSupabase }));

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ slot_duration_minutes: 20 });
    });

    it("returns defaults when no settings", async () => {
      mockSupabase.from.mockImplementation((table: string) =>
        table === "schedule_settings"
          ? createMockBuilder({ data: null, error: null })
          : createMockBuilder({ data: { id: UUID.BRANCH, organization_id: UUID.ORG }, error: null }),
      );

      const result = await tool.execute({}, makeContext({ supabase: mockSupabase }));

      expect(result.success).toBe(true);
      expect(result.data.slot_duration_minutes).toBe(15);
    });

    it("fails when branch not found", async () => {
      mockSupabase.from.mockReturnValue(createMockBuilder({ data: null, error: null }));

      const result = await tool.execute({}, makeContext({ supabase: mockSupabase }));

      expect(result.success).toBe(false);
      expect(result.error).toBe("Sucursal no encontrada");
    });
  });

  describe("rescheduleAppointment", () => {
    const tool = appointmentTools.find((t) => t.name === "rescheduleAppointment")!;

    it("reschedules when slot is available", async () => {
      const { createServiceRoleClient } = await import("@/utils/supabase/server");
      vi.mocked(createServiceRoleClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({ data: [{ time_slot: "14:00", available: true }], error: null }),
      } as never);

      mockSupabase.from
        .mockReturnValueOnce(
          createMockBuilder({
            data: { id: UUID.APPOINTMENT, organization_id: UUID.ORG, branch_id: UUID.BRANCH, duration_minutes: 30 },
            error: null,
          }),
        )
        .mockReturnValueOnce(
          createMockBuilder({
            data: { id: UUID.APPOINTMENT, appointment_date: "2026-07-02" },
            error: null,
          }),
        );

      const result = await tool.execute(
        { appointmentId: UUID.APPOINTMENT, appointmentDate: "2026-07-02", appointmentTime: "14:00" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("14:00");
    });

    it("fails without identifier", async () => {
      const result = await tool.execute(
        { appointmentDate: "2026-07-02", appointmentTime: "14:00" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Provide appointmentId");
    });

    it("fails when appointment not found", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({ data: null, error: new Error("Not found") }),
      );

      const result = await tool.execute(
        { appointmentId: UUID.APPOINTMENT, appointmentDate: "2026-07-02", appointmentTime: "14:00" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cita no encontrada");
    });

    it("fails when slot unavailable", async () => {
      const { createServiceRoleClient } = await import("@/utils/supabase/server");
      vi.mocked(createServiceRoleClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: [
            { time_slot: "09:00", available: true },
            { time_slot: "10:00", available: true },
          ],
          error: null,
        }),
      } as never);

      mockSupabase.from.mockReturnValue(
        createMockBuilder({
          data: { id: UUID.APPOINTMENT, organization_id: UUID.ORG, branch_id: UUID.BRANCH, duration_minutes: 30 },
          error: null,
        }),
      );

      const result = await tool.execute(
        { appointmentId: UUID.APPOINTMENT, appointmentDate: "2026-07-02", appointmentTime: "14:00" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("no está disponible");
    });
  });
});
