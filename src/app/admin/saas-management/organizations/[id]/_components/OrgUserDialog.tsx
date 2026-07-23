"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
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

interface OrgUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: unknown;
  userFormData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
    branch_id: string;
  };
  onFormChange: (data: Partial<OrgUserDialogProps["userFormData"]>) => void;
  branches: Array<{ id: string; name: string; code: string }>;
  onSave: () => void;
}

export function OrgUserDialog({
  open,
  onOpenChange,
  editingUser,
  userFormData,
  onFormChange,
  branches,
  onSave,
}: OrgUserDialogProps) {
  const isEditing = !!editingUser;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
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
                onChange={(e) => onFormChange({ first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Apellido</label>
              <Input
                placeholder="Apellido"
                value={userFormData.last_name}
                onChange={(e) => onFormChange({ last_name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Email *</label>
            <Input
              disabled={isEditing}
              placeholder="email@ejemplo.com"
              type="email"
              value={userFormData.email}
              onChange={(e) => onFormChange({ email: e.target.value })}
            />
          </div>
          {!isEditing && (
            <div>
              <label className="text-sm font-medium">Contraseña *</label>
              <Input
                placeholder="Mínimo 8 caracteres"
                type="password"
                value={userFormData.password}
                onChange={(e) => onFormChange({ password: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Rol</label>
            <Select
              value={userFormData.role}
              onValueChange={(value) => onFormChange({ role: value })}
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
          {!isEditing && (
            <div>
              <label className="text-sm font-medium">Sucursal (Opcional)</label>
              <Select
                value={userFormData.branch_id || "__none__"}
                onValueChange={(value) =>
                  onFormChange({ branch_id: value === "__none__" ? "" : value })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    Sin sucursal específica
                  </SelectItem>
                  {(branches || []).map(
                    (branch: { id: string; name: string; code: string }) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave}>
            {isEditing ? "Guardar Cambios" : "Crear Usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrgUserDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
