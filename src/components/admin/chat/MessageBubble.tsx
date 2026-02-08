"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Bot,
  User,
  Copy,
  Check,
  Edit2,
  Trash2,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCallDisplay } from "./ToolCallDisplay";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: string;
  toolCalls?: any;
  toolResults?: any;
  metadata?: any;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
}

function renderInlineMarkdown(
  text: string,
  keyPrefix: string = "",
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];

  // Process inline elements: bold, italic, inline code, links
  const inlineRegex =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;
  let matchIndex = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`${keyPrefix}text-${matchIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>,
      );
    }

    const fullMatch = match[0];

    if (match[1]) {
      // Inline code: `code`
      parts.push(
        <code
          key={`${keyPrefix}code-${matchIndex}`}
          className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-primary font-bold"
        >
          {fullMatch.slice(1, -1)}
        </code>,
      );
    } else if (match[2]) {
      // Bold: **text**
      parts.push(
        <strong
          key={`${keyPrefix}bold-${matchIndex}`}
          className="font-extrabold text-slate-900 dark:text-white"
        >
          {fullMatch.slice(2, -2)}
        </strong>,
      );
    } else if (match[3]) {
      // Italic: *text*
      parts.push(
        <em
          key={`${keyPrefix}italic-${matchIndex}`}
          className="italic opacity-90"
        >
          {fullMatch.slice(1, -1)}
        </em>,
      );
    } else if (match[4]) {
      // Link: [text](url)
      const linkMatch = fullMatch.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={`${keyPrefix}link-${matchIndex}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-bold decoration-primary/30"
          >
            {linkMatch[1]}
          </a>,
        );
      }
    }

    lastIndex = match.index + fullMatch.length;
    matchIndex++;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`${keyPrefix}text-end`}>{text.substring(lastIndex)}</span>,
    );
  }

  return parts.length > 0
    ? parts
    : [<span key={`${keyPrefix}empty`}>{text}</span>];
}

function renderMarkdown(content: string) {
  const parts: React.ReactNode[] = [];

  // First, extract code blocks to protect them from other processing
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const segments: Array<{
    type: "text" | "codeBlock";
    content: string;
    lang?: string;
  }> = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: content.substring(lastIndex, match.index),
      });
    }
    segments.push({ type: "codeBlock", content: match[2], lang: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.substring(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", content });
  }

  segments.forEach((segment, segIndex) => {
    if (segment.type === "codeBlock") {
      parts.push(
        <pre
          key={`codeblock-${segIndex}`}
          className="bg-slate-950 text-slate-100 p-4 rounded-xl overflow-x-auto my-3 text-[13px] font-mono shadow-2xl border border-white/5"
        >
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10 opacity-50 uppercase text-[10px] font-bold tracking-widest">
            <span>{segment.lang || "code"}</span>
          </div>
          <code>{segment.content}</code>
        </pre>,
      );
    } else {
      // Process text line by line
      const lines = segment.content.split("\n");

      lines.forEach((line, lineIndex) => {
        const trimmedLine = line.trim();
        const lineKey = `${segIndex}-${lineIndex}`;

        // Heading 2: ## text
        if (trimmedLine.startsWith("## ")) {
          const headingContent = trimmedLine.substring(3);
          parts.push(
            <h2
              key={`h2-${lineKey}`}
              className="text-lg font-bold mt-5 mb-2.5 text-slate-900 dark:text-white"
            >
              {renderInlineMarkdown(headingContent, `h2-${lineKey}-`)}
            </h2>,
          );
        }
        // Heading 3: ### text
        else if (trimmedLine.startsWith("### ")) {
          const headingContent = trimmedLine.substring(4);
          parts.push(
            <h3
              key={`h3-${lineKey}`}
              className="text-base font-bold mt-4 mb-2 text-slate-800 dark:text-slate-100"
            >
              {renderInlineMarkdown(headingContent, `h3-${lineKey}-`)}
            </h3>,
          );
        }
        // Heading 1: # text
        else if (trimmedLine.startsWith("# ")) {
          const headingContent = trimmedLine.substring(2);
          parts.push(
            <h1
              key={`h1-${lineKey}`}
              className="text-xl font-black mt-6 mb-3 text-slate-950 dark:text-white underline decoration-primary/20 underline-offset-4"
            >
              {renderInlineMarkdown(headingContent, `h1-${lineKey}-`)}
            </h1>,
          );
        }
        // Unordered list: - text or * text
        else if (trimmedLine.match(/^[-*]\s+/)) {
          const listContent = trimmedLine.replace(/^[-*]\s+/, "");
          parts.push(
            <div
              key={`ul-${lineKey}`}
              className="flex items-start gap-3 ml-2 my-1.5"
            >
              <span className="text-primary font-black mt-0.5">•</span>
              <span className="text-slate-700 dark:text-slate-300">
                {renderInlineMarkdown(listContent, `ul-${lineKey}-`)}
              </span>
            </div>,
          );
        }
        // Ordered list: 1. text
        else if (trimmedLine.match(/^\d+\.\s+/)) {
          const numMatch = trimmedLine.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            parts.push(
              <div
                key={`ol-${lineKey}`}
                className="flex items-start gap-3 ml-2 my-1.5"
              >
                <span className="text-primary font-bold min-w-[1.2em]">
                  {numMatch[1]}.
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {renderInlineMarkdown(numMatch[2], `ol-${lineKey}-`)}
                </span>
              </div>,
            );
          }
        }
        // Empty line
        else if (trimmedLine === "") {
          parts.push(<div key={`br-${lineKey}`} className="h-3" />);
        }
        // Regular paragraph
        else {
          parts.push(
            <p
              key={`p-${lineKey}`}
              className="my-1.5 leading-relaxed text-slate-700 dark:text-slate-300"
            >
              {renderInlineMarkdown(line, `p-${lineKey}-`)}
            </p>,
          );
        }
      });
    }
  });

  return parts.length > 0 ? parts : <span>{content}</span>;
}

