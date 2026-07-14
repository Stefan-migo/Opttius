import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TicketStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: string;
  priority: string;
  resolution: string;
  updating: boolean;
  statusLabels: Record<string, string>;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onResolutionChange: (value: string) => void;
  onSave: () => void;
}

export function TicketStatusDialog({
  open,
  onOpenChange,
  status,
  priority,
  resolution,
  updating,
  statusLabels,
  onStatusChange,
  onPriorityChange,
  onResolutionChange,
  onSave,
}: TicketStatusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar Estado y Prioridad</DialogTitle>
          <DialogDescription>
            Actualiza el estado y prioridad del ticket
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Prioridad</Label>
            <Select value={priority} onValueChange={onPriorityChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === "resolved" || status === "closed") && (
            <div className="space-y-2">
              <Label>Resolución</Label>
              <Textarea
                placeholder="Describe la resolución del ticket..."
                rows={4}
                value={resolution}
                onChange={(e) => onResolutionChange(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={updating} onClick={onSave}>
            {updating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Actualizar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
