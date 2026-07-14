"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Copy,
  Edit,
  Loader2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createSaasSupportMessageSchema } from "@/lib/api/validation/zod-schemas";

import { TicketInfoPanel } from "./TicketInfoPanel";
import { TicketMessageForm } from "./TicketMessageForm";
import { TicketMessagesList } from "./TicketMessagesList";
import { TicketStatusDialog } from "./TicketStatusDialog";
import { TicketTemplateDialog } from "./TicketTemplateDialog";

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
  sender?: { id: string; email: string; role: string } | null;
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
  organization?: { id: string; name: string; slug: string } | null;
  assigned_to_user?: { id: string; email: string; role: string } | null;
  created_by_user?: { id: string; email: string; role: string } | null;
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

export default function TicketDetailContent() {
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
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [newResolution, setNewResolution] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<any>({
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

  const onSubmitMessage: SubmitHandler<unknown> = async (data) => {
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
              size="icon"
              variant="ghost"
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
                  size="icon"
                  title="Copiar número de ticket"
                  variant="ghost"
                  onClick={copyTicketNumber}
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
            {/* Ticket Details */}
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

            <TicketMessagesList messages={messages} />

            <TicketMessageForm
              register={register}
              errors={errors}
              sendingMessage={sendingMessage}
              onSubmit={handleSubmit(onSubmitMessage)}
              onUseTemplate={() => setShowTemplateDialog(true)}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="rounded-xl border border-border">
              <CardHeader>
                <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => setShowStatusDialog(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Cambiar Estado/Prioridad
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => setShowAssignDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Asignar Ticket
                </Button>
              </CardContent>
            </Card>

            <TicketInfoPanel ticket={ticket} />
          </div>
        </div>

        <TicketStatusDialog
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          status={newStatus}
          priority={newPriority}
          resolution={newResolution}
          updating={updatingTicket}
          statusLabels={statusLabels}
          onStatusChange={setNewStatus}
          onPriorityChange={setNewPriority}
          onResolutionChange={setNewResolution}
          onSave={handleUpdateStatus}
        />

        <TicketTemplateDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          templates={templates}
          onSelect={(template) => handleUseTemplate(template as any)}
          categoryLabels={categoryLabels}
        />
      </div>
    </div>
  );
}
