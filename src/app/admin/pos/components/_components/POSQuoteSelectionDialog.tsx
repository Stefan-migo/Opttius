"use client";

import { ArrowRight, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { POSQuote } from "../../types";

interface POSQuoteSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotes: POSQuote[];
  loadingQuotes: boolean;
  selectedQuote: POSQuote | null;
  onSelectQuote: (quote: POSQuote) => void;
}

/**
 * POSQuoteSelectionDialog — quote picker dialog for POS customer search.
 *
 * Extracted from POSCustomerSearch.tsx.
 */
export function POSQuoteSelectionDialog({
  open,
  onOpenChange,
  quotes,
  loadingQuotes,
  selectedQuote,
  onSelectQuote,
}: POSQuoteSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full mt-2 gap-2" size="sm" variant="outline">
          <FileText className="h-4 w-4" />
          Seleccionar Presupuesto
          <ArrowRight className="h-3 w-3 ml-auto" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Presupuestos del Cliente</DialogTitle>
          <DialogDescription>
            Selecciona un presupuesto para agregar al carrito
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loadingQuotes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            quotes.map((quote) => (
              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedQuote?.id === quote.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground"
                }`}
                key={quote.id}
                onClick={() => {
                  onSelectQuote(quote);
                  onOpenChange(false);
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{quote.quote_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(quote.created_at).toLocaleDateString("es-CL")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      ${quote.total_amount?.toLocaleString("es-CL") || "0"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {quote.status}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
