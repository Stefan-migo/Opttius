import { z } from "zod";

import { emailSchema, uuidOptionalSchema, dateISOOptionalSchema } from "./base";

const guestCustomerSchema = z.object({
  first_name: z.string().min(1, "El nombre es requerido").max(100).trim(),
  last_name: z.string().min(1, "El apellido es requerido").max(100).trim(),
  rut: z.string().max(20).trim().optional().nullable(),
  email: emailSchema.optional().nullable(),
  phone: z.string().max(20).trim().optional().nullable(),
});

export const createAppointmentSchema = z
  .object({
    customer_id: uuidOptionalSchema,
    guest_customer: guestCustomerSchema.optional().nullable(),
    appointment_type: z
      .string()
      .min(1, "El tipo de cita es requerido")
      .max(100)
      .trim(),
    appointment_date: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "La fecha debe estar en formato YYYY-MM-DD",
      ),
    appointment_time: z
      .string()
      .regex(/^\d{2}:\d{2}:\d{2}$/, "La hora debe estar en formato HH:MM:SS"),
    duration_minutes: z.number().int().positive().default(30).optional(),
    notes: z.string().max(5000).trim().optional().nullable(),
    branch_id: uuidOptionalSchema,
    status: z
      .enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"])
      .optional(),
    assigned_to: uuidOptionalSchema,
    reason: z.string().max(500).trim().optional().nullable(),
    follow_up_required: z.boolean().optional(),
    follow_up_date: dateISOOptionalSchema,
    prescription_id: uuidOptionalSchema,
    order_id: uuidOptionalSchema,
    cancellation_reason: z.string().max(500).trim().optional().nullable(),
  })
  .refine(
    (data) => {
      return (
        (data.customer_id !== null && data.customer_id !== undefined) ||
        (data.guest_customer !== null && data.guest_customer !== undefined)
      );
    },
    {
      message:
        "Debe proporcionar un customer_id (cliente registrado) o guest_customer (cliente invitado)",
      path: ["customer_id"],
    },
  );
