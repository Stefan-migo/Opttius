"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useBranch } from "@/hooks/useBranch";
import {
  extractDataFromResponse,
  extractPaginationFromResponse,
} from "@/lib/api/response-helpers";
import type { createOpticalInternalSupportTicketSchema } from "@/lib/api/validation/zod-schemas";
import { getBranchHeader } from "@/lib/utils/branch";
import type { z } from "zod";

import { CreateTicketDialog } from "./CreateTicketDialog";
import { TicketFilters } from "./TicketFilters";
import { TicketList } from "./TicketList";
import { TicketStats } from "./TicketStats";
import type { FiltersState, PaginationState, Ticket } from "./supportConstants";

type TicketForm = z.infer<typeof createOpticalInternalSupportTicketSchema>;

export default function OpticalInternalSupportContent() {
  const router = useRouter();
  const { currentBranchId, isGlobalView, isSuperAdmin, branches } = useBranch();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [customers, setCustomers] = useState<
    Array<{ id: string; first_name: string; last_name: string; email: string }>
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [filters, setFilters] = useState<FiltersState>({
    status: "all",
    priority: "all",
    category: "all",
    branch_id: "all",
    customer_id: "all",
    search: "",
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [filters, pagination.page, currentBranchId]);

  const handleFiltersChange = useCallback(
    (updates: Partial<FiltersState>) => {
      setFilters((prev) => ({ ...prev, ...updates }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    [],
  );

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch("/api/admin/customers?limit=100");
      if (response.ok) {
        const data = await response.json();
        setCustomers(
          extractDataFromResponse<{
            id: string;
            first_name: string;
            last_name: string;
            email: string;
          }>(data),
        );
      }
    } catch (err) {
      console.error("Error loading customers:", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadTickets = useCallback(async () => {
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
      if (filters.customer_id && filters.customer_id !== "all")
        params.append("customer_id", filters.customer_id);
      if (filters.search) params.append("search", filters.search);

      if (!isSuperAdmin && currentBranchId) {
        params.append("branch_id", currentBranchId);
      } else if (isSuperAdmin && !isGlobalView && currentBranchId) {
        params.append("branch_id", currentBranchId);
      } else if (
        isSuperAdmin &&
        isGlobalView &&
        filters.branch_id &&
        filters.branch_id !== "all"
      ) {
        params.append("branch_id", filters.branch_id);
      }

      const headers = getBranchHeader(
        isSuperAdmin && isGlobalView ? null : currentBranchId,
      );
      const response = await fetch(
        `/api/admin/optical-support/tickets?${params.toString()}`,
        { headers },
      );

      if (!response.ok) {
        throw new Error("Error al cargar tickets");
      }

      const data = await response.json();
      const tickets = extractDataFromResponse<Ticket>(data);
      const paginationData = extractPaginationFromResponse(data);
      setTickets(tickets);
      setPagination((prev) => ({
        ...prev,
        total: paginationData.total || 0,
        totalPages: paginationData.totalPages || 0,
      }));
    } catch {
      toast.error("Error al cargar tickets");
    } finally {
      setLoadingTickets(false);
    }
  }, [filters, pagination.page, currentBranchId, isSuperAdmin, isGlobalView]);

  const handleCreateTicket = useCallback(
    async (data: TicketForm) => {
      const branchId =
        isSuperAdmin && isGlobalView
          ? data.branch_id
          : currentBranchId || data.branch_id;
      const payload = { ...data, branch_id: branchId || undefined };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...getBranchHeader(
          isSuperAdmin && isGlobalView ? null : currentBranchId,
        ),
      };
      const response = await fetch("/api/admin/optical-support/tickets", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error al crear ticket");
      }

      const result = await response.json();
      toast.success("Ticket creado exitosamente");
      setShowCreateDialog(false);
      loadTickets();
      if (result.ticket?.id) {
        router.push(`/admin/support/tickets/${result.ticket.id}`);
      }
    },
    [isSuperAdmin, isGlobalView, currentBranchId, loadTickets, router],
  );

  const openTicketsCount = tickets.filter(
    (t) => t.status !== "resolved" && t.status !== "closed",
  ).length;
  const inProgressCount = tickets.filter(
    (t) => t.status === "in_progress",
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed",
  ).length;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-epoch-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-epoch-primary tracking-tight">
          Registro de Incidentes
        </h1>
        <p className="text-sm sm:text-base text-epoch-primary/80 max-w-2xl">
          Registra incidentes y problemas con clientes para análisis y mejora
          del servicio (lentes, entregas, pagos, etc.)
        </p>
        <div className="flex justify-start sm:justify-end">
          <Button
            className="rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase min-h-[44px] px-6 w-full sm:w-auto"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            Crear Ticket
          </Button>
        </div>
      </div>

      <TicketStats
        total={pagination.total}
        openTicketsCount={openTicketsCount}
        inProgressCount={inProgressCount}
        resolvedCount={resolvedCount}
      />

      <TicketFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        customers={customers}
        branches={branches}
        isSuperAdmin={isSuperAdmin}
        isGlobalView={isGlobalView}
        onRefresh={loadTickets}
      />

      <TicketList
        tickets={tickets}
        loading={loadingTickets}
        pagination={pagination}
        onPageChange={(page) =>
          setPagination((prev) => ({ ...prev, page }))
        }
        filters={filters}
        onShowCreateDialog={() => setShowCreateDialog(true)}
      />

      <CreateTicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        currentBranchId={currentBranchId}
        isGlobalView={isGlobalView}
        isSuperAdmin={isSuperAdmin}
        onSubmit={handleCreateTicket}
      />
    </div>
  );
}
