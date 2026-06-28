"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { updateOpticalInternalSupportTicketSchema } from "@/lib/api/validation/zod-schemas";

interface TicketAdminUser {
  id: string;
  email: string;
  role: string;
}

interface TicketStatusData {
  id: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  resolution: string | null;
  resolution_notes: string | null;
}

interface TicketStatusActionsProps {
  ticket: TicketStatusData;
  adminUsers: TicketAdminUser[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdated: () => void;
}

const statusLabels: Record<string, string> = {
  open: "Abierto",
  assigned: "Asignado",
  in_progress: "En Progreso",
  waiting_customer: "Esperando Cliente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export default function TicketStatusActions({
  ticket,
  adminUsers,
  open,
  onOpenChange,
  onTicketUpdated,
}: TicketStatusActionsProps) {
  const params = useParams();
  const ticketId = params.id as string;
  const [updatingTicket, setUpdatingTicket] = useState(false);

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    reset: resetUpdate,
    watch: watchUpdate,
    setValue: setUpdateValue,
  } = useForm<unknown>({
    resolver: zodResolver(updateOpticalInternalSupportTicketSchema),
  });

  useEffect(() => {
    if (open) {
      setUpdateValue("status", ticket.status as unknown);
      setUpdateValue("priority", ticket.priority as unknown);
      setUpdateValue("assigned_to", ticket.assigned_to || undefined);
      setUpdateValue("resolution", ticket.resolution || undefined);
      setUpdateValue("resolution_notes", ticket.resolution_notes || undefined);
    }
  }, [open, ticket, setUpdateValue]);

  const onSubmitUpdate: SubmitHandler<unknown> = async (data) => {
    setUpdatingTicket(true);
    try {
      const response = await fetch(
        `/api/admin/optical-support/tickets/${ticketId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error al actualizar ticket");
      }

      toast.success("Ticket actualizado exitosamente");
      onOpenChange(false);
      resetUpdate();
      onTicketUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al actualizar ticket",
      );
    } finally {
      setUpdatingTicket(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>Actualizar Ticket</DialogTitle>
          <DialogDescription>
            Cambia el estado, prioridad o asignación del ticket
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmitUpdate(onSubmitUpdate)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={watchUpdate("status") || ticket.status}
                onValueChange={(value) =>
                  setUpdateValue("status", value as unknown)
                }
              >
                <SelectTrigger
                  className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
                  id="status"
                >
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
              <Label htmlFor="priority">Prioridad</Label>
              <Select
                value={watchUpdate("priority") || ticket.priority}
                onValueChange={(value) =>
                  setUpdateValue("priority", value as unknown)
                }
              >
                <SelectTrigger
                  className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
                  id="priority"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Asignar a</Label>
            <Select
              value={watchUpdate("assigned_to") || "__none__"}
              onValueChange={(value) =>
                setUpdateValue(
                  "assigned_to",
                  value === "__none__" ? undefined : value,
                )
              }
            >
              <SelectTrigger
                className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
                id="assigned_to"
              >
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {adminUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution">Resolución</Label>
            <Textarea
              id="resolution"
              {...registerUpdate("resolution")}
              className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
              placeholder="Describe cómo se resolvió el problema..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution_notes">Notas de Resolución</Label>
            <Textarea
              id="resolution_notes"
              {...registerUpdate("resolution_notes")}
              className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
              placeholder="Notas adicionales sobre la resolución..."
              rows={3}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              className="rounded-xl border-admin-border-primary/20 w-full sm:w-auto min-h-[44px]"
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase w-full sm:w-auto min-h-[44px]"
              disabled={updatingTicket}
              type="submit"
            >
              {updatingTicket ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Actualizar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
