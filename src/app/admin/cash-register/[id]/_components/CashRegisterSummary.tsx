"use client";

import {
  Banknote,
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CashClosure {
  id: string;
  branch_id: string;
  closure_date: string;
  closed_by: string;
  opening_cash_amount: number;
  total_sales: number;
  total_transactions: number;
  cash_sales: number;
  debit_card_sales: number;
  credit_card_sales: number;
  installments_sales: number;
  other_payment_sales: number;
  expected_cash: number;
  actual_cash: number | null;
  cash_difference: number;
  card_machine_debit_total: number;
  card_machine_credit_total: number;
  card_machine_difference: number;
  total_subtotal: number;
  total_tax: number;
  total_discounts: number;
  closing_cash_amount: number | null;
  notes: string | null;
  discrepancies: string | null;
  status: string;
  opened_at: string;
  closed_at: string;
  confirmed_at: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;
  reopen_count?: number;
  reopen_notes?: string | null;
  pos_session_id?: string;
  branch?: { id: string; name: string; code: string };
  closed_by_user?: { id: string; first_name: string; last_name: string };
}

interface CashRegisterSummaryProps {
  closure: CashClosure;
  formatCurrency: (value: number) => string;
  formatDateTime: (date: string | null | undefined) => string;
}

export default function CashRegisterSummary({
  closure,
  formatCurrency,
  formatDateTime,
}: CashRegisterSummaryProps) {
  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-admin-bg-tertiary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-admin-text-tertiary flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold text-epoch-primary">
              {formatCurrency(closure.total_sales)}
            </p>
            <p className="text-xs sm:text-sm text-admin-text-tertiary mt-1">
              {closure.total_transactions} transacciones
            </p>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-admin-text-tertiary flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Efectivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold text-admin-success">
              {formatCurrency(closure.cash_sales)}
            </p>
            {closure.actual_cash !== null && (
              <p className="text-xs sm:text-sm text-admin-text-tertiary mt-1">
                Físico: {formatCurrency(closure.actual_cash)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-admin-text-tertiary flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Tarjetas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold text-epoch-primary">
              {formatCurrency(
                closure.debit_card_sales + closure.credit_card_sales,
              )}
            </p>
            <p className="text-xs sm:text-sm text-admin-text-tertiary mt-1">
              Débito: {formatCurrency(closure.debit_card_sales)} | Crédito:{" "}
              {formatCurrency(closure.credit_card_sales)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cash Reconciliation */}
        <Card className="bg-admin-bg-tertiary">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Reconciliación de Efectivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-admin-text-tertiary">Monto Inicial:</span>
              <span className="font-semibold">
                {formatCurrency(closure.opening_cash_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-admin-text-tertiary">
                Ventas en Efectivo:
              </span>
              <span className="font-semibold">
                {formatCurrency(closure.cash_sales)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-admin-text-tertiary font-semibold">
                Efectivo Esperado:
              </span>
              <span className="font-bold text-admin-success">
                {formatCurrency(closure.expected_cash)}
              </span>
            </div>
            {closure.actual_cash !== null && (
              <>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-admin-text-tertiary">
                    Efectivo Físico:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(closure.actual_cash)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-admin-text-tertiary font-semibold">
                    Diferencia:
                  </span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      closure.cash_difference > 0
                        ? "text-green-600"
                        : closure.cash_difference < 0
                          ? "text-red-600"
                          : "text-admin-text-tertiary"
                    }`}
                  >
                    {closure.cash_difference !== 0 &&
                      (closure.cash_difference > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      ))}
                    {formatCurrency(Math.abs(closure.cash_difference))}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card Machine Reconciliation */}
        <Card className="bg-admin-bg-tertiary">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Reconciliación de Tarjetas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-admin-text-tertiary">Ventas Débito:</span>
              <span className="font-semibold">
                {formatCurrency(closure.debit_card_sales)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-admin-text-tertiary">Máquina Débito:</span>
              <span className="font-semibold">
                {formatCurrency(closure.card_machine_debit_total)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-admin-text-tertiary">Ventas Crédito:</span>
              <span className="font-semibold">
                {formatCurrency(closure.credit_card_sales)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-admin-text-tertiary">Máquina Crédito:</span>
              <span className="font-semibold">
                {formatCurrency(closure.card_machine_credit_total)}
              </span>
            </div>
            {closure.card_machine_difference !== 0 && (
              <div className="flex justify-between border-t pt-2">
                <span className="text-admin-text-tertiary font-semibold">
                  Diferencia:
                </span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    closure.card_machine_difference > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {closure.card_machine_difference > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {formatCurrency(Math.abs(closure.card_machine_difference))}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      <Card className="bg-admin-bg-tertiary">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Desglose por Método de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Efectivo
              </p>
              <p className="text-base sm:text-xl font-bold">
                {formatCurrency(closure.cash_sales)}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Tarjeta Débito
              </p>
              <p className="text-base sm:text-xl font-bold">
                {formatCurrency(closure.debit_card_sales)}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Tarjeta Crédito
              </p>
              <p className="text-base sm:text-xl font-bold">
                {formatCurrency(closure.credit_card_sales)}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Cuotas
              </p>
              <p className="text-base sm:text-xl font-bold">
                {formatCurrency(closure.installments_sales)}
              </p>
            </div>
            {closure.other_payment_sales > 0 && (
              <div>
                <p className="text-xs sm:text-sm text-admin-text-tertiary">
                  Otros
                </p>
                <p className="text-base sm:text-xl font-bold">
                  {formatCurrency(closure.other_payment_sales)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="bg-admin-bg-tertiary">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Resumen Financiero
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-admin-text-tertiary">Subtotal:</span>
            <span className="font-semibold">
              {formatCurrency(closure.total_subtotal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-admin-text-tertiary">IVA:</span>
            <span className="font-semibold">
              {formatCurrency(closure.total_tax)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-admin-text-tertiary">Descuentos:</span>
            <span className="font-semibold">
              {formatCurrency(closure.total_discounts)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-admin-text-tertiary font-semibold">
              Total:
            </span>
            <span className="font-bold text-xl sm:text-2xl text-epoch-primary">
              {formatCurrency(closure.total_sales)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="bg-admin-bg-tertiary">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {closure.branch && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-admin-text-tertiary" />
              <span className="text-admin-text-tertiary">Sucursal:</span>
              <span className="font-semibold">
                {closure.branch.name} ({closure.branch.code})
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-admin-text-tertiary" />
            <span className="text-admin-text-tertiary">Cerrado por:</span>
            <span className="font-semibold">
              {closure.closed_by_user
                ? `${closure.closed_by_user.first_name} ${closure.closed_by_user.last_name}`
                : "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-admin-text-tertiary" />
            <span className="text-admin-text-tertiary">Abierto:</span>
            <span className="font-semibold">
              {formatDateTime(closure.opened_at)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-admin-text-tertiary" />
            <span className="text-admin-text-tertiary">Cerrado:</span>
            <span className="font-semibold">
              {formatDateTime(closure.closed_at)}
            </span>
          </div>
          {closure.confirmed_at && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-admin-text-tertiary" />
              <span className="text-admin-text-tertiary">Confirmado:</span>
              <span className="font-semibold">
                {formatDateTime(closure.confirmed_at)}
              </span>
            </div>
          )}
          {closure.reopened_at && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <RefreshCw className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">Caja Reabierta</p>
                  <p className="text-sm text-blue-800 mt-1">
                    Reabierta el {formatDateTime(closure.reopened_at)}
                    {closure.reopen_count &&
                      closure.reopen_count > 1 &&
                      ` (${closure.reopen_count} veces)`}
                  </p>
                  {closure.reopen_notes && (
                    <p className="text-sm text-blue-700 mt-2 italic">
                      Notas: {closure.reopen_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {closure.notes && (
            <div className="mt-4">
              <p className="text-sm text-admin-text-tertiary mb-1">Notas:</p>
              <p className="text-sm">{closure.notes}</p>
            </div>
          )}
          {closure.discrepancies && (
            <div className="mt-4">
              <p className="text-sm text-admin-text-tertiary mb-1">
                Discrepancias:
              </p>
              <p className="text-sm text-red-600">{closure.discrepancies}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
