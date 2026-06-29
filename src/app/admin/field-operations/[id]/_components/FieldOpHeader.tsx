"use client";

import { AlertCircle, ArrowLeft, Calendar, MapPin } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

interface FieldOperation {
  id: string;
  name: string;
  scheduled_date: string;
  location: string | null;
  branch_id: string;
  status: string;
  created_at: string;
}

interface MobileStockItem {
  id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  products?: { id: string; name: string; sku: string | null };
}

interface FieldOpHeaderProps {
  operation: FieldOperation;
  updatingStatus: boolean;
  handleStatusChange: (newStatus: string) => void;
  mobileStock: MobileStockItem[];
}

export default function FieldOpHeader({
  operation,
  updatingStatus,
  handleStatusChange,
  mobileStock,
}: FieldOpHeaderProps) {
  return (
    <>
      <Link
        className="inline-flex items-center gap-2 text-sm text-admin-text-tertiary hover:text-admin-text-primary min-h-[44px]"
        href="/admin/field-operations"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Volver a operativos
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary tracking-tight truncate">
            {operation.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-admin-text-tertiary">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4 shrink-0" />
              {formatDate(operation.scheduled_date)}
            </span>
            {operation.location && (
              <span className="flex items-center gap-1 truncate max-w-full">
                <MapPin className="h-4 w-4 shrink-0" />
                {operation.location}
              </span>
            )}
          </div>
        </div>
        <Select
          disabled={updatingStatus}
          value={operation.status}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[160px] min-h-[44px] shrink-0 text-admin-text-primary border-admin-border-primary/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
              <SelectItem
                className="text-admin-text-primary"
                key={value}
                value={value}
              >
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mobileStock.length > 0 && operation.status !== "completed" && (
        <Alert className="border-admin-accent-secondary/30 bg-admin-bg-secondary/5">
          <AlertCircle className="h-4 w-4 text-admin-accent-primary" />
          <AlertDescription className="text-admin-text-secondary text-sm">
            Al marcar este operativo como <strong>Completado</strong>, todo el
            stock sobrante en la bodega móvil se devolverá automáticamente al
            inventario de la sucursal.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  draft: { label: "Borrador", variant: "outline" },
  prepared: { label: "Preparado", variant: "secondary" },
  in_progress: { label: "En terreno", variant: "default" },
  completed: { label: "Completado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};
