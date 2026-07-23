"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { extractDataFromResponse, extractPaginationFromResponse } from "@/lib/api/response-helpers";
import { getBranchHeader } from "@/lib/utils/branch";

interface PrescriptionWithRelations {
  id: string; customer_id: string; prescription_date: string; expiration_date?: string | null;
  prescription_number?: string | null; issued_by?: string | null; issued_by_license?: string | null;
  od_sphere?: number | null; od_cylinder?: number | null; od_axis?: number | null; od_add?: number | null;
  od_pd?: number | null; od_near_pd?: number | null;
  os_sphere?: number | null; os_cylinder?: number | null; os_axis?: number | null; os_add?: number | null;
  os_pd?: number | null; os_near_pd?: number | null;
  frame_pd?: number | null; height_segmentation?: number | null;
  prescription_type?: string | null; is_active?: boolean | null; is_current?: boolean | null;
  customer?: { id: string; first_name?: string | null; last_name?: string | null; rut?: string | null; email?: string | null } | null;
  work_orders_count?: number;
}

export function usePrescriptions(currentBranchId: string | null, isSuperAdmin: boolean, branchLoading: boolean) {
  const isGlobalView = !currentBranchId && isSuperAdmin;
  const [prescriptions, setPrescriptions] = useState<PrescriptionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [rutFilter, setRutFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPrescriptions, setTotalPrescriptions] = useState(0);
  const [viewPrescription, setViewPrescription] = useState<PrescriptionWithRelations | null>(null);
  const [editPrescription, setEditPrescription] = useState<PrescriptionWithRelations | null>(null);
  const [deletePrescription, setDeletePrescription] = useState<PrescriptionWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);
  const prescriptionsPerPage = 20;

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage.toString(), limit: prescriptionsPerPage.toString() });
      if (searchTerm.trim()) params.set("q", searchTerm.trim());
      if (rutFilter.trim()) params.set("rut", rutFilter.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (issuedBy.trim()) params.set("issued_by", issuedBy.trim());

      const response = await fetch(`/api/admin/prescriptions?${params}`, { headers: { ...getBranchHeader(currentBranchId) } });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 403) toast.error(errData?.error?.message || "Seleccione una sucursal para ver las recetas");
        throw new Error("Failed to fetch prescriptions");
      }
      const data = await response.json();
      const pagination = extractPaginationFromResponse(data);
      setPrescriptions(extractDataFromResponse<PrescriptionWithRelations>(data));
      setTotalPages(pagination.totalPages || 1);
      setTotalPrescriptions(pagination.total || 0);
    } catch { toast.error("Error al cargar recetas"); }
    finally { setLoading(false); }
  }, [currentPage, searchTerm, rutFilter, dateFrom, dateTo, issuedBy, currentBranchId]);

  useEffect(() => { if (!branchLoading) fetchPrescriptions(); }, [fetchPrescriptions, branchLoading]);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const params = new URLSearchParams({ format });
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (currentBranchId) params.set("branch_id", currentBranchId);
      const response = await fetch(`/api/admin/prescriptions/export?${params}`, { headers: { ...getBranchHeader(currentBranchId) } });
      if (!response.ok) throw new Error("Error al exportar");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `libro-recetas-${new Date().toISOString().split("T")[0]}.${format}`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Exportado como libro-recetas-${new Date().toISOString().split("T")[0]}.${format}`);
    } catch { toast.error("Error al exportar"); }
  };

  const handleEditFromView = () => { setViewPrescription(null); if (viewPrescription) setEditPrescription(viewPrescription); };

  const handleDelete = async () => {
    if (!deletePrescription) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/customers/${deletePrescription.customer_id}/prescriptions/${deletePrescription.id}`, { method: "DELETE" });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err?.error?.message || "Error al eliminar receta"); }
      toast.success("Receta eliminada"); setDeletePrescription(null); fetchPrescriptions();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Error al eliminar receta"); }
    finally { setDeleting(false); }
  };

  const hasPresbyopia = (p: PrescriptionWithRelations) => (p.od_add != null && p.od_add !== 0) || (p.os_add != null && p.os_add !== 0);

  return {
    prescriptions, loading, searchTerm, setSearchTerm, rutFilter, setRutFilter,
    dateFrom, setDateFrom, dateTo, setDateTo, issuedBy, setIssuedBy,
    currentPage, setCurrentPage, totalPages, totalPrescriptions,
    viewPrescription, setViewPrescription, editPrescription, setEditPrescription,
    deletePrescription, setDeletePrescription, deleting, isGlobalView,
    fetchPrescriptions, handleExport, handleEditFromView, handleDelete, hasPresbyopia,
  };
}

export type { PrescriptionWithRelations };
