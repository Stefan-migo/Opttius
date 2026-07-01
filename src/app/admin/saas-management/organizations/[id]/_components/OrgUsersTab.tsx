"use client";

import { AlertTriangle, Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { extractDataFromResponse } from "@/lib/api/response-helpers";

interface OrgUsersTabProps {
  orgId: string;
  onOrgUpdate?: () => void;
}

export default function OrgUsersTab({ orgId, onOrgUpdate }: OrgUsersTabProps) {
  const [users, setUsers] = useState<Array<unknown>>([]);
  const [branches, setBranches] = useState<Array<unknown>>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<unknown>(null);
  const [userFormData, setUserFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "admin",
    branch_id: "",
  });
  const [deleteUserConfirmId, setDeleteUserConfirmId] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetchUsers();
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const fetchBranches = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/branches`,
      );
      if (!response.ok) return;
      const data = await response.json();
      setBranches(data.branches || []);
    } catch {
      // swallow — branch selector is optional
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/users`,
      );
      if (!response.ok) throw new Error("Error al cargar usuarios");
      const data = await response.json();
      setUsers(extractDataFromResponse(data));
    } catch {
      toast.error("Error al cargar usuarios");
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/users`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userFormData),
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al crear usuario");

      toast.success("Usuario creado exitosamente");
      setShowUserDialog(false);
      setUserFormData({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        role: "admin",
        branch_id: "",
      });
      fetchUsers();
      onOrgUpdate?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const response = await fetch(
        `/api/admin/saas-management/users/${editingUser.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: userFormData.role,
            is_active: editingUser.is_active,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al actualizar usuario");

      toast.success("Usuario actualizado exitosamente");
      setShowUserDialog(false);
      setEditingUser(null);
      setUserFormData({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        role: "admin",
        branch_id: "",
      });
      fetchUsers();
      onOrgUpdate?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleDeleteUserClick = (userId: string) => {
    setDeleteUserConfirmId(userId);
  };

  const handleDeleteUserConfirm = async () => {
    if (!deleteUserConfirmId) return;

    try {
      const response = await fetch(
        `/api/admin/saas-management/users/${deleteUserConfirmId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al eliminar usuario");

      toast.success("Usuario eliminado exitosamente");
      setDeleteUserConfirmId(null);
      fetchUsers();
      onOrgUpdate?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  return (
    <>
      <Card className="admin-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Usuarios</CardTitle>
          <Button
            onClick={() => {
              setEditingUser(null);
              setUserFormData({
                email: "",
                password: "",
                first_name: "",
                last_name: "",
                role: "admin",
                branch_id: "",
              });
              setShowUserDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay usuarios registrados
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.profiles?.first_name}{" "}
                        {user.profiles?.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge variant="default">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingUser(user);
                              setUserFormData({
                                email: user.email,
                                password: "",
                                first_name: user.profiles?.first_name || "",
                                last_name: user.profiles?.last_name || "",
                                role: user.role,
                                branch_id: "",
                              });
                              setShowUserDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUserClick(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User create/edit dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Modifica los datos del usuario"
                : "Completa los datos para crear un nuevo usuario"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  placeholder="Nombre"
                  value={userFormData.first_name}
                  onChange={(e) =>
                    setUserFormData({
                      ...userFormData,
                      first_name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Apellido</label>
                <Input
                  placeholder="Apellido"
                  value={userFormData.last_name}
                  onChange={(e) =>
                    setUserFormData({
                      ...userFormData,
                      last_name: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                disabled={!!editingUser}
                placeholder="email@ejemplo.com"
                type="email"
                value={userFormData.email}
                onChange={(e) =>
                  setUserFormData({ ...userFormData, email: e.target.value })
                }
              />
            </div>
            {!editingUser && (
              <div>
                <label className="text-sm font-medium">Contraseña *</label>
                <Input
                  placeholder="Mínimo 8 caracteres"
                  type="password"
                  value={userFormData.password}
                  onChange={(e) =>
                    setUserFormData({
                      ...userFormData,
                      password: e.target.value,
                    })
                  }
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Rol</label>
              <Select
                value={userFormData.role}
                onValueChange={(value) =>
                  setUserFormData({ ...userFormData, role: value })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Empleado</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!editingUser && (
              <div>
                <label className="text-sm font-medium">
                  Sucursal (Opcional)
                </label>
                <Select
                  value={userFormData.branch_id || "__none__"}
                  onValueChange={(value) =>
                    setUserFormData({
                      ...userFormData,
                      branch_id: value === "__none__" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Sin sucursal específica
                    </SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
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
              onClick={() => {
                setShowUserDialog(false);
                setEditingUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={editingUser ? handleUpdateUser : handleCreateUser}>
              {editingUser ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={deleteUserConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteUserConfirmId(null)}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Eliminar usuario
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar este usuario? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteUserConfirmId(null)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUserConfirm}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
