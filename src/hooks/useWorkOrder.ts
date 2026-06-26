"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatCurrency, formatDate } from "@/lib/utils";

export interface WorkOrder {
  id: string;
  work_order_number: string;
  work_order_date: string;
  customer: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  prescription?: unknown;
  quote?: unknown;
  frame_product?: unknown;
  frame_name: string;
  frame_brand?: string;
  frame_model?: string;
  frame_color?: string;
  frame_size?: string;
  frame_sku?: string;
  frame_serial_number?: string;
  lens_type: string;
  lens_material: string;
  lens_index?: number;
  lens_treatments?: string[];
  lens_tint_color?: string;
  lens_tint_percentage?: number;
  lab_name?: string;
  lab_contact?: string;
  lab_order_number?: string;
  lab_estimated_delivery_date?: string;
  status: string;
  ordered_at?: string;
  sent_to_lab_at?: string;
  lab_started_at?: string;
  lab_completed_at?: string;
  received_from_lab_at?: string;
  mounted_at?: string;
  quality_checked_at?: string;
  ready_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  frame_cost: number;
  lens_cost: number;
  treatments_cost: number;
  labor_cost: number;
  lab_cost: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  payment_status: string;
  payment_method?: string;
  deposit_amount: number;
  balance_amount: number;
  internal_notes?: string;
  customer_notes?: string;
  lab_notes?: string;
  quality_notes?: string;
  cancellation_reason?: string;
  assigned_staff?: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
  pos_order_id?: string;
  created_at: string;
  presbyopia_solution?: string | null;
  far_lens_family_id?: string | null;
  near_lens_family_id?: string | null;
  far_lens_cost?: number | null;
  near_lens_cost?: number | null;
  lens_family?: { id: string; name: string } | null;
  far_lens_family?: { id: string; name: string } | null;
  near_lens_family?: { id: string; name: string } | null;
}

export interface StatusHistory {
  id: string;
  from_status: string;
  to_status: string;
  changed_at: string;
  notes?: string;
  changed_by_user?: {
    first_name?: string;
    last_name?: string;
  };
}

export interface DeliveryError {
  requiresPayment: boolean;
  balance?: number;
  orderId?: string;
  message?: string;
}

