"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { posService } from "@/lib/api/services";
import { orderService } from "@/lib/api/services";
import { formatCurrency } from "@/lib/utils";

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
      const order = (await orderService.getOrder(orderId)) as {
        order_items?: OrderItem[];
      } | null;
      const items = order?.order_items ?? [];
      setOrderItems(items);
      const initial: Record<string, number> = {};
      items.forEach((item: OrderItem) => {
        initial[item.id] = 0;
      });
      setRefundQuantities(initial);
    } catch (err: unknown) {
      console.error("Error fetching order:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Error al cargar la orden";
      setError(errorMessage);
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
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al procesar la devolución";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
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
                      className="flex items-center justify-between p-3"
                      key={item.id}
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
                          className="w-16 text-center"
                          max={item.quantity}
                          min={0}
                          type="number"
                          value={refundQuantities[item.id] || 0}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.id,
                              parseInt(e.target.value) || 0,
                            )
                          }
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
                className="mt-1"
                id="refund-reason"
                placeholder="Ej: Producto defectuoso, cliente cambió de opinión..."
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {refundAmount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Monto a devolver:</span>
                  <span>{formatCurrency(refundAmount)}</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Si el cliente pagó parcialmente, el monto real no excederá su
                  abono.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
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
