"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Edit,
  FileText,
  User,
  Eye,
  Package,
  Calculator,
  Calendar,
  DollarSign,
  Factory,
  CheckCircle,
  Clock,
  Send,
  Truck,
  AlertCircle,
  XCircle,
  RefreshCw,
  Printer,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { getLensTypeLabel } from "@/lib/lens-type-labels";
import { PrescriptionFullDisplay } from "@/components/admin/PrescriptionFullDisplay";

interface WorkOrder {
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
  prescription?: any;
  quote?: any;
  frame_product?: any;
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

interface StatusHistory {
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

export default function WorkOrderDetailPage() {
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
  const [labInfo, setLabInfo] = useState({
    lab_name: "",
    lab_contact: "",
    lab_order_number: "",
    lab_estimated_delivery_date: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [deliveryError, setDeliveryError] = useState<{
    requiresPayment: boolean;
    balance?: number;
    orderId?: string;
    message?: string;
  } | null>(null);
  const [orgName, setOrgName] = useState<string>("Opttius");

  useEffect(() => {
    if (workOrderId) {
      fetchWorkOrder();
    }
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
      const updateData: any = {
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
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Error al actualizar estado");
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

      // Success - even if workOrder is null (backend will handle refresh)
      toast.success(data.message || "Trabajo entregado exitosamente");
      setDeliveryDialogOpen(false);
      setDeliveryError(null);

      // Refresh work order data
      if (data.workOrder) {
        setWorkOrder(data.workOrder);
      } else {
        // Backend couldn't fetch updated data, but delivery was successful
        // Refresh manually
        await fetchWorkOrder();
      }
    } catch (error: any) {
      console.error("Error delivering work order:", error);
      toast.error(error.message || "Error al entregar trabajo");
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
    } catch (error: any) {
      console.error("Error deleting work order:", error);
      toast.error(error.message || "Error al eliminar trabajo");
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { variant: any; label: string; icon: any; color: string }
    > = {
      quote: {
        variant: "outline",
        label: "Presupuesto",
        icon: FileText,
        color: "text-gray-600",
      },
      ordered: {
        variant: "secondary",
        label: "Ordenado",
        icon: Package,
        color: "text-blue-600",
      },
      sent_to_lab: {
        variant: "default",
        label: "Enviado al Lab",
        icon: Send,
        color: "text-purple-600",
      },
      in_progress_lab: {
        variant: "default",
        label: "En Lab",
        icon: Factory,
        color: "text-orange-600",
      },
      ready_at_lab: {
        variant: "default",
        label: "Listo en Lab",
        icon: CheckCircle,
        color: "text-green-600",
      },
      received_from_lab: {
        variant: "secondary",
        label: "Recibido",
        icon: Truck,
        color: "text-blue-600",
      },
      mounted: {
        variant: "default",
        label: "Montado",
        icon: Package,
        color: "text-indigo-600",
      },
      quality_check: {
        variant: "secondary",
        label: "Control Calidad",
        icon: CheckCircle,
        color: "text-yellow-600",
      },
      ready_for_pickup: {
        variant: "default",
        label: "Listo para Retiro",
        icon: CheckCircle,
        color: "text-green-600",
      },
      delivered: {
        variant: "default",
        label: "Entregado",
        icon: CheckCircle,
        color: "text-green-600",
      },
      cancelled: {
        variant: "destructive",
        label: "Cancelado",
        icon: XCircle,
        color: "text-red-600",
      },
      returned: {
        variant: "destructive",
        label: "Devuelto",
        icon: AlertCircle,
        color: "text-red-600",
      },
    };

    const statusConfig = config[status] || {
      variant: "outline",
      label: status,
      icon: Package,
      color: "text-gray-600",
    };
    const Icon = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  // Get all available statuses (removed lab-specific statuses)
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

    const p = workOrder.prescription;
    const rxSection = p
      ? `
      <div class="section">
        <h2>Receta (Para Laboratorio)</h2>
        <div class="rx-grid">
          <div>
            <strong>OD:</strong> Esf ${rx(p.od_sphere)} | Cil ${rx(p.od_cylinder)} | Eje ${p.od_axis ?? "-"}° | Add ${p.od_add ?? "-"} | PD ${p.od_pd ?? "-"} mm${p.od_near_pd != null ? ` | PD Cerca ${p.od_near_pd} mm` : ""}${(p.od_prism ?? p.prism_od) != null ? ` | Prisma ${p.od_prism ?? p.prism_od}` : ""}${p.od_base != null ? ` | Base ${p.od_base}` : ""}
          </div>
          <div>
            <strong>OS:</strong> Esf ${rx(p.os_sphere)} | Cil ${rx(p.os_cylinder)} | Eje ${p.os_axis ?? "-"}° | Add ${p.os_add ?? "-"} | PD ${p.os_pd ?? "-"} mm${p.os_near_pd != null ? ` | PD Cerca ${p.os_near_pd} mm` : ""}${(p.os_prism ?? p.prism_os) != null ? ` | Prisma ${p.os_prism ?? p.prism_os}` : ""}${p.os_base != null ? ` | Base ${p.os_base}` : ""}
          </div>
        </div>
        ${
          p.frame_pd != null || p.height_segmentation != null || p.issued_by
            ? `
        <div class="rx-extra mt-2">
          ${p.frame_pd != null ? `<span>DP Marco: ${p.frame_pd} mm</span>` : ""}
          ${p.height_segmentation != null ? `<span>Altura Segmento: ${p.height_segmentation} mm</span>` : ""}
          ${p.issued_by ? `<span>Prescrito por: ${p.issued_by}${p.issued_by_license ? ` (${p.issued_by_license})` : ""}</span>` : ""}
        </div>
        `
            : ""
        }
        ${p.notes ? `<p class="mt-2"><em>Notas:</em> ${String(p.notes).replace(/\n/g, "<br>")}</p>` : ""}
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
  }, [workOrder, orgName]);

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      pending: { variant: "outline", label: "Pendiente" },
      partial: { variant: "secondary", label: "Parcial" },
      paid: { variant: "default", label: "Pagado" },
      refunded: { variant: "destructive", label: "Reembolsado" },
    };

    const statusConfig = config[status] || {
      variant: "outline",
      label: status,
    };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-epoch-primary">
              Cargando...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-epoch-primary">
              Trabajo no encontrado
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const customerName =
    workOrder.customer?.first_name && workOrder.customer?.last_name
      ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
      : "Sin nombre";

  // Get all available statuses except the current one (for "Cambiar Estado" button)
  const availableStatuses = getAllStatuses().filter(
    (s) => s.value !== workOrder.status,
  );
  // When opened from timeline, show all statuses including current (for view/edit)
  const statusOptions = statusDialogOpenedFromTimeline
    ? getAllStatuses()
    : availableStatuses;

  return (
    <div className="space-y-6">
      {/* Header - multi-row on mobile */}
      <div className="flex flex-col gap-2 sm:gap-3">
        {/* Row 1: Back + Title */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-epoch-primary truncate min-w-0">
            {workOrder.work_order_number}
          </h1>
        </div>
        {/* Row 2: Subtitle */}
        <p className="text-xs sm:text-sm text-admin-text-tertiary">
          Trabajo para {customerName}
        </p>
        {/* Row 3: Badge + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative inline-block">
            <Badge className="bg-green-500 hover:bg-green-600 text-white border-green-600 font-semibold flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 shadow-md text-xs sm:text-sm">
              {(() => {
                const statusConfig: Record<
                  string,
                  { label: string; icon: any }
                > = {
                  quote: { label: "Presupuesto", icon: FileText },
                  ordered: { label: "Ordenado", icon: Package },
                  sent_to_lab: { label: "Enviado al Lab", icon: Send },
                  received_from_lab: { label: "Recibido", icon: Truck },
                  mounted: { label: "Montado", icon: Package },
                  quality_check: {
                    label: "Control Calidad",
                    icon: CheckCircle,
                  },
                  ready_for_pickup: {
                    label: "Listo para Retiro",
                    icon: CheckCircle,
                  },
                  delivered: { label: "Entregado", icon: CheckCircle },
                  cancelled: { label: "Cancelado", icon: XCircle },
                  returned: { label: "Devuelto", icon: AlertCircle },
                };
                const config = statusConfig[workOrder.status] || {
                  label: workOrder.status,
                  icon: Package,
                };
                const Icon = config.icon;
                return (
                  <>
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{config.label}</span>
                    <span className="hidden sm:inline ml-1.5 text-xs bg-green-600 px-2 py-0.5 rounded-full font-bold border border-green-700">
                      ACTUAL
                    </span>
                  </>
                );
              })()}
            </Badge>
          </div>
          <Dialog
            open={showStatusDialog}
            onOpenChange={(open) => {
              setShowStatusDialog(open);
              if (!open) setStatusDialogOpenedFromTimeline(false);
            }}
          >
            {availableStatuses.length > 0 && (
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusDialogOpenedFromTimeline(false)}
                  className="h-9 min-w-0 sm:w-auto sm:px-3 gap-1.5"
                  aria-label="Cambiar estado"
                >
                  <Edit className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-sm whitespace-nowrap">
                    <span className="sm:hidden">Cambiar</span>
                    <span className="hidden sm:inline">Cambiar Estado</span>
                  </span>
                </Button>
              </DialogTrigger>
            )}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cambiar Estado del Trabajo</DialogTitle>
                <DialogDescription>
                  Selecciona el nuevo estado del trabajo. Puedes cambiar a
                  cualquier estado disponible.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nuevo Estado</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el nuevo estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newStatus === "sent_to_lab" && (
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <Label>Nombre del Laboratorio *</Label>
                      <Input
                        value={labInfo.lab_name}
                        onChange={(e) =>
                          setLabInfo((prev) => ({
                            ...prev,
                            lab_name: e.target.value,
                          }))
                        }
                        placeholder="Ej: Laboratorio Óptico Central"
                      />
                    </div>
                    <div>
                      <Label>Contacto del Laboratorio</Label>
                      <Input
                        value={labInfo.lab_contact}
                        onChange={(e) =>
                          setLabInfo((prev) => ({
                            ...prev,
                            lab_contact: e.target.value,
                          }))
                        }
                        placeholder="Teléfono o email"
                      />
                    </div>
                    <div>
                      <Label>Número de Orden del Lab</Label>
                      <Input
                        value={labInfo.lab_order_number}
                        onChange={(e) =>
                          setLabInfo((prev) => ({
                            ...prev,
                            lab_order_number: e.target.value,
                          }))
                        }
                        placeholder="Número asignado por el laboratorio"
                      />
                    </div>
                    <div>
                      <Label>Fecha Estimada de Entrega</Label>
                      <Input
                        type="date"
                        value={labInfo.lab_estimated_delivery_date}
                        onChange={(e) =>
                          setLabInfo((prev) => ({
                            ...prev,
                            lab_estimated_delivery_date: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Notas sobre el cambio de estado..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowStatusDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={
                      updatingStatus ||
                      !newStatus ||
                      (newStatus === "sent_to_lab" && !labInfo.lab_name)
                    }
                  >
                    {updatingStatus ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      "Actualizar Estado"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 w-9 sm:w-auto sm:px-3"
            aria-label="Imprimir"
          >
            <Printer className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden lg:inline">Imprimir</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="h-9 w-9 sm:w-auto sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden lg:inline">Eliminar</span>
          </Button>
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Flujo de Trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const steps = [
              {
                status: "quote",
                label: "Presupuesto",
                date:
                  workOrder.status === "quote"
                    ? workOrder.work_order_date || workOrder.created_at
                    : null,
              },
              {
                status: "ordered",
                label: "Ordenado",
                date:
                  workOrder.ordered_at ||
                  (workOrder.status === "ordered"
                    ? workOrder.work_order_date || workOrder.created_at
                    : null),
              },
              {
                status: "sent_to_lab",
                label: "Enviado al Lab",
                date: workOrder.sent_to_lab_at,
              },
              {
                status: "received_from_lab",
                label: "Recibido del Lab",
                date: workOrder.received_from_lab_at,
              },
              {
                status: "mounted",
                label: "Montado",
                date: workOrder.mounted_at,
              },
              {
                status: "quality_check",
                label: "Control Calidad",
                date: workOrder.quality_checked_at,
              },
              {
                status: "ready_for_pickup",
                label: "Listo para Retiro",
                date: workOrder.ready_at,
              },
              {
                status: "delivered",
                label: "Entregado",
                date: workOrder.delivered_at,
              },
            ];
            const currentStatusIndex = steps.findIndex(
              (s) => s.status === workOrder.status,
            );

            const handleStepClick = (step: (typeof steps)[0]) => {
              if (step.status === "delivered") {
                setDeliveryDialogOpen(true);
              } else {
                setNewStatus(step.status);
                setStatusDialogOpenedFromTimeline(true);
                setShowStatusDialog(true);
              }
            };

            return (
              <>
                {/* Mobile: Vertical timeline */}
                <div className="flex flex-col md:hidden">
                  {steps.map((step, idx) => {
                    const isCompleted =
                      currentStatusIndex !== -1 && idx < currentStatusIndex;
                    const isCurrent = workOrder.status === step.status;
                    const isFuture =
                      currentStatusIndex !== -1 && idx > currentStatusIndex;
                    const lineActive =
                      currentStatusIndex !== -1 && currentStatusIndex > idx;

                    return (
                      <div
                        key={step.status}
                        className="relative flex items-start gap-3 pb-5 last:pb-0"
                      >
                        {idx < steps.length - 1 && (
                          <div
                            className={`absolute left-[11px] top-8 bottom-0 w-0.5 ${
                              lineActive ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                        )}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleStepClick(step)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleStepClick(step);
                            }
                          }}
                          className={`relative z-10 flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center border-2 cursor-pointer transition-transform active:scale-95 ${
                            isCurrent
                              ? "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/50"
                              : isCompleted
                                ? "bg-gray-300 border-gray-400 text-gray-600"
                                : "bg-gray-200 border-gray-300 text-gray-400"
                          }`}
                        >
                          {isCurrent ? (
                            <>
                              <CheckCircle className="h-5 w-5" />
                              <span className="absolute -top-0.5 -right-0.5 bg-green-600 text-white text-[10px] font-bold px-1 py-0.5 rounded-full border-2 border-white">
                                ACTUAL
                              </span>
                            </>
                          ) : isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-current" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p
                            className={`text-sm font-medium ${
                              isCurrent
                                ? "text-green-600"
                                : isCompleted || isFuture
                                  ? "text-gray-600"
                                  : "text-gray-400"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p
                            className={`text-xs mt-0.5 ${
                              step.date
                                ? isCurrent
                                  ? "text-green-600"
                                  : "text-gray-500"
                                : "text-gray-400"
                            }`}
                          >
                            {step.date
                              ? formatDate(step.date, {
                                  format: "medium",
                                  locale: "es-CL",
                                })
                              : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: Horizontal timeline */}
                <div className="hidden md:flex items-center justify-between overflow-x-auto pb-4">
                  {steps.map((step, idx) => {
                    const isCompleted =
                      currentStatusIndex !== -1 && idx < currentStatusIndex;
                    const isCurrent = workOrder.status === step.status;
                    const isFuture =
                      currentStatusIndex !== -1 && idx > currentStatusIndex;

                    return (
                      <div
                        key={step.status}
                        className="flex items-center flex-shrink-0"
                      >
                        <div className="flex flex-col items-center">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleStepClick(step)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleStepClick(step);
                              }
                            }}
                            className={`w-14 h-14 rounded-full flex items-center justify-center border-2 relative cursor-pointer transition-transform hover:scale-105 ${
                              isCurrent
                                ? "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/50"
                                : isCompleted
                                  ? "bg-gray-300 border-gray-400 text-gray-600"
                                  : "bg-gray-200 border-gray-300 text-gray-400"
                            }`}
                          >
                            {isCurrent ? (
                              <>
                                <CheckCircle className="h-7 w-7" />
                                <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                                  ACTUAL
                                </span>
                              </>
                            ) : isCompleted ? (
                              <CheckCircle className="h-6 w-6" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-current" />
                            )}
                          </div>
                          <p
                            className={`text-xs mt-2 text-center max-w-[80px] ${
                              isCurrent
                                ? "font-bold text-green-600"
                                : isCompleted || isFuture
                                  ? "font-medium text-gray-500"
                                  : "text-gray-400"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p
                            className={`text-xs mt-1 min-h-[16px] ${
                              step.date
                                ? isCurrent
                                  ? "text-green-600 font-medium"
                                  : "text-gray-500"
                                : "text-transparent"
                            }`}
                          >
                            {step.date
                              ? formatDate(step.date, {
                                  format: "medium",
                                  locale: "es-CL",
                                })
                              : "\u00A0"}
                          </p>
                        </div>
                        {idx < steps.length - 1 && (
                          <div
                            className={`w-16 h-0.5 mx-2 ${
                              isCurrent ||
                              (isCompleted && idx < currentStatusIndex)
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="pricing">Precios</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-admin-text-tertiary">Nombre</p>
                  <p className="font-medium">{customerName}</p>
                </div>
                {workOrder.customer?.email && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Email</p>
                    <p className="font-medium">{workOrder.customer.email}</p>
                  </div>
                )}
                {workOrder.customer?.phone && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Teléfono</p>
                    <p className="font-medium">{workOrder.customer.phone}</p>
                  </div>
                )}
                <Link href={`/admin/customers/${workOrder.customer?.id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Ver Cliente
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Prescription Info */}
            {workOrder.prescription && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Receta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Fecha</p>
                    <p className="font-medium">
                      {formatDate(workOrder.prescription.prescription_date)}
                    </p>
                  </div>
                  {workOrder.prescription.prescription_type && (
                    <div>
                      <p className="text-sm text-admin-text-tertiary">Tipo</p>
                      <p className="font-medium">
                        {workOrder.prescription.prescription_type}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-admin-text-tertiary">
                    Fecha de Creación
                  </p>
                  <p className="font-medium">
                    {formatDate(workOrder.work_order_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-admin-text-tertiary">
                    Estado de Pago
                  </p>
                  {getPaymentStatusBadge(workOrder.payment_status)}
                </div>
                <div>
                  <p className="text-sm text-admin-text-tertiary">Total</p>
                  <p className="text-2xl font-bold text-admin-success">
                    {formatCurrency(workOrder.total_amount)}
                  </p>
                </div>
                {workOrder.deposit_amount > 0 && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">
                      Saldo Pendiente
                    </p>
                    <p className="font-semibold text-orange-600">
                      {formatCurrency(workOrder.balance_amount)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Marco y Lente - Single merged card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                <Eye className="h-5 w-5 mr-2" />
                Marco y Lente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workOrder.presbyopia_solution === "two_separate" ? (
                <>
                  <div className="space-y-2 pb-4 border-b border-admin-border-primary/20">
                    <p className="text-xs font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                      Par Lejos
                    </p>
                    <p className="font-medium">
                      Marco: {workOrder.frame_name}
                      {workOrder.frame_brand && ` (${workOrder.frame_brand})`}
                    </p>
                    <p className="font-medium">
                      Lente:{" "}
                      {workOrder.far_lens_family?.name ||
                        workOrder.lens_type ||
                        "—"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                      Par Cerca
                    </p>
                    <p className="font-medium">
                      Marco: {workOrder.frame_name}
                      {workOrder.frame_brand && ` (${workOrder.frame_brand})`}
                    </p>
                    <p className="font-medium">
                      Lente: {workOrder.near_lens_family?.name || "—"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Marco</p>
                    <p className="font-medium">{workOrder.frame_name}</p>
                    {workOrder.frame_brand && (
                      <p className="text-sm text-admin-text-tertiary">
                        {workOrder.frame_brand}
                        {workOrder.frame_model && ` · ${workOrder.frame_model}`}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Lente</p>
                    <p className="font-medium">
                      {workOrder.lens_family?.name ||
                        workOrder.lens_type ||
                        "—"}
                    </p>
                    <p className="text-sm text-admin-text-tertiary">
                      {workOrder.lens_material}
                      {workOrder.lens_index &&
                        ` · Índice ${workOrder.lens_index}`}
                    </p>
                    {workOrder.lens_treatments &&
                      workOrder.lens_treatments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {workOrder.lens_treatments.map((treatment, idx) => (
                            <Badge key={idx} variant="outline">
                              {treatment}
                            </Badge>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lab Information */}
          {workOrder.lab_name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Factory className="h-5 w-5 mr-2" />
                  Información del Laboratorio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-admin-text-tertiary">Nombre</p>
                  <p className="font-medium">{workOrder.lab_name}</p>
                </div>
                {workOrder.lab_contact && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Contacto</p>
                    <p className="font-medium">{workOrder.lab_contact}</p>
                  </div>
                )}
                {workOrder.lab_order_number && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">
                      Número de Orden
                    </p>
                    <p className="font-medium">{workOrder.lab_order_number}</p>
                  </div>
                )}
                {workOrder.lab_estimated_delivery_date && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">
                      Fecha Estimada
                    </p>
                    <p className="font-medium">
                      {formatDate(workOrder.lab_estimated_delivery_date)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {/* Prescription Details - Critical for Lab */}
          {workOrder.prescription && (
            <PrescriptionFullDisplay
              prescription={workOrder.prescription}
              title="Detalles de la Receta (Para Laboratorio)"
              subtitle={
                workOrder.prescription.prescription_date && (
                  <>
                    Fecha:{" "}
                    {new Date(
                      workOrder.prescription.prescription_date + "T12:00:00",
                    ).toLocaleDateString("es-CL")}
                    {workOrder.prescription.prescription_type && (
                      <> • Tipo: {workOrder.prescription.prescription_type}</>
                    )}
                  </>
                )
              }
            />
          )}

          {/* Frame Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Detalles del Marco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-admin-text-tertiary">Nombre</p>
                  <p className="font-medium">{workOrder.frame_name}</p>
                </div>
                {workOrder.frame_brand && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">Marca</p>
                    <p className="font-medium">{workOrder.frame_brand}</p>
                  </div>
                )}
                {workOrder.frame_model && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">Modelo</p>
                    <p className="font-medium">{workOrder.frame_model}</p>
                  </div>
                )}
                {workOrder.frame_color && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">Color</p>
                    <p className="font-medium">{workOrder.frame_color}</p>
                  </div>
                )}
                {workOrder.frame_size && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">Tamaño</p>
                    <p className="font-medium">{workOrder.frame_size}</p>
                  </div>
                )}
                {workOrder.frame_sku && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">SKU</p>
                    <p className="font-medium">{workOrder.frame_sku}</p>
                  </div>
                )}
                {workOrder.frame_serial_number && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">
                      Número de Serie
                    </p>
                    <p className="font-medium">
                      {workOrder.frame_serial_number}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lens Details - Split for two_separate presbyopia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                {workOrder.presbyopia_solution === "two_separate"
                  ? "Detalles de Lentes (Lejos y Cerca)"
                  : "Detalles del Lente"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workOrder.presbyopia_solution === "two_separate" ? (
                <div className="space-y-6">
                  <div className="space-y-3 pb-4 border-b border-admin-border-primary/20">
                    <h3 className="font-semibold text-epoch-primary border-b pb-2">
                      Lente Lejos
                    </h3>
                    <p className="text-xs text-admin-text-tertiary">Marco</p>
                    <p className="font-medium">
                      {workOrder.frame_name}
                      {workOrder.frame_brand && ` · ${workOrder.frame_brand}`}
                      {workOrder.frame_model && ` · ${workOrder.frame_model}`}
                    </p>
                    <p className="text-xs text-admin-text-tertiary mt-2">
                      Tipo de Lente
                    </p>
                    <p className="font-medium">
                      {getLensTypeLabel(workOrder.lens_type)}
                    </p>
                    <p className="text-xs text-admin-text-tertiary mt-2">
                      Familia de lente
                    </p>
                    <p className="font-medium">
                      {workOrder.far_lens_family?.name || "—"}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-epoch-primary border-b pb-2">
                      Lente Cerca
                    </h3>
                    <p className="text-xs text-admin-text-tertiary">Marco</p>
                    <p className="font-medium">
                      {workOrder.frame_name}
                      {workOrder.frame_brand && ` · ${workOrder.frame_brand}`}
                      {workOrder.frame_model && ` · ${workOrder.frame_model}`}
                    </p>
                    <p className="text-xs text-admin-text-tertiary mt-2">
                      Tipo de Lente
                    </p>
                    <p className="font-medium">
                      {getLensTypeLabel(workOrder.lens_type)}
                    </p>
                    <p className="text-xs text-admin-text-tertiary mt-2">
                      Familia de lente
                    </p>
                    <p className="font-medium">
                      {workOrder.near_lens_family?.name || "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-admin-text-tertiary">
                      Tipo de Lente
                    </p>
                    <p className="font-medium">
                      {getLensTypeLabel(workOrder.lens_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-admin-text-tertiary">
                      Familia de lente
                    </p>
                    <p className="font-medium">
                      {workOrder.lens_family?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-admin-text-tertiary">Material</p>
                    <p className="font-medium">{workOrder.lens_material}</p>
                  </div>
                  {workOrder.lens_index && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">
                        Índice de Refracción
                      </p>
                      <p className="font-medium">{workOrder.lens_index}</p>
                    </div>
                  )}
                  {workOrder.lens_treatments &&
                    workOrder.lens_treatments.length > 0 && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Tratamientos
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {workOrder.lens_treatments.map(
                            (treatment: string, idx: number) => (
                              <Badge key={idx} variant="outline">
                                {treatment}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  {workOrder.lens_tint_color && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">
                        Color del Tinte
                      </p>
                      <p className="font-medium">{workOrder.lens_tint_color}</p>
                    </div>
                  )}
                  {workOrder.lens_tint_percentage && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">
                        Porcentaje de Tinte
                      </p>
                      <p className="font-medium">
                        {workOrder.lens_tint_percentage}%
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lab Information */}
          {workOrder.lab_name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Factory className="h-5 w-5 mr-2" />
                  Información del Laboratorio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-admin-text-tertiary">Nombre</p>
                  <p className="font-medium">{workOrder.lab_name}</p>
                </div>
                {workOrder.lab_contact && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Contacto</p>
                    <p className="font-medium">{workOrder.lab_contact}</p>
                  </div>
                )}
                {workOrder.lab_order_number && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">
                      Número de Orden del Lab
                    </p>
                    <p className="font-medium">{workOrder.lab_order_number}</p>
                  </div>
                )}
                {workOrder.lab_estimated_delivery_date && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">
                      Fecha Estimada de Entrega
                    </p>
                    <p className="font-medium">
                      {formatDate(workOrder.lab_estimated_delivery_date)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notas y Observaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workOrder.internal_notes && (
                <div>
                  <p className="text-sm text-admin-text-tertiary mb-1">
                    Notas Internas
                  </p>
                  <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary p-3 rounded-xl border border-admin-border-primary/20">
                    {workOrder.internal_notes}
                  </p>
                </div>
              )}
              {workOrder.customer_notes && (
                <div>
                  <p className="text-sm text-admin-text-tertiary mb-1">
                    Notas para el Cliente
                  </p>
                  <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary p-3 rounded-xl border border-admin-border-primary/20">
                    {workOrder.customer_notes}
                  </p>
                </div>
              )}
              {workOrder.lab_notes && (
                <div>
                  <p className="text-sm text-admin-text-tertiary mb-1">
                    Notas del Laboratorio
                  </p>
                  <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary p-3 rounded-xl border border-admin-border-primary/20">
                    {workOrder.lab_notes}
                  </p>
                </div>
              )}
              {workOrder.quality_notes && (
                <div>
                  <p className="text-sm text-admin-text-tertiary mb-1">
                    Notas de Control de Calidad
                  </p>
                  <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary p-3 rounded-xl border border-admin-border-primary/20">
                    {workOrder.quality_notes}
                  </p>
                </div>
              )}
              {workOrder.assigned_staff && (
                <div>
                  <p className="text-sm text-admin-text-tertiary">Asignado a</p>
                  <p className="font-medium">
                    {workOrder.assigned_staff.first_name}{" "}
                    {workOrder.assigned_staff.last_name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Desglose de Precios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-admin-text-tertiary">
                    Costo de Marco:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(workOrder.frame_cost)}
                  </span>
                </div>
                {workOrder.presbyopia_solution === "two_separate" ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-admin-text-tertiary">
                        Costo Lente Lejos (
                        {workOrder.far_lens_family?.name || "Lejos"}):
                      </span>
                      <span className="font-medium">
                        {formatCurrency(workOrder.far_lens_cost ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text-tertiary">
                        Costo Lente Cerca (
                        {workOrder.near_lens_family?.name || "Cerca"}):
                      </span>
                      <span className="font-medium">
                        {formatCurrency(workOrder.near_lens_cost ?? 0)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Costo de Lente:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(workOrder.lens_cost)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-admin-text-tertiary">
                    Costo de Tratamientos:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(workOrder.treatments_cost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-admin-text-tertiary">
                    Costo de Mano de Obra:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(workOrder.labor_cost)}
                  </span>
                </div>
                {workOrder.lab_cost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-admin-text-tertiary">
                      Costo del Laboratorio:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(workOrder.lab_cost)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(workOrder.subtotal)}
                  </span>
                </div>
                {workOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Descuento:</span>
                    <span className="font-medium">
                      -{formatCurrency(workOrder.discount_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-admin-text-tertiary">IVA (19%):</span>
                  <span className="font-medium">
                    {formatCurrency(workOrder.tax_amount)}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-admin-success">
                    {formatCurrency(workOrder.total_amount)}
                  </span>
                </div>
                {workOrder.deposit_amount > 0 && (
                  <>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-admin-text-tertiary">
                        Seña/Depósito:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(workOrder.deposit_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Saldo Pendiente:</span>
                      <span className="text-orange-600">
                        {formatCurrency(workOrder.balance_amount)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Estados</CardTitle>
            </CardHeader>
            <CardContent>
              {statusHistory.length === 0 ? (
                <div className="text-center py-8 text-admin-text-tertiary">
                  No hay historial de cambios de estado
                </div>
              ) : (
                <div className="space-y-4">
                  {statusHistory.map((entry, index) => {
                    const isCurrentStatus =
                      index === 0 && entry.to_status === workOrder.status;

                    return (
                      <div
                        key={entry.id}
                        className={`flex items-start space-x-4 pb-4 border-b last:border-0 ${
                          isCurrentStatus
                            ? "bg-green-50 p-4 rounded-lg border-green-200"
                            : "bg-gray-50 p-3 rounded-lg border-gray-200"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={
                                isCurrentStatus
                                  ? "bg-gray-200 border-gray-300 text-gray-600"
                                  : "bg-gray-100 border-gray-200 text-gray-500"
                              }
                            >
                              {getStatusLabel(entry.from_status || "Inicial")}
                            </Badge>
                            <ArrowRight
                              className={`h-4 w-4 ${isCurrentStatus ? "text-green-600" : "text-gray-400"}`}
                            />
                            <Badge
                              className={
                                isCurrentStatus
                                  ? "bg-green-500 text-white border-green-600 font-semibold"
                                  : "bg-gray-300 text-gray-600 border-gray-400"
                              }
                            >
                              {getStatusLabel(entry.to_status)}
                              {isCurrentStatus && (
                                <span className="ml-2 text-xs bg-green-600 px-1.5 py-0.5 rounded">
                                  ACTUAL
                                </span>
                              )}
                            </Badge>
                          </div>
                          <p
                            className={`text-sm mt-2 ${isCurrentStatus ? "text-green-700 font-medium" : "text-gray-500"}`}
                          >
                            {new Date(entry.changed_at).toLocaleString(
                              "es-CL",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                          {entry.changed_by_user && (
                            <p
                              className={`text-sm mt-1 ${isCurrentStatus ? "text-green-600" : "text-gray-500"}`}
                            >
                              Por: {entry.changed_by_user.first_name}{" "}
                              {entry.changed_by_user.last_name}
                            </p>
                          )}
                          {entry.notes && (
                            <p
                              className={`text-sm mt-2 ${isCurrentStatus ? "text-green-800" : "text-gray-600"}`}
                            >
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar trabajo?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El trabajo será eliminado
              permanentemente de la base de datos.
              {workOrder?.quote && (
                <span className="block mt-2 text-orange-600 font-medium">
                  ⚠️ El presupuesto relacionado también será eliminado.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Dialog with Balance Check */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Entregar Trabajo
            </DialogTitle>
            <DialogDescription>
              {deliveryError?.requiresPayment ? (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-red-800 mb-2">
                          Saldo Pendiente Detectado
                        </p>
                        <p className="text-red-700 mb-3">
                          {deliveryError.message}
                        </p>
                        <div className="bg-white rounded p-3 border border-red-200">
                          <p className="text-sm text-red-600 font-medium mb-1">
                            Saldo Pendiente:
                          </p>
                          <p className="text-2xl font-bold text-red-700">
                            {formatCurrency(deliveryError.balance || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    El cliente debe pagar el saldo pendiente antes de poder
                    entregar el trabajo.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="mb-4">
                    ¿Está seguro de que desea marcar este trabajo como
                    entregado?
                  </p>
                  {workOrder && workOrder.pos_order_id && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        El sistema verificará automáticamente que no haya saldo
                        pendiente antes de permitir la entrega.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeliveryDialogOpen(false);
                setDeliveryError(null);
              }}
              disabled={delivering}
            >
              Cancelar
            </Button>
            {deliveryError?.requiresPayment ? (
              <Button
                onClick={() => {
                  setDeliveryDialogOpen(false);
                  setDeliveryError(null);
                  // Redirect to POS to collect payment
                  if (deliveryError.orderId) {
                    router.push(
                      `/admin/pos?orderId=${deliveryError.orderId}&collectPayment=true`,
                    );
                  } else {
                    toast.info(
                      "Redirigiendo al POS para cobrar el saldo pendiente...",
                    );
                    router.push("/admin/pos");
                  }
                }}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Cobrar Saldo Pendiente
              </Button>
            ) : (
              <Button
                onClick={handleDeliver}
                disabled={delivering}
                className="bg-green-600 hover:bg-green-700"
              >
                {delivering ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Entregando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Entrega
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
