import { z } from "zod";
import type { ToolDefinition, ToolResult } from "./types";

const analyzeMarketTrendsSchema = z.object({
  months: z
    .number()
    .default(6)
    .describe("Número de meses a analizar (default: 6)"),
  category: z
    .string()
    .optional()
    .describe("Filtrar por categoría específica (opcional)"),
});

export const marketTrendsTools: ToolDefinition[] = [
  {
    name: "analyzeMarketTrends",
    description:
      "Analizar tendencias del mercado basándose en datos históricos de ventas y productos populares.",
    category: "market_analysis",
    parameters: {
      type: "object",
      properties: {
        months: {
          type: "number",
          default: 6,
          description: "Número de meses de historia a analizar",
        },
        category: {
          type: "string",
          description: "Categoría de producto específica para filtrar análisis",
        },
      },
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = analyzeMarketTrendsSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - validated.months);

        // Consultar items de órdenes vendidos en el período
        const query = supabase
          .from("order_items")
          .select(
            `
            quantity,
            total_price,
            created_at,
            products (
              id,
              name,
              price,
              category:category_id (
                name
              )
            ),
            orders (
              created_at
            )
          `,
          )
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true });

        const { data: sales, error } = await query;

        if (error) {
          return { success: false, error: error.message };
        }

        if (!sales || sales.length === 0) {
          return {
            success: true,
            data: {
              trends: [],
              topProducts: [],
              topBrands: [],
              summary:
                "No hay datos suficientes para analizar tendencias en el período seleccionado.",
            },
            message: "Análisis de tendencias completado sin datos.",
          };
        }

        // Procesar datos
        const productsMap = new Map();
        const brandsMap = new Map();
        const categoriesMap = new Map();

        // Agrupar por mes para ver evolución
        const monthlyData = new Map();

        sales.forEach((sale) => {
          // Filtrar por categoría si se especificó
          const product: any = sale.products;
          // @ts-ignore
          const categoryName = product?.category?.name;
          if (validated.category && categoryName !== validated.category) return;

          const productKey = product?.id || "unknown";
          const brandKey = "Generic"; // Brand column doesn't exist yet
          const categoryKey = categoryName || "Uncategorized";

          const orderObj: any = sale.orders;
          const orderDateStr = Array.isArray(orderObj)
            ? orderObj[0]?.created_at
            : orderObj?.created_at;
          const orderDate = orderDateStr
            ? new Date(orderDateStr)
            : new Date(sale.created_at);
          const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;

          // Totales por producto
          if (!productsMap.has(productKey)) {
            productsMap.set(productKey, {
              name: product?.name || "Desconocido",
              category: categoryKey,
              brand: brandKey,
              totalSold: 0,
              revenue: 0,
              monthlySales: {},
            });
          }
          const pData = productsMap.get(productKey);
          pData.totalSold += sale.quantity;
          pData.revenue += sale.total_price;
          pData.monthlySales[monthKey] =
            (pData.monthlySales[monthKey] || 0) + sale.quantity;

          // Totales por marca
          if (!brandsMap.has(brandKey)) {
            brandsMap.set(brandKey, {
              name: brandKey,
              totalSold: 0,
              revenue: 0,
            });
          }
          const bData = brandsMap.get(brandKey);
          bData.totalSold += sale.quantity;
          bData.revenue += sale.total_price;

          // Totales por categoría
          if (!categoriesMap.has(categoryKey)) {
            categoriesMap.set(categoryKey, {
              name: categoryKey,
              totalSold: 0,
              revenue: 0,
            });
          }
          const cData = categoriesMap.get(categoryKey);
          cData.totalSold += sale.quantity;
          cData.revenue += sale.total_price;
        });

        // Calcular tendencias (Crecimiento)
        const productsList = Array.from(productsMap.values());
        const productsWithTrend = productsList.map((p) => {
          const months = Object.keys(p.monthlySales).sort();
          const lastMonth = months[months.length - 1];
          const prevMonth = months[months.length - 2];

          const lastMonthSales = p.monthlySales[lastMonth] || 0;
          const prevMonthSales = p.monthlySales[prevMonth] || 0;

          let growth = 0;
          if (prevMonthSales > 0) {
            growth = ((lastMonthSales - prevMonthSales) / prevMonthSales) * 100;
          } else if (lastMonthSales > 0) {
            growth = 100; // Nuevo bestseller
          }

          return {
            ...p,
            growth,
            trend:
              growth > 20 ? "rising" : growth < -20 ? "declining" : "stable",
          };
        });

        // Identificar Top Products
        const topProducts = productsWithTrend
          .sort((a, b) => b.totalSold - a.totalSold)
          .slice(0, 10);

        // Identificar Trending Products (Alto crecimiento)
        const trendingProducts = productsWithTrend
          .filter((p) => p.trend === "rising" && p.totalSold > 5) // Mínimo de ventas para ser tendencia
          .sort((a, b) => b.growth - a.growth)
          .slice(0, 5);

        // Brands
        const topBrands = Array.from(brandsMap.values())
          .sort((a, b) => b.totalSold - a.totalSold)
          .slice(0, 5);

        // Generar recomendaciones de inventario basadas en tendencias
        const inventoryRecommendations: string[] = [];
        trendingProducts.forEach((p) => {
          inventoryRecommendations.push(
            `Aumentar stock de "${p.name}" debido a tendencia creciente (+${p.growth.toFixed(1)}%).`,
          );
        });

        productsWithTrend
          .filter((p) => p.trend === "declining" && p.totalSold > 10)
          .slice(0, 3)
          .forEach((p) => {
            inventoryRecommendations.push(
              `Evaluar reducción de stock o promoción para "${p.name}" (tendencia a la baja).`,
            );
          });

        return {
          success: true,
          data: {
            period: `${validated.months} meses`,
            topProducts: topProducts.map((p) => ({
              name: p.name,
              sold: p.totalSold,
              revenue: p.revenue,
              trend: p.trend,
            })),
            trendingProducts: trendingProducts.map((p) => ({
              name: p.name,
              growth: `${p.growth.toFixed(1)}%`,
            })),
            topBrands: topBrands,
            categoryDistribution: Array.from(categoriesMap.values()),
            recommendations: inventoryRecommendations,
          },
          message: `Análisis de tendencias de mercado completado.`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to analyze market trends",
        };
      }
    },
  },
];
