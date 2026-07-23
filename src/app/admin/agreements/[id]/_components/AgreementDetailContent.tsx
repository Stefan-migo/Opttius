"use client";

import {
  ArrowLeft,
  Building2,
  DollarSign,
  Download,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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
import type {
  Agreement,
  AgreementCustomer,
  AgreementInstitutionalBalance,
  AgreementInstitutionalInvoice,
} from "@/lib/api/services/agreementService";
import { agreementService } from "@/lib/api/services/agreementService";
import { handleApiError } from "@/lib/api/services/errorService";
import { formatCurrency, formatDate } from "@/lib/utils";

import { AgreementAnalyticsCards } from "./_components/AgreementAnalyticsCards";
import { AgreementCustomersCard } from "./_components/AgreementCustomersCard";
import { AgreementInvoicesCard } from "./_components/AgreementInvoicesCard";

export default function AgreementDetailContent() {
  const params = useParams();
  const id = params.id as string;

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [balances, setBalances] = useState<AgreementInstitutionalBalance[]>([]);
  const [analytics, setAnalytics] = useState<{
    total_orders: number;
    unique_customers?: number;
    total_sales: number;
    total_copago: number;
    total_institutional: number;
    pending_amount: number;
    paid_amount: number;
    collection_efficiency: number;
  } | null>(null);
  const [invoices, setInvoices] = useState<AgreementInstitutionalInvoice[]>([]);
  const [customers, setCustomers] = useState<AgreementCustomer[]>([]);
  const [customersPagination, setCustomersPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchAgreement();
      fetchBalances();
      fetchAnalytics();
      fetchInvoices();
      fetchCustomers(1);
    }
  }, [id]);

  const fetchAgreement = async () => {
    try {
      setLoading(true);
      const data = await agreementService.getAgreement(id);
      setAgreement(data);
      setError(null);
    } catch (err) {
      const e = handleApiError(err, "Convenio");
      setError(e?.message || "Error al cargar convenio");
    } finally {
      setLoading(false);
    }
  };
  const fetchBalances = async () => {
    try {
      setBalances(await agreementService.getInstitutionalBalances(id));
    } catch {
      setBalances([]);
    }
  };
  const fetchAnalytics = async () => {
    try {
      setAnalytics(await agreementService.getAgreementAnalytics(id));
    } catch {
      setAnalytics(null);
    }
  };
  const fetchInvoices = async () => {
    try {
      const { data } = await agreementService.getAgreementInvoices(id, {
        limit: 5,
      });
      setInvoices(data);
    } catch {
      setInvoices([]);
    }
  };
  const fetchCustomers = async (page = 1) => {
    try {
      const { data, pagination } = await agreementService.getAgreementCustomers(
        id,
        { page, limit: 10 },
      );
      setCustomers(data);
      setCustomersPagination({
        page: pagination.page,
        total: pagination.total,
        totalPages: pagination.totalPages,
      });
    } catch {
      setCustomers([]);
    }
  };

  const handleExportPlanilla = () =>
    window.open(`/api/admin/agreements/${id}/export-planilla`, "_blank");

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      active: { variant: "default", label: "Activo" },
      suspended: { variant: "secondary", label: "Suspendido" },
      expired: { variant: "outline", label: "Expirado" },
      cancelled: { variant: "destructive", label: "Cancelado" },
    };
    const c = config[status] || { variant: "outline" as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getTypeLabel = (type: string) =>
    ({ empresa: "Empresa", sindicato: "Sindicato", mutual: "Mutual" })[type] ||
    type;

  const pendingTotal = balances
    .filter((b) => b.status === "pending")
    .reduce((s, b) => s + b.amount, 0);

  if (loading && !agreement)
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-12 w-12 animate-spin text-admin-accent-primary" />
      </div>
    );
  if (error || !agreement)
    return (
      <div className="space-y-6">
        <Link href="/admin/agreements">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error || "Convenio no encontrado"}
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/agreements">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-admin-text-primary">
              {agreement.name}
            </h1>
            <p className="text-sm text-admin-text-tertiary">
              {getTypeLabel(agreement.agreement_type)} •{" "}
              {agreement.institution_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPlanilla}>
            <Download className="h-4 w-4 mr-2" />
            Export planilla
          </Button>
          <Link href={`/admin/agreements/${id}/institutional-balances`}>
            <Button variant="default">
              <DollarSign className="h-4 w-4 mr-2" />
              Cobranza pendiente
            </Button>
          </Link>
        </div>
      </div>

      <AgreementAnalyticsCards analytics={analytics} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos del convenio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="text-admin-text-tertiary">Razón social:</span>{" "}
              {agreement.institution_name}
            </p>
            <p>
              <span className="text-admin-text-tertiary">RUT:</span>{" "}
              {agreement.institution_rut}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-admin-text-tertiary">Estado:</span>{" "}
              {getStatusBadge(agreement.status)}
            </div>
            <p>
              <span className="text-admin-text-tertiary">Vigencia:</span>{" "}
              {formatDate(agreement.valid_from)}
              {agreement.valid_until
                ? ` - ${formatDate(agreement.valid_until)}`
                : " (indefinido)"}
            </p>
            {agreement.representative_name && (
              <p>
                <span className="text-admin-text-tertiary">Contacto:</span>{" "}
                {agreement.representative_name}
                {agreement.representative_email &&
                  ` (${agreement.representative_email})`}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cobranza pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-admin-text-primary">
              {formatCurrency(pendingTotal)}
            </p>
            <p className="text-sm text-admin-text-tertiary">
              {balances.filter((b) => b.status === "pending").length} venta(s)
              pendiente(s)
            </p>
            <Link href={`/admin/agreements/${id}/institutional-balances`}>
              <Button className="mt-2" size="sm" variant="outline">
                Ver detalle
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <AgreementInvoicesCard id={id} invoices={invoices} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Órdenes de compra
            </CardTitle>
            <Link href={`/admin/agreements/${id}/purchase-orders/new`}>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Registrar OC
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {agreement.purchase_orders && agreement.purchase_orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número OC</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Usado</TableHead>
                  <TableHead>Máximo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agreement.purchase_orders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>{po.oc_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{po.status}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(po.used_amount)}</TableCell>
                    <TableCell>
                      {po.max_amount
                        ? formatCurrency(po.max_amount)
                        : "Sin límite"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-admin-text-tertiary py-4">
              No hay órdenes de compra registradas.{" "}
              <Link
                className="text-admin-accent-primary hover:underline"
                href={`/admin/agreements/${id}/purchase-orders/new`}
              >
                Registrar primera OC
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <AgreementCustomersCard
        customers={customers}
        page={customersPagination.page}
        totalPages={customersPagination.totalPages}
        onPageChange={fetchCustomers}
      />
    </div>
  );
}
