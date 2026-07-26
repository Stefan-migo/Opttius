"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import type { z } from "zod";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createOpticalInternalSupportTicketSchema } from "@/lib/api/validation/zod-schemas";

import { CustomerSearchField } from "./CustomerSearchField";
import { categoryLabels, priorityLabels } from "./supportConstants";

type TicketForm = z.infer<typeof createOpticalInternalSupportTicketSchema>;

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBranchId: string | null;
  isGlobalView: boolean;
  isSuperAdmin: boolean;
  onSubmit: (data: TicketForm) => Promise<void>;
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  currentBranchId,
  isGlobalView,
  isSuperAdmin,
  onSubmit,
}: CreateTicketDialogProps) {
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<TicketForm>({
    resolver: zodResolver(createOpticalInternalSupportTicketSchema) as Resolver,
    defaultValues: {
      priority: "medium",
      category: "other",
      branch_id: currentBranchId || undefined,
    },
  });

  useEffect(() => {
    if (!open) {
      setSelectedCustomer(null);
    } else if (currentBranchId && !isGlobalView) {
      setValue("branch_id", currentBranchId);
    }
  }, [open, currentBranchId, isGlobalView, setValue]);

  const handleCustomerChange = (
    customer: {
      id: string;
      first_name?: string;
      last_name?: string;
      email: string;
    } | null,
  ) => {
    setSelectedCustomer(customer);
    setValue("customer_id", customer?.id || undefined);
    setValue(
      "customer_name",
      customer
        ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
            undefined
        : undefined,
    );
    setValue("customer_email", customer?.email || undefined);
  };

  const handleFormSubmit = handleSubmit(async (data) => {
    setCreatingTicket(true);
    try {
      const branchId =
        isSuperAdmin && isGlobalView
          ? data.branch_id
          : currentBranchId || data.branch_id;
      await onSubmit({
        ...data,
        branch_id: branchId || undefined,
      } as TicketForm);
      reset();
    } finally {
      setCreatingTicket(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Incidente</DialogTitle>
          <DialogDescription>
            Registra un incidente o problema relacionado con un cliente (lente,
            entrega, pago, etc.) para análisis y mejora del servicio
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleFormSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                Categoría <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch("category")}
                onValueChange={(v) =>
                  setValue("category", v as TicketForm["category"])
                }
              >
                <SelectTrigger
                  className={`rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 ${errors.category ? "border-red-500" : ""}`}
                  id="category"
                >
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-500">
                  {String(errors.category.message)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">
                Prioridad <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch("priority")}
                onValueChange={(v) =>
                  setValue("priority", v as TicketForm["priority"])
                }
              >
                <SelectTrigger
                  className={`rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 ${errors.priority ? "border-red-500" : ""}`}
                  id="priority"
                >
                  <SelectValue placeholder="Selecciona una prioridad" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-red-500">
                  {String(errors.priority.message)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_search">Cliente (opcional)</Label>
            <CustomerSearchField
              currentBranchId={currentBranchId}
              value={selectedCustomer}
              onChange={handleCustomerChange}
            />
            <p className="text-xs text-gray-500">
              Busca por nombre, RUT o email. Si el problema está relacionado con
              un cliente específico.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">
              Asunto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              {...register("subject")}
              className={`rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 ${errors.subject ? "border-red-500" : ""}`}
              placeholder="Resumen breve del problema"
            />
            {errors.subject && (
              <p className="text-sm text-red-500">
                {String(errors.subject.message)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              className={`rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 ${errors.description ? "border-red-500" : ""}`}
              placeholder="Describe el problema en detalle..."
              rows={6}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {String(errors.description.message)}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Mínimo 10 caracteres. Describe el problema y cómo se resolvió o se
              está resolviendo.
            </p>
          </div>

          <DialogFooter>
            <Button
              className="rounded-xl border-admin-border-primary/20"
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase"
              disabled={creatingTicket}
              type="submit"
            >
              {creatingTicket ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Crear Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
