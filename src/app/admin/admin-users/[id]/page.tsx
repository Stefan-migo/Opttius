"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Crown,
  Mail,
  Phone,
  Calendar,
  Activity,
  Clock,
  Shield,
  Globe,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useBranch } from "@/hooks/useBranch";
import BranchAccessManager from "@/components/admin/BranchAccessManager";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  permissions: Record<string, string[]>;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  is_super_admin?: boolean;
  branches?: Array<{
    id: string;
    name: string;
    code: string;
    is_primary: boolean;
  }>;
  profiles?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  analytics?: {
    activityCount30Days: number;
    lastActivity?: string;
    fullName?: string;
  };
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const adminId = params.id as string;
  const { isSuperAdmin } = useBranch();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (adminId) {
      fetchAdminUser();
    }
  }, [adminId]);

  const fetchAdminUser = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/admin-users/${adminId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Administrador no encontrado");
        }
        throw new Error("Error al cargar el administrador");
      }

      const data = await response.json();
      setAdminUser(data.adminUser);
      setError(null);
    } catch (err) {
      console.error("Error fetching admin user:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error(
        err instanceof Error ? err.message : "Error al cargar el administrador",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-admin-accent-tertiary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando administrador...</p>
        </div>
      </div>
    );
  }

  if (error || !adminUser) {
    return (
      <div className="container mx-auto py-8">
        <Card className="admin-card bg-admin-bg-tertiary">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-epoch-primary mb-4">
                Error
              </h2>
              <p className="text-muted-foreground mb-6">
                {error || "Administrador no encontrado"}
              </p>
              <Button
                onClick={() => router.push("/admin/admin-users")}
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Administradores
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggleStatus = async () => {
    if (!isSuperAdmin) {
      toast.error(
        "Solo los super administradores pueden activar o desactivar otros administradores",
      );
      return;
    }

    if (
      !confirm(
        `¿Estás seguro de que quieres ${adminUser.is_active ? "desactivar" : "activar"} a este administrador?`,
      )
    ) {
      return;
    }

    try {
      setTogglingStatus(true);
      const response = await fetch(`/api/admin/admin-users/${adminId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !adminUser.is_active }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar estado");
      }

      toast.success(
        `Administrador ${!adminUser.is_active ? "activado" : "desactivado"} exitosamente`,
      );
      fetchAdminUser();
    } catch (error) {
      console.error("Error toggling admin status:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar estado",
      );
    } finally {
      setTogglingStatus(false);
    }
  };

  const fullName = adminUser.profiles
    ? `${adminUser.profiles.first_name || ""} ${adminUser.profiles.last_name || ""}`.trim() ||
      adminUser.email
    : adminUser.email;

  return (
    <div
      className="container mx-auto py-8 space-y-6"
      style={{ paddingTop: "1rem" }}
    >
      {/* Header */}
      <div className="space-y-4">
        {/* First Row: Back Button */}
        <div>
          <Link href="/admin/admin-users">
            <Button variant="default" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>

        {/* Second Row: Title and Edit Button */}
        <div
          className="flex items-center justify-between"
          style={{ marginTop: "2rem" }}
        >
          <div>
            <h1 className="text-3xl font-bold text-epoch-primary">
              Detalles del Administrador
            </h1>
            <p className="text-muted-foreground">
              Información completa del usuario administrador
            </p>
          </div>
          <Link href={`/admin/admin-users/${adminId}/edit`}>
            <Button>Editar Usuario</Button>
          </Link>
        </div>
      </div>

      {/* Main Info Card */}
      <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-admin-accent-tertiary/20 flex items-center justify-center">
              <Crown className="h-6 w-6 text-admin-accent-tertiary" />
            </div>
            <div>
              <div className="text-2xl">{fullName}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {adminUser.email}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status and Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Estado</label>
              <div className="mt-1 flex items-center gap-2">
                {adminUser.is_active ? (
                  <Badge className="bg-admin-success text-admin-text-on-dark">
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="destructive">Inactivo</Badge>
                )}
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleStatus}
                    disabled={togglingStatus}
                  >
                    {togglingStatus
                      ? "Actualizando..."
                      : adminUser.is_active
                        ? "Desactivar"
                        : "Activar"}
                  </Button>
                )}
              </div>
              {!isSuperAdmin && (
                <p className="text-xs text-muted-foreground mt-1">
                  Solo los super administradores pueden cambiar el estado
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Rol</label>
              <div className="mt-1">
                {adminUser.is_super_admin ||
                adminUser.role === "super_admin" ? (
                  <Badge
                    variant="default"
                    className="flex items-center gap-1 w-fit bg-epoch-accent text-epoch-primary"
                  >
                    <Globe className="h-3 w-3" />
                    Super Administrador
                  </Badge>
                ) : adminUser.role === "vendedor" ? (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 w-fit"
                  >
                    Vendedor
                  </Badge>
                ) : adminUser.role === "employee" ? (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 w-fit"
                  >
                    Empleado
                  </Badge>
                ) : (
                  <Badge
                    variant="default"
                    className="flex items-center gap-1 w-fit"
                  >
                    <Crown className="h-3 w-3" />
                    Administrador
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Branch Access Information - Replaced with BranchAccessManager */}

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <div className="font-medium">{adminUser.email}</div>
              </div>
            </div>
            {adminUser.profiles?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <label className="text-sm text-muted-foreground">
                    Teléfono
                  </label>
                  <div className="font-medium">{adminUser.profiles.phone}</div>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm text-muted-foreground">
                  Fecha de Registro
                </label>
                <div className="font-medium">
                  {new Date(adminUser.created_at).toLocaleDateString("es-AR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
            {adminUser.last_login && (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <label className="text-sm text-muted-foreground">
                    Último Acceso
                  </label>
                  <div className="font-medium">
                    {new Date(adminUser.last_login).toLocaleDateString(
                      "es-AR",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <div>
              <label className="text-sm text-muted-foreground">
                Actividad (últimos 30 días)
              </label>
              <div className="font-medium">
                {adminUser.analytics?.activityCount30Days || 0} acciones
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branch Access Manager - Only for super admin and admin */}
      {(isSuperAdmin || adminUser.role === "admin") && (
        <BranchAccessManager
          adminUserId={adminId}
          isSuperAdmin={
            adminUser.is_super_admin || adminUser.role === "super_admin"
          }
          canEdit={isSuperAdmin || adminUser.role === "admin"}
        />
      )}

      {/* Permissions Card */}
      <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permisos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(adminUser.permissions || {}).map(
              ([resource, actions]) => (
                <div
                  key={resource}
                  className="p-3 bg-admin-bg-tertiary rounded-md"
                >
                  <div className="font-medium capitalize mb-2">
                    {resource.replace("_", " ")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {actions.map((action) => (
                      <Badge key={action} variant="outline" className="text-xs">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
