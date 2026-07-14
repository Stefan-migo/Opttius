"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContactLensPrescription {
  sphere_od: number;
  cylinder_od: number;
  axis_od: number | null;
  add_od: number | null;
  base_curve_od: number | null;
  diameter_od: number | null;
  sphere_os: number;
  cylinder_os: number;
  axis_os: number | null;
  add_os: number | null;
  base_curve_os: number | null;
  diameter_os: number | null;
}

interface Props {
  prescription: ContactLensPrescription | null | undefined;
  manualPrescription: ContactLensPrescription;
  sphereOptions: number[];
  cylinderOptions: number[];
  onManualChange: (prescription: ContactLensPrescription) => void;
}

function PrescriptionDisplay({
  label,
  prescription,
}: {
  label: string;
  prescription: ContactLensPrescription;
}) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="font-medium text-sm mb-2 text-center">{label}</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Esfera:</span>{" "}
          <span className="font-medium">
            {prescription.sphere_od >= 0 ? "+" : ""}
            {prescription.sphere_od.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Cilindro:</span>{" "}
          <span className="font-medium">
            {prescription.cylinder_od >= 0 ? "+" : ""}
            {prescription.cylinder_od.toFixed(2)}
          </span>
        </div>
        {prescription.axis_od && (
          <div>
            <span className="text-muted-foreground">Eje:</span>{" "}
            <span className="font-medium">{prescription.axis_od}°</span>
          </div>
        )}
        {prescription.add_od && (
          <div>
            <span className="text-muted-foreground">Adición:</span>{" "}
            <span className="font-medium">+{prescription.add_od.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PrescriptionManualEntry({
  side,
  values,
  sphereOptions,
  cylinderOptions,
  onFieldChange,
}: {
  side: "od" | "os";
  values: ContactLensPrescription;
  sphereOptions: number[];
  cylinderOptions: number[];
  onFieldChange: (field: string, value: number) => void;
}) {
  const sphereField = `sphere_${side}` as const;
  const cylinderField = `cylinder_${side}` as const;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-center">{side.toUpperCase()}</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Esfera</Label>
          <Select
            value={values[sphereField].toString()}
            onValueChange={(v) => onFieldChange(sphereField, parseFloat(v))}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-40">
              {sphereOptions.map((s) => (
                <SelectItem key={s} value={s.toString()}>
                  {s >= 0 ? "+" : ""}
                  {s.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Cilindro</Label>
          <Select
            value={values[cylinderField].toString()}
            onValueChange={(v) => onFieldChange(cylinderField, parseFloat(v))}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-40">
              {cylinderOptions.map((c) => (
                <SelectItem key={c} value={c.toString()}>
                  {c >= 0 ? "+" : ""}
                  {c.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function ContactLensPrescriptionSection({
  prescription,
  manualPrescription,
  sphereOptions,
  cylinderOptions,
  onManualChange,
}: Props) {
  const handleFieldChange = (field: string, value: number) => {
    onManualChange({ ...manualPrescription, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Graduación</Label>
        {!prescription && (
          <span className="text-xs text-muted-foreground">
            Ingrese la graduación manualmente
          </span>
        )}
      </div>

      {prescription ? (
        <div className="grid grid-cols-2 gap-4">
          <PrescriptionDisplay label="Ojo Derecho (OD)" prescription={prescription} />
          <PrescriptionDisplay label="Ojo Izquierdo (OS)" prescription={prescription} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <PrescriptionManualEntry
            side="od"
            values={manualPrescription}
            sphereOptions={sphereOptions}
            cylinderOptions={cylinderOptions}
            onFieldChange={handleFieldChange}
          />
          <PrescriptionManualEntry
            side="os"
            values={manualPrescription}
            sphereOptions={sphereOptions}
            cylinderOptions={cylinderOptions}
            onFieldChange={handleFieldChange}
          />
        </div>
      )}
    </div>
  );
}
