"use client";

import {
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getTodayInTimezone } from "@/lib/utils/date-timezone";

interface OrdersSectionProps {
  orders: unknown[];
  loadingOrders: boolean;
  ordersCurrentPage: number;
  ordersItemsPerPage: number;
  ordersTotalCount: number;
  orderFilters: {
    payment_status: string;
    payment_method: string;
    date_from: string;
    date_to: string;
  };
  orderSearchTerm: string;
  orderProductFilter: string;
  isGlobalView: boolean;
  isSuperAdmin: boolean;
  creditNotes: unknown[];
  loadingCreditNotes: boolean;
  orderFiltersExpanded: boolean;
  selectedOrderForAction: unknown;
  orderActionDialog: "cancel" | "delete" | null;
  orderActionReason: string;
  refundMethod: string;
  processingOrderAction: boolean;
  fetchOrders: () => Promise<void>;
  fetchCreditNotes: () => Promise<void>;
  handleCancelOrder: (
    orderId: string,
    reason: string,
    method: string,
  ) => Promise<void>;
  handleDeleteOrder: (orderId: string) => Promise<void>;
  setOrdersTab: (v: boolean) => void;
  setOrderFilters: (
    v:
      | {
          payment_status: string;
          payment_method: string;
          date_from: string;
          date_to: string;
        }
      | ((prev: {
          payment_status: string;
          payment_method: string;
          date_from: string;
          date_to: string;
        }) => {
          payment_status: string;
          payment_method: string;
          date_from: string;
          date_to: string;
        }),
  ) => void;
  setOrderSearchTerm: (v: string) => void;
  setOrderProductFilter: (v: string) => void;
  setOrdersCurrentPage: (v: number) => void;
  setOrdersItemsPerPage: (v: number) => void;
  setOrderFiltersExpanded: (v: boolean) => void;
  setSelectedOrderForAction: (v: unknown) => void;
  setOrderActionDialog: (v: "cancel" | "delete" | null) => void;
  setOrderActionReason: (v: string) => void;
  setRefundMethod: (v: string) => void;
}

