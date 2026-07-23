"use client";

import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  SubscriptionDeleteDialog,
  SubscriptionEditForm,
} from "./SubscriptionDialogs";
import {
  SubscriptionDetails,
  SubscriptionInfoCards,
} from "./SubscriptionInfoCards";

export default function SubscriptionDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = params.id as string;

  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editPeriodEnd, setEditPeriodEnd] = useState("");
  const [editTrialEndsAt, setEditTrialEndsAt] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (subscriptionId) {
      fetchSubscriptionDetails();
    }
  }, [subscriptionId]);

  useEffect(() => {
    if (subscription) {
      setEditStatus(subscription.status);
      setEditPeriodEnd(subscription.current_period_end || "");
      setEditTrialEndsAt(
        subscription.trial_ends_at
          ? subscription.trial_ends_at.slice(0, 16)
          : "",
      );
    }
  }, [subscription]);

  const handleSaveEdit = async () => {
    if (!subscription) return;
    setSaveLoading(true);
    try {
      const res = await fetch(
        `/api/admin/saas-management/subscriptions/${subscriptionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: editStatus,
            current_period_end: editPeriodEnd || undefined,
            trial_ends_at: editTrialEndsAt || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      toast.success("Suscripción actualizada.");
      setEditing(false);
      fetchSubscriptionDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/admin/saas-management/subscriptions/${subscriptionId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      toast.success("Suscripción eliminada.");
      setShowDeleteConfirm(false);
      router.push("/admin/saas-management/subscriptions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/saas-management/subscriptions/${subscriptionId}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Suscripción no encontrada");
        }
        throw new Error("Error al cargar detalles de la suscripción");
      }

      const data = await response.json();
      const sub = data.subscription;

      const today = new Date();
      let daysUntilExpiry: number | null = null;
      const endSource =
        sub.status === "trialing" && sub.trial_ends_at
          ? sub.trial_ends_at
          : sub.current_period_end;
      if (endSource) {
        const endDate = new Date(endSource);
        const diffTime = endDate.getTime() - today.getTime();
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      setSubscription({
        ...sub,
        daysUntilExpiry,
        isExpiringSoon:
          daysUntilExpiry !== null &&
          daysUntilExpiry <= 7 &&
          daysUntilExpiry >= 0,
        isExpired: daysUntilExpiry !== null && daysUntilExpiry < 0,
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching subscription details:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error(
        err instanceof Error
          ? err.message
          : "Error al cargar detalles de la suscripción",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-admin-text-tertiary">
            Cargando detalles de la suscripción...
          </p>
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            title="Volver a suscripciones"
            variant="ghost"
            onClick={() => router.push("/admin/saas-management/subscriptions")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
              Error
            </h1>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-red-600">
              {error || "Suscripción no encontrada"}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            title="Volver a suscripciones"
            variant="ghost"
            onClick={() => router.push("/admin/saas-management/subscriptions")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
              Detalles de la Suscripción
            </h1>
            <p className="text-admin-text-tertiary mt-2">
              Información completa de la suscripción
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={editing ? "default" : "outline"}
            onClick={() => setEditing(!editing)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {editing ? "Cancelar edición" : "Editar"}
          </Button>
          <Button
            disabled={deleteLoading}
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            {deleteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Eliminar
          </Button>
        </div>
      </div>

      <SubscriptionInfoCards subscription={subscription} />

      {editing && (
        <SubscriptionEditForm
          editPeriodEnd={editPeriodEnd}
          editStatus={editStatus}
          editTrialEndsAt={editTrialEndsAt}
          saveLoading={saveLoading}
          onEditPeriodEndChange={setEditPeriodEnd}
          onEditStatusChange={setEditStatus}
          onEditTrialEndsAtChange={setEditTrialEndsAt}
          onSave={handleSaveEdit}
        />
      )}

      <SubscriptionDeleteDialog
        deleteLoading={deleteLoading}
        open={showDeleteConfirm}
        onDelete={handleDelete}
        onOpenChange={setShowDeleteConfirm}
      />
    </div>
  );
}
