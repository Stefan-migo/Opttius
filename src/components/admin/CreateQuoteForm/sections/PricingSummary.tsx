import { Calculator, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { QuoteFormData } from "../types/quote.types";

interface PricingSummaryProps {
  formData: QuoteFormData;
  presbyopiaSolution: string;
  discountType: "percentage" | "amount";
  taxPercentage: number;
  manualLensPrice: boolean;
  onUpdateField: (field: keyof QuoteFormData, value: unknown) => void;
  onDiscountTypeChange: (type: "percentage" | "amount") => void;
  onCalculateTotal: () => void;
  disabled?: boolean;
}

export function PricingSummary({
  formData,
  presbyopiaSolution,
  discountType,
  taxPercentage,
  manualLensPrice,
  onUpdateField,
  onDiscountTypeChange,
  onCalculateTotal,
  disabled = false,
}: PricingSummaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Format price helper
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Calculate subtotal effect
  useEffect(() => {
    const calculateSubtotal = () => {
      let subtotal = 0;

      // Frame costs
      if (presbyopiaSolution === "two_separate") {
        subtotal +=
          (formData.frame_cost || 0) + (formData.near_frame_cost || 0);
      } else {
        subtotal += formData.frame_cost || 0;
      }

      // Lens costs
      if (presbyopiaSolution === "two_separate") {
        subtotal +=
          (formData.far_lens_cost || 0) + (formData.near_lens_cost || 0);
      } else {
        subtotal += formData.lens_cost || 0;
      }

      // Contact lens cost
      subtotal += formData.contact_lens_cost || 0;

      // Other costs
      subtotal += (formData.treatments_cost || 0) + (formData.labor_cost || 0);

      onUpdateField("subtotal", subtotal);
    };

    calculateSubtotal();
  }, [
    formData.frame_cost,
    formData.near_frame_cost,
    formData.lens_cost,
    formData.far_lens_cost,
    formData.near_lens_cost,
    formData.contact_lens_cost,
    formData.treatments_cost,
    formData.labor_cost,
    presbyopiaSolution,
    onUpdateField,
  ]);

  // Calculate tax amount effect
  useEffect(() => {
    const taxAmount = (formData.subtotal || 0) * (taxPercentage / 100);
    onUpdateField("tax_amount", taxAmount);
  }, [formData.subtotal, taxPercentage, onUpdateField]);

  // Calculate total effect
  useEffect(() => {
    const total =
      (formData.subtotal || 0) +
      (formData.tax_amount || 0) -
      (formData.discount_amount || 0);
    onUpdateField("total_amount", total);
  }, [
    formData.subtotal,
    formData.tax_amount,
    formData.discount_amount,
    onUpdateField,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calculator className="h-5 w-5 mr-2" />
          Precios y Costos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary View */}
        <div className="border-t pt-4">
          <div className="flex justify-between mb-2">
            <span>Subtotal:</span>
            <span className="font-medium">
              {formatPrice(formData.subtotal || 0)}
            </span>
          </div>

          {formData.discount_amount > 0 && (
            <div className="flex justify-between mb-2">
              <span>
                Descuento{" "}
                {discountType === "percentage"
                  ? `(${formData.discount_percentage.toFixed(2)}%)`
                  : "(Valor fijo)"}
                :
              </span>
              <span className="font-medium text-red-500">
                -{formatPrice(formData.discount_amount)}
              </span>
            </div>
          )}

          <div className="flex justify-between mb-2">
            <span>IVA ({taxPercentage}%):</span>
            <span className="font-medium">
              {formatPrice(formData.tax_amount || 0)}
            </span>
          </div>

          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total:</span>
            <span className="text-verde-suave">
              {formatPrice(formData.total_amount || 0)}
            </span>
          </div>
        </div>

        {/* Discount Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tipo de Descuento</Label>
            <Select
              disabled={disabled}
              value={discountType}
              onValueChange={(value: "percentage" | "amount") => {
                onDiscountTypeChange(value);
                // Clear the other discount field when switching types
                if (value === "percentage") {
                  onUpdateField("discount_amount", 0);
                } else {
                  onUpdateField("discount_percentage", 0);
                }
                // Recalculate total after clearing
                setTimeout(onCalculateTotal, 0);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Por Porcentaje (%)</SelectItem>
                <SelectItem value="amount">Por Valor ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
              {discountType === "percentage"
                ? "Descuento (%)"
                : "Descuento ($)"}
            </Label>
            <Input
              disabled={disabled}
              placeholder={discountType === "percentage" ? "0.00" : "0"}
              step={discountType === "percentage" ? "0.01" : "1"}
              type="number"
              value={
                discountType === "percentage"
                  ? formData.discount_percentage || ""
                  : formData.discount_amount || ""
              }
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                if (discountType === "percentage") {
                  onUpdateField("discount_percentage", value);
                } else {
                  onUpdateField("discount_amount", value);
                }
              }}
            />
          </div>
        </div>

        {/* Detailed Cost Breakdown */}
        <div>
          <button
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            disabled={disabled}
            type="button"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Detalles de Costos
          </button>

          {showDetails && (
            <div className="mt-3 space-y-3 pl-6 border-l-2 border-gray-200">
              {/* Frame Costs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Costo interno de Marco</Label>
                  <Input
                    className={
                      presbyopiaSolution === "two_separate" ? "bg-gray-50" : ""
                    }
                    disabled={disabled}
                    readOnly={presbyopiaSolution === "two_separate"}
                    type="number"
                    value={
                      presbyopiaSolution === "two_separate"
                        ? (formData.frame_cost || 0) +
                          (formData.near_frame_cost || 0)
                        : formData.frame_cost || ""
                    }
                    onChange={(e) => {
                      if (presbyopiaSolution === "two_separate") {
                        // For two_separate, don't allow manual editing - it's calculated from far + near frames
                        return;
                      }
                      const newValue = parseFloat(e.target.value) || 0;
                      onUpdateField("frame_cost", newValue);
                    }}
                  />
                  {presbyopiaSolution === "two_separate" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Suma automática: Marco Lejos ($
                      {(formData.frame_cost || 0).toLocaleString()}) + Marco
                      Cerca (${(formData.near_frame_cost || 0).toLocaleString()}
                      )
                    </p>
                  )}
                </div>

                <div>
                  <Label>Costo interno de Lente</Label>
                  <Input
                    className={
                      presbyopiaSolution === "two_separate" ||
                      (formData.lens_family_id && !manualLensPrice)
                        ? "bg-gray-50"
                        : ""
                    }
                    disabled={disabled}
                    readOnly={
                      presbyopiaSolution === "two_separate" ||
                      (!!formData.lens_family_id && !manualLensPrice)
                    }
                    type="number"
                    value={
                      presbyopiaSolution === "two_separate"
                        ? (formData.far_lens_cost || 0) +
                          (formData.near_lens_cost || 0)
                        : formData.lens_cost || ""
                    }
                    onChange={(e) => {
                      if (presbyopiaSolution === "two_separate") {
                        // For two_separate, don't allow manual editing - it's calculated from far + near
                        return;
                      }
                      const newValue = parseFloat(e.target.value) || 0;
                      onUpdateField("lens_cost", newValue);
                    }}
                  />
                  {presbyopiaSolution === "two_separate" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Suma automática: Lejos ($
                      {(formData.far_lens_cost || 0).toLocaleString()}) + Cerca
                      (${(formData.near_lens_cost || 0).toLocaleString()})
                    </p>
                  )}
                  {formData.lens_family_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      {manualLensPrice
                        ? "Precio manual ingresado"
                        : "Precio calculado automáticamente"}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Costs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Costo de Tratamientos</Label>
                  <Input
                    disabled={disabled}
                    placeholder="0"
                    type="number"
                    value={formData.treatments_cost || ""}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value) || 0;
                      onUpdateField("treatments_cost", newValue);
                    }}
                  />
                </div>

                <div>
                  <Label>Costo de Mano de Obra</Label>
                  <Input
                    disabled={disabled}
                    placeholder="Ej: 15000"
                    type="number"
                    value={formData.labor_cost || ""}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value) || 0;
                      onUpdateField("labor_cost", newValue);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quote Validity */}
        <div>
          <Label>Validez del Presupuesto (días)</Label>
          <Input
            disabled={disabled}
            placeholder="30"
            type="number"
            value={formData.expiration_days}
            onChange={(e) =>
              onUpdateField("expiration_days", parseInt(e.target.value) || 30)
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
