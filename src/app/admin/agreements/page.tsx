"use client";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
import { useBranch } from "@/hooks/useBranch";
import {
  Agreement,
  AgreementListParams,
  agreementService,
} from "@/lib/api/services/agreementService";
import { handleApiError } from "@/lib/api/services/errorService";
import { formatDate } from "@/lib/utils";

export default function AgreementsPage() {
  const { currentBranchId, isSuperAdmin } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchAgreements();
  }, [currentPage, statusFilter, typeFilter, currentBranchId, isGlobalView]);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      const params: AgreementListParams = {
        page: currentPage,
        limit: 20,
        branchId: isGlobalView ? undefined : currentBranchId || undefined,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter as AgreementListParams["status"];
      }
      if (typeFilter !== "all") {
        params.agreement_type =
          typeFilter as AgreementListParams["agreement_type"];
      }

      const result = await agreementService.getAgreements(params);
      setAgreements(result.data);
      setTotalPages(result.pagination.totalPages || 1);
      setTotal(result.pagination.total || 0);
      setError(null);
    } catch (err) {
      console.error("Error fetching agreements:", err);
      const errorObj = handleApiError(err, "Convenios");
      setError(errorObj?.message || "Error al cargar convenios");
    } finally {
      setLoading(false);
    }
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

  if (loading && agreements.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary">
          Gestión de Convenios
        </h1>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin text-admin-accent-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary">
            Gestión de Convenios
          </h1>
          <p className="text-sm text-admin-text-tertiary mt-1">
            Convenios con empresas, sindicatos e instituciones
          </p>
        </div>
        <Link href="/admin/agreements/new">
          <Button className="gap-2" variant="default">
            <Plus className="h-4 w-4" />
            Nuevo convenio
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Convenios
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="suspended">Suspendidos</SelectItem>
                  <SelectItem value="expired">Expirados</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="sindicato">Sindicato</SelectItem>
                  <SelectItem value="mutual">Mutual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {agreements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-16 w-16 text-admin-text-tertiary mb-4" />
              <p className="text-admin-text-secondary font-medium">
                No hay convenios aún
              </p>
              <p className="text-sm text-admin-text-tertiary mt-1 mb-4">
                Crea un convenio para gestionar ventas con empresas e
                instituciones
              </p>
              <Link href="/admin/agreements/new">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer convenio
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Institución</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements.map((ag) => (
                    <TableRow key={ag.id}>
                      <TableCell>{ag.name}</TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {ag.institution_name}
                        </span>
                        <br />
                        <span className="text-xs text-admin-text-tertiary">
                          {ag.institution_rut}
                        </span>
                      </TableCell>
                      <TableCell>{getTypeLabel(ag.agreement_type)}</TableCell>
                      <TableCell>{getStatusBadge(ag.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatDate(ag.valid_from)}
                          {ag.valid_until
                            ? ` - ${formatDate(ag.valid_until)}`
                            : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/agreements/${ag.id}`}>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-admin-text-tertiary">
                    {total} convenio(s) en total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      disabled={currentPage <= 1}
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center px-2 text-sm">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      disabled={currentPage >= totalPages}
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
