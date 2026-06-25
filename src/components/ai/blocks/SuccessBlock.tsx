import type { SuccessBlock as SuccessBlockType } from "@/lib/ai/types";

interface Props {
  block: SuccessBlockType;
}

export function SuccessBlock({ block }: Props) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{block.content}</span>
    </div>
  );
}
