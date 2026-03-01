/**
 * AI Agent tools for prescription-based lens suggestions
 */
import { z } from "zod";
import type { ToolDefinition, ToolResult } from "./types";
import {
  hasAddition,
  getDefaultPresbyopiaSolution,
  getRecommendedLensTypes,
  getFarSphere,
  getCylinder,
  type Prescription,
} from "@/lib/presbyopia-helpers";
import {
  resolvePrescriptionByNumber,
  resolveCustomerByNameOrRut,
  resolveBranchByName,
} from "./resolvers";

const suggestLensFromPrescriptionSchema = z
  .object({
    prescriptionId: z.string().uuid().optional(),
    prescriptionNumber: z.string().optional(),
    od_sphere: z.number().optional(),
    os_sphere: z.number().optional(),
    od_cylinder: z.number().optional(),
    os_cylinder: z.number().optional(),
    od_add: z.number().optional(),
    os_add: z.number().optional(),
    prescription_type: z.string().optional(),
  })
  .refine(
    (data) =>
      data.prescriptionId ||
      data.prescriptionNumber ||
      data.od_sphere !== undefined ||
      data.os_sphere !== undefined,
    {
      message:
        "Provide prescriptionId, prescriptionNumber, or at least od_sphere/os_sphere",
      path: ["prescriptionId"],
    },
  );

const createPrescriptionSchema = z
  .object({
    customerNameOrRut: z.string(),
    od_sphere: z.number().optional(),
    os_sphere: z.number().optional(),
    od_cylinder: z.number().optional(),
    os_cylinder: z.number().optional(),
    od_add: z.number().optional(),
    os_add: z.number().optional(),
    prescription_type: z.string().optional(),
    prescription_number: z.string().optional(),
    branchName: z.string().optional(),
  })
  .refine(
    (data) => data.od_sphere !== undefined || data.os_sphere !== undefined,
    {
      message: "Provide at least od_sphere or os_sphere for the prescription",
      path: ["od_sphere"],
    },
  );

