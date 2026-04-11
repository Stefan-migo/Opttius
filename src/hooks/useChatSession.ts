import { useCallback, useState } from "react";

import type { ToolCall } from "@/lib/ai/types";

interface ChatSessionConfig {
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
  enableToolCalling?: boolean;
  enabledTools?: string[];
  systemPrompt?: string;
  requireConfirmation?: boolean;
  [key: string]: unknown;
}

interface ChatSession {
  id: string;
  title: string | null;
  provider: string;
  model: string | null;
  created_at: string;
  updated_at: string;
  config?: ChatSessionConfig | null;
  message_count?: number;
  last_message_preview?: string | null;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[] | null;
  tool_results?: Array<{
    tool_call_id: string;
    result: unknown;
  }> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface UseChatSessionReturn {
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  createSession: (
    provider: string,
    model: string,
    title?: string,
    config?: ChatSessionConfig,
  ) => Promise<ChatSession | null>;
  loadSession: (sessionId: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  saveMessage: (
    sessionId: string,
    role: ChatMessage["role"],
    content: string,
    metadata?: Record<string, unknown>,
  ) => Promise<void>;
  clearSession: () => void;
}

export function useChatSession(): UseChatSessionReturn {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(
    async (
      provider: string,
      model: string,
      title?: string,
      config?: ChatSessionConfig,
    ): Promise<ChatSession | null> => {
      try {
        setLoading(true);
        setError(null);

        // Validate inputs
        if (!provider || !model) {
          throw new Error("Provider and model are required");
        }

        const requestBody: {
          provider: string;
          model: string;
          title: string | null;
          config?: ChatSessionConfig;
        } = {
          provider: String(provider).trim(),
          model: String(model).trim(),
          title: title ? String(title).trim() : null,
        };

        // Only include config if it's valid and not null
        if (config && typeof config === "object" && config !== null) {
          try {
            // Remove any undefined values
            const cleanConfig = JSON.parse(JSON.stringify(config));
            if (Object.keys(cleanConfig).length > 0) {
              requestBody.config = cleanConfig;
            }
          } catch (e) {
            console.warn("Config is not serializable, skipping:", e);
          }
        }

        const response = await fetch("/api/admin/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const data = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          const errorMessage =
            data.error ||
            data.details ||
            `HTTP ${response.status}: Failed to create session`;
          console.error("Session creation failed:", errorMessage, data);
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (!data.session) {
          throw new Error("No session data returned from server");
        }

        const session = data.session;
        setCurrentSession(session);
        setMessages([]);
        return session;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create session";
        console.error("Error in createSession:", errorMessage, err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/chat/sessions?sessionId=${sessionId}`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load session");
      }

      const data = await response.json();
      setCurrentSession(data.session);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSessionTitle = useCallback(
    async (sessionId: string, title: string) => {
      try {
        setError(null);

        const response = await fetch("/api/admin/chat/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, title }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update session");
        }

        const data = await response.json();
        setCurrentSession(data.session);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update session",
        );
      }
    },
    [],
  );

  const saveMessage = useCallback(
    async (
      sessionId: string,
      role: ChatMessage["role"],
      content: string,
      metadata?: Record<string, unknown>,
    ) => {
      try {
        const response = await fetch("/api/admin/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            role,
            content,
            metadata,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to save message");
        }

        const data = await response.json();
        setMessages((prev) => [...prev, data.message]);
      } catch (err) {
        console.error("Error saving message:", err);
      }
    },
    [],
  );

  const clearSession = useCallback(() => {
    setCurrentSession(null);
    setMessages([]);
    setError(null);
  }, []);

  return {
    currentSession,
    messages,
    loading,
    error,
    createSession,
    loadSession,
    updateSessionTitle,
    saveMessage,
    clearSession,
  };
}
