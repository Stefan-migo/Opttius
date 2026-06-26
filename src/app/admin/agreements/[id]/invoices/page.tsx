"use client";

import { ArrowLeft, Download, Eye, Loader2, Receipt } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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
import {
  AgreementInstitutionalInvoice,
  agreementService,
} from "@/lib/api/services/agreementService";
import { handleApiError } from "@/lib/api/services/errorService";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AgreementInvoicesPage() {
  const params = useParams();
  const agreementId = params.id as string;

  const [invoices, setInvoices] = useState<AgreementInstitutionalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (agreementId) fetchInvoices();
  }, [agreementId]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data } = await agreementService.getAgreementInvoices(
        agreementId,
        { limit: 50 },
      );
      setInvoices(data);
      setError(null);
    } catch (err) {
      const errorObj = handleApiError(err, "Facturas");
      setError(errorObj?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/admin/agreements/${agreementId}`}>
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-admin-text-primary">
              Facturas a institución
            </h1>
            <p className="text-sm text-admin-text-tertiary">
              Facturas emitidas al convenio
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Listado de facturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-admin-accent-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-admin-text-tertiary py-8 text-center">
              No hay facturas emitidas
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Fecha emisión</TableHead>
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
                      {inv.period_from} - {inv.period_to}
                    </TableCell>
                    <TableCell>
                      {formatDate(inv.emitted_at ?? inv.created_at)}
                    </TableCell>
                    <TableCell>{formatCurrency(inv.total_amount)}</TableCell>
                    <TableCell>
                      <span className="capitalize">{inv.status}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link
                          href={`/admin/agreements/${agreementId}/invoices/${inv.id}`}
                        >
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </Link>
                        {inv.pdf_url && (
                          <a
                            href={inv.pdf_url}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              PDF
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
    </div>
  );
}