export function MessageBubble({
  role,
  content,
  timestamp,
  toolCalls,
  toolResults,
  metadata,
  onCopy,
  onEdit,
  onDelete,
  onRegenerate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";
  const isSystem = role === "system";
  const isTool = role === "tool";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (isSystem) {
    return null;
  }

  const toolCallsData = toolCalls || metadata?.toolCalls;
  const toolResultsData = toolResults || metadata?.toolResults;

  return (
    <div
      className={cn(
        "flex flex-col mb-8 group animate-in fade-in slide-in-from-bottom-2 duration-500",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "flex gap-3 max-w-[90%]",
          isUser ? "flex-row-reverse" : "flex-row",
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
            isUser
              ? "bg-primary text-white"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-primary shadow-slate-200/50 dark:shadow-none",
          )}
        >
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>

        {/* Bubble */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div
            className={cn(
              "rounded-2xl px-5 py-3.5 relative shadow-sm transition-all shadow-slate-200/50 dark:shadow-none",
              isUser
                ? "bg-primary text-white rounded-tr-none font-medium ml-4"
                : isTool
                  ? "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 font-mono text-xs rounded-tl-none mr-4"
                  : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-tl-none mr-4 backdrop-blur-sm",
            )}
          >
            <div
              className={cn(
                "text-[14.5px] whitespace-pre-wrap break-words",
                isUser
                  ? "selection:bg-white/30 [&_span]:text-[var(--accent)]"
                  : "selection:bg-primary/20",
              )}
            >
              {renderMarkdown(content)}
            </div>

            {(() => {
              const toolCallsArray = Array.isArray(toolCallsData)
                ? toolCallsData
                : toolCallsData
                  ? [toolCallsData]
                  : [];
              const hasError = toolCallsArray.some((tc: any, index: number) => {
                const result =
                  toolResultsData?.[tc.id] || toolResultsData?.[index];
                return result && result.success === false;
              });

              if (hasError) {
                // Log the error to console as requested
                toolCallsArray.forEach((tc: any, index: number) => {
                  const result =
                    toolResultsData?.[tc.id] || toolResultsData?.[index];
                  if (result && result.success === false) {
                    console.error(
                      `Tool Execution Error [${tc.name}]:`,
                      result.error || "Unknown error",
                      result,
                    );
                  }
                });

                return (
                  <ToolCallDisplay
                    toolCalls={toolCallsArray}
                    toolResults={toolResultsData}
                    className="mt-4 border-t border-red-100 dark:border-red-900/30 pt-3"
                  />
                );
              }
              return null;
            })()}
          </div>

          {/* Footer actions & Timestamp */}
          <div
            className={cn(
              "flex items-center gap-3 px-1.5 transition-all duration-300",
              isUser ? "flex-row-reverse" : "flex-row",
              "opacity-0 group-hover:opacity-100",
            )}
          >
            {timestamp && (
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                {new Date(timestamp).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}

            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                onClick={handleCopy}
                title="Copiar texto"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>

              {isUser && onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                  onClick={onEdit}
                  title="Editar mensaje"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              )}

              {!isUser && onRegenerate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                  onClick={onRegenerate}
                  title="Regenerar respuesta"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
              )}

              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/5 transition-colors"
                  onClick={onDelete}
                  title="Eliminar mensaje"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {!isUser && !isTool && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-primary/50 uppercase tracking-widest ml-1">
                <Sparkles className="w-3 h-3" />
                Experto Óptico
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
