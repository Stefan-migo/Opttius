"use client";

import { Package } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

function getOrderStatusBadge(status: string) {
  type BadgeVariant =
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "healty"
    | null
    | undefined;
  const config: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: "outline", label: "Pendiente" },
    processing: { variant: "secondary", label: "Procesando" },
    shipped: { variant: "default", label: "Enviado" },
    delivered: { variant: "default", label: "Entregado" },
    cancelled: { variant: "destructive", label: "Cancelado" },
    refunded: { variant: "destructive", label: "Reembolsado" },
  };
  const statusConfig = config[status] || {
    variant: "outline",
    label: status,
  };
  return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
}

interface CustomerRecentOrdersProps {
  orders: Record<string, unknown>[];
  customerId: string;
}

export function CustomerRecentOrders({
  orders,
  customerId,
}: CustomerRecentOrdersProps) {
  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Pedidos Recientes
          </div>
          <Link href={`/admin/customers/${customerId}?tab=orders`}>
            <Button size="sm" variant="outline">
              Ver todos
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders.slice(0, 5).map((order) => (
            <div
              className="flex items-center justify-between p-3 border rounded-lg"
              key={order.id as string}
            >
              <div className="flex items-center space-x-3">
                <div>
                  <p className="font-medium">#{order.order_number as string}</p>
                  <p className="text-sm text-admin-text-tertiary">
                    {formatDate(order.created_at as string)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="font-medium">
                    {formatCurrency(order.total_amount as number)}
                  </p>
                  {getOrderStatusBadge(order.status as string)}
                </div>
                <Link href={`/admin/orders/${order.id as string}`}>
                  <Button size="sm" variant="outline">
                    Ver
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
