"use client";

import { AlertCircle, Loader2, Pencil, Save, Trash2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditProps {
  editStatus: string;
  editPeriodEnd: string;
  editTrialEndsAt: string;
  onEditStatusChange: (v: string) => void;
  onEditPeriodEndChange: (v: string) => void;
  onEditTrialEndsAtChange: (v: string) => void;
  onSave: () => void;
  saveLoading: boolean;
}

export function SubscriptionEditForm({
  editStatus,
  editPeriodEnd,
  editTrialEndsAt,
  onEditStatusChange,
  onEditPeriodEndChange,
  onEditTrialEndsAtChange,
  onSave,
  saveLoading,
}: EditProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pencil className="h-5 w-5" />
          Editar suscripción
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={editStatus} onValueChange={onEditStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="past_due">Vencida</SelectItem>
                <SelectItem value="incomplete">Incompleta</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="period_end">Fin del período (YYYY-MM-DD)</Label>
            <Input
              id="period_end"
              type="date"
              value={editPeriodEnd}
              onChange={(e) => onEditPeriodEndChange(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="trial_ends">
              Fin del trial (fecha y hora, opcional)
            </Label>
            <Input
              id="trial_ends"
              type="datetime-local"
              value={editTrialEndsAt}
              onChange={(e) => onEditTrialEndsAtChange(e.target.value)}
            />
          </div>
        </div>
        <Button disabled={saveLoading} onClick={onSave}>
          {saveLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
}

interface DeleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteLoading: boolean;
  onDelete: () => void;
}

export function SubscriptionDeleteDialog({
  open,
  onOpenChange,
  deleteLoading,
  onDelete,
}: DeleteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-red-100 dark:bg-red-500/20 p-4 rounded-3xl w-fit mb-4">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
          </div>
          <DialogTitle>¿Eliminar esta suscripción?</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará el registro de
            suscripción.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button
            disabled={deleteLoading}
            variant="destructive"
            onClick={onDelete}
          >
            {deleteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
