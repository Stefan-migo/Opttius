"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Factory,
  FileText,
  Package,
  Send,
  Truck,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { DeliveryDialog } from "@/components/admin/DeliveryDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkOrder } from "@/hooks/useWorkOrder";

import { WorkOrderDeleteDialog } from "./WorkOrderDeleteDialog";
import { WorkOrderDetailsTab } from "./WorkOrderDetailsTab";
import { WorkOrderHeader } from "./WorkOrderHeader";
import { WorkOrderHistoryTab } from "./WorkOrderHistoryTab";
import { WorkOrderOverviewTab } from "./WorkOrderOverviewTab";
import { WorkOrderPricingTab } from "./WorkOrderPricingTab";
import { WorkOrderTimeline } from "./WorkOrderTimeline";

/* Orchestrator — delegates to sub-components for individual sections */
export default function WorkOrderDetailContent() {
  const router = useRouter();

  const {
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
    setShowStatusDialog,
    setNewStatus,
    setStatusDialogOpenedFromTimeline,
    setStatusNotes,
    setLabInfo,
    setDeleteDialogOpen,
    setDeliveryDialogOpen,
    setDeliveryError,
    handleStatusUpdate,
    handleDeliver,
    handleDelete,
    handlePrint,
    getAllStatuses,
    getStatusLabel,
  } = useWorkOrder();

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { variant: unknown; label: string; icon: React.ElementType; color: string }
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
      <Badge className="flex items-center gap-1" variant={statusConfig.variant}>
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { variant: unknown; label: string }> = {
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
          <Button size="sm" variant="outline">
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
          <Button size="sm" variant="outline" onClick={() => router.back()}>
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
      <WorkOrderHeader
        customerName={customerName}
        workOrder={workOrder}
        workOrderNumber={workOrder.work_order_number}
        onBack={() => router.back()}
        onDelete={() => setDeleteDialogOpen(true)}
        onPrint={handlePrint}
      />

      <WorkOrderTimeline
        setDeliveryDialogOpen={setDeliveryDialogOpen}
        setNewStatus={setNewStatus}
        setShowStatusDialog={setShowStatusDialog}
        setStatusDialogOpenedFromTimeline={setStatusDialogOpenedFromTimeline}
        workOrder={workOrder}
      />

      {/* Main Content */}
      <Tabs className="space-y-6" defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="pricing">Precios</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="overview">
          <WorkOrderOverviewTab
            customerName={customerName}
            getPaymentStatusBadge={getPaymentStatusBadge}
            workOrder={workOrder}
          />
        </TabsContent>

        <TabsContent className="space-y-6" value="details">
          <WorkOrderDetailsTab workOrder={workOrder} />
        </TabsContent>

        <TabsContent className="space-y-6" value="pricing">
          <WorkOrderPricingTab workOrder={workOrder} />
        </TabsContent>

        <TabsContent className="space-y-6" value="history">
          <WorkOrderHistoryTab
            currentStatus={workOrder.status}
            getStatusLabel={getStatusLabel}
            statusHistory={statusHistory}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <WorkOrderDeleteDialog
        deleteDialogOpen={deleteDialogOpen}
        deleting={deleting}
        handleDelete={handleDelete}
        setDeleteDialogOpen={setDeleteDialogOpen}
        workOrder={workOrder}
      />

      {/* Delivery Dialog with Balance Check */}
      <DeliveryDialog
        delivering={delivering}
        deliveryDialogOpen={deliveryDialogOpen}
        deliveryError={deliveryError}
        handleDeliver={handleDeliver}
        setDeliveryDialogOpen={setDeliveryDialogOpen}
        setDeliveryError={setDeliveryError}
        workOrder={workOrder}
      />
    </div>
  );
}
