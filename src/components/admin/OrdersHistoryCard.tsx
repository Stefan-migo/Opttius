"use client";

import { Package, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Customer } from "@/lib/api/services";
import { formatCurrency } from "@/lib/utils";

interface OrdersHistoryCardProps {
  customer: Customer;
  expandedOrders: Set<string>;
  toggleOrderExpansion: (orderId: string) => void;
}

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

export function OrdersHistoryCard({
  customer,
  expandedOrders,
  toggleOrderExpansion,
}: OrdersHistoryCardProps) {
  return (
    <>
      {/* Lens Purchases Section */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-admin-text-primary">
            <ShoppingBag className="h-5 w-5 mr-2" />
            Lentes y Armazones ({customer.lensPurchases?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {customer.lensPurchases && customer.lensPurchases.length > 0 ? (
            <div className="space-y-4">
              {customer.lensPurchases.map((purchase) => {
                const statusColors: Record<string, string> = {
                  ordered: "bg-blue-100 text-blue-800",
                  in_progress: "bg-yellow-100 text-yellow-800",
                  ready: "bg-green-100 text-green-800",
                  delivered: "bg-gray-100 text-gray-800",
                  cancelled: "bg-red-100 text-red-800",
                };

                return (
                  <Card
                    className="bg-admin-bg-primary border border-admin-border-primary/20 shadow-sm"
                    key={purchase.id}
                  >
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="min-w-0">
                          <CardTitle className="text-base sm:text-lg text-admin-text-primary">
                            {purchase.product_name}
                          </CardTitle>
                          <p className="text-sm text-admin-text-tertiary mt-1">
                            Fecha de compra:{" "}
                            {new Date(
                              purchase.purchase_date,
                            ).toLocaleDateString("es-CL")}
                            {purchase.delivery_date && (
                              <>
                                {" "}
                                • Entregado:{" "}
                                {new Date(
                                  purchase.delivery_date,
                                ).toLocaleDateString("es-CL")}
                              </>
                            )}
                          </p>
                        </div>
                        <Badge
                          className={
                            statusColors[purchase.status] ||
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {purchase.status === "ordered" && "Ordenado"}
                          {purchase.status === "in_progress" && "En Proceso"}
                          {purchase.status === "ready" && "Listo"}
                          {purchase.status === "delivered" && "Entregado"}
                          {purchase.status === "cancelled" && "Cancelado"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <p className="text-sm text-admin-text-tertiary mb-2">
                            Detalles del Producto
                          </p>
                          <div className="space-y-1 text-sm">
                            <p>
                              <span className="text-admin-text-tertiary">
                                Tipo:
                              </span>{" "}
                              <span className="font-medium">
                                {purchase.product_type}
                              </span>
                            </p>
                            <p>
                              <span className="text-admin-text-tertiary">
                                Cantidad:
                              </span>{" "}
                              <span className="font-medium">
                                {purchase.quantity}
                              </span>
                            </p>
                            {purchase.lens_type && (
                              <p>
                                <span className="text-admin-text-tertiary">
                                  Tipo de lente:
                                </span>{" "}
                                <span className="font-medium">
                                  {purchase.lens_type}
                                </span>
                              </p>
                            )}
                            {purchase.frame_brand && (
                              <p>
                                <span className="text-admin-text-tertiary">
                                  Marca:
                                </span>{" "}
                                <span className="font-medium">
                                  {purchase.frame_brand}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-admin-text-tertiary mb-2">
                            Información de Compra
                          </p>
                          <div className="space-y-1 text-sm">
                            <p>
                              <span className="text-admin-text-tertiary">
                                Precio unitario:
                              </span>{" "}
                              <span className="font-medium">
                                {formatCurrency(purchase.unit_price ?? 0)}
                              </span>
                            </p>
                            <p>
                              <span className="text-admin-text-tertiary">
                                Total:
                              </span>{" "}
                              <span className="font-medium text-admin-success">
                                {formatCurrency(
                                  purchase.total_price ?? purchase.total_amount,
                                )}
                              </span>
                            </p>
                            {purchase.prescription_id && (
                              <p className="text-xs text-admin-text-tertiary">
                                Con receta asociada
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingBag className="h-10 w-10 text-admin-text-tertiary mx-auto mb-3 opacity-50" />
              <p className="text-sm text-admin-text-tertiary">
                Sin compras de lentes o armazones
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Section */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-admin-text-primary">
            <Package className="h-5 w-5 mr-2" />
            Pedidos ({customer.orders?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {customer.orders && customer.orders.length > 0 ? (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.orders.map((order: unknown) => {
                    const o = order as Record<string, unknown>;
                    const orderItems = o.order_items as unknown[] | undefined;
                    return (
                      <>
                        <TableRow
                          className="hover:bg-[#AE000010]"
                          key={o.id as string}
                        >
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                className="min-h-[44px] min-w-[44px] p-0"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  toggleOrderExpansion(o.id as string)
                                }
                              >
                                {expandedOrders.has(o.id as string) ? "−" : "+"}
                              </Button>
                              <div>
                                <p className="font-medium">
                                  #{o.order_number as string}
                                </p>
                                <p className="text-sm text-admin-text-tertiary">
                                  {orderItems?.length || 0} productos
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            {new Date(
                              o.created_at as string,
                            ).toLocaleDateString("es-CL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>

                          <TableCell>
                            {getOrderStatusBadge(o.status as string)}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={
                                o.payment_status === "paid"
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {o.payment_status === "paid"
                                ? "Pagado"
                                : o.payment_status === "pending"
                                  ? "Pendiente"
                                  : o.payment_status === "failed"
                                    ? "Fallido"
                                    : (o.payment_status as string)}
                            </Badge>
                          </TableCell>

                          <TableCell className="font-medium text-admin-success">
                            {formatCurrency(o.total_amount as number)}
                          </TableCell>

                          <TableCell>
                            <Link href={`/admin/orders/${o.id as string}`}>
                              <Button size="sm" variant="outline">
                                Ver Detalle
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Order Items */}
                        {expandedOrders.has(o.id as string) &&
                          orderItems &&
                          orderItems.length > 0 && (
                            <TableRow key={`${o.id as string}-items`}>
                              <TableCell
                                className="bg-admin-bg-tertiary/50 p-4"
                                colSpan={6}
                              >
                                <div className="space-y-2">
                                  <p className="text-xs sm:text-sm font-medium text-admin-text-primary mb-3">
                                    Productos del Pedido:
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {orderItems.map(
                                      (item: unknown, idx: number) => {
                                        const i = item as Record<
                                          string,
                                          unknown
                                        >;
                                        const product =
                                          (i.products as Record<
                                            string,
                                            unknown
                                          >) ||
                                          (i.product as Record<
                                            string,
                                            unknown
                                          >);
                                        return (
                                          <div
                                            className="flex items-center justify-between p-2 bg-admin-bg-primary rounded border border-admin-border-primary/20"
                                            key={idx}
                                          >
                                            <div className="flex items-center space-x-3">
                                              {product?.featured_image ? (
                                                <img
                                                  alt={
                                                    (product?.name as string) ||
                                                    (i.product_name as string)
                                                  }
                                                  className="w-10 h-10 object-cover rounded"
                                                  src={
                                                    product?.featured_image as string
                                                  }
                                                />
                                              ) : (
                                                <div className="w-10 h-10 bg-admin-bg-tertiary rounded flex items-center justify-center shrink-0">
                                                  <Package className="h-5 w-5 text-admin-text-tertiary" />
                                                </div>
                                              )}
                                              <div>
                                                <p className="text-sm font-medium">
                                                  {(product?.name as string) ||
                                                    (i.product_name as string) ||
                                                    "Producto"}
                                                </p>
                                                <p className="text-xs text-admin-text-tertiary">
                                                  Cantidad:{" "}
                                                  {i.quantity as number} ×{" "}
                                                  {formatCurrency(
                                                    i.unit_price as number,
                                                  )}
                                                </p>
                                              </div>
                                            </div>
                                            <p className="text-sm font-medium text-admin-success">
                                              {formatCurrency(
                                                i.total_price as number,
                                              )}
                                            </p>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-admin-text-tertiary mx-auto mb-3 opacity-50" />
              <p className="text-sm text-admin-text-tertiary">
                Sin pedidos registrados
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
