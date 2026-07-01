"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Crown,
  Loader2,
  MapPin,
  Pause,
  Play,
  ShoppingCart,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";

import OrgBasicInfo from "../components/OrgBasicInfo";
import OrgDetailHeader from "../components/OrgDetailHeader";
import OrgSubscriptionInfo from "../components/OrgSubscriptionInfo";
import OrgActivityLog from "../components/OrgActivityLog";
import OrgBranchesTab from "./OrgBranchesTab";
import OrgUsersTab from "./OrgUsersTab";

interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  status: string;
  owner_id?: string;
  metadata?: unknown;
  created_at: string;
  updated_at: string;
  stats: {
    totalUsers: number;
    activeUsers: number;
    branches: number;
    orders: number;
    products: number;
  };
  subscriptions?: Array<{
    id: string;
    status: string;
    current_period_start?: string;
    current_period_end?: string;
    gateway_subscription_id?: string;
  }>;
  owner?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  recentUsers?: Array<{
    id: string;
    email: string;
    role: string;
    is_active: boolean;
    last_login?: string;
    created_at: string;
    profiles?: {
      first_name?: string;
      last_name?: string;
    };
  }>;
}

export default function OrganizationDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [organization, setOrganization] =
    useState<OrganizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    slug: "",
    subscription_tier: "basic",
    status: "active",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchOrganizationDetails();
  }, [orgId]);

  const fetchOrganizationDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar detalles de la organización");
      }

      const data = await response.json();
      setOrganization(data.organization);
      setEditData({
        name: data.organization.name,
        slug: data.organization.slug,
        subscription_tier: data.organization.subscription_tier,
        status: data.organization.status,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error("Error al cargar detalles");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setEditing(true);
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editData),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar organización");
      }

      toast.success("Organización actualizada exitosamente");
      setShowEditDialog(false);
      fetchOrganizationDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setEditing(false);
    }
  };

  const handleAction = async (
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
      fetchOrganizationDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}`,
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
        `Organización "${organization?.name}" eliminada completamente junto con todos sus datos relacionados`,
      );
      router.push("/admin/saas-management/organizations");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      suspended: "secondary",
      cancelled: "destructive",
    };

    const icons: Record<string, typeof CheckCircle2> = {
      active: CheckCircle2,
      suspended: Pause,
      cancelled: XCircle,
    };

    const Icon = icons[status] || CheckCircle2;

    return (
      <Badge variant={variants[status] || "default"}>
        <Icon className="h-3 w-3 mr-1" />
        {status === "active"
          ? "Activa"
          : status === "suspended"
            ? "Suspendida"
            : "Cancelada"}
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
        <Crown className="h-3 w-3 mr-1" />
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="p-6">
        <Card className="admin-card">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error: {error || "Organización no encontrada"}</p>
              <Link href="/admin/saas-management/organizations">
                <Button className="mt-4" variant="outline">
                  Volver a organizaciones
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <OrgDetailHeader
        name={organization.name}
        slug={organization.slug}
        status={organization.status}
        subscriptionTier={organization.subscription_tier}
        onAction={handleAction}
        onEdit={() => setShowEditDialog(true)}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      <OrgSubscriptionInfo
        stats={organization.stats}
        subscriptions={organization.subscriptions}
        orgId={orgId}
      />

      {/* Tabs para gestión detallada */}
      <Tabs
        className="space-y-6"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <Building2 className="h-4 w-4 mr-2" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="branches">
            <MapPin className="h-4 w-4 mr-2" />
            Sucursales ({organization.stats.branches})
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Usuarios ({organization.stats.totalUsers})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent className="space-y-6" value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrgBasicInfo
              name={organization.name}
              slug={organization.slug}
              owner={organization.owner || null}
              createdAt={organization.created_at}
              updatedAt={organization.updated_at}
            />

            <OrgActivityLog recentUsers={organization.recentUsers} />
          </div>
        </TabsContent>

        {/* Tab: Sucursales */}
        <TabsContent className="space-y-6" value="branches">
          <OrgBranchesTab
            orgId={orgId}
            onOrgUpdate={fetchOrganizationDetails}
          />
        </TabsContent>

        {/* Tab: Usuarios */}
        <TabsContent className="space-y-6" value="users">
          <OrgUsersTab
            orgId={orgId}
            onOrgUpdate={fetchOrganizationDetails}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de edición */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Organización</DialogTitle>
            <DialogDescription>
              Modifica los datos de la organización
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <input
                className="w-full mt-1 px-3 py-2 border rounded-md"
                type="text"
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <input
                className="w-full mt-1 px-3 py-2 border rounded-md"
                type="text"
                value={editData.slug}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tier</label>
              <Select
                value={editData.subscription_tier}
                onValueChange={(value) =>
                  setEditData({ ...editData, subscription_tier: value })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={editData.status}
                onValueChange={(value) =>
                  setEditData({ ...editData, status: value })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="suspended">Suspendida</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button disabled={editing} onClick={handleUpdate}>
              {editing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    &quot;{organization?.name}&quot;
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
                        <li>
                          Todas las sucursales (
                          {organization?.stats?.branches || 0})
                        </li>
                        <li>
                          Todos los usuarios asociados (
                          {organization?.stats?.activeUsers || 0})
                        </li>
                        <li>Todas las suscripciones</li>
                        <li>
                          Todos los productos (
                          {organization?.stats?.products || 0})
                        </li>
                        <li>Todos los clientes</li>
                        <li>
                          Todas las órdenes (
                          {organization?.stats?.orders || 0})
                        </li>
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
              onClick={() => setDeleteDialogOpen(false)}
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
