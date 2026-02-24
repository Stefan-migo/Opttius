"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { extractDataFromResponse } from "@/lib/api/response-helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  ArrowLeft,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Send,
  User,
  Building2,
  Edit,
  UserPlus,
  Package,
  Receipt,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOpticalInternalSupportMessageSchema,
  updateOpticalInternalSupportTicketSchema,
} from "@/lib/api/validation/zod-schemas";
import type { z } from "zod";
import { useBranch } from "@/hooks/useBranch";

type MessageForm = z.infer<typeof createOpticalInternalSupportMessageSchema>;
type UpdateTicketForm = z.infer<
  typeof updateOpticalInternalSupportTicketSchema
>;

interface TicketMessage {
  id: string;
  message: string;
  sender_name: string;
  sender_email: string;
  sender_role: string | null;
  is_internal: boolean;
  created_at: string;
  message_type: string;
  sender?: {
    id: string;
    email: string;
    role: string;
  } | null;
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
  resolution: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  } | null;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
  assigned_to_user?: {
    id: string;
    email: string;
    role: string;
  } | null;
  created_by_user?: {
    id: string;
    email: string;
    role: string;
  } | null;
  resolved_by_user?: {
    id: string;
    email: string;
    role: string;
  } | null;
  related_order?: {
    id: string;
    order_number: string;
  } | null;
  related_work_order?: {
    id: string;
    work_order_number: string;
  } | null;
  related_appointment?: {
    id: string;
    appointment_date: string;
    appointment_time: string;
  } | null;
  related_quote?: {
    id: string;
    quote_number: string;
  } | null;
}