export const prescriptionTools: ToolDefinition[] = [
  {
    name: "suggestLensFromPrescription",
    description:
      "Suggest lens families (lentes) based on a prescription. Considers presbyopia (addition), high index for strong prescriptions (|sphere|>=4 or |cylinder|>=2), and lens type compatibility.",
    category: "prescriptions",
    parameters: {
      type: "object",
      properties: {
        prescriptionId: {
          type: "string",
          description: "Prescription UUID (fetch from DB)",
        },
        prescriptionNumber: {
          type: "string",
          description:
            "Prescription number visible in UI (alternative to prescriptionId)",
        },
        od_sphere: { type: "number", description: "OD sphere (e.g. -2.5)" },
        os_sphere: { type: "number", description: "OS sphere" },
        od_cylinder: { type: "number", description: "OD cylinder" },
        os_cylinder: { type: "number", description: "OS cylinder" },
        od_add: { type: "number", description: "OD addition (presbyopia)" },
        os_add: { type: "number", description: "OS addition (presbyopia)" },
        prescription_type: {
          type: "string",
          description: "progressive, bifocal, trifocal, single_vision",
        },
      },
    },
    zodSchema: suggestLensFromPrescriptionSchema,
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = suggestLensFromPrescriptionSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        let prescription: Prescription | null = null;
        let prescriptionId = validated.prescriptionId;

        if (validated.prescriptionNumber && !prescriptionId) {
          prescriptionId =
            (await resolvePrescriptionByNumber(
              supabase,
              organizationId,
              validated.prescriptionNumber,
            )) ?? undefined;
        }

        if (prescriptionId) {
          const { data, error } = await supabase
            .from("prescriptions")
            .select(
              "od_sphere, os_sphere, od_cylinder, os_cylinder, od_add, os_add, prescription_type",
            )
            .eq("id", prescriptionId)
            .single();

          if (error || !data) {
            return {
              success: false,
              error: "Receta no encontrada",
            };
          }
          prescription = data as Prescription;
        } else {
          prescription = {
            od_sphere: validated.od_sphere,
            os_sphere: validated.os_sphere,
            od_cylinder: validated.od_cylinder,
            os_cylinder: validated.os_cylinder,
            od_add: validated.od_add,
            os_add: validated.os_add,
            prescription_type: validated.prescription_type,
          };
        }

        const solution = getDefaultPresbyopiaSolution(prescription);
        const recommendedTypes = getRecommendedLensTypes(solution);
        const farSphere = getFarSphere(prescription);
        const cylinder = getCylinder(prescription);
        const absSphere = Math.abs(farSphere);
        const absCylinder = Math.abs(cylinder);

        const needsHighIndex = absSphere >= 4 || absCylinder >= 2;
        const highIndexMaterials = needsHighIndex
          ? ["high_index_1_67", "high_index_1_74"]
          : null;

        let query = supabase
          .from("lens_families")
          .select("id, name, brand, lens_type, lens_material, description")
          .eq("is_active", true)
          .in("lens_type", recommendedTypes);

        if (highIndexMaterials) {
          query = query.in("lens_material", highIndexMaterials);
        }

        query = query.or(
          `organization_id.eq.${organizationId},organization_id.is.null`,
        );

        const { data: families, error } = await query.limit(20);

        if (error) {
          return {
            success: false,
            error: error.message || "Error al buscar familias de lentes",
          };
        }

        const reasons: string[] = [];
        if (hasAddition(prescription)) {
          reasons.push(
            `Presbicia detectada (adición): solución recomendada ${solution}`,
          );
        }
        if (needsHighIndex) {
          reasons.push(
            `Prescripción fuerte (esfera ${farSphere.toFixed(2)}D, cilindro ${cylinder.toFixed(2)}D): se sugiere alto índice para lentes más delgados`,
          );
        }
        if (!hasAddition(prescription) && !needsHighIndex) {
          reasons.push("Monofocal: lentes de visión simple compatibles");
        }

        const suggestions = (families || []).map((f) => ({
          id: f.id,
          name: f.name,
          brand: f.brand,
          lens_type: f.lens_type,
          lens_material: f.lens_material,
          description: f.description,
        }));

        return {
          success: true,
          data: {
            prescriptionSummary: {
              solution,
              recommendedTypes,
              needsHighIndex,
              reasons,
            },
            lensFamilies: suggestions,
            count: suggestions.length,
          },
          message: `Se encontraron ${suggestions.length} familia(s) de lentes compatibles. ${reasons.join(". ")}`,
        };
      } catch (error: unknown) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to suggest lenses from prescription",
        };
      }
    },
  },
  {
    name: "createPrescription",
    description:
      "Add a prescription to a customer. Use when the user asks to add a prescription (e.g. 'add prescription for Juan Perez', 'add receta for customer with RUT 18345698-9'). Requires at least od_sphere or os_sphere. If user says 'from photo' without data, ask them to provide sphere, cylinder, add values.",
    category: "prescriptions",
    parameters: {
      type: "object",
      properties: {
        customerNameOrRut: {
          type: "string",
          description: "Customer name or RUT (e.g. 'Juan Perez', '18345698-9')",
        },
        od_sphere: { type: "number", description: "OD sphere (e.g. -2.5)" },
        os_sphere: { type: "number", description: "OS sphere" },
        od_cylinder: { type: "number", description: "OD cylinder" },
        os_cylinder: { type: "number", description: "OS cylinder" },
        od_add: { type: "number", description: "OD addition (presbyopia)" },
        os_add: { type: "number", description: "OS addition (presbyopia)" },
        prescription_type: {
          type: "string",
          description: "progressive, bifocal, trifocal, single_vision",
        },
        prescription_number: {
          type: "string",
          description: "Prescription number if available",
        },
        branchName: {
          type: "string",
          description: "Branch name to scope customer search (optional)",
        },
      },
    },
    zodSchema: createPrescriptionSchema,
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = createPrescriptionSchema.parse(params);
        const { supabase, organizationId, userId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        let branchId: string | null | undefined;
        if (validated.branchName) {
          branchId = await resolveBranchByName(
            supabase,
            organizationId,
            validated.branchName,
          );
        }

        const customerId = await resolveCustomerByNameOrRut(
          supabase,
          organizationId,
          validated.customerNameOrRut,
          branchId ?? undefined,
        );

        if (!customerId) {
          return {
            success: false,
            error: `Cliente no encontrado: ${validated.customerNameOrRut}`,
          };
        }

        const { data: customerData } = await supabase
          .from("customers")
          .select("organization_id, branch_id")
          .eq("id", customerId)
          .single();

        const { data: prescription, error } = await supabase
          .from("prescriptions")
          .insert({
            customer_id: customerId,
            organization_id: customerData?.organization_id ?? organizationId,
            branch_id: customerData?.branch_id ?? null,
            prescription_date: new Date().toISOString().split("T")[0],
            prescription_number: validated.prescription_number ?? null,
            od_sphere: validated.od_sphere ?? null,
            os_sphere: validated.os_sphere ?? null,
            od_cylinder: validated.od_cylinder ?? null,
            os_cylinder: validated.os_cylinder ?? null,
            od_add: validated.od_add ?? null,
            os_add: validated.os_add ?? null,
            prescription_type: validated.prescription_type ?? null,
            is_active: true,
            is_current: true,
            created_by: userId,
          })
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: error.message || "Error al crear la receta",
          };
        }

        return {
          success: true,
          data: prescription,
          message: `Receta agregada correctamente al cliente. Prescription ID: ${prescription?.id}`,
        };
      } catch (error: unknown) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create prescription",
        };
      }
    },
  },
];
