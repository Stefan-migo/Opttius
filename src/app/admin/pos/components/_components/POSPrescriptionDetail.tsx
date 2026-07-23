"use client";

import { Badge } from "@/components/ui/badge";
import type { Prescription } from "@/lib/api/services/customerService";

interface POSPrescriptionDetailProps {
  prescription: Prescription;
}

/**
 * POSPrescriptionDetail — displays a selected prescription values.
 *
 * Extracted from POSAdvancedSaleCustomerTab.tsx.
 */
export function POSPrescriptionDetail({
  prescription,
}: POSPrescriptionDetailProps) {
  return (
    <div className="mt-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex justify-between items-center mb-2">
        <h5 className="font-medium text-sm">Valores de Receta</h5>
        {prescription.is_current && (
          <Badge className="text-xs" variant="outline">
            Receta Vigente
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="font-medium">OD (Ojo Derecho):</span>
          <div className="text-muted-foreground">
            {prescription?.od_sphere != null
              ? `Esf: ${prescription!.od_sphere! >= 0 ? "+" : ""}${prescription!.od_sphere}`
              : "Sin dato"}
            {(prescription?.od_cylinder ?? 0) !== 0 &&
              ` Cil: ${prescription!.od_cylinder! >= 0 ? "+" : ""}${prescription!.od_cylinder}`}
            {(prescription?.od_axis ?? 0) !== 0 &&
              ` x ${prescription!.od_axis}°`}
            {(prescription?.od_add ?? 0) > 0 &&
              ` Ad: +${prescription!.od_add}`}
          </div>
        </div>
        <div>
          <span className="font-medium">OI (Ojo Izquierdo):</span>
          <div className="text-muted-foreground">
            {prescription?.os_sphere != null
              ? `Esf: ${prescription!.os_sphere! >= 0 ? "+" : ""}${prescription!.os_sphere}`
              : "Sin dato"}
            {(prescription?.os_cylinder ?? 0) !== 0 &&
              ` Cil: ${prescription!.os_cylinder! >= 0 ? "+" : ""}${prescription!.os_cylinder}`}
            {(prescription?.os_axis ?? 0) !== 0 &&
              ` x ${prescription!.os_axis}°`}
            {(prescription?.os_add ?? 0) > 0 &&
              ` Ad: +${prescription!.os_add}`}
          </div>
        </div>
      </div>
      {(prescription?.pd_distance ||
        prescription?.od_pd ||
        prescription?.os_pd) && (
        <div className="mt-2 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">
            Distancia Pupilar (DP):
          </div>
          <div className="flex gap-4 mt-1">
            {(prescription?.od_pd || prescription?.pd_distance) && (
              <div>
                <span className="text-muted-foreground">Lejos:</span>{" "}
                <span className="font-medium">
                  {prescription?.pd_distance
                    ? `${prescription.pd_distance}mm`
                    : prescription?.od_pd && prescription?.os_pd
                      ? `${Number(prescription.od_pd) + Number(prescription.os_pd)}mm`
                      : prescription?.od_pd
                        ? `${prescription.od_pd}mm`
                        : ""}
                </span>
              </div>
            )}
            {prescription?.pd_near && (
              <div>
                <span className="text-muted-foreground">Cerca:</span>{" "}
                <span className="font-medium">{prescription?.pd_near}mm</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
