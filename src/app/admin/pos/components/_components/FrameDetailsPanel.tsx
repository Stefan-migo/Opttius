"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

import type { POSProduct } from "../POSAdvancedSale.types";

interface FrameDetailsPanelProps {
  frame: POSProduct;
  onRemove: () => void;
  title: string;
  variant?: "blue" | "green";
}

export function FrameDetailsPanel({
  frame,
  onRemove,
  title,
  variant = "blue",
}: FrameDetailsPanelProps) {
  const isBlue = variant === "blue";
  const borderClass = isBlue
    ? "border-blue-200 bg-blue-50 dark:bg-blue-900/20"
    : "border-green-200 bg-green-50 dark:bg-green-900/20";
  const textClass = isBlue
    ? "text-blue-700 dark:text-blue-300"
    : "text-green-700 dark:text-green-300";

  return (
    <div className={`p-3 border rounded-lg ${borderClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`font-medium ${textClass}`}>{title}</div>
          <div className="text-sm">{frame.name}</div>
          {frame.brand && (
            <div className="text-xs text-muted-foreground">
              Marca: {frame.brand}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className={`font-semibold ${textClass}`}>
            {formatCurrency(frame.price || 0)}
          </div>
          <Button
            className="text-red-500 hover:text-red-700"
            size="sm"
            variant="ghost"
            onClick={onRemove}
          >
            Quitar
          </Button>
        </div>
      </div>
    </div>
  );
}
