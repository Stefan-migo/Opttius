/**
 * Orders Indexer
 *
 * Indexes order data for semantic search.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger } from "@/lib/logger";

import type { SemanticMemory } from "../semantic";
import type {
  EmbeddingRecord,
  IndexingOptions,
  IndexingResult,
} from "../types";

export function buildOrderContent(order: unknown): string {
  const customerName = order.customers
    ? `${order.customers.first_name || ""} ${order.customers.last_name || ""}`.trim()
    : "Cliente desconocido";

  const parts = [
    `Pedido #${order.order_number}`,
    `Cliente: ${customerName}`,
    `Estado: ${order.status}`,
    `Pago: ${order.payment_status}`,
    `Total: $${order.total}`,
    order.shipping_address?.city && `Ciudad: ${order.shipping_address.city}`,
    `Fecha: ${new Date(order.created_at).toLocaleDateString("es")}`,
  ].filter(Boolean);

  return parts.join(". ");
}

export async function indexOrders(
  semanticMemory: SemanticMemory,
  supabase: SupabaseClient,
  options: IndexingOptions = {},
): Promise<IndexingResult> {
  const { batchSize = 50, forceReindex = false } = options;
  const result: IndexingResult = {
    sourceType: "order",
    totalRecords: 0,
    indexed: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { data: orders, error } = await supabase.from("orders")
      .select(`
        id, order_number, status, payment_status, total, 
        shipping_address, created_at,
        customers:customer_id (first_name, last_name, email)
      `);

    if (error) {
      result.errors.push(`Failed to fetch orders: ${error.message}`);
      return result;
    }

    if (!orders || orders.length === 0) {
      return result;
    }

    result.totalRecords = orders.length;
    appLogger.info(`Indexing ${orders.length} orders...`);

    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      const records: EmbeddingRecord[] = [];

      for (const order of batch) {
        if (!forceReindex) {
          const hasEmb = await semanticMemory.hasEmbedding(
            "order",
            order.id,
          );
          if (hasEmb) {
            result.indexed++;
            continue;
          }
        }

        const content = buildOrderContent(order);

        records.push({
          sourceType: "order",
          sourceId: order.id,
          content,
          embeddingProvider: "google" as const,
          metadata: {
            orderNumber: order.order_number,
            status: order.status,
            paymentStatus: order.payment_status,
            total: order.total,
          },
        });
      }

      if (records.length > 0) {
        try {
          const indexed =
            await semanticMemory.storeEmbeddingBatch(records);
          result.indexed += indexed;
        } catch (err: unknown) {
          result.failed += records.length;
          result.errors.push(`Batch failed: ${err.message}`);
        }
      }
    }

    appLogger.info(`Orders indexed: ${result.indexed}/${result.totalRecords}`);
    return result;
  } catch (error: unknown) {
    result.errors.push(`Indexing failed: ${error.message}`);
    return result;
  }
}
