"use client";

import { Edit, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import type { LabInfo, WorkOrder } from "@/hooks/useWorkOrder";

interface StatusManagementCardProps {
  workOrder: WorkOrder | null;
  showStatusDialog: boolean;
  setShowStatusDialog: (open: boolean) => void;
  newStatus: string;
  setNewStatus: (status: string) => void;
  statusDialogOpenedFromTimeline: boolean;
  setStatusDialogOpenedFromTimeline: (val: boolean) => void;
  statusNotes: string;
  setStatusNotes: (notes: string) => void;
  labInfo: LabInfo;
  setLabInfo: React.Dispatch<React.SetStateAction<LabInfo>>;
  updatingStatus: boolean;
  availableStatuses: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  handleStatusUpdate: () => Promise<void>;
}

export function StatusManagementCard({
  workOrder,
  showStatusDialog,
  setShowStatusDialog,
  newStatus,
  setNewStatus,
  statusDialogOpenedFromTimeline,
  setStatusDialogOpenedFromTimeline,
  statusNotes,
  setStatusNotes,
  labInfo,
  setLabInfo,
  updatingStatus,
  availableStatuses,
  statusOptions,
  handleStatusUpdate,
}: StatusManagementCardProps) {
  return (
    <Dialog
      open={showStatusDialog}
      onOpenChange={(open) => {
        setShowStatusDialog(open);
        if (!open) setStatusDialogOpenedFromTimeline(false);
      }}
    >
      {availableStatuses.length > 0 && (
        <DialogTrigger asChild>
          <Button
            aria-label="Cambiar estado"
            className="h-9 min-w-0 sm:w-auto sm:px-3 gap-1.5"
            size="sm"
            variant="outline"
            onClick={() => setStatusDialogOpenedFromTimeline(false)}
          >
            <Edit className="h-4 w-4 shrink-0" />
            <span className="text-xs sm:text-sm whitespace-nowrap">
              <span className="sm:hidden">Cambiar</span>
              <span className="hidden sm:inline">Cambiar Estado</span>
            </span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar Estado del Trabajo</DialogTitle>
          <DialogDescription>
            Selecciona el nuevo estado del trabajo. Puedes cambiar a cualquier
            estado disponible.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nuevo Estado</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el nuevo estado" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newStatus === "sent_to_lab" && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <Label>Nombre del Laboratorio *</Label>
                <Input
                  placeholder="Ej: Laboratorio Óptico Central"
                  value={labInfo.lab_name}
                  onChange={(e) =>
                    setLabInfo((prev) => ({
                      ...prev,
                      lab_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Contacto del Laboratorio</Label>
                <Input
                  placeholder="Teléfono o email"
                  value={labInfo.lab_contact}
                  onChange={(e) =>
                    setLabInfo((prev) => ({
                      ...prev,
                      lab_contact: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Número de Orden del Lab</Label>
                <Input
                  placeholder="Número asignado por el laboratorio"
                  value={labInfo.lab_order_number}
                  onChange={(e) =>
                    setLabInfo((prev) => ({
                      ...prev,
                      lab_order_number: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Fecha Estimada de Entrega</Label>
                <Input
                  type="date"
                  value={labInfo.lab_estimated_delivery_date}
                  onChange={(e) =>
                    setLabInfo((prev) => ({
                      ...prev,
                      lab_estimated_delivery_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          )}

          <div>
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Notas sobre el cambio de estado..."
              rows={3}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                updatingStatus ||
                !newStatus ||
                (newStatus === "sent_to_lab" && !labInfo.lab_name)
              }
              onClick={handleStatusUpdate}
            >
              {updatingStatus ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar Estado"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
