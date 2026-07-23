import { z } from "zod";

import {
  getCylinder,
  getDefaultPresbyopiaSolution,
  getFarSphere,
  getRecommendedLensTypes,
  hasAddition,
  type Prescription,
} from "@/lib/presbyopia-helpers";

import { resolvePrescriptionByNumber } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";

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

export const suggestLensFromPrescriptionTool: ToolDefinition = {
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
};
