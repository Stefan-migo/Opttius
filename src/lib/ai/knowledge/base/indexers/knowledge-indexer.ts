import { promises as fs } from "fs";
import { join } from "path";

import { EmbeddingFactory } from "@/lib/ai/embeddings/factory";

import { DocumentParser, ParsedDocument } from "../parsers/document-parser";

export interface IndexedDocument {
  id: string;
  documentId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  embedding: number[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    sectionHeadings: string[];
  };
  lastIndexed: Date;
}

export interface SearchQuery {
  text: string;
  category?: string;
  tags?: string[];
  limit?: number;
  minSimilarity?: number;
}

export interface SearchResult {
  document: IndexedDocument;
  similarity: number;
  matchedSections: string[];
}

export class KnowledgeIndexer {
  private parser: DocumentParser;
  private embeddingFactory: EmbeddingFactory;
  private index: Map<string, IndexedDocument> = new Map();
  private indexPath: string;

  constructor(indexPath: string = "src/lib/ai/knowledge/embeddings/generated") {
    this.parser = new DocumentParser();
    this.embeddingFactory = new EmbeddingFactory();
    this.indexPath = indexPath;
  }

  /**
   * Index all documents in a directory
   */
  async indexDirectory(directoryPath: string): Promise<number> {
    console.log(`Indexing documents from: ${directoryPath}`);

    const documents = await this.parser.parseDirectory(directoryPath, {
      extractMetadata: true,
      extractSections: true,
      extractTags: true,
    });

    let indexedCount = 0;

    for (const doc of documents) {
      try {
        await this.indexDocument(doc);
        indexedCount++;
        console.log(`✓ Indexed: ${doc.title}`);
      } catch (error) {
        console.warn(`✗ Failed to index ${doc.title}:`, error);
      }
    }

    await this.saveIndex();
    console.log(`Successfully indexed ${indexedCount} documents`);

    return indexedCount;
  }

  /**
   * Index a single document
   */
  async indexDocument(parsedDoc: ParsedDocument): Promise<void> {
    try {
      // Generate embedding for the document content
      const embedding = await this.generateEmbedding(parsedDoc.content);

      // Extract section headings for quick reference
      const sectionHeadings = parsedDoc.sections.map(
        (section) => section.heading,
      );

      const indexedDoc: IndexedDocument = {
        id: this.generateIndexedId(parsedDoc.id),
        documentId: parsedDoc.id,
        title: parsedDoc.title,
        content: parsedDoc.content,
        category: parsedDoc.category,
        tags: parsedDoc.tags,
        embedding,
        metadata: {
          createdAt: parsedDoc.metadata.createdAt,
          updatedAt: parsedDoc.metadata.updatedAt,
          version: parsedDoc.metadata.version,
          sectionHeadings,
        },
        lastIndexed: new Date(),
      };

      this.index.set(indexedDoc.id, indexedDoc);
    } catch (error) {
      throw new Error(`Failed to index document ${parsedDoc.title}: ${error}`);
    }
  }

  /**
   * Search indexed documents using semantic similarity
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    // Load index if not already loaded
    if (this.index.size === 0) {
      await this.loadIndex();
    }

    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query.text);

    const results: SearchResult[] = [];

    // Calculate similarity for each document
    for (const [id, doc] of this.index.entries()) {
      // Apply filters
      if (query.category && doc.category !== query.category) continue;
      if (query.tags && !this.matchesTags(doc.tags, query.tags)) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);

      // Apply minimum similarity threshold
      const minSimilarity = query.minSimilarity || 0.3;
      if (similarity >= minSimilarity) {
        results.push({
          document: doc,
          similarity,
          matchedSections: this.findMatchingSections(query.text, doc),
        });
      }
    }

    // Sort by similarity and apply limit
    results.sort((a, b) => b.similarity - a.similarity);

    const limit = query.limit || 5;
    return results.slice(0, limit);
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): IndexedDocument | undefined {
    for (const doc of this.index.values()) {
      if (doc.documentId === documentId) {
        return doc;
      }
    }
    return undefined;
  }

  /**
   * Get documents by category
   */
  getDocumentsByCategory(category: string): IndexedDocument[] {
    return Array.from(this.index.values()).filter(
      (doc) => doc.category === category,
    );
  }

