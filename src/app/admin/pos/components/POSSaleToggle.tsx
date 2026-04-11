"use client";

import { Zap, ShoppingBag, Waves } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SaleMode = "quick" | "advanced";

interface POSSaleToggleProps {
  mode: SaleMode;
  onModeChange: (mode: SaleMode) => void;
  disabled?: boolean;
}

export function POSSaleToggle({
  mode,
  onModeChange,
  disabled = false,
}: POSSaleToggleProps) {
  const modes: {
    id: SaleMode;
    label: string;
    icon: typeof ShoppingBag;
    description: string;
  }[] = [
    {
      id: "quick",
      label: "Venta Rápida",
      icon: ShoppingBag,
      description: "Productos de inventario",
    },
    {
      id: "advanced",
      label: "Venta Avanzada",
      icon: Waves,
      description: "Con lentes y recetas",
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {modes.map((m) => (
          <Tooltip key={m.id}>
            <TooltipTrigger asChild>
              <Button
                variant={mode === m.id ? "default" : "ghost"}
                size="sm"
                className={`
                  relative gap-2 transition-all
                  ${
                    mode === m.id
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-600 hover:text-gray-900"
                  }
                `}
                onClick={() => onModeChange(m.id)}
                disabled={disabled}
              >
                <m.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{m.label}</span>

                {/* Active indicator */}
                {mode === m.id && (
                  <span className="absolute inset-0 rounded-lg ring-2 ring-primary ring-offset-2" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-medium">{m.label}</p>
              <p className="text-xs text-muted-foreground">{m.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

/**
 * Compact version for mobile - shows as dropdown
 */
export function POSSaleToggleMobile({
  mode,
  onModeChange,
  disabled = false,
}: POSSaleToggleProps) {
  const modes: { id: SaleMode; label: string; icon: typeof ShoppingBag }[] = [
    { id: "quick", label: "Venta Rápida", icon: ShoppingBag },
    { id: "advanced", label: "Venta Avanzada", icon: Waves },
  ];

  const currentMode = modes.find((m) => m.id === mode);

  return (
    <div className="flex items-center gap-2">
      {modes.map((m) => (
        <Button
          key={m.id}
          variant={mode === m.id ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => onModeChange(m.id)}
          disabled={disabled}
        >
          <m.icon className="h-4 w-4" />
          <span className="sm:hidden">{mode === m.id ? m.label : ""}</span>
        </Button>
      ))}
    </div>
  );
}
