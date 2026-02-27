"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";

export interface PrescriptionDisplayData {
  id?: string;
  prescription_number?: string;
  prescription_type?: string;
  prescription_date?: string;
  expiration_date?: string;
  is_current?: boolean;
  is_active?: boolean;
  issued_by?: string;
  issued_by_license?: string;
  od_sphere?: number | null;
  od_cylinder?: number | null;
  od_axis?: number | null;
  od_add?: number | null;
  od_pd?: number | null;
  od_near_pd?: number | null;
  od_prism?: number | null;
  od_base?: number | null;
  os_sphere?: number | null;
  os_cylinder?: number | null;
  os_axis?: number | null;
  os_add?: number | null;
  os_pd?: number | null;
  os_near_pd?: number | null;
  os_prism?: number | null;
  os_base?: number | null;
  frame_pd?: number | null;
  height_segmentation?: number | null;
  pd_distance?: number | null;
  pd_near?: number | null;
  notes?: string;
  // Legacy aliases (work-orders may use prism_od/prism_os)
  prism_od?: number | null;
  prism_os?: number | null;
}

interface PrescriptionFullDisplayProps {
  prescription: PrescriptionDisplayData;
  /** Compact mode for inline/summary display */
  compact?: boolean;
  /** Show card wrapper */
  showCard?: boolean;
  /** Title override */
  title?: string;
  /** Subtitle (e.g. date, type) */
  subtitle?: React.ReactNode;
  /** Additional badges (e.g. Actual, Activa) */
  badges?: React.ReactNode;
  className?: string;
}

function EyeSection({
  label,
  prefix,
  data,
}: {
  label: string;
  prefix: "od" | "os";
  data: PrescriptionDisplayData;
}) {
  const sphere = prefix === "od" ? data.od_sphere : data.os_sphere;
  const cylinder = prefix === "od" ? data.od_cylinder : data.os_cylinder;
  const axis = prefix === "od" ? data.od_axis : data.os_axis;
  const add = prefix === "od" ? data.od_add : data.os_add;
  const pd = prefix === "od" ? data.od_pd : data.os_pd;
  const nearPd = prefix === "od" ? data.od_near_pd : data.os_near_pd;
  const prism =
    prefix === "od"
      ? (data.od_prism ?? data.prism_od)
      : (data.os_prism ?? data.prism_os);
  const base = prefix === "od" ? data.od_base : data.os_base;

  const fields: Array<{
    label: string;
    value: number | null | undefined;
    format: (v: number) => string;
  }> = [
    {
      label: "Esfera",
      value: sphere,
      format: (v) => `${v > 0 ? "+" : ""}${v} D`,
    },
    {
      label: "Cilindro",
      value: cylinder,
      format: (v) => `${v > 0 ? "+" : ""}${v} D`,
    },
    { label: "Eje", value: axis, format: (v) => `${v}°` },
    { label: "ADD", value: add, format: (v) => `+${v} D` },
    { label: "PD Lejos", value: pd, format: (v) => `${v} mm` },
    { label: "PD Cerca", value: nearPd, format: (v) => `${v} mm` },
    { label: "Prisma", value: prism, format: (v) => `${v}` },
    { label: "Base", value: base, format: (v) => `${v}` },
  ];

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-admin-text-primary border-b border-admin-border-primary/30 pb-2">
        {label}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(
          (f) =>
            f.value !== null &&
            f.value !== undefined && (
              <div key={f.label}>
                <p className="text-xs text-admin-text-tertiary">{f.label}</p>
                <p className="font-medium text-admin-text-primary">
                  {f.format(f.value)}
                </p>
              </div>
            ),
        )}
      </div>
    </div>
  );
}

export function PrescriptionFullDisplay({
  prescription,
  compact = false,
  showCard = true,
  title,
  subtitle,
  badges,
  className = "",
}: PrescriptionFullDisplayProps) {
  const content = (
    <div className={compact ? "space-y-2" : "space-y-6"}>
      {(subtitle || badges) && !showCard && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          {subtitle && (
            <p className="text-sm text-admin-text-tertiary">{subtitle}</p>
          )}
          {badges && <div className="flex gap-2">{badges}</div>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <EyeSection label="Ojo Derecho (OD)" prefix="od" data={prescription} />
        <EyeSection
          label="Ojo Izquierdo (OS)"
          prefix="os"
          data={prescription}
        />
      </div>

      {/* Additional measurements */}
      {(prescription.frame_pd != null ||
        prescription.height_segmentation != null ||
        prescription.pd_distance != null ||
        prescription.pd_near != null ||
        prescription.issued_by) && (
        <div className="pt-4 border-t border-admin-border-primary/30 grid grid-cols-1 md:grid-cols-3 gap-4">
          {prescription.frame_pd != null && (
            <div>
              <p className="text-xs text-admin-text-tertiary">DP del Marco</p>
              <p className="font-medium text-admin-text-primary">
                {prescription.frame_pd} mm
              </p>
            </div>
          )}
          {prescription.height_segmentation != null && (
            <div>
              <p className="text-xs text-admin-text-tertiary">
                Altura de Segmento
              </p>
              <p className="font-medium text-admin-text-primary">
                {prescription.height_segmentation} mm
              </p>
            </div>
          )}
          {prescription.pd_distance != null && (
            <div>
              <p className="text-xs text-admin-text-tertiary">Distancia PD</p>
              <p className="font-medium text-admin-text-primary">
                {prescription.pd_distance} mm
              </p>
            </div>
          )}
          {prescription.pd_near != null && (
            <div>
              <p className="text-xs text-admin-text-tertiary">PD Cerca</p>
              <p className="font-medium text-admin-text-primary">
                {prescription.pd_near} mm
              </p>
            </div>
          )}
          {prescription.issued_by && (
            <div>
              <p className="text-xs text-admin-text-tertiary">Prescrito por</p>
              <p className="font-medium text-admin-text-primary">
                {prescription.issued_by}
                {prescription.issued_by_license &&
                  ` (${prescription.issued_by_license})`}
              </p>
            </div>
          )}
        </div>
      )}

      {prescription.notes && (
        <div className="pt-4 border-t border-admin-border-primary/30">
          <p className="text-xs text-admin-text-tertiary">Notas de la Receta</p>
          <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary mt-1">
            {prescription.notes}
          </p>
        </div>
      )}
    </div>
  );

  if (showCard) {
    return (
      <Card
        className={`bg-admin-bg-tertiary shadow-soft border border-admin-border-primary/20 ${className}`}
      >
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-admin-accent-primary" />
              {title ?? "Detalles de la Receta"}
            </CardTitle>
            {badges && <div className="flex gap-2">{badges}</div>}
          </div>
          {subtitle && (
            <p className="text-sm text-admin-text-tertiary mt-1">{subtitle}</p>
          )}
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return <div className={className}>{content}</div>;
}
