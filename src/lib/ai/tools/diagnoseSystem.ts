import { z } from "zod";
import type { ToolDefinition, ToolResult } from "./types";

const diagnoseSystemSchema = z.object({
  days: z
    .number()
    .default(30)
    .describe("Número de días a analizar (default: 30)"),
  severity: z
    .enum(["low", "medium", "high", "critical"])
    .default("medium")
    .describe("Nivel de severidad a reportar"),
});

export const diagnoseSystemTools: ToolDefinition[] = [
  {
    name: "diagnoseSystem",
    description:
      "Realizar diagnóstico completo del sistema y procesos operativos, identificando problemas, inconsistencias y oportunidades de mejora.",
    category: "system_diagnosis",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          default: 30,
          description: "Número de días a analizar para el diagnóstico",
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          default: "medium",
          description: "Nivel de severidad de los problemas a reportar",
        },
      },
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = diagnoseSystemSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - validated.days);

        // Analizar múltiples aspectos del sistema
        const [
          ordersAnalysis,
          inventoryAnalysis,
          customerAnalysis,
          performanceAnalysis,
        ] = await Promise.all([
          analyzeOrdersHealth(
            supabase,
            startDate,
            validated.severity,
            organizationId,
          ),
          analyzeInventoryHealth(
            supabase,
            startDate,
            validated.severity,
            organizationId,
          ),
          analyzeCustomerHealth(
            supabase,
            startDate,
            validated.severity,
            organizationId,
          ),
          analyzeSystemPerformance(
            supabase,
            startDate,
            validated.severity,
            organizationId,
          ),
        ]);

        // Combinar todos los análisis
        const diagnosis = {
          overallHealth: calculateOverallHealth([
            ordersAnalysis,
            inventoryAnalysis,
            customerAnalysis,
            performanceAnalysis,
          ]),
          orders: ordersAnalysis,
          inventory: inventoryAnalysis,
          customers: customerAnalysis,
          performance: performanceAnalysis,
          criticalIssues: getCriticalIssues([
            ordersAnalysis,
            inventoryAnalysis,
            customerAnalysis,
            performanceAnalysis,
          ]),
          recommendations: generateComprehensiveRecommendations([
            ordersAnalysis,
            inventoryAnalysis,
            customerAnalysis,
            performanceAnalysis,
          ]),
          summary: generateSummary([
            ordersAnalysis,
            inventoryAnalysis,
            customerAnalysis,
            performanceAnalysis,
          ]),
        };

        return {
          success: true,
          data: { diagnosis },
          message: `Diagnóstico del sistema completado para ${validated.days} días`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to diagnose system",
        };
      }
    },
  },
];

// Helper functions

async function analyzeOrdersHealth(
  supabase: any,
  startDate: Date,
  severity: string,
  organizationId: string,
) {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, status, payment_status, total_amount, created_at, updated_at")
    .eq("organization_id", organizationId)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return { health: "unknown", issues: [], metrics: {} };
  }

  const totalOrders = orders?.length || 0;
  const paidOrders =
    orders?.filter((o: any) => o.payment_status === "paid").length || 0;
  const completedOrders =
    orders?.filter((o: any) => o.status === "completed").length || 0;
  const pendingOrders =
    orders?.filter((o: any) => o.status === "pending").length || 0;
  const failedPayments =
    orders?.filter((o: any) => o.payment_status === "failed").length || 0;

  // Calcular métricas
  const paymentSuccessRate =
    totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;
  const completionRate =
    totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
  const pendingRate = totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0;
  const failedPaymentRate =
    totalOrders > 0 ? (failedPayments / totalOrders) * 100 : 0;

  // Identificar problemas
  const issues = [];

  if (paymentSuccessRate < 80) {
    issues.push({
      type: "payment",
      severity: paymentSuccessRate < 50 ? "critical" : "high",
      message: `Tasa de éxito de pagos baja (${paymentSuccessRate.toFixed(1)}%)`,
      impact: "Pérdida de ingresos significativa",
    });
  }

  if (pendingRate > 20) {
    issues.push({
      type: "process",
      severity: pendingRate > 40 ? "high" : "medium",
      message: `Alta tasa de órdenes pendientes (${pendingRate.toFixed(1)}%)`,
      impact: "Ineficiencia operativa",
    });
  }

  if (failedPaymentRate > 5) {
    issues.push({
      type: "payment",
      severity: failedPaymentRate > 10 ? "critical" : "high",
      message: `Alta tasa de pagos fallidos (${failedPaymentRate.toFixed(1)}%)`,
      impact: "Pérdida de ventas potenciales",
    });
  }

  // Filtrar por nivel de severidad
  const filteredIssues = filterIssuesBySeverity(issues, severity);

  return {
    health: calculateHealthScore([
      paymentSuccessRate,
      completionRate,
      100 - pendingRate,
      100 - failedPaymentRate,
    ]),
    issues: filteredIssues,
    metrics: {
      totalOrders,
      paidOrders,
      completedOrders,
      pendingOrders,
      failedPayments,
      paymentSuccessRate: parseFloat(paymentSuccessRate.toFixed(2)),
      completionRate: parseFloat(completionRate.toFixed(2)),
      pendingRate: parseFloat(pendingRate.toFixed(2)),
      failedPaymentRate: parseFloat(failedPaymentRate.toFixed(2)),
    },
  };
}

