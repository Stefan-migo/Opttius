/**
 * Stock reversal logic for POS refund.
 *
 * Extracted from route.ts to reduce file size.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger as logger } from "@/lib/logger";

export async function reverseRefundStock(
  supabase: SupabaseClient,
  items: { order_item_id: string; quantity: number }[],
  orderItems: {
    id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
  }[],
  branchId: string,
  orderId: string,
  userId: string,
): Promise<string | null> {
  const itemMap = new Map(orderItems.map((oi) => [oi.id, oi]));

  for (const refItem of items) {
    const oi = itemMap.get(refItem.order_item_id);
    if (!oi?.product_id) continue;

    const { error: stockError } = await supabase.rpc("update_product_stock", {
      p_product_id: oi.product_id,
      p_branch_id: branchId,
      p_quantity_change: refItem.quantity,
      p_reserve: false,
      p_movement_type: "refund",
      p_reference_type: "refund",
      p_reference_id: orderId,
      p_created_by: userId,
    });

    if (stockError) {
      logger.error("Error reversing stock on refund", {
        product_id: oi.product_id,
        quantity: refItem.quantity,
        error: stockError,
      });
      return `Error al revertir stock para ${oi.product_name}: ${stockError.message}`;
    }
  }

  return null;
}
