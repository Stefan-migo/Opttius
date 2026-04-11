"use client";

import { useEffect, useCallback } from "react";

import { Banknote, CreditCard, Smartphone, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { POSPaymentMethod } from "../types";

interface POSPaymentMethodsProps {
  value: POSPaymentMethod;
  onChange: (method: POSPaymentMethod) => void;
  disabled?: boolean;
  showLabels?: boolean;
  compact?: boolean;
  enableKeyboardShortcuts?: boolean;
}

// Shortcut to payment method mapping
const shortcutToMethod: Record<string, POSPaymentMethod> = {
  F1: "cash",
  F2: "debit_card",
  F3: "credit_card",
  F4: "transfer",
  F5: "agreement",
};

const paymentMethods: {
  id: POSPaymentMethod;
  label: string;
  icon: typeof Banknote;
  shortcut?: string;
  description: string;
}[] = [
  {
    id: "cash",
    label: "Efectivo",
    icon: Banknote,
    shortcut: "F1",
    description: "Pago en efectivo",
  },
  {
    id: "debit_card",
    label: "Débito",
    icon: CreditCard,
    shortcut: "F2",
    description: "Tarjeta de débito",
  },
  {
    id: "credit_card",
    label: "Crédito",
    icon: CreditCard,
    shortcut: "F3",
    description: "Tarjeta de crédito",
  },
  {
    id: "transfer",
    label: "Transferencia",
    icon: Smartphone,
    shortcut: "F4",
    description: "Transferencia bancaria",
  },
  {
    id: "agreement",
    label: "Convenio",
    icon: Building2,
    shortcut: "F5",
    description: "Pago con convenio institucional",
  },
];

export function POSPaymentMethods({
  value,
  onChange,
  disabled = false,
  showLabels = true,
  compact = false,
  enableKeyboardShortcuts = true,
}: POSPaymentMethodsProps) {
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enableKeyboardShortcuts || disabled) return;

      const method = shortcutToMethod[event.key];
      if (method) {
        event.preventDefault();
        onChange(method);
      }
    },
    [enableKeyboardShortcuts, disabled, onChange],
  );

  // Set up keyboard listener
  useEffect(() => {
    if (enableKeyboardShortcuts && !disabled) {
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [handleKeyDown, enableKeyboardShortcuts, disabled]);

  if (compact) {
    // Compact: single row of buttons
    return (
      <div className="flex gap-2">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = value === method.id;

          return (
            <TooltipProvider key={method.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex-1 gap-2 transition-all",
                      isSelected && "ring-2 ring-primary ring-offset-2",
                    )}
                    onClick={() => onChange(method.id)}
                    disabled={disabled}
                  >
                    <Icon className="h-4 w-4" />
                    {showLabels && (
                      <span className="hidden sm:inline">{method.label}</span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">{method.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {method.description}
                  </p>
                  {method.shortcut && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Atajo: <kbd className="font-mono">{method.shortcut}</kbd>
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  // Full: grid layout with more details
  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = value === method.id;

          return (
            <Tooltip key={method.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/50",
                    disabled && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={() => onChange(method.id)}
                  disabled={disabled}
                >
                  <Icon
                    className={cn(
                      "h-6 w-6",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "font-medium text-sm",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {method.label}
                  </span>
                  {method.shortcut && (
                    <kbd className="text-xs text-muted-foreground font-mono">
                      {method.shortcut}
                    </kbd>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">{method.label}</p>
                <p className="text-xs text-muted-foreground">
                  {method.description}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
