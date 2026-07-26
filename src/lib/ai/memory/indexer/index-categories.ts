/**
 * Categories Indexer
 *
 * Indexes category data for semantic search.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { appLogger } from '@/lib/logger';

import type { SemanticMemory } from "../semantic";
import type {
  EmbeddingRecord,
  IndexingOptions,
  IndexingResult,
} from "../types";

export async function indexCategories(
  semanticMemory: SemanticMemory,
  supabase: SupabaseClient,
  options: IndexingOptions = {},
): Promise<IndexingResult> {
  const { forceReindex = false } = options;
  const result: IndexingResult = {
    sourceType: "category",
    totalRecords: 0,
    indexed: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, name, description, slug");

    if (error) {
      result.errors.push(`Failed to fetch categories: ${error.message}`);
      return result;
    }

    if (!categories || categories.length === 0) {
      return result;
    }

    result.totalRecords = categories.length;

    const records: EmbeddingRecord[] = [];

    for (const category of categories) {
      if (!forceReindex) {
        const hasEmb = await semanticMemory.hasEmbedding(
          "category",
          category.id,
        );
        if (hasEmb) {
          result.indexed++;
          continue;
        }
      }

      const content = `Categoría: ${category.name}. ${category.description || ""}`;

      records.push({
        sourceType: "category",
        sourceId: category.id,
        content,
        embeddingProvider: "google" as const,
        metadata: {
          name: category.name,
          slug: category.slug,
        },
      });
    }

    if (records.length > 0) {
      try {
        const indexed =
          await semanticMemory.storeEmbeddingBatch(records);
        result.indexed += indexed;
      } catch (err: unknown) {
        result.failed = records.length;
        result.errors.push(`Indexing failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    appLogger.info(
      `Categories indexed: ${result.indexed}/${result.totalRecords}`,
    );
    return result;
    } catch (error: unknown) {
      result.errors.push(`Indexing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      return result;
    }
}
