import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import type { ExternalPrescriptionData } from "./POSAdvancedSale.types";
import { PresbyopiaSolutionSelector } from "./PresbyopiaSolutionSelector";

interface ExternalPrescriptionFormProps {
  data: ExternalPrescriptionData;
  onChange: React.Dispatch<React.SetStateAction<ExternalPrescriptionData>>;
  presbyopiaValue: string;
  onPresbyopiaChange: (value: string) => void;
}

export function ExternalPrescriptionForm({
  data,
  onChange,
  presbyopiaValue,
  onPresbyopiaChange,
}: ExternalPrescriptionFormProps) {
  const hasAddition =
    (data.od_add && data.od_add.trim() !== "") ||
    (data.os_add && data.os_add.trim() !== "");

  return (
    <div className="space-y-4">
      <Separator />
      <h4 className="font-medium">Datos de Receta Externa</h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Fecha Receta</Label>
          <Input
            type="date"
            value={data.prescription_date}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, prescription_date: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Fecha Vencimiento</Label>
          <Input
            type="date"
            value={data.expiration_date}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, expiration_date: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Doctor/Optometrista</Label>
          <Input
            placeholder="Nombre del profesional"
            value={data.issued_by}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, issued_by: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Licencia</Label>
          <Input
            placeholder="N° de licencia"
            value={data.issued_by_license}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, issued_by_license: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="p-3 border rounded-lg bg-muted/30">
        <h5 className="font-medium mb-2">Ojo Derecho (OD)</h5>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">Esfera</Label>
            <Input
              placeholder="-2.00"
              value={data.od_sphere}
              onChange={(e) => onChange((prev) => ({ ...prev, od_sphere: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Cilindro</Label>
            <Input
              placeholder="-0.50"
              value={data.od_cylinder}
              onChange={(e) => onChange((prev) => ({ ...prev, od_cylinder: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Eje</Label>
            <Input
              placeholder="180"
              value={data.od_axis}
              onChange={(e) => onChange((prev) => ({ ...prev, od_axis: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Adición</Label>
            <Input
              placeholder="+2.50"
              value={data.od_add}
              onChange={(e) => onChange((prev) => ({ ...prev, od_add: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="p-3 border rounded-lg bg-muted/30">
        <h5 className="font-medium mb-2">Ojo Izquierdo (OI)</h5>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">Esfera</Label>
            <Input
              placeholder="-2.00"
              value={data.os_sphere}
              onChange={(e) => onChange((prev) => ({ ...prev, os_sphere: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Cilindro</Label>
            <Input
              placeholder="-0.50"
              value={data.os_cylinder}
              onChange={(e) => onChange((prev) => ({ ...prev, os_cylinder: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Eje</Label>
            <Input
              placeholder="180"
              value={data.os_axis}
              onChange={(e) => onChange((prev) => ({ ...prev, os_axis: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Adición</Label>
            <Input
              placeholder="+2.50"
              value={data.os_add}
              onChange={(e) => onChange((prev) => ({ ...prev, os_add: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>DP Lejos (Binocular)</Label>
          <Input
            placeholder="63"
            value={data.pd}
            onChange={(e) => onChange((prev) => ({ ...prev, pd: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground mt-1">Distancia pupilar total (OD + OI)</p>
        </div>
        <div>
          <Label>DP Cerca (Binocular)</Label>
          <Input
            placeholder="60"
            value={data.near_pd}
            onChange={(e) => onChange((prev) => ({ ...prev, near_pd: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground mt-1">Distancia pupilar para visión cercana</p>
        </div>
      </div>

      {hasAddition && (
        <PresbyopiaSolutionSelector
          value={presbyopiaValue}
          onChange={onPresbyopiaChange}
        />
      )}
    </div>
  );
}
