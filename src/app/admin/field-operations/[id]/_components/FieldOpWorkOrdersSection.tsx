"use client";

import {
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Factory,
  Eye,
  Package,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";

interface WorkOrderItem {
  id: string;
  work_order_number: string;
  status: string;
  total_amount: number;
  payment_status?: string;
  frame_name?: string;
  lens_type?: string;
  lens_material?: string;
  lab_name?: string;
  customer?: { first_name?: string; last_name?: string; email?: string };
}

interface FieldOpWorkOrdersSectionProps {
  workOrders: WorkOrderItem[];
  workOrdersLoading: boolean;
}

function getWorkOrderStatusBadge(status: string) {
  const config: Record<
    string,
    {
      variant: "default" | "secondary" | "outline" | "destructive";
      label: string;
      icon: typeof Package;
    }
  > = {
    quote: { variant: "outline", label: "Presupuesto", icon: Package },
    ordered: { variant: "secondary", label: "Ordenado", icon: Package },
    sent_to_lab: {
      variant: "secondary",
      label: "Enviado al Lab",
      icon: Package,
    },
    in_progress_lab: {
      variant: "default",
      label: "En Laboratorio",
      icon: Factory,
    },
    ready_at_lab: {
      variant: "secondary",
      label: "Listo en Lab",
      icon: CheckCircle,
    },
    received_from_lab: {
      variant: "secondary",
      label: "Recibido",
      icon: Package,
    },
    mounted: { variant: "secondary", label: "Montado", icon: Package },
    quality_check: {
      variant: "secondary",
      label: "Control Calidad",
      icon: Package,
    },
    ready_for_pickup: {
      variant: "default",
      label: "Listo para Retiro",
      icon: CheckCircle,
    },
    delivered: {
      variant: "default",
      label: "Entregado",
      icon: CheckCircle,
    },
    cancelled: {
      variant: "destructive",
      label: "Cancelado",
      icon: XCircle,
    },
    returned: {
      variant: "destructive",
      label: "Devuelto",
      icon: AlertCircle,
    },
  };
  const c = config[status] || {
    variant: "outline" as const,
    label: status,
    icon: Package,
  };
  const Icon = c.icon;
  return (
    <Badge className="flex items-center gap-1 w-fit" variant={c.variant}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

function getPaymentStatusBadge(status: string) {
  const config: Record<
    string,
    {
      variant: "default" | "secondary" | "outline" | "destructive";
      label: string;
    }
  > = {
    pending: { variant: "outline", label: "Pendiente" },
    partial: { variant: "secondary", label: "Parcial" },
    paid: { variant: "default", label: "Pagado" },
    refunded: { variant: "destructive", label: "Reembolsado" },
  };
  const c = config[status] || { variant: "outline" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export default function FieldOpWorkOrdersSection({
  workOrders,
  workOrdersLoading,
}: FieldOpWorkOrdersSectionProps) {
  return (
    <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-admin-border-primary/20">
        <h3 className="flex items-center gap-2 text-admin-text-primary font-semibold">
          <ClipboardList className="h-5 w-5 shrink-0" />
          Trabajos del operativo
        </h3>
      </div>
      <div className="overflow-x-auto">
        {workOrdersLoading ? (
          <div className="p-8 flex justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-admin-text-tertiary" />
          </div>
        ) : workOrders.length === 0 ? (
          <p className="p-6 text-admin-text-tertiary text-sm">
            No hay trabajos vinculados a este operativo.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-admin-text-tertiary font-semibold">
                    Número
                  </TableHead>
                  <TableHead className="text-admin-text-tertiary font-semibold">
                    Cliente
                  </TableHead>
                  <TableHead className="text-admin-text-tertiary font-semibold">
                    Marco
                  </TableHead>
                  <TableHead className="text-admin-text-tertiary font-semibold">
                    Lente
                  </TableHead>
                  <TableHead className="text-admin-text-tertiary font-semibold">
                    Laboratorio
                  </TableHead>
                  <TableHead className="text-admin-text-tertiary font-semibold">
                    Estado
                  </TableHead>
                  <TableHead className="text-admin-text-tertiary font-semibold">
                    Pago
                  </TableHead>
                  <TableHead className="text-admin-text-tertiary font-semibold text-right">
                    Total
                  </TableHead>
                  <TableHead className="text-admin-text-tertiary font-semibold">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders.map((wo) => (
                  <TableRow className="hover:bg-[#AE000025]" key={wo.id}>
                    <TableCell className="font-medium text-admin-text-primary">
                      {wo.work_order_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-admin-text-primary">
                          {wo.customer
                            ? `${wo.customer.first_name || ""} ${wo.customer.last_name || ""}`.trim() ||
                              "—"
                            : "—"}
                        </div>
                        {wo.customer?.email && (
                          <div className="text-sm text-admin-text-tertiary">
                            {wo.customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-admin-text-primary">
                      {wo.frame_name || "-"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-admin-text-primary">
                          {wo.lens_type || "-"}
                        </div>
                        {wo.lens_material && (
                          <div className="text-sm text-admin-text-tertiary">
                            {wo.lens_material}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {wo.lab_name ? (
                        <div className="flex items-center gap-1">
                          <Factory className="h-3 w-3" />
                          <span className="text-sm text-admin-text-primary">
                            {wo.lab_name}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {getWorkOrderStatusBadge(wo.status)}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(
                        wo.payment_status || "pending",
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-admin-success">
                      {formatPrice(wo.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/work-orders/${wo.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
