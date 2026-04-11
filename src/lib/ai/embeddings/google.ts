/**
 * Google Embeddings Provider
 *
 * Uses Google's text-embedding-004 model for generating embeddings.
 * Dimensions: 768
 * Rate limit: 1500 requests/minute (free tier)
 */

import type {
  EmbeddingBatchResult,
  EmbeddingProvider,
  EmbeddingResult,
  GoogleEmbeddingConfig,
} from "./types";

const GOOGLE_EMBEDDING_API =
  "https://generativelanguage.googleapis.com/v1/models";
const DEFAULT_MODEL = "text-embedding-004";
const EMBEDDING_DIMENSIONS = 768;

export class GoogleEmbeddingProvider implements EmbeddingProvider {
  name = "google";
  dimensions = EMBEDDING_DIMENSIONS;
  maxTokens = 2048;

  private apiKey: string;
  private model: string;

  constructor(config?: GoogleEmbeddingConfig) {
    this.apiKey = config?.apiKey || process.env.GOOGLE_API_KEY || "";
    this.model = config?.model || DEFAULT_MODEL;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    if (!this.isAvailable()) {
      throw new Error("Google Embeddings: API key not configured");
    }

    const url = `${GOOGLE_EMBEDDING_API}/${this.model}:embedContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: `models/${this.model}`,
          content: {
            parts: [{ text }],
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Google Embeddings API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.embedding?.values) {
        throw new Error(
          "Google Embeddings: Invalid response format - no embedding values",
        );
      }

      return {
        vector: data.embedding.values,
        dimensions: data.embedding.values.length,
        provider: this.name,
        tokenCount: undefined, // Google doesn't return token count for embeddings
      };
    } catch (error: unknown) {
      if (
        error.message?.includes("429") ||
        error.message?.includes("Too Many Requests")
      ) {
        throw new Error("Google Embeddings: Rate limit exceeded");
      }
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<EmbeddingBatchResult> {
    if (!this.isAvailable()) {
      throw new Error("Google Embeddings: API key not configured");
    }

    if (texts.length === 0) {
      return {
        embeddings: [],
        provider: this.name,
      };
    }

    const url = `${GOOGLE_EMBEDDING_API}/${this.model}:batchEmbedContents?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: `models/${this.model}`,
            content: {
              parts: [{ text }],
            },
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Google Embeddings API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.embeddings || !Array.isArray(data.embeddings)) {
        throw new Error("Google Embeddings: Invalid batch response format");
      }

      const embeddings: EmbeddingResult[] = data.embeddings.map(
        (emb: unknown) => ({
          vector: emb.values,
          dimensions: emb.values.length,
          provider: this.name,
        }),
      );

      return {
        embeddings,
        provider: this.name,
      };
    } catch (error: unknown) {
      if (
        error.message?.includes("429") ||
        error.message?.includes("Too Many Requests")
      ) {
        throw new Error("Google Embeddings: Rate limit exceeded");
      }
      throw error;
    }
  }
}
