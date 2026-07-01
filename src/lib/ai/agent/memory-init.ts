// @deprecated Migrate to agent_conversations/agent_messages after database-reformation.
import type { MemoryManager } from "../memory";
import type { OrganizationalMemory } from "../memory/organizational";

/**
 * Initialize the memory manager for semantic context injection
 */
export async function initializeMemoryManager(
  userId: string,
  sessionId?: string,
): Promise<MemoryManager | null> {
  try {
    const { createServiceRoleClient } = await import(
      "@/utils/supabase/server"
    );
    const { createMemoryManager } = await import("../memory");

    const supabase = createServiceRoleClient();

    return createMemoryManager(
      {
        userId,
        sessionId,
        supabase,
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
): Promise<OrganizationalMemory | null> {
  try {
    const { createServiceRoleClient } = await import(
      "@/utils/supabase/server"
    );
    const { createOrganizationalMemory } = await import(
      "../memory/organizational"
    );

    const supabase = createServiceRoleClient();

    return createOrganizationalMemory(
      organizationId,
      supabase,
    );
  } catch (error) {
    console.error("Failed to initialize organizational memory:", error);
    return null;
  }
}
