"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { buildPrintContent } from "./printTemplate";
import type { DeliveryError, LabInfo, StatusHistory, WorkOrder } from "./types";

export type { DeliveryError, LabInfo, StatusHistory, WorkOrder };

export function useWorkOrder() {
  const router = useRouter();
  const params = useParams();
  const workOrderId = params.id as string;

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusDialogOpenedFromTimeline, setStatusDialogOpenedFromTimeline] =
    useState(false);
  const [statusNotes, setStatusNotes] = useState("");
  const [labInfo, setLabInfo] = useState<LabInfo>({
    lab_name: "",
    lab_contact: "",
    lab_order_number: "",
    lab_estimated_delivery_date: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [deliveryError, setDeliveryError] = useState<DeliveryError | null>(
    null,
  );
  const [orgName, setOrgName] = useState<string>("Opttius");

  useEffect(() => {
    if (workOrderId) fetchWorkOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  useEffect(() => {
    fetch("/api/admin/organizations/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.organization?.name) setOrgName(data.organization.name);
      })
      .catch(() => {});
  }, []);

  const fetchWorkOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/work-orders/${workOrderId}`);
      if (!response.ok) throw new Error("Failed to fetch work order");
      const data = await response.json();
      setWorkOrder(data.workOrder);
      setStatusHistory(data.statusHistory || []);
      if (data.workOrder) {
        setLabInfo({
          lab_name: data.workOrder.lab_name || "",
          lab_contact: data.workOrder.lab_contact || "",
          lab_order_number: data.workOrder.lab_order_number || "",
          lab_estimated_delivery_date:
            data.workOrder.lab_estimated_delivery_date || "",
        });
      }
    } catch (error) {
      console.error("Error fetching work order:", error);
      toast.error("Error al cargar el trabajo");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!workOrder || !newStatus) return;
    if (newStatus === "delivered") {
      setShowStatusDialog(false);
      setDeliveryDialogOpen(true);
      return;
    }
    setUpdatingStatus(true);
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        notes: statusNotes,
      };
      if (newStatus === "sent_to_lab") {
        updateData.lab_name = labInfo.lab_name;
        updateData.lab_contact = labInfo.lab_contact;
        updateData.lab_order_number = labInfo.lab_order_number;
        updateData.lab_estimated_delivery_date =
          labInfo.lab_estimated_delivery_date;
      }
      const response = await fetch(
        `/api/admin/work-orders/${workOrderId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar estado");
      }
      toast.success("Estado actualizado exitosamente");
      setShowStatusDialog(false);
      setNewStatus("");
      setStatusNotes("");
      fetchWorkOrder();
    } catch (error: unknown) {
      console.error("Error updating status:", error);
      toast.error(
        (error as { message?: string }).message || "Error al actualizar estado",
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeliver = async () => {
    if (!workOrder) return;
    setDelivering(true);
    setDeliveryError(null);
    try {
      const response = await fetch(
        `/api/admin/work-orders/${workOrderId}/deliver`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (data.requiresPayment) {
          setDeliveryError({
            requiresPayment: true,
            balance: data.balance,
            orderId: data.orderId,
            message: data.message,
          });
          return;
        }
        throw new Error(
          data.error || data.message || "Error al entregar trabajo",
        );
      }
      toast.success(data.message || "Trabajo entregado exitosamente");
      setDeliveryDialogOpen(false);
      setDeliveryError(null);
      if (data.workOrder) {
        setWorkOrder(data.workOrder);
      } else {
        await fetchWorkOrder();
      }
    } catch (error: unknown) {
      console.error("Error delivering work order:", error);
      toast.error(
        (error as { message?: string }).message || "Error al entregar trabajo",
      );
    } finally {
      setDelivering(false);
    }
  };

  const handleDelete = async () => {
    if (!workOrder) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/work-orders/${workOrderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowDelivered: true }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar trabajo");
      }
      toast.success("Trabajo eliminado exitosamente");
      router.push("/admin/work-orders");
    } catch (error: unknown) {
      console.error("Error deleting work order:", error);
      toast.error(
        (error as { message?: string }).message || "Error al eliminar trabajo",
      );
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = useCallback(() => {
    if (!workOrder) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Por favor, permite ventanas emergentes para imprimir");
      return;
    }
    printWindow.document.write(buildPrintContent(workOrder, orgName));
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrder, orgName]);

  const getAllStatuses = (): Array<{ value: string; label: string }> => [
    { value: "quote", label: "Presupuesto" },
    { value: "ordered", label: "Ordenado" },
    { value: "sent_to_lab", label: "Enviado al Lab" },
    { value: "received_from_lab", label: "Recibido del Lab" },
    { value: "mounted", label: "Montado" },
    { value: "quality_check", label: "Control de Calidad" },
    { value: "ready_for_pickup", label: "Listo para Retiro" },
    { value: "delivered", label: "Entregado" },
    { value: "cancelled", label: "Cancelado" },
    { value: "returned", label: "Devuelto" },
  ];

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      quote: "Presupuesto",
      ordered: "Ordenado",
      sent_to_lab: "Enviado al Lab",
      received_from_lab: "Recibido del Lab",
      mounted: "Montado",
      quality_check: "Control de Calidad",
      ready_for_pickup: "Listo para Retiro",
      delivered: "Entregado",
      cancelled: "Cancelado",
      returned: "Devuelto",
    };
    return labels[status] || status;
  };

  return {
    workOrder,
    statusHistory,
    loading,
    updatingStatus,
    showStatusDialog,
    newStatus,
    statusDialogOpenedFromTimeline,
    statusNotes,
    labInfo,
    deleteDialogOpen,
    deleting,
    deliveryDialogOpen,
    delivering,
    deliveryError,
    orgName,
    setWorkOrder,
    setShowStatusDialog,
    setNewStatus,
    setStatusDialogOpenedFromTimeline,
    setStatusNotes,
    setLabInfo,
    setDeleteDialogOpen,
    setDeliveryDialogOpen,
    setDeliveryError,
    workOrderId,
    fetchWorkOrder,
    handleStatusUpdate,
    handleDeliver,
    handleDelete,
    handlePrint,
    getAllStatuses,
    getStatusLabel,
  };
}
