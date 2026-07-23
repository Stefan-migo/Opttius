"use client";

import { ChevronLeft, ChevronRight, Download, Eye, FileText, Link2, Pencil, RefreshCw, Trash2, User } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBranch } from "@/hooks/useBranch";
import { translatePrescriptionType } from "@/lib/prescription-helpers";
import { formatDate } from "@/lib/utils";
import { formatRUT } from "@/lib/utils/rut";

import { PrescriptionDialogs } from "./PrescriptionDialogs";
import { PrescriptionFilters } from "./PrescriptionFilters";
import { usePrescriptions } from "./usePrescriptions";

function formatRxShort(p: Record<string, any>, side: "od" | "os") {
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

export default function PrescriptionsContent() {
  const { currentBranchId, isSuperAdmin, isLoading: branchLoading } = useBranch();
  const {
    prescriptions, loading, searchTerm, setSearchTerm, rutFilter, setRutFilter,
    dateFrom, setDateFrom, dateTo, setDateTo, issuedBy, setIssuedBy,
    currentPage, setCurrentPage, totalPages, totalPrescriptions,
    viewPrescription, setViewPrescription, editPrescription, setEditPrescription,
    deletePrescription, setDeletePrescription, deleting, isGlobalView,
    fetchPrescriptions, handleExport, handleEditFromView, handleDelete, hasPresbyopia,
  } = usePrescriptions(currentBranchId, isSuperAdmin, branchLoading);

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-20 lg:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-epoch-primary truncate">Libro de Recetas</h1>
          <p className="text-xs sm:text-sm text-admin-text-tertiary mt-0.5 line-clamp-2">{isGlobalView ? "Todas las sucursales (solo super admin)" : "Recetas de la sucursal seleccionada"}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 gap-1.5 flex-1 sm:flex-initial px-3" size="sm" variant="outline" onClick={() => handleExport("csv")}><Download className="h-4 w-4 shrink-0" />CSV</Button>
          <Button className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 gap-1.5 flex-1 sm:flex-initial px-3" size="sm" variant="outline" onClick={() => handleExport("xlsx")}><Download className="h-4 w-4 shrink-0" />Excel</Button>
        </div>
      </div>

      <PrescriptionFilters searchTerm={searchTerm} rutFilter={rutFilter} dateFrom={dateFrom} dateTo={dateTo} issuedBy={issuedBy} onSearchTermChange={setSearchTerm} onRutFilterChange={setRutFilter} onDateFromChange={setDateFrom} onDateToChange={setDateTo} onIssuedByChange={setIssuedBy} onSearch={fetchPrescriptions} />

      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardHeader className="p-4 sm:p-5 md:p-6 pb-2 sm:pb-2"><CardTitle className="text-base sm:text-lg">Recetas ({totalPrescriptions})</CardTitle></CardHeader>
        <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
          {loading ? (
            <div className="text-center py-12 sm:py-16"><RefreshCw className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-epoch-primary mx-auto mb-4" /><p className="text-sm sm:text-base text-admin-text-tertiary">Cargando recetas...</p></div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-12 sm:py-16"><FileText className="h-10 w-10 sm:h-12 sm:w-12 text-admin-text-tertiary mx-auto mb-4" /><h3 className="text-base sm:text-lg font-semibold text-epoch-primary mb-2">No hay recetas</h3><p className="text-sm text-admin-text-tertiary px-4">Las recetas se registran al crear clientes o desde el POS al procesar ventas</p></div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {prescriptions.map((p) => (
                  <div className="rounded-xl border border-admin-border bg-admin-bg-tertiary p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3)]" key={p.id}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1"><p className="font-semibold text-sm text-admin-text-primary truncate">{p.customer?.first_name || ""} {p.customer?.last_name || ""}</p><p className="text-xs text-admin-text-secondary truncate">{p.customer?.rut ? formatRUT(p.customer.rut) : p.customer?.email || "-"}</p></div>
                      <span className="text-xs text-admin-text-secondary shrink-0">{formatDate(p.prescription_date)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs mb-3">
                      <span className="text-admin-text-secondary">{p.issued_by || "-"}</span><span className="text-admin-text-secondary">·</span>
                      <span className="text-admin-text-primary">{translatePrescriptionType(p.prescription_type)}</span>
                      {hasPresbyopia(p) && <Badge className="text-[10px] px-1.5 py-0 border-admin-border text-admin-text-primary" variant="secondary">Presbicia</Badge>}
                      {(p.work_orders_count ?? 0) > 0 && <Link className="text-admin-accent-primary hover:underline flex items-center gap-0.5" href="/admin/work-orders"><Link2 className="h-3 w-3" />{p.work_orders_count} OT</Link>}
                    </div>
                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-admin-border">
                      <Button className="min-h-[44px] min-w-[44px] h-11 w-11 shrink-0" size="icon" title="Ver receta" variant="ghost" onClick={() => setViewPrescription(p)}><Eye className="h-4 w-4" /></Button>
                      <Button className="min-h-[44px] min-w-[44px] h-11 w-11 shrink-0" size="icon" title="Modificar" variant="ghost" onClick={() => setEditPrescription(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button className="min-h-[44px] min-w-[44px] h-11 w-11 shrink-0 text-destructive hover:text-destructive" size="icon" title="Eliminar" variant="ghost" onClick={() => setDeletePrescription(p)}><Trash2 className="h-4 w-4" /></Button>
                      <Link href={`/admin/customers/${p.customer_id}`} title="Ver cliente"><Button className="min-h-[44px] min-w-[44px] h-11 w-11 shrink-0" size="icon" variant="ghost"><User className="h-4 w-4" /></Button></Link>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Profesional</TableHead><TableHead>OD</TableHead><TableHead>OS</TableHead><TableHead>Tipo</TableHead><TableHead>Presbicia</TableHead><TableHead>OT</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {prescriptions.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(p.prescription_date)}</TableCell>
                        <TableCell><div className="min-w-0"><div className="font-medium truncate">{p.customer?.first_name || ""} {p.customer?.last_name || ""}</div><div className="text-xs text-admin-text-tertiary truncate">{p.customer?.rut ? formatRUT(p.customer.rut) : p.customer?.email || "-"}</div></div></TableCell>
                        <TableCell className="text-sm">{p.issued_by || "-"}</TableCell>
                        <TableCell className="text-xs font-mono max-w-[120px] truncate" title={formatRxShort(p, "od")}>{formatRxShort(p, "od")}</TableCell>
                        <TableCell className="text-xs font-mono max-w-[120px] truncate" title={formatRxShort(p, "os")}>{formatRxShort(p, "os")}</TableCell>
                        <TableCell>{translatePrescriptionType(p.prescription_type)}</TableCell>
                        <TableCell>{hasPresbyopia(p) ? <Badge className="text-xs" variant="secondary">Sí</Badge> : <span className="text-admin-text-tertiary">-</span>}</TableCell>
                        <TableCell>{(p.work_orders_count ?? 0) > 0 ? <Link className="text-epoch-primary hover:underline flex items-center gap-1" href="/admin/work-orders" title={`${p.work_orders_count} OT vinculada(s)`}><Link2 className="h-3 w-3" />{p.work_orders_count}</Link> : <span className="text-admin-text-tertiary">0</span>}</TableCell>
                        <TableCell><div className="flex flex-wrap gap-1"><Button className="h-8 w-8" size="icon" title="Ver receta" variant="ghost" onClick={() => setViewPrescription(p)}><Eye className="h-4 w-4" /></Button><Button className="h-8 w-8" size="icon" title="Modificar receta" variant="ghost" onClick={() => setEditPrescription(p)}><Pencil className="h-4 w-4" /></Button><Button className="h-8 w-8 text-destructive hover:text-destructive" size="icon" title="Eliminar receta" variant="ghost" onClick={() => setDeletePrescription(p)}><Trash2 className="h-4 w-4" /></Button><Link href={`/admin/customers/${p.customer_id}`} title="Ver cliente"><Button className="h-8 w-8" size="icon" variant="ghost"><User className="h-4 w-4" /></Button></Link></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-admin-border">
                  <p className="text-sm text-admin-text-tertiary order-2 sm:order-1">Página {currentPage} de {totalPages}</p>
                  <div className="flex gap-2 order-1 sm:order-2">
                    <Button className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" disabled={currentPage <= 1} size="sm" variant="outline" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" disabled={currentPage >= totalPages} size="sm" variant="outline" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PrescriptionDialogs viewPrescription={viewPrescription} editPrescription={editPrescription} deletePrescription={deletePrescription} deleting={deleting} onViewPrescriptionChange={setViewPrescription} onEditPrescriptionChange={setEditPrescription} onDeletePrescriptionChange={setDeletePrescription} onEditFromView={handleEditFromView} onDelete={handleDelete} onFetchPrescriptions={fetchPrescriptions} />
    </div>
  );
}
