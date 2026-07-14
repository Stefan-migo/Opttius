"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";

interface POMPaymentSectionProps {
  paymentMethod: string;
  cashReceived: number;
  cartLength: number;
  total: number;
  change: number;
  onPaymentMethodChange: (value: string) => void;
  onCashReceivedChange: (value: number) => void;
  onQuickCash: (amount: number) => void;
  onOpenPaymentDialog: () => void;
}

export function POMPaymentSection({
  paymentMethod,
  cashReceived,
  cartLength,
  total,
  change,
  onPaymentMethodChange,
  onCashReceivedChange,
  onQuickCash,
  onOpenPaymentDialog,
}: POMPaymentSectionProps) {
  const quickCashAmounts = [10000, 20000];

  return (
    <div className="border-t p-4 space-y-4 flex-shrink-0">
      {/* Quick Cash Buttons (only show for cash payment) */}
      {paymentMethod === "cash" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Monto rápido:</p>
          <div className="flex flex-wrap gap-1">
            {quickCashAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => onQuickCash(amount)}
              >
                ${amount.toLocaleString("es-CL")}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Cash Input */}
      {paymentMethod === "cash" && (
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Efectivo recibido:
          </label>
          <input
            type="number"
            className="w-full p-2 border rounded-lg text-lg font-semibold"
            value={cashReceived || ""}
            onChange={(e) => onCashReceivedChange(Number(e.target.value) || 0)}
            placeholder="$0"
          />
          {cashReceived > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Vuelto:</span>
              <span className="font-semibold">
                {formatCurrency(change)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payment Method Selector with Tooltips */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Método de pago:</p>
        <TooltipProvider>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    paymentMethod === "cash" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => onPaymentMethodChange("cash")}
                  className="flex-1"
                >
                  Efectivo
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Presiona F1</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    paymentMethod === "debit_card" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => onPaymentMethodChange("debit_card")}
                  className="flex-1"
                >
                  Débito
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Presiona F2</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    paymentMethod === "credit_card"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => onPaymentMethodChange("credit_card")}
                  className="flex-1"
                >
                  Crédito
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Presiona F3</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={
                    paymentMethod === "transfer" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => onPaymentMethodChange("transfer")}
                  className="flex-1"
                >
                  Transf.
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Presiona F4</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Complete Sale Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="w-full text-lg py-6"
              disabled={cartLength === 0}
              onClick={onOpenPaymentDialog}
            >
              Cobrar {formatCurrency(total)}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ctrl + Enter</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
