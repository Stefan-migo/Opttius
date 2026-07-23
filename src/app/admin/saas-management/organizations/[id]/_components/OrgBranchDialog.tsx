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

interface BranchFormData {
  name: string;
  code: string;
  address_line_1: string;
  city: string;
  phone: string;
  email: string;
  is_active: boolean;
}

interface OrgBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBranch: unknown;
  branchFormData: BranchFormData;
  onFormChange: (data: Partial<BranchFormData>) => void;
  onSave: () => void;
}

export function OrgBranchDialog({
  open,
  onOpenChange,
  editingBranch,
  branchFormData,
  onFormChange,
  onSave,
}: OrgBranchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingBranch ? "Editar Sucursal" : "Nueva Sucursal"}
          </DialogTitle>
          <DialogDescription>
            {editingBranch
              ? "Modifica los datos de la sucursal"
              : "Completa los datos para crear una nueva sucursal"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                placeholder="Nombre sucursal"
                value={branchFormData.name}
                onChange={(e) => onFormChange({ name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Código *</label>
              <Input
                placeholder="Ej: SUC-001"
                value={branchFormData.code}
                onChange={(e) => onFormChange({ code: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Dirección</label>
            <Input
              placeholder="Dirección"
              value={branchFormData.address_line_1}
              onChange={(e) => onFormChange({ address_line_1: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Ciudad</label>
              <Input
                placeholder="Ciudad"
                value={branchFormData.city}
                onChange={(e) => onFormChange({ city: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                placeholder="Teléfono"
                value={branchFormData.phone}
                onChange={(e) => onFormChange({ phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              placeholder="email@sucursal.cl"
              type="email"
              value={branchFormData.email}
              onChange={(e) => onFormChange({ email: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave}>
            {editingBranch ? "Guardar Cambios" : "Crear Sucursal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrgBranchDeleteDialog({
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
            Eliminar sucursal
          </DialogTitle>
          <DialogDescription>
            ¿Estás seguro de eliminar esta sucursal? Esta acción no se puede
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
