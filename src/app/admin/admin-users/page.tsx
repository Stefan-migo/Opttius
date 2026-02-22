"use client";

import { useState, useEffect, useCallback } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  Settings,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Activity,
  Clock,
  Mail,
  Phone,
  MoreVertical,
  Building2,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import PermissionsEditor from "@/components/admin/PermissionsEditor";
import { Pagination } from "@/components/ui/pagination";
import { useBranch } from "@/hooks/useBranch";
import { formatTimeAgo, formatDate } from "@/lib/utils";

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

export default function AdminUsersPage() {
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
      console.error("Error fetching admin users:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    roleFilter,
    statusFilter,
    debouncedSearchTerm,
  ]);

  useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  const handleToggleStatus = async (
    adminId: string,
    currentStatus: boolean,
  ) => {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update admin user");
      }

      toast.success(
        `Usuario ${!currentStatus ? "activado" : "desactivado"} exitosamente`,
      );
      fetchAdminUsers();
    } catch (error) {
      console.error("Error updating admin user:", error);
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
      console.error("Error deleting admin user:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar usuario",
      );
    }
  };

  const getRoleBadge = (admin: AdminUser) => {
    if (admin.is_super_admin || admin.role === "super_admin") {
      return (
        <Badge
          variant="default"
          className="flex items-center gap-1 bg-epoch-accent text-epoch-primary"
        >
          <Globe className="h-3 w-3" />
          Super Administrador
        </Badge>
      );
    }
    if (admin.role === "vendedor") {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <User className="h-3 w-3" />
          Vendedor
        </Badge>
      );
    }
    if (admin.role === "employee") {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <User className="h-3 w-3" />
          Empleado
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <Crown className="h-3 w-3" />
        Administrador
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? "default" : "outline"}>
        {isActive ? "Activo" : "Inactivo"}
      </Badge>
    );
  };

  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return "Nunca";
    return formatTimeAgo(dateString, "es-AR");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-epoch-primary">
              Gestión de Administradores
            </h1>
            <p className="text-admin-text-tertiary">
              Cargando usuarios administradores...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-epoch-primary">
              Gestión de Administradores
            </h1>
            <p className="text-admin-text-tertiary">
              Error al cargar los datos
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-16">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Error al cargar administradores
            </h3>
            <p className="text-admin-text-tertiary mb-4">{error}</p>
            <Button onClick={fetchAdminUsers}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-epoch-primary">
            Gestión de Administradores
          </h1>
          <p className="text-admin-text-tertiary">
            Administra usuarios con acceso al panel de administración
          </p>
        </div>

        <Link href="/admin/admin-users/register">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Registrar Nuevo Usuario
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-epoch-primary" />
              <div className="ml-4">
                <p className="text-sm text-admin-text-tertiary">
                  Total Administradores
                </p>
                <p className="text-2xl font-bold text-epoch-primary">
                  {adminUsers.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-epoch-accent" />
              <div className="ml-4">
                <p className="text-sm text-admin-text-tertiary">
                  Super Administradores
                </p>
                <p className="text-2xl font-bold text-epoch-accent">
                  {adminUsers.filter((admin) => admin.is_super_admin).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-admin-success" />
              <div className="ml-4">
                <p className="text-sm text-admin-text-tertiary">Activos</p>
                <p className="text-2xl font-bold text-admin-success">
                  {adminUsers.filter((admin) => admin.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm text-admin-text-tertiary">
                  Activos Recientes
                </p>
                <p className="text-2xl font-bold text-red-500">
                  {
                    adminUsers.filter(
                      (admin) =>
                        admin.analytics?.activityCount30Days &&
                        admin.analytics.activityCount30Days > 0,
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-text-tertiary h-4 w-4 z-10" />
                <Input
                  placeholder="Buscar por email o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Admin Users Table */}
      <Card className="admin-card bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Usuarios Administradores ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última Actividad</TableHead>
                  <TableHead>Actividad (30d)</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.map((admin) => (
                  <TableRow
                    key={admin.id}
                    className="hover:bg-[#AE000025] transition-colors"
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {admin.analytics?.fullName || "Sin nombre"}
                        </div>
                        <div className="text-sm text-admin-text-tertiary">
                          {admin.email}
                        </div>
                        {admin.profiles?.phone && (
                          <div className="flex items-center text-xs text-admin-text-tertiary mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {admin.profiles.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>{getRoleBadge(admin)}</TableCell>

                    <TableCell>
                      {admin.is_super_admin ? (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 w-fit"
                        >
                          <Globe className="h-3 w-3" />
                          Todas las sucursales
                        </Badge>
                      ) : admin.branches && admin.branches.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {admin.branches.slice(0, 2).map((branch) => (
                            <Badge
                              key={branch.id}
                              variant="outline"
                              className="flex items-center gap-1 w-fit text-xs"
                            >
                              <Building2 className="h-3 w-3" />
                              {branch.name}
                              {branch.is_primary && (
                                <span className="text-epoch-accent">★</span>
                              )}
                            </Badge>
                          ))}
                          {admin.branches.length > 2 && (
                            <span className="text-xs text-admin-text-tertiary">
                              +{admin.branches.length - 2} más
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-admin-text-tertiary">
                          Sin sucursales
                        </span>
                      )}
                    </TableCell>

                    <TableCell>{getStatusBadge(admin.is_active)}</TableCell>

                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Clock className="h-3 w-3 mr-1 text-admin-text-tertiary" />
                        {formatLastActivity(admin.last_login)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium">
                          {admin.analytics?.activityCount30Days || 0}
                        </div>
                        <div className="text-xs text-admin-text-tertiary">
                          acciones
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-admin-text-tertiary">
                      {formatDate(admin.created_at, { locale: "es-AR" })}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">Abrir menú</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/admin-users/${admin.id}`}
                              className="flex items-center cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/admin-users/${admin.id}/edit`}
                              className="flex items-center cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUserForPermissions(admin);
                              setShowPermissionsEditor(true);
                            }}
                            className="flex items-center cursor-pointer"
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Editar Permisos
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {isSuperAdmin && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleStatus(admin.id, admin.is_active)
                              }
                              className="flex items-center cursor-pointer"
                            >
                              {admin.is_active ? (
                                <>
                                  <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleDeleteAdmin(admin.id, admin.email)
                            }
                            className="flex items-center cursor-pointer text-red-500 focus:text-red-500"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && adminUsers.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalCount / itemsPerPage)}
                itemsPerPage={itemsPerPage}
                totalItems={totalCount}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemsPerPageOptions={[10, 20, 50, 100]}
              />
            </div>
          )}

          {adminUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-epoch-primary mb-2">
                No se encontraron administradores
              </h3>
              <p className="text-admin-text-tertiary">
                Ajusta los filtros o crea un nuevo administrador.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Editor Dialog */}
      {showPermissionsEditor && selectedUserForPermissions && (
        <PermissionsEditor
          userId={selectedUserForPermissions.id}
          currentPermissions={selectedUserForPermissions.permissions || {}}
          open={showPermissionsEditor}
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
