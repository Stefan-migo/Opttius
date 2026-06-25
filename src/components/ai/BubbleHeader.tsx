"use client";

import type { BubbleState } from "@/lib/ai/types";

interface BubbleHeaderProps {
  state: BubbleState;
  title: string;
  onClose: () => void;
  onToggleDock: () => void;
}

export function BubbleHeader({
  state,
  title,
  onClose,
  onToggleDock,
}: BubbleHeaderProps) {
  const isDocked = state === "docked";

  return (
    <div className="flex items-center justify-between rounded-t-xl border-b border-gray-100 bg-epoch-primary px-4 py-3">
      <h3 className="text-sm font-semibold text-epoch-accent">{title}</h3>
      <div className="flex items-center gap-1">
        {/* Dock toggle */}
        <button
          type="button"
          aria-label={isDocked ? "Desfijar panel" : "Fijar panel"}
          className="rounded-lg p-1.5 text-epoch-accent/70 transition-colors hover:bg-white/10 hover:text-epoch-accent"
          onClick={onToggleDock}
        >
          {isDocked ? (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
          )}
        </button>

        {/* Close button */}
        <button
          type="button"
          aria-label="Cerrar agente"
          className="rounded-lg p-1.5 text-epoch-accent/70 transition-colors hover:bg-white/10 hover:text-epoch-accent"
          onClick={onClose}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
