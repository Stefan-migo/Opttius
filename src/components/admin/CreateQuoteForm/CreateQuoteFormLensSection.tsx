/**
 * Lens configuration section for CreateQuoteForm.
 * Extracted from CreateQuoteForm.tsx.
 */
"use client";

import { CheckCircle, Eye, Info, Loader2 } from "lucide-react";

import { ContactLensFamilyCombobox } from "@/components/admin/lenses/ContactLensFamilyCombobox";
import { LensFamilyCombobox } from "@/components/admin/lenses/LensFamilyCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatPrice } from "./CreateQuoteForm.constants";

export interface CreateQuoteFormLensSectionProps {
  lensType: "optical" | "contact";
  presbyopiaSolution: string;
  formData: {
    lens_family_id: string;
    lens_type: string;
    lens_material: string;
    lens_index: number | null;
    lens_treatments: string[];
    lens_tint_color: string;
    lens_tint_percentage: number;
    lens_sourcing_type: "stock" | "surfaced";
    lens_cost: number;
    contact_lens_family_id: string;
    contact_lens_quantity: number;
    contact_lens_price: number;
    contact_lens_cost: number;
    far_lens_family_id: string;
    near_lens_family_id: string;
    far_lens_cost: number;
    near_lens_cost: number;
    treatments_cost: number;
  };
  lensFamilies: unknown[];
  loadingFamilies: boolean;
  contactLensFamilies: unknown[];
  loadingContactLensFamilies: boolean;
  farLensFamilyId: string;
  nearLensFamilyId: string;
  farLensCost: number;
  nearLensCost: number;
  selectedPrescription: unknown;
  availableTreatments: {
    value: string;
    label: string;
    cost: number;
    enabled: boolean;
  }[];
  calculatingPrice: boolean;
  calculatingContactLensPrice: boolean;
  manualLensPrice: boolean;
  onLensTypeChange: (v: "optical" | "contact") => void;
  onLensFamilyChange: (v: string) => void;
  onContactLensFamilyChange: (v: string) => void;
  onContactLensQuantityChange: (v: number) => void;
  onContactLensPriceChange: (v: number) => void;
  onFarLensFamilyChange: (v: string) => void;
  onNearLensFamilyChange: (v: string) => void;
  onLensCostChange: (v: number) => void;
  onManualLensPriceToggle: () => void;
  onSourcingTypeChange: (v: "stock" | "surfaced") => void;
  onLensFormDataChange: (field: string, value: any) => void;
  onTreatmentToggle: (treatment: {
    value: string;
    label: string;
    cost: number;
    enabled: boolean;
  }) => void;
}

