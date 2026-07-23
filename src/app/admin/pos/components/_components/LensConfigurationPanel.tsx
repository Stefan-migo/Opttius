"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

import type { OrderFormData } from "../POSAdvancedSale.types";

interface LensConfigurationPanelProps {
  orderFormData: OrderFormData;
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;
  lensFamilies: readonly {
    readonly id: string;
    readonly name: string;
    readonly lens_type: string;
  }[];
  nearLensPriceValue: number;
}

export function LensConfigurationPanel({
  orderFormData,
  setOrderFormData,
  lensFamilies,
  nearLensPriceValue,
}: LensConfigurationPanelProps) {
  // Single / Progressive lens family + sourcing
  if (orderFormData.presbyopia_solution !== "two_separate") {
    return (
      <div>
          <Label>Familia de Lentes</Label>
          <Select
            value={orderFormData.lens_family_id || ""}
            onValueChange={(value) => {
              const family = lensFamilies.find((f) => f.id === value);
              setOrderFormData((prev) => ({
                ...prev,
                lens_family_id: value,
                lens_family_name: family?.name || null,
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una familia de lentes" />
            </SelectTrigger>
            <SelectContent>
              {lensFamilies
                .filter((f) => f.lens_type === orderFormData.lens_type)
                .map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {orderFormData.lens_family_id && (
            <div className="mt-2 p-2 bg-muted rounded-lg flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Precio Lentes:
              </span>
              <span className="font-semibold">
                {formatCurrency(
                  orderFormData.presbyopia_solution === "single"
                    ? 45000
                    : orderFormData.presbyopia_solution === "progressive"
                      ? 120000
                      : 80000,
                )}
              </span>
            </div>
          )}

          {orderFormData.lens_family_id && renderSourcingType()}
        </div>
    );
  }

  // Two separate: distance + near lens selectors
  return (
    <>
      {/* Distance lens - Blue */}
      <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <Label className="text-blue-700 dark:text-blue-300 font-medium block mb-2">
          Familia de Lentes para Visión Lejos
        </Label>
        <Select
          value={orderFormData.lens_family_id || ""}
          onValueChange={(value) => {
            const family = lensFamilies.find((f) => f.id === value);
            setOrderFormData((prev) => ({
              ...prev,
              lens_family_id: value,
              lens_family_name: family?.name || null,
            }));
          }}
        >
          <SelectTrigger className="bg-white dark:bg-gray-900">
            <SelectValue placeholder="Selecciona lente para lejos" />
          </SelectTrigger>
          <SelectContent>
            {lensFamilies
              .filter((f) => f.lens_type === orderFormData.lens_type)
              .map((family) => (
                <SelectItem key={family.id} value={family.id}>
                  {family.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {orderFormData.lens_family_id && (
          <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-800 rounded-lg flex justify-between items-center">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Precio Lejos:
            </span>
            <span className="font-semibold text-blue-700 dark:text-blue-300">
              {formatCurrency(80000)}
            </span>
          </div>
        )}
      </div>

      {/* Near lens - Green */}
      <div className="p-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20">
        <Label className="text-green-700 dark:text-green-300 font-medium block mb-2">
          Familia de Lentes para Visión Cercana (Cerca)
        </Label>
        <Select
          value={orderFormData.near_lens_family_id || ""}
          onValueChange={(value) => {
            const family = lensFamilies.find((f) => f.id === value);
            setOrderFormData((prev) => ({
              ...prev,
              near_lens_family_id: value,
              near_lens_family_name: family?.name || null,
            }));
          }}
        >
          <SelectTrigger className="bg-white dark:bg-gray-900">
            <SelectValue placeholder="Selecciona lente para cerca" />
          </SelectTrigger>
          <SelectContent>
            {[...lensFamilies]
              .filter(
                (f) =>
                  f.lens_type === "vision" &&
                  f.id !== "lf-5" &&
                  f.id !== "lf-6" &&
                  f.id !== "lf-7" &&
                  f.id !== "lf-8",
              )
              .map((family) => (
                <SelectItem key={family.id} value={family.id}>
                  {family.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {orderFormData.near_lens_family_id && (
          <div className="mt-2 p-2 bg-green-100 dark:bg-green-800 rounded-lg flex justify-between items-center">
            <span className="text-sm text-green-700 dark:text-green-300">
              Precio Cerca:
            </span>
            <span className="font-semibold text-green-700 dark:text-green-300">
              {formatCurrency(nearLensPriceValue)}
            </span>
          </div>
        )}
      </div>
    </>
  );

  function renderSourcingType() {
    const selectedFamily = [...lensFamilies].find(
      (f) => f.id === orderFormData.lens_family_id,
    );
    const hasStockAvailable =
      (selectedFamily as Record<string, unknown>)?.is_stock_available === true;

    if (!hasStockAvailable) return null;

    return (
      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
        <Label className="text-sm font-medium text-green-800 block mb-2">
          Disponibilidad del Lente
        </Label>
        <RadioGroup
          className="flex gap-4"
          value={orderFormData.lens_sourcing_type}
          onValueChange={(value: "stock" | "surfaced") => {
            setOrderFormData((prev) => ({
              ...prev,
              lens_sourcing_type: value,
            }));
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem id="pos-lens-stock" value="stock" />
            <Label className="cursor-pointer text-sm" htmlFor="pos-lens-stock">
              📦 Stock (Entrega inmediata)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem id="pos-lens-surfaced" value="surfaced" />
            <Label
              className="cursor-pointer text-sm"
              htmlFor="pos-lens-surfaced"
            >
              🔧 Tallado a pedido
            </Label>
          </div>
        </RadioGroup>
      </div>
    );
  }
}