  /**
   * Get documents by tags
   */
  getDocumentsByTags(tags: string[]): IndexedDocument[] {
    return Array.from(this.index.values()).filter((doc) =>
      this.matchesTags(doc.tags, tags),
    );
  }

  /**
   * Save index to disk
   */
  async saveIndex(): Promise<void> {
    try {
      const indexData = {
        documents: Array.from(this.index.values()),
        metadata: {
          lastUpdated: new Date().toISOString(),
          documentCount: this.index.size,
        },
      };

      const indexPath = join(
        process.cwd(),
        this.indexPath,
        "knowledge-index.json",
      );
      await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
      console.log(`Index saved to: ${indexPath}`);
    } catch (error) {
      console.error("Failed to save index:", error);
    }
  }

  /**
   * Load index from disk
   */
  async loadIndex(): Promise<void> {
    try {
      const indexPath = join(
        process.cwd(),
        this.indexPath,
        "knowledge-index.json",
      );
      const data = await fs.readFile(indexPath, "utf-8");
      const indexData = JSON.parse(data);

      this.index.clear();
      for (const doc of indexData.documents) {
        // Convert date strings back to Date objects
        doc.metadata.createdAt = new Date(doc.metadata.createdAt);
        doc.metadata.updatedAt = new Date(doc.metadata.updatedAt);
        doc.lastIndexed = new Date(doc.lastIndexed);
        this.index.set(doc.id, doc);
      }

      console.log(`Loaded ${this.index.size} documents from index`);
    } catch (error) {
      console.log("No existing index found, starting fresh");
    }
  }

  /**
   * Clear the index
   */
  clearIndex(): void {
    this.index.clear();
  }

  /**
   * Get index statistics
   */
  getIndexStats(): {
    totalDocuments: number;
    categories: Record<string, number>;
    totalTags: number;
    lastUpdated?: Date;
  } {
    const categories: Record<string, number> = {};
    const allTags = new Set<string>();

    for (const doc of this.index.values()) {
      categories[doc.category] = (categories[doc.category] || 0) + 1;
      doc.tags.forEach((tag) => allTags.add(tag));
    }

    const lastUpdated =
      this.index.size > 0
        ? new Date(
            Math.max(
              ...Array.from(this.index.values()).map((d) =>
                d.lastIndexed.getTime(),
              ),
            ),
          )
        : undefined;

    return {
      totalDocuments: this.index.size,
      categories,
      totalTags: allTags.size,
      lastUpdated,
    };
  }

  /**
   * Generate embedding using the embedding factory
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingFactory.embed(text);
      return result.vector;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      // Fallback to simple token-based representation
      return this.simpleTextEmbedding(text);
    }
  }

  /**
   * Simple fallback embedding for when embedding providers fail
   */
  private simpleTextEmbedding(text: string): number[] {
    // Simple hash-based embedding for fallback
    const hash = this.simpleHash(text);
    const embedding = new Array(384).fill(0);

    // Distribute hash values across embedding dimensions
    for (let i = 0; i < 384; i++) {
      embedding[i] = ((hash >> i % 32) & 1) === 1 ? 1 : -1;
    }

    return embedding;
  }

  /**
   * Simple hash function for fallback embedding
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Check if document tags match query tags
   */
  private matchesTags(documentTags: string[], queryTags: string[]): boolean {
    return queryTags.some((queryTag) =>
      documentTags.some(
        (docTag) =>
          docTag.toLowerCase().includes(queryTag.toLowerCase()) ||
          queryTag.toLowerCase().includes(docTag.toLowerCase()),
      ),
    );
  }

  /**
   * Find sections that match the query
   */
  private findMatchingSections(query: string, doc: IndexedDocument): string[] {
    const queryLower = query.toLowerCase();
    const matchingSections: string[] = [];

    // Check if query terms appear in section headings
    for (const heading of doc.metadata.sectionHeadings) {
      if (heading.toLowerCase().includes(queryLower)) {
        matchingSections.push(heading);
      }
    }

    return matchingSections;
  }

  /**
   * Generate unique ID for indexed document
   */
  private generateIndexedId(documentId: string): string {
    return `idx_${documentId}_${Date.now()}`;
  }
}
