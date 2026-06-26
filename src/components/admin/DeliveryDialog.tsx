"use client";

import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { formatCurrency } from "@/lib/utils";
import type { DeliveryError, WorkOrder } from "@/hooks/useWorkOrder";

interface DeliveryDialogProps {
  deliveryDialogOpen: boolean;
  setDeliveryDialogOpen: (open: boolean) => void;
  deliveryError: DeliveryError | null;
  setDeliveryError: (error: DeliveryError | null) => void;
  delivering: boolean;
  workOrder: WorkOrder | null;
  handleDeliver: () => Promise<void>;
}

export function DeliveryDialog({
  deliveryDialogOpen,
  setDeliveryDialogOpen,
  deliveryError,
  setDeliveryError,
  delivering,
  workOrder,
  handleDeliver,
}: DeliveryDialogProps) {
  const router = useRouter();

  return (
    <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Entregar Trabajo
          </DialogTitle>
          <DialogDescription>
            {deliveryError?.requiresPayment ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-800 mb-2">
                        Saldo Pendiente Detectado
                      </p>
                      <p className="text-red-700 mb-3">
                        {deliveryError.message}
                      </p>
                      <div className="bg-white rounded p-3 border border-red-200">
                        <p className="text-sm text-red-600 font-medium mb-1">
                          Saldo Pendiente:
                        </p>
                        <p className="text-2xl font-bold text-red-700">
                          {formatCurrency(deliveryError.balance || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  El cliente debe pagar el saldo pendiente antes de poder
                  entregar el trabajo.
                </p>
              </div>
            ) : (
              <div>
                <p className="mb-4">
                  ¿Está seguro de que desea marcar este trabajo como entregado?
                </p>
                {workOrder && workOrder.pos_order_id && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      El sistema verificará automáticamente que no haya saldo
                      pendiente antes de permitir la entrega.
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={delivering}
            variant="outline"
            onClick={() => {
              setDeliveryDialogOpen(false);
              setDeliveryError(null);
            }}
          >
            Cancelar
          </Button>
          {deliveryError?.requiresPayment ? (
            <Button
              onClick={() => {
                setDeliveryDialogOpen(false);
                setDeliveryError(null);
                // Redirect to POS to collect payment
                if (deliveryError.orderId) {
                  router.push(
                    `/admin/pos?orderId=${deliveryError.orderId}&collectPayment=true`,
                  );
                } else {
                  toast.info(
                    "Redirigiendo al POS para cobrar el saldo pendiente...",
                  );
                  router.push("/admin/pos");
                }
              }}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Cobrar Saldo Pendiente
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={delivering}
              onClick={handleDeliver}
            >
              {delivering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Entregando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Entrega
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
