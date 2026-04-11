"use client";

import {
  ArrowLeft,
  Building2,
  Crown,
  Globe,
  Save,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import BranchAccessManager from "@/components/admin/BranchAccessManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch } from "@/hooks/useBranch";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  permissions: Record<string, string[]>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function EditAdminUserPage() {
  const params = useParams();
  const router = useRouter();
  const adminId = params.id as string;
  const { isSuperAdmin } = useBranch();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    role: "admin",
    is_active: true,
    permissions: {} as Record<string, string[]>,
  });

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
      setFormData({
        role: data.adminUser.role || "admin",
        is_active: data.adminUser.is_active,
        permissions: data.adminUser.permissions || {},
      });
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

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/admin-users/${adminId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: formData.role,
          is_active: formData.is_active,
          permissions: formData.permissions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Error al actualizar el administrador",
        );
      }

      toast.success("Administrador actualizado exitosamente");
      router.push(`/admin/admin-users/${adminId}`);
    } catch (err) {
      console.error("Error updating admin user:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Error al actualizar el administrador",
      );
    } finally {
      setSaving(false);
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
              <Link href="/admin/admin-users">
                <Button
                  className="rounded-xl border-epoch-primary/20 min-h-[44px] px-6"
                  variant="outline"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a Administradores
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-epoch-background min-h-screen space-y-4 sm:space-y-6">
      {/* Header - reorganizado en filas */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center gap-3">
          <Link href={`/admin/admin-users/${adminId}`}>
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
          Editar Usuario
        </h1>
        <p className="text-sm sm:text-base text-epoch-primary/80 max-w-2xl">
          Modificar información del administrador
        </p>
      </div>

      {/* Form Card */}
      <Card className="rounded-xl border border-border">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="flex items-center gap-2 font-display text-epoch-primary text-base sm:text-lg">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">{adminUser.email}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4 space-y-4 sm:space-y-6">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label
              className="text-xs sm:text-sm text-epoch-primary/80"
              htmlFor="email"
            >
              Email
            </Label>
            <Input
              disabled
              className="rounded-xl bg-epoch-background/50 border-epoch-primary/10 min-h-[44px]"
              id="email"
              type="email"
              value={adminUser.email}
            />
            <p className="text-xs sm:text-sm text-epoch-primary/70 mt-1">
              El email no puede ser modificado
            </p>
          </div>

          {/* Role (editable) */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-epoch-primary/80">
              Rol
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value })
              }
            >
              <SelectTrigger className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin && (
                  <SelectItem value="super_admin">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Super Administrador
                    </span>
                  </SelectItem>
                )}
                <SelectItem value="admin">
                  <span className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Administrador
                  </span>
                </SelectItem>
                <SelectItem value="employee">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Empleado
                  </span>
                </SelectItem>
                <SelectItem value="vendedor">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Vendedor
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs sm:text-sm text-epoch-primary/70 mt-1">
              El rol define el nivel de acceso del usuario en la organización
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-epoch-primary/80">
              Estado
            </Label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <input
                  checked={formData.is_active}
                  className="h-4 w-4 rounded border-epoch-primary/30"
                  type="checkbox"
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
                <span className="text-sm text-epoch-primary">
                  {formData.is_active ? "Activo" : "Inactivo"}
                </span>
              </label>
              {formData.is_active ? (
                <Badge className="bg-epoch-primary text-white">Activo</Badge>
              ) : (
                <Badge variant="destructive">Inactivo</Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-epoch-primary/70 mt-1">
              Los administradores inactivos no pueden acceder al panel
            </p>
          </div>

          {/* Permissions Info */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-epoch-primary/80">
              Permisos
            </Label>
            <div className="p-4 rounded-xl border border-epoch-primary/10 bg-epoch-background/50">
              <p className="text-xs sm:text-sm text-epoch-primary/70">
                Los permisos granulares se pueden editar desde el menú de
                acciones del usuario en el listado de administradores (Editar
                Permisos).
              </p>
            </div>
          </div>

          {/* Actions - optimizado para móvil */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-epoch-primary/10">
            <Link
              className="w-full sm:w-auto"
              href={`/admin/admin-users/${adminId}`}
            >
              <Button
                className="w-full rounded-xl border-epoch-primary/20 min-h-[44px]"
                type="button"
                variant="outline"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </Link>
            <Button
              className="w-full sm:w-auto rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase min-h-[44px]"
              disabled={saving}
              onClick={handleSave}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Branch Access Manager - Admin y Super Admin pueden asignar/editar sucursal */}
      <BranchAccessManager
        adminUserId={adminId}
        canEdit={true}
        isSuperAdmin={adminUser?.role === "super_admin"}
      />
    </div>
  );
}
