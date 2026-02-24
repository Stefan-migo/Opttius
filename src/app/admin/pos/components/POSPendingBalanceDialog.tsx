"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, CheckCircle2, CreditCard } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";

export interface PendingBalanceOrder {
  id: string;
  order_number: string;
  customer_name?: string;
  customer_email?: string;
  customer_rut?: string;
  total_amount: number;
  total_paid: number;
  pending_amount: number;
}

interface POSPendingBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: PendingBalanceOrder[];
  allOrders: PendingBalanceOrder[];
  loading: boolean;
  selectedOrder: PendingBalanceOrder | null;
  pendingPaymentAmount: string;
  pendingPaymentMethod: string;
  pendingFiscalReference: string;
  processingPayment: boolean;
  searchTerm: string;
  onFetchOrders: () => void;
  onFilterSearch: (term: string) => void;
  onSelectOrder: (order: PendingBalanceOrder | null) => void;
  onPaymentAmountChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onFiscalReferenceChange: (value: string) => void;
  onProcessPayment: () => void;
  onRefundClick: (order: PendingBalanceOrder) => void;
}

export function POSPendingBalanceDialog({
  open,
  onOpenChange,
  orders,
  loading,
  selectedOrder,
  pendingPaymentAmount,
  pendingPaymentMethod,
  pendingFiscalReference,
  processingPayment,
  searchTerm,
  onFetchOrders,
  onFilterSearch,
  onSelectOrder,
  onPaymentAmountChange,
  onPaymentMethodChange,
  onFiscalReferenceChange,
  onProcessPayment,
  onRefundClick,
}: POSPendingBalanceDialogProps) {
  useEffect(() => {
    if (open) {
      onFetchOrders();
    }
    // Only fetch when dialog opens; onFetchOrders identity changes every render causing infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          onSelectOrder(null);
          onPaymentAmountChange("");
          onFiscalReferenceChange("");
        }
      }}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl rounded-xl border-admin-border-primary">
        <DialogHeader>
          <DialogTitle className="font-display">
            Cobrar Saldos Pendientes
          </DialogTitle>
          <DialogDescription className="text-admin-text-secondary">
            Se cargan automáticamente todos los saldos pendientes de la
            sucursal. Usa el buscador para filtrar por cliente u orden.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-text-tertiary h-5 w-5" />
            <Input
              placeholder="Filtrar por nombre, RUT, número de orden, email..."
              value={searchTerm}
              onChange={(e) => onFilterSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-admin-text-tertiary" />
            </div>
          ) : orders.length > 0 ? (
            <>
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
                        key={order.id}
                        className={
                          selectedOrder?.id === order.id
                            ? "bg-admin-info/5"
                            : "cursor-pointer hover:bg-admin-bg-secondary"
                        }
                        onClick={() => {
                          onSelectOrder(order);
                          onPaymentAmountChange(
                            order.pending_amount.toString(),
                          );
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
                              size="sm"
                              variant={
                                selectedOrder?.id === order.id
                                  ? "default"
                                  : "outline"
                              }
                              className="rounded-xl"
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
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
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

              {selectedOrder && (
                <Card className="bg-admin-info/5 border-admin-border-primary rounded-xl">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-admin-text-secondary">
                          Orden
                        </Label>
                        <div className="font-semibold text-lg">
                          {selectedOrder.order_number}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-admin-text-secondary">
                          Cliente
                        </Label>
                        <div className="font-semibold text-admin-text-primary">
                          {selectedOrder.customer_name ||
                            selectedOrder.customer_email ||
                            "Sin nombre"}
                        </div>
                        {selectedOrder.customer_rut && (
                          <div className="text-xs text-admin-text-secondary font-mono">
                            RUT: {selectedOrder.customer_rut}
                          </div>
                        )}
                        {selectedOrder.customer_email && (
                          <div className="text-xs text-admin-text-secondary">
                            {selectedOrder.customer_email}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-admin-text-secondary">
                          Saldo Pendiente
                        </Label>
                        <div className="font-semibold text-lg text-admin-warning">
                          {formatCurrency(selectedOrder.pending_amount)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-admin-text-secondary">
                          Método de Pago
                        </Label>
                        <Select
                          value={pendingPaymentMethod}
                          onValueChange={onPaymentMethodChange}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="debit">Débito</SelectItem>
                            <SelectItem value="credit">Crédito</SelectItem>
                            <SelectItem value="transfer">
                              Transferencia
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-admin-text-primary">
                        Monto a Pagar *
                      </Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={pendingPaymentAmount}
                        onChange={(e) => onPaymentAmountChange(e.target.value)}
                        max={selectedOrder.pending_amount}
                        className="rounded-xl"
                      />
                      <p className="text-xs text-admin-text-secondary mt-1">
                        Máximo: {formatCurrency(selectedOrder.pending_amount)}
                      </p>
                    </div>
                    {(pendingPaymentMethod === "debit" ||
                      pendingPaymentMethod === "credit" ||
                      pendingPaymentMethod === "transfer") && (
                      <div>
                        <Label className="text-sm text-admin-text-secondary">
                          Número de referencia fiscal (opcional)
                        </Label>
                        <Input
                          placeholder="Ej: Nº boleta, factura o transacción"
                          value={pendingFiscalReference}
                          onChange={(e) =>
                            onFiscalReferenceChange(e.target.value)
                          }
                          className="mt-1 rounded-xl"
                        />
                        <p className="text-xs text-admin-warning mt-1">
                          Se recomienda registrar el número para trazabilidad
                          con documentos fiscales reales
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-admin-text-tertiary">
              <CreditCard className="h-12 w-12 mx-auto mb-2 text-admin-text-tertiary" />
              <p>
                {searchTerm
                  ? "No se encontraron resultados"
                  : "No hay órdenes con saldo pendiente"}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cerrar
          </Button>
          {selectedOrder && (
            <Button
              onClick={onProcessPayment}
              disabled={processingPayment || !pendingPaymentAmount}
              className="rounded-xl"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Registrar Pago
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
