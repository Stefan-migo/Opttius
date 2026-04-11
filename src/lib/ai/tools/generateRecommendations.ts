import { z } from "zod";

import { createOrganizationalMemory } from "../memory/organizational";
import type { ToolDefinition, ToolResult } from "./types";

const generateRecommendationsSchema = z.object({
  focus: z
    .enum(["growth", "efficiency", "inventory", "customer", "general"])
    .default("general")
    .describe("Área de enfoque para las recomendaciones"),
});

export const recommendationTools: ToolDefinition[] = [
  {
    name: "generateRecommendations",
    description:
      "Generar recomendaciones estratégicas personalizadas basadas en la madurez organizacional y métricas actuales.",
    category: "strategy",
    parameters: {
      type: "object",
      properties: {
        focus: {
          type: "string",
          enum: ["growth", "efficiency", "inventory", "customer", "general"],
          default: "general",
          description: "Área principal de enfoque para las recomendaciones",
        },
      },
    },
    zodSchema: generateRecommendationsSchema,
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = generateRecommendationsSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Contexto de organización no disponible.",
          };
        }

        const orgId = organizationId;
        const memory = createOrganizationalMemory(orgId, supabase);

        // 2. Obtener contexto organizacional
        const [maturity, contextData, metrics] = await Promise.all([
          memory.getMaturityLevel(),
          memory.getOrganizationalContext(),
          memory.getActivityMetrics(),
        ]);

        // 3. Generar recomendaciones basadas en Madurez y Enfoque
        const recommendations: string[] = [];
        const insights: string[] = [];

        // Estrategia según Fase de Madurez
        switch (maturity.level) {
          case "new":
          case "starting":
            insights.push(
              `Fase actual: ${maturity.description}. El objetivo es establecer operaciones base.`,
            );
            if (metrics.totalOrders < 10) {
              recommendations.push(
                "Prioridad: Completar configuración de catálogo de productos.",
              );
              recommendations.push(
                "Acción: Registrar primera venta o pedido de prueba para verificar flujo.",
              );
            } else {
              recommendations.push(
                "Foco: Adquisición de primeros clientes recurrentes.",
              );
              recommendations.push(
                "Sugerencia: Configurar recordatorios automáticos para citas.",
              );
            }
            break;

          case "growing":
            insights.push(
              `Fase actual: Crecimiento. Foco en retención y eficiencia.`,
            );
            if (metrics.customerRetentionRate < 40) {
              recommendations.push(
                "Alerta: Baja tasa de retención. Implementar seguimiento post-venta.",
              );
            }
            recommendations.push(
              "Oportunidad: Analizar productos más vendidos para asegurar stock.",
            );
            break;

          case "established":
            insights.push(
              `Fase actual: Establecida. Foco en optimización y rentabilidad.`,
            );
            recommendations.push(
              "Estrategia: Analizar rentabilidad por categoría (no solo volumen).",
            );
            recommendations.push(
              "Optimización: Revisar cuellos de botella en tiempos de entrega.",
            );
            break;
        }

        // Recomendaciones específicas por área (Focus)
        if (validated.focus === "inventory" || validated.focus === "general") {
          // Lógica simple de inventario sin re-consultar todo
          if (contextData.topProducts.length > 0) {
            recommendations.push(
              `Inventario: Asegurar disponibilidad de top seller "${contextData.topProducts[0].name}".`,
            );
          }
        }

        if (validated.focus === "customer" || validated.focus === "general") {
          if (contextData.customerCount > 0 && metrics.monthlyOrders > 0) {
            const ordersPerCustomer =
              metrics.monthlyOrders / contextData.customerCount;
            if (ordersPerCustomer < 0.5) {
              recommendations.push(
                "Clientes: Activar campañas de reactivación para clientes inactivos.",
              );
            }
          }
        }

        return {
          success: true,
          data: {
            organization: contextData.name,
            maturityLevel: maturity.level,
            focusArea: validated.focus,
            insights,
            recommendations,
            contextSummary: {
              totalOrders: metrics.totalOrders,
              customerCount: contextData.customerCount,
            },
          },
          message: `Recomendaciones generadas para fase ${maturity.level}`,
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: error.message || "Failed to generate recommendations",
        };
      }
    },
  },
];
