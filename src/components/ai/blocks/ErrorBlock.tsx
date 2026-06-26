import type { ErrorBlock as ErrorBlockType } from "@/lib/ai/types";

interface Props {
  block: ErrorBlockType;
}

export function ErrorBlock({ block }: Props) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <span>{block.content}</span>
    </div>
  );
}
