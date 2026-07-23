"use client";

import { AlertTriangle, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import PermissionsEditor from "@/components/admin/PermissionsEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBranch } from "@/hooks/useBranch";
import { appLogger } from '@/lib/logger';

import { AdminUsersFilters } from "./AdminUsersFilters";
import { AdminUsersStats } from "./AdminUsersStats";
import { AdminUsersTable } from "./AdminUsersTable";

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

export default function AdminUsersContent() {
  const { isSuperAdmin } = useBranch();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Debounced search for server-side filtering
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Permissions editor state
  const [showPermissionsEditor, setShowPermissionsEditor] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] =
    useState<AdminUser | null>(null);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearchTerm(searchTerm.trim()),
      400,
    );
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const fetchAdminUsers = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
        ...(roleFilter !== "all" && { role: roleFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
      });

      const response = await fetch(`/api/admin/admin-users?${params}`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "Acceso restringido: Solo administradores pueden ver esta sección",
          );
        }
        throw new Error("Failed to fetch admin users");
      }

      const data = await response.json();
      setAdminUsers(data.adminUsers || []);
      setTotalCount(data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      appLogger.error("Error fetching admin users:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, roleFilter, statusFilter, debouncedSearchTerm]);

  useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  const handleToggleStatus = async (adminId: string, currentStatus: boolean) => {
    if (!isSuperAdmin) {
      toast.error(
        "Solo los super administradores pueden activar o desactivar otros administradores",
      );
      return;
    }

    if (
      !confirm(
        `¿Estás seguro de que quieres ${!currentStatus ? "activar" : "desactivar"} a este administrador?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/admin-users/${adminId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update admin user");
      }

      toast.success(`Usuario ${!currentStatus ? "activado" : "desactivado"} exitosamente`);
      fetchAdminUsers();
    } catch (error) {
      appLogger.error("Error updating admin user:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar usuario",
      );
    }
  };

  const handleDeleteAdmin = async (adminId: string, adminEmail: string) => {
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar al administrador ${adminEmail}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/admin-users/${adminId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete admin user");
      }

      toast.success("Usuario administrador eliminado exitosamente");
      fetchAdminUsers();
    } catch (error) {
      appLogger.error("Error deleting admin user:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar usuario",
      );
    }
  };

  const superAdminCount = adminUsers.filter((admin) => admin.is_super_admin).length;
  const activeCount = adminUsers.filter((admin) => admin.is_active).length;
  const active30dCount = adminUsers.filter(
    (admin) => admin.analytics?.activityCount30Days && admin.analytics.activityCount30Days > 0,
  ).length;

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-epoch-background min-h-screen">
        <div className="flex flex-col gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-epoch-primary">
            Gestión de Administradores
          </h1>
          <p className="text-sm text-epoch-primary/80">
            Cargando usuarios administradores...
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card className="rounded-xl border border-border animate-pulse" key={i}>
              <CardContent className="p-4 sm:p-6">
                <div className="h-3 bg-epoch-primary/10 rounded w-3/4 mb-2" />
                <div className="h-6 bg-epoch-primary/10 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-epoch-background min-h-screen">
        <div className="flex flex-col gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-epoch-primary">
            Gestión de Administradores
          </h1>
          <p className="text-sm text-epoch-primary/80">
            Error al cargar los datos
          </p>
        </div>
        <Card className="rounded-xl border border-border">
          <CardContent className="text-center py-8 sm:py-16">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-red-700 mb-2">
              Error al cargar administradores
            </h3>
            <p className="text-sm text-epoch-primary/80 mb-4">{error}</p>
            <Button
              className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white min-h-[44px]"
              onClick={fetchAdminUsers}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-epoch-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-epoch-primary tracking-tight">
          Gestión de Administradores
        </h1>
        <p className="text-sm sm:text-base text-epoch-primary/80 max-w-2xl">
          Administra usuarios con acceso al panel de administración
        </p>
        <div className="flex justify-start sm:justify-end">
          <Link href="/admin/admin-users/register">
            <Button className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase min-h-[44px] px-6 w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2 shrink-0" />
              Registrar Nuevo Usuario
            </Button>
          </Link>
        </div>
      </div>

      <AdminUsersStats
        active30dCount={active30dCount}
        activeCount={activeCount}
        superAdminCount={superAdminCount}
        total={adminUsers.length}
      />

      <AdminUsersFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
      />

      <AdminUsersTable
        adminUsers={adminUsers}
        currentPage={currentPage}
        isSuperAdmin={isSuperAdmin}
        itemsPerPage={itemsPerPage}
        loading={loading}
        totalCount={totalCount}
        onDelete={handleDeleteAdmin}
        onItemsPerPageChange={setItemsPerPage}
        onPageChange={setCurrentPage}
        onPermissionsEdit={(user) => {
          setSelectedUserForPermissions(user as AdminUser);
          setShowPermissionsEditor(true);
        }}
        onToggleStatus={handleToggleStatus}
      />

      {/* Permissions Editor Dialog */}
      {showPermissionsEditor && selectedUserForPermissions && (
        <PermissionsEditor
          currentPermissions={selectedUserForPermissions.permissions || {}}
          open={showPermissionsEditor}
          userId={selectedUserForPermissions.id}
          onOpenChange={setShowPermissionsEditor}
          onSave={() => {
            fetchAdminUsers();
            setSelectedUserForPermissions(null);
          }}
        />
      )}
    </div>
  );
}
