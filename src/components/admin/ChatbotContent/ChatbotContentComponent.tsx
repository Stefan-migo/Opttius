"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ResizablePanel } from "@/components/ui/resizable";
import { MessageList } from "../chat/MessageList";
import { ChatInput } from "../chat/ChatInput";
import { ChatHistorySidebar } from "../chat/ChatHistorySidebar";
import { SettingsPanel } from "../chat/SettingsPanel";
import { ToolBrowser } from "../chat/ToolBrowser";
import { ChatHeader } from "../chat/ChatHeader";
import { ExportDialog } from "../chat/ExportDialog";
import { useChatSession } from "@/hooks/useChatSession";
import { useChatConfig } from "@/hooks/useChatConfig";
import { useBranch } from "@/hooks/useBranch";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { useChatMessages } from "./hooks/useChatMessages";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import type { InsightSection } from "@/lib/ai/insights/schemas";

interface ChatbotContentProps {
  className?: string;
  currentSection?: InsightSection | null;
  onClose?: () => void;
  /** When provided, shows expand/collapse button in header */
  onExpandClick?: () => void;
  /** When true, button shows collapse icon; when false, expand icon */
  isSidebarMode?: boolean;
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
  onExpandClick,
  isSidebarMode = false,
}: ChatbotContentProps) {
  const { currentBranch, isGlobalView } = useBranch();
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [historyWidth, setHistoryWidth] = useState(256);

  const handleHistoryWidthChange = useCallback((width: number) => {
    setHistoryWidth(width);
  }, []);

  // Use extracted hooks
  const {
    messages,
    isStreaming,
    currentStreamingContent,
    setMessages,
    sendMessage,
    regenerateMessage,
    clearMessages,
    loadMessagesFromSession,
  } = useChatMessages(currentSection || null);

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
    }
  }, [sessionError]);

  // Memoize initial config to prevent infinite loops
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
  }, [
    currentSession?.id,
    loadMessagesFromSession,
    isHistoryLoading,
    setMessages,
  ]);

  const handleNewSession = async () => {
    clearSession();
    clearMessages();
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

  // Use keyboard shortcuts hook
  useKeyboardShortcuts({
    showSettings,
    showHistory,
    setShowSettings,
    setShowHistory,
    handleNewSession,
  });

  const handleExport = () => {
    if (currentSession && messages.length > 0) {
      setShowExport(true);
    }
  };

  const handleClear = () => {
    if (confirm("¿Estás seguro de que deseas limpiar esta conversación?")) {
      clearMessages();
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
            onExpandClick={onExpandClick}
            isSidebarMode={isSidebarMode}
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
                  } else if (action === "regenerate") {
                    regenerateMessage(messageId);
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
            onSend={(msg, fileId) => sendMessage(msg, fileId)}
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

export type { ChatbotContentProps };
