"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  extractDataFromResponse,
  extractPaginationFromResponse,
} from "@/lib/api/response-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Search,
  Eye,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Building2,
  Shield,
  User,
  Crown,
  Loader2,
  MapPin,
  ArrowLeft,
  UserPlus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

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

export default function UsersManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialogs
  const [showChangeOrgDialog, setShowChangeOrgDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newOrganizationId, setNewOrganizationId] = useState("");
  const [createUserForm, setCreateUserForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "admin",
    organization_id: "",
    branch_id: "",
  });
  const [branchesForOrg, setBranchesForOrg] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [creatingUser, setCreatingUser] = useState(false);

  // Delete user
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleChangeOrganization = () => {
    if (!selectedUser || !newOrganizationId) {
      toast.error("Selecciona una organización");
      return;
    }

    handleAction(selectedUser.id, "change_organization", newOrganizationId);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      const response = await fetch(
        `/api/admin/saas-management/users/${userToDelete.id}`,
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
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al eliminar usuario",
      );
    } finally {
      setDeleting(false);
    }
  };

  const loadBranchesForOrg = async (orgId: string) => {
    if (!orgId) {
      setBranchesForOrg([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/saas-management/organizations/${orgId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setBranchesForOrg(data.organization?.branches || []);
      } else {
        setBranchesForOrg([]);
      }
    } catch {
      setBranchesForOrg([]);
    }
  };

  const handleCreateUser = async () => {
    if (!createUserForm.email || !createUserForm.password) {
      toast.error("Email y contraseña son requeridos");
      return;
    }
    if (createUserForm.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setCreatingUser(true);
    try {
      const res = await fetch("/api/admin/saas-management/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createUserForm.email,
          password: createUserForm.password,
          first_name: createUserForm.first_name || undefined,
          last_name: createUserForm.last_name || undefined,
          role: createUserForm.role,
          organization_id: createUserForm.organization_id || undefined,
          branch_id: createUserForm.branch_id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear usuario");
      }
      toast.success("Usuario creado correctamente");
      setShowCreateUserDialog(false);
      setCreateUserForm({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        role: "admin",
        organization_id: "",
        branch_id: "",
      });
      setBranchesForOrg([]);
      fetchUsers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al crear usuario",
      );
    } finally {
      setCreatingUser(false);
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/saas-management/dashboard")}
          title="Volver al dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
            Gestión de Usuarios
          </h1>
          <p className="text-admin-text-tertiary mt-2">
            Administra todos los usuarios del sistema
          </p>
        </div>
        <Button onClick={() => setShowCreateUserDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo usuario
        </Button>
      </div>

      {/* Filtros */}
      <Card className="admin-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por email o nombre..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={organizationFilter}
              onValueChange={setOrganizationFilter}
            >
              <SelectTrigger className="rounded-none w-[200px]">
                <SelectValue placeholder="Filtrar por organización" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las organizaciones</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="rounded-none w-[180px]">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="root">Root</SelectItem>
                <SelectItem value="dev">Dev</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
                <SelectItem value="employee">Empleado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-none w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Usuarios ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No se encontraron usuarios
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Organización</TableHead>
                      <TableHead>Sucursales</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último acceso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.fullName || user.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.organization ? (
                            <div>
                              <div className="font-medium">
                                {user.organization.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.organization.slug}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">
                              Sin organización
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.branches && user.branches.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>{user.branches.length}</span>
                            </div>
                          ) : user.is_super_admin ? (
                            <Badge variant="outline">Todas</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge variant="default">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {user.last_login
                            ? formatDate(user.last_login)
                            : "Nunca"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/admin/saas-management/users/${user.id}`,
                                  )
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.is_active ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleAction(user.id, "deactivate")
                                  }
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Desactivar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleAction(user.id, "activate")
                                  }
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Activar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewOrganizationId(
                                    user.organization_id || "",
                                  );
                                  setShowChangeOrgDialog(true);
                                }}
                              >
                                <Building2 className="h-4 w-4 mr-2" />
                                Cambiar organización
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAction(user.id, "reset_password")
                                }
                              >
                                Resetear contraseña
                              </DropdownMenuItem>
                              {user.role !== "root" && user.role !== "dev" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setUserToDelete(user);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear usuario */}
      <Dialog
        open={showCreateUserDialog}
        onOpenChange={(open) => {
          setShowCreateUserDialog(open);
          if (!open) {
            setCreateUserForm({
              email: "",
              password: "",
              first_name: "",
              last_name: "",
              role: "admin",
              organization_id: "",
              branch_id: "",
            });
            setBranchesForOrg([]);
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear usuario</DialogTitle>
            <DialogDescription>
              Crea un nuevo usuario y asígnale organización y rol (solo
              root/dev).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={createUserForm.email}
                onChange={(e) =>
                  setCreateUserForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div>
              <Label>Contraseña * (mín. 8 caracteres)</Label>
              <Input
                type="password"
                value={createUserForm.password}
                onChange={(e) =>
                  setCreateUserForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="••••••••"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={createUserForm.first_name}
                  onChange={(e) =>
                    setCreateUserForm((f) => ({
                      ...f,
                      first_name: e.target.value,
                    }))
                  }
                  placeholder="Nombre"
                />
              </div>
              <div>
                <Label>Apellido</Label>
                <Input
                  value={createUserForm.last_name}
                  onChange={(e) =>
                    setCreateUserForm((f) => ({
                      ...f,
                      last_name: e.target.value,
                    }))
                  }
                  placeholder="Apellido"
                />
              </div>
            </div>
            <div>
              <Label>Rol</Label>
              <Select
                value={createUserForm.role}
                onValueChange={(v) =>
                  setCreateUserForm((f) => ({ ...f, role: v }))
                }
              >
                <SelectTrigger className="rounded-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root</SelectItem>
                  <SelectItem value="dev">Dev</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="employee">Empleado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Organización</Label>
              <Select
                value={
                  createUserForm.organization_id
                    ? createUserForm.organization_id
                    : "__none__"
                }
                onValueChange={(v) => {
                  const orgId = v === "__none__" ? "" : v;
                  setCreateUserForm((f) => ({
                    ...f,
                    organization_id: orgId,
                    branch_id: "",
                  }));
                  loadBranchesForOrg(orgId);
                }}
              >
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="Sin organización" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin organización</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(createUserForm.role === "admin" ||
              createUserForm.role === "vendedor" ||
              createUserForm.role === "employee") &&
              branchesForOrg.length > 0 && (
                <div>
                  <Label>Sucursal (opcional)</Label>
                  <Select
                    value={createUserForm.branch_id}
                    onValueChange={(v) =>
                      setCreateUserForm((f) => ({ ...f, branch_id: v }))
                    }
                  >
                    <SelectTrigger className="rounded-none">
                      <SelectValue placeholder="Seleccionar sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchesForOrg.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateUserDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={creatingUser}>
              {creatingUser ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear usuario"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para cambiar organización */}
      <Dialog open={showChangeOrgDialog} onOpenChange={setShowChangeOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Organización</DialogTitle>
            <DialogDescription>
              Asigna una nueva organización al usuario {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Organización</label>
              <Select
                value={newOrganizationId ? newOrganizationId : "__none__"}
                onValueChange={(v) =>
                  setNewOrganizationId(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger className="rounded-none">
                  <SelectValue placeholder="Seleccionar organización" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin organización</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangeOrgDialog(false);
                setSelectedUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const orgId =
                  newOrganizationId === "__none__" ? "" : newOrganizationId;
                if (!orgId) {
                  toast.error("Selecciona una organización");
                  return;
                }
                handleAction(selectedUser!.id, "change_organization", orgId);
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <span className="text-red-600">
                    &quot;{userToDelete?.fullName || userToDelete?.email}&quot;
                  </span>{" "}
                  ({userToDelete?.email})?
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
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
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
