import { z } from "zod";

import { emailSchema, uuidOptionalSchema, uuidSchema } from "./base";

const slugSchema = z
  .string()
  .min(1, "El slug es requerido")
  .max(100)
  .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones")
  .transform((s) => s.toLowerCase().trim());

const subscriptionTierSchema = z.enum(["basic", "pro", "premium"]);
const organizationStatusSchema = z.enum(["active", "suspended", "cancelled"]);

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(255).trim(),
  slug: slugSchema,
  owner_id: uuidOptionalSchema,
  subscription_tier: subscriptionTierSchema.default("basic"),
  status: organizationStatusSchema.default("active"),
  metadata: z.record(z.unknown()).default({}),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  slug: slugSchema.optional(),
  owner_id: uuidOptionalSchema,
  subscription_tier: subscriptionTierSchema.optional(),
  status: organizationStatusSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createBranchSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(255).trim(),
  code: z.string().max(50).trim().optional(),
  address_line_1: z.string().max(255).trim().optional(),
  address_line_2: z.string().max(255).trim().optional(),
  city: z.string().max(100).trim().optional(),
  state: z.string().max(100).trim().optional(),
  postal_code: z.string().max(20).trim().optional(),
  phone: z.string().max(50).trim().optional(),
  email: z.string().max(255).trim().optional(),
  is_active: z.boolean().default(true),
});

export const createSubscriptionSchema = z.object({
  organization_id: uuidSchema,
  status: z
    .enum(["trialing", "active", "past_due", "cancelled", "incomplete"])
    .default("trialing"),
  trial_days: z.coerce.number().int().min(0).max(365).optional(),
  trial_ends_at: z.string().optional(),
  current_period_start: z.string().optional(),
  current_period_end: z.string().optional(),
});

export const updateSubscriptionSchema = z.object({
  status: z
    .enum(["trialing", "active", "past_due", "cancelled", "incomplete"])
    .optional(),
  current_period_start: z.string().optional(),
  current_period_end: z.string().optional(),
  trial_ends_at: z.string().optional(),
  cancel_at: z.string().optional(),
});

export const createOrgUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  first_name: z.string().max(255).trim().optional(),
  last_name: z.string().max(255).trim().optional(),
  role: z
    .enum(["super_admin", "admin", "employee", "vendedor"])
    .default("admin"),
  branch_id: uuidOptionalSchema,
});

export const updateSaasUserSchema = z.object({
  role: z
    .enum(["root", "dev", "super_admin", "admin", "employee", "vendedor"])
    .optional(),
  is_active: z.boolean().optional(),
  organization_id: uuidOptionalSchema,
  permissions: z.record(z.array(z.string())).optional(),
});

export const tierUpdateSchema = z.object({
  name: z.enum(["basic", "pro", "premium"], {
    errorMap: () => ({ message: "name debe ser basic, pro o premium" }),
  }),
  price_monthly: z.number().min(0, "price_monthly debe ser >= 0").optional(),
  max_branches: z.number().int().min(0).nullable().optional(),
  max_users: z.number().int().min(0).nullable().optional(),
  max_customers: z.number().int().min(0).nullable().optional(),
  max_products: z.number().int().min(0).nullable().optional(),
  features: z.record(z.string(), z.boolean()).optional(),
});
