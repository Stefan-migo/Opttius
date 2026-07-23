import { z } from "zod";

import type {
  GetAvailableTimeSlotsParams,
  GetAvailableTimeSlotsResult,
} from "@/types/supabase-rpc";

import type { ToolDefinition, ToolResult } from "../types";
import { formatTimeSlot } from "./_shared";

const rescheduleAppointmentSchema = z
  .object({
    appointmentId: z.string().uuid().optional(),
    customerName: z.string().optional(),
    originalAppointmentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
      .optional(),
    appointmentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    appointmentTime: z
      .string()
      .regex(/^\d{1,2}:\d{2}$/, "Time must be HH:MM or H:MM"),
  })
  .refine(
    (d) => d.appointmentId || (d.customerName && d.originalAppointmentDate),
    {
      message:
        "Provide appointmentId or (customerName + originalAppointmentDate)",
      path: ["appointmentId"],
    },
  );

export const rescheduleAppointmentTool: ToolDefinition = {
  name: "rescheduleAppointment",
  description:
    "Reschedule an appointment to a new date and time. Validates availability before updating.",
  category: "appointments",
  parameters: {
    type: "object",
    properties: {
      appointmentId: {
        type: "string",
        description:
          "Appointment UUID (or use customerName + originalAppointmentDate)",
      },
      customerName: {
        type: "string",
        description:
          "Customer name to find appointment (use with originalAppointmentDate)",
      },
      originalAppointmentDate: {
        type: "string",
        description:
          "Date of the appointment to find (YYYY-MM-DD), when using customerName",
      },
      appointmentDate: {
        type: "string",
        description: "New date in YYYY-MM-DD format",
      },
      appointmentTime: {
        type: "string",
        description: "New time in HH:MM format",
      },
    },
    required: ["appointmentDate", "appointmentTime"],
  },
  zodSchema: rescheduleAppointmentSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = rescheduleAppointmentSchema.parse(params);
      const { supabase, organizationId, currentBranchId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let appointmentId = validated.appointmentId;

      if (
        !appointmentId &&
        validated.customerName &&
        validated.originalAppointmentDate
      ) {
        let query = supabase
          .from("appointments")
          .select(
            `
              id,
              organization_id,
              branch_id,
              duration_minutes,
              customers(first_name, last_name),
              guest_first_name,
              guest_last_name
            `,
          )
          .eq("organization_id", organizationId)
          .eq("appointment_date", validated.originalAppointmentDate);

        if (currentBranchId) {
          query = query.eq("branch_id", currentBranchId);
        }

        const { data: appointments, error: searchError } = await query;

        if (searchError) {
          return {
            success: false,
            error: searchError.message || "Error al buscar la cita",
          };
        }

        const searchLower = validated.customerName.toLowerCase().trim();
        const match = (appointments || []).find((a) => {
          const c = (
            a as {
              customers?: { first_name?: string; last_name?: string } | null;
            }
          )?.customers;
          const customerFull = c
            ? `${(c.first_name || "").toLowerCase()} ${(c.last_name || "").toLowerCase()}`.trim()
            : "";
          const guestFull =
            `${((a as { guest_first_name?: string; guest_last_name?: string }).guest_first_name || "").toLowerCase()} ${((a as { guest_first_name?: string; guest_last_name?: string }).guest_last_name || "").toLowerCase()}`.trim();
          return (
            (customerFull &&
              (customerFull.includes(searchLower) ||
                searchLower.includes(customerFull))) ||
            (guestFull &&
              (guestFull.includes(searchLower) ||
                searchLower.includes(guestFull)))
          );
        });

        if (!match) {
          return {
            success: false,
            error: `No se encontró cita para "${validated.customerName}" el ${validated.originalAppointmentDate}`,
          };
        }
        appointmentId = match.id;
      }

      if (!appointmentId) {
        return {
          success: false,
          error:
            "Provide appointmentId or (customerName + originalAppointmentDate)",
        };
      }

      const { data: appointment, error: fetchError } = await supabase
        .from("appointments")
        .select("id, organization_id, branch_id, duration_minutes")
        .eq("id", appointmentId)
        .single();

      if (fetchError || !appointment) {
        return {
          success: false,
          error: "Cita no encontrada",
        };
      }

      if (appointment.organization_id !== organizationId) {
        return {
          success: false,
          error: "Cita no encontrada",
        };
      }

      const duration = appointment.duration_minutes ?? 30;
      const branchId = appointment.branch_id;

      const { data: slots } = (await supabase.rpc("get_available_time_slots", {
        p_date: validated.appointmentDate,
        p_duration_minutes: duration,
        p_staff_id: null,
        p_branch_id: branchId,
      } as GetAvailableTimeSlotsParams)) as {
        data: GetAvailableTimeSlotsResult;
      };

      const formattedSlots = (slots || []).map(formatTimeSlot);
      const targetTime = validated.appointmentTime.includes(":")
        ? validated.appointmentTime
        : `${validated.appointmentTime.padStart(2, "0")}:00`;
      const parts = targetTime.split(":");
      const normalizedTime = `${parts[0].padStart(2, "0")}:${(parts[1] || "00").padStart(2, "0")}`;

      const isAvailable = formattedSlots.some((s) => {
        if (!s.available) return false;
        const slotParts = s.time_slot.split(":");
        const slotNormalized = `${slotParts[0].padStart(2, "0")}:${(slotParts[1] || "00").padStart(2, "0")}`;
        return slotNormalized === normalizedTime;
      });

      if (!isAvailable) {
        const availableList = formattedSlots
          .filter((s) => s.available)
          .map((s) => s.time_slot)
          .slice(0, 10);
        return {
          success: false,
          error: `El horario ${normalizedTime} no está disponible para el ${validated.appointmentDate}. Horarios disponibles: ${availableList.join(", ")}${availableList.length < formattedSlots.filter((s) => s.available).length ? "..." : ""}`,
        };
      }

      const { data: updated, error: updateError } = await supabase
        .from("appointments")
        .update({
          appointment_date: validated.appointmentDate,
          appointment_time: normalizedTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          error: updateError.message || "Error al reprogramar la cita",
        };
      }

      return {
        success: true,
        data: updated,
        message: `Cita reprogramada para el ${validated.appointmentDate} a las ${normalizedTime}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to reschedule appointment",
      };
    }
  },
};
