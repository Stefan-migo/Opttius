/**
 * Unit tests for appointment Zod schemas.
 *
 * Tests createAppointmentSchema validation rules including the
 * customer_id / guest_customer XOR constraint.
 */

import { describe, expect, it } from "vitest";

import { createAppointmentSchema } from "@/lib/validation/schemas/appointments";

const validAppointment = {
  customer_id: "550e8400-e29b-41d4-a716-446655440000",
  appointment_type: "eye_exam",
  appointment_date: "2025-07-15",
  appointment_time: "10:30:00",
  branch_id: "550e8400-e29b-41d4-a716-446655440001",
};

const validGuestCustomer = {
  guest_customer: {
    first_name: "Carlos",
    last_name: "Muñoz",
  },
  appointment_type: "consultation",
  appointment_date: "2025-07-16",
  appointment_time: "15:00:00",
  branch_id: "550e8400-e29b-41d4-a716-446655440001",
};

describe("createAppointmentSchema", () => {
  describe("customer / guest XOR constraint", () => {
    it("accepts valid data with customer_id", () => {
      const result = createAppointmentSchema.safeParse(validAppointment);
      expect(result.success).toBe(true);
    });

    it("accepts valid data with guest_customer", () => {
      const result = createAppointmentSchema.safeParse(validGuestCustomer);
      expect(result.success).toBe(true);
    });

    it("rejects when neither customer_id nor guest_customer is provided", () => {
      const result = createAppointmentSchema.safeParse({
        appointment_type: "eye_exam",
        appointment_date: "2025-07-15",
        appointment_time: "10:30:00",
        branch_id: "550e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        // The refine error should appear on the customer_id path
        expect(result.error.issues.some((i) => i.path.includes("customer_id"))).toBe(true);
      }
    });

    it("rejects when both are null", () => {
      const result = createAppointmentSchema.safeParse({
        customer_id: null,
        guest_customer: null,
        appointment_type: "eye_exam",
        appointment_date: "2025-07-15",
        appointment_time: "10:30:00",
        branch_id: "550e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("field validation", () => {
    it("rejects appointment_date not in YYYY-MM-DD format", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        appointment_date: "15-07-2025",
      });
      expect(result.success).toBe(false);
    });

    it("rejects appointment_time not in HH:MM:SS format", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        appointment_time: "10:30",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty appointment_type", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        appointment_type: "",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid status enum values", () => {
      const statuses = ["scheduled", "confirmed", "completed", "cancelled", "no_show"] as const;
      for (const status of statuses) {
        const result = createAppointmentSchema.safeParse({
          ...validAppointment,
          status,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid status value", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        status: "invalid_status",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid UUID for customer_id", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        customer_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("accepts duration_minutes as a positive integer", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        duration_minutes: 45,
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative duration_minutes", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        duration_minutes: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("optional fields", () => {
    it("accepts missing optional fields", () => {
      const result = createAppointmentSchema.safeParse(validAppointment);
      expect(result.success).toBe(true);
    });

    it("accepts nullable notes", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        notes: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts follow_up_required boolean", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        follow_up_required: true,
      });
      expect(result.success).toBe(true);
    });

    it("accepts cancellation_reason when provided", () => {
      const result = createAppointmentSchema.safeParse({
        ...validAppointment,
        status: "cancelled",
        cancellation_reason: "El cliente solicitó cancelación",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("guest_customer sub-schema", () => {
    it("requires first_name in guest_customer", () => {
      const result = createAppointmentSchema.safeParse({
        ...validGuestCustomer,
        guest_customer: { last_name: "Pérez" },
      });
      expect(result.success).toBe(false);
    });

    it("requires last_name in guest_customer", () => {
      const result = createAppointmentSchema.safeParse({
        ...validGuestCustomer,
        guest_customer: { first_name: "Ana" },
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional phone and email in guest_customer", () => {
      const result = createAppointmentSchema.safeParse({
        ...validGuestCustomer,
        guest_customer: {
          first_name: "Ana",
          last_name: "Pérez",
          phone: "+56912345678",
          email: "ana@example.com",
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email in guest_customer", () => {
      const result = createAppointmentSchema.safeParse({
        ...validGuestCustomer,
        guest_customer: {
          first_name: "Ana",
          last_name: "Pérez",
          email: "not-an-email",
        },
      });
      expect(result.success).toBe(false);
    });
  });
});
