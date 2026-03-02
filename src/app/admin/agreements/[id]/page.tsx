"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  FileText,
  DollarSign,
  Download,
  Loader2,
  Plus,
  Users,
  Eye,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import {
  agreementService,
  Agreement,
  AgreementInstitutionalBalance,
  AgreementCustomer,
  AgreementInstitutionalInvoice,
} from "@/lib/api/services/agreementService";
import { handleApiError } from "@/lib/services/errorService";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function AgreementDetailPage() {
  const params = useParams();
  const router = useRouter();
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
      const errorObj = handleApiError(err, "Convenio");
      setError(errorObj?.message || "Error al cargar convenio");
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    try {
      const data = await agreementService.getInstitutionalBalances(id);
      setBalances(data);
    } catch {
      setBalances([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await agreementService.getAgreementAnalytics(id);
      setAnalytics(data);
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

  const fetchCustomers = async (page: number = 1) => {
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

  const handleExportPlanilla = () => {
    window.open(`/api/admin/agreements/${id}/export-planilla`, "_blank");
  };

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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      empresa: "Empresa",
      sindicato: "Sindicato",
      mutual: "Mutual",
    };
    return labels[type] || type;
  };

  const pendingTotal = balances
    .filter((b) => b.status === "pending")
    .reduce((s, b) => s + b.amount, 0);

  if (loading && !agreement) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-12 w-12 animate-spin text-admin-accent-primary" />
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="space-y-6">
        <Link href="/admin/agreements">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error || "Convenio no encontrado"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/agreements">
            <Button variant="ghost" size="icon">
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

      {analytics && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-admin-text-tertiary">
                Órdenes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-admin-text-primary">
                {analytics.total_orders}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-admin-text-tertiary">
                Clientes únicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-admin-text-primary">
                {analytics.unique_customers ?? "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-admin-text-tertiary">
                Ventas totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-admin-success">
                {formatCurrency(analytics.total_sales)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-admin-text-tertiary">
                Eficiencia cobranza
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-admin-accent-primary">
                {analytics.collection_efficiency}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

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
              <Button variant="outline" size="sm" className="mt-2">
                Ver detalle
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Facturas a institución
            </CardTitle>
            <Link href={`/admin/agreements/${id}/invoices`}>
              <Button variant="outline" size="sm">
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
                  <TableHead></TableHead>
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
                        <Link
                          href={`/admin/agreements/${id}/invoices/${inv.id}`}
                        >
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {inv.pdf_url && (
                          <a
                            href={inv.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm">
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Órdenes de compra
            </CardTitle>
            <Link href={`/admin/agreements/${id}/purchase-orders/new`}>
              <Button variant="outline" size="sm">
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
                href={`/admin/agreements/${id}/purchase-orders/new`}
                className="text-admin-accent-primary hover:underline"
              >
                Registrar primera OC
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clientes del convenio
          </CardTitle>
          <p className="text-sm text-admin-text-tertiary">
            Clientes que han comprado bajo este convenio
          </p>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-admin-text-tertiary py-4">
              Aún no hay clientes que hayan comprado bajo este convenio.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>RUT</TableHead>
                    <TableHead>Órdenes</TableHead>
                    <TableHead>Última compra</TableHead>
                    <TableHead>Total copago</TableHead>
                    <TableHead>Total institucional</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.customer_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {[c.first_name, c.last_name]
                              .filter(Boolean)
                              .join(" ") || "Sin nombre"}
                          </div>
                          {c.email && (
                            <div className="text-sm text-admin-text-tertiary">
                              {c.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-admin-text-tertiary">
                        {c.rut || "-"}
                      </TableCell>
                      <TableCell>{c.order_count}</TableCell>
                      <TableCell className="text-admin-text-tertiary">
                        {formatDate(c.last_order_at)}
                      </TableCell>
                      <TableCell>{formatCurrency(c.total_copago)}</TableCell>
                      <TableCell>
                        {formatCurrency(c.total_institutional)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/customers/${c.customer_id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {customersPagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={customersPagination.page <= 1}
                    onClick={() => fetchCustomers(customersPagination.page - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-admin-text-tertiary">
                    Página {customersPagination.page} de{" "}
                    {customersPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      customersPagination.page >= customersPagination.totalPages
                    }
                    onClick={() => fetchCustomers(customersPagination.page + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
