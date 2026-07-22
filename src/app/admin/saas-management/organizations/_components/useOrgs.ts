"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { OrgAction, Organization } from "./types";

export function useOrgs() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [creating, setCreating] = useState(false);

  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });
      if (tierFilter !== "all") params.append("tier", tierFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(
        `/api/admin/saas-management/organizations?${params}`,
      );
      if (!response.ok) throw new Error("Error al cargar organizaciones");

      const data = await response.json();
      setOrganizations(data.organizations || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error("Error al cargar organizaciones");
    } finally {
      setLoading(false);
    }
  }, [currentPage, tierFilter, statusFilter, searchTerm]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleCreateOrganization = useCallback(
    async (data: {
      name: string;
      slug: string;
      subscription_tier: string;
      status: string;
      owner_id: string;
    }) => {
      if (!data.name || !data.slug) {
        toast.error("Nombre y slug son requeridos");
        return;
      }
      setCreating(true);
      try {
        const response = await fetch(
          "/api/admin/saas-management/organizations",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );
        const responseData = await response.json();
        if (!response.ok)
          throw new Error(responseData.error || "Error al crear organización");
        toast.success("Organización creada exitosamente");
        fetchOrganizations();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setCreating(false);
      }
    },
    [fetchOrganizations],
  );

  const handleAction = useCallback(
    async (orgId: string, action: OrgAction, value?: string) => {
      try {
        const response = await fetch(
          `/api/admin/saas-management/organizations/${orgId}/actions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, value }),
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Error al realizar acción");
        toast.success("Acción realizada exitosamente");
        fetchOrganizations();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error desconocido");
      }
    },
    [fetchOrganizations],
  );

  const handleBulkAction = useCallback(
    async (action: OrgAction, value?: string) => {
      if (selectedOrgs.size === 0) {
        toast.error("Selecciona al menos una organización");
        return;
      }
      try {
        const response = await fetch(
          "/api/admin/saas-management/organizations/bulk-actions",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              organization_ids: Array.from(selectedOrgs),
              value,
            }),
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Error al realizar acción masiva");
        toast.success(
          `Acción realizada en ${data.updated} organización(es) exitosamente`,
        );
        setSelectedOrgs(new Set());
        fetchOrganizations();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error desconocido");
      }
    },
    [selectedOrgs, fetchOrganizations],
  );

  const handleDeleteClick = useCallback((org: Organization) => {
    setOrgToDelete(org);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!orgToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgToDelete.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al eliminar organización");
      toast.success(
        `Organización "${orgToDelete.name}" eliminada completamente junto con todos sus datos relacionados`,
      );
      setDeleteDialogOpen(false);
      setOrgToDelete(null);
      fetchOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setDeleting(false);
    }
  }, [orgToDelete, fetchOrganizations]);

  const clearSelection = useCallback(() => setSelectedOrgs(new Set()), []);

  return {
    organizations,
    loading,
    error,
    searchTerm,
    tierFilter,
    statusFilter,
    currentPage,
    totalPages,
    totalCount,
    creating,
    selectedOrgs,
    deleteDialogOpen,
    orgToDelete,
    deleting,
    setSearchTerm,
    setTierFilter,
    setStatusFilter,
    setCurrentPage,
    setSelectedOrgs,
    setDeleteDialogOpen,
    setOrgToDelete,
    handleCreateOrganization,
    handleAction,
    handleBulkAction,
    handleDeleteClick,
    handleDeleteConfirm,
    clearSelection,
  };
}