export interface LabInfo {
  lab_name: string;
  lab_contact: string;
  lab_order_number: string;
  lab_estimated_delivery_date: string;
}

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
    if (workOrderId) {
      fetchWorkOrder();
    }
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
      if (!response.ok) {
        throw new Error("Failed to fetch work order");
      }

      const data = await response.json();
      setWorkOrder(data.workOrder);
      setStatusHistory(data.statusHistory || []);

      // Set lab info if available
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

    // If trying to deliver, use the deliver endpoint instead
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

      // Add lab info if sending to lab
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
        // Check if it's a payment requirement error
        if (data.requiresPayment) {
          setDeliveryError({
            requiresPayment: true,
            balance: data.balance,
            orderId: data.orderId,
            message: data.message,
          });
          setDelivering(false);
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

    const customerName =
      workOrder.customer?.first_name && workOrder.customer?.last_name
        ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
        : "Sin nombre";

    const statusLabels: Record<string, string> = {
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

    const rx = (v: number | null | undefined) =>
      v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${v}` : "-";

    const p = workOrder.prescription as Record<string, unknown> | null;
    const rxSection = p
      ? `
      <div class="section">
        <h2>Receta (Para Laboratorio)</h2>
        <div class="rx-grid">
          <div>
            <strong>OD:</strong> Esf ${rx(p.od_sphere as number | null)} | Cil ${rx(p.od_cylinder as number | null)} | Eje ${(p.od_axis as string) ?? "-"}° | Add ${(p.od_add as string) ?? "-"} | PD ${(p.od_pd as string) ?? "-"} mm${(p.od_near_pd as number | null) != null ? ` | PD Cerca ${p.od_near_pd} mm` : ""}${((p.od_prism as number | null) ?? (p.prism_od as number | null)) != null ? ` | Prisma ${(p.od_prism as number | null) ?? (p.prism_od as number | null)}` : ""}${(p.od_base as string | null) != null ? ` | Base ${p.od_base}` : ""}
          </div>
          <div>
            <strong>OS:</strong> Esf ${rx(p.os_sphere as number | null)} | Cil ${rx(p.os_cylinder as number | null)} | Eje ${(p.os_axis as string) ?? "-"}° | Add ${(p.os_add as string) ?? "-"} | PD ${(p.os_pd as string) ?? "-"} mm${(p.os_near_pd as number | null) != null ? ` | PD Cerca ${p.os_near_pd} mm` : ""}${((p.os_prism as number | null) ?? (p.prism_os as number | null)) != null ? ` | Prisma ${(p.os_prism as number | null) ?? (p.prism_os as number | null)}` : ""}${(p.os_base as string | null) != null ? ` | Base ${p.os_base}` : ""}
          </div>
        </div>
        ${
          (p.frame_pd as number | null) != null ||
          (p.height_segmentation as number | null) != null ||
          (p.issued_by as string | null)
            ? `
        <div class="rx-extra mt-2">
          ${(p.frame_pd as number | null) != null ? `<span>DP Marco: ${p.frame_pd} mm</span>` : ""}
          ${(p.height_segmentation as number | null) != null ? `<span>Altura Segmento: ${p.height_segmentation} mm</span>` : ""}
          ${(p.issued_by as string | null) ? `<span>Prescrito por: ${p.issued_by}${(p.issued_by_license as string | null) ? ` (${p.issued_by_license})` : ""}</span>` : ""}
        </div>
        `
            : ""
        }
        ${(p.notes as string | null) ? `<p class="mt-2"><em>Notas:</em> ${String(p.notes).replace(/\n/g, "<br>")}</p>` : ""}
      </div>
    `
      : "";

    const labSection = workOrder.lab_name
      ? `
      <div class="section">
        <h2>Laboratorio</h2>
        <p><strong>${workOrder.lab_name}</strong></p>
        ${workOrder.lab_order_number ? `<p>Orden Lab: ${workOrder.lab_order_number}</p>` : ""}
      </div>
    `
      : "";

    const notesSection =
      workOrder.internal_notes || workOrder.lab_notes
        ? `
      <div class="section">
        <h2>Notas</h2>
        ${workOrder.internal_notes ? `<p>${String(workOrder.internal_notes).replace(/\n/g, "<br>")}</p>` : ""}
        ${workOrder.lab_notes ? `<p><em>Lab:</em> ${String(workOrder.lab_notes).replace(/\n/g, "<br>")}</p>` : ""}
      </div>
    `
        : "";

    const treatmentsList =
      workOrder.lens_treatments && workOrder.lens_treatments.length > 0
        ? workOrder.lens_treatments.join(", ")
        : "Ninguno";

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Orden de Trabajo ${workOrder.work_order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 210mm; margin: 0 auto; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
            .header h1 { margin: 0; font-size: 20px; }
            .meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .badge { display: inline-block; padding: 4px 8px; background: #e5e7eb; border-radius: 4px; font-size: 12px; margin-right: 8px; }
            .section { margin-bottom: 20px; padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; }
            .section h2 { margin: 0 0 12px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .rx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; }
            .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 12px; margin-top: 12px; }
            .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${orgName}</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px;">Orden de Trabajo #${workOrder.work_order_number}</p>
          </div>

          <div class="meta">
            <span>${formatDate(workOrder.work_order_date, { format: "long", locale: "es-CL" })}</span>
            <span>
              <span class="badge">${statusLabels[workOrder.status] || workOrder.status}</span>
              <span class="badge">Pago: ${workOrder.payment_status}</span>
            </span>
          </div>

          <div class="section">
            <h2>Cliente</h2>
            <p><strong>${customerName}</strong></p>
            ${workOrder.customer?.email ? `<p>${workOrder.customer.email}</p>` : ""}
            ${workOrder.customer?.phone ? `<p>${workOrder.customer.phone}</p>` : ""}
          </div>

          <div class="info-grid">
            <div class="section">
              <h2>Marco</h2>
              <p><strong>${workOrder.frame_name}</strong></p>
              ${workOrder.frame_brand ? `<p>Marca: ${workOrder.frame_brand}</p>` : ""}
              ${workOrder.frame_model ? `<p>Modelo: ${workOrder.frame_model}</p>` : ""}
              ${workOrder.frame_serial_number ? `<p>Serie: ${workOrder.frame_serial_number}</p>` : ""}
            </div>
            <div class="section">
              <h2>Lente</h2>
              <p><strong>${workOrder.lens_type}</strong></p>
              <p>Material: ${workOrder.lens_material}</p>
              ${workOrder.lens_index ? `<p>Índice: ${workOrder.lens_index}</p>` : ""}
              <p>Tratamientos: ${treatmentsList}</p>
            </div>
          </div>

          ${rxSection}
          ${labSection}
          ${notesSection}

          <div class="section">
            <h2>Total</h2>
            <div class="total-row">${formatCurrency(workOrder.total_amount)}</div>
            ${
              workOrder.deposit_amount && workOrder.deposit_amount > 0
                ? `
              <p>Depósito: ${formatCurrency(workOrder.deposit_amount)}</p>
              ${
                workOrder.balance_amount !== undefined &&
                workOrder.balance_amount > 0
                  ? `
                <p style="color: #ea580c; font-weight: 600;">Saldo Pendiente: ${formatCurrency(workOrder.balance_amount)}</p>
              `
                  : ""
              }
            `
                : ""
            }
          </div>

          <div class="footer">
            Documento generado el ${formatDate(new Date(), { locale: "es-CL" })}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrder, orgName]);

  const getAllStatuses = (): Array<{ value: string; label: string }> => {
    return [
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
  };

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
