"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Mail,
  MessageSquare,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { createPublicSaasSupportTicketSchema } from "@/lib/api/validation/zod-schemas";

type SupportForm = z.infer<typeof createPublicSaasSupportTicketSchema>;

const categoryLabels: Record<string, string> = {
  technical: "Problema Técnico",
  billing: "Facturación/Suscripción",
  feature_request: "Solicitud de Funcionalidad",
  bug_report: "Reporte de Bug",
  account: "Gestión de Cuenta",
  other: "Otro",
};

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export default function SupportPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<unknown>({
    resolver: zodResolver(createPublicSaasSupportTicketSchema),
    defaultValues: {
      requester_name: "",
      requester_email: "",
      subject: "",
      description: "",
      priority: "medium",
      category: "technical",
      metadata: {},
    },
  });

  const category = watch("category");
  const priority = watch("priority");

  const onSubmit: SubmitHandler<SupportForm> = async (data) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support/create-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al crear el ticket");
      }

      setTicketNumber(result.ticket?.ticket_number || null);
      setIsSuccess(true);
      toast.success("Ticket creado exitosamente");
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al crear el ticket. Por favor intenta nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess && ticketNumber) {
    return (
      <div className="min-h-screen bg-epoch-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-epoch-primary/20 bg-epoch-primary/5 rounded-xl border">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-epoch-primary/10 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-epoch-primary" />
              </div>
              <CardTitle className="text-2xl font-display font-bold text-epoch-primary">
                ¡Ticket Creado Exitosamente!
              </CardTitle>
              <CardDescription className="text-epoch-primary/80">
                Tu solicitud de soporte ha sido recibida
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-epoch-primary/20">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-epoch-primary/80">
                    Número de Ticket
                  </Label>
                  <div className="text-2xl font-mono font-bold text-epoch-primary">
                    {ticketNumber}
                  </div>
                  <p className="text-sm text-epoch-primary/70 mt-2">
                    Guarda este número para hacer seguimiento de tu ticket
                  </p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Te hemos enviado un email de confirmación a tu dirección de
                  correo. Revisa tu bandeja de entrada.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button
                  className="flex-1 rounded-xl border-admin-border-primary/20"
                  variant="outline"
                  onClick={() => {
                    setIsSuccess(false);
                    setTicketNumber(null);
                    router.refresh();
                  }}
                >
                  Crear Otro Ticket
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase"
                  onClick={() => router.push(`/support/ticket/${ticketNumber}`)}
                >
                  Ver Estado del Ticket
                </Button>
              </div>

              <div className="text-center pt-4 border-t">
                <Link
                  className="text-sm text-epoch-primary/70 hover:text-epoch-primary inline-flex items-center gap-1"
                  href="/"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inicio
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-epoch-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            className="inline-flex items-center gap-2 text-sm text-epoch-primary/70 hover:text-epoch-primary mb-4"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-epoch-primary/10 rounded-xl">
              <HelpCircle className="h-6 w-6 text-epoch-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
                Centro de Soporte
              </h1>
              <p className="text-epoch-primary/80 mt-1">
                ¿Necesitas ayuda? Estamos aquí para asistirte
              </p>
            </div>
          </div>
        </div>

        {/* Form Card - sin admin-card para evitar conflicto de contraste en inputs/botones */}
        <Card className="rounded-xl border border-border">
          <CardHeader>
            <CardTitle className="font-display text-epoch-primary">
              Crear Ticket de Soporte
            </CardTitle>
            <CardDescription className="text-epoch-primary/80">
              Completa el formulario y nuestro equipo se pondrá en contacto
              contigo lo antes posible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Información de Contacto */}
              <div className="space-y-4">
                <h3 className="text-lg font-display font-semibold text-epoch-primary flex items-center gap-2">
                  <User className="h-5 w-5 text-epoch-accent" />
                  Información de Contacto
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requester_name">
                      Nombre Completo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="requester_name"
                      {...register("requester_name")}
                      className={errors.requester_name ? "border-red-500" : ""}
                      placeholder="Juan Pérez"
                    />
                    {errors.requester_name && (
                      <p className="text-sm text-red-500">
                        {String(errors.requester_name.message)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requester_email">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-epoch-accent" />
                      <Input
                        id="requester_email"
                        type="email"
                        {...register("requester_email")}
                        className={`pl-10 ${
                          errors.requester_email ? "border-red-500" : ""
                        }`}
                        placeholder="tu@email.com"
                      />
                    </div>
                    {errors.requester_email && (
                      <p className="text-sm text-red-500">
                        {String(errors.requester_email.message)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization_name">
                    Organización (Opcional)
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-epoch-accent" />
                    <Input
                      id="organization_name"
                      {...register("organization_name")}
                      className="pl-10"
                      placeholder="Nombre de tu organización"
                    />
                  </div>
                  <p className="text-xs text-epoch-primary/70">
                    Si perteneces a una organización, ingresa su nombre
                  </p>
                </div>
              </div>

              {/* Detalles del Ticket */}
              <div className="space-y-4">
                <h3 className="text-lg font-display font-semibold text-epoch-primary flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-epoch-accent" />
                  Detalles del Ticket
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Categoría <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={category}
                      onValueChange={(value) =>
                        setValue("category", value as unknown)
                      }
                    >
                      <SelectTrigger
                        className={`rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 ${errors.category ? "border-red-500" : ""}`}
                        id="category"
                      >
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
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
                      value={priority}
                      onValueChange={(value) =>
                        setValue("priority", value as unknown)
                      }
                    >
                      <SelectTrigger
                        className={`rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 ${errors.priority ? "border-red-500" : ""}`}
                        id="priority"
                      >
                        <SelectValue placeholder="Selecciona una prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
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
                  <p className="text-xs text-epoch-primary/70">
                    Mínimo 10 caracteres. Sé lo más específico posible para
                    ayudarnos a resolver tu problema más rápido.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  className="flex-1 rounded-xl border-admin-border-primary/20"
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/")}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando Ticket...
                    </>
                  ) : (
                    <>Crear Ticket</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-6 bg-epoch-primary/5 border-epoch-primary/20 rounded-xl border">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="p-2 bg-epoch-primary/10 rounded-xl">
                  <HelpCircle className="h-6 w-6 text-epoch-accent" />
                </div>
              </div>
              <div>
                <h3 className="font-display font-semibold text-epoch-primary mb-2">
                  ¿Necesitas ayuda adicional?
                </h3>
                <p className="text-sm text-epoch-primary/80">
                  Nuestro equipo de soporte revisará tu ticket y te responderá
                  lo antes posible. Los tiempos de respuesta varían según la
                  prioridad del ticket.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
