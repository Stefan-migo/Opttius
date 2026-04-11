"use client";

import { Calculator, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface POSCashInputProps {
  value: number;
  onChange: (value: number) => void;
  total: number;
  disabled?: boolean;
}

const quickAmounts = [10000, 20000];

export function POSCashInput({
  value,
  onChange,
  total,
  disabled = false,
}: POSCashInputProps) {
  const change = Math.max(0, value - total);
  const isSufficient = value >= total;

  const handleQuickAmount = (amount: number) => {
    onChange(amount);
  };

  const handleSetExact = () => {
    onChange(total);
  };

  const handleReset = () => {
    onChange(0);
  };

  return (
    <div className="space-y-4">
      {/* Quick amounts - only 10000 and 20000 in one row */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Montos rápidos</Label>
        <div className="flex gap-2">
          {quickAmounts.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 font-mono"
              onClick={() => handleQuickAmount(amount)}
              disabled={disabled}
            >
              {formatCurrency(amount)}
            </Button>
          ))}
        </div>
      </div>

      {/* Action buttons - Exacto and Revertir */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1 gap-2"
          onClick={handleSetExact}
          disabled={disabled}
        >
          <Calculator className="h-4 w-4" />
          Monto exacto
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={handleReset}
          disabled={disabled}
          title="Revertir"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <Label htmlFor="cash-received">Monto Recibido</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            id="cash-received"
            type="number"
            min={0}
            step={100}
            value={value || ""}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="pl-8 text-lg font-mono"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Change display */}
      <div
        className={`
          p-4 rounded-lg border-2 text-center transition-all
          ${
            isSufficient
              ? "bg-green-50 border-green-200 dark:bg-green-950/20"
              : "bg-muted/50 border-border"
          }
        `}
      >
        <p className="text-sm text-muted-foreground">Vuelto</p>
        <p
          className={`
            text-2xl font-bold font-mono
            ${isSufficient ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}
          `}
        >
          {formatCurrency(change)}
        </p>
        {!isSufficient && (
          <p className="text-xs text-muted-foreground mt-1">
            Faltan {formatCurrency(total - value)}
          </p>
        )}
      </div>
    </div>
  );
}
