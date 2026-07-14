"use client";

import { ArrowLeft, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  extractDataFromResponse,
  extractPaginationFromResponse,
} from "@/lib/api/response-helpers";

import { ChangeOrgDialog } from "./ChangeOrgDialog";
import { CreateUserDialog } from "./CreateUserDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { UsersFilters } from "./UsersFilters";
import { UsersTable } from "./UsersTable";

interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  organization_id?: string;
  created_at: string;
  last_login?: string;
  is_super_admin?: boolean;
  branches?: Array<{ id: string; name: string; code: string }>;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  fullName?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function UsersManagementContent() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialogs
  const [showChangeOrgDialog, setShowChangeOrgDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    fetchOrganizations();
    fetchUsers();
  }, [currentPage, organizationFilter, roleFilter, statusFilter, searchTerm]);

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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (organizationFilter !== "all") {
        params.append("organization_id", organizationFilter);
      }
      if (roleFilter !== "all") {
        params.append("role", roleFilter);
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(
        `/api/admin/saas-management/users?${params}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data = await response.json();
      const pagination = extractPaginationFromResponse(data);
      setUsers(extractDataFromResponse(data));
      setTotalPages(pagination.totalPages || 1);
      setTotalCount(pagination.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    userId: string,
    action:
      | "activate"
      | "deactivate"
      | "change_organization"
      | "reset_password",
    value?: string,
  ) => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/users/${userId}/actions`,
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
      fetchUsers();
      setShowChangeOrgDialog(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleOrgChanged = async (userId: string, orgId: string) => {
    await handleAction(userId, "change_organization", orgId);
  };

  const handleUserDeleted = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
    fetchUsers();
  };

  const handleUserCreated = () => {
    setShowCreateUserDialog(false);
    fetchUsers();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          size="icon"
          title="Volver al dashboard"
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={() => router.push("/admin/saas-management/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Gestión de Usuarios
          </h1>
          <p className="text-white/50 mt-2">
            Administra todos los usuarios del sistema
          </p>
        </div>
        <Button
          className="bg-[#C5A059] hover:bg-[#C5A059]/90"
          onClick={() => setShowCreateUserDialog(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo usuario
        </Button>
      </div>

      <UsersFilters
        searchTerm={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        organizationFilter={organizationFilter}
        onOrganizationFilterChange={setOrganizationFilter}
        organizations={organizations}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <UsersTable
        users={users}
        loading={loading}
        error={error}
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onViewUser={(userId) =>
          router.push(`/admin/saas-management/users/${userId}`)
        }
        onActivate={(userId) => handleAction(userId, "activate")}
        onDeactivate={(userId) => handleAction(userId, "deactivate")}
        onChangeOrgClick={(user) => {
          setSelectedUser(user);
          setShowChangeOrgDialog(true);
        }}
        onResetPassword={(userId) => handleAction(userId, "reset_password")}
        onDeleteClick={(user) => {
          setUserToDelete(user);
          setDeleteDialogOpen(true);
        }}
      />

      <CreateUserDialog
        open={showCreateUserDialog}
        onOpenChange={setShowCreateUserDialog}
        organizations={organizations}
        onUserCreated={handleUserCreated}
      />

      <ChangeOrgDialog
        open={showChangeOrgDialog}
        onOpenChange={(open) => {
          setShowChangeOrgDialog(open);
          if (!open) setSelectedUser(null);
        }}
        organizations={organizations}
        user={selectedUser}
        onChangeOrg={handleOrgChanged}
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setUserToDelete(null);
        }}
        user={userToDelete}
        onUserDeleted={handleUserDeleted}
      />
    </div>
  );
}
