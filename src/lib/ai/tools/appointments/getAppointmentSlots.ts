import { z } from "zod";

import type {
  GetAvailableTimeSlotsParams,
  GetAvailableTimeSlotsResult,
} from "@/types/supabase-rpc";

import { resolveBranchByName } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";
import { formatTimeSlot } from "./_shared";

const getAppointmentSlotsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  duration: z.number().min(5).max(120).default(30),
  staffId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  branchName: z.string().optional(),
});

export const getAppointmentSlotsTool: ToolDefinition = {
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
};
