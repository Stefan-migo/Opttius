"use client";

import {
  CheckCircle,
  Eye,
  FileText,
  RefreshCw,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

import type { CashClosure } from "./cashRegister.types";

// ponytail: icon map inline — too few variants to justify extraction
const STATUS_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  draft: RefreshCw,
  confirmed: CheckCircle,
  reviewed: Eye,
  closed: CheckCircle,
  reopened: RefreshCw,
};

interface ClosureSectionProps {
  loading: boolean;
  closures: CashClosure[];
  closuresCurrentPage: number;
  closuresItemsPerPage: number;
  closuresTotalCount: number;
  effectiveBranchId: string | null;
  isOperativoMode: boolean;
  isSuperAdmin: boolean;
  reopening: boolean;
  getStatusBadge: (
    status: string,
    reopenedAt?: string | null,
    posSessionId?: string | null,
  ) => { variant: string; label: string; status: string };
  handleReopenCash: (sessionId: string) => Promise<void>;
  setClosuresCurrentPage: (v: number) => void;
  setClosuresItemsPerPage: (v: number) => void;
}

export function CashRegisterClosureSection(props: ClosureSectionProps) {
  const {
    loading,
    closures,
    closuresCurrentPage,
    closuresItemsPerPage,
    closuresTotalCount,
    effectiveBranchId,
    isOperativoMode,
    isSuperAdmin,
    reopening,
    getStatusBadge,
    handleReopenCash,
    setClosuresCurrentPage,
    setClosuresItemsPerPage,
  } = props;

  const renderStatusBadgeElement = (
    status: string,
    reopenedAt?: string | null,
    posSessionId?: string | null,
  ): ReactNode => {
    const {
      variant,
      label,
      status: st,
    } = getStatusBadge(status, reopenedAt, posSessionId);
    const Icon = STATUS_ICONS[st] || FileText;
    return (
      <Badge
        className="flex items-center gap-1"
        variant={variant as "default" | "secondary" | "destructive" | "outline"}
      >
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] min-w-0">
      <CardHeader>
        <CardTitle>Cierres de Caja</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
            <p className="text-admin-text-tertiary">Cargando cierres...</p>
          </div>
        ) : closures.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-epoch-primary mb-2">
              No hay cierres de caja
            </h3>
            <p className="text-admin-text-tertiary">
              {effectiveBranchId
                ? isOperativoMode
                  ? "Aún no se ha cerrado la caja para este operativo"
                  : "Aún no se ha cerrado la caja para esta sucursal"
                : "Seleccione una sucursal para ver sus cierres de caja"}
            </p>
          </div>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  {isSuperAdmin && <TableHead>Sucursal</TableHead>}
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ventas Totales</TableHead>
                  <TableHead>Transacciones</TableHead>
                  <TableHead>Efectivo</TableHead>
                  <TableHead>Tarjeta Débito</TableHead>
                  <TableHead>Tarjeta Crédito</TableHead>
                  <TableHead>Transferencias</TableHead>
                  <TableHead>Diferencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cerrado por</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closures.map((closure) => {
                  const transferSales = closure.other_payment_sales || 0;
                  return (
                    <TableRow key={closure.id}>
                      {isSuperAdmin && (
                        <TableCell>{closure.branch?.name || "N/A"}</TableCell>
                      )}
                      <TableCell>{formatDate(closure.closure_date)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(closure.total_sales)}
                      </TableCell>
                      <TableCell>{closure.total_transactions}</TableCell>
                      <TableCell>
                        {formatCurrency(closure.cash_sales)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(closure.debit_card_sales)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(closure.credit_card_sales)}
                      </TableCell>
                      <TableCell>{formatCurrency(transferSales)}</TableCell>
                      <TableCell>
                        {closure.cash_difference !== null &&
                        closure.cash_difference !== undefined ? (
                          <div className="flex items-center gap-1">
                            {closure.cash_difference > 0 ? (
                              <>
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-green-600 font-semibold">
                                  +
                                  {formatCurrency(
                                    Math.abs(closure.cash_difference),
                                  )}
                                </span>
                              </>
                            ) : closure.cash_difference < 0 ? (
                              <>
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                <span className="text-red-600 font-semibold">
                                  {formatCurrency(closure.cash_difference)}
                                </span>
                              </>
                            ) : (
                              <span className="text-admin-text-tertiary">
                                $0
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-admin-text-tertiary">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {renderStatusBadgeElement(
                          closure.status,
                          closure.reopened_at,
                          closure.pos_session_id,
                        )}
                      </TableCell>
                      <TableCell>
                        {closure.closed_by_user
                          ? `${closure.closed_by_user.first_name} ${closure.closed_by_user.last_name}`
                          : "N/A"}
                      </TableCell>
                      <TableCell className="space-x-2">
                        {isSuperAdmin &&
                          (closure.status === "closed" ||
                            closure.status === "draft") &&
                          closure.pos_session_id && (
                            <Button
                              disabled={reopening}
                              size="sm"
                              title="Solo superadmin puede reabrir cajas cerradas"
                              variant="outline"
                              onClick={() =>
                                handleReopenCash(closure.pos_session_id || "")
                              }
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Reabrir
                            </Button>
                          )}
                        <Link href={`/admin/cash-register/${closure.id}`}>
                          <Button
                            size="sm"
                            title={
                              closure.reopened_at
                                ? `Caja reabierta${closure.reopen_count && closure.reopen_count > 1 ? ` ${closure.reopen_count} veces` : ""}${closure.reopen_notes ? `. Notas: ${closure.reopen_notes}` : ""}`
                                : undefined
                            }
                            variant="outline"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                            {closure.reopened_at && (
                              <RefreshCw className="h-3 w-3 ml-1 text-blue-600" />
                            )}
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && closures.length > 0 && (
          <div className="mt-4 w-full min-w-0 overflow-x-auto">
            <Pagination
              className="flex-wrap gap-y-2"
              currentPage={closuresCurrentPage}
              itemsPerPage={closuresItemsPerPage}
              itemsPerPageOptions={[10, 20, 50, 100]}
              totalItems={closuresTotalCount}
              totalPages={Math.ceil(closuresTotalCount / closuresItemsPerPage)}
              onItemsPerPageChange={setClosuresItemsPerPage}
              onPageChange={setClosuresCurrentPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
