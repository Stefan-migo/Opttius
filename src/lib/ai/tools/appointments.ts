/**
 * AI Agent tools for appointments and schedule management
 */
import { z } from "zod";
import { createServiceRoleClient } from "@/utils/supabase/server";
import type { ToolDefinition, ToolResult } from "./types";
import type {
  GetAvailableTimeSlotsParams,
  GetAvailableTimeSlotsResult,
  TimeSlot,
} from "@/types/supabase-rpc";
import { resolveBranchByName } from "./resolvers";

const getAppointmentSlotsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  duration: z.number().min(5).max(120).default(30),
  staffId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  branchName: z.string().optional(),
});

const getBranchScheduleSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  branchName: z.string().optional(),
});

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

const getAppointmentsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  branchId: z.string().uuid().optional().nullable(),
  branchName: z.string().optional(),
  status: z
    .enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"])
    .optional(),
  limit: z.number().min(1).max(100).default(50),
});

const DEFAULT_SCHEDULE_SETTINGS = {
  slot_duration_minutes: 15,
  default_appointment_duration: 30,
  buffer_time_minutes: 0,
  working_hours: {
    monday: {
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      lunch_start: null,
      lunch_end: null,
    },
    tuesday: {
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      lunch_start: null,
      lunch_end: null,
    },
    wednesday: {
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      lunch_start: null,
      lunch_end: null,
    },
    thursday: {
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      lunch_start: null,
      lunch_end: null,
    },
    friday: {
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      lunch_start: null,
      lunch_end: null,
    },
    saturday: {
      enabled: false,
      start_time: "09:00",
      end_time: "13:00",
      lunch_start: null,
      lunch_end: null,
    },
    sunday: {
      enabled: false,
      start_time: "09:00",
      end_time: "13:00",
      lunch_start: null,
      lunch_end: null,
    },
  },
  blocked_dates: [] as string[],
  min_advance_booking_hours: 2,
  max_advance_booking_days: 90,
  staff_specific_settings: {} as Record<string, unknown>,
};

function formatTimeSlot(slot: TimeSlot): {
  time_slot: string;
  available: boolean;
} {
  let timeSlot = "";
  if (typeof slot.time_slot === "string") {
    timeSlot = slot.time_slot;
  } else if (slot.time_slot) {
    const timeValue = slot.time_slot as { hours?: number; minutes?: number };
    if (
      typeof timeValue === "object" &&
      "hours" in timeValue &&
      "minutes" in timeValue
    ) {
      timeSlot = `${String(timeValue.hours).padStart(2, "0")}:${String(timeValue.minutes).padStart(2, "0")}`;
    } else {
      timeSlot = String(slot.time_slot);
    }
  }
  if (timeSlot.includes(":")) {
    const parts = timeSlot.split(":");
    timeSlot = `${parts[0]}:${parts[1]}`;
  }
  let isAvailable = true;
  if (typeof slot.available === "boolean") {
    isAvailable = slot.available;
  } else if (typeof slot.available === "string") {
    isAvailable = slot.available === "t" || slot.available === "true";
  } else if (slot.available !== undefined && slot.available !== null) {
    isAvailable = Boolean(slot.available);
  }
  return { time_slot: timeSlot, available: isAvailable };
}

