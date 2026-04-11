/**
 * Memory System Types
 *
 * Defines interfaces for the agent's memory system including
 * session memory, long-term memory, and semantic memory (RAG).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface MemoryContext {
  userId: string;
  sessionId?: string;
  supabase: SupabaseClient;
}

// Session Memory Types
export interface SessionMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: unknown[];
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface SessionMemoryConfig {
  maxMessages?: number; // Maximum messages to load (default: 50)
  includeToolMessages?: boolean; // Include tool call results (default: true)
}

// Long-term Memory Types
export interface MemoryFact {
  id?: string;
  userId: string;
  factType: "preference" | "decision" | "context" | "workflow" | "insight";
  category?: string;
  content: string;
  importance: number; // 1-10
  sourceSessionId?: string;
  sourceMessageId?: string;
  expiresAt?: Date;
}

export interface LongTermMemoryConfig {
  maxFacts?: number; // Maximum facts to retrieve (default: 10)
  minImportance?: number; // Minimum importance threshold (default: 3)
  includeExpired?: boolean; // Include expired facts (default: false)
}

// Semantic Memory Types
export interface SemanticSearchOptions {
  sourceTypes?: (
    | "chat_message"
    | "product"
    | "order"
    | "customer"
    | "category"
  )[];
  matchThreshold?: number; // 0-1, default 0.7
  matchCount?: number; // default 10
  userId?: string;
}

export interface SemanticSearchResult {
  id: string;
  sourceType: string;
  sourceId: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface MemoryFactSearchResult extends MemoryFact {
  similarity: number;
}

// Embedding Storage Types
export interface EmbeddingRecord {
  id?: string;
  sourceType: string;
  sourceId: string;
  content: string;
  embedding?: number[]; // 768 dimensions (Google)
  embeddingSmall?: number[]; // 384 dimensions (Transformers.js)
  embeddingProvider: "google" | "transformers";
  userId?: string;
  metadata?: Record<string, unknown>;
}

// Memory Manager Types
export interface MemoryManagerConfig {
  enableSemanticSearch?: boolean; // default: true
  enableLongTermMemory?: boolean; // default: true
  maxContextLength?: number; // Max chars for context injection (default: 4000)
  semanticSearchCount?: number; // Results to fetch (default: 5)
}

export interface RelevantContext {
  semanticResults: SemanticSearchResult[];
  memoryFacts: MemoryFactSearchResult[];
  formattedContext: string;
}

// Indexer Types
export interface IndexingResult {
  sourceType: string;
  totalRecords: number;
  indexed: number;
  failed: number;
  errors: string[];
}

export interface IndexingOptions {
  batchSize?: number; // Records per batch (default: 50)
  forceReindex?: boolean; // Re-index existing records (default: false)
  sourceTypes?: string[]; // Which types to index
}
