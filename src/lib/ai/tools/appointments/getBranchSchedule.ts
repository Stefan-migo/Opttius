import { z } from "zod";

import { resolveBranchByName } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";
import { DEFAULT_SCHEDULE_SETTINGS } from "./_shared";

const getBranchScheduleSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  branchName: z.string().optional(),
});

export const getBranchScheduleTool: ToolDefinition = {
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
};
