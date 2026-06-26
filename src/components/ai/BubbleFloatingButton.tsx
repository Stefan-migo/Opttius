"use client";

import type { BubbleState } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

interface BubbleFloatingButtonProps {
  state: BubbleState;
  badgeCount: number;
  onClick: () => void;
}

/**
 * Floating circle (56 px) fixed to the bottom-right corner.
 * Shows a badge counter when `badgeCount > 0` and a subtle pulse
 * animation when the bubble is in notification state.
 */
export function BubbleFloatingButton({
  state,
  badgeCount,
  onClick,
}: BubbleFloatingButtonProps) {
  const hasNotification = state === "notification" && badgeCount > 0;

  return (
    <button
      type="button"
      aria-label={
        hasNotification
          ? `${badgeCount} notificaciones del agente`
          : "Abrir agente"
      }
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center",
        "rounded-full bg-epoch-primary shadow-lg shadow-epoch-primary/25",
        "transition-transform duration-200 hover:scale-105 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-epoch-accent focus:ring-offset-2",
        hasNotification && "animate-[pulse_2s_ease-in-out_infinite]",
      )}
      onClick={onClick}
    >
      {/* Agent icon — sparkle */}
      <svg
        className="h-6 w-6 text-epoch-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        />
      </svg>

      {/* Badge counter — hidden when 0 */}
      <span
        className={cn(
          "absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center",
          "rounded-full bg-red-500 px-1 text-[10px] font-bold text-white",
          "transition-opacity duration-200",
          badgeCount > 0 ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        {badgeCount > 9 ? "9+" : badgeCount}
      </span>
    </button>
  );
}
