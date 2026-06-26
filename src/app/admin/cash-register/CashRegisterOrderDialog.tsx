"use client";

import { RefreshCw } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

interface OrderDialogProps {
  orderActionDialog: "cancel" | "delete" | null;
  selectedOrderForAction: unknown;
  orderActionReason: string;
  refundMethod: string;
  processingOrderAction: boolean;
  setOrderActionDialog: (v: "cancel" | "delete" | null) => void;
  setSelectedOrderForAction: (v: unknown) => void;
  setOrderActionReason: (v: string) => void;
  setRefundMethod: (v: string) => void;
  handleCancelOrder: (
    orderId: string,
    reason: string,
    method: string,
  ) => Promise<void>;
  handleDeleteOrder: (orderId: string) => Promise<void>;
}

export function CashRegisterOrderDialog(props: OrderDialogProps) {
  const {
    orderActionDialog,
    selectedOrderForAction,
    orderActionReason,
    refundMethod,
    processingOrderAction,
    setOrderActionDialog,
    setSelectedOrderForAction,
    setOrderActionReason,
    setRefundMethod,
    handleCancelOrder,
    handleDeleteOrder,
  } = props;

  return (
    <Dialog
      open={orderActionDialog !== null}
      onOpenChange={(open) => {
        if (!open) {
          setOrderActionDialog(null);
          setSelectedOrderForAction(null);
          setOrderActionReason("");
          setRefundMethod("cash");
        }
      }}
    >
      <DialogContent
        aria-describedby={orderActionDialog ? "order-action-desc" : undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {orderActionDialog === "cancel" ? "Anular Venta" : "Eliminar Venta"}
          </DialogTitle>
          <DialogDescription id="order-action-desc">
            {orderActionDialog === "cancel"
              ? "Confirma la anulación de esta venta. Se creará una nota de crédito, se revertirá el stock y se actualizará la caja."
              : "Esta acción eliminará la venta permanentemente del sistema."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {selectedOrderForAction && (
            <>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <p>
                  <span className="font-semibold">Orden:</span>{" "}
                  {selectedOrderForAction.order_number}
                </p>
                <p>
                  <span className="font-semibold">Monto:</span>{" "}
                  {formatCurrency(selectedOrderForAction.total_amount)}
                </p>
                <p>
                  <span className="font-semibold">Cliente:</span>{" "}
                  {selectedOrderForAction.customer_email}
                </p>
              </div>

              {orderActionDialog === "cancel" && (
                <>
                  <p className="text-sm text-gray-600">
                    ¿Estás seguro de que deseas anular esta venta? Se creará una
                    nota de crédito, se revertirá el stock y se actualizará la
                    caja.
                  </p>
                  <div>
                    <Label>Razón de la anulación *</Label>
                    <Input
                      placeholder="Ej: Cliente solicitó cambio de producto"
                      value={orderActionReason}
                      onChange={(e) => setOrderActionReason(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Método de reembolso *</Label>
                    <Select
                      value={refundMethod}
                      onValueChange={setRefundMethod}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="debit">Débito</SelectItem>
                        <SelectItem value="credit">Crédito</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {orderActionDialog === "delete" && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-red-800">
                    ⚠️ Acción Irreversible
                  </p>
                  <p className="text-sm text-red-700">
                    ¿Estás seguro de que deseas ELIMINAR esta venta
                    permanentemente? Esta acción no se puede deshacer.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={processingOrderAction}
            variant="outline"
            onClick={() => {
              setOrderActionDialog(null);
              setSelectedOrderForAction(null);
              setOrderActionReason("");
              setRefundMethod("cash");
            }}
          >
            Cancelar
          </Button>
          <Button
            disabled={
              processingOrderAction ||
              (orderActionDialog === "cancel" && !orderActionReason)
            }
            variant={orderActionDialog === "delete" ? "destructive" : "default"}
            onClick={() => {
              if (orderActionDialog === "cancel") {
                handleCancelOrder(
                  selectedOrderForAction.id,
                  orderActionReason,
                  refundMethod,
                );
              } else if (orderActionDialog === "delete") {
                handleDeleteOrder(selectedOrderForAction.id);
              }
            }}
          >
            {processingOrderAction ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : orderActionDialog === "delete" ? (
              "Eliminar Permanentemente"
            ) : (
              "Anular Venta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
