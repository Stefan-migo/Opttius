"use client";

import { useCallback, useMemo, useState } from "react";

import type { Block, BubbleState } from "@/lib/ai/types";

import { BubbleFloatingButton } from "./BubbleFloatingButton";
import { BubblePanel } from "./BubblePanel";

// Mock suggestions per-route (Phase 1 — no backend yet)
// ponytail: static suggestions, replace with Agent.getScreenSuggestions() in Phase 2.
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
        label: "📦 Productos más vendidos",
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

// Mock greeting per-route
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
  /**
   * Screen route injected by AgentContextProvider.
   * Used for contextual greetings and suggestions.
   */
  route?: string;
  branchName?: string;
}

/**
 * AgentBubble — state machine container for the Agent copilot.
 *
 * State transitions:
 *   collapsed + click → repose
 *   repose + message  → conversation
 *   conversation + close → collapsed
 *   notification + click → conversation (and clears badge)
 *   any + dock toggle → docked (or back to floating)
 */
export function AgentBubble({
  route = "/admin",
  branchName = "Sucursal",
}: AgentBubbleProps) {
  const [state, setState] = useState<BubbleState>("collapsed");
  const [badgeCount, setBadgeCount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Block[][]>([]);

  // ——— State transitions ———

  const handleOpen = useCallback(() => {
    if (state === "notification") {
      setBadgeCount(0);
    }
    setState("repose");
  }, [state]);

  const handleClose = useCallback(() => {
    setState("collapsed");
    // ponytail: saveSessionSummary will fire here in Phase 2
  }, []);

  const handleToggleDock = useCallback(() => {
    setState((prev) => (prev === "docked" ? "conversation" : "docked"));
  }, []);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;

    // If in repose, transition to conversation
    if (state === "repose") {
      setState("conversation");
    }

    // Add user message as a text block
    const userBlock: Block = { type: "text", content: text };
    setMessages((prev) => [...prev, [userBlock]]);
    setInputValue("");

    // Mock assistant response (Phase 1 — no backend)
    // ponytail: static echo response, replace with POST /api/agent/chat in Phase 2.
    setTimeout(() => {
      const reply: Block = {
        type: "text",
        content: `Recibí tu mensaje: "${text}". La integración con el backend del agente estará disponible en la próxima fase.`,
      };
      setMessages((prev) => [...prev, [reply]]);
    }, 500);
  }, [inputValue, state]);

  const handleAction = useCallback(
    (_action: string, _params?: Record<string, unknown>) => {
      // ponytail: handled in Phase 2 when tools are wired
    },
    [],
  );

  const handleAsk = useCallback((question: string) => {
    setInputValue(question);
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

  // ——— Render ———

  const isOpen =
    state === "repose" || state === "conversation" || state === "docked";

  return (
    <>
      {isOpen ? (
        <BubblePanel
          state={state === "docked" ? "docked" : "conversation"}
          title={title}
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          onClose={handleClose}
          onToggleDock={handleToggleDock}
          onAction={handleAction}
          suggestions={suggestions}
          inputDisabled={false}
        />
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
