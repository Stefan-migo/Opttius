"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Loader2,
  DollarSign,
  Save,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface SubscriptionDetails {
  id: string;
  organization_id: string;
  status: string;
  trial_ends_at?: string | null;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at?: string;
  canceled_at?: string;
  gateway_subscription_id?: string;
  gateway_customer_id?: string;
  created_at: string;
  updated_at: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    subscription_tier: string;
    status: string;
    owner_id?: string;
    created_at: string;
  };
  daysUntilExpiry?: number;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
}

export default function SubscriptionDetailsPage() {
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

  const getStatusBadge = (
    status: string,
    isExpiringSoon?: boolean,
    isExpired?: boolean,
  ) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      trialing: "secondary",
      past_due: "destructive",
      cancelled: "destructive",
      incomplete: "secondary",
    };

    const icons: Record<string, typeof CheckCircle2> = {
      active: CheckCircle2,
      trialing: Clock,
      past_due: AlertTriangle,
      cancelled: XCircle,
      incomplete: Clock,
    };

    const Icon = icons[status] || CheckCircle2;
    const variant = variants[status] || "default";

    let className = "";
    if (isExpired) {
      className = "bg-red-100 text-red-800";
    } else if (isExpiringSoon) {
      className = "bg-yellow-100 text-yellow-800";
    }

    return (
      <Badge variant={variant} className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {status === "active"
          ? "Activa"
          : status === "trialing"
            ? "Trial"
            : status === "past_due"
              ? "Vencida"
              : status === "cancelled"
                ? "Cancelada"
                : status === "incomplete"
                  ? "Incompleta"
                  : status}
      </Badge>
    );
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
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/saas-management/subscriptions")}
            title="Volver a suscripciones"
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
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/saas-management/subscriptions")}
            title="Volver a suscripciones"
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
            variant={editing ? "default" : "outline"}
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {editing ? "Cancelar edición" : "Editar"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteLoading}
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

      {/* Información Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <CreditCard className="h-5 w-5" />
            Información de la Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Estado
              </label>
              <div className="mt-1">
                {getStatusBadge(
                  subscription.status,
                  subscription.isExpiringSoon,
                  subscription.isExpired,
                )}
              </div>
            </div>
            {subscription.daysUntilExpiry !== null && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Días hasta vencimiento
                </label>
                <p
                  className={`text-lg font-semibold ${
                    subscription.isExpired
                      ? "text-red-600"
                      : subscription.isExpiringSoon
                        ? "text-yellow-600"
                        : ""
                  }`}
                >
                  {subscription.daysUntilExpiry != null &&
                  subscription.daysUntilExpiry < 0
                    ? `Vencida hace ${Math.abs(subscription.daysUntilExpiry)} días`
                    : subscription.daysUntilExpiry != null
                      ? `${subscription.daysUntilExpiry} días`
                      : "N/A"}
                </p>
              </div>
            )}
            {subscription.current_period_start && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Inicio del período
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.current_period_start)}
                </p>
              </div>
            )}
            {subscription.current_period_end && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Fin del período
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.current_period_end)}
                </p>
              </div>
            )}
            {subscription.cancel_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Cancelación programada
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.cancel_at)}
                </p>
              </div>
            )}
            {subscription.canceled_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Fecha de cancelación
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.canceled_at)}
                </p>
              </div>
            )}
            {subscription.trial_ends_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Fin del período de prueba
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.trial_ends_at)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Editar suscripción */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar suscripción
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="trialing">Trial</SelectItem>
                    <SelectItem value="past_due">Vencida</SelectItem>
                    <SelectItem value="incomplete">Incompleta</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="period_end">Fin del período (YYYY-MM-DD)</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={editPeriodEnd}
                  onChange={(e) => setEditPeriodEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="trial_ends">
                  Fin del trial (fecha y hora, opcional)
                </Label>
                <Input
                  id="trial_ends"
                  type="datetime-local"
                  value={editTrialEndsAt}
                  onChange={(e) => setEditTrialEndsAt(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSaveEdit} disabled={saveLoading}>
              {saveLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar cambios
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Información de Stripe */}
      {(subscription.gateway_subscription_id ||
        subscription.gateway_customer_id) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <DollarSign className="h-5 w-5" />
              Información de Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscription.gateway_subscription_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    ID de Suscripción Stripe
                  </label>
                  <p className="text-sm font-mono text-gray-600">
                    {subscription.gateway_subscription_id}
                  </p>
                </div>
              )}
              {subscription.gateway_customer_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    ID de Cliente
                  </label>
                  <p className="text-sm font-mono text-gray-600">
                    {subscription.gateway_customer_id}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organización */}
      {subscription.organization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Building2 className="h-5 w-5" />
              Organización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  {subscription.organization.name}
                </p>
                <p className="text-sm text-gray-500">
                  Slug: {subscription.organization.slug}
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge>{subscription.organization.subscription_tier}</Badge>
                  <Badge
                    variant={
                      subscription.organization.status === "active"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {subscription.organization.status}
                  </Badge>
                </div>
              </div>
              <Link
                href={`/admin/saas-management/organizations/${subscription.organization.id}`}
              >
                <Button variant="outline" size="sm">
                  Ver organización
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Clock className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Fecha de creación
              </label>
              <p className="text-lg">{formatDate(subscription.created_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Última actualización
              </label>
              <p className="text-lg">{formatDate(subscription.updated_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                ID de la Suscripción
              </label>
              <p className="text-sm font-mono text-gray-600">
                {subscription.id}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-red-100 dark:bg-red-500/20 p-4 rounded-3xl w-fit mb-4">
              <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
            </div>
            <DialogTitle>¿Eliminar esta suscripción?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará el registro de
              suscripción.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={deleteLoading}
              onClick={handleDelete}
            >
              {deleteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
