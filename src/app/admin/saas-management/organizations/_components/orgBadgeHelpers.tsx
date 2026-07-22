import { CheckCircle2, Pause, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    active: "default",
    suspended: "secondary",
    cancelled: "destructive",
  };
  const icons: Record<string, typeof CheckCircle2> = {
    active: CheckCircle2,
    suspended: Pause,
    cancelled: XCircle,
  };
  const Icon = icons[status] || CheckCircle2;
  return (
    <Badge variant={variants[status] || "default"}>
      <Icon className="h-3 w-3 mr-1" />
      {status === "active"
        ? "Activa"
        : status === "suspended"
          ? "Suspendida"
          : "Cancelada"}
    </Badge>
  );
}

export function getTierBadge(tier: string) {
  const colors: Record<string, string> = {
    basic: "bg-gray-100 text-gray-800",
    pro: "bg-blue-100 text-blue-800",
    premium: "bg-purple-100 text-purple-800",
  };
  return (
    <Badge className={colors[tier] || colors.basic}>
      {tier === "basic"
        ? "Básico"
        : tier === "pro"
          ? "Pro"
          : tier === "premium"
            ? "Premium"
            : tier}
    </Badge>
  );
}
