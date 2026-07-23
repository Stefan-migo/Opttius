"use client";

import { Eye, RefreshCw, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface OrderRow {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_method_type?: string;
  payment_status?: string;
  created_at?: string;
  customer_name?: string;
  email?: string;
  customer_email?: string;
  branch_name?: string;
  sii_business_name?: string;
  billing_first_name?: string;
  billing_last_name?: string;
  customer_phone?: string;
  billing_phone?: string;
  shipping_phone?: string;
  sii_rut?: string;
  order_items?: Array<{ product_name?: string; sku?: string; quantity: number }>;
  order_payments?: Array<{ amount: number; payment_method: string }>;
}

interface OrdersTableProps {
  orders: OrderRow[];
  loadingOrders: boolean;
  ordersCurrentPage: number;
  ordersItemsPerPage: number;
  ordersTotalCount: number;
  isGlobalView: boolean;
  isSuperAdmin: boolean;
  onCancelOrder: (order: OrderRow) => void;
  onDeleteOrder: (order: OrderRow) => void;
  setOrdersCurrentPage: (v: number) => void;
  setOrdersItemsPerPage: (v: number) => void;
}

export function OrdersTable({
  orders,
  loadingOrders,
  ordersCurrentPage,
  ordersItemsPerPage,
  ordersTotalCount,
  isGlobalView,
  isSuperAdmin,
  onCancelOrder,
  onDeleteOrder,
  setOrdersCurrentPage,
  setOrdersItemsPerPage,
}: OrdersTableProps) {
  if (loadingOrders) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
        <p className="text-admin-text-tertiary">Cargando órdenes...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-epoch-primary mb-2">No hay órdenes</h3>
        <p className="text-admin-text-tertiary">
          {isGlobalView
            ? "Seleccione una sucursal para ver sus órdenes"
            : "No se encontraron órdenes con los filtros seleccionados"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-w-0 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Método de Pago</TableHead>
              <TableHead>Estado de Pago</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order: OrderRow) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.order_number}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">
                      {order.customer_name ||
                        order.sii_business_name ||
                        (order.billing_first_name && order.billing_last_name
                          ? `${order.billing_first_name} ${order.billing_last_name}`.trim()
                          : order.customer_email || "Cliente no registrado")}
                    </div>
                    {order.sii_rut && (
                      <div className="text-xs text-admin-text-tertiary font-mono">{order.sii_rut}</div>
                    )}
                    {(order.customer_name || order.sii_business_name || (order.billing_first_name && order.billing_last_name)) && (
                      <>
                        {order.customer_email && <div className="text-xs text-admin-text-tertiary">{order.customer_email}</div>}
                        {(order.customer_phone || order.billing_phone || order.shipping_phone) && (
                          <div className="text-xs text-admin-text-tertiary">
                            {order.customer_phone || order.billing_phone || order.shipping_phone}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    {order.order_items && order.order_items.length > 0 ? (
                      <>
                        {order.order_items.slice(0, 2).map((item: { product_name?: string; sku?: string; quantity: number }, idx: number) => (
                          <div className="text-sm" key={idx}>
                            <span className="font-medium">{item.quantity}x</span>{" "}
                            <span>{item.product_name || "Producto"}</span>
                            {item.sku && <span className="text-xs text-admin-text-tertiary ml-1">({item.sku})</span>}
                          </div>
                        ))}
                        {order.order_items.length > 2 && (
                          <div className="text-xs text-gray-500">+{order.order_items.length - 2} más</div>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-admin-text-tertiary">Sin productos</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-semibold">{formatCurrency(order.total_amount)}</div>
                  {(() => {
                    const paid =
                      order.order_payments?.reduce(
                        (sum: number, p: { amount: number; payment_method: string }) => sum + Number(p.amount || 0), 0,
                      ) || 0;
                    const pending = Math.max(0, order.total_amount - paid);
                    if (pending > 0 && order.status !== "cancelled") {
                      return <div className="text-xs text-red-600 font-medium">Pdte: {formatCurrency(pending)}</div>;
                    }
                    return null;
                  })()}
                </TableCell>
                <TableCell>
                  {(() => {
                    const methodsFromPayments =
                      order.order_payments?.map((p) => p.payment_method) || [];
                    const uniqueMethods = Array.from(new Set(methodsFromPayments));
                    if (uniqueMethods.length > 0) {
                      return (
                        <div className="flex flex-wrap gap-1">
                          {uniqueMethods.map((method, idx: number) => (
                            <Badge className="text-[10px] px-1 h-5 capitalize" key={idx} variant="outline">
                              {method === "cash" ? "Efectivo" : method === "debit" ? "Débito" : method === "credit" ? "Crédito" : method === "transfer" ? "Transf." : method}
                            </Badge>
                          ))}
                        </div>
                      );
                    }
                    const pm = order.payment_method_type;
                    const pmMap: Record<string, string> = {
                      cash: "Efectivo", debit_card: "Débito", credit_card: "Crédito",
                      transfer: "Transf.", deposit: "Abono", installments: "Cuotas",
                    };
                    return <Badge className="text-[10px] px-1 h-5" variant="outline">{pm ? pmMap[pm] || pm : "N/A"}</Badge>;
                  })()}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      order.status === "cancelled" ? "destructive"
                      : order.payment_status === "paid" ? "default"
                      : order.payment_status === "partial" ? "secondary"
                      : order.payment_status === "refunded" ? "destructive"
                      : "outline"
                    }
                  >
                    {order.status === "cancelled" ? "Anulado"
                      : order.payment_status === "paid" ? "Pagado"
                      : order.payment_status === "partial" ? "Parcial"
                      : order.payment_status === "pending" ? "Pendiente"
                      : order.payment_status === "refunded" ? "Reembolsado" : ""}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTime(order.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/cash-register/orders/${order.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />Ver
                      </Button>
                    </Link>
                    {isSuperAdmin && order.status !== "cancelled" && (
                      <Button className="text-red-600 hover:text-red-700" size="sm" variant="outline"
                        onClick={() => onCancelOrder(order)}
                      >Anular</Button>
                    )}
                    {isSuperAdmin && order.status === "cancelled" && (
                      <Button className="text-red-600 hover:text-red-700" size="sm" variant="outline"
                        onClick={() => onDeleteOrder(order)}
                      >Eliminar</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {orders.length > 0 && (
        <div className="mt-4 w-full min-w-0 overflow-x-auto">
          <Pagination
            className="flex-wrap gap-y-2"
            currentPage={ordersCurrentPage}
            itemsPerPage={ordersItemsPerPage}
            itemsPerPageOptions={[10, 20, 50, 100]}
            totalItems={ordersTotalCount}
            totalPages={Math.ceil(ordersTotalCount / ordersItemsPerPage)}
            onItemsPerPageChange={setOrdersItemsPerPage}
            onPageChange={setOrdersCurrentPage}
          />
        </div>
      )}
    </>
  );
}
