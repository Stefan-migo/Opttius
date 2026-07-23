"use client";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { UserDeleteDialog } from "./UserDeleteDialog";
import {
  UserActivityCard,
  UserBranchesCard,
  UserOrgCard,
  UserPersonalCard,
  UserSystemInfoCard,
} from "./UserDetailCards";

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

      <UserPersonalCard user={user} />
      <UserOrgCard user={user} />
      <UserBranchesCard user={user} />
      <UserActivityCard user={user} />
      <UserSystemInfoCard user={user} />

      <UserDeleteDialog
        deleting={deleting}
        email={user.email}
        fullName={fullName}
        open={deleteDialogOpen}
        onDelete={handleDeleteUser}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
