"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Crown,
  Edit,
  FileText,
  Package,
  ShoppingBag,
  Star,
} from "lucide-react";
import Link from "next/link";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/api/services";

interface CustomerHeaderProps {
  customer: Customer;
  onBack: () => void;
}

function getSegmentBadge(segment: string) {
  type BadgeVariant =
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "healty"
    | null
    | undefined;
  const variants: Record<
    string,
    {
      variant: BadgeVariant;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      color: string;
    }
  > = {
    new: {
      variant: "secondary",
      label: "Nuevo",
      icon: Star,
      color: "text-yellow-600",
    },
    "first-time": {
      variant: "outline",
      label: "Primera Compra",
      icon: Package,
      color: "text-blue-600",
    },
    regular: {
      variant: "default",
      label: "Regular",
      icon: CheckCircle,
      color: "text-green-600",
    },
    vip: {
      variant: "secondary",
      label: "VIP",
      icon: Crown,
      color: "text-purple-600",
    },
    "at-risk": {
      variant: "destructive",
      label: "En Riesgo",
      icon: AlertTriangle,
      color: "text-red-600",
    },
  };

  const config = variants[segment] || variants["new"];
  const Icon = config.icon;

  return (
    <Badge className="flex items-center gap-1" variant={config.variant}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function CustomerHeader({ customer, onBack }: CustomerHeaderProps) {
  const customerName =
    customer.first_name && customer.last_name
      ? `${customer.first_name} ${customer.last_name}`
      : "Sin nombre";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          className="min-h-[44px] shrink-0"
          size="sm"
          variant="outline"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary truncate">
          {customerName}
        </h1>
      </div>
      <p className="text-sm text-admin-text-tertiary">
        {customer.email || "Sin email"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {customer.analytics?.segment &&
          getSegmentBadge(customer.analytics.segment)}
        {customer.is_convenio_client && (
          <Badge
            className="border-admin-accent-primary/50 text-admin-accent-primary"
            variant="outline"
          >
            <FileText className="h-3 w-3 mr-1" />
            Cliente convenio
          </Badge>
        )}
        <Link href={`/admin/customers/${customer.id}/edit`}>
          <Button className="min-h-[44px]">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>
    </div>
  );
}