async function analyzeInventoryHealth(
  supabase: any,
  startDate: Date,
  severity: string,
  organizationId: string,
) {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, inventory_quantity, status, cost_price, price")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (error) {
    return { health: "unknown", issues: [], metrics: {} };
  }

  const totalProducts = products?.length || 0;
  const lowStock =
    products?.filter((p: any) => (p.inventory_quantity || 0) <= 5).length || 0;
  const outOfStock =
    products?.filter((p: any) => (p.inventory_quantity || 0) === 0).length || 0;
  const overStock =
    products?.filter((p: any) => (p.inventory_quantity || 0) > 100).length || 0;

  // Calcular métricas
  const lowStockRate = totalProducts > 0 ? (lowStock / totalProducts) * 100 : 0;
  const outOfStockRate =
    totalProducts > 0 ? (outOfStock / totalProducts) * 100 : 0;
  const overStockRate =
    totalProducts > 0 ? (overStock / totalProducts) * 100 : 0;

  // Identificar problemas
  const issues = [];

  if (outOfStockRate > 5) {
    issues.push({
      type: "inventory",
      severity: outOfStockRate > 15 ? "critical" : "high",
      message: `Alta tasa de productos sin stock (${outOfStockRate.toFixed(1)}%)`,
      impact: "Pérdida de ventas inmediata",
    });
  }

  if (lowStockRate > 20) {
    issues.push({
      type: "inventory",
      severity: lowStockRate > 40 ? "high" : "medium",
      message: `Alta tasa de productos con stock bajo (${lowStockRate.toFixed(1)}%)`,
      impact: "Riesgo de interrupción de ventas",
    });
  }

  if (overStockRate > 10) {
    issues.push({
      type: "inventory",
      severity: overStockRate > 20 ? "medium" : "low",
      message: `Alta tasa de productos con stock excesivo (${overStockRate.toFixed(1)}%)`,
      impact: "Inversión de capital ineficiente",
    });
  }

  const filteredIssues = filterIssuesBySeverity(issues, severity);

  return {
    health: calculateHealthScore([
      100 - outOfStockRate,
      100 - lowStockRate,
      100 - overStockRate,
    ]),
    issues: filteredIssues,
    metrics: {
      totalProducts,
      lowStock,
      outOfStock,
      overStock,
      lowStockRate: parseFloat(lowStockRate.toFixed(2)),
      outOfStockRate: parseFloat(outOfStockRate.toFixed(2)),
      overStockRate: parseFloat(overStockRate.toFixed(2)),
    },
  };
}

