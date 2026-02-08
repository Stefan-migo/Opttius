import { z } from "zod";
import type { ToolDefinition, ToolResult } from "./types";

const analyzeBusinessFlowSchema = z.object({
  days: z
    .number()
    .default(30)
    .describe("Número de días a analizar (default: 30)"),
  includeDetails: z
    .boolean()
    .default(true)
    .describe("Incluir detalles de cada etapa del proceso"),
});

export const businessFlowTools: ToolDefinition[] = [
  {
    name: "analyzeBusinessFlow",
    description:
      "Analizar el flujo de trabajo completo de la óptica para identificar cuellos de botella y oportunidades de mejora.",
    category: "business_flow",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          default: 30,
          description: "Número de días a analizar para el flujo de trabajo",
        },
        includeDetails: {
          type: "boolean",
          default: true,
          description:
            "Incluir detalles de cada etapa del proceso y órdenes específicas",
        },
      },
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = analyzeBusinessFlowSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - validated.days);

        // Obtener órdenes con timestamps de cada etapa
        const { data: orders, error } = await supabase
          .from("orders")
          .select(
            `
            id,
            order_number,
            created_at,
            status,
            payment_status,
            total_amount,
            shipped_at,
            delivered_at,
            updated_at,
            order_items (
              id,
              product_name,
              quantity,
              total_price
            )
          `,
          )
          .eq("organization_id", organizationId)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true });

        if (error) {
          return { success: false, error: error.message };
        }

        if (!orders || orders.length === 0) {
          return {
            success: true,
            data: {
              analysis: {
                totalOrders: 0,
                averageProcessingTime: 0,
                bottleneckStage: null,
                efficiency: 0,
                recommendations: [
                  "No hay datos suficientes para análisis. Requiere más órdenes históricas.",
                ],
              },
              summary: "No se encontraron órdenes en el período especificado",
            },
            message: "Análisis de flujo de completado sin datos",
          };
        }

        // Analizar cada orden para calcular tiempos por etapa
        const orderProcessingTimes = orders
          .map((order) => {
            const created = new Date(order.created_at);
            let processingTime = 0;
            let bottleneckStage = null;

            // Calcular tiempos por etapa
            const stages = [];

            // Tiempo hasta procesamiento (usamos created_at como inicio si no hay más)
            const processingTimeFallback = order.shipped_at || order.updated_at;
            if (processingTimeFallback) {
              const processing = new Date(processingTimeFallback);
              const timeToProcessing =
                (processing.getTime() - created.getTime()) /
                (1000 * 60 * 60 * 24); // días
              stages.push({
                name: "Recepción",
                duration: timeToProcessing > 0 ? timeToProcessing : 0.1,
                timestamp: processingTimeFallback,
              });
              processingTime += timeToProcessing;
            }

            // Tiempo hasta envío
            if (order.shipped_at) {
              const shipped = new Date(order.shipped_at);
              const timeToShipping =
                (shipped.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
              stages.push({
                name: "Producción/Preparación",
                duration: timeToShipping,
                timestamp: order.shipped_at,
              });
              processingTime = timeToShipping; // Update cumulative processing time

              if (timeToShipping > 3)
                bottleneckStage = "Producción/Preparación";
            }

            // Tiempo hasta entrega
            if (order.delivered_at) {
              const delivered = new Date(order.delivered_at);
              const timeToDelivery =
                (delivered.getTime() -
                  (order.shipped_at
                    ? new Date(order.shipped_at).getTime()
                    : created.getTime())) /
                (1000 * 60 * 60 * 24);
              stages.push({
                name: "Envío/Entrega",
                duration: timeToDelivery,
                timestamp: order.delivered_at,
              });
              processingTime =
                (delivered.getTime() - created.getTime()) /
                (1000 * 60 * 60 * 24);

              if (timeToDelivery > 5) bottleneckStage = "Envío/Entrega";
            }

            // Tiempo hasta completación Final
            if (order.status === "completed") {
              const completed = new Date(order.updated_at);
              const timeToCompletion =
                (completed.getTime() - created.getTime()) /
                (1000 * 60 * 60 * 24);
              stages.push({
                name: "Completación Final",
                duration:
                  timeToCompletion > processingTime
                    ? timeToCompletion - processingTime
                    : 0.1,
                timestamp: order.updated_at,
              });

              if (timeToCompletion > processingTime + 1 && processingTime > 0)
                bottleneckStage = "Completación Final";

              processingTime = timeToCompletion;
            }

            return {
              orderNumber: order.order_number,
              totalProcessingTime: processingTime,
              stages,
              bottleneckStage,
              status: order.status,
              paymentStatus: order.payment_status,
              totalAmount: order.total_amount,
              itemCount: order.order_items?.length || 0,
            };
          })
          .filter((order) => order.totalProcessingTime > 0);

        // Calcular métricas generales
        const totalOrders = orderProcessingTimes.length;
        const averageProcessingTime =
          orderProcessingTimes.reduce(
            (sum, order) => sum + order.totalProcessingTime,
            0,
          ) / totalOrders;

        // Identificar cuellos de botella por etapa
        const bottleneckCounts = orderProcessingTimes
          .filter((order) => order.bottleneckStage)
          .reduce(
            (acc, order) => {
              if (order.bottleneckStage) {
                acc[order.bottleneckStage] =
                  (acc[order.bottleneckStage] || 0) + 1;
              }
              return acc;
            },
            {} as Record<string, number>,
          );

        const bottleneckStage =
          Object.entries(bottleneckCounts).sort(
            ([, a], [, b]) => b - a,
          )[0]?.[0] || null;

        // Calcular eficiencia (comparar con estándares del sector)
        const industryStandard = 7; // días estándar en óptica
        const efficiency = Math.max(
          0,
          Math.min(
            100,
            ((industryStandard - averageProcessingTime) / industryStandard) *
              100,
          ),
        );

        // Generar recomendaciones específicas
        const recommendations = [];

        if (bottleneckStage) {
          recommendations.push(
            `Cuello de botleneck identificado en etapa: ${bottleneckStage}. Se recomienda revisar procesos en esta área.`,
          );
        }

        if (averageProcessingTime > industryStandard) {
          recommendations.push(
            `Tiempo promedio de procesamiento (${averageProcessingTime.toFixed(1)} días) supera el estándar del sector (${industryStandard} días). Se recomienda optimizar el flujo de trabajo.`,
          );
        }

        if (efficiency < 70) {
          recommendations.push(
            `Eficiencia del flujo de trabajo es baja (${efficiency.toFixed(1)}%). Se recomienda revisar asignación de recursos y automatización.`,
          );
        }

        // Análisis por categoría de producto
        const categoryAnalysis = orderProcessingTimes.reduce(
          (acc, order) => {
            const category = order.itemCount > 5 ? "Multi-producto" : "Simple";
            if (!acc[category]) {
              acc[category] = { count: 0, totalTime: 0, avgTime: 0 };
            }
            acc[category].count++;
            acc[category].totalTime += order.totalProcessingTime;
            acc[category].avgTime =
              acc[category].totalTime / acc[category].count;
            return acc;
          },
          {} as Record<
            string,
            { count: number; totalTime: number; avgTime: number }
          >,
        );

        // Detalles específicos si se solicitan
        let detailedAnalysis = null;
        if (validated.includeDetails) {
          detailedAnalysis = {
            slowestOrders: orderProcessingTimes
              .sort((a, b) => b.totalProcessingTime - a.totalProcessingTime)
              .slice(0, 5)
              .map((order) => ({
                orderNumber: order.orderNumber,
                totalTime: order.totalProcessingTime,
                bottleneck: order.bottleneckStage,
                stages: order.stages,
                status: order.status,
              })),
            stageAnalysis: Object.entries(
              orderProcessingTimes.reduce(
                (acc, order) => {
                  order.stages.forEach((stage) => {
                    if (!acc[stage.name]) {
                      acc[stage.name] = { totalTime: 0, count: 0, avgTime: 0 };
                    }
                    acc[stage.name].totalTime += stage.duration;
                    acc[stage.name].count++;
                    acc[stage.name].avgTime =
                      acc[stage.name].totalTime / acc[stage.name].count;
                  });
                  return acc;
                },
                {} as Record<
                  string,
                  { totalTime: number; count: number; avgTime: number }
                >,
              ),
            ),
          };
        }

        const analysis = {
          totalOrders,
          averageProcessingTime: parseFloat(averageProcessingTime.toFixed(2)),
          bottleneckStage,
          efficiency: parseFloat(efficiency.toFixed(2)),
          recommendations,
          categoryAnalysis,
          detailedAnalysis,
        };

        return {
          success: true,
          data: { analysis },
          message: `Análisis de flujo de trabajo completado para ${totalOrders} órdenes en los últimos ${validated.days} días`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to analyze business flow",
        };
      }
    },
  },
];
