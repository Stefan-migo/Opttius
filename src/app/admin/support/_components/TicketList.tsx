import { ArrowRight, Loader2, MessageSquare, Plus, User } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  categoryLabels,
  type FiltersState,
  type PaginationState,
  priorityColors,
  priorityLabels,
  statusColors,
  statusLabels,
  type Ticket,
} from "./supportConstants";

interface TicketListProps {
  tickets: Ticket[];
  loading: boolean;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  filters: {
    status: string;
    priority: string;
    category: string;
    search: string;
  };
  onShowCreateDialog: () => void;
}

function hasActiveFilters(filters: TicketListProps["filters"]) {
  return (
    (filters.status && filters.status !== "all") ||
    (filters.priority && filters.priority !== "all") ||
    (filters.category && filters.category !== "all") ||
    !!filters.search
  );
}

export function TicketList({
  tickets,
  loading,
  pagination,
  onPageChange,
  filters,
  onShowCreateDialog,
}: TicketListProps) {
  return (
    <Card className="rounded-xl border border-border">
      <CardHeader className="p-4 sm:p-6 pb-0">
        <CardTitle className="text-base sm:text-lg">
          Tickets ({pagination.total})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-epoch-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-epoch-primary/70 px-2">
            <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-400" />
            <p className="text-base sm:text-lg font-medium mb-1 sm:mb-2">
              No hay tickets
            </p>
            <p className="text-xs sm:text-sm mb-4 max-w-xs mx-auto">
              {hasActiveFilters(filters)
                ? "No hay tickets que coincidan con los filtros"
                : "Crea tu primer ticket de soporte interno"}
            </p>
            {!hasActiveFilters(filters) && (
              <Button
                className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase min-h-[44px] px-6"
                onClick={onShowCreateDialog}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Ticket
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {tickets.map((ticket) => (
              <Link
                className="block min-h-[44px]"
                href={`/admin/support/tickets/${ticket.id}`}
                key={ticket.id}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-xl hover:bg-epoch-primary/5 cursor-pointer transition-colors border-epoch-primary/10">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                      <span className="font-mono font-semibold text-xs sm:text-sm shrink-0">
                        {ticket.ticket_number}
                      </span>
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
                      {ticket.branch && (
                        <Badge
                          className="text-[10px] sm:text-xs px-1.5 py-0"
                          variant="outline"
                        >
                          {ticket.branch.name}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-epoch-primary text-sm sm:text-base line-clamp-2 sm:line-clamp-1">
                      {ticket.subject}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-epoch-primary/70">
                      {ticket.customer && (
                        <span className="flex items-center gap-1 truncate">
                          <User className="h-3 w-3 shrink-0" />
                          {ticket.customer.first_name}{" "}
                          {ticket.customer.last_name}
                        </span>
                      )}
                      {ticket.assigned_to_user && (
                        <span className="truncate max-w-[120px] sm:max-w-none">
                          {ticket.assigned_to_user.email}
                        </span>
                      )}
                      <span className="shrink-0">
                        {new Date(ticket.created_at).toLocaleDateString(
                          "es-CL",
                        )}
                      </span>
                      {ticket.last_response_at && (
                        <span className="hidden sm:inline">
                          Última:{" "}
                          {new Date(
                            ticket.last_response_at,
                          ).toLocaleDateString("es-CL")}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-epoch-accent shrink-0 self-end sm:self-center" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t">
            <p className="text-xs sm:text-sm text-epoch-primary/80 order-2 sm:order-1 text-center sm:text-left">
              Página {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex gap-2 justify-center sm:justify-end order-1 sm:order-2">
              <Button
                className="rounded-xl border-admin-border-primary/20 min-h-[44px]"
                disabled={pagination.page === 1}
                size="sm"
                variant="outline"
                onClick={() => onPageChange(pagination.page - 1)}
              >
                Anterior
              </Button>
              <Button
                className="rounded-xl border-admin-border-primary/20 min-h-[44px]"
                disabled={pagination.page === pagination.totalPages}
                size="sm"
                variant="outline"
                onClick={() => onPageChange(pagination.page + 1)}
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
