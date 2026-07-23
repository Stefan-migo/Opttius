"use client";

import { Building2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BranchSelectorFormProps {
  branches: { id: string; name: string }[];
  formBranchId: string | null;
  effectiveBranchForForm: string | null;
  onBranchChange: (value: string) => void;
}

export default function BranchSelectorForm({
  branches,
  formBranchId,
  effectiveBranchForForm,
  onBranchChange,
}: BranchSelectorFormProps) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
        Sucursal
      </Label>
      <Select
        value={formBranchId ?? ""}
        onValueChange={(v) => onBranchChange(v || null)}
      >
        <SelectTrigger className="h-11 rounded-xl border-admin-border-primary/30 font-display font-bold text-[10px] tracking-widest uppercase">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-epoch-primary" />
            <SelectValue placeholder="Seleccione sucursal" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-admin-border-primary/20">
          {branches.map((b) => (
            <SelectItem
              className="font-display font-medium text-[10px] tracking-widest uppercase"
              key={b.id}
              value={b.id}
            >
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!effectiveBranchForForm && (
        <p className="text-[10px] text-admin-error font-medium">
          Debe seleccionar una sucursal para crear la cita
        </p>
      )}
    </div>
  );
}
