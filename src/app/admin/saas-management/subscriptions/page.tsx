"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CreditCard,
  Eye,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Loader2,
  Building2,
  Play,
  Ban,
  ArrowLeft,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

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

export default function SubscriptionsPage() {
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
  const [createOrgId, setCreateOrgId] = useState("");
  const [createStatus, setCreateStatus] = useState("trialing");
  const [createTrialDays, setCreateTrialDays] = useState("7");
  const [createLoading, setCreateLoading] = useState(false);

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
      console.error("Error fetching organizations:", err);
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
    value?: any,
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

  const handleCreate = async () => {
    const orgId = createOrgId?.trim();
    if (!orgId) {
      toast.error("Selecciona una organización.");
      return;
    }
    const trialDaysNum = parseInt(createTrialDays, 10);
    if (isNaN(trialDaysNum) || trialDaysNum < 1) {
      toast.error("Días de prueba debe ser un número mayor a 0.");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/saas-management/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          status: createStatus,
          trial_days: trialDaysNum,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear suscripción");
      toast.success("Suscripción creada.");
      setCreateOpen(false);
      setCreateOrgId("");
      setCreateStatus("trialing");
      setCreateTrialDays("7");
      fetchSubscriptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCreateLoading(false);
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

  const getStatusBadge = (
    status: string,
    isExpiringSoon?: boolean,
    isExpired?: boolean,
  ) => {
    if (isExpired) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Vencida
        </Badge>
      );
    }

    if (isExpiringSoon) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Por vencer
        </Badge>
      );
    }

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

    return (
      <Badge variant={variants[status] || "default"}>
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

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      basic: "bg-gray-100 text-gray-800",
      pro: "bg-blue-100 text-blue-800",
      premium: "bg-purple-100 text-purple-800",
    };

    return (
      <Badge className={colors[tier] || colors.basic}>
        {tier === "basic"
          ? "Básico"
          : tier === "pro"
            ? "Pro"
            : tier === "premium"
              ? "Premium"
              : tier}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/saas-management/dashboard")}
            title="Volver al dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
              Gestión de Suscripciones
            </h1>
            <p className="text-admin-text-tertiary mt-2">
              Administra todas las suscripciones del sistema
            </p>
          </div>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva suscripción
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva suscripción</DialogTitle>
              <DialogDescription>
                Crea una suscripción para una organización. Se asignará período
                de prueba según los días indicados.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Organización</Label>
                <Select value={createOrgId} onValueChange={setCreateOrgId}>
                  <SelectTrigger className="rounded-none">
                    <SelectValue placeholder="Selecciona organización" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} ({org.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={createStatus} onValueChange={setCreateStatus}>
                  <SelectTrigger className="rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trialing">Trial</SelectItem>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="past_due">Vencida</SelectItem>
                    <SelectItem value="incomplete">Incompleta</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial_days">Días de prueba (si es trial)</Label>
                <Input
                  id="trial_days"
                  type="number"
                  min={1}
                  value={createTrialDays}
                  onChange={(e) => setCreateTrialDays(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createLoading}>
                {createLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

      {/* Filtros */}
      <Card className="admin-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select
              value={organizationFilter}
              onValueChange={setOrganizationFilter}
            >
              <SelectTrigger className="rounded-none w-[200px]">
                <SelectValue placeholder="Filtrar por organización" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las organizaciones</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-none w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="past_due">Vencida</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
                <SelectItem value="incomplete">Incompleta</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="rounded-none w-[180px]">
                <SelectValue placeholder="Filtrar por tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tiers</SelectItem>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de suscripciones */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Suscripciones ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No se encontraron suscripciones
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organización</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Días restantes</TableHead>
                      <TableHead>Stripe ID</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow
                        key={sub.id}
                        className={
                          sub.isExpiringSoon || sub.isExpired
                            ? "bg-yellow-50"
                            : ""
                        }
                      >
                        <TableCell>
                          {sub.organization ? (
                            <div>
                              <div className="font-medium">
                                {sub.organization.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {sub.organization.slug}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">
                              Sin organización
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub.organization
                            ? getTierBadge(sub.organization.subscription_tier)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(
                            sub.status,
                            sub.isExpiringSoon,
                            sub.isExpired,
                          )}
                        </TableCell>
                        <TableCell>
                          {sub.current_period_start &&
                          sub.current_period_end ? (
                            <div className="text-sm">
                              <div>{formatDate(sub.current_period_start)}</div>
                              <div className="text-gray-500">
                                hasta {formatDate(sub.current_period_end)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub.daysUntilExpiry !== null ? (
                            <div
                              className={
                                sub.isExpiringSoon || sub.isExpired
                                  ? "font-semibold text-yellow-600"
                                  : ""
                              }
                            >
                              {sub.daysUntilExpiry != null &&
                              sub.daysUntilExpiry > 0
                                ? `${sub.daysUntilExpiry} días`
                                : sub.daysUntilExpiry != null &&
                                    sub.daysUntilExpiry === 0
                                  ? "Hoy"
                                  : sub.daysUntilExpiry != null
                                    ? `Vencida hace ${Math.abs(sub.daysUntilExpiry)} días`
                                    : "N/A"}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub.gateway_subscription_id ? (
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {sub.gateway_subscription_id.substring(0, 20)}...
                            </code>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/admin/saas-management/subscriptions/${sub.id}`,
                                  )
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {sub.status === "cancelled" ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleAction(sub.id, "reactivate")
                                  }
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Reactivar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => setCancelConfirmId(sub.id)}
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Cancelar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteConfirmId(sub.id)}
                                disabled={deleteId === sub.id && deleteLoading}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de confirmación: cancelar suscripción (toast del programa) */}
      <Dialog
        open={cancelConfirmId !== null}
        onOpenChange={(open) => !open && setCancelConfirmId(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-red-100 dark:bg-red-500/20 p-4 rounded-3xl w-fit mb-4">
              <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
            </div>
            <DialogTitle>¿Cancelar suscripción?</DialogTitle>
            <DialogDescription>
              La organización mantendrá el acceso hasta el final del periodo
              actual. Después la suscripción quedará cancelada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelConfirmId(null)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelConfirmId}
              onClick={() =>
                cancelConfirmId && handleAction(cancelConfirmId, "cancel")
              }
            >
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación: eliminar suscripción (toast del programa) */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
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
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteConfirmId || deleteLoading}
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              {deleteLoading && deleteId === deleteConfirmId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
