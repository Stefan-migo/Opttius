"use client";

import { FileText } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AgreementUsage {
  agreement_id: string;
  agreement_name: string | null;
  order_count: number;
  last_order_at: string;
  total_copago: number;
  total_institutional: number;
}

export function CustomerConveniosTab({ usage }: { usage: AgreementUsage[] }) {
  if (!usage || usage.length === 0) return null;

  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center text-admin-text-primary">
          <FileText className="h-5 w-5 mr-2" />
          Convenios utilizados
        </CardTitle>
        <p className="text-sm text-admin-text-tertiary mt-1">
          Historial de compras bajo convenio
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Convenio</TableHead>
              <TableHead>Órdenes</TableHead>
              <TableHead>Última compra</TableHead>
              <TableHead>Total copago</TableHead>
              <TableHead>Total institucional</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usage.map((u) => (
              <TableRow key={u.agreement_id}>
                <TableCell>
                  <Link
                    className="font-medium text-admin-accent-primary hover:underline"
                    href={`/admin/agreements/${u.agreement_id}`}
                  >
                    {u.agreement_name || "Sin nombre"}
                  </Link>
                </TableCell>
                <TableCell>{u.order_count}</TableCell>
                <TableCell className="text-admin-text-tertiary">
                  {formatDate(u.last_order_at)}
                </TableCell>
                <TableCell>{formatCurrency(u.total_copago)}</TableCell>
                <TableCell>{formatCurrency(u.total_institutional)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
