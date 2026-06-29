"use client";

import {
  Activity,
  ArrowLeft,
  Calendar,
  Clock,
  Crown,
  Globe,
  Mail,
  Phone,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import BranchAccessManager from "@/components/admin/BranchAccessManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranch } from "@/hooks/useBranch";

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

export default function AdminUserDetailContent() {
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
      <div className="flex items-center justify-center min-h-screen bg-epoch-background py-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-epoch-accent border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-epoch-primary/80">
            Cargando administrador...
          </p>
        </div>
      </div>
    );
  }

  if (error || !adminUser) {
    return (
      <div className="p-4 sm:p-6 bg-epoch-background min-h-screen">
        <Card className="rounded-xl border border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center py-6 sm:py-8">
              <h2 className="text-lg sm:text-xl font-bold text-epoch-primary mb-2">
                Error
              </h2>
              <p className="text-sm text-epoch-primary/80 mb-6">
                {error || "Administrador no encontrado"}
              </p>
              <Button
                className="rounded-xl border-epoch-primary/20 min-h-[44px] px-6"
                variant="outline"
                onClick={() => router.push("/admin/admin-users")}
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
    <div className="p-4 sm:p-6 bg-epoch-background min-h-screen space-y-4 sm:space-y-6">
      {/* Header - reorganizado en filas */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/admin-users">
            <Button
              className="rounded-xl text-epoch-primary hover:bg-epoch-primary/10 min-h-[44px] shrink-0"
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-epoch-primary tracking-tight">
          Detalles del Administrador
        </h1>
        <p className="text-sm sm:text-base text-epoch-primary/80 max-w-2xl">
          Información completa del usuario administrador
        </p>
        <div className="flex justify-start sm:justify-end">
          <Link href={`/admin/admin-users/${adminId}/edit`}>
            <Button className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase min-h-[44px] px-6 w-full sm:w-auto">
              Editar Usuario
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Info Card */}
      <Card className="rounded-xl border border-border">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="flex flex-col sm:flex-row items-start gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-epoch-accent/20 flex items-center justify-center shrink-0">
              <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-epoch-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl md:text-2xl font-display font-bold text-epoch-primary truncate">
                {fullName}
              </div>
              <div className="text-xs sm:text-sm font-normal text-epoch-primary/70 truncate">
                {adminUser.email}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4 space-y-4 sm:space-y-6">
          {/* Status and Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm text-epoch-primary/80">
                Estado
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {adminUser.is_active ? (
                  <Badge className="bg-epoch-primary text-white">Activo</Badge>
                ) : (
                  <Badge variant="destructive">Inactivo</Badge>
                )}
                {isSuperAdmin && (
                  <Button
                    className="rounded-xl border-epoch-primary/20 min-h-[44px]"
                    disabled={togglingStatus}
                    size="sm"
                    variant="outline"
                    onClick={handleToggleStatus}
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
                <p className="text-[10px] sm:text-xs text-epoch-primary/70 mt-1">
                  Solo los super administradores pueden cambiar el estado
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm text-epoch-primary/80">
                Rol
              </label>
              <div className="mt-1">
                {adminUser.is_super_admin ||
                adminUser.role === "super_admin" ? (
                  <Badge
                    className="flex items-center gap-1 w-fit bg-epoch-accent text-epoch-primary"
                    variant="default"
                  >
                    <Globe className="h-3 w-3" />
                    Super Administrador
                  </Badge>
                ) : adminUser.role === "vendedor" ? (
                  <Badge
                    className="flex items-center gap-1 w-fit"
                    variant="secondary"
                  >
                    Vendedor
                  </Badge>
                ) : adminUser.role === "employee" ? (
                  <Badge
                    className="flex items-center gap-1 w-fit"
                    variant="secondary"
                  >
                    Empleado
                  </Badge>
                ) : (
                  <Badge
                    className="flex items-center gap-1 w-fit"
                    variant="default"
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
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-epoch-primary/70 shrink-0" />
              <div className="min-w-0">
                <label className="text-[10px] sm:text-xs text-epoch-primary/70">
                  Email
                </label>
                <div className="font-medium text-sm sm:text-base text-epoch-primary truncate">
                  {adminUser.email}
                </div>
              </div>
            </div>
            {adminUser.profiles?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-epoch-primary/70 shrink-0" />
                <div className="min-w-0">
                  <label className="text-[10px] sm:text-xs text-epoch-primary/70">
                    Teléfono
                  </label>
                  <div className="font-medium text-sm sm:text-base text-epoch-primary">
                    {adminUser.profiles.phone}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-epoch-primary/70 shrink-0" />
              <div className="min-w-0">
                <label className="text-[10px] sm:text-xs text-epoch-primary/70">
                  Fecha de Registro
                </label>
                <div className="font-medium text-sm sm:text-base text-epoch-primary">
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
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-epoch-primary/70 shrink-0" />
                <div className="min-w-0">
                  <label className="text-[10px] sm:text-xs text-epoch-primary/70">
                    Último Acceso
                  </label>
                  <div className="font-medium text-sm sm:text-base text-epoch-primary">
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
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-epoch-primary/70 shrink-0" />
            <div className="min-w-0">
              <label className="text-[10px] sm:text-xs text-epoch-primary/70">
                Actividad (últimos 30 días)
              </label>
              <div className="font-medium text-sm sm:text-base text-epoch-primary">
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
          canEdit={isSuperAdmin || adminUser.role === "admin"}
          isSuperAdmin={
            adminUser.is_super_admin || adminUser.role === "super_admin"
          }
        />
      )}

      {/* Permissions Card */}
      <Card className="rounded-xl border border-border">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="flex items-center gap-2 font-display text-epoch-primary text-base sm:text-lg">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            Permisos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Object.entries(adminUser.permissions || {}).map(
              ([resource, actions]) => (
                <div
                  className="p-3 rounded-xl border border-epoch-primary/10 bg-epoch-background/50"
                  key={resource}
                >
                  <div className="font-medium text-sm capitalize mb-2 text-epoch-primary">
                    {resource.replace("_", " ")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {actions.map((action) => (
                      <Badge
                        className="text-[10px] sm:text-xs border-epoch-primary/20"
                        key={action}
                        variant="outline"
                      >
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
