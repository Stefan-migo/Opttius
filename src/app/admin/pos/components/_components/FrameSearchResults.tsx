"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";

import type { POSProduct } from "../POSAdvancedSale.types";

interface FrameSearchResultsProps {
  results: POSProduct[];
  loading: boolean;
  onSelect: (frame: POSProduct) => void;
  emptyMessage?: string;
}

export function FrameSearchResults({
  results,
  loading,
  onSelect,
  emptyMessage = "No se encontraron armazones",
}: FrameSearchResultsProps) {
  if (loading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Buscando...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[200px]">
      <div className="space-y-2 mt-2">
        {results.map((frame) => (
          <div
            className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-muted-foreground"
            key={frame.id}
            onClick={() => onSelect(frame)}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{frame.name}</div>
                {frame.sku && (
                  <div className="text-xs text-muted-foreground">
                    SKU: {frame.sku}
                  </div>
                )}
                {frame.brand && (
                  <div className="text-xs text-muted-foreground">
                    Marca: {frame.brand}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {formatCurrency(frame.price || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Stock: {frame.inventory_quantity || 0}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
