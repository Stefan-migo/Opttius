"use client";

import { ArrowLeft, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TicketHeaderData {
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
}

interface TicketHeaderProps {
  ticket: TicketHeaderData;
  onEdit: () => void;
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

export default function TicketHeader({ ticket, onEdit }: TicketHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-3">
        <Button
          aria-label="Volver a tickets"
          className="rounded-xl text-epoch-primary hover:bg-epoch-primary/10 min-h-[44px] min-w-[44px] shrink-0"
          size="icon"
          variant="ghost"
          onClick={() => router.push("/admin/support")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-epoch-primary tracking-tight truncate">
          Ticket #{ticket.ticket_number}
        </h1>
      </div>
      <p className="text-sm sm:text-base text-epoch-primary/80 line-clamp-2">
        {ticket.subject}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="rounded-xl border-admin-border-primary/20 min-h-[44px] shrink-0"
          variant="outline"
          onClick={onEdit}
        >
          <Edit className="h-4 w-4 mr-2 shrink-0" />
          Editar
        </Button>
        <Badge
          className={`${statusColors[ticket.status]} text-[10px] sm:text-xs px-1.5 py-0`}
        >
          {statusLabels[ticket.status]}
        </Badge>
        <Badge
          className={`${priorityColors[ticket.priority]} text-[10px] sm:text-xs px-1.5 py-0`}
        >
          {priorityLabels[ticket.priority]}
        </Badge>
        <Badge
          className="text-[10px] sm:text-xs px-1.5 py-0"
          variant="outline"
        >
          {categoryLabels[ticket.category]}
        </Badge>
      </div>
    </div>
  );
}
