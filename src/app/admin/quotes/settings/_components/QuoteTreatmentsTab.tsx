"use client";

import { Eye, Settings } from "lucide-react";

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
import { formatCurrency } from "@/lib/utils";

interface TreatmentPrice {
  price: number;
  enabled: boolean;
}

interface CustomService {
  enabled: boolean;
  name: string;
  price: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TreatmentPricesMap = Record<string, any>;

interface QuoteTreatmentsTabProps {
  treatmentPrices: TreatmentPricesMap;
  TREATMENT_KEYS: string[];
  treatmentLabels: Record<string, string>;
  getTreatmentPrice: (value: TreatmentPrice | number) => number;
  getTreatmentEnabled: (value: TreatmentPrice | number) => boolean;
  updateTreatmentPrice: (treatment: string, price: number) => void;
  updateTreatmentEnabled: (treatment: string, enabled: boolean) => void;
  updateNestedSetting: (
    key: string,
    nestedKey: string,
    value: unknown,
  ) => void;
}

export function QuoteTreatmentsTab({
  treatmentPrices,
  TREATMENT_KEYS,
  treatmentLabels,
  getTreatmentPrice,
  getTreatmentEnabled,
  updateTreatmentPrice,
  updateTreatmentEnabled,
  updateNestedSetting,
}: QuoteTreatmentsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Eye className="h-5 w-5 mr-2" />
          Tratamientos Extra
        </CardTitle>
        <CardDescription>
          Configura los precios de tratamientos adicionales que se cobran
          por separado. Los tratamientos como Polarizado y Fotocromático
          ya vienen incluidos en el lente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TREATMENT_KEYS.map((key) => {
            const value = treatmentPrices[key as keyof typeof treatmentPrices];
            const price = getTreatmentPrice(value);
            const enabled = getTreatmentEnabled(value);
            return (
              <div
                className="p-4 border rounded-lg space-y-3 hover:bg-gray-50 transition-colors"
                key={key}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {treatmentLabels[key] || key}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Label
                      className="text-xs text-admin-text-tertiary cursor-pointer"
                      htmlFor={`enabled-${key}`}
                    >
                      Mostrar
                    </Label>
                    <Switch
                      checked={enabled}
                      id={`enabled-${key}`}
                      onCheckedChange={(checked) =>
                        updateTreatmentEnabled(key, checked)
                      }
                    />
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary text-sm">
                    CLP
                  </span>
                  <Input
                    className="pl-12"
                    disabled={!enabled}
                    type="number"
                    value={price}
                    onChange={(e) =>
                      updateTreatmentPrice(
                        key,
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <p className="text-xs text-admin-text-tertiary">
                  {formatCurrency(price)}
                </p>
                {!enabled && (
                  <p className="text-xs text-amber-600">
                    Oculto en formulario
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Servicio Personalizado */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Servicio Personalizado
          </h3>
          <p className="text-sm text-admin-text-tertiary mb-4">
            Agrega un servicio o tratamiento personalizado con nombre y
            precio configurable.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={
                  treatmentPrices?.custom_service?.enabled ?? false
                }
                id="custom-service-enabled"
                onCheckedChange={(checked) => {
                  updateNestedSetting(
                    "treatment_prices",
                    "custom_service" as keyof typeof treatmentPrices,
                    {
                      enabled: checked,
                      name:
                        treatmentPrices?.custom_service?.name ||
                        "Servicio Extra",
                      price:
                        treatmentPrices?.custom_service?.price || 0,
                    },
                  );
                }}
              />
              <Label
                htmlFor="custom-service-enabled"
                className="cursor-pointer"
              >
                Habilitar
              </Label>
            </div>
            <div className="space-y-2">
              <Label>Nombre del servicio</Label>
              <Input
                value={
                  treatmentPrices?.custom_service?.name || ""
                }
                onChange={(e) => {
                  updateNestedSetting(
                    "treatment_prices",
                    "custom_service" as keyof typeof treatmentPrices,
                    {
                      enabled:
                        treatmentPrices?.custom_service?.enabled ?? false,
                      name: e.target.value,
                      price:
                        treatmentPrices?.custom_service?.price || 0,
                    },
                  );
                }}
                placeholder="Ej: Tintado especial"
                disabled={
                  !treatmentPrices?.custom_service?.enabled
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Precio (CLP)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary text-sm">
                  CLP
                </span>
                <Input
                  className="pl-12"
                  type="number"
                  value={
                    treatmentPrices?.custom_service?.price || 0
                  }
                  onChange={(e) => {
                    updateNestedSetting(
                      "treatment_prices",
                      "custom_service" as keyof typeof treatmentPrices,
                      {
                        enabled:
                          treatmentPrices?.custom_service?.enabled ?? false,
                        name:
                          treatmentPrices?.custom_service?.name || "Servicio Extra",
                        price: parseFloat(e.target.value) || 0,
                      },
                    );
                  }}
                  disabled={
                    !treatmentPrices?.custom_service?.enabled
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
