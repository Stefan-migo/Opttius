"use client";

import { CheckCircle2, Loader2, Wrench, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

interface ToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

interface ToolCallDisplayProps {
  toolCalls?: ToolCall[];
  toolResults?: unknown;
  isExecuting?: boolean;
  className?: string;
}

export function ToolCallDisplay({
  toolCalls,
  toolResults,
  isExecuting = false,
  className,
}: ToolCallDisplayProps) {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2 mt-2", className)}>
      {toolCalls.map((toolCall, index) => {
        const result = toolResults?.[toolCall.id] || toolResults?.[index];
        const hasResult = result !== undefined;
        const isSuccess = result?.success !== false;

        return (
          <div
            className={cn(
              "flex items-start gap-2 p-2 rounded-md text-sm",
              "bg-admin-bg-secondary border border-admin-border-primary",
            )}
            key={toolCall.id || index}
          >
            {isExecuting && !hasResult ? (
              <Loader2 className="w-4 h-4 animate-spin text-admin-text-secondary mt-0.5" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Wrench className="w-3 h-3 text-admin-text-secondary" />
                <span className="font-medium text-admin-text-primary">
                  {toolCall.name}
                </span>
              </div>

              {toolCall.arguments &&
                Object.keys(toolCall.arguments).length > 0 && (
                  <div className="mt-1 text-xs text-admin-text-secondary">
                    <details className="cursor-pointer">
                      <summary className="hover:text-admin-text-primary">
                        Ver parámetros
                      </summary>
                      <pre className="mt-1 p-2 bg-admin-bg-primary rounded text-xs overflow-x-auto">
                        {JSON.stringify(toolCall.arguments, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

              {hasResult && (
                <div className="mt-2 text-xs">
                  {isSuccess ? (
                    <div className="text-green-600 dark:text-green-400">
                      ✓ Ejecutado correctamente
                    </div>
                  ) : (
                    <div className="text-red-600 dark:text-red-400">
                      ✗ Error: {result?.error || "Error desconocido"}
                    </div>
                  )}

                  {result?.data && (
                    <details className="mt-1 cursor-pointer">
                      <summary className="hover:text-admin-text-primary text-admin-text-secondary">
                        Ver resultado
                      </summary>
                      <pre className="mt-1 p-2 bg-admin-bg-primary rounded text-xs overflow-x-auto max-h-40 overflow-y-auto">
                        {typeof result.data === "string"
                          ? result.data
                          : JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
