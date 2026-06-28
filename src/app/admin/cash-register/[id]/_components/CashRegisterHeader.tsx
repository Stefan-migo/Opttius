"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CashRegisterHeaderProps {
  status: string;
  reopenedAt?: string | null;
  closureDate: string;
  formatDateTime: (date: string | null | undefined) => string;
}

function getStatusBadge(status: string, reopenedAt?: string | null) {
  type BadgeVariant = "default" | "secondary" | "destructive" | "outline";
  const config: Record<string, { variant: BadgeVariant; label: string }> = {
    draft: { variant: "outline", label: "Borrador" },
    confirmed: { variant: "secondary", label: "Confirmado" },
    reviewed: { variant: "secondary", label: "Revisado" },
    closed: { variant: "default", label: "Cerrada" },
    reopened: { variant: "secondary", label: "Abierta" },
  };
  if (status === "closed" && reopenedAt) {
    const badgeConfig = config.reopened || {
      variant: "outline" as BadgeVariant,
      label: "Abierta",
    };
    return <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>;
  }
  const badgeConfig = config[status] || {
    variant: "outline" as BadgeVariant,
    label: status,
  };
  return <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>;
}

export default function CashRegisterHeader({
  status,
  reopenedAt,
  closureDate,
  formatDateTime,
}: CashRegisterHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 min-w-0">
        <Link className="shrink-0" href="/admin/cash-register">
          <Button className="w-full sm:w-auto" size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-epoch-primary truncate">
            Cierre de Caja
          </h1>
          <p className="text-sm text-admin-text-tertiary">
            {formatDateTime(closureDate)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {getStatusBadge(status, reopenedAt)}
      </div>
    </div>
  );
}
