/**
 * POSAdvancedSaleLensesTab — Lenses & Treatments tab for the Optical Sale form.
 *
 * Handles lens type toggle (vision/contact), presbyopia solution selector,
 * lens family selector (single/two_separate), sourcing type, and treatments grid.
 */
"use client";

import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Prescription } from "@/lib/api/services/customerService";
import { formatCurrency } from "@/lib/utils";

import { LensConfigurationPanel } from "./_components/LensConfigurationPanel";
import { LensTypeSelector } from "./_components/LensTypeSelector";
import {
  type ContactLensOrderConfig,
  ContactLensSelector,
} from "./ContactLensSelector";
import type {
  OrderFormData,
  POSAdvancedSaleProps,
  Treatment,
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
        {/* Lens Type Selection */}
        <LensTypeSelector
          lensType={orderFormData.lens_type}
          onChange={(t) => {
            setOrderFormData((prev) => ({
              ...prev,
              lens_type: t,
            }));
            if (t === "vision") setContactLensConfig(null);
          }}
        />

        {orderFormData.lens_type === "contact" ? (
          <ContactLensSelector
            branchId={branchId}
            customer={customer}
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
            selectedConfig={contactLensConfig}
            onSelect={(config) => setContactLensConfig(config)}
          />
        ) : (
          <>
            <LensConfigurationPanel
              lensFamilies={lensFamilies}
              nearLensPriceValue={nearLensPriceValue}
              orderFormData={orderFormData}
              setOrderFormData={setOrderFormData}
            />

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
