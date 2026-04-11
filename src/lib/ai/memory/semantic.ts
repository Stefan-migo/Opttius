/**
 * Semantic Memory Service
 *
 * Provides semantic search capabilities using vector embeddings.
 * Searches across all indexed content (products, orders, customers, chat messages).
 */

import { getEmbeddingFactory } from "../embeddings";
import type {
  EmbeddingRecord,
  MemoryContext,
  SemanticSearchOptions,
  SemanticSearchResult,
} from "./types";

export class SemanticMemory {
  private context: MemoryContext;

  constructor(context: MemoryContext) {
    this.context = context;
  }

  /**
   * Search for semantically similar content
   */
  async search(
    query: string,
    options: SemanticSearchOptions = {},
  ): Promise<SemanticSearchResult[]> {
    const {
      sourceTypes,
      matchThreshold = 0.7,
      matchCount = 10,
      userId,
    } = options;

    try {
      const factory = getEmbeddingFactory();
      const embeddingResult = await factory.embed(query);

      // Determine which search function to use based on provider
      const searchFunction =
        embeddingResult.provider === "transformers"
          ? "search_embeddings_small"
          : "search_embeddings";

      const { data, error } = await this.context.supabase.rpc(searchFunction, {
        query_embedding: embeddingResult.vector,
        match_threshold: matchThreshold,
        match_count: matchCount,
        filter_source_types: sourceTypes || null,
        filter_user_id: userId || null,
      });

      if (error) {
        console.error("Semantic search error:", error);
        throw error;
      }

      return (data || []).map((row: unknown) => ({
        id: row.id,
        sourceType: row.source_type,
        sourceId: row.source_id,
        content: row.content,
        similarity: row.similarity,
        metadata: row.metadata,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error("Semantic search failed:", error);
      return [];
    }
  }

  /**
   * Store an embedding for later retrieval
   */
  async storeEmbedding(record: EmbeddingRecord): Promise<string | null> {
    try {
      const factory = getEmbeddingFactory();
      const embeddingResult = await factory.embed(record.content);

      const insertData: unknown = {
        source_type: record.sourceType,
        source_id: record.sourceId,
        content: record.content,
        embedding_provider: embeddingResult.provider,
        user_id: record.userId || null,
        metadata: record.metadata || null,
      };

      // Store in appropriate column based on provider
      if (embeddingResult.provider === "transformers") {
        insertData.embedding_small = embeddingResult.vector;
      } else {
        insertData.embedding = embeddingResult.vector;
      }

      const { data, error } = await this.context.supabase
        .from("embeddings")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        console.error("Failed to store embedding:", error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error("Store embedding failed:", error);
      return null;
    }
  }

  /**
   * Store multiple embeddings efficiently
   */
  async storeEmbeddingBatch(records: EmbeddingRecord[]): Promise<number> {
    if (records.length === 0) return 0;

    try {
      const factory = getEmbeddingFactory();
      const contents = records.map((r) => r.content);
      const batchResult = await factory.embedBatch(contents);

      const insertData = records.map((record, index) => {
        const emb = batchResult.embeddings[index];
        const data: unknown = {
          source_type: record.sourceType,
          source_id: record.sourceId,
          content: record.content,
          embedding_provider: emb.provider,
          user_id: record.userId || null,
          metadata: record.metadata || null,
        };

        if (emb.provider === "transformers") {
          data.embedding_small = emb.vector;
        } else {
          data.embedding = emb.vector;
        }

        return data;
      });

      const { error } = await this.context.supabase
        .from("embeddings")
        .insert(insertData);

      if (error) {
        console.error("Failed to store embedding batch:", error);
        return 0;
      }

      return records.length;
    } catch (error) {
      console.error("Store embedding batch failed:", error);
      return 0;
    }
  }

  /**
   * Update or create embedding for a source
   */
  async upsertEmbedding(record: EmbeddingRecord): Promise<boolean> {
    try {
      // First, delete existing embedding for this source
      await this.context.supabase
        .from("embeddings")
        .delete()
        .eq("source_type", record.sourceType)
        .eq("source_id", record.sourceId);

      // Then insert new one
      const id = await this.storeEmbedding(record);
      return id !== null;
    } catch (error) {
      console.error("Upsert embedding failed:", error);
      return false;
    }
  }

  /**
   * Delete embeddings for a source
   */
  async deleteEmbedding(
    sourceType: string,
    sourceId: string,
  ): Promise<boolean> {
    try {
      const { error } = await this.context.supabase
        .from("embeddings")
        .delete()
        .eq("source_type", sourceType)
        .eq("source_id", sourceId);

      if (error) {
        console.error("Delete embedding failed:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Delete embedding failed:", error);
      return false;
    }
  }

  /**
   * Check if an embedding exists for a source
   */
  async hasEmbedding(sourceType: string, sourceId: string): Promise<boolean> {
    try {
      const { data, error } = await this.context.supabase
        .from("embeddings")
        .select("id")
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .limit(1);

      if (error) {
        console.error("Check embedding failed:", error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error("Check embedding failed:", error);
      return false;
    }
  }
}
