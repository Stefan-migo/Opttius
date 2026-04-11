"use client";

import { useEffect, useMemo, useRef } from "react";

import { Separator } from "@/components/ui/separator";

import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: string;
  toolCalls?: unknown;
  toolResults?: unknown;
  metadata?: unknown;
}

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  onMessageAction?: (
    messageId: string,
    action: "copy" | "edit" | "delete" | "regenerate",
  ) => void;
}

import { formatRelativeDate } from "@/lib/utils";

function groupMessagesByDate(
  messages: Message[],
): Array<{ date: string; messages: Message[] }> {
  const groups: Record<string, Message[]> = {};

  messages.forEach((message) => {
    if (!message.timestamp) {
      if (!groups["Sin fecha"]) {
        groups["Sin fecha"] = [];
      }
      groups["Sin fecha"].push(message);
      return;
    }

    const date = formatRelativeDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
  });

  return Object.entries(groups).map(([date, messages]) => ({
    date,
    messages,
  }));
}

export function MessageList({
  messages,
  isStreaming,
  onMessageAction,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const groupedMessages = useMemo(
    () => groupMessagesByDate(messages),
    [messages],
  );

  useEffect(() => {
    // Use setTimeout to avoid infinite loops
    const timeoutId = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages.length, isStreaming]);

  return (
    <div className="min-h-full">
      <div className="p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-admin-text-secondary py-12">
            <p className="text-sm font-medium">
              Inicia una conversación con el asistente
            </p>
            <p className="text-xs mt-2 opacity-70">
              Puedes preguntar sobre productos, pedidos, clientes y más
            </p>
          </div>
        )}

        {groupedMessages.map((group, groupIndex) => (
          <div className="space-y-2" key={group.date}>
            {groupIndex > 0 && <Separator className="my-4" />}

            <div className="sticky top-0 z-10 flex items-center gap-2 mb-2">
              <Separator className="flex-1" />
              <span className="text-xs text-admin-text-secondary bg-admin-bg-primary px-2 py-1 rounded">
                {group.date}
              </span>
              <Separator className="flex-1" />
            </div>

            {group.messages.map((message) => (
              <MessageBubble
                content={message.content}
                key={message.id}
                metadata={message.metadata}
                role={message.role}
                timestamp={message.timestamp}
                toolCalls={message.toolCalls}
                toolResults={message.toolResults}
                onCopy={() => onMessageAction?.(message.id, "copy")}
                onDelete={() => onMessageAction?.(message.id, "delete")}
                onEdit={() => onMessageAction?.(message.id, "edit")}
                onRegenerate={() => onMessageAction?.(message.id, "regenerate")}
              />
            ))}
          </div>
        ))}

        {isStreaming && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
