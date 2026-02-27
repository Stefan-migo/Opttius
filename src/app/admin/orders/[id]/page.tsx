"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowLeft, AlertCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { currentBranchId } = useBranch();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const headers = {
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch(`/api/admin/orders/${orderId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al cargar la orden");
      }
    } catch (error: any) {
      console.error("Error fetching order:", error);
      toast.error("Error al cargar la orden");
    } finally {
      setLoading(false);
    }
  };

  const paidAmount =
    order?.order_payments?.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0,
    ) || 0;
  const pendingAmount = Math.max(0, (order?.total_amount || 0) - paidAmount);

  const paymentMethodMap: Record<string, string> = {
    cash: "Efectivo",
    debit: "Tarjeta Débito",
    credit: "Tarjeta Crédito",
    transfer: "Transferencia",
    check: "Cheque",
  };

  const paymentMethodLabel =
    order?.order_payments && order.order_payments.length > 0
      ? Array.from(
          new Set(order.order_payments.map((p: any) => p.payment_method)),
        ).join(", ")
      : order?.mp_payment_method === "cash"
        ? "Efectivo"
        : order?.mp_payment_method === "debit"
          ? "Débito"
          : order?.mp_payment_method === "credit"
            ? "Crédito"
            : order?.mp_payment_method === "card"
              ? "Tarjeta"
              : order?.mp_payment_method === "transfer"
                ? "Transferencia"
                : order?.mp_payment_method || "N/A";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4 p-4 sm:p-6 pb-28 sm:pb-6">
        <div className="flex gap-2">
          <Link href="/admin/cash-register">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Caja
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6 text-center text-sm sm:text-base text-muted-foreground">
            No se encontró la orden
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 pb-28 sm:pb-6 lg:pb-6">
      <div className="flex gap-2">
        <Link href="/admin/cash-register">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] sm:min-h-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Caja
          </Button>
        </Link>
      </div>

      {/* Card 1: Orden #ORD-xxx */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">
                Orden #{order.order_number}
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {formatDateTime(order.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Badge
                variant={
                  order.status === "completed"
                    ? "default"
                    : order.status === "cancelled"
                      ? "destructive"
                      : "outline"
                }
              >
                {order.status === "completed" && "Completada"}
                {order.status === "cancelled" && "Anulada"}
                {order.status === "processing" && "Procesando"}
              </Badge>
              <Badge
                variant={
                  order.payment_status === "paid"
                    ? "default"
                    : order.payment_status === "partial"
                      ? "secondary"
                      : "outline"
                }
              >
                {order.payment_status === "paid" && "Pagada"}
                {order.payment_status === "partial" && "Parcial"}
                {order.payment_status === "pending" && "Pendiente"}
                {order.payment_status === "refunded" && "Reembolsada"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cancellation Reason */}
      {order.status === "cancelled" && order.cancellation_reason && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30">
          <CardContent className="pt-4 sm:pt-6 space-y-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-semibold text-red-900 dark:text-red-200">
                  Motivo de Anulación
                </p>
                <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 mt-1 break-words">
                  {order.cancellation_reason}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card 2: Información */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Cliente</p>
            <p className="text-sm sm:text-base font-medium break-words">
              {order.customer_name || order.email || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Email</p>
            <p className="text-sm sm:text-base font-medium break-all">
              {order.email || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Método de Pago
            </p>
            <p className="text-sm sm:text-base font-medium">
              {paymentMethodLabel}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Montos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Montos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Subtotal</p>
            <p className="text-sm sm:text-base font-medium">
              {formatCurrency(order.subtotal ?? order.total_amount)}
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
            <p className="text-base sm:text-lg font-semibold">
              {formatCurrency(order.total_amount)}
            </p>
          </div>
          <div className="pt-3 border-t space-y-2">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-muted-foreground">Monto Pagado</span>
              <span className="font-medium text-green-600">
                {formatCurrency(paidAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-muted-foreground">Saldo Pendiente</span>
              <span
                className={`font-bold ${pendingAmount > 0 ? "text-red-600" : "text-muted-foreground"}`}
              >
                {formatCurrency(pendingAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Historial de Pagos */}
      {order.order_payments && order.order_payments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="overflow-x-auto">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Fecha</TableHead>
                    <TableHead className="text-xs sm:text-sm">Monto</TableHead>
                    <TableHead className="text-xs sm:text-sm">Método</TableHead>
                    <TableHead className="text-xs sm:text-sm">
                      Descripción
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">
                      Ref. Fiscal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...(order.order_payments || [])]
                    .sort(
                      (a: any, b: any) =>
                        new Date(a.paid_at).getTime() -
                        new Date(b.paid_at).getTime(),
                    )
                    .map((payment: any, idx: number) => (
                      <TableRow key={payment.id || idx}>
                        <TableCell className="text-xs sm:text-sm whitespace-nowrap py-3">
                          {formatDateTime(payment.paid_at)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm font-semibold py-3">
                          {formatCurrency(Number(payment.amount))}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-3">
                          {paymentMethodMap[payment.payment_method] ||
                            payment.payment_method ||
                            "N/A"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-3 max-w-[120px] sm:max-w-none truncate sm:whitespace-normal">
                          {payment.notes ||
                            (idx === 0
                              ? "Abono inicial"
                              : "Pago de saldo pendiente")}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-right text-muted-foreground py-3">
                          {payment.payment_reference || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      {order.order_items && order.order_items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Artículos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.order_items.map((item: any, idx: number) => (
                <div
                  key={item.id || idx}
                  className="flex justify-between items-start sm:items-center gap-3 py-3 border-b last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium break-words">
                      {item.product_name}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="text-sm sm:text-base font-semibold shrink-0">
                    {formatCurrency(item.total_price)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
