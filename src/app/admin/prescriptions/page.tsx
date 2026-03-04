"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Link2,
  User,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { formatDate } from "@/lib/utils";
import { formatRUT } from "@/lib/utils/rut";
import { translatePrescriptionType } from "@/lib/prescription-helpers";
import {
  extractDataFromResponse,
  extractPaginationFromResponse,
} from "@/lib/api/response-helpers";
import {
  PrescriptionFullDisplay,
  type PrescriptionDisplayData,
} from "@/components/admin/PrescriptionFullDisplay";

const CreatePrescriptionForm = dynamic(
  () => import("@/components/admin/CreatePrescriptionForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary" />
      </div>
    ),
    ssr: false,
  },
);

interface PrescriptionWithRelations {
  id: string;
  customer_id: string;
  prescription_date: string;
  expiration_date?: string | null;
  prescription_number?: string | null;
  issued_by?: string | null;
  issued_by_license?: string | null;
  od_sphere?: number | null;
  od_cylinder?: number | null;
  od_axis?: number | null;
  od_add?: number | null;
  od_pd?: number | null;
  od_near_pd?: number | null;
  os_sphere?: number | null;
  os_cylinder?: number | null;
  os_axis?: number | null;
  os_add?: number | null;
  os_pd?: number | null;
  os_near_pd?: number | null;
  frame_pd?: number | null;
  height_segmentation?: number | null;
  prescription_type?: string | null;
  lens_type?: string | null;
  lens_material?: string | null;
  prism_od?: string | null;
  prism_os?: string | null;
  tint_od?: string | null;
  tint_os?: string | null;
  coatings?: string[] | null;
  notes?: string | null;
  observations?: string | null;
  recommendations?: string | null;
  is_active?: boolean | null;
  is_current?: boolean | null;
  customer?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    rut?: string | null;
    email?: string | null;
  } | null;
  work_orders_count?: number;
}

function formatRxShort(p: PrescriptionWithRelations, side: "od" | "os") {
  const s = side === "od" ? p.od_sphere : p.os_sphere;
  const c = side === "od" ? p.od_cylinder : p.os_cylinder;
  const a = side === "od" ? p.od_axis : p.os_axis;
  const add = side === "od" ? p.od_add : p.os_add;
  const pd = side === "od" ? p.od_pd : p.os_pd;
  const parts: string[] = [];
  if (s != null) parts.push(`${s}`);
  if (c != null) parts.push(`${c}`);
  if (a != null) parts.push(`${a}°`);
  if (add != null) parts.push(`add ${add}`);
  if (pd != null) parts.push(`PD ${pd}`);
  return parts.length > 0 ? parts.join(" ") : "-";
}

