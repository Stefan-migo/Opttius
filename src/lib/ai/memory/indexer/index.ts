/**
 * Memory Indexer
 *
 * Indexes application data (products, orders, customers, chat messages)
 * for semantic search. Generates embeddings and stores them in the database.
 */

import { appLogger } from "@/lib/logger";

import { SemanticMemory } from "../semantic";
import type {
  IndexingOptions,
  IndexingResult,
  MemoryContext,
} from "../types";
import { indexCategories } from "./index-categories";
import { indexCustomers } from "./index-customers";
import { indexOrders } from "./index-orders";
import { indexProducts } from "./index-products";

export { indexCategories } from "./index-categories";
export { buildCustomerContent,indexCustomers } from "./index-customers";
export { buildOrderContent,indexOrders } from "./index-orders";
export { buildProductContent,indexProducts } from "./index-products";

export class MemoryIndexer {
  private context: MemoryContext;
  private semanticMemory: SemanticMemory;

  constructor(context: MemoryContext) {
    this.context = context;
    this.semanticMemory = new SemanticMemory(context);
  }

  /**
   * Index all products
   */
  async indexProducts(options: IndexingOptions = {}): Promise<IndexingResult> {
    return indexProducts(this.semanticMemory, this.context.supabase, options);
  }

  /**
   * Index all customers
   */
  async indexCustomers(options: IndexingOptions = {}): Promise<IndexingResult> {
    return indexCustomers(this.semanticMemory, this.context.supabase, options);
  }

  /**
   * Index all orders
   */
  async indexOrders(options: IndexingOptions = {}): Promise<IndexingResult> {
    return indexOrders(this.semanticMemory, this.context.supabase, options);
  }

  /**
   * Index chat messages from a specific session
   */
  async indexChatSession(sessionId: string): Promise<IndexingResult> {
    const result: IndexingResult = {
      sourceType: "chat_message",
      totalRecords: 0,
      indexed: 0,
      failed: 0,
      errors: [],
    };

    try {
      const { data: messages, error } = await this.context.supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("session_id", sessionId)
        .in("role", ["user", "assistant"]); // Only index user/assistant messages

      if (error) {
        result.errors.push(`Failed to fetch messages: ${error.message}`);
        return result;
      }

      if (!messages || messages.length === 0) {
        return result;
      }

      result.totalRecords = messages.length;

      const records: import("../types").EmbeddingRecord[] = messages.map((msg: unknown) => ({
        sourceType: "chat_message",
        sourceId: msg.id,
        content: msg.content || "",
        embeddingProvider: "google" as const,
        userId: this.context.userId,
        metadata: {
          role: msg.role,
          sessionId,
        },
      }));

      try {
        const indexed = await this.semanticMemory.storeEmbeddingBatch(records);
        result.indexed = indexed;
      } catch (err: unknown) {
        result.failed = records.length;
        result.errors.push(`Indexing failed: ${err.message}`);
      }

      return result;
    } catch (error: unknown) {
      result.errors.push(`Indexing failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Index categories
   */
  async indexCategories(
    options: IndexingOptions = {},
  ): Promise<IndexingResult> {
    return indexCategories(this.semanticMemory, this.context.supabase, options);
  }

  /**
   * Index all data types
   */
  async indexAll(
    options: IndexingOptions = {},
  ): Promise<Record<string, IndexingResult>> {
    appLogger.info("Starting full index...");

    const results: Record<string, IndexingResult> = {};

    results.products = await this.indexProducts(options);
    results.categories = await this.indexCategories(options);
    results.customers = await this.indexCustomers(options);
    results.orders = await this.indexOrders(options);

    appLogger.info("Full index complete:", {
      products: `${results.products.indexed}/${results.products.totalRecords}`,
      categories: `${results.categories.indexed}/${results.categories.totalRecords}`,
      customers: `${results.customers.indexed}/${results.customers.totalRecords}`,
      orders: `${results.orders.indexed}/${results.orders.totalRecords}`,
    });

    return results;
  }
}
