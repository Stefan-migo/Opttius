"use client";

import { ArrowLeft, Download, Loader2 } from "lucide-react";
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
  agreementService,
  AgreementInstitutionalInvoice,
} from "@/lib/api/services/agreementService";
import { handleApiError } from "@/lib/api/services/errorService";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AgreementInvoiceDetailPage() {
  const params = useParams();
  const agreementId = params.id as string;
  const invoiceId = params.invoiceId as string;

  const [invoice, setInvoice] = useState<
    | (AgreementInstitutionalInvoice & {
        items?: Array<{
          balance_id: string;
          amount: number;
          order_number: string;
          oc_number: string | null;
          customer_name: string | null;
          order_created_at: string | null;
          subtotal?: number;
          tax_amount?: number;
        }>;
        institution_name?: string;
        institution_rut?: string;
        payment_reference?: string | null;
        subtotal?: number;
        tax_amount?: number;
      })
    | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (agreementId && invoiceId) fetchInvoice();
  }, [agreementId, invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await agreementService.getAgreementInvoice(
        agreementId,
        invoiceId,
      );
      setInvoice(data);
      setError(null);
    } catch (err) {
      const errorObj = handleApiError(err, "Factura");
      setError(errorObj?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  const pdfUrl = invoice?.pdf_url
    ? invoice.pdf_url
    : `/api/admin/agreements/${agreementId}/invoices/${invoiceId}/pdf`;

  if (loading && !invoice) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-12 w-12 animate-spin text-admin-accent-primary" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <Link href={`/admin/agreements/${agreementId}`}>
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error || "Factura no encontrada"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/admin/agreements/${agreementId}/invoices`}>
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-admin-text-primary">
              Factura {invoice.folio}
            </h1>
            <p className="text-sm text-admin-text-tertiary">
              {invoice.institution_name} • Período {invoice.period_from} -{" "}
              {invoice.period_to}
            </p>
          </div>
        </div>
        <a href={pdfUrl} rel="noopener noreferrer" target="_blank">
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la factura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="text-admin-text-tertiary">Folio:</span>{" "}
              {invoice.folio}
            </p>
            <p>
              <span className="text-admin-text-tertiary">Estado:</span>{" "}
              <span className="capitalize">{invoice.status}</span>
            </p>
            <p>
              <span className="text-admin-text-tertiary">Fecha emisión:</span>{" "}
              {formatDate(invoice.emitted_at ?? invoice.created_at)}
            </p>
            <p>
              <span className="text-admin-text-tertiary">Período:</span>{" "}
              {invoice.period_from} - {invoice.period_to}
            </p>
            {invoice.payment_reference && (
              <p>
                <span className="text-admin-text-tertiary">Ref. pago:</span>{" "}
                {invoice.payment_reference}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cliente (Institución)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="text-admin-text-tertiary">Razón social:</span>{" "}
              {invoice.institution_name}
            </p>
            <p>
              <span className="text-admin-text-tertiary">RUT:</span>{" "}
              {invoice.institution_rut}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.items && invoice.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>OC</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items?.map((item, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{item.order_number}</TableCell>
                    <TableCell>{item.oc_number ?? "-"}</TableCell>
                    <TableCell>{item.customer_name ?? "-"}</TableCell>
                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-admin-text-tertiary py-4">
              No hay items en esta factura.
            </p>
          )}
          <div className="mt-4 flex justify-end gap-4 text-right">
            <p>
              <span className="text-admin-text-tertiary">Subtotal:</span>{" "}
              {formatCurrency(Number(invoice.subtotal))}
            </p>
            <p>
              <span className="text-admin-text-tertiary">IVA:</span>{" "}
              {formatCurrency(Number(invoice.tax_amount))}
            </p>
            <p className="font-bold">
              <span className="text-admin-text-tertiary">Total:</span>{" "}
              {formatCurrency(Number(invoice.total_amount))}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
