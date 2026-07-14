"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useBranch } from "@/hooks/useBranch";
import {
  extractDataFromResponse,
  extractPaginationFromResponse,
} from "@/lib/api/response-helpers";
import { getBranchHeader } from "@/lib/utils/branch";

import { DeleteWorkOrderDialog } from "./DeleteWorkOrderDialog";
import { WorkOrderFilters } from "./WorkOrderFilters";
import { WorkOrderStats } from "./WorkOrderStats";
import { WorkOrderTable } from "./WorkOrderTable";

interface WorkOrder {
  id: string;
  work_order_number: string;
  work_order_date: string;
  customer: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  prescription?: unknown;
  frame_name?: string;
  lens_type?: string;
  lens_material?: string;
  status: string;
  lab_name?: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
  ordered_at?: string;
  sent_to_lab_at?: string;
  lab_completed_at?: string;
  mounted_at?: string;
  ready_at?: string;
  delivered_at?: string;
}

export default function WorkOrdersContent() {
  const {
    currentBranchId,
    isSuperAdmin,
    branches,
    isLoading: branchLoading,
  } = useBranch();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalWorkOrders, setTotalWorkOrders] = useState(0);
  const workOrdersPerPage = 20;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workOrderToDelete, setWorkOrderToDelete] = useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const isGlobalView = !currentBranchId && isSuperAdmin;

  useEffect(() => {
    if (!branchLoading) {
      fetchWorkOrders();
    }
  }, [currentPage, statusFilter, currentBranchId, branchLoading]);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: workOrdersPerPage.toString(),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const headers: HeadersInit = {
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch(`/api/admin/work-orders?${params}`, {
        headers,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch work orders");
      }

      const data = await response.json();
      const pagination = extractPaginationFromResponse(data);
      setWorkOrders(extractDataFromResponse(data));
      setTotalPages(pagination.totalPages || 1);
      setTotalWorkOrders(pagination.total || 0);
    } catch (error) {
      console.error("Error fetching work orders:", error);
      toast.error("Error al cargar trabajos");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (workOrderId: string) => {
    setWorkOrderToDelete(workOrderId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!workOrderToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/work-orders/${workOrderToDelete}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar trabajo");
      }

      toast.success("Trabajo eliminado exitosamente");
      setDeleteDialogOpen(false);
      setWorkOrderToDelete(null);
      fetchWorkOrders();
    } catch (error: unknown) {
      console.error("Error deleting work order:", error);
      toast.error((error as Error).message || "Error al eliminar trabajo");
    } finally {
      setDeleting(false);
    }
  };

  const handlePaymentStatusChange = async (
    workOrderId: string,
    newStatus: string,
  ) => {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getBranchHeader(currentBranchId),
      };

      const response = await fetch(`/api/admin/work-orders/${workOrderId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          payment_status: newStatus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar estado de pago");
      }

      setWorkOrders((prev) =>
        prev.map((wo) =>
          wo.id === workOrderId ? { ...wo, payment_status: newStatus } : wo,
        ),
      );

      toast.success("Estado de pago actualizado");
    } catch (error: unknown) {
      console.error("Error updating payment status:", error);
      toast.error((error as Error).message || "Error al actualizar estado de pago");
      fetchWorkOrders();
    }
  };

  const inLabCount = workOrders.filter((w) =>
    ["sent_to_lab", "in_progress_lab", "ready_at_lab"].includes(w.status),
  ).length;
  const readyForPickupCount = workOrders.filter(
    (w) => w.status === "ready_for_pickup",
  ).length;
  const deliveredCount = workOrders.filter(
    (w) => w.status === "delivered",
  ).length;

  const filteredWorkOrders = workOrders.filter((workOrder) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        workOrder.work_order_number.toLowerCase().includes(searchLower) ||
        workOrder.customer?.email?.toLowerCase().includes(searchLower) ||
        `${workOrder.customer?.first_name || ""} ${workOrder.customer?.last_name || ""}`
          .toLowerCase()
          .includes(searchLower) ||
        workOrder.frame_name?.toLowerCase().includes(searchLower) ||
        workOrder.lab_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-epoch-primary"
            data-tour="work-orders-header"
          >
            Trabajos
          </h1>
          <p className="text-sm text-admin-text-tertiary">
            {isGlobalView
              ? "Gestión de trabajos de laboratorio - Todas las sucursales"
              : "Gestión de trabajos de laboratorio"}
          </p>
        </div>
      </div>

      <WorkOrderStats
        totalWorkOrders={totalWorkOrders}
        inLabCount={inLabCount}
        readyForPickupCount={readyForPickupCount}
        deliveredCount={deliveredCount}
      />

      <WorkOrderFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
      />

      <WorkOrderTable
        workOrders={filteredWorkOrders}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        filteredLength={filteredWorkOrders.length}
        totalWorkOrders={totalWorkOrders}
        searchTerm={searchTerm}
        onPageChange={setCurrentPage}
        onDeleteClick={handleDeleteClick}
        onPaymentStatusChange={handlePaymentStatusChange}
      />

      <DeleteWorkOrderDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        deleting={deleting}
        onDeleteConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setWorkOrderToDelete(null);
        }}
      />
    </div>
  );
}
