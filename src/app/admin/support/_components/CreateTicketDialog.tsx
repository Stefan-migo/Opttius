"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { getBranchHeader } from "@/lib/utils/branch";

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
  // Customer search
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<
    Array<{
      id: string;
      first_name?: string;
      last_name?: string;
      email: string;
      rut?: string;
    }>
  >([]);
  const [selectedCustomerForTicket, setSelectedCustomerForTicket] = useState<{
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  } | null>(null);
  const [loadingCustomerSearch, setLoadingCustomerSearch] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<TicketForm>({
    resolver: zodResolver(createOpticalInternalSupportTicketSchema) as any,
    defaultValues: {
      priority: "medium",
      category: "other",
      branch_id: currentBranchId || undefined,
    },
  });

  // Reset customer search when dialog closes; sync branch when opening
  useEffect(() => {
    if (!open) {
      setCustomerSearch("");
      setCustomerSearchResults([]);
      setSelectedCustomerForTicket(null);
    } else if (currentBranchId && !isGlobalView) {
      setValue("branch_id", currentBranchId);
    }
  }, [open, currentBranchId, isGlobalView, setValue]);

  // Debounced customer search
  const searchCustomersForTicket = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setCustomerSearchResults([]);
        return;
      }
      try {
        setLoadingCustomerSearch(true);
        const params = new URLSearchParams({ q: query });
        if (currentBranchId) params.set("branch_id", currentBranchId);
        const headers = getBranchHeader(currentBranchId || null);
        const response = await fetch(
          `/api/admin/customers/search?${params.toString()}`,
          { headers },
        );
        if (response.ok) {
          const res = await response.json();
          const list =
            res?.data ?? res?.customers ?? (Array.isArray(res) ? res : []);
          setCustomerSearchResults(
            Array.isArray(list) ? list.slice(0, 15) : [],
          );
        } else {
          setCustomerSearchResults([]);
        }
      } catch {
        setCustomerSearchResults([]);
      } finally {
        setLoadingCustomerSearch(false);
      }
    },
    [currentBranchId],
  );

  useEffect(() => {
    const t = setTimeout(() => searchCustomersForTicket(customerSearch), 300);
    return () => clearTimeout(t);
  }, [customerSearch, searchCustomersForTicket]);

  const handleFormSubmit = handleSubmit(async (data) => {
    setCreatingTicket(true);
    try {
      const branchId =
        isSuperAdmin && isGlobalView
          ? data.branch_id
          : currentBranchId || data.branch_id;
      await onSubmit({ ...data, branch_id: branchId || undefined } as TicketForm);
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
            Registra un incidente o problema relacionado con un cliente
            (lente, entrega, pago, etc.) para análisis y mejora del servicio
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
                onValueChange={(value) =>
                  setValue("category", value as TicketForm["category"])
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
                onValueChange={(value) =>
                  setValue("priority", value as TicketForm["priority"])
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
            {selectedCustomerForTicket ? (
              <div className="flex items-center justify-between p-3 border rounded-xl bg-epoch-background">
                <div>
                  <div className="font-medium">
                    {selectedCustomerForTicket.first_name}{" "}
                    {selectedCustomerForTicket.last_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedCustomerForTicket.email}
                  </div>
                </div>
                <Button
                  className="rounded-xl border-admin-border-primary/20"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedCustomerForTicket(null);
                    setValue("customer_id", undefined);
                    setValue("customer_name", undefined);
                    setValue("customer_email", undefined);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10 rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
                  id="customer_search"
                  placeholder="Buscar por nombre, RUT o email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                {customerSearch.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingCustomerSearch ? (
                      <div className="p-4 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : customerSearchResults.length > 0 ? (
                      customerSearchResults.map((c) => (
                        <button
                          className="w-full text-left p-3 hover:bg-gray-100 border-b last:border-b-0"
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerForTicket({
                              id: c.id,
                              first_name: c.first_name,
                              last_name: c.last_name,
                              email: c.email,
                            });
                            setValue("customer_id", c.id);
                            setValue(
                              "customer_name",
                              [c.first_name, c.last_name]
                                .filter(Boolean)
                                .join(" ") || undefined,
                            );
                            setValue("customer_email", c.email);
                            setCustomerSearch("");
                            setCustomerSearchResults([]);
                          }}
                        >
                          <div className="font-medium">
                            {c.first_name} {c.last_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {c.email}
                            {c.rut ? ` • RUT: ${c.rut}` : ""}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Busca por nombre, RUT o email. Si el problema está relacionado
              con un cliente específico.
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
              Mínimo 10 caracteres. Describe el problema y cómo se resolvió o
              se está resolviendo.
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Crear Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
