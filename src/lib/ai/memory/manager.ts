/**
 * Memory Manager
 *
 * Orchestrates all memory types (session, long-term, semantic) to provide
 * relevant context to the agent. This is the main entry point for memory operations.
 */

import { LongTermMemory } from "./long-term";
import { SemanticMemory } from "./semantic";
import { SessionMemory } from "./session";
import type {
  MemoryContext,
  MemoryFact,
  MemoryFactSearchResult,
  MemoryManagerConfig,
  RelevantContext,
  SemanticSearchResult,
} from "./types";

export class MemoryManager {
  private context: MemoryContext;
  private config: MemoryManagerConfig;

  private sessionMemory: SessionMemory;
  private longTermMemory: LongTermMemory;
  private semanticMemory: SemanticMemory;

  constructor(context: MemoryContext, config: MemoryManagerConfig = {}) {
    this.context = context;
    this.config = {
      enableSemanticSearch: config.enableSemanticSearch ?? true,
      enableLongTermMemory: config.enableLongTermMemory ?? true,
      maxContextLength: config.maxContextLength ?? 4000,
      semanticSearchCount: config.semanticSearchCount ?? 5,
    };

    this.sessionMemory = new SessionMemory(context);
    this.longTermMemory = new LongTermMemory(context);
    this.semanticMemory = new SemanticMemory(context);
  }

  /**
   * Get the session memory instance
   */
  getSessionMemory(): SessionMemory {
    return this.sessionMemory;
  }

  /**
   * Get the long-term memory instance
   */
  getLongTermMemory(): LongTermMemory {
    return this.longTermMemory;
  }

  /**
   * Get the semantic memory instance
   */
  getSemanticMemory(): SemanticMemory {
    return this.semanticMemory;
  }

  /**
   * Load session history
   */
  async loadSession(): Promise<void> {
    if (this.context.sessionId) {
      await this.sessionMemory.load();
    }
  }

  /**
   * Get relevant context for a query
   * Combines semantic search results and memory facts
   */
  async getRelevantContext(query: string): Promise<RelevantContext> {
    const semanticResults: SemanticSearchResult[] = [];
    const memoryFacts: MemoryFactSearchResult[] = [];

    // Perform semantic search if enabled
    if (this.config.enableSemanticSearch) {
      try {
        const results = await this.semanticMemory.search(query, {
          matchCount: this.config.semanticSearchCount,
          matchThreshold: 0.65,
        });
        semanticResults.push(...results);
      } catch (error) {
        console.error("Semantic search failed:", error);
      }
    }

    // Search long-term memory if enabled
    if (this.config.enableLongTermMemory) {
      try {
        const facts = await this.longTermMemory.searchFacts(query, {
          maxFacts: 5,
          minImportance: 3,
        });
        memoryFacts.push(...facts);
      } catch (error) {
        console.error("Memory facts search failed:", error);
      }
    }

    // Format context for injection into prompt
    const formattedContext = this.formatContext(semanticResults, memoryFacts);

    return {
      semanticResults,
      memoryFacts,
      formattedContext,
    };
  }

  /**
   * Format context for injection into the system prompt
   */
  private formatContext(
    semanticResults: SemanticSearchResult[],
    memoryFacts: MemoryFactSearchResult[],
  ): string {
    const parts: string[] = [];

    // Add semantic search results
    if (semanticResults.length > 0) {
      parts.push("INFORMACIÓN RELEVANTE DEL SISTEMA:");

      // Group by source type
      const byType = this.groupBySourceType(semanticResults);

      for (const [type, results] of Object.entries(byType)) {
        const typeLabel = this.getSourceTypeLabel(type);
        parts.push(`\n${typeLabel}:`);

        for (const result of results.slice(0, 3)) {
          // Max 3 per type
          parts.push(
            `- ${result.content.substring(0, 200)}${result.content.length > 200 ? "..." : ""}`,
          );
        }
      }
    }

    // Add memory facts
    if (memoryFacts.length > 0) {
      parts.push("\nCONOCIMIENTO PREVIO:");

      for (const fact of memoryFacts) {
        const importance = fact.importance >= 8 ? "⭐" : "";
        parts.push(`- ${importance}${fact.content}`);
      }
    }

    const fullContext = parts.join("\n");

    // Truncate if too long
    if (fullContext.length > this.config.maxContextLength!) {
      return (
        fullContext.substring(0, this.config.maxContextLength! - 3) + "..."
      );
    }

    return fullContext;
  }

  /**
   * Group semantic results by source type
   */
  private groupBySourceType(
    results: SemanticSearchResult[],
  ): Record<string, SemanticSearchResult[]> {
    const grouped: Record<string, SemanticSearchResult[]> = {};

    for (const result of results) {
      if (!grouped[result.sourceType]) {
        grouped[result.sourceType] = [];
      }
      grouped[result.sourceType].push(result);
    }

    return grouped;
  }

  /**
   * Get human-readable label for source type
   */
  private getSourceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      product: "Productos",
      order: "Pedidos",
      customer: "Clientes",
      category: "Categorías",
      chat_message: "Conversaciones anteriores",
    };
    return labels[type] || type;
  }

  /**
   * Store a new fact in long-term memory
   */
  async rememberFact(
    content: string,
    factType: MemoryFact["factType"] = "context",
    importance: number = 5,
  ): Promise<string | null> {
    return await this.longTermMemory.storeFact({
      userId: this.context.userId,
      factType,
      content,
      importance,
      sourceSessionId: this.context.sessionId,
    });
  }

  /**
   * Index the current session for future semantic search
   */
  async indexCurrentSession(): Promise<void> {
    if (!this.context.sessionId) return;

    try {
      const { MemoryIndexer } = await import("./indexer");
      const indexer = new MemoryIndexer(this.context);
      await indexer.indexChatSession(this.context.sessionId);
    } catch (error) {
      console.error("Failed to index session:", error);
    }
  }

  /**
   * Get a summary of what the agent knows about the user
   */
  async getUserKnowledge(): Promise<{
    factsCount: number;
    facts: MemoryFact[];
    preferences: MemoryFact[];
  }> {
    const allFacts = await this.longTermMemory.getAllFacts({ maxFacts: 50 });
    const preferences = allFacts.filter((f) => f.factType === "preference");

    return {
      factsCount: allFacts.length,
      facts: allFacts,
      preferences,
    };
  }

  /**
   * Clear all memory for the current context
   */
  async clearAll(): Promise<void> {
    this.sessionMemory.clear();

    // Note: Long-term memory and embeddings persist in database
    // and require explicit deletion
  }
}

/**
 * Create a memory manager instance
 */
export function createMemoryManager(
  context: MemoryContext,
  config?: MemoryManagerConfig,
): MemoryManager {
  return new MemoryManager(context, config);
}
