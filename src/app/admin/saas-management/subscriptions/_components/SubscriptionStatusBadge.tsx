"use client";

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Play,
  Trash2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function getStatusBadge(
  status: string,
  isExpiringSoon?: boolean,
  isExpired?: boolean,
) {
  if (isExpired)
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Vencida
      </Badge>
    );
  if (isExpiringSoon)
    return (
      <Badge className="bg-yellow-100 text-yellow-800" variant="secondary">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Por vencer
      </Badge>
    );
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    active: "default",
    trialing: "secondary",
    past_due: "destructive",
    cancelled: "destructive",
    incomplete: "secondary",
  };
  const icons: Record<string, typeof CheckCircle2> = {
    active: CheckCircle2,
    trialing: Clock,
    past_due: AlertTriangle,
    cancelled: XCircle,
    incomplete: Clock,
  };
  const Icon = icons[status] || CheckCircle2;
  return (
    <Badge variant={variants[status] || "default"}>
      <Icon className="h-3 w-3 mr-1" />
      {status === "active"
        ? "Activa"
        : status === "trialing"
          ? "Trial"
          : status === "past_due"
            ? "Vencida"
            : status === "cancelled"
              ? "Cancelada"
              : status === "incomplete"
                ? "Incompleta"
                : status}
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

interface ActionMenuProps {
  status: string;
  onView: () => void;
  onCancel?: () => void;
  onReactivate?: () => void;
  onDelete?: () => void;
}

export function SubscriptionActionMenu({
  status,
  onView,
  onCancel,
  onReactivate,
  onDelete,
}: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost">
          <Ban className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Ban className="h-4 w-4 mr-2" />
          Ver detalles
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {status === "cancelled" ? (
          <DropdownMenuItem onClick={onReactivate}>
            <Play className="h-4 w-4 mr-2" />
            Reactivar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onCancel}>
            <Ban className="h-4 w-4 mr-2" />
            Cancelar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
