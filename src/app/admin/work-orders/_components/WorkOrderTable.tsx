import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Factory,
  FileText,
  Package,
  RefreshCw,
  Send,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";

interface WorkOrder {
  id: string;
  work_order_number: string;
  customer: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  frame_name?: string;
  lens_type?: string;
  lens_material?: string;
  status: string;
  lab_name?: string;
  total_amount: number;
  payment_status: string;
}

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  filteredLength: number;
  totalWorkOrders: number;
  searchTerm: string;
  onPageChange: (page: number) => void;
  onDeleteClick: (id: string) => void;
  onPaymentStatusChange: (id: string, newStatus: string) => void;
}

const getStatusBadge = (status: string) => {
  const config: Record<
    string,
    { variant: unknown; label: string; icon: unknown; color: string }
  > = {
    quote: { variant: "outline", label: "Presupuesto", icon: FileText, color: "text-gray-600" },
    ordered: { variant: "secondary", label: "Ordenado", icon: Package, color: "text-blue-600" },
    sent_to_lab: { variant: "default", label: "Enviado al Lab", icon: Send, color: "text-purple-600" },
    received_from_lab: { variant: "secondary", label: "Recibido", icon: Truck, color: "text-blue-600" },
    mounted: { variant: "default", label: "Montado", icon: Package, color: "text-indigo-600" },
    quality_check: { variant: "secondary", label: "Control Calidad", icon: CheckCircle, color: "text-yellow-600" },
    ready_for_pickup: { variant: "default", label: "Listo para Retiro", icon: CheckCircle, color: "text-green-600" },
    delivered: { variant: "default", label: "Entregado", icon: CheckCircle, color: "text-green-600" },
    cancelled: { variant: "destructive", label: "Cancelado", icon: XCircle, color: "text-red-600" },
    returned: { variant: "destructive", label: "Devuelto", icon: AlertCircle, color: "text-red-600" },
  };

  const statusConfig = config[status] || {
    variant: "outline",
    label: status,
    icon: Package,
    color: "text-gray-600",
  };
  const Icon = statusConfig.icon as React.ElementType;

  return (
    <Badge className="flex items-center gap-1" variant={statusConfig.variant as "default" | "secondary" | "destructive" | "outline"}>
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

  const statusConfig = config[status] || { variant: "outline", label: status };
  return <Badge variant={statusConfig.variant as "default" | "secondary" | "destructive" | "outline"}>{statusConfig.label}</Badge>;
};

export function WorkOrderTable({
  workOrders,
  loading,
  currentPage,
  totalPages,
  filteredLength,
  totalWorkOrders,
  searchTerm,
  onPageChange,
  onDeleteClick,
  onPaymentStatusChange,
}: WorkOrderTableProps) {
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<string | null>(null);
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState<string | null>(null);

  const handlePaymentChange = async (workOrderId: string, newStatus: string) => {
    setUpdatingPaymentStatus(workOrderId);
    setEditingPaymentStatus(null);
    await onPaymentStatusChange(workOrderId, newStatus);
    setUpdatingPaymentStatus(null);
  };

  return (
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
        ) : filteredLength === 0 ? (
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
                  {workOrders.map((workOrder) => (
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
                            <span className="text-sm">{workOrder.lab_name}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(workOrder.status)}</TableCell>
                      <TableCell>
                        {editingPaymentStatus === workOrder.id ? (
                          <div className="flex items-center gap-2">
                            <Select
                              disabled={updatingPaymentStatus === workOrder.id}
                              open={true}
                              value={workOrder.payment_status}
                              onOpenChange={(open) => {
                                if (!open) setEditingPaymentStatus(null);
                              }}
                              onValueChange={(value) => {
                                handlePaymentChange(workOrder.id, value);
                              }}
                            >
                              <SelectTrigger className="w-[140px] h-7">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="partial">Parcial</SelectItem>
                                <SelectItem value="paid">Pagado</SelectItem>
                                <SelectItem value="refunded">Reembolsado</SelectItem>
                              </SelectContent>
                            </Select>
                            {updatingPaymentStatus === workOrder.id && (
                              <RefreshCw className="h-4 w-4 animate-spin text-epoch-primary" />
                            )}
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer hover:opacity-80 transition-opacity inline-block group"
                            title="Haz clic para editar el estado de pago"
                            onClick={() => setEditingPaymentStatus(workOrder.id)}
                          >
                            <div className="flex items-center gap-1">
                              {getPaymentStatusBadge(workOrder.payment_status)}
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
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </Link>
                          <Button
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={
                              workOrder.status === "delivered" ||
                              workOrder.payment_status === "paid" ||
                              workOrder.payment_status === "partial"
                            }
                            size="sm"
                            variant="outline"
                            onClick={() => onDeleteClick(workOrder.id)}
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
                    disabled={currentPage === 1}
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={currentPage === totalPages}
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
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
  );
}