export const appointmentTools: ToolDefinition[] = [
  {
    name: "getAppointmentSlots",
    description:
      "Get available time slots for appointments on a given date. Use when user wants to schedule or see availability.",
    category: "appointments",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        duration: {
          type: "number",
          description: "Appointment duration in minutes",
          default: 30,
        },
        staffId: {
          type: "string",
          description: "Staff member UUID (optional)",
        },
        branchId: {
          type: "string",
          description:
            "Branch UUID (required for Super Admin when no branch selected)",
        },
        branchName: {
          type: "string",
          description:
            "Branch name (alternative to branchId, e.g. 'Sucursal Centro')",
        },
      },
      required: ["date"],
    },
    zodSchema: getAppointmentSlotsSchema,
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getAppointmentSlotsSchema.parse(params);
        const { supabase, organizationId, currentBranchId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        let branchId = validated.branchId ?? currentBranchId ?? null;
        if (!branchId && validated.branchName) {
          branchId = await resolveBranchByName(
            supabase,
            organizationId,
            validated.branchName,
          );
        }

        if (!branchId) {
          return {
            success: false,
            error:
              "Selecciona una sucursal para consultar disponibilidad. Si eres Super Admin con vista global, indica branchId en los parámetros.",
          };
        }

        const { data: branch } = await supabase
          .from("branches")
          .select("organization_id")
          .eq("id", branchId)
          .single();

        if (!branch || branch.organization_id !== organizationId) {
          return {
            success: false,
            error: "Sucursal no encontrada o no pertenece a la organización",
          };
        }

        const rpcParams: GetAvailableTimeSlotsParams = {
          p_date: validated.date,
          p_duration_minutes: validated.duration,
          p_staff_id: validated.staffId ?? null,
          p_branch_id: branchId,
        };

        const { data: slots, error } = (await supabase.rpc(
          "get_available_time_slots",
          rpcParams,
        )) as { data: GetAvailableTimeSlotsResult; error: Error | null };

        if (error) {
          return {
            success: false,
            error: error.message || "Error al obtener horarios disponibles",
          };
        }

        const formattedSlots = (slots || [])
          .map(formatTimeSlot)
          .filter((s) => s.time_slot);

        const availableSlots = formattedSlots.filter((s) => s.available);

        return {
          success: true,
          data: {
            date: validated.date,
            duration: validated.duration,
            slots: formattedSlots,
            availableCount: availableSlots.length,
            availableSlots: availableSlots.map((s) => s.time_slot),
          },
          message: `Hay ${availableSlots.length} horario(s) disponible(s) para el ${validated.date}`,
        };
      } catch (error: unknown) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get appointment slots",
        };
      }
    },
  },
  {
    name: "getAppointments",
    description:
      "List appointments for a given date. Use when user asks for today's appointments, citas del día, or agenda.",
    category: "appointments",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (required)",
        },
        branchId: {
          type: "string",
          description:
            "Branch UUID (required for Super Admin when no branch selected)",
        },
        branchName: {
          type: "string",
          description: "Branch name (alternative to branchId)",
        },
        status: {
          type: "string",
          enum: ["scheduled", "confirmed", "completed", "cancelled", "no_show"],
          description: "Filter by appointment status",
        },
        limit: {
          type: "number",
          description: "Max results (default 50, max 100)",
          default: 50,
        },
      },
      required: ["date"],
    },
    zodSchema: getAppointmentsSchema,
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getAppointmentsSchema.parse(params);
        const { supabase, organizationId, currentBranchId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        let branchId = validated.branchId ?? currentBranchId ?? null;
        if (!branchId && validated.branchName) {
          branchId = await resolveBranchByName(
            supabase,
            organizationId,
            validated.branchName,
          );
        }

        if (!branchId) {
          return {
            success: false,
            error:
              "Selecciona una sucursal para consultar citas. Si eres Super Admin con vista global, indica branchId en los parámetros.",
          };
        }

        let query = supabase
          .from("appointments")
          .select(
            `
            id,
            appointment_date,
            appointment_time,
            status,
            duration_minutes,
            customer_id,
            branch_id,
            branch:branches(name),
            customers(first_name, last_name, phone),
            notes,
            guest_first_name,
            guest_last_name,
            guest_phone
          `,
          )
          .eq("organization_id", organizationId)
          .eq("appointment_date", validated.date)
          .order("appointment_time", { ascending: true })
          .limit(validated.limit);

        if (branchId) {
          query = query.eq("branch_id", branchId);
        }

        if (validated.status) {
          query = query.eq("status", validated.status);
        }

        const { data, error } = await query;

        if (error) {
          return {
            success: false,
            error: error.message || "Error al obtener citas",
          };
        }

        const appointments = data || [];

        return {
          success: true,
          data: {
            date: validated.date,
            appointments,
          },
          message: `Hay ${appointments.length} cita(s) para el ${validated.date}`,
        };
      } catch (error: unknown) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get appointments",
        };
      }
    },
  },
  {
    name: "getBranchSchedule",
    description:
      "Get the schedule settings (working hours, slot duration) for a branch.",
    category: "appointments",
    parameters: {
      type: "object",
      properties: {
        branchId: {
          type: "string",
          description:
            "Branch UUID (optional, uses current branch if not provided)",
        },
        branchName: {
          type: "string",
          description: "Branch name (alternative to branchId)",
        },
      },
    },
    zodSchema: getBranchScheduleSchema,
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getBranchScheduleSchema.parse(params);
        const { supabase, organizationId, currentBranchId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        let branchId = validated.branchId ?? currentBranchId ?? null;
        if (!branchId && validated.branchName) {
          branchId = await resolveBranchByName(
            supabase,
            organizationId,
            validated.branchName,
          );
        }

        if (!branchId) {
          return {
            success: false,
            error:
              "Selecciona una sucursal para ver el horario. Si eres Super Admin, indica branchId.",
          };
        }

        const { data: branch } = await supabase
          .from("branches")
          .select("organization_id")
          .eq("id", branchId)
          .single();

        if (!branch || branch.organization_id !== organizationId) {
          return {
            success: false,
            error: "Sucursal no encontrada",
          };
        }

        const { data: settings } = await supabase
          .from("schedule_settings")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("branch_id", branchId)
          .maybeSingle();

        const settingsToReturn = settings ?? DEFAULT_SCHEDULE_SETTINGS;

        return {
          success: true,
          data: settingsToReturn,
          message: "Horarios de sucursal obtenidos correctamente",
        };
      } catch (error: unknown) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get branch schedule",
        };
      }
    },
  },
  {
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

        const serviceSupabase = createServiceRoleClient();
        const { data: slots } = (await serviceSupabase.rpc(
          "get_available_time_slots",
          {
            p_date: validated.appointmentDate,
            p_duration_minutes: duration,
            p_staff_id: null,
            p_branch_id: branchId,
          } as GetAvailableTimeSlotsParams,
        )) as { data: GetAvailableTimeSlotsResult };

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
  },
];
