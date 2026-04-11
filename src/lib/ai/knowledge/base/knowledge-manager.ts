import { join } from "path";

import {
  KnowledgeIndexer,
  SearchQuery,
  SearchResult,
} from "./indexers/knowledge-indexer";
import { DocumentParser } from "./parsers/document-parser";

export interface KnowledgeBaseConfig {
  contentPath: string;
  indexPath: string;
  autoIndex: boolean;
  updateInterval?: number; // in minutes
}

export interface KnowledgeContext {
  userId?: string;
  organizationId?: string;
  userRole?: string;
  currentSection?: string;
  recentActions?: string[];
}

export class KnowledgeBaseManager {
  private indexer: KnowledgeIndexer;
  private parser: DocumentParser;
  private config: KnowledgeBaseConfig;
  private isInitialized: boolean = false;
  private updateTimer: NodeJS.Timeout | null = null;

  constructor(config: KnowledgeBaseConfig) {
    this.config = config;
    this.indexer = new KnowledgeIndexer(config.indexPath);
    this.parser = new DocumentParser();
  }

  /**
   * Initialize the knowledge base
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("Knowledge base already initialized");
      return;
    }

    console.log("Initializing knowledge base...");

    try {
      // Load existing index
      await this.indexer.loadIndex();

      // Index content if auto-indexing is enabled
      if (this.config.autoIndex) {
        await this.indexContent();
      }

      // Set up periodic updates if configured
      if (this.config.updateInterval) {
        this.setupPeriodicUpdates();
      }

      this.isInitialized = true;
      console.log("Knowledge base initialized successfully");
    } catch (error) {
      console.error("Failed to initialize knowledge base:", error);
      throw error;
    }
  }

  /**
   * Index all content in the knowledge base
   */
  async indexContent(): Promise<void> {
    console.log("Indexing knowledge base content...");

    const contentPath = join(process.cwd(), this.config.contentPath);

    // Index each content category
    const categories = [
      "core-system",
      "business-modules",
      "admin-features",
      "integrations",
      "troubleshooting",
    ];

    let totalIndexed = 0;

    for (const category of categories) {
      try {
        const categoryPath = join(contentPath, category);
        const indexed = await this.indexer.indexDirectory(categoryPath);
        totalIndexed += indexed;
        console.log(`Indexed ${indexed} documents from ${category}`);
      } catch (error) {
        console.warn(`Failed to index category ${category}:`, error);
      }
    }

    console.log(`Total documents indexed: ${totalIndexed}`);
  }

  /**
   * Search for relevant knowledge based on query and context
   */
  async searchKnowledge(
    query: string,
    context?: KnowledgeContext,
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const searchQuery: SearchQuery = {
      text: query,
      limit: 5,
      minSimilarity: 0.3,
    };

    // Apply context-based filtering
    if (context) {
      // Filter by user role for access control
      if (context.userRole === "store_manager") {
        searchQuery.category = "business-modules";
      } else if (context.userRole === "admin") {
        // Admins can access everything
      }

      // Boost relevance for current section
      if (context.currentSection) {
        searchQuery.tags = [context.currentSection];
      }
    }

    const results = await this.indexer.search(searchQuery);

    // Apply additional context-based ranking
    if (context) {
      this.applyContextRanking(results, context);
    }

    return results;
  }

  /**
   * Get specific document by ID
   */
  async getDocument(documentId: string): Promise<unknown> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.indexer.getDocument(documentId);
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(category: string): Promise<unknown[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.indexer.getDocumentsByCategory(category);
  }

  /**
   * Get knowledge base statistics
   */
  async getStatistics(): Promise<unknown> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const stats = this.indexer.getIndexStats();
    return {
      ...stats,
      isInitialized: this.isInitialized,
      config: this.config,
    };
  }

  /**
   * Update specific documents
   */
  async updateDocuments(documentIds: string[]): Promise<void> {
    console.log(`Updating ${documentIds.length} documents...`);

    const contentPath = join(process.cwd(), this.config.contentPath);

    for (const docId of documentIds) {
      try {
        // Find and re-parse the document
        const documents = await this.parser.parseDirectory(contentPath, {
          extractMetadata: true,
          extractSections: true,
          extractTags: true,
        });

        const docToUpdate = documents.find((doc) => doc.id === docId);
        if (docToUpdate) {
          await this.indexer.indexDocument(docToUpdate);
          console.log(`✓ Updated document: ${docToUpdate.title}`);
        }
      } catch (error) {
        console.warn(`✗ Failed to update document ${docId}:`, error);
      }
    }

    await this.indexer.saveIndex();
  }

  /**
   * Shutdown the knowledge base manager
   */
  async shutdown(): Promise<void> {
    console.log("Shutting down knowledge base manager...");

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    await this.indexer.saveIndex();
    this.isInitialized = false;

    console.log("Knowledge base manager shut down");
  }

  /**
   * Setup periodic updates
   */
  private setupPeriodicUpdates(): void {
    if (!this.config.updateInterval) return;

    const intervalMs = this.config.updateInterval * 60 * 1000; // Convert to milliseconds

    this.updateTimer = setInterval(async () => {
      try {
        console.log("Running periodic knowledge base update...");
        await this.indexContent();
      } catch (error) {
        console.error("Periodic update failed:", error);
      }
    }, intervalMs);

    console.log(
      `Periodic updates scheduled every ${this.config.updateInterval} minutes`,
    );
  }

  /**
   * Apply context-based ranking to search results
   */
  private applyContextRanking(
    results: SearchResult[],
    context: KnowledgeContext,
  ): void {
    // Boost results based on user role relevance
    if (context.userRole) {
      results.forEach((result) => {
        // Higher boost for role-specific content
        if (this.isRoleRelevant(result.document.category, context.userRole!)) {
          result.similarity *= 1.3; // 30% boost
        }
      });
    }

    // Boost results based on recent actions
    if (context.recentActions && context.recentActions.length > 0) {
      results.forEach((result) => {
        const actionMatches = context.recentActions!.filter((action) =>
          result.document.content.toLowerCase().includes(action.toLowerCase()),
        );

        if (actionMatches.length > 0) {
          result.similarity *= 1 + actionMatches.length * 0.1; // Up to 30% boost
        }
      });
    }

    // Re-sort based on adjusted similarities
    results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Check if a document category is relevant to a user role
   */
  private isRoleRelevant(category: string, role: string): boolean {
    const roleCategories: Record<string, string[]> = {
      store_manager: ["business-modules", "core-system"],
      admin: [
        "admin-features",
        "business-modules",
        "core-system",
        "integrations",
      ],
      super_admin: [
        "admin-features",
        "business-modules",
        "core-system",
        "integrations",
        "troubleshooting",
      ],
    };

    const relevantCategories = roleCategories[role] || [];
    return relevantCategories.includes(category);
  }
}

// Singleton instance for easy access
let knowledgeBaseInstance: KnowledgeBaseManager | null = null;

export function getKnowledgeBase(): KnowledgeBaseManager {
  if (!knowledgeBaseInstance) {
    knowledgeBaseInstance = new KnowledgeBaseManager({
      contentPath: "src/lib/ai/knowledge/content",
      indexPath: "src/lib/ai/knowledge/embeddings/generated",
      autoIndex: true,
      updateInterval: 30, // Update every 30 minutes
    });
  }

  return knowledgeBaseInstance;
}

export async function initializeKnowledgeBase(): Promise<KnowledgeBaseManager> {
  const kb = getKnowledgeBase();
  await kb.initialize();
  return kb;
}
