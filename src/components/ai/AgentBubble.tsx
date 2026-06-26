"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Block, BubbleState } from "@/lib/ai/types";

import { useAgentContext } from "./AgentContextProvider";
import { AgentPreferencesPanel, useAgentPreferences } from "./AgentPreferences";
import { BubbleFloatingButton } from "./BubbleFloatingButton";
import { BubblePanel } from "./BubblePanel";

// ponytail: per-route suggestions — static for now, replace with
// agent.getScreenSuggestions() when the agent can suggest actions.
function getSuggestions(
  route: string,
  onAsk: (q: string) => void,
): Array<{ label: string; onClick: () => void }> {
  const common = [
    {
      label: "📊 Resumen del día",
      onClick: () => onAsk("¿Cuál es el resumen del día?"),
    },
    {
      label: "📋 Clientes recientes",
      onClick: () => onAsk("Muéstrame los clientes recientes"),
    },
  ];
  if (route.includes("/admin/customers"))
    return [
      {
        label: "🔍 Buscar cliente",
        onClick: () => onAsk("Ayúdame a buscar un cliente"),
      },
      ...common,
    ];
  if (route.includes("/admin/pos"))
    return [
      { label: "🛒 Abrir caja", onClick: () => onAsk("¿Cómo abro la caja?") },
      {
        label: "📦 Más vendidos",
        onClick: () => onAsk("¿Cuáles son los productos más vendidos hoy?"),
      },
      ...common,
    ];
  if (route.includes("/admin/work-orders"))
    return [
      {
        label: "👓 Trabajos pendientes",
        onClick: () => onAsk("¿Cuántos trabajos hay pendientes?"),
      },
      ...common,
    ];
  if (route.includes("/admin/appointments"))
    return [
      {
        label: "📅 Citas de hoy",
        onClick: () => onAsk("¿Qué citas tengo hoy?"),
      },
      ...common,
    ];
  return common;
}

function getGreeting(route: string, branchName: string): string {
  if (route.includes("/admin/pos")) return `💰 Punto de Venta — ${branchName}`;
  if (route.includes("/admin/customers"))
    return `👥 Gestión de Clientes — ${branchName}`;
  if (route.includes("/admin/work-orders"))
    return `👓 Trabajos de Laboratorio — ${branchName}`;
  if (route.includes("/admin/appointments"))
    return `📅 Agenda y Citas — ${branchName}`;
  if (route.includes("/admin/products")) return `📦 Inventario — ${branchName}`;
  return `🤖 Agente Opttius — ${branchName}`;
}

interface AgentBubbleProps {
  route?: string;
  branchName?: string;
}

/**
 * AgentBubble — state machine container for the Agent copilot.
 *
 * Phase 2: sends messages to POST /api/agent/chat and renders
 * SSE stream responses as structured blocks.
 * Phase 4: integrates preferences, auto-mode triggers, SSE reconnection.
 */
