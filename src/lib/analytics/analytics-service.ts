import { analyticsDashboardParamsSchema } from "@/lib/api/validation/zod-schemas";

export interface ProductBranchStockRecord {
  product_id: string;
  branch_id: string;
  quantity: number;
  low_stock_threshold?: number | null;
}

export interface ProductForInventory {
  id: string;
  name: string;
  slug?: string;
}

export interface InventoryMetricsResult {
  lowStock: number;
  outOfStock: number;
  lowStockProductsList?: Array<{
    id: string;
    name: string;
    currentStock: number;
    threshold: number;
    slug: string;
  }>;
}

/**
 * Compute inventory metrics from product_branch_stock records.
 * Replaces deprecated products.inventory_quantity logic.
 *
 * @param productBranchStock - Records from product_branch_stock (already filtered by branch)
 * @param productIdsInCatalog - Set of product IDs in the organization catalog
 * @param options - Optional: include list of low-stock products for dashboard display
 */
export function computeInventoryMetrics(
  productBranchStock: ProductBranchStockRecord[],
  productIdsInCatalog: Set<string>,
  options?: {
    products?: ProductForInventory[];
    maxLowStockList?: number;
  },
): InventoryMetricsResult {
  const lowStockProductIds = new Set<string>();
  const stockByProduct = new Map<
    string,
    { quantity: number; threshold: number }
  >();

  for (const record of productBranchStock) {
    const threshold = record.low_stock_threshold ?? 5;
    const qty = record.quantity ?? 0;

    if (!productIdsInCatalog.has(record.product_id)) continue;

    const key = record.product_id;

    if (qty > 0 && qty <= threshold) {
      lowStockProductIds.add(key);
    }

    const existing = stockByProduct.get(key);
    if (!existing || qty < existing.quantity) {
      stockByProduct.set(key, { quantity: qty, threshold });
    }
  }

  const outOfStockProductIds = new Set<string>();
  for (const productId of productIdsInCatalog) {
    const stock = stockByProduct.get(productId);
    const hasStock = stock && stock.quantity > 0;
    if (!hasStock) {
      outOfStockProductIds.add(productId);
    }
  }

  const result: InventoryMetricsResult = {
    lowStock: lowStockProductIds.size,
    outOfStock: outOfStockProductIds.size,
  };

  if (options?.products && options.maxLowStockList !== undefined) {
    const products = options.products;
    const lowStockList = products
      .filter((p) => lowStockProductIds.has(p.id))
      .map((p) => {
        const stock = stockByProduct.get(p.id);
        const qty = stock?.quantity ?? 0;
        const threshold = stock?.threshold ?? 5;
        return {
          id: p.id,
          name: p.name,
          currentStock: qty,
          threshold,
          slug: p.slug ?? p.id,
        };
      })
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, options.maxLowStockList);
    result.lowStockProductsList = lowStockList;
  }

  return result;
}

/**
 * Parse and validate the period parameter from analytics dashboard request.
 */
export function parseAnalyticsPeriod(searchParams: URLSearchParams): number {
  const { period } = analyticsDashboardParamsSchema.parse({
    period: searchParams.get("period") ?? "30",
  });
  return period;
}
