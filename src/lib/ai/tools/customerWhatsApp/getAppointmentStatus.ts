import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getAppointmentStatusSchema = z.object({
  customerId: z.string().uuid().optional(),
});

export const getAppointmentStatusTool: ToolDefinition = {
  name: "getAppointmentStatus",
  description:
    "Obtiene el estado de las citas del cliente. Devuelve citas próximas y su estado. Requiere customerId del contexto (cliente WhatsApp).",
  category: "appointments",
  parameters: {
    type: "object",
    properties: {
      customerId: {
        type: "string",
        description: "ID del cliente (opcional si viene del contexto)",
      },
    },
  },
  zodSchema: getAppointmentStatusSchema,
  execute: async (params, context): Promise<ToolResult> => {
    const customerId =
      context.customerId ?? (params as { customerId?: string }).customerId;
    if (!customerId) {
      return {
        success: false,
        error: "No se pudo identificar al cliente. Contacta a la sucursal.",
      };
    }

    // Validar que el customerId coincide con el contexto (seguridad)
    if (context.customerId && context.customerId !== customerId) {
      return {
        success: false,
        error: "No tienes permiso para consultar esta información.",
      };
    }

    try {
      const { supabase, organizationId } = context;
      const { data: appointments } = await supabase
        .from("appointments")
        .select(
          "id, appointment_date, appointment_time, status, branch_id, branch:branches(name)",
        )
        .eq("customer_id", customerId)
        .eq("organization_id", organizationId)
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .in("status", ["scheduled", "confirmed"])
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(5);

      if (!appointments || appointments.length === 0) {
        return {
          success: true,
          data: { appointments: [], message: "No tienes citas programadas." },
        };
      }

      const formatted = (appointments as unknown[]).map((a: unknown) => {
        const branch = a.branch as { name?: string } | null;
        return {
          date: a.appointment_date,
          time:
            typeof a.appointment_time === "string"
              ? a.appointment_time.substring(0, 5)
              : a.appointment_time,
          status: a.status,
          branch: branch?.name ?? "Sucursal",
        };
      });

      return {
        success: true,
        data: {
          appointments: formatted,
          message: `Tienes ${formatted.length} cita(s) programada(s).`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al consultar citas",
      };
    }
  },
};
