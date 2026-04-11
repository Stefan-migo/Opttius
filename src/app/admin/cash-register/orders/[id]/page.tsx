"use client";

import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranch } from "@/hooks/useBranch";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getBranchHeader } from "@/lib/utils/branch";

interface OrderDetail {
  id: string;
  order_number: string;
  created_at: string;
  status: "completed" | "cancelled" | "processing";
  payment_status: "paid" | "partial" | "pending" | "refunded";
  email?: string;
  payment_method_type?: string;
  total_amount: number;
  cancellation_reason?: string | null;
  order_items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { currentBranchId } = useBranch();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirigir a la vista principal de órdenes
    router.push(`/admin/orders/${orderId}`);
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const headers = {
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch(`/api/admin/orders/${orderId}`, { headers });
      if (response.ok) {
        const data = (await response.json()) as { order: OrderDetail };
        setOrder(data.order);
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al cargar la orden");
      }
    } catch (error: unknown) {
      console.error("Error fetching order:", error);
      toast.error("Error al cargar la orden");
    } finally {
      setLoading(false);
    }
  };

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
        <Link href="/admin/cash-register">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
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
      <Link href="/admin/cash-register">
        <Button variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </Link>

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
                {/* C3-render-debug */}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug: Check if order is cancelled but no reason */}
      {order.status === "cancelled" && !order.cancellation_reason && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900">
                  DEBUG: Orden cancelada sin motivo
                </p>
                <p className="text-yellow-800 mt-1">
                  status: {order.status}, reason:{" "}
                  {order.cancellation_reason === null
                    ? "null"
                    : order.cancellation_reason === undefined
                      ? "undefined"
                      : `"${order.cancellation_reason}"`}
                </p>
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
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{order.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Método de Pago</p>
              <p className="font-medium">
                {order.payment_method_type === "cash" && "Efectivo"}
                {order.payment_method_type === "debit" && "Débito"}
                {order.payment_method_type === "debit_card" && "Débito"}
                {order.payment_method_type === "credit" && "Crédito"}
                {order.payment_method_type === "credit_card" && "Crédito"}
                {order.payment_method_type === "deposit" && "Abono"}
                {order.payment_method_type === "card" && "Tarjeta"}
              </p>
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
                {formatCurrency(order.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="font-semibold text-lg">
                {formatCurrency(order.total_amount)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      {order.order_items && order.order_items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Artículos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.order_items.map((item, idx) => (
                <div
                  className="flex justify-between items-center py-2 border-b last:border-b-0"
                  key={idx}
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