export default function PrescriptionsPage() {
  const {
    currentBranchId,
    isSuperAdmin,
    branches,
    isLoading: branchLoading,
  } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;

  const [prescriptions, setPrescriptions] = useState<
    PrescriptionWithRelations[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [rutFilter, setRutFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPrescriptions, setTotalPrescriptions] = useState(0);
  const prescriptionsPerPage = 20;

  const [viewPrescription, setViewPrescription] =
    useState<PrescriptionWithRelations | null>(null);
  const [editPrescription, setEditPrescription] =
    useState<PrescriptionWithRelations | null>(null);
  const [deletePrescription, setDeletePrescription] =
    useState<PrescriptionWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: prescriptionsPerPage.toString(),
      });
      if (searchTerm.trim()) params.set("q", searchTerm.trim());
      if (rutFilter.trim()) params.set("rut", rutFilter.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (issuedBy.trim()) params.set("issued_by", issuedBy.trim());

      const headers: HeadersInit = {
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch(`/api/admin/prescriptions?${params}`, {
        headers,
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          toast.error(
            errData?.error?.message ||
              "Seleccione una sucursal para ver las recetas",
          );
        }
        throw new Error("Failed to fetch prescriptions");
      }

      const data = await response.json();
      const pagination = extractPaginationFromResponse(data);
      setPrescriptions(
        extractDataFromResponse<PrescriptionWithRelations>(data),
      );
      setTotalPages(pagination.totalPages || 1);
      setTotalPrescriptions(pagination.total || 0);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      toast.error("Error al cargar recetas");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    searchTerm,
    rutFilter,
    dateFrom,
    dateTo,
    issuedBy,
    currentBranchId,
  ]);

  useEffect(() => {
    if (!branchLoading) {
      fetchPrescriptions();
    }
  }, [fetchPrescriptions, branchLoading]);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const params = new URLSearchParams({ format });
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (currentBranchId) params.set("branch_id", currentBranchId);

      const headers: HeadersInit = {
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch(
        `/api/admin/prescriptions/export?${params}`,
        { headers },
      );
      if (!response.ok) {
        throw new Error("Error al exportar");
      }

      const blob = await response.blob();
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `libro-recetas-${dateStr}.${format}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Exportado como ${filename}`);
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Error al exportar");
    }
  };

  const hasPresbyopia = (p: PrescriptionWithRelations) =>
    (p.od_add != null && p.od_add !== 0) ||
    (p.os_add != null && p.os_add !== 0);

  const handleDelete = async () => {
    if (!deletePrescription) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/customers/${deletePrescription.customer_id}/prescriptions/${deletePrescription.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Error al eliminar receta");
      }
      toast.success("Receta eliminada");
      setDeletePrescription(null);
      fetchPrescriptions();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar receta",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-20 lg:pb-0">
      {/* Header - compact on mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-epoch-primary truncate">
            Libro de Recetas
          </h1>
          <p className="text-xs sm:text-sm text-admin-text-tertiary mt-0.5 line-clamp-2">
            {isGlobalView
              ? "Todas las sucursales (solo super admin)"
              : "Recetas de la sucursal seleccionada"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 gap-1.5 flex-1 sm:flex-initial px-3"
          >
            <Download className="h-4 w-4 shrink-0" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("xlsx")}
            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 gap-1.5 flex-1 sm:flex-initial px-3"
          >
            <Download className="h-4 w-4 shrink-0" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filters - stacked on mobile, grid on desktop */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="lg:col-span-2">
              <Label className="text-[10px] sm:text-xs mb-1 block">
                Buscar
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
                <Input
                  placeholder="Nombre, RUT o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 min-h-[44px] sm:min-h-0 h-11 sm:h-10 text-base sm:text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] sm:text-xs mb-1 block">RUT</Label>
              <Input
                placeholder="12.345.678-9"
                value={rutFilter}
                onChange={(e) => setRutFilter(e.target.value)}
                className="min-h-[44px] sm:min-h-0 h-11 sm:h-10"
              />
            </div>
            <div>
              <Label className="text-[10px] sm:text-xs mb-1 block">
                Profesional
              </Label>
              <Input
                placeholder="Oftalmólogo..."
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                className="min-h-[44px] sm:min-h-0 h-11 sm:h-10"
              />
            </div>
            <div className="flex gap-2 items-end">
              <Button
                onClick={fetchPrescriptions}
                className="flex-1 min-h-[44px] sm:min-h-0 h-11 sm:h-10"
              >
                <RefreshCw className="h-4 w-4 sm:mr-2 shrink-0" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
            <div>
              <Label className="text-[10px] sm:text-xs mb-1 block">
                Fecha desde
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-h-[44px] sm:min-h-0 h-11 sm:h-10"
              />
            </div>
            <div>
              <Label className="text-[10px] sm:text-xs mb-1 block">
                Fecha hasta
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="min-h-[44px] sm:min-h-0 h-11 sm:h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List / Table Card */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardHeader className="p-4 sm:p-5 md:p-6 pb-2 sm:pb-2">
          <CardTitle className="text-base sm:text-lg">
            Recetas ({totalPrescriptions})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
          {loading ? (
            <div className="text-center py-12 sm:py-16">
              <RefreshCw className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-epoch-primary mx-auto mb-4" />
              <p className="text-sm sm:text-base text-admin-text-tertiary">
                Cargando recetas...
              </p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-admin-text-tertiary mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-epoch-primary mb-2">
                No hay recetas
              </h3>
              <p className="text-sm text-admin-text-tertiary px-4">
                Las recetas se registran al crear clientes o desde el POS al
                procesar ventas
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: cards - estilo admin (bg-admin-bg-tertiary, shadow, tokens Epoch) */}
              <div className="md:hidden space-y-3">
                {prescriptions.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-admin-border bg-admin-bg-tertiary p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-admin-text-primary truncate">
                          {p.customer?.first_name || ""}{" "}
                          {p.customer?.last_name || ""}
                        </p>
                        <p className="text-xs text-admin-text-secondary truncate">
                          {p.customer?.rut
                            ? formatRUT(p.customer.rut)
                            : p.customer?.email || "-"}
                        </p>
                      </div>
                      <span className="text-xs text-admin-text-secondary shrink-0">
                        {formatDate(p.prescription_date)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs mb-3">
                      <span className="text-admin-text-secondary">
                        {p.issued_by || "-"}
                      </span>
                      <span className="text-admin-text-secondary">·</span>
                      <span className="text-admin-text-primary">
                        {translatePrescriptionType(p.prescription_type)}
                      </span>
                      {hasPresbyopia(p) && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 border-admin-border text-admin-text-primary"
                        >
                          Presbicia
                        </Badge>
                      )}
                      {(p.work_orders_count ?? 0) > 0 && (
                        <Link
                          href="/admin/work-orders"
                          className="text-admin-accent-primary hover:underline flex items-center gap-0.5"
                        >
                          <Link2 className="h-3 w-3" />
                          {p.work_orders_count} OT
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-admin-border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] h-11 w-11 shrink-0"
                        title="Ver receta"
                        onClick={() => setViewPrescription(p)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] h-11 w-11 shrink-0"
                        title="Modificar"
                        onClick={() => setEditPrescription(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] h-11 w-11 shrink-0 text-destructive hover:text-destructive"
                        title="Eliminar"
                        onClick={() => setDeletePrescription(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Link
                        href={`/admin/customers/${p.customer_id}`}
                        title="Ver cliente"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="min-h-[44px] min-w-[44px] h-11 w-11 shrink-0"
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Profesional</TableHead>
                      <TableHead>OD</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Presbicia</TableHead>
                      <TableHead>OT</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptions.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(p.prescription_date)}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {p.customer?.first_name || ""}{" "}
                              {p.customer?.last_name || ""}
                            </div>
                            <div className="text-xs text-admin-text-tertiary truncate">
                              {p.customer?.rut
                                ? formatRUT(p.customer.rut)
                                : p.customer?.email || "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.issued_by || "-"}
                        </TableCell>
                        <TableCell
                          className="text-xs font-mono max-w-[120px] truncate"
                          title={formatRxShort(p, "od")}
                        >
                          {formatRxShort(p, "od")}
                        </TableCell>
                        <TableCell
                          className="text-xs font-mono max-w-[120px] truncate"
                          title={formatRxShort(p, "os")}
                        >
                          {formatRxShort(p, "os")}
                        </TableCell>
                        <TableCell>
                          {translatePrescriptionType(p.prescription_type)}
                        </TableCell>
                        <TableCell>
                          {hasPresbyopia(p) ? (
                            <Badge variant="secondary" className="text-xs">
                              Sí
                            </Badge>
                          ) : (
                            <span className="text-admin-text-tertiary">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(p.work_orders_count ?? 0) > 0 ? (
                            <Link
                              href="/admin/work-orders"
                              className="text-epoch-primary hover:underline flex items-center gap-1"
                              title={`${p.work_orders_count} OT vinculada(s)`}
                            >
                              <Link2 className="h-3 w-3" />
                              {p.work_orders_count}
                            </Link>
                          ) : (
                            <span className="text-admin-text-tertiary">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Ver receta"
                              onClick={() => setViewPrescription(p)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Modificar receta"
                              onClick={() => setEditPrescription(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Eliminar receta"
                              onClick={() => setDeletePrescription(p)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Link
                              href={`/admin/customers/${p.customer_id}`}
                              title="Ver cliente"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <User className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-admin-border">
                  <p className="text-sm text-admin-text-tertiary order-2 sm:order-1">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage >= totalPages}
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

      {/* Ver receta */}
      <Dialog
        open={!!viewPrescription}
        onOpenChange={(open) => !open && setViewPrescription(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receta</DialogTitle>
            <DialogDescription>
              {viewPrescription?.customer &&
                `${viewPrescription.customer.first_name || ""} ${viewPrescription.customer.last_name || ""}`.trim()}
              {viewPrescription?.prescription_number &&
                ` · ${viewPrescription.prescription_number}`}
            </DialogDescription>
          </DialogHeader>
          {viewPrescription && (
            <PrescriptionFullDisplay
              prescription={viewPrescription as PrescriptionDisplayData}
              showCard={false}
              subtitle={
                <span className="text-sm text-admin-text-tertiary">
                  {formatDate(viewPrescription.prescription_date)}
                  {viewPrescription.issued_by &&
                    ` · ${viewPrescription.issued_by}`}
                </span>
              }
            />
          )}
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setViewPrescription(null)}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              Cerrar
            </Button>
            {viewPrescription && (
              <Button
                onClick={() => {
                  setViewPrescription(null);
                  setEditPrescription(viewPrescription);
                }}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modificar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modificar receta */}
      <Dialog
        open={!!editPrescription}
        onOpenChange={(open) => !open && setEditPrescription(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modificar receta</DialogTitle>
            <DialogDescription>
              {editPrescription?.customer &&
                `${editPrescription.customer.first_name || ""} ${editPrescription.customer.last_name || ""}`.trim()}
            </DialogDescription>
          </DialogHeader>
          {editPrescription && (
            <CreatePrescriptionForm
              customerId={editPrescription.customer_id}
              initialData={editPrescription}
              onSuccess={() => {
                setEditPrescription(null);
                fetchPrescriptions();
              }}
              onCancel={() => setEditPrescription(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Eliminar receta */}
      <Dialog
        open={!!deletePrescription}
        onOpenChange={(open) =>
          !open && !deleting && setDeletePrescription(null)
        }
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar receta</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar esta receta?
              {deletePrescription?.customer && (
                <span className="block mt-2 font-medium">
                  {deletePrescription.customer.first_name || ""}{" "}
                  {deletePrescription.customer.last_name || ""} ·{" "}
                  {formatDate(deletePrescription.prescription_date)}
                </span>
              )}
              <span className="block mt-2 text-destructive text-sm">
                Esta acción no se puede deshacer.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletePrescription(null)}
              disabled={deleting}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
