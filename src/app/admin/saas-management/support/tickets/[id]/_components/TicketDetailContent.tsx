"use client";

import {
  ArrowLeft,
  Copy,
  Edit,
  Loader2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { TicketInfoPanel } from "./TicketInfoPanel";
import { TicketMessageForm } from "./TicketMessageForm";
import { TicketMessagesList } from "./TicketMessagesList";
import { TicketStatusDialog } from "./TicketStatusDialog";
import { TicketTemplateDialog } from "./TicketTemplateDialog";
import { useTicketDetail } from "./useTicketDetail";

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
  const {
    ticket,
    messages,
    templates,
    loading,
    sendingMessage,
    updatingTicket,
    showAssignDialog,
    showStatusDialog,
    showTemplateDialog,
    newStatus,
    newPriority,
    newResolution,
    register,
    errors,
    handleSubmit,
    setShowAssignDialog,
    setShowStatusDialog,
    setShowTemplateDialog,
    setNewStatus,
    setNewPriority,
    setNewResolution,
    onSubmitMessage,
    handleUpdateStatus,
    handleUseTemplate,
    copyTicketNumber,
  } = useTicketDetail();

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
              errors={errors}
              register={register}
              sendingMessage={sendingMessage}
              onSubmit={handleSubmit(onSubmitMessage)}
              onUseTemplate={() => setShowTemplateDialog(true)}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
          priority={newPriority}
          resolution={newResolution}
          status={newStatus}
          statusLabels={statusLabels}
          updating={updatingTicket}
          onOpenChange={setShowStatusDialog}
          onPriorityChange={setNewPriority}
          onResolutionChange={setNewResolution}
          onSave={handleUpdateStatus}
          onStatusChange={setNewStatus}
        />

        <TicketTemplateDialog
          categoryLabels={categoryLabels}
          open={showTemplateDialog}
          templates={templates}
          onOpenChange={setShowTemplateDialog}
          onSelect={(template) => handleUseTemplate(template as Record<string, unknown>)}
        />
      </div>
    </div>
  );
}
