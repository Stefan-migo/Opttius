import { z } from "zod";

/**
 * Schema para validar slug de organización
 * Slug debe ser: solo letras minúsculas, números y guiones, único en la tabla
 */
export const organizationSlugSchema = z
  .string()
  .min(2, "El identificador debe tener al menos 2 caracteres")
  .max(100, "El identificador no puede tener más de 100 caracteres")
  .regex(
    /^[a-z0-9-]+$/,
    "Solo se permiten letras minúsculas, números y guiones",
  )
  .refine((slug) => !slug.startsWith("-") && !slug.endsWith("-"), {
    message: "El identificador no puede empezar ni terminar con guión",
  })
  .refine((slug) => !slug.includes("--"), {
    message: "El identificador no puede tener guiones consecutivos",
  });

/**
 * Schema para validar nombre de organización
 */
export const organizationNameSchema = z
  .string()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(200, "El nombre no puede tener más de 200 caracteres")
  .trim();

/**
 * Schema para validar tier de suscripción
 */
export const subscriptionTierSchema = z.enum(["basic", "pro", "premium"], {
  errorMap: () => ({ message: "El tier debe ser basic, pro o premium" }),
});

/**
 * Schema para validar nombre de sucursal
 */
export const branchNameSchema = z
  .string()
  .min(1, "El nombre de la sucursal es requerido")
  .max(200, "El nombre de la sucursal no puede tener más de 200 caracteres")
  .trim()
  .optional();

/**
 * Schema para crear organización (onboarding)
 */
export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
  slug: organizationSlugSchema,
  subscription_tier: subscriptionTierSchema.default("pro"),
  branchName: branchNameSchema,
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

/**
 * Schema para activar organización desde demo
 */
export const activateRealOrgSchema = z.object({
  name: organizationNameSchema,
  slug: organizationSlugSchema,
  branchName: branchNameSchema,
});

export type ActivateRealOrgInput = z.infer<typeof activateRealOrgSchema>;
