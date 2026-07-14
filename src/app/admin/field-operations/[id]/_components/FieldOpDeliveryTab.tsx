"use client";

import { RefreshCw, Truck } from "lucide-react";
import { type SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";

interface WorkOrderItem {
  id: string;
  work_order_number: string;
  status: string;
  total_amount: number;
  payment_status?: string;
  frame_name?: string;
  lens_type?: string;
  lens_material?: string;
  lab_name?: string;
  customer?: { first_name?: string; last_name?: string; email?: string };
}

interface FieldOpDeliveryTabProps {
  readyForPickupOrders: WorkOrderItem[];
  deliverSelectedIds: Set<string>;
  deliverRecipient: string;
  deliverNotes: string;
  deliverLoading: boolean;
  onDeliverSelectedIdsChange: (
    updater: (prev: Set<string>) => Set<string>,
  ) => void;
  onDeliverRecipientChange: (value: SetStateAction<string>) => void;
  onDeliverNotesChange: (value: SetStateAction<string>) => void;
  onDeliver: () => Promise<void>;
}

export function FieldOpDeliveryTab({
  readyForPickupOrders,
  deliverSelectedIds,
  deliverRecipient,
  deliverNotes,
  deliverLoading,
  onDeliverSelectedIdsChange,
  onDeliverRecipientChange,
  onDeliverNotesChange,
  onDeliver,
}: FieldOpDeliveryTabProps) {
  return (
    <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] p-4 sm:p-6">
      <h3 className="flex items-center gap-2 text-admin-text-primary font-semibold mb-4">
        <Truck className="h-5 w-5 shrink-0" />
        Entrega en empresa
      </h3>
      {readyForPickupOrders.length === 0 ? (
        <p className="text-admin-text-tertiary text-sm">
          No hay trabajos listos para retiro (ready_for_pickup). Los
          trabajos aparecerán aquí cuando estén listos para entrega.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <Label className="text-admin-text-primary text-sm">
              Trabajos a entregar
            </Label>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-admin-border-primary/20 rounded-lg p-2">
              {readyForPickupOrders.map((wo) => (
                <label
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#AE000010] cursor-pointer"
                  key={wo.id}
                >
                  <input
                    checked={deliverSelectedIds.has(wo.id)}
                    className="rounded"
                    type="checkbox"
                    onChange={(e) => {
                      onDeliverSelectedIdsChange((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(wo.id);
                        else next.delete(wo.id);
                        return next;
                      });
                    }}
                  />
                  <span className="text-admin-text-primary text-sm">
                    {wo.work_order_number} —{" "}
                    {wo.customer
                      ? `${wo.customer.first_name || ""} ${wo.customer.last_name || ""}`.trim() ||
                        "—"
                      : "—"}{" "}
                    ({formatPrice(wo.total_amount)})
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-admin-text-primary text-sm">
              Nombre del receptor *
            </Label>
            <Input
              className="mt-1 h-11 min-h-[44px] border-admin-border-primary/30"
              placeholder="Ej: Juan Pérez"
              value={deliverRecipient}
              onChange={(e) => onDeliverRecipientChange(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-admin-text-primary text-sm">
              Notas (opcional)
            </Label>
            <Input
              className="mt-1 h-11 min-h-[44px] border-admin-border-primary/30"
              placeholder="Observaciones de la entrega"
              value={deliverNotes}
              onChange={(e) => onDeliverNotesChange(e.target.value)}
            />
          </div>
          <Button
            className="min-h-[44px] rounded-xl bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23]"
            disabled={
              deliverLoading ||
              deliverSelectedIds.size === 0 ||
              !deliverRecipient.trim()
            }
            onClick={onDeliver}
          >
            {deliverLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Registrar entrega
          </Button>
        </div>
      )}
    </div>
  );
}
