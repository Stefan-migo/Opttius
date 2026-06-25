"use client";

import { useRouter } from "next/navigation";

import type { NavigationBlock as NavigationBlockType } from "@/lib/ai/types";

interface Props {
  block: NavigationBlockType;
}

export function NavigationBlock({ block }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-epoch-primary transition-colors hover:bg-gray-50"
      onClick={() => router.push(block.path)}
    >
      <span className="mr-2">→</span>
      {block.label}
    </button>
  );
}
