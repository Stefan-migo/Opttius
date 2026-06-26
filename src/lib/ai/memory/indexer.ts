// @deprecated Migrate to agent_conversations/agent_messages after database-reformation.
/**
 * Memory Indexer
 *
 * Indexes application data (products, orders, customers, chat messages)
 * for semantic search. Generates embeddings and stores them in the database.
 */

import { SemanticMemory } from "./semantic";
import type {
  EmbeddingRecord,
  IndexingOptions,
  IndexingResult,
  MemoryContext,
} from "./types";

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
      const { data: products, error } = await this.context.supabase
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
      console.log(`Indexing ${products.length} products...`);

      // Process in batches
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const records: EmbeddingRecord[] = [];

        for (const product of batch) {
          // Skip if already indexed (unless force reindex)
          if (!forceReindex) {
            const hasEmb = await this.semanticMemory.hasEmbedding(
              "product",
              product.id,
            );
            if (hasEmb) {
              result.indexed++; // Count as indexed
              continue;
            }
          }

          // Build content string for embedding
          const content = this.buildProductContent(product);

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
              await this.semanticMemory.storeEmbeddingBatch(records);
            result.indexed += indexed;
          } catch (err: unknown) {
            result.failed += records.length;
            result.errors.push(
              `Batch ${i / batchSize + 1} failed: ${err.message}`,
            );
          }
        }
      }

      console.log(`Products indexed: ${result.indexed}/${result.totalRecords}`);
      return result;
    } catch (error: unknown) {
      result.errors.push(`Indexing failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Index all customers
   */
  async indexCustomers(options: IndexingOptions = {}): Promise<IndexingResult> {
    const { batchSize = 50, forceReindex = false } = options;
    const result: IndexingResult = {
      sourceType: "customer",
      totalRecords: 0,
      indexed: 0,
      failed: 0,
      errors: [],
    };

    try {
      const { data: customers, error } = await this.context.supabase
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
      console.log(`Indexing ${customers.length} customers...`);

      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        const records: EmbeddingRecord[] = [];

        for (const customer of batch) {
          if (!forceReindex) {
            const hasEmb = await this.semanticMemory.hasEmbedding(
              "customer",
              customer.id,
            );
            if (hasEmb) {
              result.indexed++;
              continue;
            }
          }

          const content = this.buildCustomerContent(customer);

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
              await this.semanticMemory.storeEmbeddingBatch(records);
            result.indexed += indexed;
          } catch (err: unknown) {
            result.failed += records.length;
            result.errors.push(`Batch failed: ${err.message}`);
          }
        }
      }

      console.log(
        `Customers indexed: ${result.indexed}/${result.totalRecords}`,
      );
      return result;
    } catch (error: unknown) {
      result.errors.push(`Indexing failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Index all orders
   */
  async indexOrders(options: IndexingOptions = {}): Promise<IndexingResult> {
    const { batchSize = 50, forceReindex = false } = options;
    const result: IndexingResult = {
      sourceType: "order",
      totalRecords: 0,
      indexed: 0,
      failed: 0,
      errors: [],
    };

    try {
      const { data: orders, error } = await this.context.supabase.from("orders")
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
      console.log(`Indexing ${orders.length} orders...`);

      for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize);
        const records: EmbeddingRecord[] = [];

        for (const order of batch) {
          if (!forceReindex) {
            const hasEmb = await this.semanticMemory.hasEmbedding(
              "order",
              order.id,
            );
            if (hasEmb) {
              result.indexed++;
              continue;
            }
          }

          const content = this.buildOrderContent(order);

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
              await this.semanticMemory.storeEmbeddingBatch(records);
            result.indexed += indexed;
          } catch (err: unknown) {
            result.failed += records.length;
            result.errors.push(`Batch failed: ${err.message}`);
          }
        }
      }

      console.log(`Orders indexed: ${result.indexed}/${result.totalRecords}`);
      return result;
    } catch (error: unknown) {
      result.errors.push(`Indexing failed: ${error.message}`);
      return result;
    }
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

      const records: EmbeddingRecord[] = messages.map((msg: unknown) => ({
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
    const { forceReindex = false } = options;
    const result: IndexingResult = {
      sourceType: "category",
      totalRecords: 0,
      indexed: 0,
      failed: 0,
      errors: [],
    };

    try {
      const { data: categories, error } = await this.context.supabase
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
          const hasEmb = await this.semanticMemory.hasEmbedding(
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
            await this.semanticMemory.storeEmbeddingBatch(records);
          result.indexed += indexed;
        } catch (err: unknown) {
          result.failed = records.length;
          result.errors.push(`Indexing failed: ${err.message}`);
        }
      }

      console.log(
        `Categories indexed: ${result.indexed}/${result.totalRecords}`,
      );
      return result;
    } catch (error: unknown) {
      result.errors.push(`Indexing failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Index all data types
   */
  async indexAll(
    options: IndexingOptions = {},
  ): Promise<Record<string, IndexingResult>> {
    console.log("Starting full index...");

    const results: Record<string, IndexingResult> = {};

    results.products = await this.indexProducts(options);
    results.categories = await this.indexCategories(options);
    results.customers = await this.indexCustomers(options);
    results.orders = await this.indexOrders(options);

    console.log("Full index complete:", {
      products: `${results.products.indexed}/${results.products.totalRecords}`,
      categories: `${results.categories.indexed}/${results.categories.totalRecords}`,
      customers: `${results.customers.indexed}/${results.customers.totalRecords}`,
      orders: `${results.orders.indexed}/${results.orders.totalRecords}`,
    });

    return results;
  }

  // Helper methods to build content strings

  private buildProductContent(product: unknown): string {
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

  private buildCustomerContent(customer: unknown): string {
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

  private buildOrderContent(order: unknown): string {
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
}
