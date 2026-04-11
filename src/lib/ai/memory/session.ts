/**
 * Session Memory Service
 *
 * Manages the current conversation context.
 * Loads and stores conversation history from the database.
 */

import type {
  MemoryContext,
  SessionMemoryConfig,
  SessionMessage,
} from "./types";

export class SessionMemory {
  private context: MemoryContext;
  private messages: SessionMessage[] = [];
  private loaded = false;

  constructor(context: MemoryContext) {
    this.context = context;
  }

  /**
   * Load conversation history from database
   */
  async load(config: SessionMemoryConfig = {}): Promise<SessionMessage[]> {
    const { maxMessages = 50, includeToolMessages = true } = config;

    if (!this.context.sessionId) {
      console.log("No session ID provided, starting fresh conversation");
      this.loaded = true;
      return [];
    }

    try {
      let query = this.context.supabase
        .from("chat_messages")
        .select("id, role, content, tool_calls, metadata, created_at")
        .eq("session_id", this.context.sessionId)
        .order("created_at", { ascending: true })
        .limit(maxMessages);

      if (!includeToolMessages) {
        query = query.neq("role", "tool");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to load session history:", error);
        this.loaded = true;
        return [];
      }

      this.messages = (data || []).map((row: unknown) => ({
        role: row.role as SessionMessage["role"],
        content: row.content || "",
        toolCalls: row.tool_calls || row.metadata?.toolCalls,
        metadata: row.metadata,
        createdAt: new Date(row.created_at),
      }));

      this.loaded = true;
      console.log(`Loaded ${this.messages.length} messages from session`);

      return this.messages;
    } catch (error) {
      console.error("Load session history failed:", error);
      this.loaded = true;
      return [];
    }
  }

  /**
   * Get all loaded messages
   */
  getMessages(): SessionMessage[] {
    return [...this.messages];
  }

  /**
   * Check if history has been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Add a message to the in-memory history
   * Note: This doesn't persist to database - that's handled by the API route
   */
  addMessage(message: SessionMessage): void {
    this.messages.push(message);
  }

  /**
   * Get recent messages (last N)
   */
  getRecentMessages(count: number): SessionMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * Get messages by role
   */
  getMessagesByRole(role: SessionMessage["role"]): SessionMessage[] {
    return this.messages.filter((m) => m.role === role);
  }

  /**
   * Clear in-memory messages
   */
  clear(): void {
    this.messages = [];
    this.loaded = false;
  }

  /**
   * Get a summary of the conversation
   * Useful for condensing long conversations
   */
  getSummary(): string {
    const userMessages = this.getMessagesByRole("user");
    const assistantMessages = this.getMessagesByRole("assistant");

    const topics = userMessages
      .map((m) => m.content.substring(0, 100))
      .slice(-5); // Last 5 topics

    return (
      `Conversation with ${this.messages.length} messages. ` +
      `User messages: ${userMessages.length}, Assistant responses: ${assistantMessages.length}. ` +
      `Recent topics: ${topics.join("; ")}`
    );
  }

  /**
   * Check if conversation contains a specific topic/keyword
   */
  hasDiscussed(keyword: string): boolean {
    const lowerKeyword = keyword.toLowerCase();
    return this.messages.some((m) =>
      m.content.toLowerCase().includes(lowerKeyword),
    );
  }

  /**
   * Get the last message
   */
  getLastMessage(): SessionMessage | null {
    return this.messages.length > 0
      ? this.messages[this.messages.length - 1]
      : null;
  }

  /**
   * Get the last user message
   */
  getLastUserMessage(): SessionMessage | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === "user") {
        return this.messages[i];
      }
    }
    return null;
  }

  /**
   * Get the last assistant message
   */
  getLastAssistantMessage(): SessionMessage | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === "assistant") {
        return this.messages[i];
      }
    }
    return null;
  }
}
