"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
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
import { createSaasSupportTicketSchema } from "@/lib/api/validation/zod-schemas";

import { categoryLabels, priorityLabels } from "./types";

type TicketForm = z.infer<typeof createSaasSupportTicketSchema>;

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: TicketForm) => Promise<void>;
  creating: boolean;
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  onSubmit,
  creating,
}: CreateTicketDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TicketForm>({
    resolver: zodResolver(createSaasSupportTicketSchema) as Resolver,
    defaultValues: {
      priority: "medium",
      category: "technical",
      metadata: {},
    } as TicketForm,
  });

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Ticket de Soporte</DialogTitle>
          <DialogDescription>
            Describe tu problema o solicitud y nuestro equipo te ayudará
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                Categoría <span className="text-red-500">*</span>
              </Label>
              <Select
                {...register("category")}
                onValueChange={(value) =>
                  register("category").onChange({ target: { value } })
                }
              >
                <SelectTrigger
                  className={errors.category ? "border-red-500" : ""}
                  id="category"
                >
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
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
                {...register("priority")}
                onValueChange={(value) =>
                  register("priority").onChange({ target: { value } })
                }
              >
                <SelectTrigger
                  className={errors.priority ? "border-red-500" : ""}
                  id="priority"
                >
                  <SelectValue placeholder="Selecciona una prioridad" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
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
            <Label htmlFor="subject">
              Asunto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              {...register("subject")}
              className={errors.subject ? "border-red-500" : ""}
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
              className={errors.description ? "border-red-500" : ""}
              placeholder="Describe tu problema o solicitud en detalle..."
              rows={6}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {String(errors.description.message)}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Mínimo 10 caracteres. Sé lo más específico posible para ayudarnos
              a resolver tu problema más rápido.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button disabled={creating} type="submit">
              {creating ? (
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
