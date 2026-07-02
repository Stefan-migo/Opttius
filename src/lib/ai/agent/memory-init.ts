// @deprecated Migrate to agent_conversations/agent_messages after database-reformation.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { MemoryManager } from "../memory";
import type { OrganizationalMemory } from "../memory/organizational";

/**
 * Initialize the memory manager for semantic context injection
 */
export async function initializeMemoryManager(
  userId: string,
  sessionId?: string,
  supabase?: SupabaseClient,
): Promise<MemoryManager | null> {
  try {
    const { createMemoryManager } = await import("../memory");

    // ponytail: fallback to service_role if no auth'd client provided — drop when all callers pass one
    const client: SupabaseClient =
      supabase ?? (await import("@/utils/supabase/server")).createServiceRoleClient();

    return createMemoryManager(
      {
        userId,
        sessionId,
        supabase: client,
      },
      {
        enableSemanticSearch: true,
        enableLongTermMemory: true,
        semanticSearchCount: 5,
        maxContextLength: 3000,
      },
    );
  } catch (error) {
    console.error("Failed to initialize memory manager:", error);
    return null;
  }
}

/**
 * Initialize organizational memory for contextual information
 */
export async function initializeOrganizationalMemory(
  organizationId: string,
  supabase?: SupabaseClient,
): Promise<OrganizationalMemory | null> {
  try {
    const { createOrganizationalMemory } = await import(
      "../memory/organizational"
    );

    // ponytail: same fallback pattern
    const client: SupabaseClient =
      supabase ?? (await import("@/utils/supabase/server")).createServiceRoleClient();

    return createOrganizationalMemory(organizationId, client);
  } catch (error) {
    console.error("Failed to initialize organizational memory:", error);
    return null;
  }
}
