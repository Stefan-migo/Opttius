"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  XCircle,
  Send,
  User,
  Calendar,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSaasSupportMessageSchema } from "@/lib/api/validation/zod-schemas";
import type { z } from "zod";

type MessageForm = z.infer<typeof createSaasSupportMessageSchema>;

interface TicketMessage {
  id: string;
  message: string;
  sender_name: string;
  sender_email: string;
  is_from_customer: boolean;
  is_internal: boolean;
  created_at: string;
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
  requester_email: string;
  requester_name: string | null;
  assigned_to_user?: { email: string } | null;
}

const statusLabels: Record<string, string> = {
  open: "Abierto",
  assigned: "Asignado",
  in_progress: "En Progreso",
  waiting_customer: "Esperando Tu Respuesta",
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

const categoryLabels: Record<string, string> = {
  technical: "Técnico",
  billing: "Facturación",
  feature_request: "Funcionalidad",
  bug_report: "Bug",
  account: "Cuenta",
  other: "Otro",
};

/**
 * Página de detalle de ticket de ayuda (Centro de Ayuda).
 * Renderiza el ticket directamente aquí - NO redirige a saas-management
 * (que requiere root y redirige a dashboard).
 */
export default function HelpTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MessageForm>({
    resolver: zodResolver(createSaasSupportMessageSchema),
    defaultValues: {
      is_internal: false,
      message_type: "message",
    },
  });

  useEffect(() => {
    fetchTicket();
    fetchMessages();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/support/tickets/${ticketId}`,
      );

      if (!response.ok) {
        if (response.status === 403) {
          toast.error("No tienes acceso a este ticket");
          router.push("/admin/help");
          return;
        }
        throw new Error("Error al cargar el ticket");
      }

      const data = await response.json();
      setTicket(data.ticket);
    } catch (err) {
      toast.error("Error al cargar el ticket");
      router.push("/admin/help");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/support/tickets/${ticketId}/messages`,
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const onSubmitMessage: SubmitHandler<MessageForm> = async (data) => {
    setSendingMessage(true);
    try {
      const response = await fetch(
        `/api/admin/saas-management/support/tickets/${ticketId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, is_internal: false }),
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error al enviar mensaje");
      }

      toast.success("Mensaje enviado exitosamente");
      reset();
      fetchMessages();
      fetchTicket();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al enviar mensaje",
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const copyTicketNumber = () => {
    if (ticket?.ticket_number) {
      navigator.clipboard.writeText(ticket.ticket_number);
      toast.success("Número de ticket copiado");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/help")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Ticket #{ticket.ticket_number}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyTicketNumber}
                title="Copiar número de ticket"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-gray-600 mt-1">{ticket.subject}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={statusColors[ticket.status]}>
            {statusLabels[ticket.status]}
          </Badge>
          <Badge variant="outline">{priorityLabels[ticket.priority]}</Badge>
          <Badge variant="outline">{categoryLabels[ticket.category]}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Descripción
                </Label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(ticket.created_at).toLocaleString("es-CL")}
                </span>
                {ticket.assigned_to_user && (
                  <span>Asignado a: {ticket.assigned_to_user.email}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversación ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No hay mensajes aún</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages
                    .filter((m) => !m.is_internal)
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg border ${
                          msg.is_from_customer
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-sm">
                              {msg.sender_name}
                            </span>
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

          <Card>
            <CardHeader>
              <CardTitle>Responder</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmitMessage)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="message">
                    Mensaje <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    {...register("message")}
                    placeholder="Escribe tu respuesta aquí..."
                    rows={6}
                    className={errors.message ? "border-red-500" : ""}
                  />
                  {errors.message && (
                    <p className="text-sm text-red-500">
                      {String(errors.message.message)}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={sendingMessage}
                  className="w-full"
                >
                  {sendingMessage ? (
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
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-gray-500">Creado</Label>
                <p className="text-sm font-medium">
                  {new Date(ticket.created_at).toLocaleString("es-CL")}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Solicitante</Label>
                <p className="text-sm font-medium">
                  {ticket.requester_name || ticket.requester_email}
                </p>
                <p className="text-xs text-gray-500">
                  {ticket.requester_email}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
