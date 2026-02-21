import { z } from "zod";

/**
 * Profile validation schemas — Reutilizables en formularios de perfil y API
 *
 * @module lib/api/validation/profile-schemas
 */

export const personalInfoSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bio: z
    .string()
    .max(500, "La biografía no puede exceder 500 caracteres")
    .optional(),
});

export const addressSchema = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(1, "El país es requerido").default("Chile"),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .regex(
        /[A-Z]/,
        "La contraseña debe contener al menos una letra mayúscula",
      )
      .regex(
        /[a-z]/,
        "La contraseña debe contener al menos una letra minúscula",
      )
      .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  first_name: z.string().min(2).optional().nullable(),
  last_name: z.string().min(2).optional().nullable(),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  address_line_1: z.string().optional().nullable(),
  address_line_2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  preferred_branch_id: z.string().uuid().optional().nullable(),
  language: z.string().optional().nullable(),
  newsletter_subscribed: z.boolean().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
});

export type PersonalInfoForm = z.infer<typeof personalInfoSchema>;
export type AddressForm = z.infer<typeof addressSchema>;
export type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
