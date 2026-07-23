"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

import type { PendingBalanceOrder } from "../POSPendingBalanceDialog";

interface POSPendingBalanceTableProps {
  orders: PendingBalanceOrder[];
  selectedOrder: PendingBalanceOrder | null;
  onSelectOrder: (order: PendingBalanceOrder | null) => void;
  onPaymentAmountChange: (value: string) => void;
  onRefundClick: (order: PendingBalanceOrder) => void;
}

/**
 * POSPendingBalanceTable — orders table for the pending balance dialog.
 *
 * Extracted from POSPendingBalanceDialog.tsx.
 */
export function POSPendingBalanceTable({
  orders,
  selectedOrder,
  onSelectOrder,
  onPaymentAmountChange,
  onRefundClick,
}: POSPendingBalanceTableProps) {
  return (
    <div className="border border-admin-border-primary rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Orden</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Pagado</TableHead>
            <TableHead className="text-right">Pendiente</TableHead>
            <TableHead>Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              className={
                selectedOrder?.id === order.id
                  ? "bg-admin-accent/10"
                  : "cursor-pointer hover:bg-muted"
              }
              key={order.id}
              onClick={() => {
                onSelectOrder(order);
                onPaymentAmountChange(order.pending_amount.toString());
              }}
            >
              <TableCell className="font-mono font-semibold">
                {order.order_number}
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {order.customer_name ||
                    order.customer_email ||
                    "Sin nombre"}
                </div>
                {order.customer_rut && (
                  <div className="text-xs text-admin-text-secondary font-mono">
                    RUT: {order.customer_rut}
                  </div>
                )}
                {order.customer_email && (
                  <div className="text-xs text-admin-text-tertiary">
                    {order.customer_email}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(order.total_amount)}
              </TableCell>
              <TableCell className="text-right text-admin-success">
                {formatCurrency(order.total_paid)}
              </TableCell>
              <TableCell className="text-right font-semibold text-admin-warning">
                {formatCurrency(order.pending_amount)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    className="rounded-xl"
                    size="sm"
                    variant={
                      selectedOrder?.id === order.id
                        ? "default"
                        : "outline"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOrder(order);
                      onPaymentAmountChange(
                        order.pending_amount.toString(),
                      );
                    }}
                  >
                    {selectedOrder?.id === order.id
                      ? "Seleccionado"
                      : "Seleccionar"}
                  </Button>
                  <Button
                    className="rounded-xl"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefundClick(order);
                    }}
                  >
                    Devolución
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
