"use client";

import { FileText, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Movement {
  id: string;
  movement_type: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_rut: string | null;
  payment_method: string;
  payment_method_code: string;
  amount: number;
  payment_status: string;
  paid_at: string;
  notes: string | null;
  order_total: number;
  order_payment_status: string | null;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method_type: string;
  created_at: string;
  order_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface CashRegisterMovementsProps {
  posSessionId?: string;
  movements: Movement[];
  loadingMovements: boolean;
  movementFilter: string;
  onMovementFilterChange: (value: string) => void;
  orders: Order[];
  formatCurrency: (value: number) => string;
  getPaymentMethodLabel: (method: string) => string;
  formatDateTime: (date: string | null | undefined) => string;
}

export default function CashRegisterMovements({
  posSessionId,
  movements,
  loadingMovements,
  movementFilter,
  onMovementFilterChange,
  orders,
  formatCurrency,
  getPaymentMethodLabel,
  formatDateTime,
}: CashRegisterMovementsProps) {
  if (!posSessionId) return null;

  return (
    <>
      {/* Movements Detail */}
      <Card className="bg-admin-bg-tertiary">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalle de Movimientos
            </CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={movementFilter}
                onValueChange={onMovementFilterChange}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filtrar" />
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
          </div>
        </CardHeader>
        <CardContent>
          {loadingMovements ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-epoch-primary mx-auto mb-2" />
              <p className="text-sm text-admin-text-tertiary">
                Cargando movimientos...
              </p>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-admin-text-tertiary">
              <p>No hay movimientos registrados en esta sesión</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-admin-text-tertiary">
                Total de movimientos: <strong>{movements.length}</strong> |
                Total:{" "}
                <strong>
                  {formatCurrency(
                    movements.reduce((sum, m) => sum + m.amount, 0),
                  )}
                </strong>
              </div>
              <div className="border rounded-lg overflow-x-visible">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px] whitespace-nowrap">
                          Hora
                        </TableHead>
                        <TableHead className="w-[100px] whitespace-nowrap">
                          Tipo
                        </TableHead>
                        <TableHead className="w-[120px] whitespace-nowrap">
                          Orden
                        </TableHead>
                        <TableHead className="min-w-[200px] whitespace-nowrap">
                          Cliente
                        </TableHead>
                        <TableHead className="w-[120px] whitespace-nowrap">
                          Método
                        </TableHead>
                        <TableHead className="w-[120px] text-right whitespace-nowrap">
                          Monto
                        </TableHead>
                        <TableHead className="w-[120px] whitespace-nowrap">
                          Estado
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements
                        .filter((m) => {
                          if (movementFilter === "all") return true;
                          return m.payment_method_code === movementFilter;
                        })
                        .map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {new Date(movement.paid_at).toLocaleTimeString(
                                "es-CL",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge
                                variant={
                                  movement.movement_type === "sale"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {movement.movement_type === "sale"
                                  ? "Venta"
                                  : "Pago Saldo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm whitespace-nowrap">
                              {movement.order_number}
                            </TableCell>
                            <TableCell className="min-w-[200px]">
                              <div className="text-sm">
                                <div className="truncate">
                                  {movement.customer_name}
                                </div>
                                {movement.customer_rut && (
                                  <div className="text-xs text-admin-text-tertiary font-mono truncate">
                                    {movement.customer_rut}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline">
                                {movement.payment_method}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold whitespace-nowrap">
                              {formatCurrency(movement.amount)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge
                                variant={
                                  movement.payment_status === "Completo"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {movement.payment_status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              {movements.filter((m) => {
                if (movementFilter === "all") return true;
                return m.payment_method_code === movementFilter;
              }).length === 0 &&
                movementFilter !== "all" && (
                  <div className="text-center py-4 text-admin-text-tertiary text-sm">
                    No hay movimientos con el filtro seleccionado
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders List */}
      {orders.length > 0 && (
        <Card className="bg-admin-bg-tertiary">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Órdenes del Día ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {orders.map((order) => (
                <div
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg"
                  key={order.id}
                >
                  <div>
                    <p className="font-semibold">{order.order_number}</p>
                    <p className="text-sm text-admin-text-tertiary">
                      {getPaymentMethodLabel(order.payment_method_type)} •{" "}
                      {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <p className="font-bold">
                    {formatCurrency(order.total_amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
