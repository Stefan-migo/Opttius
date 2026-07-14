"use client";

import { Calendar, DollarSign, Info } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { QuoteSettings } from "@/lib/api/services";

interface QuoteGeneralTabProps {
  defaultLaborCost: number;
  defaultTaxPercentage: number;
  defaultExpirationDays: number;
  laborCostIncludesTax: boolean;
  lensCostIncludesTax: boolean;
  treatmentsCostIncludesTax: boolean;
  onUpdateSetting: <K extends keyof QuoteSettings>(
    key: K,
    value: QuoteSettings[K],
  ) => void;
}

export function QuoteGeneralTab({
  defaultLaborCost,
  defaultTaxPercentage,
  defaultExpirationDays,
  laborCostIncludesTax,
  lensCostIncludesTax,
  treatmentsCostIncludesTax,
  onUpdateSetting,
}: QuoteGeneralTabProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Valores por Defecto
          </CardTitle>
          <CardDescription>
            Configura los valores predeterminados que se usarán al crear
            nuevos presupuestos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label
                className="text-base font-semibold"
                htmlFor="labor_cost"
              >
                Mano de Obra por Defecto
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary">
                  CLP
                </span>
                <Input
                  className="pl-12"
                  id="labor_cost"
                  type="number"
                  value={defaultLaborCost}
                  onChange={(e) =>
                    onUpdateSetting(
                      "default_labor_cost",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                />
              </div>
              <p className="text-xs text-admin-text-tertiary">
                Este valor se aplicará automáticamente a nuevos presupuestos
              </p>
            </div>

            <div className="space-y-2">
              <Label
                className="text-base font-semibold"
                htmlFor="tax_percentage"
              >
                Porcentaje de IVA
              </Label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary">
                  %
                </span>
                <Input
                  className="pr-12"
                  id="tax_percentage"
                  step="0.1"
                  type="number"
                  value={defaultTaxPercentage}
                  onChange={(e) =>
                    onUpdateSetting(
                      "default_tax_percentage",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                />
              </div>
              <p className="text-xs text-admin-text-tertiary">
                Porcentaje de impuesto aplicado por defecto
              </p>
            </div>

            <div className="space-y-2">
              <Label
                className="text-base font-semibold"
                htmlFor="expiration_days"
              >
                Días de Validez
              </Label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary">
                  días
                </span>
                <Input
                  className="pr-12"
                  id="expiration_days"
                  min="1"
                  type="number"
                  value={defaultExpirationDays}
                  onChange={(e) =>
                    onUpdateSetting(
                      "default_expiration_days",
                      parseInt(e.target.value) || 30,
                    )
                  }
                />
              </div>
              <p className="text-xs text-admin-text-tertiary">
                Período de validez por defecto para presupuestos
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Label className="text-base font-semibold mb-4 block">
              Configuración de IVA
            </Label>
            <p className="text-sm text-admin-text-tertiary mb-4">
              Indica si los costos ya incluyen IVA o si se debe calcular
              adicionalmente
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label
                    className="text-sm font-medium cursor-pointer"
                    htmlFor="labor_cost_includes_tax"
                  >
                    Mano de Obra incluye IVA
                  </Label>
                  <p className="text-xs text-admin-text-tertiary">
                    El costo de mano de obra ya incluye el IVA
                  </p>
                </div>
                <Switch
                  checked={laborCostIncludesTax}
                  id="labor_cost_includes_tax"
                  onCheckedChange={(checked) =>
                    onUpdateSetting("labor_cost_includes_tax", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label
                    className="text-sm font-medium cursor-pointer"
                    htmlFor="lens_cost_includes_tax"
                  >
                    Lentes incluyen IVA
                  </Label>
                  <p className="text-xs text-admin-text-tertiary">
                    El costo de lentes ya incluye el IVA
                  </p>
                </div>
                <Switch
                  checked={lensCostIncludesTax}
                  id="lens_cost_includes_tax"
                  onCheckedChange={(checked) =>
                    onUpdateSetting("lens_cost_includes_tax", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label
                    className="text-sm font-medium cursor-pointer"
                    htmlFor="treatments_cost_includes_tax"
                  >
                    Tratamientos incluyen IVA
                  </Label>
                  <p className="text-xs text-admin-text-tertiary">
                    El costo de tratamientos ya incluye el IVA
                  </p>
                </div>
                <Switch
                  checked={treatmentsCostIncludesTax}
                  id="treatments_cost_includes_tax"
                  onCheckedChange={(checked) =>
                    onUpdateSetting("treatments_cost_includes_tax", checked)
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-700">
            <Calendar className="h-5 w-5 mr-2" />
            Información de Validez
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                Los presupuestos se marcarán automáticamente como
                &quot;Expirado&quot; después de{" "}
                <strong>{defaultExpirationDays} días</strong>{" "}
                desde su creación.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Este período puede ser modificado individualmente en cada
                presupuesto si es necesario.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
