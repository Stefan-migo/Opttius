"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle,
  DollarSign,
  Eye,
  Factory,
  FileText,
  Package,
  RefreshCw,
  Send,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { WorkOrderHeader } from "./_components/WorkOrderHeader";
import { toast } from "sonner";

import { PrescriptionFullDisplay } from "@/components/admin/PrescriptionFullDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLensTypeLabel } from "@/lib/lens-type-labels";
import { formatCurrency, formatDate } from "@/lib/utils";

import { useWorkOrder } from "@/hooks/useWorkOrder";
import { WorkOrderStatusBadge } from "@/components/admin/WorkOrderStatusBadge";
import { StatusManagementCard } from "@/components/admin/StatusManagementCard";
import { DeliveryDialog } from "@/components/admin/DeliveryDialog";
import { LabDeliveryCard } from "@/components/admin/LabDeliveryCard";

export default function WorkOrderDetailPage() {
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
      { variant: unknown; label: string; icon: unknown; color: string }
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
        workOrderNumber={workOrder.work_order_number}
        customerName={customerName}
        workOrder={workOrder}
        onBack={() => router.back()}
        onPrint={handlePrint}
        onDelete={() => setDeleteDialogOpen(true)}
      />

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
                        className="relative flex items-start gap-3 pb-5 last:pb-0"
                        key={step.status}
                      >
                        {idx < steps.length - 1 && (
                          <div
                            className={`absolute left-[11px] top-8 bottom-0 w-0.5 ${
                              lineActive ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                        )}
                        <div
                          className={`relative z-10 flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center border-2 cursor-pointer transition-transform active:scale-95 ${
                            isCurrent
                              ? "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/50"
                              : isCompleted
                                ? "bg-gray-300 border-gray-400 text-gray-600"
                                : "bg-gray-200 border-gray-300 text-gray-400"
                          }`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleStepClick(step)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleStepClick(step);
                            }
                          }}
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
                        className="flex items-center flex-shrink-0"
                        key={step.status}
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-14 h-14 rounded-full flex items-center justify-center border-2 relative cursor-pointer transition-transform hover:scale-105 ${
                              isCurrent
                                ? "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/50"
                                : isCompleted
                                  ? "bg-gray-300 border-gray-400 text-gray-600"
                                  : "bg-gray-200 border-gray-300 text-gray-400"
                            }`}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleStepClick(step)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleStepClick(step);
                              }
                            }}
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
      <Tabs className="space-y-6" defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="pricing">Precios</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent className="space-y-6" value="overview">
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
                  <Button className="w-full mt-4" size="sm" variant="outline">
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
                          {workOrder.lens_treatments.map(
                            (treatment: string, idx: number) => (
                              <Badge key={idx} variant="outline">
                                {treatment}
                              </Badge>
                            ),
                          )}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lab Information */}
          <LabDeliveryCard workOrder={workOrder} />
        </TabsContent>

        {/* Details Tab */}
        <TabsContent className="space-y-6" value="details">
          {/* Prescription Details - Critical for Lab */}
          {workOrder.prescription && (
            <PrescriptionFullDisplay
              prescription={workOrder.prescription}
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
              title="Detalles de la Receta (Para Laboratorio)"
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
          <LabDeliveryCard workOrder={workOrder} />

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
        <TabsContent className="space-y-6" value="pricing">
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
        <TabsContent className="space-y-6" value="history">
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
                        className={`flex items-start space-x-4 pb-4 border-b last:border-0 ${
                          isCurrentStatus
                            ? "bg-green-50 p-4 rounded-lg border-green-200"
                            : "bg-gray-50 p-3 rounded-lg border-gray-200"
                        }`}
                        key={entry.id}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={
                                isCurrentStatus
                                  ? "bg-gray-200 border-gray-300 text-gray-600"
                                  : "bg-gray-100 border-gray-200 text-gray-500"
                              }
                              variant="outline"
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
              disabled={deleting}
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={deleting}
              variant="destructive"
              onClick={handleDelete}
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
      <DeliveryDialog
        deliveryDialogOpen={deliveryDialogOpen}
        setDeliveryDialogOpen={setDeliveryDialogOpen}
        deliveryError={deliveryError}
        setDeliveryError={setDeliveryError}
        delivering={delivering}
        workOrder={workOrder}
        handleDeliver={handleDeliver}
      />
    </div>
  );
}
