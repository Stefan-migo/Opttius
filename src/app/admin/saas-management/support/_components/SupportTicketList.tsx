import {
  ArrowRight,
  Building2,
  Loader2,
  MessageSquare,
  User,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  organization?: { id: string; name: string; slug: string } | null;
  assigned_to_user?: { id: string; email: string; role: string } | null;
}

interface SupportTicketListProps {
  tickets: Ticket[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  priorityColors: Record<string, string>;
  categoryLabels: Record<string, string>;
}

export function SupportTicketList({
  tickets,
  loading,
  total,
  page,
  totalPages,
  onPageChange,
  statusLabels,
  statusColors,
  priorityColors,
  categoryLabels,
}: SupportTicketListProps) {
  return (
    <Card className="admin-card">
      <CardHeader>
        <CardTitle className="font-display text-epoch-primary">
          Tickets ({total})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-epoch-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-epoch-primary/70">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-epoch-accent" />
            <p>No hay tickets que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Link
                href={`/admin/saas-management/support/tickets/${ticket.id}`}
                key={ticket.id}
              >
                <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-epoch-primary/5 cursor-pointer transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-semibold text-sm">
                        {ticket.ticket_number}
                      </span>
                      <Badge className={statusColors[ticket.status]}>
                        {statusLabels[ticket.status]}
                      </Badge>
                      <Badge className={priorityColors[ticket.priority]}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant="outline">
                        {categoryLabels[ticket.category]}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-epoch-primary">
                      {ticket.subject}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-epoch-primary/70">
                      {ticket.organization && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {ticket.organization.name}
                        </span>
                      )}
                      {ticket.assigned_to_user && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {ticket.assigned_to_user.email}
                        </span>
                      )}
                      <span>
                        {new Date(ticket.created_at).toLocaleDateString("es-CL")}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-epoch-accent" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-epoch-primary/80">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                className="rounded-xl border-admin-border-primary/20"
                disabled={page === 1}
                size="sm"
                variant="outline"
                onClick={() => onPageChange(Math.max(1, page - 1))}
              >
                Anterior
              </Button>
              <Button
                className="rounded-xl border-admin-border-primary/20"
                disabled={page === totalPages}
                size="sm"
                variant="outline"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
