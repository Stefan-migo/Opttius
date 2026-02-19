"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { posService } from "@/lib/api/services";
import { orderService } from "@/lib/api/services";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface POSRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber?: string;
  branchId?: string | null;
  onSuccess?: () => void;
}

export function POSRefundDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  branchId,
  onSuccess,
}: POSRefundDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [refundQuantities, setRefundQuantities] = useState<
    Record<string, number>
  >({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && orderId) {
      fetchOrderItems();
    } else {
      setOrderItems([]);
      setRefundQuantities({});
      setReason("");
      setError(null);
    }
  }, [open, orderId]);

  const fetchOrderItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const order = await orderService.getOrder(orderId);
      const items = (order as any)?.order_items ?? [];
      setOrderItems(items);
      const initial: Record<string, number> = {};
      items.forEach((item: OrderItem) => {
        initial[item.id] = 0;
      });
      setRefundQuantities(initial);
    } catch (err: any) {
      console.error("Error fetching order:", err);
      setError(err.message || "Error al cargar la orden");
      setOrderItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, value: number) => {
    setRefundQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, value),
    }));
  };

  const refundItems = orderItems
    .filter((item) => (refundQuantities[item.id] || 0) > 0)
    .map((item) => ({
      order_item_id: item.id,
      quantity: refundQuantities[item.id] || 0,
    }));

  const refundAmount = refundItems.reduce((sum, ref) => {
    const item = orderItems.find((i) => i.id === ref.order_item_id);
    if (!item) return sum;
    const unitPrice = item.total_price / item.quantity;
    return sum + unitPrice * ref.quantity;
  }, 0);

  const canSubmit =
    refundItems.length > 0 &&
    reason.trim().length > 0 &&
    refundItems.every((r) => {
      const item = orderItems.find((i) => i.id === r.order_item_id);
      return item && r.quantity <= item.quantity;
    });

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const result = await posService.processRefund(
        {
          order_id: orderId,
          items: refundItems,
          reason: reason.trim(),
          refund_type:
            refundItems.length < orderItems.length ? "partial" : "full",
        },
        branchId || undefined,
      );

      if (result?.success) {
        toast.success(
          `Devolución procesada: ${formatCurrency(result.refund_amount)}`,
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Error al procesar la devolución");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la devolución");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Devolución
          </DialogTitle>
          <DialogDescription>
            Selecciona los ítems a devolver y el motivo. El stock se revertirá
            automáticamente.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="py-4 text-red-600">{error}</div>
        ) : (
          <div className="space-y-4">
            {orderNumber && (
              <div className="text-sm text-gray-600">
                Orden:{" "}
                <span className="font-mono font-semibold">{orderNumber}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Ítems a devolver</Label>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {orderItems
                  .filter((item) => item.product_id)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {item.product_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Vendidos: {item.quantity} ×{" "}
                          {formatCurrency(item.unit_price)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={refundQuantities[item.id] || 0}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.id,
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-16 text-center"
                        />
                        <span className="text-xs text-gray-500">
                          / {item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                {orderItems.filter((i) => i.product_id).length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No hay ítems con producto (servicios no aplican devolución
                    de stock)
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="refund-reason">Motivo (requerido)</Label>
              <Textarea
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Producto defectuoso, cliente cambió de opinión..."
                className="mt-1"
                rows={2}
              />
            </div>

            {refundAmount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex justify-between font-semibold">
                  <span>Monto a devolver:</span>
                  <span>{formatCurrency(refundAmount)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Procesar Devolución
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