export function CreateQuoteFormLensSection({
  lensType,
  presbyopiaSolution,
  formData,
  lensFamilies,
  loadingFamilies,
  contactLensFamilies,
  loadingContactLensFamilies,
  farLensFamilyId,
  nearLensFamilyId,
  farLensCost,
  nearLensCost,
  selectedPrescription,
  availableTreatments,
  calculatingPrice,
  calculatingContactLensPrice,
  manualLensPrice,
  onLensTypeChange,
  onLensFamilyChange,
  onContactLensFamilyChange,
  onContactLensQuantityChange,
  onContactLensPriceChange,
  onFarLensFamilyChange,
  onNearLensFamilyChange,
  onLensCostChange,
  onManualLensPriceToggle,
  onSourcingTypeChange,
  onLensFormDataChange,
  onTreatmentToggle,
}: CreateQuoteFormLensSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Eye className="h-5 w-5 mr-2" />
          {presbyopiaSolution === "two_separate"
            ? "Configuración de Lentes"
            : "Configuración de Lente"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lens Type Toggle */}
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
          <Label className="font-medium">Tipo de Lente:</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              type="button"
              variant={lensType === "optical" ? "default" : "outline"}
              onClick={() => onLensTypeChange("optical")}
            >
              Lentes Ópticos
            </Button>
            <Button
              size="sm"
              type="button"
              variant={lensType === "contact" ? "default" : "outline"}
              onClick={() => onLensTypeChange("contact")}
            >
              Lentes de Contacto
            </Button>
          </div>
        </div>

        {/* Contact Lens Configuration */}
        {lensType === "contact" ? (
          <div className="space-y-4">
            <div>
              <Label>Familia de Lentes de Contacto</Label>
              <ContactLensFamilyCombobox
                categorySlug="lentes-contacto"
                families={contactLensFamilies}
                loading={loadingContactLensFamilies}
                value={formData.contact_lens_family_id || ""}
                onChange={(value) => {
                  onContactLensFamilyChange(value);
                }}
              />
            </div>

            {formData.contact_lens_family_id && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Cantidad de Cajas</Label>
                    <Input
                      min="1"
                      type="number"
                      value={formData.contact_lens_quantity || 1}
                      onChange={(e) =>
                        onContactLensQuantityChange(
                          parseInt(e.target.value) || 1,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Precio Total</Label>
                    <Input
                      placeholder="Se calcula automáticamente"
                      type="number"
                      value={formData.contact_lens_price || ""}
                      onChange={(e) =>
                        onContactLensPriceChange(
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                </div>
                {calculatingContactLensPrice && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Calculando precio del lente de contacto...</span>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {/* Two separate lens families */}
            {presbyopiaSolution === "two_separate" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lente de Lejos</Label>
                  <LensFamilyCombobox
                    families={lensFamilies}
                    loading={loadingFamilies}
                    presbyopiaSolution="two_separate"
                    value={farLensFamilyId || ""}
                    onChange={(familyId) => onFarLensFamilyChange(familyId)}
                  />
                  {farLensCost > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      Precio: ${farLensCost.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Lente de Cerca</Label>
                  <LensFamilyCombobox
                    families={lensFamilies}
                    loading={loadingFamilies}
                    presbyopiaSolution="two_separate"
                    value={nearLensFamilyId || ""}
                    onChange={(familyId) => onNearLensFamilyChange(familyId)}
                  />
                  {nearLensCost > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      Precio: ${nearLensCost.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label>Familia de Lentes</Label>
                  <div className="group relative">
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="absolute left-0 top-6 z-50 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                      Selecciona una familia de lentes para calcular
                      automáticamente el precio según la prescripción. Cada
                      familia tiene características específicas (tipo, material)
                      que se aplicarán al presupuesto.
                    </div>
                  </div>
                </div>
                <LensFamilyCombobox
                  families={lensFamilies}
                  loading={loadingFamilies}
                  placeholder="Selecciona familia (opcional)"
                  presbyopiaSolution={presbyopiaSolution}
                  prescriptionType={
                    (selectedPrescription as any)?.prescription_type ??
                    undefined
                  }
                  value={formData.lens_family_id || ""}
                  onChange={(value) => onLensFamilyChange(value)}
                />
                {formData.lens_family_id &&
                  (() => {
                    const selectedFamily = lensFamilies.find(
                      (f: any) => f.id === formData.lens_family_id,
                    );
                    return selectedFamily?.description ? (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        <p className="font-semibold mb-1">
                          {(selectedFamily as any).name}
                        </p>
                        <p>{(selectedFamily as any).description}</p>
                      </div>
                    ) : null;
                  })()}
                <p className="text-xs text-gray-500 mt-1">
                  Si seleccionas una familia, el precio se calculará
                  automáticamente según la prescripción
                  {presbyopiaSolution !== "none" &&
                    ` y adición (+${(selectedPrescription as any)?.od_add || ""} D)`}
                </p>
              </div>
            )}

            {/* Status messages depending on lens selection */}
            {presbyopiaSolution === "two_separate" ? (
              farLensFamilyId || nearLensFamilyId ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    La configuración de lentes se determina automáticamente
                    según las familias seleccionadas.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">
                    No hay familias de lentes seleccionadas. Los precios de los
                    lentes deben ingresarse manualmente en la sección de
                    &quot;Precios y Costos&quot;.
                  </p>
                  <p className="text-xs text-yellow-700">
                    Tip: Selecciona familias de lentes para calcular los precios
                    automáticamente según la prescripción.
                  </p>
                </div>
              )
            ) : formData.lens_family_id ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Tipo: {formData.lens_type || "—"} · Material:{" "}
                    {formData.lens_material || "—"} (heredados de la familia)
                  </p>
                </div>

                {/* Stock vs Surfaced selector */}
                {(() => {
                  const selectedFamily = lensFamilies.find(
                    (f: any) => f.id === formData.lens_family_id,
                  );
                  const hasStockAvailable =
                    (selectedFamily as any)?.is_stock_available === true;
                  if (!hasStockAvailable) return null;
                  return (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <Label className="text-sm font-medium text-green-800 block mb-2">
                        Disponibilidad del Lente
                      </Label>
                      <RadioGroup
                        value={formData.lens_sourcing_type}
                        onValueChange={(value: "stock" | "surfaced") =>
                          onSourcingTypeChange(value)
                        }
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="stock" id="lens-stock-lens" />
                          <Label
                            htmlFor="lens-stock-lens"
                            className="cursor-pointer"
                          >
                            📦 Stock (Entrega inmediata)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="surfaced"
                            id="lens-surfaced-lens"
                          />
                          <Label
                            htmlFor="lens-surfaced-lens"
                            className="cursor-pointer"
                          >
                            🔧 Tallado a pedido
                          </Label>
                        </div>
                      </RadioGroup>
                      <p className="text-xs text-green-700 mt-1">
                        Este lens tiene stock disponible. Selecciona
                        &quot;Stock&quot; para entrega inmediata.
                      </p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 mb-2">
                  No hay familia de lentes seleccionada. El precio del lente
                  debe ingresarse manualmente en la sección de &quot;Precios y
                  Costos&quot; → &quot;Costo interno de Lente&quot;.
                </p>
                <p className="text-xs text-yellow-700">
                  Tip: Selecciona una familia de lentes para calcular el precio
                  automáticamente según la prescripción.
                </p>
              </div>
            )}

            {calculatingPrice && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Calculando precio del lente...</span>
              </div>
            )}

            {/* Refraction Index */}
            {!(
              presbyopiaSolution === "two_separate" &&
              (farLensFamilyId || nearLensFamilyId)
            ) && (
              <div>
                <Label>Índice de Refracción</Label>
                <Input
                  className={formData.lens_family_id ? "bg-gray-50" : ""}
                  placeholder={
                    formData.lens_family_id
                      ? formData.lens_index
                        ? formData.lens_index.toString()
                        : "—"
                      : "Ej: 1.67"
                  }
                  readOnly={!!formData.lens_family_id}
                  step="0.01"
                  type="number"
                  value={formData.lens_index || ""}
                  onChange={(e) => {
                    if (formData.lens_family_id) return;
                    onLensFormDataChange(
                      "lens_index",
                      parseFloat(e.target.value) || null,
                    );
                  }}
                />
                {formData.lens_family_id && formData.lens_material && (
                  <p className="text-xs text-gray-500 mt-1">
                    Índice automático según material: {formData.lens_material}
                  </p>
                )}
              </div>
            )}

            {/* Treatments */}
            {presbyopiaSolution !== "two_separate" && (
              <div>
                <Label>Tratamientos y Recubrimientos</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Selecciona los tratamientos adicionales que deseas agregar al
                  lente.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {availableTreatments
                    .filter((t) => {
                      if (!formData.lens_family_id) return true;
                      return t.value === "tint" || t.value === "prism_extra";
                    })
                    .map((treatment) => {
                      const isSelected = formData.lens_treatments.includes(
                        treatment.value,
                      );
                      const disabled =
                        !!formData.lens_family_id &&
                        [
                          "anti_reflective",
                          "blue_light_filter",
                          "uv_protection",
                          "scratch_resistant",
                          "anti_fog",
                          "photochromic",
                          "polarized",
                        ].includes(treatment.value);
                      return (
                        <div
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "border-admin-success bg-admin-success/10"
                              : "border-gray-200 hover:border-epoch-primary"
                          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                          key={treatment.value}
                          onClick={() =>
                            !disabled && onTreatmentToggle(treatment)
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-admin-success mr-2" />
                              )}
                              <span className={isSelected ? "font-medium" : ""}>
                                {treatment.label}
                              </span>
                            </div>
                            <Badge variant="outline">
                              {formatPrice(treatment.cost)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
                {!formData.lens_family_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    Sin familia: puedes agregar cualquier tratamiento
                    manualmente.
                  </p>
                )}

                {/* Tint options */}
                {formData.lens_treatments.includes("tint") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label>Color del Tinte</Label>
                      <Input
                        placeholder="Ej: Gris, Marrón, Verde"
                        value={formData.lens_tint_color}
                        onChange={(e) =>
                          onLensFormDataChange(
                            "lens_tint_color",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Porcentaje de Tinte (%)</Label>
                      <Input
                        max="100"
                        min="0"
                        placeholder="0-100"
                        type="number"
                        value={formData.lens_tint_percentage || ""}
                        onChange={(e) =>
                          onLensFormDataChange(
                            "lens_tint_percentage",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
