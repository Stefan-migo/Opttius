"use client";

import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Crown,
  Edit,
  Eye,
  Globe,
  MoreVertical,
  Phone,
  Search,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import PermissionsEditor from "@/components/admin/PermissionsEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
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
import { useBranch } from "@/hooks/useBranch";
import { formatDate, formatTimeAgo } from "@/lib/utils";

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
          className="flex items-center gap-1 bg-epoch-accent text-epoch-primary"
          variant="default"
        >
          <Globe className="h-3 w-3" />
          Super Administrador
        </Badge>
      );
    }
    if (admin.role === "vendedor") {
      return (
        <Badge className="flex items-center gap-1" variant="secondary">
          <User className="h-3 w-3" />
          Vendedor
        </Badge>
      );
    }
    if (admin.role === "employee") {
      return (
        <Badge className="flex items-center gap-1" variant="secondary">
          <User className="h-3 w-3" />
          Empleado
        </Badge>
      );
    }
    return (
      <Badge className="flex items-center gap-1" variant="default">
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
            <Card
              className="rounded-xl border border-border animate-pulse"
              key={i}
            >
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
      {/* Header - reorganizado en filas */}
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

      {/* Stats - optimizado para móvil */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-xl border border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                  Total
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-primary truncate">
                  {adminUsers.length}
                </p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-primary shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                  Super Admin
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-accent truncate">
                  {adminUsers.filter((admin) => admin.is_super_admin).length}
                </p>
              </div>
              <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-accent shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                  Activos
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-primary truncate">
                  {adminUsers.filter((admin) => admin.is_active).length}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-accent shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-epoch-primary/80 uppercase tracking-wider">
                  Activos (30d)
                </p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-primary truncate">
                  {
                    adminUsers.filter(
                      (admin) =>
                        admin.analytics?.activityCount30Days &&
                        admin.analytics.activityCount30Days > 0,
                    ).length
                  }
                </p>
              </div>
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-epoch-accent shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-epoch-primary/70 h-4 w-4 z-10" />
                <Input
                  className="pl-10 rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]"
                  placeholder="Buscar por email o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 min-h-[44px]">
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
      <Card className="rounded-xl border border-border">
        <CardHeader className="p-4 sm:p-6 pb-0">
          <CardTitle className="flex items-center gap-2 font-display text-epoch-primary text-base sm:text-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            Usuarios Administradores ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-4">
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
                    className="hover:bg-[#AE000025] transition-colors"
                    key={admin.id}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium text-epoch-primary text-sm">
                          {admin.analytics?.fullName || "Sin nombre"}
                        </div>
                        <div className="text-xs sm:text-sm text-epoch-primary/70">
                          {admin.email}
                        </div>
                        {admin.profiles?.phone && (
                          <div className="flex items-center text-[10px] sm:text-xs text-epoch-primary/70 mt-1">
                            <Phone className="h-3 w-3 mr-1 shrink-0" />
                            {admin.profiles.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>{getRoleBadge(admin)}</TableCell>

                    <TableCell>
                      {admin.is_super_admin ? (
                        <Badge
                          className="flex items-center gap-1 w-fit"
                          variant="outline"
                        >
                          <Globe className="h-3 w-3" />
                          Todas las sucursales
                        </Badge>
                      ) : admin.branches && admin.branches.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {admin.branches.slice(0, 2).map((branch) => (
                            <Badge
                              className="flex items-center gap-1 w-fit text-xs"
                              key={branch.id}
                              variant="outline"
                            >
                              <Building2 className="h-3 w-3" />
                              {branch.name}
                              {branch.is_primary && (
                                <span className="text-epoch-accent">★</span>
                              )}
                            </Badge>
                          ))}
                          {admin.branches.length > 2 && (
                            <span className="text-[10px] sm:text-xs text-epoch-primary/70">
                              +{admin.branches.length - 2} más
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs sm:text-sm text-epoch-primary/70">
                          Sin sucursales
                        </span>
                      )}
                    </TableCell>

                    <TableCell>{getStatusBadge(admin.is_active)}</TableCell>

                    <TableCell>
                      <div className="flex items-center text-xs sm:text-sm text-epoch-primary/70">
                        <Clock className="h-3 w-3 mr-1 shrink-0" />
                        {formatLastActivity(admin.last_login)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium text-epoch-primary text-sm">
                          {admin.analytics?.activityCount30Days || 0}
                        </div>
                        <div className="text-[10px] sm:text-xs text-epoch-primary/70">
                          acciones
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs sm:text-sm text-epoch-primary/70">
                      {formatDate(admin.created_at, { locale: "es-AR" })}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            className="h-8 w-8 p-0 min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8"
                            size="sm"
                            variant="ghost"
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
                              className="flex items-center cursor-pointer"
                              href={`/admin/admin-users/${admin.id}`}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              className="flex items-center cursor-pointer"
                              href={`/admin/admin-users/${admin.id}/edit`}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center cursor-pointer"
                            onClick={() => {
                              setSelectedUserForPermissions(admin);
                              setShowPermissionsEditor(true);
                            }}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Editar Permisos
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {isSuperAdmin && (
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() =>
                                handleToggleStatus(admin.id, admin.is_active)
                              }
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
                            className="flex items-center cursor-pointer text-red-500 focus:text-red-500"
                            onClick={() =>
                              handleDeleteAdmin(admin.id, admin.email)
                            }
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
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={[10, 20, 50, 100]}
                totalItems={totalCount}
                totalPages={Math.ceil(totalCount / itemsPerPage)}
                onItemsPerPageChange={setItemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}

          {adminUsers.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-epoch-primary/40 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-epoch-primary mb-2">
                No se encontraron administradores
              </h3>
              <p className="text-sm text-epoch-primary/80">
                Ajusta los filtros o crea un nuevo administrador.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
