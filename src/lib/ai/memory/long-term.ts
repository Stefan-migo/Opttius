/**
 * Long-term Memory Service
 *
 * Manages persistent facts and preferences learned from conversations.
 * These facts persist across sessions and help personalize the agent's responses.
 */

import { getEmbeddingFactory } from "../embeddings";
import type {
  LongTermMemoryConfig,
  MemoryContext,
  MemoryFact,
  MemoryFactSearchResult,
} from "./types";

export class LongTermMemory {
  private context: MemoryContext;

  constructor(context: MemoryContext) {
    this.context = context;
  }

  /**
   * Store a new fact in long-term memory
   */
  async storeFact(fact: Omit<MemoryFact, "id">): Promise<string | null> {
    try {
      const factory = getEmbeddingFactory();
      const embeddingResult = await factory.embed(fact.content);

      const insertData: unknown = {
        user_id: fact.userId,
        fact_type: fact.factType,
        category: fact.category || null,
        content: fact.content,
        importance: fact.importance,
        embedding_provider: embeddingResult.provider,
        source_session_id: fact.sourceSessionId || null,
        source_message_id: fact.sourceMessageId || null,
        expires_at: fact.expiresAt || null,
      };

      // Store in appropriate column based on provider
      if (embeddingResult.provider === "transformers") {
        insertData.embedding_small = embeddingResult.vector;
      } else {
        insertData.embedding = embeddingResult.vector;
      }

      const { data, error } = await this.context.supabase
        .from("memory_facts")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        console.error("Failed to store memory fact:", error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error("Store fact failed:", error);
      return null;
    }
  }

  /**
   * Search for relevant facts using semantic similarity
   */
  async searchFacts(
    query: string,
    config: LongTermMemoryConfig = {},
  ): Promise<MemoryFactSearchResult[]> {
    const { maxFacts = 10, minImportance = 1 } = config;

    try {
      const factory = getEmbeddingFactory();
      const embeddingResult = await factory.embed(query);

      const { data, error } = await this.context.supabase.rpc(
        "search_memory_facts",
        {
          query_embedding: embeddingResult.vector,
          target_user_id: this.context.userId,
          match_threshold: 0.6,
          match_count: maxFacts,
          min_importance: minImportance,
        },
      );

      if (error) {
        console.error("Search memory facts error:", error);
        return [];
      }

      return (data || []).map((row: unknown) => ({
        id: row.id,
        userId: this.context.userId,
        factType: row.fact_type,
        category: row.category,
        content: row.content,
        importance: row.importance,
        similarity: row.similarity,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error("Search facts failed:", error);
      return [];
    }
  }

  /**
   * Get all facts for the current user
   */
  async getAllFacts(config: LongTermMemoryConfig = {}): Promise<MemoryFact[]> {
    const {
      maxFacts = 100,
      minImportance = 1,
      includeExpired = false,
    } = config;

    try {
      let query = this.context.supabase
        .from("memory_facts")
        .select("*")
        .eq("user_id", this.context.userId)
        .gte("importance", minImportance)
        .order("importance", { ascending: false })
        .limit(maxFacts);

      if (!includeExpired) {
        query = query.or("expires_at.is.null,expires_at.gt.now()");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Get all facts error:", error);
        return [];
      }

      return (data || []).map((row: unknown) => ({
        id: row.id,
        userId: row.user_id,
        factType: row.fact_type,
        category: row.category,
        content: row.content,
        importance: row.importance,
        sourceSessionId: row.source_session_id,
        sourceMessageId: row.source_message_id,
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      }));
    } catch (error) {
      console.error("Get all facts failed:", error);
      return [];
    }
  }

  /**
   * Get facts by type
   */
  async getFactsByType(
    factType: MemoryFact["factType"],
    limit: number = 20,
  ): Promise<MemoryFact[]> {
    try {
      const { data, error } = await this.context.supabase
        .from("memory_facts")
        .select("*")
        .eq("user_id", this.context.userId)
        .eq("fact_type", factType)
        .or("expires_at.is.null,expires_at.gt.now()")
        .order("importance", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Get facts by type error:", error);
        return [];
      }

      return (data || []).map((row: unknown) => ({
        id: row.id,
        userId: row.user_id,
        factType: row.fact_type,
        category: row.category,
        content: row.content,
        importance: row.importance,
        sourceSessionId: row.source_session_id,
        sourceMessageId: row.source_message_id,
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      }));
    } catch (error) {
      console.error("Get facts by type failed:", error);
      return [];
    }
  }

  /**
   * Update a fact's importance
   */
  async updateImportance(factId: string, importance: number): Promise<boolean> {
    try {
      const { error } = await this.context.supabase
        .from("memory_facts")
        .update({ importance: Math.min(10, Math.max(1, importance)) })
        .eq("id", factId)
        .eq("user_id", this.context.userId);

      if (error) {
        console.error("Update importance error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Update importance failed:", error);
      return false;
    }
  }

  /**
   * Mark a fact as accessed (updates last_accessed_at)
   */
  async markAccessed(factId: string): Promise<void> {
    try {
      await this.context.supabase
        .from("memory_facts")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", factId);
    } catch (error) {
      // Silent fail - not critical
    }
  }

  /**
   * Delete a fact
   */
  async deleteFact(factId: string): Promise<boolean> {
    try {
      const { error } = await this.context.supabase
        .from("memory_facts")
        .delete()
        .eq("id", factId)
        .eq("user_id", this.context.userId);

      if (error) {
        console.error("Delete fact error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Delete fact failed:", error);
      return false;
    }
  }

  /**
   * Delete all expired facts for the user
   */
  async cleanupExpiredFacts(): Promise<number> {
    try {
      const { data, error } = await this.context.supabase
        .from("memory_facts")
        .delete()
        .eq("user_id", this.context.userId)
        .lt("expires_at", new Date().toISOString())
        .select("id");

      if (error) {
        console.error("Cleanup expired facts error:", error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error("Cleanup expired facts failed:", error);
      return 0;
    }
  }
}
