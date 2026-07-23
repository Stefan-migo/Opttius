"use client";

import { HelpCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  extractDataFromResponse,
  extractPaginationFromResponse,
} from "@/lib/api/response-helpers";

import { CreateTicketDialog } from "./_components/CreateTicketDialog";
import { StatsCards } from "./_components/StatsCards";
import { TicketFilters } from "./_components/TicketFilters";
import { TicketList } from "./_components/TicketList";
import type { Ticket } from "./_components/types";

export default function HelpPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    category: "all",
    search: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.status && filters.status !== "all")
        params.append("status", filters.status);
      if (filters.priority && filters.priority !== "all")
        params.append("priority", filters.priority);
      if (filters.category && filters.category !== "all")
        params.append("category", filters.category);
      if (filters.search) params.append("search", filters.search);

      const response = await fetch(
        `/api/admin/saas-management/support/tickets?${params.toString()}`,
      );

      if (!response.ok) {
        if (response.status === 403) {
          setTickets([]);
          setPagination((prev) => ({ ...prev, total: 0, totalPages: 0 }));
          return;
        }
        throw new Error("Error al cargar tickets");
      }

      const data = await response.json();
      const paginationData = extractPaginationFromResponse(data);
      setTickets(extractDataFromResponse<Ticket>(data));
      setPagination((prev) => ({
        ...prev,
        total: paginationData.total || 0,
        totalPages: paginationData.totalPages || 0,
      }));
    } catch (err) {
      toast.error("Error al cargar tickets");
    } finally {
      setLoadingTickets(false);
    }
  };

  const onSubmitTicket = async (data: unknown) => {
    setCreatingTicket(true);
    try {
      const response = await fetch(
        "/api/admin/saas-management/support/tickets",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error al crear ticket");
      }

      const result = await response.json();
      toast.success("Ticket creado exitosamente");
      setShowCreateDialog(false);
      loadTickets();
      if (result.ticket?.id) {
        router.push(`/admin/help/tickets/${result.ticket.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear ticket");
    } finally {
      setCreatingTicket(false);
    }
  };

  const openTicketsCount = tickets.filter(
    (t) => t.status !== "resolved" && t.status !== "closed",
  ).length;

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.category !== "all" ||
    filters.search !== "";

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    // ponytail: resets page to 1 on filter change — fixes original bug where
    // filter change also appended `page: 1` to the filters object (no-op)
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="h-8 w-8" />
            Centro de Ayuda
          </h1>
          <p className="text-gray-600 mt-2">
            Contacta al equipo de soporte técnico de Opttius para resolver
            dudas, reportar problemas o solicitar funcionalidades
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Ticket
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-[var(--admin-bg-tertiary)] border-[var(--accent-foreground)]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--accent-foreground)] mb-1">
                ¿Necesitas ayuda?
              </p>
              <p className="text-sm text-blue-700">
                Si tienes problemas con el sistema, errores técnicos, dudas
                sobre funcionalidades o necesitas ayuda con tu cuenta, crea un
                ticket de soporte y nuestro equipo te ayudará lo antes posible.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <StatsCards
        inProgressCount={
          tickets.filter((t) => t.status === "in_progress").length
        }
        openCount={openTicketsCount}
        resolvedCount={
          tickets.filter(
            (t) => t.status === "resolved" || t.status === "closed",
          ).length
        }
        total={pagination.total}
      />

      <TicketFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={loadTickets}
      />

      <TicketList
        hasActiveFilters={hasActiveFilters}
        loading={loadingTickets}
        pagination={pagination}
        tickets={tickets}
        onCreateTicket={() => setShowCreateDialog(true)}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
      />

      <CreateTicketDialog
        creating={creatingTicket}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={onSubmitTicket}
      />
    </div>
  );
}
