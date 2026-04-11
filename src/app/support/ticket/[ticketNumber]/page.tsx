"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";

const messageSchema = z.object({
  message: z
    .string()
    .min(1, "El mensaje es requerido")
    .max(5000, "El mensaje es demasiado largo")
    .trim(),
  requester_email: z.string().email("Email inválido"),
  requester_name: z.string().min(1, "El nombre es requerido").optional(),
});

type MessageForm = z.infer<typeof messageSchema>;

const statusLabels: Record<string, string> = {
  open: "Abierto",
  assigned: "Asignado",
  in_progress: "En Progreso",
  waiting_customer: "Esperando Respuesta",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  assigned: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-purple-100 text-purple-800",
  waiting_customer: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const categoryLabels: Record<string, string> = {
  technical: "Problema Técnico",
  billing: "Facturación/Suscripción",
  feature_request: "Solicitud de Funcionalidad",
  bug_report: "Reporte de Bug",
  account: "Gestión de Cuenta",
  other: "Otro",
};

interface TicketMessage {
  id: string;
  message: string;
  sender_name: string;
  sender_email: string;
  is_from_customer: boolean;
  created_at: string;
  message_type: string;
}

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  first_response_at: string | null;
  last_response_at: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  messages: TicketMessage[];
}

export default function TicketViewPage() {
  const router = useRouter();
  const params = useParams();
  const ticketNumber = params.ticketNumber as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
  });

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await fetch(`/api/support/ticket/${ticketNumber}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Ticket no encontrado");
        }

        const data = await response.json();
        setTicket(data.ticket);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar el ticket",
        );
      } finally {
        setLoading(false);
      }
    };

    if (ticketNumber) {
      fetchTicket();
    }
  }, [ticketNumber]);

  const onSubmit = async (data: MessageForm) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/support/ticket/${ticketNumber}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: data.message,
          requester_email: data.requester_email,
          requester_name: data.requester_name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al enviar el mensaje");
      }

      toast.success("Mensaje enviado exitosamente");
      reset();

      // Recargar ticket para mostrar el nuevo mensaje
      const refreshResponse = await fetch(
        `/api/support/ticket/${ticketNumber}`,
      );
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setTicket(refreshData.ticket);
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Error al enviar el mensaje. Por favor intenta nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Ticket no encontrado
                </h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/support")}
                  >
                    Crear Nuevo Ticket
                  </Button>
                  <Button onClick={() => router.push("/")}>
                    Volver al Inicio
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
            href="/support"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al soporte
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Ticket #{ticket.ticket_number}
              </h1>
              <p className="text-gray-600 mt-1">{ticket.subject}</p>
            </div>
            <div className="flex gap-2">
              <Badge className={statusColors[ticket.status]}>
                {statusLabels[ticket.status]}
              </Badge>
              <Badge className={priorityColors[ticket.priority]}>
                {priorityLabels[ticket.priority]}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Categoría
                  </Label>
                  <p className="mt-1">{categoryLabels[ticket.category]}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Descripción
                  </Label>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>
                {ticket.organization && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Organización
                    </Label>
                    <p className="mt-1">{ticket.organization.name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Conversación
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ticket.messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No hay mensajes aún</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticket.messages.map((msg) => (
                      <div
                        className={`p-4 rounded-lg ${
                          msg.is_from_customer
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-gray-50 border border-gray-200"
                        }`}
                        key={msg.id}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-sm">
                              {msg.sender_name}
                            </span>
                            {msg.is_from_customer && (
                              <Badge className="text-xs" variant="outline">
                                Tú
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.created_at).toLocaleString("es-CL")}
                          </span>
                        </div>
                        <p className="text-gray-900 whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Message Form */}
            <Card>
              <CardHeader>
                <CardTitle>Agregar Mensaje</CardTitle>
                <CardDescription>
                  Responde a este ticket o agrega información adicional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-2">
                    <Label htmlFor="requester_email">
                      Tu Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="requester_email"
                      type="email"
                      {...register("requester_email")}
                      className={errors.requester_email ? "border-red-500" : ""}
                      placeholder="tu@email.com"
                    />
                    {errors.requester_email && (
                      <p className="text-sm text-red-500">
                        {errors.requester_email.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Debe coincidir con el email usado al crear el ticket
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requester_name">Tu Nombre (Opcional)</Label>
                    <Input
                      id="requester_name"
                      {...register("requester_name")}
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">
                      Mensaje <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      {...register("message")}
                      className={errors.message ? "border-red-500" : ""}
                      placeholder="Escribe tu mensaje aquí..."
                      rows={4}
                    />
                    {errors.message && (
                      <p className="text-sm text-red-500">
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Mensaje
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <Label className="text-xs text-gray-500">Creado</Label>
                    <p className="text-sm font-medium">
                      {new Date(ticket.created_at).toLocaleString("es-CL")}
                    </p>
                  </div>
                </div>

                {ticket.first_response_at && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-xs text-gray-500">
                        Primera Respuesta
                      </Label>
                      <p className="text-sm font-medium">
                        {new Date(ticket.first_response_at).toLocaleString(
                          "es-CL",
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {ticket.last_response_at && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-xs text-gray-500">
                        Última Respuesta
                      </Label>
                      <p className="text-sm font-medium">
                        {new Date(ticket.last_response_at).toLocaleString(
                          "es-CL",
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Los mensajes internos del equipo de soporte no son visibles en
                esta vista pública.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  );
}
