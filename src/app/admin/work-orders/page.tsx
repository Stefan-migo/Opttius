"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Eye,
  Package,
  Calendar,
  User,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Factory,
  CheckCircle,
  Clock,
  Send,
  Truck,
  AlertCircle,
  XCircle,
  FileText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
// dynamic import eliminado: CreateWorkOrderForm ya no se usa
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { BranchSelector } from "@/components/admin/BranchSelector";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  extractDataFromResponse,
  extractPaginationFromResponse,
} from "@/lib/api/response-helpers";

// CreateWorkOrderForm eliminado: Los trabajos solo se crean desde POS (process-sale)
// Esto previene trabajos "fantasma" sin vínculo financiero ni control de inventario

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
  prescription?: any;
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

export default function WorkOrdersPage() {
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
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<
    string | null
  >(null);
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState<
    string | null
  >(null);

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

  // handleWorkOrderCreated eliminado: Los trabajos solo se crean desde POS

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
    } catch (error: any) {
      console.error("Error deleting work order:", error);
      toast.error(error.message || "Error al eliminar trabajo");
    } finally {
      setDeleting(false);
    }
  };

  const handlePaymentStatusChange = async (
    workOrderId: string,
    newStatus: string,
  ) => {
    setUpdatingPaymentStatus(workOrderId);
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

      // Update local state optimistically
      setWorkOrders((prev) =>
        prev.map((wo) =>
          wo.id === workOrderId ? { ...wo, payment_status: newStatus } : wo,
        ),
      );

      toast.success("Estado de pago actualizado");
      setEditingPaymentStatus(null);
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      toast.error(error.message || "Error al actualizar estado de pago");
      // Refresh to get correct state
      fetchWorkOrders();
    } finally {
      setUpdatingPaymentStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-epoch-primary"
            data-tour="work-orders-header"
          >
            Trabajos
          </h1>
          <p className="text-admin-text-tertiary">
            {isGlobalView
              ? "Gestión de trabajos de laboratorio - Todas las sucursales"
              : "Gestión de trabajos de laboratorio"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && <BranchSelector />}
          {/* Botón "Nuevo Trabajo" eliminado: Los trabajos solo se crean desde POS (process-sale) */}
          {/* Esto previene trabajos "fantasma" sin vínculo financiero ni control de inventario */}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-admin-bg-tertiary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-admin-text-tertiary">
                  Total Trabajos
                </p>
                <p className="text-2xl font-bold text-epoch-primary">
                  {totalWorkOrders}
                </p>
              </div>
              <Package className="h-8 w-8 text-epoch-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-admin-bg-tertiary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-admin-text-tertiary">
                  En Laboratorio
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {
                    workOrders.filter((w) =>
                      [
                        "sent_to_lab",
                        "in_progress_lab",
                        "ready_at_lab",
                      ].includes(w.status),
                    ).length
                  }
                </p>
              </div>
              <Factory className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-admin-bg-tertiary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-admin-text-tertiary">
                  Listos para Retiro
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {
                    workOrders.filter((w) => w.status === "ready_for_pickup")
                      .length
                  }
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-admin-bg-tertiary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-admin-text-tertiary">Entregados</p>
                <p className="text-2xl font-bold text-admin-success">
                  {workOrders.filter((w) => w.status === "delivered").length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-admin-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
                <Input
                  placeholder="Buscar por número, cliente, marco, laboratorio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="quote">Presupuesto</SelectItem>
                <SelectItem value="ordered">Ordenado</SelectItem>
                <SelectItem value="sent_to_lab">Enviado al Lab</SelectItem>
                <SelectItem value="in_progress_lab">En Laboratorio</SelectItem>
                <SelectItem value="ready_at_lab">Listo en Lab</SelectItem>
                <SelectItem value="received_from_lab">Recibido</SelectItem>
                <SelectItem value="mounted">Montado</SelectItem>
                <SelectItem value="quality_check">Control Calidad</SelectItem>
                <SelectItem value="ready_for_pickup">
                  Listo para Retiro
                </SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders Table */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle>Trabajos ({totalWorkOrders})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
              <p className="text-admin-text-tertiary">Cargando trabajos...</p>
            </div>
          ) : filteredWorkOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-epoch-primary mb-2">
                No hay trabajos
              </h3>
              <p className="text-admin-text-tertiary mb-4">
                {searchTerm
                  ? "No se encontraron trabajos que coincidan con la búsqueda"
                  : "Los trabajos se crean automáticamente desde el POS al procesar una venta"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Marco</TableHead>
                      <TableHead>Lente</TableHead>
                      <TableHead>Laboratorio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkOrders.map((workOrder) => (
                      <TableRow key={workOrder.id}>
                        <TableCell className="font-medium">
                          {workOrder.work_order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {workOrder.customer?.first_name || ""}{" "}
                              {workOrder.customer?.last_name || ""}
                            </div>
                            <div className="text-sm text-admin-text-tertiary">
                              {workOrder.customer?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{workOrder.frame_name || "-"}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {workOrder.lens_type || "-"}
                            </div>
                            <div className="text-sm text-admin-text-tertiary">
                              {workOrder.lens_material || ""}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {workOrder.lab_name ? (
                            <div className="flex items-center gap-1">
                              <Factory className="h-3 w-3" />
                              <span className="text-sm">
                                {workOrder.lab_name}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(workOrder.status)}
                        </TableCell>
                        <TableCell>
                          {editingPaymentStatus === workOrder.id ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={workOrder.payment_status}
                                onValueChange={(value) => {
                                  handlePaymentStatusChange(
                                    workOrder.id,
                                    value,
                                  );
                                  setEditingPaymentStatus(null);
                                }}
                                disabled={
                                  updatingPaymentStatus === workOrder.id
                                }
                                open={true}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setEditingPaymentStatus(null);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[140px] h-7">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">
                                    Pendiente
                                  </SelectItem>
                                  <SelectItem value="partial">
                                    Parcial
                                  </SelectItem>
                                  <SelectItem value="paid">Pagado</SelectItem>
                                  <SelectItem value="refunded">
                                    Reembolsado
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              {updatingPaymentStatus === workOrder.id && (
                                <RefreshCw className="h-4 w-4 animate-spin text-epoch-primary" />
                              )}
                            </div>
                          ) : (
                            <div
                              onClick={() =>
                                setEditingPaymentStatus(workOrder.id)
                              }
                              className="cursor-pointer hover:opacity-80 transition-opacity inline-block group"
                              title="Haz clic para editar el estado de pago"
                            >
                              <div className="flex items-center gap-1">
                                {getPaymentStatusBadge(
                                  workOrder.payment_status,
                                )}
                                <span className="opacity-0 group-hover:opacity-50 text-xs text-admin-text-tertiary">
                                  ✎
                                </span>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-admin-success">
                          {formatCurrency(workOrder.total_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/work-orders/${workOrder.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(workOrder.id)}
                              disabled={
                                workOrder.status === "delivered" ||
                                workOrder.payment_status === "paid" ||
                                workOrder.payment_status === "partial"
                              }
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-admin-text-tertiary">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Work Order Dialog eliminado: Los trabajos solo se crean desde POS (process-sale) */}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar trabajo?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El trabajo será eliminado
              permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setWorkOrderToDelete(null);
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
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
    </div>
  );
}
