import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";
import { analyzeCustomerHealth, analyzeInventoryHealth, analyzeOrdersHealth, analyzeSystemPerformance, calculateOverallHealth, generateComprehensiveRecommendations, generateSummary, getCriticalIssues } from "./_helpers/analyzers";

const diagnoseSystemSchema = z.object({
  days: z.number().default(30).describe("Número de días a analizar (default: 30)"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium").describe("Nivel de severidad a reportar"),
});

export const diagnoseSystemTool: ToolDefinition = {
  name: "diagnoseSystem",
  description: "Realizar diagnóstico completo del sistema y procesos operativos, identificando problemas, inconsistencias y oportunidades de mejora.",
  category: "system_diagnosis",
  parameters: { type: "object", properties: { days: { type: "number", default: 30, description: "Número de días a analizar para el diagnóstico" }, severity: { type: "string", enum: ["low", "medium", "high", "critical"], default: "medium", description: "Nivel de severidad de los problemas a reportar" } } },
  zodSchema: diagnoseSystemSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = diagnoseSystemSchema.parse(params);
      const { supabase, organizationId } = context;
      if (!organizationId) return { success: false, error: "Organization ID is missing in context" };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - validated.days);

      const [ordersAnalysis, inventoryAnalysis, customerAnalysis, performanceAnalysis] = await Promise.all([
        analyzeOrdersHealth(supabase, startDate, validated.severity, organizationId),
        analyzeInventoryHealth(supabase, startDate, validated.severity, organizationId),
        analyzeCustomerHealth(supabase, startDate, validated.severity, organizationId),
        analyzeSystemPerformance(supabase, startDate, validated.severity, organizationId),
      ]);

      return {
        success: true,
        data: {
          diagnosis: {
            overallHealth: calculateOverallHealth([ordersAnalysis, inventoryAnalysis, customerAnalysis, performanceAnalysis]),
            orders: ordersAnalysis, inventory: inventoryAnalysis, customers: customerAnalysis, performance: performanceAnalysis,
            criticalIssues: getCriticalIssues([ordersAnalysis, inventoryAnalysis, customerAnalysis, performanceAnalysis]),
            recommendations: generateComprehensiveRecommendations([ordersAnalysis, inventoryAnalysis, customerAnalysis, performanceAnalysis]),
            summary: generateSummary([ordersAnalysis, inventoryAnalysis, customerAnalysis, performanceAnalysis]),
          },
        },
        message: `Diagnóstico del sistema completado para ${validated.days} días`,
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message || "Failed to diagnose system" };
    }
  },
};
