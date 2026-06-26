import type { ActionBlock as ActionBlockType } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

interface Props {
  block: ActionBlockType;
  onClick?: () => void;
}

export function ActionBlock({ block, onClick }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
        block.variant === "primary" &&
          "bg-epoch-accent text-epoch-surface hover:bg-epoch-accent/90",
        block.variant === "danger" && "bg-red-500 text-white hover:bg-red-600",
        block.variant === "ghost" &&
          "border border-gray-300 text-gray-700 hover:bg-gray-50",
      )}
      onClick={onClick}
    >
      {block.label}
    </button>
  );
}
