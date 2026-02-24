"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { extractDataFromResponse } from "@/lib/api/response-helpers";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Users,
  MapPin,
  Package,
  ShoppingCart,
  Edit,
  Loader2,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Crown,
  Trash2,
  AlertTriangle,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  status: string;
  owner_id?: string;
  metadata?: any;
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
  branches?: Array<{
    id: string;
    name: string;
    code: string;
    address_line_1?: string;
    city?: string;
  }>;
}

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<OrganizationDetails | null>(
    null,
  );
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

  // Branches CRUD
  const [branches, setBranches] = useState<Array<any>>([]);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchFormData, setBranchFormData] = useState({
    name: "",
    code: "",
    address_line_1: "",
    city: "",
    phone: "",
    email: "",
    is_active: true,
  });

  // Delete confirmations (Dialog instead of window.confirm)
  const [deleteBranchConfirmId, setDeleteBranchConfirmId] = useState<
    string | null
  >(null);
  const [deleteUserConfirmId, setDeleteUserConfirmId] = useState<string | null>(
    null,
  );

  // Users CRUD
  const [users, setUsers] = useState<Array<any>>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "admin",
    branch_id: "",
  });

  useEffect(() => {
    fetchOrganizationDetails();
    if (orgId) {
      fetchBranches();
      fetchUsers();
    }
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

  // Branches functions
  const fetchBranches = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/branches`,
      );
      if (!response.ok) throw new Error("Error al cargar sucursales");
      const data = await response.json();
      setBranches(data.branches || []);
    } catch (err) {
      toast.error("Error al cargar sucursales");
    }
  };

  const handleCreateBranch = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/branches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(branchFormData),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al crear sucursal");

      toast.success("Sucursal creada exitosamente");
      setShowBranchDialog(false);
      setBranchFormData({
        name: "",
        code: "",
        address_line_1: "",
        city: "",
        phone: "",
        email: "",
        is_active: true,
      });
      fetchBranches();
      fetchOrganizationDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch) return;
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/branches/${editingBranch.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(branchFormData),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al actualizar sucursal");

      toast.success("Sucursal actualizada exitosamente");
      setShowBranchDialog(false);
      setEditingBranch(null);
      setBranchFormData({
        name: "",
        code: "",
        address_line_1: "",
        city: "",
        phone: "",
        email: "",
        is_active: true,
      });
      fetchBranches();
      fetchOrganizationDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleDeleteBranchClick = (branchId: string) => {
    setDeleteBranchConfirmId(branchId);
  };

  const handleDeleteBranchConfirm = async () => {
    if (!deleteBranchConfirmId) return;

    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/branches/${deleteBranchConfirmId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al eliminar sucursal");

      toast.success("Sucursal eliminada exitosamente");
      setDeleteBranchConfirmId(null);
      fetchBranches();
      fetchOrganizationDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  // Users functions
  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/users`,
      );
      if (!response.ok) throw new Error("Error al cargar usuarios");
      const data = await response.json();
      setUsers(extractDataFromResponse(data));
    } catch (err) {
      toast.error("Error al cargar usuarios");
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/users`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userFormData),
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al crear usuario");

      toast.success("Usuario creado exitosamente");
      setShowUserDialog(false);
      setUserFormData({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        role: "admin",
        branch_id: "",
      });
      fetchUsers();
      fetchOrganizationDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const response = await fetch(
        `/api/admin/saas-management/users/${editingUser.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: userFormData.role,
            is_active: editingUser.is_active,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al actualizar usuario");

      toast.success("Usuario actualizado exitosamente");
      setShowUserDialog(false);
      setEditingUser(null);
      setUserFormData({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        role: "admin",
        branch_id: "",
      });
      fetchUsers();
      fetchOrganizationDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleDeleteUserClick = (userId: string) => {
    setDeleteUserConfirmId(userId);
  };

  const handleDeleteUserConfirm = async () => {
    if (!deleteUserConfirmId) return;

    try {
      const response = await fetch(
        `/api/admin/saas-management/users/${deleteUserConfirmId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al eliminar usuario");

      toast.success("Usuario eliminado exitosamente");
      setDeleteUserConfirmId(null);
      fetchUsers();
      fetchOrganizationDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
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
                <Button variant="outline" className="mt-4">
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/saas-management/organizations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
                {organization.name}
              </h1>
              {getStatusBadge(organization.status)}
              {getTierBadge(organization.subscription_tier)}
            </div>
            <p className="text-admin-text-tertiary mt-1">{organization.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {organization.status === "active" ? (
            <Button variant="outline" onClick={() => handleAction("suspend")}>
              <Pause className="h-4 w-4 mr-2" />
              Suspender
            </Button>
          ) : (
            <Button variant="outline" onClick={() => handleAction("activate")}>
              <Play className="h-4 w-4 mr-2" />
              Activar
            </Button>
          )}
          <Button onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="admin-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Usuarios Activos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organization.stats.activeUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              de {organization.stats.totalUsers} totales
            </p>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucursales</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organization.stats.branches}
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organization.stats.orders}
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organization.stats.products}
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suscripción</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {organization.subscriptions?.[0]?.status || "Sin suscripción"}
            </div>
            {organization.subscriptions?.[0]?.current_period_end && (
              <p className="text-xs text-muted-foreground">
                Vence:{" "}
                {formatDate(organization.subscriptions[0].current_period_end)}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(
                  `/admin/saas-management/subscriptions?organization_id=${orgId}`,
                )
              }
            >
              Gestionar suscripciones
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para gestión detallada */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <Building2 className="h-4 w-4 mr-2" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="branches">
            <MapPin className="h-4 w-4 mr-2" />
            Sucursales ({branches.length})
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Usuarios ({users.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información general */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Nombre
                  </label>
                  <p className="text-base">{organization.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Slug
                  </label>
                  <p className="text-base">{organization.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Owner
                  </label>
                  {organization.owner ? (
                    <div>
                      <p className="text-base">
                        {organization.owner.first_name}{" "}
                        {organization.owner.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {organization.owner.email}
                      </p>
                      {organization.owner.phone && (
                        <p className="text-sm text-gray-500">
                          {organization.owner.phone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-base text-gray-400">
                      Sin owner asignado
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Creada
                  </label>
                  <p className="text-base">
                    {formatDate(organization.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Última actualización
                  </label>
                  <p className="text-base">
                    {formatDate(organization.updated_at)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Usuarios recientes */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Usuarios Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                {organization.recentUsers &&
                organization.recentUsers.length > 0 ? (
                  <div className="space-y-2">
                    {organization.recentUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {user.profiles?.first_name}{" "}
                            {user.profiles?.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{user.role}</Badge>
                            {user.is_active ? (
                              <Badge variant="default">Activo</Badge>
                            ) : (
                              <Badge variant="secondary">Inactivo</Badge>
                            )}
                          </div>
                        </div>
                        {user.last_login && (
                          <div className="text-sm text-gray-500">
                            Último acceso: {formatDate(user.last_login)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No hay usuarios registrados
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Sucursales */}
        <TabsContent value="branches" className="space-y-6">
          <Card className="admin-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sucursales</CardTitle>
              <Button
                onClick={() => {
                  setEditingBranch(null);
                  setBranchFormData({
                    name: "",
                    code: "",
                    address_line_1: "",
                    city: "",
                    phone: "",
                    email: "",
                    is_active: true,
                  });
                  setShowBranchDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Sucursal
              </Button>
            </CardHeader>
            <CardContent>
              {branches.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay sucursales registradas
                </p>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((branch) => (
                        <TableRow key={branch.id}>
                          <TableCell className="font-medium">
                            {branch.name}
                          </TableCell>
                          <TableCell>{branch.code}</TableCell>
                          <TableCell>
                            {branch.address_line_1 && branch.city
                              ? `${branch.address_line_1}, ${branch.city}`
                              : "-"}
                          </TableCell>
                          <TableCell>{branch.phone || "-"}</TableCell>
                          <TableCell>
                            {branch.is_active ? (
                              <Badge variant="default">Activa</Badge>
                            ) : (
                              <Badge variant="secondary">Inactiva</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingBranch(branch);
                                  setBranchFormData({
                                    name: branch.name,
                                    code: branch.code,
                                    address_line_1: branch.address_line_1 || "",
                                    city: branch.city || "",
                                    phone: branch.phone || "",
                                    email: branch.email || "",
                                    is_active: branch.is_active,
                                  });
                                  setShowBranchDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteBranchClick(branch.id)
                                }
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Usuarios */}
        <TabsContent value="users" className="space-y-6">
          <Card className="admin-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Usuarios</CardTitle>
              <Button
                onClick={() => {
                  setEditingUser(null);
                  setUserFormData({
                    email: "",
                    password: "",
                    first_name: "",
                    last_name: "",
                    role: "admin",
                    branch_id: "",
                  });
                  setShowUserDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay usuarios registrados
                </p>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.profiles?.first_name}{" "}
                            {user.profiles?.last_name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            {user.is_active ? (
                              <Badge variant="default">Activo</Badge>
                            ) : (
                              <Badge variant="secondary">Inactivo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setUserFormData({
                                    email: user.email,
                                    password: "",
                                    first_name: user.profiles?.first_name || "",
                                    last_name: user.profiles?.last_name || "",
                                    role: user.role,
                                    branch_id: "",
                                  });
                                  setShowUserDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUserClick(user.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de creación/edición de sucursal */}
      <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? "Editar Sucursal" : "Nueva Sucursal"}
            </DialogTitle>
            <DialogDescription>
              {editingBranch
                ? "Modifica los datos de la sucursal"
                : "Completa los datos para crear una nueva sucursal"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  value={branchFormData.name}
                  onChange={(e) =>
                    setBranchFormData({
                      ...branchFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder="Ej: Sucursal Centro"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Código</label>
                <Input
                  value={branchFormData.code}
                  onChange={(e) =>
                    setBranchFormData({
                      ...branchFormData,
                      code: e.target.value,
                    })
                  }
                  placeholder="Se genera automáticamente si se deja vacío"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Dirección</label>
              <Input
                value={branchFormData.address_line_1}
                onChange={(e) =>
                  setBranchFormData({
                    ...branchFormData,
                    address_line_1: e.target.value,
                  })
                }
                placeholder="Dirección línea 1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ciudad</label>
              <Input
                value={branchFormData.city}
                onChange={(e) =>
                  setBranchFormData({ ...branchFormData, city: e.target.value })
                }
                placeholder="Ciudad"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  value={branchFormData.phone}
                  onChange={(e) =>
                    setBranchFormData({
                      ...branchFormData,
                      phone: e.target.value,
                    })
                  }
                  placeholder="Teléfono"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={branchFormData.email}
                  onChange={(e) =>
                    setBranchFormData({
                      ...branchFormData,
                      email: e.target.value,
                    })
                  }
                  placeholder="Email"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="branch-active"
                checked={branchFormData.is_active}
                onChange={(e) =>
                  setBranchFormData({
                    ...branchFormData,
                    is_active: e.target.checked,
                  })
                }
                className="rounded"
              />
              <label htmlFor="branch-active" className="text-sm font-medium">
                Sucursal activa
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBranchDialog(false);
                setEditingBranch(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={editingBranch ? handleUpdateBranch : handleCreateBranch}
            >
              {editingBranch ? "Guardar Cambios" : "Crear Sucursal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de creación/edición de usuario */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Modifica los datos del usuario"
                : "Completa los datos para crear un nuevo usuario"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={userFormData.first_name}
                  onChange={(e) =>
                    setUserFormData({
                      ...userFormData,
                      first_name: e.target.value,
                    })
                  }
                  placeholder="Nombre"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Apellido</label>
                <Input
                  value={userFormData.last_name}
                  onChange={(e) =>
                    setUserFormData({
                      ...userFormData,
                      last_name: e.target.value,
                    })
                  }
                  placeholder="Apellido"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={userFormData.email}
                onChange={(e) =>
                  setUserFormData({ ...userFormData, email: e.target.value })
                }
                placeholder="email@ejemplo.com"
                disabled={!!editingUser}
              />
            </div>
            {!editingUser && (
              <div>
                <label className="text-sm font-medium">Contraseña *</label>
                <Input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) =>
                    setUserFormData({
                      ...userFormData,
                      password: e.target.value,
                    })
                  }
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Rol</label>
              <Select
                value={userFormData.role}
                onValueChange={(value) =>
                  setUserFormData({ ...userFormData, role: value })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Empleado</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!editingUser && (
              <div>
                <label className="text-sm font-medium">
                  Sucursal (Opcional)
                </label>
                <Select
                  value={userFormData.branch_id || "__none__"}
                  onValueChange={(value) =>
                    setUserFormData({
                      ...userFormData,
                      branch_id: value === "__none__" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Sin sucursal específica
                    </SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUserDialog(false);
                setEditingUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={editingUser ? handleUpdateUser : handleCreateUser}>
              {editingUser ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
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
            <Button onClick={handleUpdate} disabled={editing}>
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
                          Todas las órdenes ({organization?.stats?.orders || 0})
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
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
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

      {/* Delete Branch Confirmation Dialog */}
      <Dialog
        open={deleteBranchConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteBranchConfirmId(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Eliminar sucursal
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar esta sucursal? Esta acción eliminará
              todos los datos relacionados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteBranchConfirmId(null)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteBranchConfirm}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={deleteUserConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteUserConfirmId(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Eliminar usuario
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar este usuario? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteUserConfirmId(null)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUserConfirm}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
