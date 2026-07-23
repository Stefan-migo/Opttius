/**
 * Customers Indexer
 *
 * Indexes customer data for semantic search.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger } from "@/lib/logger";

import type { SemanticMemory } from "../semantic";
import type {
  EmbeddingRecord,
  IndexingOptions,
  IndexingResult,
} from "../types";

export function buildCustomerContent(customer: unknown): string {
  const name =
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
  const parts = [
    `Cliente: ${name || "Sin nombre"}`,
    customer.email && `Email: ${customer.email}`,
    customer.phone && `Teléfono: ${customer.phone}`,
    customer.membership_tier && `Membresía: ${customer.membership_tier}`,
    customer.total_orders && `Pedidos totales: ${customer.total_orders}`,
    customer.total_spent && `Total gastado: $${customer.total_spent}`,
  ].filter(Boolean);

  return parts.join(". ");
}

export async function indexCustomers(
  semanticMemory: SemanticMemory,
  supabase: SupabaseClient,
  options: IndexingOptions = {},
): Promise<IndexingResult> {
  const { batchSize = 50, forceReindex = false } = options;
  const result: IndexingResult = {
    sourceType: "customer",
    totalRecords: 0,
    indexed: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { data: customers, error } = await supabase
      .from("customers")
      .select(
        "id, email, first_name, last_name, phone, membership_tier, total_orders, total_spent",
      );

    if (error) {
      result.errors.push(`Failed to fetch customers: ${error.message}`);
      return result;
    }

    if (!customers || customers.length === 0) {
      return result;
    }

    result.totalRecords = customers.length;
    appLogger.info(`Indexing ${customers.length} customers...`);

    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      const records: EmbeddingRecord[] = [];

      for (const customer of batch) {
        if (!forceReindex) {
          const hasEmb = await semanticMemory.hasEmbedding(
            "customer",
            customer.id,
          );
          if (hasEmb) {
            result.indexed++;
            continue;
          }
        }

        const content = buildCustomerContent(customer);

        records.push({
          sourceType: "customer",
          sourceId: customer.id,
          content,
          embeddingProvider: "google" as const,
          metadata: {
            email: customer.email,
            name: `${customer.first_name} ${customer.last_name}`.trim(),
            membershipTier: customer.membership_tier,
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

    appLogger.info(
      `Customers indexed: ${result.indexed}/${result.totalRecords}`,
    );
    return result;
  } catch (error: unknown) {
    result.errors.push(`Indexing failed: ${error.message}`);
    return result;
  }
}
