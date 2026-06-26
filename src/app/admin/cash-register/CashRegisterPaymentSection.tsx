"use client";

import { AlertCircle, FileText, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import type { DailySummary, Movement } from "./cashRegister.types";

interface PaymentSectionProps {
  loadingSummary: boolean;
  dailySummary: DailySummary | null;
  movements: Movement[];
  loadingMovements: boolean;
  movementFilter: string;
  movementTypeFilter: string;
  openingCash: number;
  actualCash: number | null;
  cardMachineDebit: number;
  cardMachineCredit: number;
  transferTotal: number;
  notes: string;
  discrepancies: string;
  cashDifference: number | null;
  isOperativoMode: boolean;
  fieldOperationIdFromUrl: string | null;
  setOpeningCash: (v: number) => void;
  setActualCash: (v: number | null) => void;
  setCardMachineDebit: (v: number) => void;
  setCardMachineCredit: (v: number) => void;
  setTransferTotal: (v: number) => void;
  setNotes: (v: string) => void;
  setDiscrepancies: (v: string) => void;
  setMovementFilter: (v: string) => void;
  setMovementTypeFilter: (v: string) => void;
}

export function CashRegisterPaymentSection(props: PaymentSectionProps) {
  const {
    loadingSummary,
    dailySummary,
    movements,
    loadingMovements,
    movementFilter,
    movementTypeFilter,
    openingCash,
    actualCash,
    cardMachineDebit,
    cardMachineCredit,
    transferTotal,
    notes,
    discrepancies,
    cashDifference,
    isOperativoMode,
    fieldOperationIdFromUrl,
    setOpeningCash,
    setActualCash,
    setCardMachineDebit,
    setCardMachineCredit,
    setTransferTotal,
    setNotes,
    setDiscrepancies,
    setMovementFilter,
    setMovementTypeFilter,
  } = props;

  if (loadingSummary) {
    return (
      <div className="text-center py-6 sm:py-8">
        <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-epoch-primary mx-auto mb-3 sm:mb-4" />
        <p className="text-xs sm:text-sm text-admin-text-tertiary">
          Cargando resumen del día...
        </p>
      </div>
    );
  }

  if (!dailySummary) {
    return (
      <div className="text-center py-6 sm:py-8">
        <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-admin-text-tertiary mx-auto mb-3 sm:mb-4" />
        <p className="text-xs sm:text-sm text-admin-text-tertiary">
          No hay datos disponibles para cerrar la caja
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-1 pt-4 sm:pt-6">
          <CardTitle className="text-sm sm:text-base">
            Resumen del Día
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
          <div>
            <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
              Total Ventas
            </p>
            <p className="text-sm sm:text-base font-bold mt-0.5">
              {formatCurrency(dailySummary.total_sales)}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
              Transacciones
            </p>
            <p className="text-sm sm:text-base font-bold mt-0.5">
              {dailySummary.total_transactions}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
              Efectivo Neto
            </p>
            <p className="text-sm sm:text-base font-bold mt-0.5">
              {formatCurrency(dailySummary.cash_sales)}
            </p>
            {(dailySummary.cash_inflows != null ||
              dailySummary.cash_outflows != null) && (
              <p className="text-[9px] sm:text-[10px] text-admin-text-tertiary mt-0.5 break-words">
                Ing: {formatCurrency(dailySummary.cash_inflows ?? 0)} | Eg: -
                {formatCurrency(dailySummary.cash_outflows ?? 0)}
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
              Débito
            </p>
            <p className="text-sm sm:text-base font-bold mt-0.5">
              {formatCurrency(dailySummary.debit_card_sales)}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
              Crédito
            </p>
            <p className="text-sm sm:text-base font-bold mt-0.5">
              {formatCurrency(dailySummary.credit_card_sales)}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
              Transferencias
            </p>
            <p className="text-sm sm:text-base font-bold mt-0.5">
              {formatCurrency(dailySummary.transfer_sales || 0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-admin-text-tertiary">
              Efectivo Esperado
            </p>
            <p className="text-sm sm:text-base font-bold text-admin-success mt-0.5">
              {formatCurrency(dailySummary.expected_cash)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions for Cash Reconciliation */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
            <span className="break-words">
              Instrucciones para Cuadre de Caja
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
          <p className="break-words">
            <strong>1. Efectivo Físico Contado:</strong> Cuente el dinero en su
            caja física
          </p>
          <p className="break-words">
            <strong>2. Máquina Débito:</strong> Ingrese el total de la máquina
            de débito (total de vouchers)
          </p>
          <p className="break-words">
            <strong>3. Máquina Crédito:</strong> Ingrese el total de la máquina
            de crédito (total de vouchers)
          </p>
          <p>
            <strong>Referencia para cuadre:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li className="break-words">
              Efectivo esperado:{" "}
              <strong>{formatCurrency(dailySummary.expected_cash)}</strong>{" "}
              (Monto inicial {formatCurrency(dailySummary.opening_cash_amount)}{" "}
              + efectivo neto {formatCurrency(dailySummary.cash_sales)})
            </li>
            {(dailySummary.cash_inflows != null ||
              dailySummary.cash_outflows != null) && (
              <li className="text-[10px] sm:text-xs break-words">
                Desglose: Ingresos{" "}
                {formatCurrency(dailySummary.cash_inflows ?? 0)} - Egresos{" "}
                {formatCurrency(dailySummary.cash_outflows ?? 0)}
              </li>
            )}
            <li>
              Ventas débito:{" "}
              <strong>{formatCurrency(dailySummary.debit_card_sales)}</strong>
            </li>
            <li>
              Ventas crédito:{" "}
              <strong>{formatCurrency(dailySummary.credit_card_sales)}</strong>
            </li>
            <li className="break-words">
              Ventas transferencia:{" "}
              <strong>
                {formatCurrency(dailySummary.transfer_sales || 0)}
              </strong>{" "}
              (NO se cuenta en efectivo físico)
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Movements Detail */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Detalle de Movimientos
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select
                value={movementTypeFilter}
                onValueChange={setMovementTypeFilter}
              >
                <SelectTrigger className="w-full sm:w-36 min-h-[44px] sm:min-h-0 text-sm">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="sale">Venta</SelectItem>
                  <SelectItem value="partial_payment">Pago Saldo</SelectItem>
                  <SelectItem value="credit_note">Nota de Crédito</SelectItem>
                </SelectContent>
              </Select>
              <Select value={movementFilter} onValueChange={setMovementFilter}>
                <SelectTrigger className="w-full sm:w-36 min-h-[44px] sm:min-h-0 text-sm">
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los métodos</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {loadingMovements ? (
            <div className="text-center py-6 sm:py-8">
              <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-epoch-primary mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Cargando movimientos...
              </p>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-admin-text-tertiary text-xs sm:text-sm">
              <p>No hay movimientos registrados en esta sesión</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <div className="text-xs sm:text-sm text-admin-text-tertiary">
                Total de movimientos: <strong>{movements.length}</strong> |
                Total:{" "}
                <strong>
                  {formatCurrency(
                    movements.reduce((sum, m) => sum + m.amount, 0),
                  )}
                </strong>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-[520px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[70px] sm:w-[100px] text-xs sm:text-sm whitespace-nowrap">
                          Hora
                        </TableHead>
                        <TableHead className="w-[80px] sm:w-[100px] text-xs sm:text-sm whitespace-nowrap">
                          Tipo
                        </TableHead>
                        <TableHead className="w-[90px] sm:w-[120px] text-xs sm:text-sm whitespace-nowrap">
                          Orden
                        </TableHead>
                        <TableHead className="min-w-[100px] sm:min-w-[140px] text-xs sm:text-sm whitespace-nowrap">
                          Cliente
                        </TableHead>
                        <TableHead className="w-[80px] sm:w-[100px] text-xs sm:text-sm whitespace-nowrap">
                          Método
                        </TableHead>
                        <TableHead className="w-[90px] sm:w-[120px] text-xs sm:text-sm text-right whitespace-nowrap">
                          Monto
                        </TableHead>
                        <TableHead className="w-[80px] sm:w-[100px] text-xs sm:text-sm whitespace-nowrap">
                          Estado
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements
                        .filter((m) => {
                          if (
                            movementTypeFilter !== "all" &&
                            m.movement_type !== movementTypeFilter
                          )
                            return false;
                          if (movementFilter === "all") return true;
                          return m.payment_method_code === movementFilter;
                        })
                        .map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap py-2 sm:py-3">
                              {new Date(movement.paid_at).toLocaleTimeString(
                                "es-CL",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap py-2 sm:py-3">
                              <Badge
                                variant={
                                  movement.movement_type === "sale"
                                    ? "default"
                                    : movement.movement_type === "credit_note"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {movement.movement_type === "sale"
                                  ? "Venta"
                                  : movement.movement_type === "credit_note"
                                    ? "Nota de Crédito"
                                    : "Pago Saldo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap py-2 sm:py-3">
                              {movement.order_number}
                            </TableCell>
                            <TableCell className="min-w-[100px] sm:min-w-[140px] py-2 sm:py-3">
                              <div className="text-xs sm:text-sm">
                                <div className="truncate max-w-[80px] sm:max-w-none">
                                  {movement.customer_name}
                                </div>
                                {movement.customer_rut && (
                                  <div className="text-[10px] sm:text-xs text-admin-text-tertiary font-mono truncate max-w-[80px] sm:max-w-none">
                                    {movement.customer_rut}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap py-2 sm:py-3">
                              <Badge
                                className="text-[10px] sm:text-xs"
                                variant="outline"
                              >
                                {movement.payment_method}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={`text-right font-semibold whitespace-nowrap text-xs sm:text-sm py-2 sm:py-3 ${
                                movement.amount < 0 ? "text-red-600" : ""
                              }`}
                            >
                              {formatCurrency(movement.amount)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap py-2 sm:py-3">
                              <Badge
                                className="text-[10px] sm:text-xs"
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Reconciliation Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="sm:col-span-2">
          <Label className="text-xs sm:text-sm">Monto Inicial de Caja</Label>
          <Input
            className="h-11 sm:h-12 text-sm sm:text-base mt-1"
            placeholder="0"
            type="number"
            value={openingCash}
            onChange={(e) => setOpeningCash(Number(e.target.value))}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs sm:text-sm">
            Efectivo Físico Contado *
          </Label>
          <Input
            required
            className="h-11 sm:h-12 text-sm sm:text-base mt-1"
            placeholder="Monto contado físicamente"
            type="number"
            value={actualCash ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setActualCash(value === "" ? null : Number(value));
            }}
          />
          <p className="text-[10px] sm:text-xs text-admin-text-tertiary mt-1 break-words">
            Efectivo esperado: {formatCurrency(dailySummary.expected_cash || 0)}{" "}
            (Inicial {formatCurrency(dailySummary.opening_cash_amount || 0)} +
            efectivo {formatCurrency(dailySummary.cash_sales || 0)})
          </p>
          {actualCash !== null &&
            actualCash !== undefined &&
            cashDifference !== null && (
              <p
                className={`text-xs sm:text-sm mt-1 font-semibold ${cashDifference > 0 ? "text-green-600" : cashDifference < 0 ? "text-red-600" : "text-muted-foreground"}`}
              >
                Diferencia: {cashDifference > 0 ? "+" : ""}
                {formatCurrency(cashDifference)}
              </p>
            )}
        </div>
        <div>
          <Label className="text-xs sm:text-sm">Total Máquina Débito</Label>
          <Input
            className="h-11 sm:h-12 text-sm sm:text-base mt-1"
            placeholder="0"
            type="number"
            value={cardMachineDebit}
            onChange={(e) => setCardMachineDebit(Number(e.target.value))}
          />
        </div>
        <div>
          <Label className="text-xs sm:text-sm">Total Máquina Crédito</Label>
          <Input
            className="h-11 sm:h-12 text-sm sm:text-base mt-1"
            placeholder="0"
            type="number"
            value={cardMachineCredit}
            onChange={(e) => setCardMachineCredit(Number(e.target.value))}
          />
        </div>
        <div>
          <Label className="text-xs sm:text-sm">Total Transferencias</Label>
          <Input
            className="h-11 sm:h-12 text-sm sm:text-base mt-1"
            placeholder="0"
            type="number"
            value={transferTotal}
            onChange={(e) => setTransferTotal(Number(e.target.value))}
          />
        </div>
        <div>
          <Label className="text-xs sm:text-sm">Notas</Label>
          <Input
            className="h-11 sm:h-12 text-sm sm:text-base mt-1"
            placeholder="Notas adicionales..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs sm:text-sm">Discrepancias</Label>
          <Input
            className="h-11 sm:h-12 text-sm sm:text-base mt-1"
            placeholder="Describa discrepancia..."
            value={discrepancies}
            onChange={(e) => setDiscrepancies(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
