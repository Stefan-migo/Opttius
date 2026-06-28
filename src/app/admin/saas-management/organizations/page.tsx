"use client";

import { AlertTriangle, CheckCircle2, Loader2, Pause, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import OrgsHeader from "./_components/OrgsHeader";
import OrgsFilters from "./_components/OrgsFilters";
import OrgsTable from "./_components/OrgsTable";

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  status: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
  stats?: {
    activeUsers: number;
    branches: number;
  };
  subscriptions?: Array<{
    id: string;
    status: string;
    current_period_start?: string;
    current_period_end?: string;
  }>;
  owner?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Crear organización
  const [creating, setCreating] = useState(false);

  // Bulk actions
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, [currentPage, tierFilter, statusFilter, searchTerm]);

  const fetchOrganizations = async () => {
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

      if (!response.ok) {
        throw new Error("Error al cargar organizaciones");
      }

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
  };

  const handleCreateOrganization = async (data: {
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
      const response = await fetch("/api/admin/saas-management/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Error al crear organización");
      }

      toast.success("Organización creada exitosamente");
      fetchOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (
    orgId: string,
    action: "suspend" | "activate" | "cancel" | "change_tier",
    value?: string,
  ) => {
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

      if (!response.ok) {
        throw new Error(data.error || "Error al realizar acción");
      }

      toast.success("Acción realizada exitosamente");
      fetchOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleBulkAction = async (
    action: "suspend" | "activate" | "cancel" | "change_tier",
    value?: string,
  ) => {
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

      if (!response.ok) {
        throw new Error(data.error || "Error al realizar acción masiva");
      }

      toast.success(
        `Acción realizada en ${data.updated} organización(es) exitosamente`,
      );
      setSelectedOrgs(new Set());
      fetchOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleDeleteClick = (org: Organization) => {
    setOrgToDelete(org);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
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

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar organización");
      }

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
  };

  return (
    <div className="space-y-6 p-6">
      <OrgsHeader
        creating={creating}
        onCreateOrg={handleCreateOrganization}
      />

      <OrgsFilters
        searchTerm={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        tierFilter={tierFilter}
        onTierFilterChange={setTierFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        selectedCount={selectedOrgs.size}
        onBulkAction={(action, value) => handleBulkAction(action, value)}
        onClearSelection={() => setSelectedOrgs(new Set())}
      />

      <OrgsTable
        currentPage={currentPage}
        error={error}
        loading={loading}
        onAction={handleAction}
        onDeleteClick={handleDeleteClick}
        onPageChange={setCurrentPage}
        onSelectAll={(selected) =>
          setSelectedOrgs(
            selected
              ? new Set(organizations.map((org) => org.id))
              : new Set(),
          )
        }
        onSelectOrg={(id, selected) => {
          const newSelected = new Set(selectedOrgs);
          if (selected) newSelected.add(id);
          else newSelected.delete(id);
          setSelectedOrgs(newSelected);
        }}
        organizations={organizations}
        selectedOrgs={selectedOrgs}
        totalCount={totalCount}
        totalPages={totalPages}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Eliminación de Organización
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-4 mt-4">
                <p className="font-semibold text-lg">
                  ¿Estás seguro de que deseas eliminar la organización{" "}
                  <span className="text-red-600">
                    &quot;{orgToDelete?.name}&quot;
                  </span>
                  ?
                </p>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
                        ⚠️ Esta acción es IRREVERSIBLE
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                        Se eliminará <strong>PERMANENTEMENTE</strong>:
                      </p>
                      <ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside space-y-1">
                        <li>La organización y todos sus datos</li>
                        <li>Todas las sucursales ({orgToDelete?.stats?.branches || 0})</li>
                        <li>Todos los usuarios asociados ({orgToDelete?.stats?.activeUsers || 0})</li>
                        <li>Todas las suscripciones</li>
                        <li>Todos los productos</li>
                        <li>Todos los clientes</li>
                        <li>Todas las órdenes</li>
                        <li>Todos los presupuestos</li>
                        <li>Todos los trabajos de laboratorio</li>
                        <li>Todos los pagos</li>
                        <li>Y cualquier otro dato relacionado</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Esta acción no se puede deshacer. Por favor, confirma que
                  realmente deseas eliminar esta organización.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={deleting}
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setOrgToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={deleting}
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sí, Eliminar Permanentemente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
