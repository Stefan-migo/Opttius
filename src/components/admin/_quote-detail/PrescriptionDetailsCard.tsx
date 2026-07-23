"use client";

import { Eye } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PrescriptionFields = {
  od_sphere: number | null; od_cylinder: number | null; od_axis: number | null;
  od_add: number | null; od_pd: number | null; od_near_pd: number | null;
  os_sphere: number | null; os_cylinder: number | null; os_axis: number | null;
  os_add: number | null; os_pd: number | null; os_near_pd: number | null;
  frame_pd: number | null; height_segmentation: number | null;
  prism_od: string | null; prism_os: string | null;
  issued_by: string | null; notes: string | null;
};

function RxField({ label, value, suffix = "" }: { label: string; value: number | null | undefined; suffix?: string }) {
  if (value === null || value === undefined) return null;
  return (
    <div>
      <p className="text-xs text-admin-text-tertiary">{label}</p>
      <p className="font-medium">{value > 0 ? "+" : ""}{value}{suffix && ` ${suffix}`}</p>
    </div>
  );
}

export function PrescriptionDetailsCard({ rx }: { rx: PrescriptionFields | null }) {
  if (!rx) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center"><Eye className="h-5 w-5 mr-2" />Detalles de la Receta</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-epoch-primary border-b pb-2">Ojo Derecho (OD)</h3>
            <div className="grid grid-cols-2 gap-3">
              <RxField label="Esfera" suffix="D" value={rx.od_sphere} />
              <RxField label="Cilindro" suffix="D" value={rx.od_cylinder} />
              <RxField label="Eje" suffix="°" value={rx.od_axis} />
              <RxField label="Adición" suffix="D" value={rx.od_add !== null ? Number(rx.od_add) : null} />
              <RxField label="DP Lejos" suffix="mm" value={rx.od_pd} />
              <RxField label="DP Cerca" suffix="mm" value={rx.od_near_pd} />
            </div>
            {rx.prism_od && <div className="mt-2"><p className="text-xs text-admin-text-tertiary">Prisma</p><p className="font-medium">{rx.prism_od}</p></div>}
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-epoch-primary border-b pb-2">Ojo Izquierdo (OS)</h3>
            <div className="grid grid-cols-2 gap-3">
              <RxField label="Esfera" suffix="D" value={rx.os_sphere} />
              <RxField label="Cilindro" suffix="D" value={rx.os_cylinder} />
              <RxField label="Eje" suffix="°" value={rx.os_axis} />
              <RxField label="Adición" suffix="D" value={rx.os_add !== null ? Number(rx.os_add) : null} />
              <RxField label="DP Lejos" suffix="mm" value={rx.os_pd} />
              <RxField label="DP Cerca" suffix="mm" value={rx.os_near_pd} />
            </div>
            {rx.prism_os && <div className="mt-2"><p className="text-xs text-admin-text-tertiary">Prisma</p><p className="font-medium">{rx.prism_os}</p></div>}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
          <RxField label="DP del Marco" suffix="mm" value={rx.frame_pd} />
          <RxField label="Altura de Segmento" suffix="mm" value={rx.height_segmentation} />
          {rx.issued_by && <div><p className="text-xs text-admin-text-tertiary">Prescrito por</p><p className="font-medium">{rx.issued_by}</p></div>}
        </div>
        {rx.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-admin-text-tertiary">Notas de la Receta</p>
            <p className="font-medium whitespace-pre-wrap text-sm">{rx.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
