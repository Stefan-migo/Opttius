/**
 * Embedding Provider Types
 *
 * Defines interfaces for embedding generation providers.
 * Supports multiple providers (Google, Transformers.js) with automatic fallback.
 */

export interface EmbeddingResult {
  /** The embedding vector */
  vector: number[];
  /** Number of dimensions in the vector */
  dimensions: number;
  /** Provider that generated this embedding */
  provider: string;
  /** Number of tokens in the input text */
  tokenCount?: number;
}

export interface EmbeddingBatchResult {
  /** Array of embedding results */
  embeddings: EmbeddingResult[];
  /** Total tokens processed */
  totalTokens?: number;
  /** Provider that generated these embeddings */
  provider: string;
}

export interface EmbeddingProvider {
  /** Unique identifier for this provider */
  name: string;
  /** Number of dimensions in the output vectors */
  dimensions: number;
  /** Maximum tokens per request */
  maxTokens?: number;
  /** Whether the provider is available (has valid credentials) */
  isAvailable(): boolean;
  /** Generate embedding for a single text */
  embed(text: string): Promise<EmbeddingResult>;
  /** Generate embeddings for multiple texts (more efficient) */
  embedBatch(texts: string[]): Promise<EmbeddingBatchResult>;
}

export interface EmbeddingFactoryConfig {
  /** Primary provider to use */
  primaryProvider: "google" | "transformers";
  /** Fallback provider if primary fails */
  fallbackProvider?: "google" | "transformers";
  /** Force a specific provider (no fallback) */
  forceProvider?: "google" | "transformers";
  /** Enable offline mode (only use local providers) */
  offlineMode?: boolean;
}

export interface EmbeddingSearchOptions {
  /** Source types to search in */
  sourceTypes?: ("chat_message" | "product" | "order" | "customer")[];
  /** Minimum similarity threshold (0-1) */
  matchThreshold?: number;
  /** Maximum number of results */
  matchCount?: number;
  /** Filter by user ID */
  userId?: string;
}

export interface EmbeddingSearchResult {
  /** ID of the source record */
  sourceId: string;
  /** Type of the source (product, order, etc.) */
  sourceType: string;
  /** Content that was embedded */
  content: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// Provider-specific types
export interface GoogleEmbeddingConfig {
  apiKey: string;
  model?: string; // Default: text-embedding-004
}

export interface TransformersEmbeddingConfig {
  modelName?: string; // Default: Xenova/all-MiniLM-L6-v2
  cacheDir?: string;
}
