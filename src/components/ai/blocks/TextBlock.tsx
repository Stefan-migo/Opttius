import type { TextBlock as TextBlockType } from "@/lib/ai/types";

interface Props {
  block: TextBlockType;
}

export function TextBlock({ block }: Props) {
  return (
    <div className="rounded-xl bg-white p-3 text-sm leading-relaxed text-gray-800 shadow-sm">
      {block.content}
    </div>
  );
}
