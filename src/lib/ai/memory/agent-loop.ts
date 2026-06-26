/**
 * Agent Memory Loop — pre-LLM context retrieval pipeline.
 *
 * Runs two parallel queries before every agent interaction:
 *   1. getRecentContext(orgId, 5)  ← cached in Redis (TTL 5 min)
 *   2. searchOrgMemory(message, orgId) ← semantic pgvector search
 *
 * Results are combined into a single MemoryContext for Layer 4 of the prompt.
 *
 * @module lib/ai/memory/agent-loop
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { getRedisClient } from "@/lib/redis";

import { getEmbeddingFactory } from "../embeddings";
import type { MemoryContext } from "../agent/prompt-builder";

// ─── Constants ───

const RECENT_CACHE_TTL = 300; // 5 minutes
const RECENT_LIMIT = 5;
const SEARCH_THRESHOLD = 0.7;
const SEARCH_MATCH_COUNT = 5;
const TRANSFORMERS_TIMEOUT_MS = 3000;

// ponytail: hardcoded limits — make configurable if org-level tuning is needed.

// ─── Public API ───

export interface AgentMemoryInput {
  message: string;
  orgId: string;
  supabase: SupabaseClient;
}

/**
 * Execute the full memory loop: recent context + semantic search in parallel.
 * Returns a combined MemoryContext (may be empty on error or timeout).
 */
export async function executeMemoryLoop(
  input: AgentMemoryInput,
): Promise<MemoryContext> {
  const [recentResult, semanticResult] = await Promise.allSettled([
    getRecentContext(input.orgId, input.supabase),
    searchOrgMemory(input.message, input.orgId, input.supabase),
  ]);

  return {
    recentFacts: recentResult.status === "fulfilled" ? recentResult.value : [],
    semanticMatches:
      semanticResult.status === "fulfilled" ? semanticResult.value : [],
  };
}

/**
 * Fetch the N most recent memory_facts for an organization.
 * Results are cached in Redis with TTL 5 min.
 * Falls back to direct DB query if Redis is unavailable.
 */
export async function getRecentContext(
  orgId: string,
  supabase: SupabaseClient,
  limit: number = RECENT_LIMIT,
): Promise<Array<{ content: string; category?: string }>> {
  const cacheKey = `agent:recent-context:${orgId}`;

  // Try Redis cache first
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Redis unavailable — fall through to DB query
  }

  // DB query
  const { data, error } = await supabase
    .from("memory_facts")
    .select("content, category")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  const facts = data.map((r) => ({
    content: r.content,
    category: r.category || undefined,
  }));

  // Set cache (best-effort, don't block on failure)
  try {
    const redis = getRedisClient();
    await redis.setex(cacheKey, RECENT_CACHE_TTL, JSON.stringify(facts));
  } catch {
    // cache write failure is non-critical
  }

  return facts;
}

/**
 * Semantic search over memory_facts using Transformers.js embeddings + pgvector.
 * Falls back to ILIKE search if Transformers.js fails or times out.
 */
export async function searchOrgMemory(
  message: string,
  orgId: string,
  supabase: SupabaseClient,
  threshold: number = SEARCH_THRESHOLD,
  matchCount: number = SEARCH_MATCH_COUNT,
): Promise<Array<{ content: string; similarity: number }>> {
  let embedding: number[] | null = null;

  // Generate embedding with timeout
  try {
    const factory = getEmbeddingFactory({ forceProvider: "transformers" });
    const result = await withTimeout(
      factory.embed(message),
      TRANSFORMERS_TIMEOUT_MS,
    );
    embedding = result.vector;
  } catch {
    // Transformers.js failed or timed out — use ILIKE fallback
  }

  if (embedding) {
    // pgvector semantic search
    const { data, error } = await supabase.rpc("match_memory_facts", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: matchCount,
      p_org_id: orgId,
    });

    if (!error && data) {
      return data.map((r: { content: string; similarity: number }) => ({
        content: r.content,
        similarity: r.similarity,
      }));
    }
  }

  // Fallback: ILIKE search
  const { data, error } = await supabase
    .from("memory_facts")
    .select("content")
    .eq("organization_id", orgId)
    .ilike("content", `%${message}%`)
    .order("created_at", { ascending: false })
    .limit(matchCount);

  if (error || !data) {
    return [];
  }

  return data.map((r) => ({ content: r.content, similarity: 1 }));
}

// ─── Helpers ───

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}
