import { z } from "zod";
import type { ToolDefinition, ToolResult } from "./types";

const optimizeInventorySchema = z.object({
  category: z
    .string()
    .optional()
    .describe("Categoría de productos a optimizar (opcional)"),
  lowStockThreshold: z
    .number()
    .default(5)
    .describe("Umbral para considerar stock bajo (cantidad física)"),
});

export const inventoryTools: ToolDefinition[] = [
  {
    name: "optimizeInventory",
    description:
      "Optimizar inventario analizando stock actual frente a velocidad de ventas para recomendar reordenamiento.",
    category: "inventory_optimization",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Categoría específica a optimizar",
        },
        lowStockThreshold: {
          type: "number",
          default: 5,
          description:
            "Cantidad mínima de seguridad para alertas de stock bajo",
        },
      },
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = optimizeInventorySchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        // 1. Obtener productos e inventario actual
        let productsQuery = supabase
          .from("products")
          .select(
            "id, name, inventory_quantity, low_stock_threshold, category_id, cost_price, price",
          )
          .eq("organization_id", organizationId)
          .eq("status", "active");

        if (validated.category) {
          productsQuery = productsQuery.eq("category_id", validated.category);
        }

        const { data: products, error: productsError } = await productsQuery;

        if (productsError)
          return { success: false, error: productsError.message };
        if (!products || products.length === 0)
          return {
            success: true,
            data: { message: "No se encontraron productos." },
          };

        // 2. Calcular velocidad de ventas (últimos 30 días)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: sales, error: salesError } = await supabase
          .from("order_items")
          .select("product_id, quantity, created_at")
          .gte("created_at", thirtyDaysAgo.toISOString());

        if (salesError) return { success: false, error: salesError.message };

        // Mapa de ventas por producto
        const salesVelocity = new Map<string, number>(); // Unidades por día
        sales?.forEach((sale) => {
          const current = salesVelocity.get(sale.product_id) || 0;
          salesVelocity.set(sale.product_id, current + sale.quantity);
        });

        // 3. Analizar cada producto
        const analysis = products.map((product) => {
          const soldLast30Days = salesVelocity.get(product.id) || 0;
          const dailyRunRate = soldLast30Days / 30;
          const currentStock = product.inventory_quantity || 0;

          let daysOfSupply = 999; // Infinito si no hay ventas
          if (dailyRunRate > 0) {
            daysOfSupply = currentStock / dailyRunRate;
          }

          const minThreshold =
            product.low_stock_threshold || validated.lowStockThreshold;

          // Determinar estado
          let status = "healthy";
          let recommendation = "Mantener niveles actuales";

          if (currentStock === 0) {
            status = "out_of_stock";
            recommendation = "⚠️ REORDER INMEDIATO: Producto agotado.";
          } else if (currentStock <= minThreshold) {
            status = "critical_low";
            recommendation = `⚠️ REORDER: Stock (${currentStock}) por debajo del mínimo (${minThreshold}).`;
          } else if (daysOfSupply < 14) {
            // Menos de 2 semanas de stock
            status = "low_supply";
            recommendation = `Planificar Reorder: Stock para ${daysOfSupply.toFixed(1)} días basados en ventas recientes.`;
          } else if (daysOfSupply > 180 && currentStock > 20) {
            // Más de 6 meses de stock
            status = "overstock";
            recommendation =
              "Evaluar promoción: Posible exceso de inventario (baja rotación).";
          }

          return {
            id: product.id,
            name: product.name,
            category: product.category_id,
            currentStock,
            soldLast30Days,
            dailyRunRate: parseFloat(dailyRunRate.toFixed(2)),
            daysOfSupply:
              daysOfSupply === 999
                ? "> 1 año"
                : parseFloat(daysOfSupply.toFixed(1)),
            status,
            recommendation,
          };
        });

        // Filtrar aquellos que requieren acción
        const actionableItems = analysis
          .filter((a) => a.status !== "healthy")
          .sort((a, b) => {
            // Prioridad: out_of_stock > critical_low > low_supply > overstock
            const priorities: any = {
              out_of_stock: 0,
              critical_low: 1,
              low_supply: 2,
              overstock: 3,
            };
            return priorities[a.status] - priorities[b.status];
          });

        // Resumen
        const summary = {
          totalProducts: products.length,
          outOfStock: analysis.filter((a) => a.status === "out_of_stock")
            .length,
          criticalLow: analysis.filter((a) => a.status === "critical_low")
            .length,
          overstock: analysis.filter((a) => a.status === "overstock").length,
          recommendedActions: actionableItems.length,
        };

        return {
          success: true,
          data: {
            summary,
            actionableItems: actionableItems.slice(0, 20), // Top 20 items requiring action
            stockValuation: products.reduce(
              (acc, p) => acc + (p.inventory_quantity || 0) * p.cost_price,
              0,
            ),
          },
          message: `Optimización de inventario completada. ${actionableItems.length} productos requieren atención.`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to optimize inventory",
        };
      }
    },
  },
];
