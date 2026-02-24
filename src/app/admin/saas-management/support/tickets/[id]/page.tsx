"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  ArrowLeft,
  Mail,
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
  Check,
  X,
  FileText,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
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
  response_time_minutes: number | null;
  resolution_time_minutes: number | null;
  resolution: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  requester_email: string;
  requester_name: string | null;
  requester_role: string | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
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
}

interface Template {
  id: string;
  name: string;
  subject: string | null;
  content: string;
  category: string | null;
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

const categoryLabels: Record<string, string> = {
  technical: "Técnico",
  billing: "Facturación",
  feature_request: "Funcionalidad",
  bug_report: "Bug",
  account: "Cuenta",
  other: "Otro",
};

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [newResolution, setNewResolution] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<any>({
    resolver: zodResolver(createSaasSupportMessageSchema),
    defaultValues: {
      is_internal: false,
      message_type: "message",
    },
  });

  useEffect(() => {
    fetchTicket();
    fetchMessages();
    fetchTemplates();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/support/tickets/${ticketId}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar el ticket");
      }

      const data = await response.json();
      setTicket(data.ticket);
      setNewStatus(data.ticket.status);
      setNewPriority(data.ticket.priority);
    } catch (err) {
      toast.error("Error al cargar el ticket");
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

  const fetchTemplates = async () => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/support/templates?is_active=true`,
      );

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  const onSubmitMessage: SubmitHandler<any> = async (data) => {
    setSendingMessage(true);
    try {
      const response = await fetch(
        `/api/admin/saas-management/support/tickets/${ticketId}/messages`,
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

  const handleUpdateStatus = async () => {
    setUpdatingTicket(true);
    try {
      const updates: Record<string, unknown> = {
        status: newStatus,
        priority: newPriority,
      };

      if (newStatus === "resolved" || newStatus === "closed") {
        updates.resolution = newResolution || null;
      }

      const response = await fetch(
        `/api/admin/saas-management/support/tickets/${ticketId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error al actualizar ticket");
      }

      toast.success("Ticket actualizado exitosamente");
      setShowStatusDialog(false);
      fetchTicket();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al actualizar ticket",
      );
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setValue("message", template.content);
    setShowTemplateDialog(false);
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
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 rounded-xl border">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Ticket no encontrado
                </h2>
                <Button
                  onClick={() => router.push("/admin/saas-management/support")}
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
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/saas-management/support")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
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
            <Badge className={priorityColors[ticket.priority]}>
              {ticket.priority}
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
                <CardTitle>Detalles del Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Solicitante
                    </Label>
                    <p className="mt-1">
                      {ticket.requester_name || ticket.requester_email}
                    </p>
                    <p className="text-sm text-gray-500">
                      {ticket.requester_email}
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
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Descripción
                  </Label>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>
                {ticket.resolution && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Resolución
                    </Label>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                      {ticket.resolution}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages - sin admin-card para evitar contraste en burbujas */}
            <Card className="rounded-xl border border-border">
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
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg border ${
                          msg.is_internal
                            ? "bg-yellow-50 border-yellow-200"
                            : msg.is_from_customer
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
                            {msg.is_internal && (
                              <Badge variant="outline" className="text-xs">
                                Interno
                              </Badge>
                            )}
                            {msg.is_from_customer && !msg.is_internal && (
                              <Badge variant="outline" className="text-xs">
                                Cliente
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

            {/* Add Message Form - sin admin-card para evitar contraste en textarea */}
            <Card className="rounded-xl border border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Responder</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplateDialog(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Usar Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleSubmit(onSubmitMessage)}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_internal"
                      {...register("is_internal")}
                      className="rounded"
                    />
                    <Label htmlFor="is_internal" className="text-sm">
                      Mensaje interno (no visible para el cliente)
                    </Label>
                  </div>

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
          <div className="space-y-6">
            {/* Quick Actions - sin admin-card para evitar hover conflictivo */}
            <Card className="rounded-xl border border-border">
              <CardHeader>
                <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowStatusDialog(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Cambiar Estado/Prioridad
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowAssignDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Asignar Ticket
                </Button>
              </CardContent>
            </Card>

            {/* Ticket Info - sin admin-card para evitar hover conflictivo */}
            <Card className="rounded-xl border border-border">
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
                      {ticket.response_time_minutes && (
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.floor(ticket.response_time_minutes / 60)}h{" "}
                          {ticket.response_time_minutes % 60}m
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {ticket.assigned_to_user && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-xs text-gray-500">
                        Asignado a
                      </Label>
                      <p className="text-sm font-medium">
                        {ticket.assigned_to_user.email}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
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
                <Select value={newStatus} onValueChange={setNewStatus}>
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
                <Select value={newPriority} onValueChange={setNewPriority}>
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

              {(newStatus === "resolved" || newStatus === "closed") && (
                <div className="space-y-2">
                  <Label>Resolución</Label>
                  <Textarea
                    value={newResolution}
                    onChange={(e) => setNewResolution(e.target.value)}
                    placeholder="Describe la resolución del ticket..."
                    rows={4}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowStatusDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateStatus} disabled={updatingTicket}>
                {updatingTicket ? (
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

        {/* Template Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Seleccionar Template</DialogTitle>
              <DialogDescription>
                Elige un template para usar en tu respuesta
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto py-4">
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay templates disponibles
                </p>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 border rounded-lg hover:bg-epoch-primary/5 cursor-pointer transition-colors"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <div className="font-medium">{template.name}</div>
                    {template.category && (
                      <Badge variant="outline" className="mt-1">
                        {categoryLabels[template.category] || template.category}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTemplateDialog(false)}
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
