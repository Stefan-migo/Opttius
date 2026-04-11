"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Crown,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

interface UserDetails {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  permissions?: Record<string, string[]>;
  organization?: {
    id: string;
    name: string;
    slug: string;
    subscription_tier: string;
    status: string;
  };
  profiles?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    created_at: string;
  };
  admin_branch_access?: Array<{
    id: string;
    branch_id: string | null;
    role?: string;
    is_primary?: boolean;
    branches?: {
      id: string;
      name: string;
      code: string;
      organization_id: string;
    };
  }>;
  recentActivity?: Array<{
    id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    created_at: string;
  }>;
}

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/saas-management/users/${userId}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Usuario no encontrado");
        }
        throw new Error("Error al cargar detalles del usuario");
      }

      const data = await response.json();
      setUser(data.user);
      setError(null);
    } catch (err) {
      console.error("Error fetching user details:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error(
        err instanceof Error
          ? err.message
          : "Error al cargar detalles del usuario",
      );
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      root: "bg-red-100 text-red-800",
      dev: "bg-orange-100 text-orange-800",
      super_admin: "bg-purple-100 text-purple-800",
      admin: "bg-blue-100 text-blue-800",
      employee: "bg-gray-100 text-gray-800",
      vendedor: "bg-green-100 text-green-800",
    };

    const icons: Record<string, typeof Shield> = {
      root: Shield,
      dev: Shield,
      super_admin: Crown,
      admin: User,
      employee: User,
      vendedor: User,
    };

    const Icon = icons[role] || User;

    return (
      <Badge className={colors[role] || colors.admin}>
        <Icon className="h-3 w-3 mr-1" />
        {role === "root"
          ? "Root"
          : role === "dev"
            ? "Dev"
            : role === "super_admin"
              ? "Super Admin"
              : role === "admin"
                ? "Admin"
                : role === "vendedor"
                  ? "Vendedor"
                  : role === "employee"
                    ? "Empleado"
                    : role}
      </Badge>
    );
  };

  const isSuperAdmin = user?.admin_branch_access?.some(
    (access) => access.branch_id === null,
  );

  const handleDeleteUser = async () => {
    if (!user) return;
    try {
      setDeleting(true);
      const response = await fetch(
        `/api/admin/saas-management/users/${user.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.details || "Error al eliminar usuario",
        );
      }

      toast.success("Usuario eliminado correctamente");
      router.push("/admin/saas-management/users");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al eliminar usuario",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Cargando detalles del usuario...
          </p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            title="Volver a usuarios"
            variant="ghost"
            onClick={() => router.push("/admin/saas-management/users")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
              Error
            </h1>
          </div>
        </div>
        <Card className="admin-card">
          <CardContent className="pt-6">
            <div className="text-center py-12 text-red-600">
              {error || "Usuario no encontrado"}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = user.profiles
    ? `${user.profiles.first_name || ""} ${user.profiles.last_name || ""}`.trim() ||
      user.email
    : user.email;

  const branches =
    user.admin_branch_access
      ?.filter((access) => access.branch_id !== null)
      .map((access) => access.branches)
      .filter(Boolean) || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            title="Volver a usuarios"
            variant="ghost"
            onClick={() => router.push("/admin/saas-management/users")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
              Detalles del Usuario
            </h1>
            <p className="text-muted-foreground mt-2">
              Información completa del usuario del sistema
            </p>
          </div>
        </div>
        {user.role !== "root" && user.role !== "dev" && (
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar usuario
          </Button>
        )}
      </div>

      {/* Información Principal */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Nombre
              </label>
              <p className="text-lg font-semibold">{fullName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-lg flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
            </div>
            {user.profiles?.phone && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Teléfono
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {user.profiles.phone}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Rol</label>
              <div className="mt-1">{getRoleBadge(user.role)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Estado
              </label>
              <div className="mt-1">
                {user.is_active ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Activo
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactivo
                  </Badge>
                )}
              </div>
            </div>
            {user.last_login && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Último acceso
                </label>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(user.last_login)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Organización */}
      {user.organization && (
        <Card className="admin-card">
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
                  {user.organization.name}
                </p>
                <p className="text-sm text-gray-500">
                  Slug: {user.organization.slug}
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge>{user.organization.subscription_tier}</Badge>
                  <Badge
                    variant={
                      user.organization.status === "active"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {user.organization.status}
                  </Badge>
                </div>
              </div>
              <Link
                href={`/admin/saas-management/organizations/${user.organization.id}`}
              >
                <Button size="sm" variant="outline">
                  Ver organización
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acceso a Sucursales */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <MapPin className="h-5 w-5" />
            Acceso a Sucursales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSuperAdmin ? (
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <span className="font-semibold">
                Super Admin - Acceso a todas las sucursales
              </span>
            </div>
          ) : branches.length > 0 ? (
            <div className="space-y-2">
              {branches.map((branch) => (
                <div
                  className="flex items-center justify-between p-3 border rounded-lg"
                  key={branch?.id}
                >
                  <div>
                    <p className="font-semibold">{branch?.name}</p>
                    <p className="text-sm text-gray-500">
                      Código: {branch?.code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              No tiene acceso a sucursales específicas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actividad Reciente */}
      {user.recentActivity && user.recentActivity.length > 0 && (
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Activity className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.recentActivity.slice(0, 10).map((activity) => (
                <div
                  className="flex items-center justify-between p-3 border rounded-lg"
                  key={activity.id}
                >
                  <div>
                    <p className="font-semibold">{activity.action}</p>
                    <p className="text-sm text-gray-500">
                      {activity.resource_type} - {activity.resource_id}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatDate(activity.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información del Sistema */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Shield className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Fecha de creación
              </label>
              <p className="text-lg">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Última actualización
              </label>
              <p className="text-lg">{formatDate(user.updated_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                ID del Usuario
              </label>
              <p className="text-sm font-mono text-gray-600">{user.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para eliminar usuario */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Eliminación de Usuario
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-4 mt-4">
                <p className="font-semibold text-lg">
                  ¿Estás seguro de que deseas eliminar al usuario{" "}
                  <span className="text-red-600">&quot;{fullName}&quot;</span> (
                  {user.email})?
                </p>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
                        Esta acción es IRREVERSIBLE
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                        Se eliminará permanentemente el usuario, su perfil y
                        acceso al sistema.
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        Si el usuario tiene una organización asignada, la
                        organización permanecerá (sin owner). La organización se
                        elimina desde la sección Organizaciones.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Esta acción no se puede deshacer.
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
              onClick={handleDeleteUser}
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
