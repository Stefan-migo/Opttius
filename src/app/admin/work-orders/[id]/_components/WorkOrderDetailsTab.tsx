"use client";

import { Eye, Package } from "lucide-react";

import { PrescriptionFullDisplay, type PrescriptionDisplayData } from "@/components/admin/PrescriptionFullDisplay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabDeliveryCard } from "@/components/admin/LabDeliveryCard";
import { getLensTypeLabel } from "@/lib/lens-type-labels";
import type { WorkOrder } from "@/hooks/useWorkOrder";

interface WorkOrderDetailsTabProps {
  workOrder: WorkOrder;
}

export function WorkOrderDetailsTab({
  workOrder,
}: WorkOrderDetailsTabProps) {
  const rx = workOrder.prescription as PrescriptionDisplayData | undefined;

  return (
    <>
      {/* Prescription Details - Critical for Lab */}
      {rx && (
        <PrescriptionFullDisplay
          prescription={rx}
          subtitle={
            rx.prescription_date && (
              <>
                Fecha:{" "}
                {new Date(
                  rx.prescription_date + "T12:00:00",
                ).toLocaleDateString("es-CL")}
                {rx.prescription_type && (
                  <> • Tipo: {rx.prescription_type}</>
                )}
              </>
            )
          }
          title="Detalles de la Receta (Para Laboratorio)"
        />
      )}

      {/* Frame Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Detalles del Marco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-admin-text-tertiary">Nombre</p>
              <p className="font-medium">{workOrder.frame_name}</p>
            </div>
            {workOrder.frame_brand && (
              <div>
                <p className="text-xs text-admin-text-tertiary">Marca</p>
                <p className="font-medium">{workOrder.frame_brand}</p>
              </div>
            )}
            {workOrder.frame_model && (
              <div>
                <p className="text-xs text-admin-text-tertiary">Modelo</p>
                <p className="font-medium">{workOrder.frame_model}</p>
              </div>
            )}
            {workOrder.frame_color && (
              <div>
                <p className="text-xs text-admin-text-tertiary">Color</p>
                <p className="font-medium">{workOrder.frame_color}</p>
              </div>
            )}
            {workOrder.frame_size && (
              <div>
                <p className="text-xs text-admin-text-tertiary">Tamaño</p>
                <p className="font-medium">{workOrder.frame_size}</p>
              </div>
            )}
            {workOrder.frame_sku && (
              <div>
                <p className="text-xs text-admin-text-tertiary">SKU</p>
                <p className="font-medium">{workOrder.frame_sku}</p>
              </div>
            )}
            {workOrder.frame_serial_number && (
              <div>
                <p className="text-xs text-admin-text-tertiary">
                  Número de Serie
                </p>
                <p className="font-medium">
                  {workOrder.frame_serial_number}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lens Details - Split for two_separate presbyopia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            {workOrder.presbyopia_solution === "two_separate"
              ? "Detalles de Lentes (Lejos y Cerca)"
              : "Detalles del Lente"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workOrder.presbyopia_solution === "two_separate" ? (
            <div className="space-y-6">
              <div className="space-y-3 pb-4 border-b border-admin-border-primary/20">
                <h3 className="font-semibold text-epoch-primary border-b pb-2">
                  Lente Lejos
                </h3>
                <p className="text-xs text-admin-text-tertiary">Marco</p>
                <p className="font-medium">
                  {workOrder.frame_name}
                  {workOrder.frame_brand && ` · ${workOrder.frame_brand}`}
                  {workOrder.frame_model && ` · ${workOrder.frame_model}`}
                </p>
                <p className="text-xs text-admin-text-tertiary mt-2">
                  Tipo de Lente
                </p>
                <p className="font-medium">
                  {getLensTypeLabel(workOrder.lens_type)}
                </p>
                <p className="text-xs text-admin-text-tertiary mt-2">
                  Familia de lente
                </p>
                <p className="font-medium">
                  {workOrder.far_lens_family?.name || "—"}
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-epoch-primary border-b pb-2">
                  Lente Cerca
                </h3>
                <p className="text-xs text-admin-text-tertiary">Marco</p>
                <p className="font-medium">
                  {workOrder.frame_name}
                  {workOrder.frame_brand && ` · ${workOrder.frame_brand}`}
                  {workOrder.frame_model && ` · ${workOrder.frame_model}`}
                </p>
                <p className="text-xs text-admin-text-tertiary mt-2">
                  Tipo de Lente
                </p>
                <p className="font-medium">
                  {getLensTypeLabel(workOrder.lens_type)}
                </p>
                <p className="text-xs text-admin-text-tertiary mt-2">
                  Familia de lente
                </p>
                <p className="font-medium">
                  {workOrder.near_lens_family?.name || "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-admin-text-tertiary">
                  Tipo de Lente
                </p>
                <p className="font-medium">
                  {getLensTypeLabel(workOrder.lens_type)}
                </p>
              </div>
              <div>
                <p className="text-xs text-admin-text-tertiary">
                  Familia de lente
                </p>
                <p className="font-medium">
                  {workOrder.lens_family?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-admin-text-tertiary">Material</p>
                <p className="font-medium">{workOrder.lens_material}</p>
              </div>
              {workOrder.lens_index && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Índice de Refracción
                  </p>
                  <p className="font-medium">{workOrder.lens_index}</p>
                </div>
              )}
              {workOrder.lens_treatments &&
                workOrder.lens_treatments.length > 0 && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">
                      Tratamientos
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {workOrder.lens_treatments.map(
                        (treatment: string, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {treatment}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}
              {workOrder.lens_tint_color && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Color del Tinte
                  </p>
                  <p className="font-medium">{workOrder.lens_tint_color}</p>
                </div>
              )}
              {workOrder.lens_tint_percentage && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Porcentaje de Tinte
                  </p>
                  <p className="font-medium">
                    {workOrder.lens_tint_percentage}%
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lab Information */}
      <LabDeliveryCard workOrder={workOrder} />

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notas y Observaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workOrder.internal_notes && (
            <div>
              <p className="text-sm text-admin-text-tertiary mb-1">
                Notas Internas
              </p>
              <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary p-3 rounded-xl border border-admin-border-primary/20">
                {workOrder.internal_notes}
              </p>
            </div>
          )}
          {workOrder.customer_notes && (
            <div>
              <p className="text-sm text-admin-text-tertiary mb-1">
                Notas para el Cliente
              </p>
              <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary p-3 rounded-xl border border-admin-border-primary/20">
                {workOrder.customer_notes}
              </p>
            </div>
          )}
          {workOrder.lab_notes && (
            <div>
              <p className="text-sm text-admin-text-tertiary mb-1">
                Notas del Laboratorio
              </p>
              <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary p-3 rounded-xl border border-admin-border-primary/20">
                {workOrder.lab_notes}
              </p>
            </div>
          )}
          {workOrder.quality_notes && (
            <div>
              <p className="text-sm text-admin-text-tertiary mb-1">
                Notas de Control de Calidad
              </p>
              <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary p-3 rounded-xl border border-admin-border-primary/20">
                {workOrder.quality_notes}
              </p>
            </div>
          )}
          {workOrder.assigned_staff && (
            <div>
              <p className="text-sm text-admin-text-tertiary">Asignado a</p>
              <p className="font-medium">
                {workOrder.assigned_staff.first_name}{" "}
                {workOrder.assigned_staff.last_name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
