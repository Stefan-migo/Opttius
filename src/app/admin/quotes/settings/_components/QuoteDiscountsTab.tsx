"use client";

import { Percent, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VolumeDiscount {
  min_amount: number;
  discount_percentage: number;
}

interface QuoteDiscountsTabProps {
  volumeDiscounts: VolumeDiscount[];
  onAddDiscount: () => void;
  onUpdateDiscount: (
    index: number,
    field: "min_amount" | "discount_percentage",
    value: number,
  ) => void;
  onRemoveDiscount: (index: number) => void;
}

export function QuoteDiscountsTab({
  volumeDiscounts,
  onAddDiscount,
  onUpdateDiscount,
  onRemoveDiscount,
}: QuoteDiscountsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Percent className="h-5 w-5 mr-2" />
          Descuentos por Volumen
        </CardTitle>
        <CardDescription>
          Configura descuentos automáticos según el monto total del
          presupuesto. Los descuentos se aplicarán automáticamente cuando
          el monto alcance el mínimo configurado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {volumeDiscounts?.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Percent className="h-12 w-12 mx-auto mb-4 text-admin-text-tertiary" />
              <p className="text-admin-text-tertiary mb-2">
                No hay descuentos configurados
              </p>
              <p className="text-xs text-admin-text-tertiary mb-4">
                Agrega descuentos por volumen para aplicar automáticamente
                según el monto del presupuesto
              </p>
              <Button variant="outline" onClick={onAddDiscount}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Primer Descuento
              </Button>
            </div>
          ) : (
            <>
              {volumeDiscounts?.map((discount, index) => (
                <div
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  key={index}
                >
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <Label>Monto Mínimo (CLP)</Label>
                      <Input
                        className="mt-1"
                        type="number"
                        value={discount.min_amount}
                        onChange={(e) =>
                          onUpdateDiscount(
                            index,
                            "min_amount",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Descuento (%)</Label>
                      <Input
                        className="mt-1"
                        step="0.1"
                        type="number"
                        value={discount.discount_percentage}
                        onChange={(e) =>
                          onUpdateDiscount(
                            index,
                            "discount_percentage",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                  </div>
                  <Button
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    size="icon"
                    variant="ghost"
                    onClick={() => onRemoveDiscount(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={onAddDiscount}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Descuento
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
