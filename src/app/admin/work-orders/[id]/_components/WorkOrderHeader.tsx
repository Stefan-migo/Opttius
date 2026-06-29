"use client";

import { ArrowLeft, Printer, Trash2 } from "lucide-react";

import { WorkOrderStatusBadge } from "@/components/admin/WorkOrderStatusBadge";
import { Button } from "@/components/ui/button";

interface WorkOrderHeaderProps {
  workOrderNumber: string;
  customerName: string;
  workOrder: { status: string };
  onBack: () => void;
  onPrint: () => void;
  onDelete: () => void;
}

export function WorkOrderHeader({
  workOrderNumber,
  customerName,
  workOrder,
  onBack,
  onPrint,
  onDelete,
}: WorkOrderHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <div className="flex items-center gap-2">
        <Button
          aria-label="Volver"
          className="h-9 w-9 shrink-0"
          size="icon"
          variant="outline"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-epoch-primary truncate min-w-0">
          {workOrderNumber}
        </h1>
      </div>
      <p className="text-xs sm:text-sm text-admin-text-tertiary">
        Trabajo para {customerName}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative inline-block">
          <WorkOrderStatusBadge status={workOrder.status} />
        </div>
        <Button
          aria-label="Imprimir"
          className="h-9 w-9 sm:w-auto sm:px-3"
          size="sm"
          variant="outline"
          onClick={onPrint}
        >
          <Printer className="h-4 w-4 sm:mr-2 shrink-0" />
          <span className="hidden lg:inline">Imprimir</span>
        </Button>
        <Button
          aria-label="Eliminar"
          className="h-9 w-9 sm:w-auto sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
          size="sm"
          variant="outline"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 sm:mr-2 shrink-0" />
          <span className="hidden lg:inline">Eliminar</span>
        </Button>
      </div>
    </div>
  );
}
