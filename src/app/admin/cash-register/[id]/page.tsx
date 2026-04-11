"use client";

import {
  ArrowLeft,
  Banknote,
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  FileText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { extractDataFromResponse } from "@/lib/api/response-helpers";
import { formatCurrency, formatDateTime } from "@/lib/utils";

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
  status: "draft" | "confirmed" | "reviewed" | "closed" | "reopened";
  opened_at: string;
  closed_at: string;
  confirmed_at: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;
  reopen_count?: number;
  reopen_notes?: string | null;
  pos_session_id?: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  closed_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
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

export default function CashClosureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const closureId = params.id as string;

  const [closure, setClosure] = useState<CashClosure | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementFilter, setMovementFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClosure();
  }, [closureId]);

  useEffect(() => {
    if (closure?.pos_session_id) {
      fetchMovements(closure.pos_session_id);
    }
  }, [closure?.pos_session_id]);

  const fetchClosure = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/cash-register/closures/${closureId}`,
        {
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        setClosure(data.closure);
        setOrders(extractDataFromResponse(data));
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al cargar el cierre de caja");
        router.push("/admin/cash-register");
      }
    } catch (error: unknown) {
      console.error("Error fetching closure:", error);
      toast.error("Error al cargar el cierre de caja");
      router.push("/admin/cash-register");
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async (sessionId: string) => {
    setLoadingMovements(true);
    try {
      const response = await fetch(
        `/api/admin/cash-register/session-movements?session_id=${sessionId}`,
        { credentials: "include" },
      );

      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements || []);
      } else {
        console.error("Error fetching movements");
      }
    } catch (error: unknown) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const getStatusBadge = (status: string, reopenedAt?: string | null) => {
    type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

    const config: Record<string, { variant: BadgeVariant; label: string }> = {
      draft: { variant: "outline", label: "Borrador" },
      confirmed: { variant: "secondary", label: "Confirmado" },
      reviewed: { variant: "secondary", label: "Revisado" },
      closed: { variant: "default", label: "Cerrada" },
      reopened: { variant: "secondary", label: "Abierta" },
    };

    // Si está cerrada pero fue reabierta, mostrar como "Abierta"
    if (status === "closed" && reopenedAt) {
      const badgeConfig = config.reopened || {
        variant: "outline" as BadgeVariant,
        label: "Abierta",
      };
      return <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>;
    }

    const badgeConfig = config[status] || {
      variant: "outline" as BadgeVariant,
      label: status,
    };
    return <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Efectivo",
      debit_card: "Tarjeta Débito",
      credit_card: "Tarjeta Crédito",
      installments: "Cuotas",
      transfer: "Transferencia",
      check: "Cheque",
      other: "Otro",
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
          <p className="text-admin-text-tertiary">Cargando cierre de caja...</p>
        </div>
      </div>
    );
  }

  if (!closure) {
    return null;
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 min-w-0">
          <Link className="shrink-0" href="/admin/cash-register">
            <Button className="w-full sm:w-auto" size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-epoch-primary truncate">
              Cierre de Caja
            </h1>
            <p className="text-sm text-admin-text-tertiary">
              {formatDateTime(closure.closure_date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge(closure.status, closure.reopened_at)}
        </div>
      </div>

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

      {/* Movements Detail */}
      {closure.pos_session_id && (
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
                  onValueChange={setMovementFilter}
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
      )}

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
    </div>
  );
}
