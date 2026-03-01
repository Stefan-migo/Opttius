import { useState, useCallback, useRef, useEffect } from "react";
import { useChatSession } from "@/hooks/useChatSession";
import { useChatConfig } from "@/hooks/useChatConfig";
import { useBranch } from "@/hooks/useBranch";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: string;
  toolCalls?: any;
  toolResults?: any;
  metadata?: any;
}

interface UseChatMessagesReturn {
  messages: Message[];
  isStreaming: boolean;
  currentStreamingContent: string;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sendMessage: (content: string, fileId?: string) => Promise<void>;
  stopStreaming: () => void;
  regenerateMessage: (messageId: string) => Promise<void>;
  clearMessages: () => void;
  loadMessagesFromSession: (sessionId: string) => Promise<void>;
}

export function useChatMessages(currentSection: string | null) {
  const { currentBranch, isGlobalView } = useBranch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingContent, setCurrentStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  const { currentSession, createSession, loadSession } = useChatSession();

  // Memoize initial config to prevent infinite loops
  // Default to DeepSeek which has more generous rate limits
  const initialConfig = {
    provider: "deepseek" as const,
    model: "deepseek-chat",
  };

  const { config, getConfigForAPI } = useChatConfig(initialConfig);

  const loadMessagesFromSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(
        `/api/admin/chat/sessions?sessionId=${sessionId}`,
      );
      if (response.ok) {
        const data = await response.json();
        // Map messages and ensure no duplicates by using id as key
        const loadedMessages = (data.messages || []).map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at,
          toolCalls: msg.metadata?.toolCalls || msg.tool_calls,
          toolResults: msg.metadata?.toolResults || msg.tool_results,
          metadata: msg.metadata,
        }));

        // Remove duplicates by id before setting
        const uniqueMessages = Array.from(
          new Map(loadedMessages.map((msg: any) => [msg.id, msg])).values(),
        ) as Message[];

        setMessages(uniqueMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      fileId?: string,
      addUserMessage: boolean = true,
    ) => {
      if (!content.trim() || isStreaming) return;

      let sessionToUse = currentSession;
      if (!sessionToUse) {
        const provider = config.provider || "deepseek";
        let model = config.model;

        // Ensure model is a valid string
        if (!model || typeof model !== "string" || model.trim() === "") {
          model =
            provider === "deepseek"
              ? "deepseek-chat"
              : provider === "google"
                ? "gemini-2.5-flash"
                : provider === "openai"
                  ? "gpt-4"
                  : "deepseek-chat";
        }

        if (!provider || !model || model.trim() === "") {
          console.error("Invalid provider or model:", {
            provider,
            model,
            config,
          });
          alert(
            "Error: Configuración inválida. Por favor, selecciona un proveedor y modelo válidos.",
          );
          return;
        }

        const apiConfig = getConfigForAPI();

        try {
          sessionToUse = await createSession(
            provider,
            model.trim(),
            undefined,
            apiConfig as any,
          );
          if (!sessionToUse) {
            console.error("Failed to create session - no session returned");
            return;
          }
        } catch (error: any) {
          console.error("Error creating session:", error);
          return;
        }
      }

      // Only add user message if addUserMessage is true (regeneration case)
      if (addUserMessage) {
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: "user",
          content,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      setIsStreaming(true);
      setCurrentStreamingContent("");

      const assistantMessageId = crypto.randomUUID();
      streamingMessageIdRef.current = assistantMessageId;

      const streamingMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, streamingMessage]);

      abortControllerRef.current = new AbortController();

      let accumulatedContent = "";
      try {
        const apiConfig = getConfigForAPI();
        const response = await fetch("/api/admin/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: content,
            fileId: fileId ?? undefined,
            provider: config.provider,
            model: config.model,
            sessionId: sessionToUse?.id,
            config: apiConfig,
            section: currentSection,
            currentBranchId: isGlobalView ? "global" : currentBranch?.id,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response stream");
        }

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                  console.error("SSE error:", data.error);
                  setMessages((prev) => {
                    const updated = [...prev];
                    const index = updated.findIndex(
                      (m) => m.id === assistantMessageId,
                    );
                    if (index !== -1) {
                      updated[index] = {
                        ...updated[index],
                        content: `Error: ${data.error}`,
                      };
                    }
                    return updated;
                  });
                  setIsStreaming(false);
                  streamingMessageIdRef.current = null;
                  break;
                }

                if (data.content) {
                  accumulatedContent += data.content;
                  setCurrentStreamingContent(accumulatedContent);
                  // Update message immediately with accumulated content
                  setMessages((prev) => {
                    const updated = [...prev];
                    const index = updated.findIndex(
                      (m) => m.id === assistantMessageId,
                    );
                    if (index !== -1) {
                      updated[index] = {
                        ...updated[index],
                        content: accumulatedContent,
                      };
                    }
                    return updated;
                  });
                }

                if (data.done) {
                  // Final update with all accumulated content
                  setMessages((prev) => {
                    const updated = [...prev];
                    const index = updated.findIndex(
                      (m) => m.id === assistantMessageId,
                    );
                    if (index !== -1) {
                      updated[index] = {
                        ...updated[index],
                        content: accumulatedContent,
                      };
                    } else if (accumulatedContent) {
                      // If message doesn't exist, create it
                      updated.push({
                        id: assistantMessageId,
                        role: "assistant",
                        content: accumulatedContent,
                        timestamp: new Date().toISOString(),
                      });
                    }
                    return updated;
                  });

                  setCurrentStreamingContent("");
                  setIsStreaming(false);
                  streamingMessageIdRef.current = null;
                }
              } catch (e) {
                console.error("Error parsing SSE line:", e, "Line:", line);
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          // User stopped the response - finalize with partial content and re-enable input
          setMessages((prev) => {
            const updated = [...prev];
            const index = updated.findIndex((m) => m.id === assistantMessageId);
            if (index !== -1) {
              const stoppedLabel = "_(Respuesta detenida)_";
              updated[index] = {
                ...updated[index],
                content: accumulatedContent
                  ? `${accumulatedContent}\n\n${stoppedLabel}`
                  : stoppedLabel,
              };
            }
            return updated;
          });
          setCurrentStreamingContent("");
          setIsStreaming(false);
          streamingMessageIdRef.current = null;
          return;
        }

        setMessages((prev) => {
          const updated = [...prev];
          const index = updated.findIndex((m) => m.id === assistantMessageId);
          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              content: `Error: ${error.message || "No se pudo procesar la solicitud"}`,
            };
          } else {
            updated.push({
              id: crypto.randomUUID(),
              role: "assistant",
              content: `Error: ${error.message || "No se pudo procesar la solicitud"}`,
              timestamp: new Date().toISOString(),
            });
          }
          return updated;
        });
        setIsStreaming(false);
        setCurrentStreamingContent("");
        streamingMessageIdRef.current = null;
      }
    },
    [
      isStreaming,
      currentSession,
      config,
      currentSection,
      isGlobalView,
      currentBranch,
      createSession,
      getConfigForAPI,
    ],
  );

  const regenerateMessage = useCallback(
    async (messageId: string) => {
      // Find the user message that corresponds to this assistant message
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex <= 0) return;

      // Get the user message that came before this assistant message
      const userMessage = messages[messageIndex - 1];
      if (userMessage.role !== "user") return;

      // Remove the assistant message and all subsequent messages
      const messagesToRemove = messages.length - messageIndex;
      setMessages((prev) => prev.slice(0, messageIndex));

      // Resend the user message WITHOUT adding it again (prevents duplication)
      await sendMessage(userMessage.content, undefined, false);
    },
    [messages, sendMessage],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Sync streaming content to messages (in useEffect to avoid setState during render)
  useEffect(() => {
    if (
      isStreaming &&
      currentStreamingContent &&
      streamingMessageIdRef.current
    ) {
      setMessages((prev) => {
        const updated = [...prev];
        const index = updated.findIndex(
          (m) => m.id === streamingMessageIdRef.current,
        );
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            content: currentStreamingContent,
          };
        }
        return updated;
      });
    }
  }, [isStreaming, currentStreamingContent]);

  return {
    messages,
    isStreaming,
    currentStreamingContent,
    setMessages,
    sendMessage,
    stopStreaming,
    regenerateMessage,
    clearMessages,
    loadMessagesFromSession,
  };
}
