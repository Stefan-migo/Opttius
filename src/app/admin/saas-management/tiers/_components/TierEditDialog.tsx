"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIER_FEATURE_LABELS } from "@/lib/saas/tier-constants";

interface EditData {
  price_monthly: number;
  max_branches: number;
  max_users: number;
  max_customers: number;
  max_products: number;
  features: Record<string, boolean>;
}

interface TierEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tierName: string;
  editData: EditData;
  onEditDataChange: (data: Partial<EditData>) => void;
  onSave: () => void;
  saving: boolean;
}

export function TierEditDialog({
  open,
  onOpenChange,
  tierName,
  editData,
  onEditDataChange,
  onSave,
  saving,
}: TierEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Tier: {tierName}</DialogTitle>
          <DialogDescription>
            Modifica los límites y características del tier
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Precio Mensual (CLP)</Label>
            <Input
              type="number"
              value={editData.price_monthly}
              onChange={(e) =>
                onEditDataChange({
                  price_monthly: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                "max_branches",
                "max_users",
                "max_customers",
                "max_products",
              ] as const
            ).map((key) => (
              <div key={key}>
                <Label>
                  Máx.{" "}
                  {key.replace("max_", "").charAt(0).toUpperCase() +
                    key.replace("max_", "").slice(1)}{" "}
                  (0 = ilimitado)
                </Label>
                <Input
                  type="number"
                  value={editData[key]}
                  onChange={(e) =>
                    onEditDataChange({ [key]: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            ))}
          </div>
          <div>
            <Label>Features</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.keys(TIER_FEATURE_LABELS).map((key) => (
                <label
                  className="flex items-center gap-2 cursor-pointer"
                  key={key}
                >
                  <input
                    checked={editData.features[key] || false}
                    type="checkbox"
                    onChange={(e) =>
                      onEditDataChange({
                        features: {
                          ...editData.features,
                          [key]: e.target.checked,
                        },
                      })
                    }
                  />
                  <span className="text-sm">
                    {
                      TIER_FEATURE_LABELS[
                        key as keyof typeof TIER_FEATURE_LABELS
                      ]
                    }
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={saving} onClick={onSave}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
