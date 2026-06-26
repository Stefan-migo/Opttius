"use client";

import {
  AlertCircle,
  CheckCircle,
  Factory,
  FileText,
  Package,
  Send,
  Truck,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  quote: { label: "Presupuesto", icon: FileText },
  ordered: { label: "Ordenado", icon: Package },
  sent_to_lab: { label: "Enviado al Lab", icon: Send },
  received_from_lab: { label: "Recibido", icon: Truck },
  mounted: { label: "Montado", icon: Package },
  quality_check: { label: "Control Calidad", icon: CheckCircle },
  ready_for_pickup: { label: "Listo para Retiro", icon: CheckCircle },
  delivered: { label: "Entregado", icon: CheckCircle },
  cancelled: { label: "Cancelado", icon: XCircle },
  returned: { label: "Devuelto", icon: AlertCircle },
};

interface WorkOrderStatusBadgeProps {
  status: string;
}

export function WorkOrderStatusBadge({ status }: WorkOrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    icon: Package,
  };
  const Icon = config.icon;

  return (
    <Badge className="bg-green-500 hover:bg-green-600 text-white border-green-600 font-semibold flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 shadow-md text-xs sm:text-sm">
      <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
      <span>{config.label}</span>
      <span className="hidden sm:inline ml-1.5 text-xs bg-green-600 px-2 py-0.5 rounded-full font-bold border border-green-700">
        ACTUAL
      </span>
    </Badge>
  );
}
