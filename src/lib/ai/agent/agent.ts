import type { SupabaseClient } from "@supabase/supabase-js";

import type { MemoryManager } from "../memory";
import type { OrganizationalMemory } from "../memory/organizational";
import type {
  AgentScreenContext,  Block,
  LLMMessage,
  LLMProvider,
  LLMStreamChunk,
  ToolCall } from "../types";
import { loadOrganizationalContext as loadOrganizationalContextFn,loadSessionHistory as loadSessionHistoryFn } from "./context-loader";
import type { AgentConfig } from "./core";
import { getKnowledgeBaseContext as getKnowledgeBaseContextFn } from "./knowledge-context";
import { initializeMemoryManager as initMemoryManager, initializeOrganizationalMemory as initOrgMemory } from "./memory-init";
import type { StreamChatDeps,StreamChatParams } from "./stream-chat";
import { streamChatImpl } from "./stream-chat";
import { screenContextToPrompt,streamChatStructuredImpl } from "./stream-structured";
import { createToolExecutor, executeToolCalls as executeToolCallsFn,ToolExecutor } from "./tool-executor";

export interface AgentOptions {
  userId: string;
  provider?: LLMProvider;
  model?: string;
  context?: string;
  sessionId?: string;
  organizationId?: string;
  config?: AgentConfig;
  currentBranchId?: string | null;
  userData?: {
    role?: string;
    isSuperAdmin?: boolean;
    name?: string;
  };
  /** Optional: for AI usage logging (cost tracking) */
  supabase?: SupabaseClient;
  /** Skip logAdminActivity (e.g. WhatsApp customer - no auth context) */
  skipAdminActivityLog?: boolean;
  /** Customer ID for WhatsApp customer context (customer-scoped tools) */
  customerId?: string | null;
}

export default class Agent {
  private userId: string;
  private provider: LLMProvider | undefined;
  private model: string | undefined;
  private context: string | undefined;
  private sessionId: string | undefined;
  private customConfig: AgentConfig | undefined;
  private messages: LLMMessage[] = [];
  private toolExecutor: ToolExecutor | null = null;
  private memoryManager: MemoryManager | null = null;
  private organizationalMemory: OrganizationalMemory | null = null;
  private organizationId: string;
  private currentBranchId: string | undefined | null;
  private knowledgeBaseEnabled: boolean = false;
  private userData:
    | {
        role?: string;
        isSuperAdmin?: boolean;
        name?: string;
      }
    | undefined;
  private supabaseForUsageLog: SupabaseClient | undefined;
  private skipAdminActivityLog: boolean;
  private customerId: string | null | undefined;

  constructor(options: AgentOptions) {
    this.userId = options.userId;
    this.provider = options.provider;
    this.model = options.model;
    this.context = options.context;
    this.sessionId = options.sessionId;
    this.customConfig = options.config;
    this.organizationalMemory = null;
    this.organizationId = options.organizationId || options.userId;
    this.currentBranchId = options.currentBranchId;
    this.userData = options.userData;
    this.supabaseForUsageLog = options.supabase;
    this.knowledgeBaseEnabled = options.config?.enableKnowledgeBase ?? true;
    this.skipAdminActivityLog = options.skipAdminActivityLog ?? false;
    this.customerId = options.customerId;
  }

  /**
   * Initialize the memory manager for semantic context injection
   */
  private async initializeMemoryManager(): Promise<MemoryManager | null> {
    if (this.memoryManager) {
      return this.memoryManager;
    }
    this.memoryManager = await initMemoryManager(this.userId, this.sessionId, this.supabaseForUsageLog);
    return this.memoryManager;
  }

  /**
   * Initialize organizational memory for contextual information
   */
  private async initializeOrganizationalMemory(): Promise<OrganizationalMemory | null> {
    if (this.organizationalMemory) {
      return this.organizationalMemory;
    }
    this.organizationalMemory = await initOrgMemory(this.organizationId, this.supabaseForUsageLog);
    return this.organizationalMemory;
  }

  /**
   * Get the memory manager instance
   */
  getMemoryManager(): MemoryManager | null {
    return this.memoryManager;
  }

  getOrganizationalMemory(): OrganizationalMemory | null {
    return this.organizationalMemory;
  }

