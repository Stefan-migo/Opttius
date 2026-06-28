"use client";

import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Receipt,
  User,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface TicketCustomer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface TicketBranch {
  id: string;
  name: string;
  code: string;
}

interface TicketRelatedOrder {
  id: string;
  order_number: string;
}

interface TicketRelatedWorkOrder {
  id: string;
  work_order_number: string;
}

interface TicketRelatedQuote {
  id: string;
  quote_number: string;
}

interface TicketRelatedAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
}

interface TicketUser {
  id: string;
  email: string;
  role: string;
}

interface TicketInfoData {
  customer?: TicketCustomer | null;
  branch?: TicketBranch | null;
  related_order?: TicketRelatedOrder | null;
  related_work_order?: TicketRelatedWorkOrder | null;
  related_quote?: TicketRelatedQuote | null;
  related_appointment?: TicketRelatedAppointment | null;
  created_at: string;
  created_by_user?: TicketUser | null;
  first_response_at?: string | null;
  assigned_to_user?: TicketUser | null;
  assigned_at?: string | null;
  resolved_at?: string | null;
  resolved_by_user?: TicketUser | null;
}

interface TicketInfoProps {
  ticket: TicketInfoData;
}

export default function TicketInfo({ ticket }: TicketInfoProps) {
  return (
    <Card className="rounded-xl border border-border">
      <CardHeader className="p-4 sm:p-6 pb-0">
        <CardTitle className="text-base sm:text-lg font-display text-epoch-primary">
          Información
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-4 space-y-4">
        {ticket.customer && (
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <Label className="text-[10px] sm:text-xs text-epoch-primary/70">
                Cliente
              </Label>
              <p className="text-xs sm:text-sm font-medium">
                {ticket.customer.first_name} {ticket.customer.last_name}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                {ticket.customer.email}
              </p>
              {ticket.customer.phone && (
                <p className="text-[10px] sm:text-xs text-gray-500">
                  {ticket.customer.phone}
                </p>
              )}
              <Link
                className="text-[10px] sm:text-xs text-epoch-accent hover:text-epoch-primary hover:underline mt-1 inline-block"
                href={`/admin/customers/${ticket.customer.id}`}
              >
                Ver cliente →
              </Link>
            </div>
          </div>
        )}

        {ticket.branch && (
          <div className="flex items-start gap-3">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <Label className="text-[10px] sm:text-xs text-epoch-primary/70">
                Sucursal
              </Label>
              <p className="text-xs sm:text-sm font-medium">
                {ticket.branch.name}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500">
                {ticket.branch.code}
              </p>
            </div>
          </div>
        )}

        {ticket.related_order && (
          <div className="flex items-start gap-3">
            <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <Label className="text-[10px] sm:text-xs text-epoch-primary/70">
                Pedido Relacionado
              </Label>
              <Link
                className="text-xs sm:text-sm font-medium text-epoch-accent hover:text-epoch-primary hover:underline block truncate"
                href={`/admin/orders/${ticket.related_order.id}`}
              >
                {ticket.related_order.order_number} →
              </Link>
            </div>
          </div>
        )}

        {ticket.related_work_order && (
          <div className="flex items-start gap-3">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <Label className="text-[10px] sm:text-xs text-epoch-primary/70">
                Trabajo Relacionado
              </Label>
              <Link
                className="text-xs sm:text-sm font-medium text-epoch-accent hover:text-epoch-primary hover:underline block truncate"
                href={`/admin/work-orders/${ticket.related_work_order.id}`}
              >
                {ticket.related_work_order.work_order_number} →
              </Link>
            </div>
          </div>
        )}

        {ticket.related_quote && (
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <Label className="text-[10px] sm:text-xs text-epoch-primary/70">
                Presupuesto Relacionado
              </Label>
              <Link
                className="text-xs sm:text-sm font-medium text-epoch-accent hover:text-epoch-primary hover:underline block truncate"
                href={`/admin/quotes/${ticket.related_quote.id}`}
              >
                {ticket.related_quote.quote_number} →
              </Link>
            </div>
          </div>
        )}

        {ticket.related_appointment && (
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <Label className="text-[10px] sm:text-xs text-epoch-primary/70">
                Cita Relacionada
              </Label>
              <p className="text-xs sm:text-sm font-medium">
                {new Date(
                  ticket.related_appointment.appointment_date,
                ).toLocaleDateString("es-CL")}{" "}
                {ticket.related_appointment.appointment_time}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-epoch-accent mt-0.5 shrink-0" />
          <div className="min-w-0">
            <Label className="text-[10px] sm:text-xs text-epoch-primary/70">
              Creado
            </Label>
            <p className="text-xs sm:text-sm font-medium">
              {new Date(ticket.created_at).toLocaleString("es-CL")}
            </p>
            {ticket.created_by_user && (
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                Por: {ticket.created_by_user.email}
              </p>
            )}
          </div>
        </div>

        {ticket.first_response_at && (
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <Label className="text-[10px] sm:text-xs text-epoch-primary/70">
                Primera Respuesta
              </Label>
              <p className="text-xs sm:text-sm font-medium">
                {new Date(ticket.first_response_at).toLocaleString(
                  "es-CL",
                )}
              </p>
            </div>
          </div>
        )}

        {ticket.assigned_to_user && (
          <div className="flex items-start gap-3">
            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <Label className="text-[10px] sm:text-xs text-epoch-primary/70">
                Asignado a
              </Label>
              <p className="text-xs sm:text-sm font-medium truncate">
                {ticket.assigned_to_user.email}
              </p>
              {ticket.assigned_at && (
                <p className="text-[10px] sm:text-xs text-gray-500">
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
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <Label className="text-[10px] sm:text-xs text-epoch-primary/70">
                Resuelto
              </Label>
              <p className="text-xs sm:text-sm font-medium">
                {new Date(ticket.resolved_at).toLocaleString("es-CL")}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                Por: {ticket.resolved_by_user.email}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
