"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPublicSaasSupportTicketSchema } from "@/lib/api/validation/zod-schemas";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Mail,
  User,
  MessageSquare,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

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
  } = useForm<any>({
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-900">
                ¡Ticket Creado Exitosamente!
              </CardTitle>
              <CardDescription className="text-green-700">
                Tu solicitud de soporte ha sido recibida
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-green-200">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Número de Ticket
                  </Label>
                  <div className="text-2xl font-mono font-bold text-green-600">
                    {ticketNumber}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
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
                  onClick={() => {
                    setIsSuccess(false);
                    setTicketNumber(null);
                    router.refresh();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Crear Otro Ticket
                </Button>
                <Button
                  onClick={() => router.push(`/support/ticket/${ticketNumber}`)}
                  className="flex-1"
                >
                  Ver Estado del Ticket
                </Button>
              </div>

              <div className="text-center pt-4 border-t">
                <Link
                  href="/"
                  className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HelpCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Centro de Soporte
              </h1>
              <p className="text-gray-600 mt-1">
                ¿Necesitas ayuda? Estamos aquí para asistirte
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Crear Ticket de Soporte</CardTitle>
            <CardDescription>
              Completa el formulario y nuestro equipo se pondrá en contacto
              contigo lo antes posible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Información de Contacto */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-5 w-5" />
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
                      placeholder="Juan Pérez"
                      className={errors.requester_name ? "border-red-500" : ""}
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
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="requester_email"
                        type="email"
                        {...register("requester_email")}
                        placeholder="tu@email.com"
                        className={`pl-10 ${errors.requester_email ? "border-red-500" : ""
                          }`}
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
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="organization_name"
                      {...register("organization_name")}
                      placeholder="Nombre de tu organización"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Si perteneces a una organización, ingresa su nombre
                  </p>
                </div>
              </div>

              {/* Detalles del Ticket */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
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
                        setValue("category", value as any)
                      }
                    >
                      <SelectTrigger
                        id="category"
                        className={errors.category ? "border-red-500" : ""}
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
                        setValue("priority", value as any)
                      }
                    >
                      <SelectTrigger
                        id="priority"
                        className={errors.priority ? "border-red-500" : ""}
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
                    placeholder="Resumen breve del problema"
                    className={errors.subject ? "border-red-500" : ""}
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
                    placeholder="Describe tu problema o solicitud en detalle..."
                    rows={6}
                    className={errors.description ? "border-red-500" : ""}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">
                      {String(errors.description.message)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Mínimo 10 caracteres. Sé lo más específico posible para
                    ayudarnos a resolver tu problema más rápido.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
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
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <HelpCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  ¿Necesitas ayuda adicional?
                </h3>
                <p className="text-sm text-blue-800">
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
