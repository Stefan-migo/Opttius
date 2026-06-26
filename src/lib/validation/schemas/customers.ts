import { z } from "zod";

import {
  emailOptionalSchema,
  phoneOptionalSchema,
  rutOptionalSchema,
  dateISOOptionalSchema,
  uuidOptionalSchema,
  searchSchema,
} from "./base";

export const customerBaseSchema = z
  .object({
    first_name: z
      .string()
      .max(100)
      .optional()
      .superRefine((val, ctx) => {
        if (val !== undefined && val !== null) {
          const trimmed = String(val).trim();
          if (trimmed.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "El nombre no puede estar vacío",
              path: ["first_name"],
            });
          }
        }
      })
      .transform((val) => {
        return val !== undefined && val !== null ? String(val).trim() : val;
      }),
    last_name: z
      .string()
      .max(100)
      .optional()
      .superRefine((val, ctx) => {
        if (val !== undefined && val !== null) {
          const trimmed = String(val).trim();
          if (trimmed.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "El apellido no puede estar vacío",
              path: ["last_name"],
            });
          }
        }
      })
      .transform((val) => {
        return val !== undefined && val !== null ? String(val).trim() : val;
      }),
    email: emailOptionalSchema,
    phone: phoneOptionalSchema,
    rut: rutOptionalSchema,
    date_of_birth: dateISOOptionalSchema,
    gender: z
      .enum(["male", "female", "other", "prefer_not_to_say"])
      .optional()
      .nullable(),
    address_line_1: z.string().max(255).trim().optional().nullable(),
    address_line_2: z.string().max(255).trim().optional().nullable(),
    city: z.string().max(100).trim().optional().nullable(),
    state: z.string().max(100).trim().optional().nullable(),
    postal_code: z.string().max(20).trim().optional().nullable(),
    country: z.string().max(100).trim().default("Chile").optional(),
    medical_conditions: z.string().max(1000).trim().optional().nullable(),
    allergies: z.string().max(1000).trim().optional().nullable(),
    medications: z.string().max(1000).trim().optional().nullable(),
    medical_notes: z.string().max(5000).trim().optional().nullable(),
    last_eye_exam_date: dateISOOptionalSchema,
    next_eye_exam_due: dateISOOptionalSchema,
    preferred_contact_method: z
      .enum(["email", "phone", "sms", "whatsapp"])
      .optional()
      .nullable(),
    emergency_contact_name: z.string().max(100).trim().optional().nullable(),
    emergency_contact_phone: phoneOptionalSchema,
    insurance_provider: z.string().max(100).trim().optional().nullable(),
    insurance_policy_number: z.string().max(100).trim().optional().nullable(),
    notes: z.string().max(5000).trim().optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    is_active: z.boolean().default(true).optional(),
    branch_id: uuidOptionalSchema,
    field_operation_id: uuidOptionalSchema,
  })
  .refine(
    (data) => {
      const hasFirstName =
        data.first_name !== undefined &&
        data.first_name !== null &&
        String(data.first_name).trim().length > 0;
      const hasLastName =
        data.last_name !== undefined &&
        data.last_name !== null &&
        String(data.last_name).trim().length > 0;
      if (!hasFirstName && !hasLastName) {
        return false;
      }
      return true;
    },
    {
      message:
        "Al menos el nombre o apellido es requerido y no puede estar vacío",
      path: ["first_name"],
    },
  );

export const createCustomerSchema = customerBaseSchema;

export const updateCustomerSchema = z.object({
  first_name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100)
    .trim()
    .optional(),
  last_name: z
    .string()
    .min(1, "El apellido es requerido")
    .max(100)
    .trim()
    .optional(),
  email: emailOptionalSchema,
  phone: phoneOptionalSchema,
  rut: rutOptionalSchema,
  date_of_birth: dateISOOptionalSchema,
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say"])
    .optional()
    .nullable(),
  address_line_1: z.string().max(255).trim().optional().nullable(),
  address_line_2: z.string().max(255).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().nullable(),
  state: z.string().max(100).trim().optional().nullable(),
  postal_code: z.string().max(20).trim().optional().nullable(),
  country: z.string().max(100).trim().default("Chile").optional(),
  medical_conditions: z.string().max(1000).trim().optional().nullable(),
  allergies: z.string().max(1000).trim().optional().nullable(),
  medications: z.string().max(1000).trim().optional().nullable(),
  medical_notes: z.string().max(5000).trim().optional().nullable(),
  last_eye_exam_date: dateISOOptionalSchema,
  next_eye_exam_due: dateISOOptionalSchema,
  preferred_contact_method: z
    .enum(["email", "phone", "sms", "whatsapp"])
    .optional()
    .nullable(),
  emergency_contact_name: z.string().max(100).trim().optional().nullable(),
  emergency_contact_phone: phoneOptionalSchema,
  insurance_provider: z.string().max(100).trim().optional().nullable(),
  insurance_policy_number: z.string().max(100).trim().optional().nullable(),
  notes: z.string().max(5000).trim().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  is_active: z.boolean().default(true).optional(),
  branch_id: uuidOptionalSchema,
});

export const searchCustomerSchema = searchSchema.extend({
  branch_id: uuidOptionalSchema,
  is_active: z.boolean().optional(),
  agreement_id: uuidOptionalSchema,
});
