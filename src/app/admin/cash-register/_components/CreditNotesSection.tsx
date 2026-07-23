"use client";

import { Eye, FileText, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface CreditNotesSectionProps {
  creditNotes: unknown[];
  loadingCreditNotes: boolean;
}

export function CreditNotesSection({ creditNotes, loadingCreditNotes }: CreditNotesSectionProps) {
  const typedCreditNotes = creditNotes as Record<string, unknown>[];

  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] min-w-0">
      <CardHeader>
        <CardTitle>Notas de Crédito</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingCreditNotes ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
            <p className="text-admin-text-tertiary">Cargando notas de crédito...</p>
          </div>
        ) : creditNotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-epoch-primary mb-2">No hay notas de crédito</h3>
            <p className="text-admin-text-tertiary">
              Las notas de crédito se crean al anular una venta con la opción correspondiente
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
                {typedCreditNotes.map((cn: Record<string, unknown>) => (
                  <TableRow key={cn.id}>
                    <TableCell className="font-mono font-medium">{cn.credit_note_number}</TableCell>
                    <TableCell>
                      {cn.order_id ? (
                        <Link href={`/admin/cash-register/orders/${cn.order_id}`}>
                          <Button className="p-0 h-auto" variant="link">{cn.order_number || "Ver orden"}</Button>
                        </Link>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">-{formatCurrency(cn.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {cn.refund_method === "cash" ? "Efectivo"
                          : cn.refund_method === "debit" ? "Débito"
                          : cn.refund_method === "credit" ? "Crédito"
                          : "Transferencia"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{cn.reason}</TableCell>
                    <TableCell>{formatDateTime(cn.created_at)}</TableCell>
                    <TableCell>
                      {cn.order_id && (
                        <Link href={`/admin/cash-register/orders/${cn.order_id}`}>
                          <Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-1" />Ver orden</Button>
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
  );
}
