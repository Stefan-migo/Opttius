"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

interface PriceResult {
  price: number;
  cost?: number;
}

interface StockInfo {
  inStock: boolean;
  availableQuantity: number;
  odMessage?: string;
  osMessage?: string;
}

interface Props {
  priceResult: PriceResult | null;
  stockInfo: StockInfo;
  quantity: number;
  loadingPrice: boolean;
  onQuantityChange: (q: number) => void;
  onRequestEncargo: () => void;
}

export function ContactLensPriceStock({
  priceResult,
  stockInfo,
  quantity,
  loadingPrice,
  onQuantityChange,
  onRequestEncargo,
}: Props) {
  return (
    <div className="space-y-4">
      <Separator />

      {/* Quantity */}
      <div>
        <Label>Cantidad (cajas)</Label>
        <div className="flex gap-2 mt-1">
          {[1, 2, 3, 4, 5].map((q) => (
            <Button
              key={q}
              size="sm"
              variant={quantity === q ? "default" : "outline"}
              onClick={() => onQuantityChange(q)}
            >
              {q}
            </Button>
          ))}
        </div>
      </div>

      {/* Price */}
      {priceResult && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">Precio por caja:</span>
            <span className="font-semibold">
              {formatCurrency(priceResult.price)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">
              Total ({quantity} caja{quantity > 1 ? "s" : ""}):
            </span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(priceResult.price * quantity)}
            </span>
          </div>
        </div>
      )}

      {loadingPrice && (
        <div className="text-center text-muted-foreground">
          Calculando precio...
        </div>
      )}

      {/* Stock */}
      <div
        className={`p-3 rounded-lg ${stockInfo.inStock ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}
      >
        <div className="flex items-center gap-2">
          {stockInfo.inStock ? (
            <>
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="font-medium text-green-700">
                ✅ Disponible
              </span>
              <span className="text-sm text-green-600">
                ({stockInfo.availableQuantity} cajas)
              </span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="font-medium text-amber-700">
                ⚠️ Sin stock
              </span>
              <span className="text-sm text-amber-600">(2-3 días)</span>
            </>
          )}
        </div>
        {!stockInfo.inStock && (
          <div className="mt-2">
            <Button
              className="w-full"
              size="sm"
              variant="outline"
              onClick={onRequestEncargo}
            >
              Solicitar encargo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
