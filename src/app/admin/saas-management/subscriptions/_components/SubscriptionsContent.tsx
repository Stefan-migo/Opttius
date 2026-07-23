"use client";

import { AlertTriangle, ArrowLeft, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appLogger } from '@/lib/logger';

import { CreateSubscriptionDialog } from "./CreateSubscriptionDialog";
import { SubscriptionsDialogs } from "./SubscriptionsDialogs";
import { SubscriptionsFilterBar } from "./SubscriptionsFilterBar";
import { SubscriptionsTable } from "./SubscriptionsTable";

interface Subscription {
  id: string;
  organization_id: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at?: string;
  canceled_at?: string;
  gateway_subscription_id?: string;
  gateway_customer_id?: string;
  created_at: string;
  daysUntilExpiry?: number | null;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
    subscription_tier: string;
    status: string;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function SubscriptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgIdFromUrl = searchParams.get("organization_id") || "";

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmaciones con UI del programa (no window.confirm)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtros - organization_id from URL pre-filters when navigating from org detail
  const [organizationFilter, setOrganizationFilter] = useState(
    orgIdFromUrl || "all",
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Crear suscripción
  const [createOpen, setCreateOpen] = useState(false);

  // Eliminar
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sync organization filter when URL param changes (e.g. from org detail "Gestionar suscripciones")
  useEffect(() => {
    if (orgIdFromUrl && organizationFilter !== orgIdFromUrl) {
      setOrganizationFilter(orgIdFromUrl);
    }
  }, [orgIdFromUrl]);

  useEffect(() => {
    fetchOrganizations();
    fetchSubscriptions();
  }, [currentPage, organizationFilter, statusFilter, tierFilter]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(
        "/api/admin/saas-management/organizations?limit=1000",
      );
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (err) {
      appLogger.error("Error fetching organizations:", err);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (organizationFilter !== "all") {
        params.append("organization_id", organizationFilter);
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (tierFilter !== "all") {
        params.append("tier", tierFilter);
      }

      const response = await fetch(
        `/api/admin/saas-management/subscriptions?${params}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar suscripciones");
      }

      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error("Error al cargar suscripciones");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    subscriptionId: string,
    action: "cancel" | "reactivate" | "extend",
    value?: unknown,
  ) => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/subscriptions/${subscriptionId}/actions`,
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

      toast.success(data.message || "Acción realizada exitosamente");
      setCancelConfirmId(null);
      fetchSubscriptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleDelete = async (subscriptionId: string) => {
    setDeleteId(subscriptionId);
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/admin/saas-management/subscriptions/${subscriptionId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      toast.success("Suscripción eliminada.");
      setDeleteConfirmId(null);
      fetchSubscriptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button
            className="text-white hover:bg-white/10"
            size="icon"
            title="Volver al dashboard"
            variant="ghost"
            onClick={() => router.push("/admin/saas-management/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">
              Gestión de Suscripciones
            </h1>
            <p className="text-white/50 mt-2">
              Administra todas las suscripciones del sistema
            </p>
          </div>
        </div>
        <Button
          className="bg-[#C5A059] hover:bg-[#C5A059]/90"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva suscripción
        </Button>
        <CreateSubscriptionDialog
          open={createOpen}
          organizations={organizations}
          onCreated={fetchSubscriptions}
          onOpenChange={setCreateOpen}
        />
      </div>

      {/* Alertas */}
      {subscriptions.some((sub) => sub.isExpiringSoon || sub.isExpired) && (
        <Card className="admin-card border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Hay suscripciones próximas a vencer o vencidas. Revisa la lista
                para más detalles.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <SubscriptionsFilterBar
        organizationFilter={organizationFilter}
        organizations={organizations}
        statusFilter={statusFilter}
        tierFilter={tierFilter}
        onOrganizationFilterChange={setOrganizationFilter}
        onStatusFilterChange={setStatusFilter}
        onTierFilterChange={setTierFilter}
      />

      <SubscriptionsTable
        currentPage={currentPage}
        error={error}
        loading={loading}
        subscriptions={subscriptions}
        totalCount={totalCount}
        totalPages={totalPages}
        onCancelClick={setCancelConfirmId}
        onDeleteClick={setDeleteConfirmId}
        onPageChange={setCurrentPage}
        onReactivate={(id) => handleAction(id, "reactivate")}
        onViewDetails={(id) =>
          router.push(`/admin/saas-management/subscriptions/${id}`)
        }
      />

      <SubscriptionsDialogs
        cancelConfirmId={cancelConfirmId}
        deleteConfirmId={deleteConfirmId}
        deleteId={deleteId}
        deleteLoading={deleteLoading}
        onCancel={(id) => handleAction(id, "cancel")}
        onCancelConfirmIdChange={setCancelConfirmId}
        onDelete={handleDelete}
        onDeleteConfirmIdChange={setDeleteConfirmId}
      />
    </div>
  );
}
