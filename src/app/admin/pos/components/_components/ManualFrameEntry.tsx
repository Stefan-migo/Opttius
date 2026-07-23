"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ManualFrameEntryProps {
  title: string;
  titleClassName?: string;
  nameValue: string;
  skuValue: string;
  onNameChange: (value: string) => void;
  onSkuChange: (value: string) => void;
}

export function ManualFrameEntry({
  title,
  titleClassName,
  nameValue,
  skuValue,
  onNameChange,
  onSkuChange,
}: ManualFrameEntryProps) {
  return (
    <div className="space-y-3 pt-4 border-t">
      <h4 className={`font-medium ${titleClassName ?? ""}`}>{title}</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nombre/Descripción</Label>
          <Input
            placeholder="Ej: Marco del cliente"
            value={nameValue}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div>
          <Label>SKU/Código</Label>
          <Input
            placeholder="Opcional"
            value={skuValue}
            onChange={(e) => onSkuChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
