"use client";

import { ArrowRight, Loader2, MessageSquare, Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  categoryLabels,
  priorityColors,
  priorityLabels,
  statusColors,
  statusLabels,
  type Ticket,
} from "./types";

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TicketListProps {
  tickets: Ticket[];
  loading: boolean;
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onCreateTicket: () => void;
  hasActiveFilters: boolean;
}

export function TicketList({
  tickets,
  loading,
  pagination,
  onPageChange,
  onCreateTicket,
  hasActiveFilters,
}: TicketListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Tickets ({pagination.total})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">No hay tickets</p>
            <p className="text-sm mb-4">
              {hasActiveFilters
                ? "No hay tickets que coincidan con los filtros"
                : "Crea tu primer ticket de soporte"}
            </p>
            {!hasActiveFilters && (
              <Button onClick={onCreateTicket}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Ticket
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Link href={`/admin/help/tickets/${ticket.id}`} key={ticket.id}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-semibold text-sm">
                        {ticket.ticket_number}
                      </span>
                      <Badge className={statusColors[ticket.status]}>
                        {statusLabels[ticket.status]}
                      </Badge>
                      <Badge className={priorityColors[ticket.priority]}>
                        {priorityLabels[ticket.priority]}
                      </Badge>
                      <Badge variant="outline">
                        {categoryLabels[ticket.category]}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-gray-900">
                      {ticket.subject}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {ticket.assigned_to_user && (
                        <span>Asignado a: {ticket.assigned_to_user.email}</span>
                      )}
                      <span>
                        {new Date(ticket.created_at).toLocaleDateString(
                          "es-CL",
                        )}
                      </span>
                      {ticket.last_response_at && (
                        <span>
                          Última respuesta:{" "}
                          {new Date(ticket.last_response_at).toLocaleDateString(
                            "es-CL",
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={pagination.page === 1}
                size="sm"
                variant="outline"
                onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              >
                Anterior
              </Button>
              <Button
                disabled={pagination.page === pagination.totalPages}
                size="sm"
                variant="outline"
                onClick={() =>
                  onPageChange(
                    Math.min(pagination.totalPages, pagination.page + 1),
                  )
                }
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
