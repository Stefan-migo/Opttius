/**
 * POSAdvancedSaleLensesTab — Lenses & Treatments tab for the Optical Sale form.
 *
 * Handles lens type toggle (vision/contact), presbyopia solution selector,
 * lens family selector (single/two_separate), sourcing type, and treatments grid.
 */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Check, CircleDot, Glasses } from "lucide-react";

import type { Prescription } from "@/lib/api/services/customerService";
import {
  ContactLensSelector,
  type ContactLensOrderConfig,
} from "./ContactLensSelector";
import type {
  OrderFormData,
  Treatment,
  POSAdvancedSaleProps,
  POSProduct,
} from "./POSAdvancedSale.types";

export interface POSAdvancedSaleLensesTabProps {
  orderFormData: OrderFormData;
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;
  lensFamilies: readonly {
    readonly id: string;
    readonly name: string;
    readonly lens_type: string;
  }[];
  filteredTreatments: Treatment[];
  toggleTreatment: (id: string) => void;
  handleUpdateTreatmentPrice: (id: string, price: number) => void;
  nearLensPriceValue: number;
  contactLensConfig: ContactLensOrderConfig | null;
  setContactLensConfig: (v: ContactLensOrderConfig | null) => void;
  selectedPrescription: Prescription | null;
  customer: POSAdvancedSaleProps["customer"];
  branchId: string | null;
  onPrevTab: () => void;
  onNextTab: () => void;
}

