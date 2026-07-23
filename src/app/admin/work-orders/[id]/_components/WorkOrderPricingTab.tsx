"use client";

import { DollarSign } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkOrder } from "@/hooks/useWorkOrder";
import { formatCurrency } from "@/lib/utils";

interface WorkOrderPricingTabProps {
  workOrder: WorkOrder;
}

export function WorkOrderPricingTab({
  workOrder,
}: WorkOrderPricingTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Desglose de Precios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-admin-text-tertiary">Costo de Marco:</span>
            <span className="font-medium">
              {formatCurrency(workOrder.frame_cost)}
            </span>
          </div>
          {workOrder.presbyopia_solution === "two_separate" ? (
            <>
              <div className="flex justify-between">
                <span className="text-admin-text-tertiary">
                  Costo Lente Lejos (
                  {workOrder.far_lens_family?.name || "Lejos"}):
                </span>
                <span className="font-medium">
                  {formatCurrency(workOrder.far_lens_cost ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-admin-text-tertiary">
                  Costo Lente Cerca (
                  {workOrder.near_lens_family?.name || "Cerca"}):
                </span>
                <span className="font-medium">
                  {formatCurrency(workOrder.near_lens_cost ?? 0)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-admin-text-tertiary">
                Costo de Lente:
              </span>
              <span className="font-medium">
                {formatCurrency(workOrder.lens_cost)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-admin-text-tertiary">
              Costo de Tratamientos:
            </span>
            <span className="font-medium">
              {formatCurrency(workOrder.treatments_cost)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-admin-text-tertiary">
              Costo de Mano de Obra:
            </span>
            <span className="font-medium">
              {formatCurrency(workOrder.labor_cost)}
            </span>
          </div>
          {workOrder.lab_cost > 0 && (
            <div className="flex justify-between">
              <span className="text-admin-text-tertiary">
                Costo del Laboratorio:
              </span>
              <span className="font-medium">
                {formatCurrency(workOrder.lab_cost)}
              </span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between">
            <span className="font-medium">Subtotal:</span>
            <span className="font-medium">
              {formatCurrency(workOrder.subtotal)}
            </span>
          </div>
          {workOrder.discount_amount > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Descuento:</span>
              <span className="font-medium">
                -{formatCurrency(workOrder.discount_amount)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-admin-text-tertiary">IVA (19%):</span>
            <span className="font-medium">
              {formatCurrency(workOrder.tax_amount)}
            </span>
          </div>
          <div className="border-t pt-2 flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-admin-success">
              {formatCurrency(workOrder.total_amount)}
            </span>
          </div>
          {workOrder.deposit_amount > 0 && (
            <>
              <div className="border-t pt-2 flex justify-between">
                <span className="text-admin-text-tertiary">
                  Seña/Depósito:
                </span>
                <span className="font-medium">
                  {formatCurrency(workOrder.deposit_amount)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Saldo Pendiente:</span>
                <span className="text-orange-600">
                  {formatCurrency(workOrder.balance_amount)}
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