const statusLabels: Record<string, string> = {
  open: "Abierto",
  assigned: "Asignado",
  in_progress: "En Progreso",
  waiting_customer: "Esperando Cliente",
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

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const categoryLabels: Record<string, string> = {
  lens_issue: "Problema con Lente",
  frame_issue: "Problema con Marco",
  prescription_issue: "Problema con Receta",
  delivery_issue: "Problema con Entrega",
  payment_issue: "Problema con Pago",
  appointment_issue: "Problema con Cita",
  customer_complaint: "Queja del Cliente",
  quality_issue: "Problema de Calidad",
  other: "Otro",
};

export default function OpticalInternalSupportTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  const { currentBranchId } = useBranch();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [adminUsers, setAdminUsers] = useState<
    Array<{ id: string; email: string; role: string }>
  >([]);

  const {
    register: registerMessage,
    handleSubmit: handleSubmitMessage,
    formState: { errors: messageErrors },
    reset: resetMessage,
  } = useForm<any>({
    resolver: zodResolver(createOpticalInternalSupportMessageSchema),
    defaultValues: {
      is_internal: true,
      message_type: "message",
      attachments: [],
    },
  });

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: updateErrors },
    reset: resetUpdate,
    watch: watchUpdate,
    setValue: setUpdateValue,
  } = useForm<any>({
    resolver: zodResolver(updateOpticalInternalSupportTicketSchema),
  });

  useEffect(() => {
    if (ticket) {
      setUpdateValue("status", ticket.status as any);
      setUpdateValue("priority", ticket.priority as any);
      setUpdateValue("assigned_to", ticket.assigned_to || undefined);
      setUpdateValue("resolution", ticket.resolution || undefined);
      setUpdateValue("resolution_notes", ticket.resolution_notes || undefined);
    }
  }, [ticket, setUpdateValue]);

  useEffect(() => {
    fetchTicket();
    fetchMessages();
    fetchAdminUsers();
  }, [ticketId]);

  const fetchAdminUsers = async () => {
    try {
      const response = await fetch("/api/admin/admin-users");
      if (response.ok) {
        const data = await response.json();
        const adminUsers = extractDataFromResponse<{
          id: string;
          email: string;
          role: string;
        }>(data);
        setAdminUsers(adminUsers);
      }
    } catch (err) {
      console.error("Error loading admin users:", err);
    }
  };

  const fetchTicket = async () => {
    try {
      const response = await fetch(
        `/api/admin/optical-support/tickets/${ticketId}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar el ticket");
      }

      const data = await response.json();
      setTicket(data.ticket);
    } catch (err) {
      toast.error("Error al cargar el ticket");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `/api/admin/optical-support/tickets/${ticketId}/messages`,
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const onSubmitMessage: SubmitHandler<any> = async (data) => {
    setSendingMessage(true);
    try {
      const response = await fetch(
        `/api/admin/optical-support/tickets/${ticketId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error al enviar mensaje");
      }

      toast.success("Mensaje enviado exitosamente");
      resetMessage();
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

  const onSubmitUpdate: SubmitHandler<any> = async (data) => {
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
      setShowUpdateDialog(false);
      resetUpdate();
      fetchTicket();
      fetchMessages();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al actualizar ticket",
      );
    } finally {
      setUpdatingTicket(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-epoch-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-epoch-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-epoch-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 rounded-xl border">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-display font-semibold text-epoch-primary mb-2">
                  Ticket no encontrado
                </h2>
                <Button
                  onClick={() => router.push("/admin/support")}
                  className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase"
                >
                  Volver a Tickets
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-epoch-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/support")}
              className="rounded-xl text-epoch-primary hover:bg-epoch-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
                Ticket #{ticket.ticket_number}
              </h1>
              <p className="text-epoch-primary/80 mt-1">{ticket.subject}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowUpdateDialog(true)}
              className="rounded-xl border-admin-border-primary/20"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Badge className={statusColors[ticket.status]}>
              {statusLabels[ticket.status]}
            </Badge>
            <Badge className={priorityColors[ticket.priority]}>
              {priorityLabels[ticket.priority]}
            </Badge>
            <Badge variant="outline">{categoryLabels[ticket.category]}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Details - sin admin-card para evitar hover conflictivo */}
            <Card className="rounded-xl border border-border">
              <CardHeader>
                <CardTitle className="font-display text-epoch-primary">
                  Detalles del Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-epoch-primary/80">
                    Descripción
                  </Label>
                  <p className="mt-1 text-epoch-primary whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>
                {ticket.resolution && (
                  <div>
                    <Label className="text-sm font-medium text-epoch-primary/80">
                      Resolución
                    </Label>
                    <p className="mt-1 text-epoch-primary whitespace-pre-wrap">
                      {ticket.resolution}
                    </p>
                  </div>
                )}
                {ticket.resolution_notes && (
                  <div>
                    <Label className="text-sm font-medium text-epoch-primary/80">
                      Notas de Resolución
                    </Label>
                    <p className="mt-1 text-epoch-primary whitespace-pre-wrap">
                      {ticket.resolution_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages - sin admin-card para evitar contraste en burbujas de mensaje */}
            <Card className="rounded-xl border border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-epoch-primary">
                  <MessageSquare className="h-5 w-5 text-epoch-accent" />
                  Conversación ({messages.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-epoch-primary/70">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No hay mensajes aún</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-4 rounded-xl border bg-white border-epoch-primary/20 text-epoch-primary"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-epoch-primary/70" />
                            <span className="font-medium text-sm text-epoch-primary">
                              {msg.sender_name}
                            </span>
                            {msg.message_type === "status_change" && (
                              <Badge variant="outline" className="text-xs">
                                Cambio de Estado
                              </Badge>
                            )}
                            {msg.message_type === "assignment" && (
                              <Badge variant="outline" className="text-xs">
                                Asignación
                              </Badge>
                            )}
                            {msg.message_type === "resolution" && (
                              <Badge variant="outline" className="text-xs">
                                Resolución
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-epoch-primary/70">
                            {new Date(msg.created_at).toLocaleString("es-CL")}
                          </span>
                        </div>
                        <p className="text-epoch-primary whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Message Form - sin admin-card para evitar contraste en textarea */}
            {ticket.status !== "resolved" && ticket.status !== "closed" && (
              <Card className="rounded-xl border border-border">
                <CardHeader>
                  <CardTitle className="font-display text-epoch-primary">
                    Agregar Mensaje
                  </CardTitle>
                  <CardDescription>
                    Agrega información adicional o notas sobre la resolución del
                    problema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleSubmitMessage(onSubmitMessage)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="message">
                        Mensaje <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="message"
                        {...registerMessage("message")}
                        placeholder="Escribe tu mensaje aquí..."
                        rows={6}
                        className={`rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20 bg-white text-epoch-primary placeholder:text-epoch-primary/50 ${messageErrors.message ? "border-red-500" : ""}`}
                      />
                      {messageErrors.message && (
                        <p className="text-sm text-red-500">
                          {String(messageErrors.message.message)}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={sendingMessage}
                      className="w-full rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase"
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
            )}

            {ticket.status === "resolved" || ticket.status === "closed" ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Este ticket está{" "}
                  {ticket.status === "resolved" ? "resuelto" : "cerrado"}. Si
                  necesitas agregar más información, puedes crear un nuevo
                  ticket.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Info */}
            <Card className="rounded-xl border border-border">
              <CardHeader>
                <CardTitle className="text-lg font-display text-epoch-primary">
                  Información
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.customer && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-xs text-epoch-primary/70">
                        Cliente
                      </Label>
                      <p className="text-sm font-medium">
                        {ticket.customer.first_name} {ticket.customer.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ticket.customer.email}
                      </p>
                      {ticket.customer.phone && (
                        <p className="text-xs text-gray-500">
                          {ticket.customer.phone}
                        </p>
                      )}
                      <Link
                        href={`/admin/customers/${ticket.customer.id}`}
                        className="text-xs text-epoch-accent hover:text-epoch-primary hover:underline mt-1 inline-block"
                      >
                        Ver cliente →
                      </Link>
                    </div>
                  </div>
                )}

                {ticket.branch && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-xs text-epoch-primary/70">
                        Sucursal
                      </Label>
                      <p className="text-sm font-medium">
                        {ticket.branch.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ticket.branch.code}
                      </p>
                    </div>
                  </div>
                )}

                {ticket.related_order && (
                  <div className="flex items-start gap-3">
                    <Receipt className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-xs text-epoch-primary/70">
                        Pedido Relacionado
                      </Label>
                      <Link
                        href={`/admin/orders/${ticket.related_order.id}`}
                        className="text-sm font-medium text-epoch-accent hover:text-epoch-primary hover:underline"
                      >
                        {ticket.related_order.order_number} →
                      </Link>
                    </div>
                  </div>
                )}

                {ticket.related_work_order && (
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-xs text-epoch-primary/70">
                        Trabajo Relacionado
                      </Label>
                      <Link
                        href={`/admin/work-orders/${ticket.related_work_order.id}`}
                        className="text-sm font-medium text-epoch-accent hover:text-epoch-primary hover:underline"
                      >
                        {ticket.related_work_order.work_order_number} →
                      </Link>
                    </div>
                  </div>
                )}

                {ticket.related_quote && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-xs text-epoch-primary/70">
                        Presupuesto Relacionado
                      </Label>
                      <Link
                        href={`/admin/quotes/${ticket.related_quote.id}`}
                        className="text-sm font-medium text-epoch-accent hover:text-epoch-primary hover:underline"
                      >
                        {ticket.related_quote.quote_number} →
                      </Link>
                    </div>
                  </div>
                )}

                {ticket.related_appointment && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-xs text-epoch-primary/70">
                        Cita Relacionada
                      </Label>
                      <p className="text-sm font-medium">
                        {new Date(
                          ticket.related_appointment.appointment_date,
                        ).toLocaleDateString("es-CL")}{" "}
                        {ticket.related_appointment.appointment_time}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-epoch-accent mt-0.5" />
                  <div>
                    <Label className="text-xs text-epoch-primary/70">
                      Creado
                    </Label>
                    <p className="text-sm font-medium">
                      {new Date(ticket.created_at).toLocaleString("es-CL")}
                    </p>
                    {ticket.created_by_user && (
                      <p className="text-xs text-gray-500">
                        Por: {ticket.created_by_user.email}
                      </p>
                    )}
                  </div>
                </div>

                {ticket.first_response_at && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-xs text-epoch-primary/70">
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

                {ticket.assigned_to_user && (
                  <div className="flex items-start gap-3">
                    <UserPlus className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-xs text-epoch-primary/70">
                        Asignado a
                      </Label>
                      <p className="text-sm font-medium">
                        {ticket.assigned_to_user.email}
                      </p>
                      {ticket.assigned_at && (
                        <p className="text-xs text-gray-500">
                          {new Date(ticket.assigned_at).toLocaleDateString(
                            "es-CL",
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {ticket.resolved_at && ticket.resolved_by_user && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <Label className="text-xs text-epoch-primary/70">
                        Resuelto
                      </Label>
                      <p className="text-sm font-medium">
                        {new Date(ticket.resolved_at).toLocaleString("es-CL")}
                      </p>
                      <p className="text-xs text-gray-500">
                        Por: {ticket.resolved_by_user.email}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Update Ticket Dialog */}
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl rounded-xl">
            <DialogHeader>
              <DialogTitle>Actualizar Ticket</DialogTitle>
              <DialogDescription>
                Cambia el estado, prioridad o asignación del ticket
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSubmitUpdate(onSubmitUpdate)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={watchUpdate("status") || ticket.status}
                    onValueChange={(value) =>
                      setUpdateValue("status", value as any)
                    }
                  >
                    <SelectTrigger
                      id="status"
                      className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
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
                      setUpdateValue("priority", value as any)
                    }
                  >
                    <SelectTrigger
                      id="priority"
                      className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
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
                    id="assigned_to"
                    className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
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
                  placeholder="Describe cómo se resolvió el problema..."
                  rows={4}
                  className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolution_notes">Notas de Resolución</Label>
                <Textarea
                  id="resolution_notes"
                  {...registerUpdate("resolution_notes")}
                  placeholder="Notas adicionales sobre la resolución..."
                  rows={3}
                  className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-admin-border-primary/20"
                  onClick={() => setShowUpdateDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updatingTicket}
                  className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase"
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
      </div>
    </div>
  );
}
