"use client";

import { Download, Eye, Receipt } from "lucide-react";
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
import type { AgreementInstitutionalInvoice } from "@/lib/api/services/agreementService";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Props {
  id: string;
  invoices: AgreementInstitutionalInvoice[];
}

export function AgreementInvoicesCard({ id, invoices }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Facturas a institución
          </CardTitle>
          <Link href={`/admin/agreements/${id}/invoices`}>
            <Button size="sm" variant="outline">
              Ver todas
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-admin-text-tertiary py-4">
            No hay facturas emitidas aún.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.folio}</TableCell>
                  <TableCell className="text-admin-text-tertiary">
                    {formatDate(inv.emitted_at ?? inv.created_at)}
                  </TableCell>
                  <TableCell>{formatCurrency(inv.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Link href={`/admin/agreements/${id}/invoices/${inv.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {inv.pdf_url && (
                        <a
                          href={inv.pdf_url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
