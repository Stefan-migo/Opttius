import { Badge } from "@/components/ui/badge";
import { Clock, Package, Truck, X } from "lucide-react";

export function getStatusBadge(status: string) {
  const statusConfig: Record<string, { variant: "secondary" | "default" | "destructive"; label: string; icon: React.ReactNode }> = {
    pending: { variant: "secondary", label: "Pendiente", icon: <Clock className="h-3 w-3" /> },
    confirmed: { variant: "default", label: "Confirmado", icon: <Package className="h-3 w-3" /> },
    in_transit: { variant: "default", label: "En Tránsito", icon: <Truck className="h-3 w-3" /> },
    delivered: { variant: "default", label: "Entregado", icon: <Package className="h-3 w-3" /> },
    cancelled: { variant: "destructive", label: "Cancelado", icon: <X className="h-3 w-3" /> },
  };
  const config = statusConfig[status] || statusConfig.pending;
  return <Badge className="flex items-center gap-1" variant={config.variant}>{config.icon}{config.label}</Badge>;
}

export function getPriorityBadge(priority: string) {
  const priorityConfig: Record<string, { variant: "secondary" | "default" | "destructive"; label: string }> = {
    low: { variant: "secondary", label: "Baja" },
    medium: { variant: "default", label: "Media" },
    high: { variant: "destructive", label: "Alta" },
    urgent: { variant: "destructive", label: "Urgente" },
  };
  const config = priorityConfig[priority] || priorityConfig.medium;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