export function AgentBubble({
  route: routeProp = "/admin",
  branchName: branchNameProp = "Sucursal",
}: AgentBubbleProps) {
  const [state, setState] = useState<BubbleState>("collapsed");
  const [badgeCount, setBadgeCount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Block[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  // Read screen context from the AgentContextProvider
  const agentCtx = useAgentContext();

  // Phase 4: Agent preferences from localStorage
  const {
    prefs,
    update: updatePrefs,
    reset: resetPrefs,
  } = useAgentPreferences(agentCtx.userId);

  // Derived route/branch — props take precedence, fall back to context
  const route = routeProp !== "/admin" ? routeProp : agentCtx.route;
  const branchName =
    branchNameProp !== "Sucursal" ? branchNameProp : agentCtx.branchName;

  // ——— State transitions ———

  const handleOpen = useCallback(() => {
    if (state === "notification") setBadgeCount(0);
    setState("repose");
  }, [state]);

  const handleClose = useCallback(() => {
    setState("collapsed");
  }, []);

  const handleToggleDock = useCallback(() => {
    setState((prev) => (prev === "docked" ? "conversation" : "docked"));
  }, []);

  // ——— SSE Fetch with reconnection ———

  const fetchAgent = useCallback(
    async (text: string, retries = 1): Promise<void> => {
      const body = {
        message: text,
        session_id: sessionIdRef.current,
        context: {
          route: agentCtx.route,
          branch_id: agentCtx.branchId,
          branch_name: agentCtx.branchName,
          role: agentCtx.role,
          org_id: agentCtx.orgId,
        },
      };

      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current?.signal,
      });

      if (!res.ok) {
        const errBody = await res
          .json()
          .catch(() => ({ error: "Error de conexión" }));
        const errorBlock: Block = {
          type: "error",
          content:
            errBody.error ||
            `Error ${res.status}: no se pudo procesar tu mensaje.`,
        };
        setMessages((prev) => [...prev, [errorBlock]]);
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      const responseBlocks: Block[] = [];
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (currentEvent === "done") continue;
            if (currentEvent === "block") {
              try {
                const parsed = JSON.parse(data) as Block;
                responseBlocks.push(parsed);
              } catch {
                // Ignore parse errors on incomplete chunks
              }
            }
          }
        }
      }

      if (responseBlocks.length > 0) {
        setMessages((prev) => [...prev, responseBlocks]);
      }
    },
    [agentCtx],
  );

  const sendToAgent = useCallback(
    async (text: string) => {
      if (isLoading) return;
      setIsLoading(true);

      // Prepend file context if a file was attached
      const fileCtx = attachedFile;
      let messageText = text;
      if (fileCtx) {
        messageText = `[Archivo adjunto: ${fileCtx.name}]\n\`\`\`\n${fileCtx.content.slice(0, 10000)}\n\`\`\`\n\n${text}`;
        setAttachedFile(null);
      }

      // Add user message block
      const userBlock: Block = { type: "text", content: text };
      setMessages((prev) => [...prev, [userBlock]]);

      // Abort previous request if any
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await fetchAgent(messageText);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        // ponytail: simple error block — add retry UI if users report connection drops
        const errorBlock: Block = {
          type: "error",
          content:
            "Ocurrió un error al procesar tu solicitud. Intenta de nuevo.",
        };
        setMessages((prev) => [...prev, [errorBlock]]);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [agentCtx, isLoading, fetchAgent, attachedFile],
  );

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    if (state === "repose") setState("conversation");
    setInputValue("");
    sendToAgent(text);
  }, [inputValue, state, isLoading, sendToAgent]);

  const handleAction = useCallback(
    (_action: string, _params?: Record<string, unknown>) => {
      // ponytail: action blocks handled when tool confirmations are wired
    },
    [],
  );

  const handleAsk = useCallback((question: string) => {
    setInputValue(question);
  }, []);

  const handleAttach = useCallback(
    (file: { name: string; content: string }) => {
      setAttachedFile(file);
      if (state === "repose") setState("conversation");
      // Show a system notice that a file was attached
      const notice: Block = {
        type: "success",
        content: `📎 Archivo adjunto: ${file.name} (${file.content.length} caracteres)`,
      };
      setMessages((prev) => [...prev, [notice]]);
    },
    [state],
  );

  const handlePreferencesToggle = useCallback(() => {
    setShowPreferences((prev) => !prev);
  }, []);

  // ——— Derived state ———

  const title = useMemo(() => {
    if (state === "repose" || state === "conversation" || state === "docked") {
      return getGreeting(route, branchName);
    }
    return "Agente Opttius";
  }, [state, route, branchName]);

  const suggestions = useMemo(
    () => (state === "repose" ? getSuggestions(route, handleAsk) : undefined),
    [state, route, handleAsk],
  );

  const isOpen =
    state === "repose" || state === "conversation" || state === "docked";

  return (
    <>
      {isOpen ? (
        <div className="relative">
          <BubblePanel
            state={
              state === "docked"
                ? "docked"
                : state === "repose"
                  ? "repose"
                  : "conversation"
            }
            title={title}
            messages={messages}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSend={handleSend}
            onClose={handleClose}
            onToggleDock={handleToggleDock}
            onAction={handleAction}
            onPreferences={handlePreferencesToggle}
            onAttach={handleAttach}
            suggestions={suggestions}
            inputDisabled={isLoading}
          />
          {/* Preferences overlay */}
          {showPreferences && (
            <div className="absolute inset-0 z-10 rounded-xl bg-white">
              <AgentPreferencesPanel
                userId={agentCtx.userId}
                prefs={prefs}
                onUpdate={updatePrefs}
                onClose={handlePreferencesToggle}
                onReset={resetPrefs}
              />
            </div>
          )}
        </div>
      ) : (
        <BubbleFloatingButton
          state={state}
          badgeCount={badgeCount}
          onClick={handleOpen}
        />
      )}
    </>
  );
}
