/**
 * Transformers.js Embeddings Provider
 *
 * Uses local Transformers.js for generating embeddings without external API calls.
 * Model: Xenova/all-MiniLM-L6-v2
 * Dimensions: 384
 *
 * Benefits:
 * - No API costs
 * - Works offline
 * - Full data privacy
 *
 * Drawbacks:
 * - Slower than cloud APIs (~500-2000ms per text)
 * - Uses server CPU/memory
 * - Smaller model = slightly less accurate
 *
 * Note: This provider is only available on the server side and requires
 * the @xenova/transformers package to be installed.
 */

import type {
  EmbeddingBatchResult,
  EmbeddingProvider,
  EmbeddingResult,
  TransformersEmbeddingConfig,
} from "./types";

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSIONS = 384;

// Lazy load the transformers library to avoid loading it if not needed
let pipeline: unknown = null;
let embeddingPipeline: unknown = null;
let isLoading = false;
let loadPromise: Promise<unknown> | null = null;
let loadError: Error | null = null;

async function getEmbeddingPipeline(modelName: string) {
  // If we already failed to load, throw the cached error
  if (loadError) {
    throw loadError;
  }

  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  if (loadPromise) {
    return loadPromise;
  }

  if (isLoading) {
    // Wait for loading to complete
    while (isLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (loadError) throw loadError;
    return embeddingPipeline;
  }

  isLoading = true;

  loadPromise = (async () => {
    try {
      // Check if we're in a server environment
      if (typeof window !== "undefined") {
        throw new Error(
          "Transformers.js embeddings are only available on the server side",
        );
      }

      // Dynamic import to avoid loading at startup
      // Use eval to prevent webpack from trying to bundle this
      const transformers = await eval('import("@xenova/transformers")');
      pipeline = transformers.pipeline;

      console.log(`Loading Transformers.js model: ${modelName}...`);
      embeddingPipeline = await pipeline("feature-extraction", modelName, {
        quantized: true, // Use quantized model for faster inference
      });
      console.log("Transformers.js model loaded successfully");

      return embeddingPipeline;
    } catch (error: unknown) {
      console.error("Failed to load Transformers.js:", error);
      loadError = error;
      throw error;
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export class TransformersEmbeddingProvider implements EmbeddingProvider {
  name = "transformers";
  dimensions = EMBEDDING_DIMENSIONS;
  maxTokens = 512;

  private modelName: string;
  private initialized = false;
  private available: boolean | null = null;

  constructor(config?: TransformersEmbeddingConfig) {
    this.modelName = config?.modelName || DEFAULT_MODEL;
  }

  isAvailable(): boolean {
    // Only available on server side
    if (typeof window !== "undefined") {
      return false;
    }

    // Excluded from Vercel serverless bundle (250MB limit) - use Google embeddings instead
    if (process.env.VERCEL === "1") {
      return false;
    }

    // If we already checked and failed, return false
    if (loadError) {
      return false;
    }

    // If already loaded, it's available
    if (embeddingPipeline) {
      return true;
    }

    // Check if we're in a Node.js environment and package might be available
    // We'll do a lazy check - assume available until proven otherwise
    if (this.available !== null) {
      return this.available;
    }

    // Default to true on server, actual loading will determine availability
    this.available = true;
    return true;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await getEmbeddingPipeline(this.modelName);
      this.initialized = true;
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    await this.ensureInitialized();

    try {
      const pipe = await getEmbeddingPipeline(this.modelName);

      // Generate embedding
      const output = await pipe(text, {
        pooling: "mean",
        normalize: true,
      });

      // Convert to array
      const vector = Array.from(output.data) as number[];

      return {
        vector,
        dimensions: vector.length,
        provider: this.name,
      };
    } catch (error: unknown) {
      throw new Error(`Transformers.js embedding failed: ${error.message}`);
    }
  }

  async embedBatch(texts: string[]): Promise<EmbeddingBatchResult> {
    if (texts.length === 0) {
      return {
        embeddings: [],
        provider: this.name,
      };
    }

    await this.ensureInitialized();

    try {
      const pipe = await getEmbeddingPipeline(this.modelName);

      // Process texts one by one (batch processing can be memory-intensive)
      const embeddings: EmbeddingResult[] = [];

      for (const text of texts) {
        const output = await pipe(text, {
          pooling: "mean",
          normalize: true,
        });

        const vector = Array.from(output.data) as number[];

        embeddings.push({
          vector,
          dimensions: vector.length,
          provider: this.name,
        });
      }

      return {
        embeddings,
        provider: this.name,
      };
    } catch (error: unknown) {
      throw new Error(
        `Transformers.js batch embedding failed: ${error.message}`,
      );
    }
  }
}
