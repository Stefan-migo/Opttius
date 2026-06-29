/**
 * Process Sale Stock & Work Order — stock validation and work order decision.
 *
 * Extracted from processSaleHandler.ts. No behavioral changes.
 */

import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { createApiErrorResponse } from "@/lib/api/response";
import { APIError } from "@/lib/api/errors";

export interface StockAndWorkOrderParams {
  validatedBody: Record<string, unknown>;
  effectiveBranchId: string | null;
  fieldOperationId: string | null;
  productsForStockCheck: Array<Record<string, unknown>>;
}

export interface StockAndWorkOrderResult {
  actuallyRequiresWorkOrder: boolean;
  hasOnlyNonWorkOrderProducts: boolean;
}

export async function handleStockAndWorkOrder(
  params: StockAndWorkOrderParams,
): Promise<StockAndWorkOrderResult | NextResponse> {
  const { validatedBody, effectiveBranchId, fieldOperationId, productsForStockCheck } = params;
  const supabaseServiceRole = createServiceRoleClient();

  const {
    items,
    lens_data,
    contact_lens_family_id,
    contact_lens_cost,
    presbyopia_solution,
    customer_id,
  } = validatedBody as Record<string, unknown>;

  const itemsArr = (items || []) as Array<Record<string, unknown>>;
  const useMobileStock = !!fieldOperationId;

  // Stock validation
  if (effectiveBranchId || (useMobileStock && fieldOperationId)) {
    const { getOperativoMobileAvailableQuantity } = await import(
      "@/lib/inventory/operativo-mobile-stock-helpers"
    );
    const { getAvailableQuantity } = await import(
      "@/lib/inventory/stock-helpers"
    );

    for (const item of itemsArr) {
      const pid = item.product_id as string | undefined;
      if (
        pid &&
        !pid.includes("frame-manual") &&
        !pid.includes("lens-") &&
        !pid.includes("treatments-") &&
        !pid.includes("labor-") &&
        !pid.includes("discount-")
      ) {
        const product = productsForStockCheck.find((p) => p.id === pid);
        if ((product as Record<string, unknown> | undefined)?.product_type === "service") continue;

        const availableQty = useMobileStock
          ? await getOperativoMobileAvailableQuantity(pid, fieldOperationId!, supabaseServiceRole)
          : await getAvailableQuantity(pid, effectiveBranchId!, supabaseServiceRole);

        if (availableQty < (item.quantity as number)) {
          const productName = (product as Record<string, unknown> | undefined)?.name || pid;
          const msg = useMobileStock
            ? `Stock insuficiente en bodega móvil para ${productName}. Disponible: ${availableQty}, solicitado: ${item.quantity}`
            : `Stock insuficiente para ${productName}. Disponible: ${availableQty}, solicitado: ${item.quantity}`;
          return createApiErrorResponse(new APIError(msg, 400, "INSUFFICIENT_STOCK")) as NextResponse;
        }
      }
    }
  }

  // Work order decision
  const hasTemporaryLensItems = itemsArr.some(
    (item) =>
      !item.product_id ||
      (item.product_id as string).includes("lens-") ||
      (item.product_id as string).includes("treatments-") ||
      (item.product_id as string).includes("labor-") ||
      (item.product_id as string).includes("frame-manual-"),
  );

  let hasFrameInItems = false;
  let productTypesInItems: string[] = [];
  let productCategories: Array<Record<string, unknown>> = [];
  const productIds = itemsArr
    .map((item) => item.product_id as string)
    .filter(
      (id) =>
        !!id &&
        !id.includes("lens-") &&
        !id.includes("treatments-") &&
        !id.includes("labor-") &&
        !id.includes("frame-manual-") &&
        !id.includes("discount-"),
    );
  if (productIds.length > 0) {
    const { data: products } = await supabaseServiceRole
      .from("products")
      .select("id, product_type, category_id, categories:category_id(name)")
      .in("id", productIds);
    const typedProducts = (products || []) as Array<Record<string, unknown>>;
    hasFrameInItems = typedProducts.some((p) => p.product_type === "frame");
    productTypesInItems = typedProducts.map((p) => (p.product_type as string) || "");
    productCategories = typedProducts.map((p) => {
      const cat = Array.isArray(p.categories)
        ? (p.categories as Array<Record<string, unknown>>)[0]
        : (p.categories as Record<string, unknown>);
      return { id: p.id, category_name: cat?.name ?? null };
    });
  }

  const { haveOnlyNonWorkOrderProducts, hasLensDataForMounting, computeWorkOrderDecision } = await import(
    "./processSaleValidation"
  );

  const hasOnlyNonWorkOrderProductTypes = haveOnlyNonWorkOrderProducts(productTypesInItems);
  const nonWorkOrderCategoryNames = [
    "accesorio", "accesorios", "lente de sol", "lentes de sol", "servicio", "servicios",
  ];
  const hasOnlyNonWorkOrderProductCategories =
    productCategories.length > 0 &&
    productCategories.every((cat) => {
      if (!cat.category_name) return false;
      return nonWorkOrderCategoryNames.some((n) =>
        (cat.category_name as string).toLowerCase().includes(n),
      );
    });
  const hasOnlyNonWorkOrderProds =
    hasOnlyNonWorkOrderProductTypes || hasOnlyNonWorkOrderProductCategories;
  const lensDataForMounting = hasLensDataForMounting(
    lens_data as Record<string, unknown> | null | undefined,
    contact_lens_family_id as string | null,
    contact_lens_cost as number | null,
    presbyopia_solution as string | null,
  );
  const actuallyRequiresWorkOrder = computeWorkOrderDecision({
    hasTemporaryLensItems,
    hasFrameInItems,
    hasLensDataForMounting: lensDataForMounting,
    customerId: customer_id as string | null,
    hasOnlyNonWorkOrderProducts: hasOnlyNonWorkOrderProds,
  });

  if (actuallyRequiresWorkOrder && !customer_id) {
    return NextResponse.json(
      { error: "Se requiere un cliente registrado para crear trabajos de laboratorio" },
      { status: 400 },
    ) as NextResponse;
  }

  return { actuallyRequiresWorkOrder, hasOnlyNonWorkOrderProducts: hasOnlyNonWorkOrderProds };
}