export function POSAdvancedSaleLensesTab({
  orderFormData,
  setOrderFormData,
  lensFamilies,
  filteredTreatments,
  toggleTreatment,
  handleUpdateTreatmentPrice,
  nearLensPriceValue,
  contactLensConfig,
  setContactLensConfig,
  selectedPrescription,
  customer,
  branchId,
  onPrevTab,
  onNextTab,
}: POSAdvancedSaleLensesTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Lentes y Tratamientos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lens Type - Nueva disposición: Selection FIRST, luego contenido */}
        <div className="space-y-4">
          <div>
            <Label>¿Qué tipo de lente necesita?</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {/* Lentes Ópticos - con icono */}
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  orderFormData.lens_type === "vision"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => {
                  setOrderFormData((prev) => ({
                    ...prev,
                    lens_type: "vision",
                  }));
                  setContactLensConfig(null);
                }}
              >
                <div className="flex items-center gap-3">
                  <Glasses className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-medium">Lentes Ópticos</div>
                    <div className="text-xs text-muted-foreground">
                      Armazón + Cristales tallados
                    </div>
                  </div>
                </div>
              </div>

              {/* Lentes de Contacto - con icono */}
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  orderFormData.lens_type === "contact"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => {
                  setOrderFormData((prev) => ({
                    ...prev,
                    lens_type: "contact",
                  }));
                }}
              >
                <div className="flex items-center gap-3">
                  <CircleDot className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-medium">Lentes de Contacto</div>
                    <div className="text-xs text-muted-foreground">
                      Lentillas/blandas
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mostrar contenido basado en tipo de lente */}
        {orderFormData.lens_type === "contact" ? (
          /* Sección de Lentes de Contacto - NUEVO COMPONENTE */
          <ContactLensSelector
            prescription={
              selectedPrescription
                ? {
                    sphere_od: selectedPrescription.od_sphere || 0,
                    cylinder_od: selectedPrescription.od_cylinder || 0,
                    axis_od: selectedPrescription.od_axis || null,
                    add_od: selectedPrescription.od_add || null,
                    base_curve_od: null,
                    diameter_od: null,
                    sphere_os: selectedPrescription.os_sphere || 0,
                    cylinder_os: selectedPrescription.os_cylinder || 0,
                    axis_os: selectedPrescription.os_axis || null,
                    add_os: selectedPrescription.os_add || null,
                    base_curve_os: null,
                    diameter_os: null,
                  }
                : null
            }
            branchId={branchId}
            selectedConfig={contactLensConfig}
            onSelect={(config) => setContactLensConfig(config)}
            customer={customer}
          />
        ) : (
          /* Lentes Ópticos - Existing logic */
          <>
            {/* Lens Family - For single/progressive (not two_separate) */}
            {orderFormData.presbyopia_solution !== "two_separate" &&
              orderFormData.lens_type === "vision" && (
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
                  {/* Lens Price Display */}
                  {orderFormData.lens_family_id && (
                    <div className="mt-2 p-2 bg-muted rounded-lg flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Precio Lentes:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(
                          orderFormData.presbyopia_solution === "single"
                            ? 45000
                            : orderFormData.presbyopia_solution ===
                                "progressive"
                              ? 120000
                              : 80000,
                        )}
                      </span>
                    </div>
                  )}

                  {/* Stock vs Tallado Selector */}
                  {orderFormData.lens_family_id &&
                    (() => {
                      const selectedFamily = [...lensFamilies].find(
                        (f) => f.id === orderFormData.lens_family_id,
                      );
                      const hasStockAvailable =
                        (selectedFamily as Record<string, unknown>)
                          ?.is_stock_available === true;

                      if (!hasStockAvailable) return null;

                      return (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <Label className="text-sm font-medium text-green-800 block mb-2">
                            Disponibilidad del Lente
                          </Label>
                          <RadioGroup
                            value={orderFormData.lens_sourcing_type}
                            onValueChange={(value: "stock" | "surfaced") => {
                              setOrderFormData((prev) => ({
                                ...prev,
                                lens_sourcing_type: value,
                              }));
                            }}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="stock"
                                id="pos-lens-stock"
                              />
                              <Label
                                htmlFor="pos-lens-stock"
                                className="cursor-pointer text-sm"
                              >
                                📦 Stock (Entrega inmediata)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="surfaced"
                                id="pos-lens-surfaced"
                              />
                              <Label
                                htmlFor="pos-lens-surfaced"
                                className="cursor-pointer text-sm"
                              >
                                🔧 Tallado a pedido
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      );
                    })()}
                </div>
              )}

            {/* Lens Family for two_separate - Two selectors with colors */}
            {orderFormData.presbyopia_solution === "two_separate" &&
              orderFormData.lens_type === "vision" && (
                <>
                  {/* Lens for Distance - Blue */}
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
                          .filter(
                            (f) => f.lens_type === orderFormData.lens_type,
                          )
                          .map((family) => (
                            <SelectItem key={family.id} value={family.id}>
                              {family.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {/* Lens Price Display - Distance */}
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

                  {/* Lens for Near - Green */}
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
                    {/* Lens Price Display - Near */}
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
              )}

            {/* Treatments */}
            <div>
              <Label>
                Tratamientos
                {(orderFormData as OrderFormData).lens_type === "contact" && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (solo revestimientos)
                  </span>
                )}
              </Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {filteredTreatments.map((treatment) => {
                  const isSelected = orderFormData.treatment_ids.includes(
                    treatment.id,
                  );
                  return (
                    <div
                      className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "hover:border-muted-foreground"
                      }`}
                      key={treatment.id}
                      onClick={() => toggleTreatment(treatment.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {treatment.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {treatment.category === "coating"
                              ? "Revestimiento"
                              : "Tipo de lente"}
                          </div>
                        </div>
                        <div className="text-right">
                          {treatment.editable && isSelected ? (
                            <Input
                              className="h-8 w-20 text-right text-sm"
                              type="number"
                              value={treatment.cost}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdateTreatmentPrice(
                                  treatment.id,
                                  parseFloat(e.target.value) || 0,
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="text-sm font-semibold">
                              {formatCurrency(treatment.cost)}
                            </div>
                          )}
                          {isSelected && (
                            <Badge className="mt-1" variant="secondary">
                              <Check className="h-3 w-3 mr-1" />
                              Seleccionado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Labor Cost */}
            <div>
              <Label>Mano de Obra</Label>
              <Input
                className="mt-1"
                placeholder="0"
                type="number"
                value={orderFormData.labor_cost || ""}
                onChange={(e) =>
                  setOrderFormData((prev) => ({
                    ...prev,
                    labor_cost: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onPrevTab}>
                Atrás
              </Button>
              <Button onClick={onNextTab}>Siguiente: Precios</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
