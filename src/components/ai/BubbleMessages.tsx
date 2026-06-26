"use client";

import { useEffect, useRef } from "react";

import type { Block } from "@/lib/ai/types";

import { BlockRenderer } from "./blocks/BlockRenderer";

interface BubbleMessagesProps {
  messages: Block[][];
  onAction?: (action: string, params?: Record<string, unknown>) => void;
}

/**
 * Scrollable container that renders message groups via BlockRenderer.
 * Auto-scrolls to the bottom when new messages arrive.
 */
export function BubbleMessages({ messages, onAction }: BubbleMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-gray-400">
        No hay conversación activa
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((group, i) => (
        <div key={i} className="space-y-2">
          {group.map((block, j) => (
            <BlockRenderer key={j} block={block} onAction={onAction} />
          ))}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
