"use client";

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  extractDataFromResponse,
  extractPaginationFromResponse,
} from "@/lib/api/response-helpers";
import { formatDate } from "@/lib/utils";
import { getBranchHeader } from "@/lib/utils/branch";

interface FieldOperation {
  id: string;
  name: string;
  scheduled_date: string;
  location: string | null;
  branch_id: string;
  organization_id: string;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  draft: { label: "Borrador", variant: "outline" },
  prepared: { label: "Preparado", variant: "secondary" },
  in_progress: { label: "En terreno", variant: "default" },
  completed: { label: "Completado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function FieldOperationsPage() {
  const {
    currentBranchId,
    isSuperAdmin,
    branches,
    isLoading: branchLoading,
  } = useBranch();
  const [operations, setOperations] = useState<FieldOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOperations, setTotalOperations] = useState(0);
  const perPage = 20;

  useEffect(() => {
    if (!branchLoading) {
      fetchOperations();
    }
  }, [currentPage, statusFilter, currentBranchId, branchLoading]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: perPage.toString(),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const headers: HeadersInit = {
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch(`/api/admin/field-operations?${params}`, {
        headers,
      });
      if (!response.ok) {
        throw new Error("Error al cargar operativos");
      }

      const data = await response.json();
      const pagination = extractPaginationFromResponse(data);
      setOperations(extractDataFromResponse<FieldOperation>(data));
      setTotalPages(pagination.totalPages || 1);
      setTotalOperations(pagination.total || 0);
    } catch (error) {
      console.error("Error fetching field operations:", error);
      toast.error("Error al cargar operativos");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || {
      label: status,
      variant: "outline" as const,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredOperations = operations.filter(
    (op) =>
      !searchTerm ||
      op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.location?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary tracking-tight">
          Operativos en Terreno
        </h1>
        <p className="text-sm text-admin-text-tertiary">
          Gestiona operativos móviles y bodega temporal
        </p>
        <div className="flex justify-end">
          <Link href="/admin/field-operations/new">
            <Button className="min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo operativo
            </Button>
          </Link>
        </div>
      </div>

      {/* Lista de operativos */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-admin-text-primary">
            <MapPin className="h-5 w-5 shrink-0" />
            Lista de operativos
          </CardTitle>
          <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex-1 min-w-0">
              <Input
                className="h-11 sm:h-10 w-full sm:max-w-sm"
                placeholder="Buscar por nombre o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 sm:h-10 w-full sm:w-[180px] min-h-[44px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="h-11 w-11 min-h-[44px] shrink-0"
              disabled={loading}
              size="icon"
              variant="outline"
              onClick={fetchOperations}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-admin-text-tertiary" />
            </div>
          ) : filteredOperations.length === 0 ? (
            <div className="py-12 text-center text-admin-text-tertiary">
              No hay operativos.{" "}
              <Link
                className="text-primary underline"
                href="/admin/field-operations/new"
              >
                Crear uno
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop: table | Mobile: cards */}
              <div className="hidden md:block overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOperations.map((op) => (
                      <TableRow
                        className="hover:bg-[#AE000025] transition-colors"
                        key={op.id}
                      >
                        <TableCell className="font-medium">{op.name}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-admin-text-tertiary shrink-0" />
                            {formatDate(op.scheduled_date)}
                          </span>
                        </TableCell>
                        <TableCell className="text-admin-text-tertiary">
                          {op.location || "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(op.status)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/field-operations/${op.id}`}>
                            <Button
                              className="min-h-[44px]"
                              size="sm"
                              variant="ghost"
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              Ver
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: card list */}
              <div className="md:hidden space-y-3">
                {filteredOperations.map((op) => (
                  <Link
                    className="block"
                    href={`/admin/field-operations/${op.id}`}
                    key={op.id}
                  >
                    <div className="rounded-xl border border-border bg-card p-4 active:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-admin-text-primary truncate">
                            {op.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-sm text-admin-text-tertiary">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {formatDate(op.scheduled_date)}
                          </p>
                          {op.location && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-admin-text-tertiary truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {op.location}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {getStatusBadge(op.status)}
                          <span className="flex items-center gap-1 text-sm text-admin-text-tertiary">
                            <Eye className="h-4 w-4" />
                            Ver
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <p className="text-sm text-admin-text-tertiary order-2 sm:order-1">
                    {totalOperations} operativo(s) en total
                  </p>
                  <div className="flex items-center justify-center sm:justify-end gap-2 order-1 sm:order-2">
                    <Button
                      className="min-h-[44px]"
                      disabled={currentPage <= 1}
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-admin-text-primary min-w-[120px] text-center">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      className="min-h-[44px]"
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
