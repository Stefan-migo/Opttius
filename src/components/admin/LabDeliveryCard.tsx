"use client";

import { Factory } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { WorkOrder } from "@/hooks/useWorkOrder";

interface LabDeliveryCardProps {
  workOrder: WorkOrder;
}

export function LabDeliveryCard({ workOrder }: LabDeliveryCardProps) {
  if (!workOrder.lab_name) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Factory className="h-5 w-5 mr-2" />
          Información del Laboratorio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <p className="text-sm text-admin-text-tertiary">Nombre</p>
          <p className="font-medium">{workOrder.lab_name}</p>
        </div>
        {workOrder.lab_contact && (
          <div>
            <p className="text-sm text-admin-text-tertiary">Contacto</p>
            <p className="font-medium">{workOrder.lab_contact}</p>
          </div>
        )}
        {workOrder.lab_order_number && (
          <div>
            <p className="text-sm text-admin-text-tertiary">Número de Orden</p>
            <p className="font-medium">{workOrder.lab_order_number}</p>
          </div>
        )}
        {workOrder.lab_estimated_delivery_date && (
          <div>
            <p className="text-sm text-admin-text-tertiary">Fecha Estimada</p>
            <p className="font-medium">
              {formatDate(workOrder.lab_estimated_delivery_date)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
