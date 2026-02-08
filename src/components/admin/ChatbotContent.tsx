"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ResizablePanel } from "@/components/ui/resizable";
import { MessageList } from "./chat/MessageList";
import { ChatInput } from "./chat/ChatInput";
import { ChatHistorySidebar } from "./chat/ChatHistorySidebar";
import { SettingsPanel } from "./chat/SettingsPanel";
import { ToolBrowser } from "./chat/ToolBrowser";
import { ChatHeader } from "./chat/ChatHeader";
import { ExportDialog } from "./chat/ExportDialog";
import { useChatSession } from "@/hooks/useChatSession";
import { useChatConfig } from "@/hooks/useChatConfig";
import { useBranch } from "@/hooks/useBranch";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: string;
  toolCalls?: any;
  toolResults?: any;
  metadata?: any;
}

import type { InsightSection } from "@/lib/ai/insights/schemas";

interface ChatbotContentProps {
  className?: string;
  currentSection?: InsightSection | null;
  onClose?: () => void;
}

// Quick suggestions based on section
const quickSuggestions: Record<InsightSection, string[]> = {
  dashboard: [
    "¿Cómo puedo mejorar mis ventas?",
    "Muéstrame los trabajos atrasados",
    "¿Qué productos tienen stock bajo?",
    "Dame un resumen del día de hoy",
  ],
  pos: [
    "¿Qué material de lente recomiendas para esta dioptría?",
    "¿Cómo calcular el precio con descuento?",
    "¿Qué tratamientos van bien con este tipo de lente?",
    "Muéstrame productos similares",
  ],
  inventory: [
    "¿Qué productos necesitan reposición?",
    "Muéstrame productos sin movimiento",
    "¿Cómo crear una oferta de liquidación?",
    "Dame estadísticas de inventario",
  ],
  clients: [
    "¿Qué clientes necesitan seguimiento?",
    "¿Cómo crear un nuevo cliente?",
    "¿Cómo buscar por RUT?",
    "Muéstrame clientes inactivos",
  ],
  analytics: [
    "Explica las tendencias de ventas",
    "¿Cuál es el producto más vendido?",
    "Muéstrame comparación de períodos",
    "¿Qué categoría genera más ingresos?",
  ],
};

