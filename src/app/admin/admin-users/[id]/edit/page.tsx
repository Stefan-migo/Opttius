"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Crown,
  Save,
  X,
  Globe,
  User,
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
              <Link href="/admin/admin-users">
                <Button variant="outline">
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
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-epoch-primary">
            Editar Usuario
          </h1>
          <p className="text-muted-foreground">
            Modificar información del administrador
          </p>
        </div>
        <Link href={`/admin/admin-users/${adminId}`}>
          <Button variant="default" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
      </div>

      {/* Form Card */}
      <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            {adminUser.email}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email (read-only) */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={adminUser.email}
              disabled
              className="bg-admin-bg-tertiary"
            />
            <p className="text-sm text-muted-foreground mt-1">
              El email no puede ser modificado
            </p>
          </div>

          {/* Role (editable) */}
          <div>
            <Label>Rol</Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value })
              }
            >
              <SelectTrigger>
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
            <p className="text-sm text-muted-foreground mt-1">
              El rol define el nivel de acceso del usuario en la organización
            </p>
          </div>

          {/* Status */}
          <div>
            <Label>Estado</Label>
            <div className="mt-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">
                  {formData.is_active ? "Activo" : "Inactivo"}
                </span>
              </label>
              {formData.is_active ? (
                <Badge className="bg-admin-success text-admin-text-on-dark">
                  Activo
                </Badge>
              ) : (
                <Badge variant="destructive">Inactivo</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Los administradores inactivos no pueden acceder al panel
            </p>
          </div>

          {/* Permissions Info */}
          <div>
            <Label>Permisos</Label>
            <div className="mt-2 p-4 bg-admin-bg-tertiary rounded-md">
              <p className="text-sm text-muted-foreground">
                Los permisos granulares se pueden editar desde el menú de
                acciones del usuario en el listado de administradores (Editar
                Permisos).
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Link href={`/admin/admin-users/${adminId}`}>
              <Button variant="outline">
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Branch Access Manager - Admin y Super Admin pueden asignar/editar sucursal */}
      <BranchAccessManager
        adminUserId={adminId}
        isSuperAdmin={adminUser?.role === "super_admin"}
        canEdit={true}
      />
    </div>
  );
}
