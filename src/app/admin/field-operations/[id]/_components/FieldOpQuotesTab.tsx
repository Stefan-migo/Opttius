"use client";

import { Eye, FileText, Plus, RefreshCw, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Quote } from "@/lib/api/services";
import { formatPrice } from "@/lib/utils";
import { formatRUT } from "@/lib/utils/rut";

interface FieldOpQuotesTabProps {
  quotes: Quote[];
  quotesLoading: boolean;
  fieldOperationId: string;
  onCreateQuote: () => void;
  onDeleteQuote: (quoteId: string) => void;
}

export function FieldOpQuotesTab({
  quotes,
  quotesLoading,
  fieldOperationId,
  onCreateQuote,
  onDeleteQuote,
}: FieldOpQuotesTabProps) {
  return (
    <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-admin-border-primary/20 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-admin-text-primary font-semibold">
          <FileText className="h-5 w-5 shrink-0" />
          Presupuestos del operativo
        </h3>
        <Button
          className="min-h-[44px] bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23]"
          size="sm"
          onClick={onCreateQuote}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo presupuesto
        </Button>
      </div>
      <div className="overflow-x-auto">
        {quotesLoading ? (
          <div className="p-8 flex justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-admin-text-tertiary" />
          </div>
        ) : quotes.length === 0 ? (
          <p className="p-6 text-admin-text-tertiary text-sm">
            No hay presupuestos vinculados a este operativo. Cree uno
            desde el botón arriba.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-admin-text-tertiary font-semibold">
                  Nº
                </TableHead>
                <TableHead className="text-admin-text-tertiary font-semibold">
                  Cliente
                </TableHead>
                <TableHead className="text-admin-text-tertiary font-semibold">
                  RUT
                </TableHead>
                <TableHead className="text-admin-text-tertiary font-semibold">
                  Teléfono / Email
                </TableHead>
                <TableHead className="text-admin-text-tertiary font-semibold">
                  Estado
                </TableHead>
                <TableHead className="text-admin-text-tertiary font-semibold text-right">
                  Total
                </TableHead>
                <TableHead className="text-admin-text-tertiary font-semibold">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow className="hover:bg-[#AE000025]" key={q.id}>
                  <TableCell className="font-medium text-admin-text-primary font-mono text-sm">
                    {q.quote_number || "—"}
                  </TableCell>
                  <TableCell className="text-admin-text-primary">
                    {q.customer
                      ? [q.customer.first_name, q.customer.last_name]
                          .filter(Boolean)
                          .join(" ") || "—"
                      : "—"}
                  </TableCell>
                  <TableCell className="text-admin-text-tertiary font-mono text-sm">
                    {q.customer?.rut ? formatRUT(q.customer.rut) : "—"}
                  </TableCell>
                  <TableCell className="text-admin-text-tertiary text-sm">
                    {q.customer?.phone || q.customer?.email || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className="text-xs" variant="outline">
                      {q.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-admin-text-primary">
                    {formatPrice(q.total_amount ?? 0)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        className="inline-flex items-center gap-1 text-admin-accent-primary hover:underline text-sm font-medium"
                        href={`/admin/quotes/${q.id}`}
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </Link>
                      {q.status !== "accepted" &&
                        !q.converted_to_work_order_id && (
                          <Link
                            className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium"
                            href={`/admin/pos?quoteId=${q.id}&field_operation_id=${fieldOperationId}`}
                            title="Cargar al POS del operativo"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Cargar al POS
                          </Link>
                        )}
                      <button
                        className="inline-flex items-center gap-1 text-admin-text-tertiary hover:text-red-500 text-sm disabled:opacity-50"
                        disabled={
                          q.status === "accepted" ||
                          !!q.converted_to_work_order_id
                        }
                        title="Eliminar"
                        type="button"
                        onClick={() => onDeleteQuote(q.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
