/**
 * Refund validation logic — order item validation and refund amount calculation.
 *
 * Extracted from route.ts to reduce file size.
 */
export interface OrderItemEntry {
  id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
}

export function validateRefundItems(
  items: { order_item_id: string; quantity: number }[],
  orderItems: OrderItemEntry[],
): string | null {
  const itemMap = new Map(orderItems.map((oi) => [oi.id, oi]));

  for (const refItem of items) {
    const oi = itemMap.get(refItem.order_item_id);
    if (!oi) {
      return `Ítem ${refItem.order_item_id} no pertenece a esta orden`;
    }
    if (refItem.quantity > oi.quantity) {
      return `Cantidad a devolver (${refItem.quantity}) excede la cantidad vendida (${oi.quantity}) para ${oi.product_name}`;
    }
  }

  return null;
}

export function calculateRefundAmount(
  items: { order_item_id: string; quantity: number }[],
  orderItems: OrderItemEntry[],
  totalPaid: number,
  orderTotal: number,
): number {
  const itemMap = new Map(orderItems.map((oi) => [oi.id, oi]));
  let refundAmountFromItems = 0;
  for (const refItem of items) {
    const oi = itemMap.get(refItem.order_item_id);
    if (oi) {
      const unitRefund = Number(oi.total_price) / oi.quantity;
      refundAmountFromItems += unitRefund * refItem.quantity;
    }
  }

  return totalPaid < orderTotal
    ? Math.min(
        refundAmountFromItems,
        totalPaid * (refundAmountFromItems / orderTotal),
      )
    : refundAmountFromItems;
}
