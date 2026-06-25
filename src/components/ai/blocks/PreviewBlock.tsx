import type { PreviewBlock as PreviewBlockType } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

interface Props {
  block: PreviewBlockType;
  onAction?: (action: string, params?: Record<string, unknown>) => void;
}

export function PreviewBlock({ block, onAction }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-md bg-epoch-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-epoch-primary">
          {block.entity}
        </span>
        <span className="text-[11px] text-gray-400">
          #{block.id.slice(0, 8)}
        </span>
      </div>
      <h4 className="text-sm font-semibold text-gray-900">{block.title}</h4>
      {block.subtitle && (
        <p className="mt-0.5 text-xs text-gray-500">{block.subtitle}</p>
      )}
      {block.actions && block.actions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {block.actions.map((a, i) => (
            <button
              key={i}
              type="button"
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                a.variant === "primary" &&
                  "bg-epoch-accent text-epoch-surface hover:bg-epoch-accent/90",
                a.variant === "danger" &&
                  "bg-red-500 text-white hover:bg-red-600",
                a.variant === "ghost" &&
                  "border border-gray-300 text-gray-600 hover:bg-gray-50",
              )}
              onClick={() => onAction?.(a.action, a.params)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