  private async initializeToolExecutor() {
    if (!this.toolExecutor) {
      this.toolExecutor = await createToolExecutor({
        userId: this.userId,
        organizationId: this.organizationId,
        currentBranchId: this.currentBranchId,
        userData: this.userData,
        skipAdminActivityLog: this.skipAdminActivityLog,
        customerId: this.customerId,
        supabase: this.supabaseForUsageLog,
      });
    }
    return this.toolExecutor;
  }

  /**
   * Load conversation history from database for session continuity.
   * Delegates to context-loader for the heavy lifting.
   */
  async loadSessionHistory(sessionId: string, limit: number = 50): Promise<void> {
    const msgs = await loadSessionHistoryFn(
      this.supabaseForUsageLog, sessionId, this.context,
      this.customConfig, this.knowledgeBaseEnabled,
      () => this.getKnowledgeBaseContext(), limit,
    );
    if (msgs.length > 0) this.messages = msgs;
  }

  /**
   * Load organizational context into the agent's memory
   * Delegates to context-loader for the heavy lifting.
   */
  async loadOrganizationalContext(): Promise<void> {
    await loadOrganizationalContextFn(
      this.context,
      this.customConfig,
      () => this.initializeOrganizationalMemory(),
      this.messages,
    );
  }

  /**
   * Get relevant knowledge base context for the current conversation
   */
  private async getKnowledgeBaseContext(): Promise<string | null> {
    return getKnowledgeBaseContextFn(
      this.messages,
      this.userId,
      this.organizationId,
      this.userData,
    );
  }

  /**
   * Check if history has been loaded
   */
  hasLoadedHistory(): boolean {
    return this.messages.length > 1; // More than just system prompt
  }

  async *streamChat(userMessage: string): AsyncGenerator<LLMStreamChunk> {
    const params: StreamChatParams = {
      userMessage, provider: this.provider, model: this.model,
      context: this.context, sessionId: this.sessionId,
      customConfig: this.customConfig, organizationId: this.organizationId,
      currentBranchId: this.currentBranchId, userData: this.userData,
      supabaseForUsageLog: this.supabaseForUsageLog,
      skipAdminActivityLog: this.skipAdminActivityLog,
      customerId: this.customerId,
      knowledgeBaseEnabled: this.knowledgeBaseEnabled,
      userId: this.userId, messages: this.messages,
    };
    const deps: StreamChatDeps = {
      initializeToolExecutor: () => this.initializeToolExecutor(),
      initializeMemoryManager: () => this.initializeMemoryManager(),
      executeToolCalls: (tc, ex, cfg) => this.#executeToolCalls(tc, ex, cfg),
    };
    yield* streamChatImpl(params, deps);
  }

  async chat(userMessage: string): Promise<string> {
    let fullResponse = "";
    for await (const chunk of this.streamChat(userMessage)) {
      if (chunk.content) {
        fullResponse += chunk.content;
      }
    }
    return fullResponse;
  }

  /**
   * streamChatStructured — wraps streamChat() and post-processes the response into Block[].
   *
   * Accepts an optional screenContext injected into Layer 3 of the prompt.
   * Tool calls in the stream are converted to loading → action/success blocks.
   * Returns an AsyncGenerator that yields { blocks, done } for SSE consumption.
   *
   * Does NOT modify the existing streamChat() method.
   */
  async *streamChatStructured(
    userMessage: string,
    screenContext?: AgentScreenContext,
  ): AsyncGenerator<{
    blocks?: Block[];
    sessionId?: string;
    toolCalls?: ToolCall[];
    done: boolean;
  }> {
    yield* streamChatStructuredImpl(
      userMessage,
      screenContext,
      this.messages,
      this.sessionId,
      {
        streamChat: (msg) => this.streamChat(msg),
        screenContextToPrompt,
      },
    );
  }

  /**
   * Execute collected tool calls with validation, single retry, and error reporting.
   * Delegates to tool-executor for the heavy lifting.
   */
  async #executeToolCalls(
    toolCalls: ToolCall[],
    executor: ToolExecutor,
    config: { requireConfirmationForDestructiveActions: boolean },
  ): Promise<void> {
    await executeToolCallsFn(toolCalls, executor, config, this.messages);
  }

  getMessages(): LLMMessage[] {
    return [...this.messages];
  }

  clearMessages() {
    this.messages = [];
  }

  addMessage(role: LLMMessage["role"], content: string) {
    this.messages.push({ role, content });
  }
}
