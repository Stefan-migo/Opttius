/**
 * Tools para clientes por WhatsApp (solo consulta, validan ownership) */
import { z } from "zod";

import type { ToolDefinition, ToolResult } from "./types";

const getAppointmentStatusSchema = z.object({
  customerId: z.string().uuid().optional(),
});

const getQuoteStatusSchema = z.object({
  customerId: z.string().uuid().optional(),
});

const getOrderStatusSchema = z.object({
  customerId: z.string().uuid().optional(),
});

const confirmAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
});

export const customerWhatsAppTools: ToolDefinition[] = [
  {
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

        const formatted = appointments.map((a) => {
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
  },
  {
    name: "getQuoteStatus",
    description:
      "Obtiene el estado de los presupuestos del cliente. Requiere customerId del contexto (cliente WhatsApp).",
    category: "quotes",
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "ID del cliente (opcional si viene del contexto)",
        },
      },
    },
    zodSchema: getQuoteStatusSchema,
    execute: async (params, context): Promise<ToolResult> => {
      const customerId =
        context.customerId ?? (params as { customerId?: string }).customerId;
      if (!customerId) {
        return {
          success: false,
          error: "No se pudo identificar al cliente. Contacta a la sucursal.",
        };
      }

      if (context.customerId && context.customerId !== customerId) {
        return {
          success: false,
          error: "No tienes permiso para consultar esta información.",
        };
      }

      try {
        const { supabase, organizationId } = context;
        const { data: quotes } = await supabase
          .from("quotes")
          .select(
            "id, quote_number, status, total_amount, currency, expiration_date",
          )
          .eq("customer_id", customerId)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!quotes || quotes.length === 0) {
          return {
            success: true,
            data: { quotes: [], message: "No tienes presupuestos." },
          };
        }

        const formatted = quotes.map((q) => ({
          number: q.quote_number,
          status: q.status,
          total: q.total_amount,
          currency: q.currency ?? "CLP",
          expiresAt: q.expiration_date,
        }));

        return {
          success: true,
          data: {
            quotes: formatted,
            message: `Tienes ${formatted.length} presupuesto(s).`,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Error al consultar presupuestos",
        };
      }
    },
  },
  {
    name: "getOrderStatus",
    description:
      "Obtiene el estado de las órdenes de trabajo (lentes) del cliente. Requiere customerId del contexto (cliente WhatsApp).",
    category: "orders",
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "ID del cliente (opcional si viene del contexto)",
        },
      },
    },
    zodSchema: getOrderStatusSchema,
    execute: async (params, context): Promise<ToolResult> => {
      const customerId =
        context.customerId ?? (params as { customerId?: string }).customerId;
      if (!customerId) {
        return {
          success: false,
          error: "No se pudo identificar al cliente. Contacta a la sucursal.",
        };
      }

      if (context.customerId && context.customerId !== customerId) {
        return {
          success: false,
          error: "No tienes permiso para consultar esta información.",
        };
      }

      try {
        const { supabase, organizationId } = context;
        const { data: orders } = await supabase
          .from("lab_work_orders")
          .select(
            "id, work_order_number, status, total_amount, currency, branch_id, branch:branches(name), ready_at, delivered_at",
          )
          .eq("customer_id", customerId)
          .eq("organization_id", organizationId)
          .order("work_order_date", { ascending: false })
          .limit(5);

        if (!orders || orders.length === 0) {
          return {
            success: true,
            data: { orders: [], message: "No tienes órdenes." },
          };
        }

        const formatted = orders.map((o) => {
          const branch = o.branch as { name?: string } | null;
          return {
            number: o.work_order_number,
            status: o.status,
            total: o.total_amount,
            currency: o.currency ?? "CLP",
            branch: branch?.name ?? "Sucursal",
            readyAt: o.ready_at,
            deliveredAt: o.delivered_at,
          };
        });

        return {
          success: true,
          data: {
            orders: formatted,
            message: `Tienes ${formatted.length} orden(es).`,
          },
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Error al consultar órdenes",
        };
      }
    },
  },
  {
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

        const { data: appointment, error: fetchError } = await supabase
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
            error instanceof Error
              ? error.message
              : "Error al confirmar la cita",
        };
      }
    },
  },
];
