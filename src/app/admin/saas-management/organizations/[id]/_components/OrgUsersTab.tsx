"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { extractDataFromResponse } from "@/lib/api/response-helpers";

import { OrgUserDeleteDialog,OrgUserDialog } from "./OrgUserDialog";

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

      <OrgUserDialog
        branches={branches as Array<{ id: string; name: string; code: string }>}
        editingUser={editingUser}
        open={showUserDialog}
        userFormData={userFormData}
        onFormChange={(data) => setUserFormData((f) => ({ ...f, ...data }))}
        onOpenChange={(open) => {
          setShowUserDialog(open);
          if (!open) setEditingUser(null);
        }}
        onSave={editingUser ? handleUpdateUser : handleCreateUser}
      />

      <OrgUserDeleteDialog
        open={deleteUserConfirmId !== null}
        onConfirm={handleDeleteUserConfirm}
        onOpenChange={(open) => !open && setDeleteUserConfirmId(null)}
      />
    </>
  );
}
