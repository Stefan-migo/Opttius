/**
 * Products Indexer
 *
 * Indexes product data for semantic search.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger } from "@/lib/logger";

import type { SemanticMemory } from "../semantic";
import type {
  EmbeddingRecord,
  IndexingOptions,
  IndexingResult,
} from "../types";

export function buildProductContent(product: unknown): string {
  const parts = [
    `Producto: ${product.name}`,
    product.description && `Descripción: ${product.description}`,
    product.short_description && `Resumen: ${product.short_description}`,
    `Precio: $${product.price}`,
    product.status && `Estado: ${product.status}`,
    product.benefits?.length && `Beneficios: ${product.benefits.join(", ")}`,
    product.tags?.length && `Tags: ${product.tags.join(", ")}`,
  ].filter(Boolean);

  return parts.join(". ");
}

export async function indexProducts(
  semanticMemory: SemanticMemory,
  supabase: SupabaseClient,
  options: IndexingOptions = {},
): Promise<IndexingResult> {
  const { batchSize = 50, forceReindex = false } = options;
  const result: IndexingResult = {
    sourceType: "product",
    totalRecords: 0,
    indexed: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get products to index
    const { data: products, error } = await supabase
      .from("products")
      .select(
        "id, name, description, short_description, price, status, category_id, benefits, tags",
      );

    if (error) {
      result.errors.push(`Failed to fetch products: ${error.message}`);
      return result;
    }

    if (!products || products.length === 0) {
      return result;
    }

    result.totalRecords = products.length;
    appLogger.info(`Indexing ${products.length} products...`);

    // Process in batches
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const records: EmbeddingRecord[] = [];

      for (const product of batch) {
        // Skip if already indexed (unless force reindex)
        if (!forceReindex) {
          const hasEmb = await semanticMemory.hasEmbedding(
            "product",
            product.id,
          );
          if (hasEmb) {
            result.indexed++; // Count as indexed
            continue;
          }
        }

        // Build content string for embedding
        const content = buildProductContent(product);

        records.push({
          sourceType: "product",
          sourceId: product.id,
          content,
          embeddingProvider: "google" as const,
          metadata: {
            name: product.name,
            price: product.price,
            status: product.status,
            categoryId: product.category_id,
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
          result.errors.push(
            `Batch ${i / batchSize + 1} failed: ${err.message}`,
          );
        }
      }
    }

    appLogger.info(`Products indexed: ${result.indexed}/${result.totalRecords}`);
    return result;
  } catch (error: unknown) {
    result.errors.push(`Indexing failed: ${error.message}`);
    return result;
  }
}
