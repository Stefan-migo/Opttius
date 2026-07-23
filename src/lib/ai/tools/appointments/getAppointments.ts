import { z } from "zod";

import { resolveBranchByName } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";

const getAppointmentsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  branchId: z.string().uuid().optional().nullable(),
  branchName: z.string().optional(),
  status: z
    .enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"])
    .optional(),
  limit: z.number().min(1).max(100).default(50),
});

export const getAppointmentsTool: ToolDefinition = {
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
          error instanceof Error ? error.message : "Failed to get appointments",
      };
    }
  },
};
