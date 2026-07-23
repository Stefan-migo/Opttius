"use client";

import { Calculator, Eye, Package, User } from "lucide-react";
import Link from "next/link";

import { LabDeliveryCard } from "@/components/admin/LabDeliveryCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkOrder } from "@/hooks/useWorkOrder";
import { formatCurrency, formatDate } from "@/lib/utils";

interface WorkOrderOverviewTabProps {
  workOrder: WorkOrder;
  customerName: string;
  getPaymentStatusBadge: (status: string) => React.ReactNode;
}

export function WorkOrderOverviewTab({
  workOrder,
  customerName,
  getPaymentStatusBadge,
}: WorkOrderOverviewTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-admin-text-tertiary">Nombre</p>
              <p className="font-medium">{customerName}</p>
            </div>
            {workOrder.customer?.email && (
              <div>
                <p className="text-sm text-admin-text-tertiary">Email</p>
                <p className="font-medium">{workOrder.customer.email}</p>
              </div>
            )}
            {workOrder.customer?.phone && (
              <div>
                <p className="text-sm text-admin-text-tertiary">Teléfono</p>
                <p className="font-medium">{workOrder.customer.phone}</p>
              </div>
            )}
            <Link href={`/admin/customers/${workOrder.customer?.id}`}>
              <Button className="w-full mt-4" size="sm" variant="outline">
                Ver Cliente
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Prescription Info */}
        {workOrder.prescription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Receta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-admin-text-tertiary">Fecha</p>
                <p className="font-medium">
                  {formatDate(workOrder.prescription.prescription_date)}
                </p>
              </div>
              {workOrder.prescription.prescription_type && (
                <div>
                  <p className="text-sm text-admin-text-tertiary">Tipo</p>
                  <p className="font-medium">
                    {workOrder.prescription.prescription_type}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-admin-text-tertiary">
                Fecha de Creación
              </p>
              <p className="font-medium">
                {formatDate(workOrder.work_order_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-admin-text-tertiary">
                Estado de Pago
              </p>
              {getPaymentStatusBadge(workOrder.payment_status)}
            </div>
            <div>
              <p className="text-sm text-admin-text-tertiary">Total</p>
              <p className="text-2xl font-bold text-admin-success">
                {formatCurrency(workOrder.total_amount)}
              </p>
            </div>
            {workOrder.deposit_amount > 0 && (
              <div>
                <p className="text-sm text-admin-text-tertiary">
                  Saldo Pendiente
                </p>
                <p className="font-semibold text-orange-600">
                  {formatCurrency(workOrder.balance_amount)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Marco y Lente - Single merged card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            <Eye className="h-5 w-5 mr-2" />
            Marco y Lente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workOrder.presbyopia_solution === "two_separate" ? (
            <>
              <div className="space-y-2 pb-4 border-b border-admin-border-primary/20">
                <p className="text-xs font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                  Par Lejos
                </p>
                <p className="font-medium">
                  Marco: {workOrder.frame_name}
                  {workOrder.frame_brand && ` (${workOrder.frame_brand})`}
                </p>
                <p className="font-medium">
                  Lente:{" "}
                  {workOrder.far_lens_family?.name ||
                    workOrder.lens_type ||
                    "—"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                  Par Cerca
                </p>
                <p className="font-medium">
                  Marco: {workOrder.frame_name}
                  {workOrder.frame_brand && ` (${workOrder.frame_brand})`}
                </p>
                <p className="font-medium">
                  Lente: {workOrder.near_lens_family?.name || "—"}
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div>
                <p className="text-sm text-admin-text-tertiary">Marco</p>
                <p className="font-medium">{workOrder.frame_name}</p>
                {workOrder.frame_brand && (
                  <p className="text-sm text-admin-text-tertiary">
                    {workOrder.frame_brand}
                    {workOrder.frame_model && ` · ${workOrder.frame_model}`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-admin-text-tertiary">Lente</p>
                <p className="font-medium">
                  {workOrder.lens_family?.name ||
                    workOrder.lens_type ||
                    "—"}
                </p>
                <p className="text-sm text-admin-text-tertiary">
                  {workOrder.lens_material}
                  {workOrder.lens_index &&
                    ` · Índice ${workOrder.lens_index}`}
                </p>
                {workOrder.lens_treatments &&
                  workOrder.lens_treatments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {workOrder.lens_treatments.map(
                        (treatment: string, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {treatment}
                          </Badge>
                        ),
                      )}
                    </div>
                  )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lab Information */}
      <LabDeliveryCard workOrder={workOrder} />
    </>
  );
}
