/**
 * Zod Validation Schemas — Barrel Re-export
 *
 * This file re-exports all schemas from per-domain schema files in
 * src/lib/validation/schemas/. Do NOT add schema definitions here.
 *
 * @module lib/api/validation/zod-schemas
 */

export * from "@/lib/validation/schemas/base";
export * from "@/lib/validation/schemas/customers";
export * from "@/lib/validation/schemas/products";
export * from "@/lib/validation/schemas/pos";
export * from "@/lib/validation/schemas/agreements";
export * from "@/lib/validation/schemas/work-orders";
export * from "@/lib/validation/schemas/lenses";
export * from "@/lib/validation/schemas/quotes";
export * from "@/lib/validation/schemas/appointments";
export * from "@/lib/validation/schemas/saas-support";
export * from "@/lib/validation/schemas/optical-support";
export * from "@/lib/validation/schemas/saas-management";
export * from "@/lib/validation/schemas/field-operations";
