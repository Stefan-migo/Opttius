import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const confirmAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
});

export const confirmAppointmentTool: ToolDefinition = {
  name: "confirmAppointment",
  description:
    "Confirma una cita del cliente. El cliente debe ser el dueño de la cita. Requiere appointmentId (UUID de la cita).",
  category: "appointments",
  parameters: {
    type: "object",
    properties: {
      appointmentId: {
        type: "string",
        description: "ID (UUID) de la cita a confirmar",
      },
    },
    required: ["appointmentId"],
  },
  zodSchema: confirmAppointmentSchema,
  execute: async (params, context): Promise<ToolResult> => {
    const customerId = context.customerId;
    if (!customerId) {
      return {
        success: false,
        error: "No se pudo identificar al cliente. Contacta a la sucursal.",
      };
    }

    const { appointmentId } = params as { appointmentId: string };

    try {
      const { supabase, organizationId } = context;

      const { data: appointment, error: fetchError }: unknown = await supabase
        .from("appointments")
        .select(
          "id, customer_id, status, appointment_date, appointment_time, branch:branches(name)",
        )
        .eq("id", appointmentId)
        .eq("organization_id", organizationId)
        .single();

      if (fetchError || !appointment) {
        return {
          success: false,
          error: "No se encontró la cita.",
        };
      }

      if (appointment.customer_id !== customerId) {
        return {
          success: false,
          error: "No tienes permiso para confirmar esta cita.",
        };
      }

      if (appointment.status === "confirmed") {
        return {
          success: true,
          data: {
            message: "Tu cita ya estaba confirmada. Te esperamos.",
          },
        };
      }

      if (!["scheduled"].includes(appointment.status)) {
        return {
          success: false,
          error: `Esta cita no puede confirmarse (estado: ${appointment.status}).`,
        };
      }

      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId)
        .eq("customer_id", customerId)
        .eq("organization_id", organizationId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message || "Error al confirmar la cita",
        };
      }

      const branch = appointment.branch as { name?: string } | null;
      const dateStr = appointment.appointment_date;
      const timeStr =
        typeof appointment.appointment_time === "string"
          ? appointment.appointment_time.substring(0, 5)
          : appointment.appointment_time;

      return {
        success: true,
        data: {
          message: `Tu cita ha sido confirmada para el ${dateStr} a las ${timeStr}${branch?.name ? ` en ${branch.name}` : ""}. Te esperamos.`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al confirmar la cita",
      };
    }
  },
};
