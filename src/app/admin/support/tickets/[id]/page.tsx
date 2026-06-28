"use client";

import { Loader2, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useBranch } from "@/hooks/useBranch";
import { extractDataFromResponse } from "@/lib/api/response-helpers";

import TicketHeader from "./_components/TicketHeader";
import TicketInfo from "./_components/TicketInfo";
import TicketMessages from "./_components/TicketMessages";
import TicketStatusActions from "./_components/TicketStatusActions";

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

export default function OpticalInternalSupportTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  const { currentBranchId } = useBranch();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [adminUsers, setAdminUsers] = useState<
    Array<{ id: string; email: string; role: string }>
  >([]);

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

  const refreshData = () => {
    fetchTicket();
    fetchMessages();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-epoch-background py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="h-8 w-8 animate-spin text-epoch-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-epoch-background py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 rounded-xl border">
            <CardContent className="p-4 sm:pt-6 sm:p-6">
              <div className="text-center py-6 sm:py-8">
                <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-3 sm:mb-4" />
                <h2 className="text-lg sm:text-xl font-display font-semibold text-epoch-primary mb-2">
                  Ticket no encontrado
                </h2>
                <Button
                  className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase min-h-[44px] px-6"
                  onClick={() => router.push("/admin/support")}
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
    <div className="min-h-screen bg-epoch-background py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <TicketHeader
          ticket={ticket}
          onEdit={() => setShowUpdateDialog(true)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Ticket Details */}
            <Card className="rounded-xl border border-border">
              <CardHeader className="p-4 sm:p-6 pb-0">
                <CardTitle className="font-display text-epoch-primary text-base sm:text-lg">
                  Detalles del Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-4 space-y-4">
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-epoch-primary/80">
                    Descripción
                  </Label>
                  <p className="mt-1 text-epoch-primary whitespace-pre-wrap text-sm sm:text-base">
                    {ticket.description}
                  </p>
                </div>
                {ticket.resolution && (
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-epoch-primary/80">
                      Resolución
                    </Label>
                    <p className="mt-1 text-epoch-primary whitespace-pre-wrap text-sm sm:text-base">
                      {ticket.resolution}
                    </p>
                  </div>
                )}
                {ticket.resolution_notes && (
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-epoch-primary/80">
                      Notas de Resolución
                    </Label>
                    <p className="mt-1 text-epoch-primary whitespace-pre-wrap text-sm sm:text-base">
                      {ticket.resolution_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <TicketMessages
              messages={messages}
              ticketStatus={ticket.status}
              onMessageSent={refreshData}
            />
          </div>

          <div className="space-y-4 sm:space-y-6">
            <TicketInfo ticket={ticket} />
          </div>
        </div>

        <TicketStatusActions
          ticket={ticket}
          adminUsers={adminUsers}
          open={showUpdateDialog}
          onOpenChange={setShowUpdateDialog}
          onTicketUpdated={refreshData}
        />
      </div>
    </div>
  );
}