export function CashRegisterOrdersSection(props: OrdersSectionProps) {
  const {
    orders,
    loadingOrders,
    ordersCurrentPage,
    ordersItemsPerPage,
    ordersTotalCount,
    orderFilters,
    orderSearchTerm,
    orderProductFilter,
    isGlobalView,
    isSuperAdmin,
    creditNotes,
    loadingCreditNotes,
    orderFiltersExpanded,
    selectedOrderForAction,
    orderActionDialog,
    orderActionReason,
    refundMethod,
    processingOrderAction,
    fetchOrders,
    fetchCreditNotes,
    setOrdersTab,
    setOrderFilters,
    setOrderSearchTerm,
    setOrderProductFilter,
    setOrdersCurrentPage,
    setOrdersItemsPerPage,
    setOrderFiltersExpanded,
    setSelectedOrderForAction,
    setOrderActionDialog,
    setOrderActionReason,
    setRefundMethod,
  } = props;

  return (
    <>
      {/* Orders Tab */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] min-w-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ventas / Órdenes</CardTitle>
            <Button size="sm" variant="outline" onClick={fetchOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs sm:text-sm">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      className="pl-8 text-sm"
                      placeholder="Orden, email, cliente..."
                      value={orderSearchTerm}
                      onChange={(e) => {
                        setOrderSearchTerm(e.target.value);
                        fetchOrders();
                      }}
                    />
                  </div>
                </div>
                <Button
                  className="md:hidden w-full sm:w-auto flex items-center justify-center gap-2"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setOrderFiltersExpanded((v) => !v)}
                >
                  <Search className="h-4 w-4" />
                  Filtros
                  {orderFiltersExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div
                className={`grid gap-3 transition-all md:grid md:grid-cols-2 lg:grid-cols-5 ${
                  orderFiltersExpanded ? "grid" : "hidden md:grid"
                }`}
              >
                <div className="md:col-span-2 lg:col-span-1">
                  <Label className="text-xs sm:text-sm">Estado de Pago</Label>
                  <Select
                    value={orderFilters.payment_status}
                    onValueChange={(value) => {
                      setOrderFilters({
                        ...orderFilters,
                        payment_status: value,
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="cancelled">Anulado</SelectItem>
                      <SelectItem value="refunded">Reembolsado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Método de Pago</Label>
                  <Select
                    value={orderFilters.payment_method}
                    onValueChange={(value) => {
                      setOrderFilters({
                        ...orderFilters,
                        payment_method: value,
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="debit">Débito</SelectItem>
                      <SelectItem value="credit">Crédito</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Producto</Label>
                  <Input
                    className="text-sm h-9"
                    placeholder="Ej: Kit Limpieza"
                    value={orderProductFilter}
                    onChange={(e) => setOrderProductFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Fecha Desde</Label>
                  <Input
                    className="text-sm h-9"
                    type="date"
                    value={orderFilters.date_from}
                    onChange={(e) => {
                      setOrderFilters({
                        ...orderFilters,
                        date_from: e.target.value,
                      });
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Fecha Hasta</Label>
                  <Input
                    className="text-sm h-9"
                    type="date"
                    value={orderFilters.date_to}
                    onChange={(e) => {
                      setOrderFilters({
                        ...orderFilters,
                        date_to: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    className="h-9 text-xs"
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const today = getTodayInTimezone("America/Santiago");
                      setOrderFilters((prev) => ({
                        ...prev,
                        date_from: today,
                        date_to: today,
                      }));
                    }}
                  >
                    Hoy
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          {loadingOrders ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
              <p className="text-admin-text-tertiary">Cargando órdenes...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-epoch-primary mb-2">
                No hay órdenes
              </h3>
              <p className="text-admin-text-tertiary">
                {isGlobalView
                  ? "Seleccione una sucursal para ver sus órdenes"
                  : "No se encontraron órdenes con los filtros seleccionados"}
              </p>
            </div>
          ) : (
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
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {order.customer_name ||
                              order.sii_business_name ||
                              (order.billing_first_name &&
                              order.billing_last_name
                                ? `${order.billing_first_name} ${order.billing_last_name}`.trim()
                                : order.customer_email ||
                                  "Cliente no registrado")}
                          </div>
                          {order.sii_rut && (
                            <div className="text-xs text-admin-text-tertiary font-mono">
                              {order.sii_rut}
                            </div>
                          )}
                          {(order.customer_name ||
                            order.sii_business_name ||
                            (order.billing_first_name &&
                              order.billing_last_name)) && (
                            <>
                              {order.customer_email && (
                                <div className="text-xs text-admin-text-tertiary">
                                  {order.customer_email}
                                </div>
                              )}
                              {(order.customer_phone ||
                                order.billing_phone ||
                                order.shipping_phone) && (
                                <div className="text-xs text-admin-text-tertiary">
                                  {order.customer_phone ||
                                    order.billing_phone ||
                                    order.shipping_phone}
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
                              {order.order_items
                                .slice(0, 2)
                                .map((item: unknown, idx: number) => (
                                  <div className="text-sm" key={idx}>
                                    <span className="font-medium">
                                      {item.quantity}x
                                    </span>{" "}
                                    <span>
                                      {item.product_name || "Producto"}
                                    </span>
                                    {item.sku && (
                                      <span className="text-xs text-admin-text-tertiary ml-1">
                                        ({item.sku})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              {order.order_items.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{order.order_items.length - 2} más
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-admin-text-tertiary">
                              Sin productos
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          {formatCurrency(order.total_amount)}
                        </div>
                        {(() => {
                          const paid =
                            order.order_payments?.reduce(
                              (sum: number, p: unknown) =>
                                sum + Number(p.amount || 0),
                              0,
                            ) || 0;
                          const pending = Math.max(
                            0,
                            order.total_amount - paid,
                          );
                          if (pending > 0 && order.status !== "cancelled") {
                            return (
                              <div className="text-xs text-red-600 font-medium">
                                Pdte: {formatCurrency(pending)}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const methodsFromPayments =
                            order.order_payments?.map(
                              (p: unknown) => p.payment_method,
                            ) || [];
                          const uniqueMethods = Array.from(
                            new Set(methodsFromPayments),
                          );

                          if (uniqueMethods.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-1">
                                {uniqueMethods.map(
                                  (method: unknown, idx: number) => (
                                    <Badge
                                      className="text-[10px] px-1 h-5 capitalize"
                                      key={idx}
                                      variant="outline"
                                    >
                                      {method === "cash"
                                        ? "Efectivo"
                                        : method === "debit"
                                          ? "Débito"
                                          : method === "credit"
                                            ? "Crédito"
                                            : method === "transfer"
                                              ? "Transf."
                                              : method}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            );
                          }
                          return (
                            <Badge
                              className="text-[10px] px-1 h-5"
                              variant="outline"
                            >
                              {order.payment_method_type === "cash" &&
                                "Efectivo"}
                              {order.payment_method_type === "debit_card" &&
                                "Débito"}
                              {order.payment_method_type === "credit_card" &&
                                "Crédito"}
                              {order.payment_method_type === "transfer" &&
                                "Transf."}
                              {order.payment_method_type === "deposit" &&
                                "Abono"}
                              {order.payment_method_type === "installments" &&
                                "Cuotas"}
                              {![
                                "cash",
                                "debit_card",
                                "credit_card",
                                "transfer",
                                "deposit",
                                "installments",
                              ].includes(order.payment_method_type) &&
                                (order.payment_method_type || "N/A")}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "cancelled"
                              ? "destructive"
                              : order.payment_status === "paid"
                                ? "default"
                                : order.payment_status === "partial"
                                  ? "secondary"
                                  : order.payment_status === "refunded"
                                    ? "destructive"
                                    : "outline"
                          }
                        >
                          {order.status === "cancelled" && "Anulado"}
                          {order.status !== "cancelled" &&
                            order.payment_status === "paid" &&
                            "Pagado"}
                          {order.status !== "cancelled" &&
                            order.payment_status === "partial" &&
                            "Parcial"}
                          {order.status !== "cancelled" &&
                            order.payment_status === "pending" &&
                            "Pendiente"}
                          {order.status !== "cancelled" &&
                            order.payment_status === "refunded" &&
                            "Reembolsado"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(order.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/cash-register/orders/${order.id}`}
                          >
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </Link>
                          {isSuperAdmin && order.status !== "cancelled" && (
                            <Button
                              className="text-red-600 hover:text-red-700"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOrderForAction(order);
                                setOrderActionDialog("cancel");
                              }}
                            >
                              Anular
                            </Button>
                          )}
                          {isSuperAdmin && order.status === "cancelled" && (
                            <Button
                              className="text-red-600 hover:text-red-700"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOrderForAction(order);
                                setOrderActionDialog("delete");
                              }}
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination for Orders */}
          {!loadingOrders && orders.length > 0 && (
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
        </CardContent>
      </Card>

      {/* Credit Notes Tab */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] min-w-0">
        <CardHeader>
          <CardTitle>Notas de Crédito</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCreditNotes ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
              <p className="text-admin-text-tertiary">
                Cargando notas de crédito...
              </p>
            </div>
          ) : creditNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-epoch-primary mb-2">
                No hay notas de crédito
              </h3>
              <p className="text-admin-text-tertiary">
                Las notas de crédito se crean al anular una venta con la opción
                correspondiente
              </p>
            </div>
          ) : (
            <div className="w-full min-w-0 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table className="min-w-[550px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método Reembolso</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotes.map((cn) => (
                    <TableRow key={cn.id}>
                      <TableCell className="font-mono font-medium">
                        {cn.credit_note_number}
                      </TableCell>
                      <TableCell>
                        {cn.order_id ? (
                          <Link
                            href={`/admin/cash-register/orders/${cn.order_id}`}
                          >
                            <Button className="p-0 h-auto" variant="link">
                              {cn.order_number || "Ver orden"}
                            </Button>
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-red-600">
                        -{formatCurrency(cn.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {cn.refund_method === "cash"
                            ? "Efectivo"
                            : cn.refund_method === "debit"
                              ? "Débito"
                              : cn.refund_method === "credit"
                                ? "Crédito"
                                : "Transferencia"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {cn.reason}
                      </TableCell>
                      <TableCell>{formatDateTime(cn.created_at)}</TableCell>
                      <TableCell>
                        {cn.order_id && (
                          <Link
                            href={`/admin/cash-register/orders/${cn.order_id}`}
                          >
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver orden
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
