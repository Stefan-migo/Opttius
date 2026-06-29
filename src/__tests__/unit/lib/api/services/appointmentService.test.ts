/**
 * Unit tests for appointmentService.
 *
 * Mocks ApiClient via globalThis-shared mock instance injected through
 * a plain constructor function.
 * isSuccess and unwrapData are re-implemented inline as pure functions.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock ApiClient — share mock client instance via globalThis
// ---------------------------------------------------------------------------
vi.mock("@/lib/api/client-helpers", () => {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  (globalThis as unknown as Record<string, unknown>).__aptMockClient__ = client;

  function isSuccess(r: Record<string, unknown>): boolean {
    return r?.success === true;
  }
  function unwrapData<T>(response: Record<string, unknown>): T {
    if (isSuccess(response)) return response.data as T;
    const err = response?.error as Record<string, unknown> | undefined;
    const m = err?.message ?? "An unknown error occurred";
    throw new Error(m as string);
  }

  class MockApiClient {
    constructor() {
      return client;
    }
  }

  return {
    ApiClient: MockApiClient,
    isSuccess,
    unwrapData,
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

function getMockClient() {
  return (globalThis as unknown as Record<string, unknown>)
    .__aptMockClient__ as Record<string, ReturnType<typeof vi.fn>>;
}

// Import AFTER mocks
import {
  appointmentService,
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAvailability,
  getScheduleSettings,
  updateScheduleSettings,
  confirmAppointment,
  cancelAppointment,
} from "@/lib/api/services/appointmentService";

const mockAppointment = {
  id: "apt-001",
  customer_id: "550e8400-e29b-41d4-a716-446655440000",
  customer_name: "Juan Pérez",
  customer_email: "juan@example.com",
  appointment_date: "2025-07-15",
  appointment_time: "10:30:00",
  duration_minutes: 30,
  appointment_type: "eye_exam",
  status: "scheduled" as const,
  notes: "Paciente nuevo",
  branch_id: "550e8400-e29b-41d4-a716-446655440001",
  created_at: "2025-07-10T12:00:00Z",
};

const mockAppointmentList = [mockAppointment];

const validCreateData = {
  customer_id: "550e8400-e29b-41d4-a716-446655440000",
  customer_name: "Juan Pérez",
  customer_email: "juan@example.com",
  appointment_date: "2025-07-15",
  appointment_time: "10:30:00",
  duration_minutes: 30,
  appointment_type: "eye_exam",
  notes: "Paciente nuevo",
  branch_id: "550e8400-e29b-41d4-a716-446655440001",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("appointmentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAppointments", () => {
    it("returns paginated list on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockAppointmentList,
        meta: {
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      const result = await getAppointments({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("apt-001");
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/appointments"),
      );
    });

    it("falls back to default pagination when meta is missing", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockAppointmentList,
      });

      const result = await getAppointments();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("throws on API error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Database connection failed",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(getAppointments()).rejects.toThrow(
        "Database connection failed",
      );
    });

    it("handles error response with details fallback", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid parameters",
          details: "branch_id is required",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(getAppointments()).rejects.toThrow(/Invalid parameters/);
    });
  });

  describe("getAppointment", () => {
    it("returns a single appointment on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockAppointment,
      });

      const result = await getAppointment("apt-001");

      expect(result.id).toBe("apt-001");
      expect(result.customer_name).toBe("Juan Pérez");
      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/appointments/apt-001",
      );
    });

    it("throws on not-found error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Appointment not found",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(getAppointment("nonexistent")).rejects.toThrow(
        "Appointment not found",
      );
    });
  });

  describe("createAppointment", () => {
    it("creates and returns the new appointment", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockAppointment,
      });

      const result = await createAppointment(validCreateData);

      expect(result.id).toBe("apt-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/appointments",
        validCreateData,
      );
    });

    it("throws on creation failure", async () => {
      getMockClient().post.mockResolvedValue({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid appointment data",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(createAppointment(validCreateData)).rejects.toThrow(
        "Invalid appointment data",
      );
    });
  });

  describe("updateAppointment", () => {
    it("updates and returns the appointment", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockAppointment, status: "confirmed" },
      });

      const result = await updateAppointment("apt-001", {
        status: "confirmed",
      });

      expect(result.status).toBe("confirmed");
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/appointments/apt-001",
        { status: "confirmed" },
      );
    });
  });

  describe("deleteAppointment", () => {
    it("succeeds on successful delete", async () => {
      getMockClient().delete.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(deleteAppointment("apt-001")).resolves.toBeUndefined();
      expect(getMockClient().delete).toHaveBeenCalledWith(
        "/api/admin/appointments/apt-001",
      );
    });

    it("throws on delete failure", async () => {
      getMockClient().delete.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Appointment not found",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(deleteAppointment("nonexistent")).rejects.toThrow(
        "Appointment not found",
      );
    });
  });

  describe("getAvailability", () => {
    it("returns availability slots", async () => {
      const slots = [
        { date: "2025-07-15", time: "10:00", available: true },
        { date: "2025-07-15", time: "10:30", available: false },
      ];
      getMockClient().get.mockResolvedValue({
        success: true,
        data: slots,
      });

      const result = await getAvailability("2025-07-15", 30);

      expect(result).toHaveLength(2);
      expect(result[0].available).toBe(true);
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/appointments/availability"),
      );
    });

    it("passes branch_id when provided", async () => {
      getMockClient().get.mockResolvedValue({ success: true, data: [] });

      await getAvailability("2025-07-15", 30, "branch-001");

      const callUrl = getMockClient().get.mock.calls[0][0] as string;
      expect(callUrl).toContain("branch_id=branch-001");
    });
  });

  describe("getScheduleSettings", () => {
    it("returns schedule settings", async () => {
      const settings = {
        working_days: [1, 2, 3, 4, 5],
        working_hours: { start: "09:00", end: "18:00" },
        appointment_duration: 30,
        max_appointments_per_slot: 2,
      };
      getMockClient().get.mockResolvedValue({ success: true, data: settings });

      const result = await getScheduleSettings();

      expect(result.working_days).toEqual([1, 2, 3, 4, 5]);
      expect(result.working_hours.start).toBe("09:00");
    });

    it("passes branch_id query param", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: {
          working_days: [1, 2, 3, 4, 5],
          working_hours: { start: "09:00", end: "18:00" },
          appointment_duration: 30,
          max_appointments_per_slot: 2,
        },
      });

      await getScheduleSettings("branch-001");

      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/schedule-settings?branch_id=branch-001",
      );
    });
  });

  describe("updateScheduleSettings", () => {
    it("updates and returns settings", async () => {
      const update = { appointment_duration: 45 };
      getMockClient().put.mockResolvedValue({
        success: true,
        data: {
          working_days: [1, 2, 3, 4, 5],
          working_hours: { start: "09:00", end: "18:00" },
          appointment_duration: 45,
          max_appointments_per_slot: 2,
        },
      });

      const result = await updateScheduleSettings(update);

      expect(result.appointment_duration).toBe(45);
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/schedule-settings",
        update,
      );
    });
  });

  describe("confirmAppointment", () => {
    it("confirms and returns the appointment", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: { ...mockAppointment, status: "confirmed" },
      });

      const result = await confirmAppointment("apt-001");

      expect(result.status).toBe("confirmed");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/appointments/apt-001/confirm",
        {},
      );
    });
  });

  describe("cancelAppointment", () => {
    it("cancels and returns with reason", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: { ...mockAppointment, status: "cancelled" },
      });

      const result = await cancelAppointment(
        "apt-001",
        "Paciente no disponible",
      );

      expect(result.status).toBe("cancelled");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/appointments/apt-001/cancel",
        { reason: "Paciente no disponible" },
      );
    });

    it("cancels without a reason", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: { ...mockAppointment, status: "cancelled" },
      });

      const result = await cancelAppointment("apt-002");

      expect(result.status).toBe("cancelled");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/appointments/apt-002/cancel",
        { reason: undefined },
      );
    });
  });

  describe("service object", () => {
    it("exposes all methods on appointmentService", () => {
      expect(appointmentService.getAppointments).toBe(getAppointments);
      expect(appointmentService.getAppointment).toBe(getAppointment);
      expect(appointmentService.createAppointment).toBe(createAppointment);
      expect(appointmentService.updateAppointment).toBe(updateAppointment);
      expect(appointmentService.deleteAppointment).toBe(deleteAppointment);
      expect(appointmentService.getAvailability).toBe(getAvailability);
      expect(appointmentService.getScheduleSettings).toBe(getScheduleSettings);
      expect(appointmentService.updateScheduleSettings).toBe(
        updateScheduleSettings,
      );
      expect(appointmentService.confirmAppointment).toBe(confirmAppointment);
      expect(appointmentService.cancelAppointment).toBe(cancelAppointment);
    });
  });
});