export function ChatbotContent({
  className,
  currentSection,
  onClose,
}: ChatbotContentProps) {
  const { currentBranch, isGlobalView } = useBranch();
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [historyWidth, setHistoryWidth] = useState(256);

  const handleHistoryWidthChange = useCallback((width: number) => {
    setHistoryWidth(width);
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingContent, setCurrentStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  const {
    currentSession,
    loading: sessionLoading,
    error: sessionError,
    createSession,
    loadSession,
    updateSessionTitle,
    saveMessage,
    clearSession,
  } = useChatSession();

  // Show session errors to user
  useEffect(() => {
    if (sessionError) {
      console.error("Session error:", sessionError);
      // You can show a toast or alert here if needed
    }
  }, [sessionError]);

  // Memoize initial config to prevent infinite loops
  // Default to DeepSeek which has more generous rate limits
  const initialConfig = useMemo(
    () => ({
      provider: "deepseek" as const,
      model: "deepseek-chat",
    }),
    [],
  );

  const {
    config,
    setProvider,
    setModel,
    updateConfig: updateChatConfig,
    getConfigForAPI,
  } = useChatConfig(initialConfig);

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

  // Load messages when session changes, but only once per session
  const lastLoadedSessionId = useRef<string | null>(null);
  const isLoadingMessages = useRef(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    if (currentSession?.id) {
      // Only load if this is a different session than the last one loaded
      // and we're not already loading
      if (
        lastLoadedSessionId.current !== currentSession.id &&
        !isLoadingMessages.current &&
        !isHistoryLoading
      ) {
        lastLoadedSessionId.current = currentSession.id;
        setIsHistoryLoading(true);
        // Clear messages first to prevent showing old messages
        setMessages([]);

        loadMessagesFromSession(currentSession.id).finally(() => {
          setIsHistoryLoading(false);
          isLoadingMessages.current = false;
        });
      }
    } else {
      lastLoadedSessionId.current = null;
      setIsHistoryLoading(false);
      isLoadingMessages.current = false;
      setMessages([]);
    }
  }, [currentSession?.id, loadMessagesFromSession, isHistoryLoading]);

  const handleNewSession = async () => {
    clearSession();
    setMessages([]);
    setShowHistory(false);
    // Session will be created automatically on the first message send
  };

  const handleSessionSelect = async (sessionId: string) => {
    // Force a reload by resetting the ref
    lastLoadedSessionId.current = null;
    setMessages([]);
    setShowHistory(false); // Close the history overlay
    await loadSession(sessionId);
  };

  const sendMessage = async (content: string) => {
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
          // Don't show alert here, the error should be logged in useChatSession
          return;
        }
      } catch (error: any) {
        console.error("Error creating session:", error);
        // Don't show alert here, let useChatSession handle it
        return;
      }
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

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

    try {
      const apiConfig = getConfigForAPI();
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          provider: config.provider,
          model: config.model,
          sessionId: sessionToUse?.id,
          config: apiConfig,
          section: currentSection, // Pass current section for context
          currentBranchId: isGlobalView ? "global" : currentBranch?.id, // Pass current branch for context
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
      let accumulatedContent = "";

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
  };

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
  }, [currentStreamingContent, isStreaming]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlKey && e.key === "k") {
        e.preventDefault();
        handleNewSession();
      } else if (ctrlKey && e.key === "/") {
        e.preventDefault();
        setShowSettings(!showSettings);
      } else if (ctrlKey && e.key === "h") {
        e.preventDefault();
        setShowHistory(!showHistory);
      } else if (e.key === "Escape") {
        if (showSettings) setShowSettings(false);
        if (showHistory) setShowHistory(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettings, showHistory]);

  const handleExport = () => {
    if (currentSession && messages.length > 0) {
      setShowExport(true);
    }
  };

  const handleClear = () => {
    if (confirm("¿Estás seguro de que deseas limpiar esta conversación?")) {
      setMessages([]);
    }
  };

  const handleDelete = async () => {
    if (!currentSession) return;
    if (confirm("¿Estás seguro de que deseas eliminar esta sesión?")) {
      try {
        const response = await fetch(
          `/api/admin/chat/history?sessionId=${currentSession.id}`,
          {
            method: "DELETE",
          },
        );
        if (response.ok) {
          await handleNewSession();
        }
      } catch (error) {
        console.error("Error deleting session:", error);
      }
    }
  };

  const sessionTitle = currentSession?.title || "Nueva conversación";

  return (
    <div className={cn("flex h-full min-h-0 overflow-hidden", className)}>
      {showHistory && (
        <div className="absolute inset-0 z-[60] bg-white dark:bg-slate-950 overflow-y-auto animate-in slide-in-from-left duration-300">
          <ChatHistorySidebar
            currentSessionId={currentSession?.id}
            onSessionSelect={handleSessionSelect}
            onNewSession={handleNewSession}
            onClose={() => setShowHistory(false)}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {showSettings && (
          <div className="absolute inset-0 z-[60] bg-white dark:bg-slate-950 overflow-y-auto animate-in slide-in-from-right duration-300">
            <SettingsPanel
              config={config}
              onConfigChange={updateChatConfig}
              onClose={() => setShowSettings(false)}
            />
          </div>
        )}
        {/* Fixed Header */}
        <div className="flex-shrink-0 z-20 bg-admin-bg-primary border-b border-admin-border-primary">
          <ChatHeader
            title={sessionTitle}
            onTitleChange={(title) => {
              if (currentSession) {
                updateSessionTitle(currentSession.id, title);
              }
            }}
            onSettingsClick={() => setShowSettings(!showSettings)}
            onHistoryClick={() => setShowHistory(!showHistory)}
            onNewConversation={handleNewSession}
            onExport={handleExport}
            onClear={handleClear}
            onDelete={handleDelete}
            onClose={onClose}
          />
        </div>

        {/* Scrollable Messages Area */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-slate-950">
            <div className="flex-1 overflow-y-auto min-h-0">
              <MessageList
                messages={messages}
                isStreaming={isStreaming && !currentStreamingContent}
                onMessageAction={(messageId, action) => {
                  if (action === "copy") {
                    const message = messages.find((m) => m.id === messageId);
                    if (message) {
                      navigator.clipboard.writeText(message.content);
                    }
                  } else if (action === "delete") {
                    setMessages((prev) =>
                      prev.filter((m) => m.id !== messageId),
                    );
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Fixed Input at Bottom */}
        <div className="flex-shrink-0 z-10 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          {/* Quick Suggestions */}
          {currentSection && messages.length === 0 && !isStreaming && (
            <div className="p-4 border-b border-slate-50 dark:border-slate-800/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">
                Sugerencias rápidas
              </p>
              <div className="flex flex-wrap gap-2">
                {quickSuggestions[currentSection].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (!isStreaming) {
                        sendMessage(suggestion);
                      }
                    }}
                    disabled={isStreaming}
                    className="text-xs px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-primary hover:text-white border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 group flex items-center gap-2"
                  >
                    <Sparkles className="w-3 h-3 text-primary group-hover:text-white transition-colors" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ChatInput
            onSend={sendMessage}
            disabled={isStreaming}
            placeholder={
              currentSection
                ? `Pregunta sobre ${currentSection === "dashboard" ? "el dashboard" : currentSection === "inventory" ? "inventario" : currentSection === "clients" ? "clientes" : currentSection === "pos" ? "ventas" : "analíticas"}...`
                : "Escribe tu mensaje..."
            }
          />
        </div>
      </div>

      {currentSession && (
        <ExportDialog
          open={showExport}
          onOpenChange={setShowExport}
          session={currentSession}
          messages={messages}
        />
      )}
    </div>
  );
}
