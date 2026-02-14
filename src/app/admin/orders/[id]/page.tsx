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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex gap-2">
          <Link href="/admin/cash-register">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Caja
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No se encontró la orden
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex gap-2">
        <Link href="/admin/cash-register">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Caja
          </Button>
        </Link>
      </div>

      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Orden #{order.order_number}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {formatDateTime(order.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
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
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">
                  Motivo de Anulación
                </p>
                <p className="text-red-800 mt-1">{order.cancellation_reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="font-medium">
                {order.customer_name || order.email || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{order.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Método de Pago</p>
              <p className="font-medium">{paymentMethodLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Montos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Subtotal</p>
              <p className="font-medium">
                {formatCurrency(order.subtotal ?? order.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="font-semibold text-lg">
                {formatCurrency(order.total_amount)}
              </p>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monto Pagado</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(paidAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Saldo Pendiente</span>
                <span
                  className={`font-bold ${pendingAmount > 0 ? "text-red-600" : "text-gray-600"}`}
                >
                  {formatCurrency(pendingAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Pagos */}
      {order.order_payments && order.order_payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Ref. Fiscal</TableHead>
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
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(payment.paid_at)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(Number(payment.amount))}
                      </TableCell>
                      <TableCell>
                        {paymentMethodMap[payment.payment_method] ||
                          payment.payment_method ||
                          "N/A"}
                      </TableCell>
                      <TableCell>
                        {payment.notes ||
                          (idx === 0
                            ? "Abono inicial"
                            : "Pago de saldo pendiente")}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600">
                        {payment.payment_reference || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      {order.order_items && order.order_items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Artículos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.order_items.map((item: any, idx: number) => (
                <div
                  key={item.id || idx}
                  className="flex justify-between items-center py-2 border-b last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-semibold">
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
