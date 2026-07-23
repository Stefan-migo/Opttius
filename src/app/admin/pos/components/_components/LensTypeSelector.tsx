"use client";

import { CircleDot,Glasses } from "lucide-react";

import { Label } from "@/components/ui/label";

import type { OrderFormData } from "../POSAdvancedSale.types";

interface LensTypeSelectorProps {
  lensType: OrderFormData["lens_type"];
  onChange: (lensType: OrderFormData["lens_type"]) => void;
  onClearContact?: () => void;
}

export function LensTypeSelector({
  lensType,
  onChange,
  onClearContact,
}: LensTypeSelectorProps) {
  return (
    <div>
      <Label>¿Qué tipo de lente necesita?</Label>
      <div className="grid grid-cols-2 gap-3 mt-2">
        {/* Lentes Ópticos */}
        <div
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            lensType === "vision"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          }`}
          onClick={() => {
            onChange("vision");
            onClearContact?.();
          }}
        >
          <div className="flex items-center gap-3">
            <Glasses className="h-8 w-8 text-primary" />
            <div>
              <div className="font-medium">Lentes Ópticos</div>
              <div className="text-xs text-muted-foreground">
                Armazón + Cristales tallados
              </div>
            </div>
          </div>
        </div>

        {/* Lentes de Contacto */}
        <div
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            lensType === "contact"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          }`}
          onClick={() => onChange("contact")}
        >
          <div className="flex items-center gap-3">
            <CircleDot className="h-8 w-8 text-primary" />
            <div>
              <div className="font-medium">Lentes de Contacto</div>
              <div className="text-xs text-muted-foreground">
                Lentillas/blandas
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
