"use client";

import { CheckCircle2, Search, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Tool {
  name: string;
  description: string;
  category: string;
  parameters: unknown;
  requiresConfirmation?: boolean;
}

interface ToolBrowserProps {
  enabledTools: string[];
  onToolsChange: (tools: string[]) => void;
  onClose: () => void;
}

export function ToolBrowser({
  enabledTools,
  onToolsChange,
  onClose,
}: ToolBrowserProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolsByCategory, setToolsByCategory] = useState<
    Record<string, Tool[]>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/chat/tools");
      if (response.ok) {
        const data = await response.json();
        setTools(data.tools || []);
        setToolsByCategory(data.toolsByCategory || {});
      }
    } catch (error) {
      console.error("Error loading tools:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTool = (toolName: string) => {
    const newTools = enabledTools.includes(toolName)
      ? enabledTools.filter((t) => t !== toolName)
      : [...enabledTools, toolName];
    onToolsChange(newTools);
  };

  const filteredCategories = searchQuery
    ? Object.entries(toolsByCategory).filter(([category, categoryTools]) =>
        categoryTools.some(
          (tool) =>
            tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      )
    : Object.entries(toolsByCategory);

  return (
    <div className="flex flex-col h-full bg-admin-bg-primary">
      <div className="p-4 border-b border-admin-border-primary flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-admin-text-primary">
            Herramientas
          </h2>
          <p className="text-xs text-admin-text-secondary mt-1">
            {enabledTools.length} de {tools.length} habilitadas
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 border-b border-admin-border-primary">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-admin-text-secondary" />
          <Input
            className="pl-9"
            placeholder="Buscar herramientas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-admin-text-secondary">
              Cargando...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-admin-text-secondary">
              No se encontraron herramientas
            </div>
          ) : (
            filteredCategories.map(([category, categoryTools]) => {
              const filtered = searchQuery
                ? categoryTools.filter(
                    (tool) =>
                      tool.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      tool.description
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                  )
                : categoryTools;

              if (filtered.length === 0) return null;

              return (
                <div className="space-y-3" key={category}>
                  <h3 className="font-semibold text-admin-text-primary flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    {category}
                    <Badge className="ml-2" variant="outline">
                      {filtered.length}
                    </Badge>
                  </h3>

                  <div className="space-y-2">
                    {filtered.map((tool) => {
                      const isEnabled = enabledTools.includes(tool.name);
                      return (
                        <div
                          className={cn(
                            "p-3 rounded-lg border transition-colors cursor-pointer",
                            isEnabled
                              ? "bg-admin-bg-secondary border-admin-accent-primary"
                              : "bg-admin-bg-primary border-admin-border-primary hover:bg-admin-bg-secondary",
                          )}
                          key={tool.name}
                          onClick={() => toggleTool(tool.name)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm text-admin-text-primary">
                                  {tool.name}
                                </h4>
                                {isEnabled && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                )}
                                {tool.requiresConfirmation && (
                                  <Badge className="text-xs" variant="outline">
                                    Requiere confirmación
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-admin-text-secondary mt-1">
                                {tool.description}
                              </p>
                              {tool.parameters && (
                                <details className="mt-2">
                                  <summary className="text-xs text-admin-text-secondary cursor-pointer hover:text-admin-text-primary">
                                    Ver parámetros
                                  </summary>
                                  <pre className="mt-2 p-2 bg-admin-bg-primary rounded text-xs overflow-x-auto">
                                    {JSON.stringify(tool.parameters, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