async function analyzeCustomerHealth(
  supabase: any,
  startDate: Date,
  severity: string,
  organizationId: string,
) {
  const { data: customers, error } = await supabase
    .from("profiles")
    .select("id, created_at");

  if (error) {
    return { health: "unknown", issues: [], metrics: {} };
  }

  const totalCustomers = customers?.length || 0;
  const newCustomers =
    customers?.filter((c: any) => {
      const daysSinceCreation =
        (new Date().getTime() - new Date(c.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      return daysSinceCreation <= 30;
    }).length || 0;

  // Calcular métricas
  const newCustomerRate =
    totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0;

  // Identificar problemas
  const issues = [];

  if (totalCustomers > 20 && newCustomerRate < 10) {
    issues.push({
      type: "growth",
      severity: newCustomerRate < 5 ? "critical" : "high",
      message: `Baja tasa de nuevos clientes (${newCustomerRate.toFixed(1)}%)`,
      impact: "Riesgo de estancamiento del negocio",
    });
  }

  const filteredIssues = filterIssuesBySeverity(issues, severity);

  return {
    health: calculateHealthScore([newCustomerRate]),
    issues: filteredIssues,
    metrics: {
      totalCustomers,
      newCustomers,
      newCustomerRate: parseFloat(newCustomerRate.toFixed(2)),
    },
  };
}

async function analyzeSystemPerformance(
  supabase: any,
  startDate: Date,
  severity: string,
  organizationId: string,
) {
  // Analizar métricas de rendimiento desde Organization
  const { data: orgData, error } = await supabase
    .from("organizations")
    .select(
      "total_orders, total_revenue, average_order_value, customer_retention_rate, order_completion_rate",
    )
    .eq("id", organizationId)
    .limit(1);

  if (error || !orgData || orgData.length === 0) {
    return { health: "unknown", issues: [], metrics: {} };
  }

  const org = orgData[0];
  const retentionRate = org.customer_retention_rate || 0;
  const completionRate = org.order_completion_rate || 0;

  // Identificar problemas
  const issues = [];

  if (retentionRate < 60) {
    issues.push({
      type: "retention",
      severity: retentionRate < 40 ? "critical" : "high",
      message: `Baja tasa de retención de clientes (${retentionRate.toFixed(1)}%)`,
      impact: "Pérdida de ingresos recurrentes",
    });
  }

  if (completionRate < 80) {
    issues.push({
      type: "process",
      severity: completionRate < 60 ? "high" : "medium",
      message: `Baja tasa de completación de órdenes (${completionRate.toFixed(1)}%)`,
      impact: "Ineficiencia operativa",
    });
  }

  const filteredIssues = filterIssuesBySeverity(issues, severity);

  return {
    health: calculateHealthScore([retentionRate, completionRate]),
    issues: filteredIssues,
    metrics: {
      totalOrders: org.total_orders || 0,
      totalRevenue: org.total_revenue || 0,
      averageOrderValue: org.average_order_value || 0,
      customerRetentionRate: parseFloat(retentionRate.toFixed(2)),
      orderCompletionRate: parseFloat(completionRate.toFixed(2)),
    },
  };
}

// Utility functions

function filterIssuesBySeverity(issues: any[], severity: string) {
  return issues.filter((issue) => {
    if (severity === "low") return issue.severity === "low";
    if (severity === "medium")
      return issue.severity === "medium" || issue.severity === "low";
    if (severity === "high")
      return ["high", "critical"].includes(issue.severity);
    return true;
  });
}

function calculateHealthScore(scores: number[]): string {
  if (scores.length === 0) return "unknown";
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (average >= 80) return "excellent";
  if (average >= 60) return "good";
  if (average >= 40) return "fair";
  if (average >= 20) return "poor";
  return "critical";
}

function calculateOverallHealth(analysisResults: any[]): string {
  const healthScores = analysisResults.map((result) => {
    switch (result.health) {
      case "excellent":
        return 100;
      case "good":
        return 80;
      case "fair":
        return 60;
      case "poor":
        return 40;
      case "critical":
        return 20;
      default:
        return 50;
    }
  });

  const average = healthScores.reduce((a, b) => a + b, 0) / healthScores.length;

  if (average >= 80) return "excellent";
  if (average >= 60) return "good";
  if (average >= 40) return "fair";
  if (average >= 20) return "poor";
  return "critical";
}

function getCriticalIssues(analysisResults: any[]): any[] {
  const allIssues = analysisResults.flatMap((result) => result.issues || []);
  return allIssues.filter((issue) => issue.severity === "critical");
}

function generateComprehensiveRecommendations(
  analysisResults: any[],
): string[] {
  const recommendations: string[] = [];

  // Análisis de órdenes
  const ordersAnalysis = analysisResults[0];
  if (ordersAnalysis?.issues) {
    ordersAnalysis.issues.forEach((issue: any) => {
      if (issue.severity === "critical" || issue.severity === "high") {
        recommendations.push(
          `Revisar ${issue.type}: ${issue.message} (${issue.impact})`,
        );
      }
    });
  }

  // Análisis de inventario
  const inventoryAnalysis = analysisResults[1];
  if (inventoryAnalysis?.issues) {
    inventoryAnalysis.issues.forEach((issue: any) => {
      if (issue.severity === "critical" || issue.severity === "high") {
        recommendations.push(`Inventario: ${issue.message}`);
      }
    });
  }

  // Análisis de clientes
  const customerAnalysis = analysisResults[2];
  if (customerAnalysis?.issues) {
    customerAnalysis.issues.forEach((issue: any) => {
      recommendations.push(`Cliente: ${issue.message}`);
    });
  }

  // General
  if (recommendations.length === 0) {
    recommendations.push(
      "El sistema se encuentra en buen estado. Continuar monitoreo regular.",
    );
  }

  return recommendations;
}

function generateSummary(analysisResults: any[]): string {
  const health = calculateOverallHealth(analysisResults);
  const criticalIssues = getCriticalIssues(analysisResults);

  const healthMessages: any = {
    excellent: "El sistema se encuentra en excelente estado",
    good: "El sistema se encuentra en buen estado",
    fair: "El sistema requiere atención",
    poor: "El sistema requiere atención inmediata",
    critical: "El sistema requiere atención crítica",
  };

  let summary = healthMessages[health] || "Estado desconocido";

  if (criticalIssues.length > 0) {
    summary += `. Se identificaron ${criticalIssues.length} problemas críticos que requieren atención inmediata.`;
  } else {
    const totalIssues = analysisResults.reduce(
      (sum, r) => sum + (r.issues?.length || 0),
      0,
    );
    if (totalIssues > 0) {
      summary += `. Se identificaron ${totalIssues} problemas leves/moderados.`;
    }
  }

  return summary;
}
