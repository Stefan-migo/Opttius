"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProductPricingSectionProps {
  price: string;
  priceIncludesTax: boolean;
  onFieldChange: (field: string, value: unknown) => void;
}

export function AddProductPricingSection({
  price,
  priceIncludesTax,
  onFieldChange,
}: ProductPricingSectionProps) {
  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Precio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
          <div>
            <Label htmlFor="price">Precio (CLP) *</Label>
            <Input
              required
              className="border-black/20"
              id="price"
              placeholder="15000"
              step="0.01"
              type="number"
              value={price}
              onChange={(e) => onFieldChange("price", e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <input
            checked={priceIncludesTax}
            className="h-4 w-4 rounded border-gray-300 text-epoch-primary focus:ring-epoch-primary"
            id="price_includes_tax"
            type="checkbox"
            onChange={(e) =>
              onFieldChange("price_includes_tax", e.target.checked)
            }
          />
          <Label
            className="text-sm font-normal cursor-pointer"
            htmlFor="price_includes_tax"
          >
            El precio ya incluye IVA
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
