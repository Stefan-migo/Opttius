// @deprecated Migrate to agent_conversations/agent_messages after database-reformation.
import Agent from "./agent";
import type { AgentOptions } from "./agent";

export interface AgentConfig {
  systemPrompt?: string;
  maxSteps?: number;
  temperature?: number;
  maxTokens?: number;
  timeout?: number; // LLM call timeout in ms (Phase 4)
  enableToolCalling?: boolean;
  enabledTools?: string[];
  requireConfirmationForDestructiveActions?: boolean;
  enableSemanticContext?: boolean; // Enable RAG context injection
  enableKnowledgeBase?: boolean; // Enable knowledge base integration
}

export type { AgentOptions };

export async function createAgent(options: AgentOptions): Promise<Agent> {
  return new Agent(options);
}
