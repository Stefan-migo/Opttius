"use client";

import type { Block, BubbleState } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

import { BubbleHeader } from "./BubbleHeader";
import { BubbleInput } from "./BubbleInput";
import { BubbleMessages } from "./BubbleMessages";
import { BubbleSuggestions } from "./BubbleSuggestions";

interface Suggestion {
  label: string;
  onClick: () => void;
}

interface BubblePanelProps {
  state: Extract<BubbleState, "repose" | "conversation" | "docked">;
  title: string;
  messages: Block[][];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
  onToggleDock: () => void;
  onAction?: (action: string, params?: Record<string, unknown>) => void;
  onPreferences?: () => void;
  onAttach?: (file: { name: string; content: string }) => void;
  suggestions?: Suggestion[];
  inputDisabled?: boolean;
}

/**
 * Agent Bubble expanded panel. Two visual modes:
 * - `floating`: 480px overlay panel, max-h-[720px]
 * - `docked`: fixed side panel 460px, full viewport height
 */
export function BubblePanel({
  state,
  title,
  messages,
  inputValue,
  onInputChange,
  onSend,
  onClose,
  onToggleDock,
  onAction,
  onPreferences,
  onAttach,
  suggestions,
  inputDisabled = false,
}: BubblePanelProps) {
  const isDocked = state === "docked";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-300",
        isDocked
          ? "fixed right-0 top-0 z-40 h-full w-[460px] rounded-none border-l border-gray-200"
          : "fixed bottom-24 right-6 z-50 w-[480px] max-h-[720px]",
      )}
    >
      <BubbleHeader
        state={state}
        title={title}
        onClose={onClose}
        onToggleDock={onToggleDock}
        onPreferences={onPreferences}
      />

      <BubbleMessages messages={messages} onAction={onAction} />

      {/* Suggestions shown in repose state */}
      {state === "repose" && suggestions && suggestions.length > 0 && (
        <BubbleSuggestions suggestions={suggestions} />
      )}

      <BubbleInput
        value={inputValue}
        onChange={onInputChange}
        onSend={onSend}
        onAttach={onAttach}
        disabled={inputDisabled}
        placeholder={
          state === "repose"
            ? "Haz una pregunta o selecciona una opción..."
            : "Escribe un mensaje..."
        }
      />
    </div>
  );
}
