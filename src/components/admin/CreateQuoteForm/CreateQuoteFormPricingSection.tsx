/**
 * Pricing, notes, and actions section for CreateQuoteForm.
 * Extracted from CreateQuoteForm.tsx.
 */
"use client";

import { Calculator, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "./CreateQuoteForm.constants";

export interface CreateQuoteFormPricingSectionProps {
  formData: {
    subtotal: number;
    discount_amount: number;
    discount_percentage: number;
    tax_amount: number;
    total_amount: number;
    frame_cost: number;
    near_frame_cost: number;
    lens_cost: number;
    far_lens_cost: number;
    near_lens_cost: number;
    treatments_cost: number;
    labor_cost: number;
    expiration_days: number;
    notes: string;
    customer_notes: string;
    lens_family_id: string;
  };
  discountType: "percentage" | "amount";
  presbyopiaSolution: string;
  manualLensPrice: boolean;
  saving: boolean;
  onDiscountTypeChange: (v: "percentage" | "amount") => void;
  onDiscountChange: (
    field: "discount_percentage" | "discount_amount",
    value: number,
  ) => void;
  onFrameCostChange: (v: number) => void;
  onLensCostChange: (v: number) => void;
  onLaborCostChange: (v: number) => void;
  onExpirationDaysChange: (v: number) => void;
  onNotesChange: (notes: string, customerNotes: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateQuoteFormPricingSection({
  formData,
  discountType,
  presbyopiaSolution,
  manualLensPrice,
  saving,
  onDiscountTypeChange,
  onDiscountChange,
  onFrameCostChange,
  onLensCostChange,
  onLaborCostChange,
  onExpirationDaysChange,
  onNotesChange,
  onCancel,
  onSubmit,
}: CreateQuoteFormPricingSectionProps) {
  return (
    <>
      {/* Pricing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Precios y Costos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span className="font-medium">
                {formatPrice(formData.subtotal)}
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
              <span>IVA (19%):</span>
              <span className="font-medium">
                {formatPrice(formData.tax_amount)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-admin-success">
                {formatPrice(formData.total_amount)}
              </span>
            </div>
          </div>

          {/* Discount Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Descuento</Label>
              <Select
                value={discountType}
                onValueChange={(value: "percentage" | "amount") => {
                  onDiscountTypeChange(value);
                  if (value === "percentage") {
                    onDiscountChange("discount_amount", 0);
                  } else {
                    onDiscountChange("discount_percentage", 0);
                  }
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
                max={discountType === "percentage" ? "100" : undefined}
                min="0"
                step={discountType === "percentage" ? "0.01" : "1"}
                type="number"
                value={
                  discountType === "percentage"
                    ? formData.discount_percentage || ""
                    : formData.discount_amount || ""
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  onDiscountChange(
                    discountType === "percentage"
                      ? "discount_percentage"
                      : "discount_amount",
                    value,
                  );
                }}
              />
            </div>
          </div>

          {/* Internal cost details */}
          <div className="border rounded-lg">
            <details>
              <summary className="px-4 py-2 cursor-pointer text-sm font-medium">
                Datos internos (no mostrar al cliente)
              </summary>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Costo interno de Marco</Label>
                  <Input
                    className={
                      presbyopiaSolution === "two_separate" ? "bg-gray-50" : ""
                    }
                    readOnly={presbyopiaSolution === "two_separate"}
                    type="number"
                    value={
                      presbyopiaSolution === "two_separate"
                        ? (formData.frame_cost || 0) +
                          (formData.near_frame_cost || 0)
                        : formData.frame_cost || ""
                    }
                    onChange={(e) => {
                      if (presbyopiaSolution === "two_separate") return;
                      onFrameCostChange(parseFloat(e.target.value) || 0);
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
                      if (presbyopiaSolution === "two_separate") return;
                      onLensCostChange(parseFloat(e.target.value) || 0);
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
                <div>
                  <Label>Costo interno de Tratamientos</Label>
                  <Input
                    readOnly
                    className="bg-gray-100"
                    type="number"
                    value={formData.treatments_cost || ""}
                  />
                </div>
                <div>
                  <Label>Costo interno Mano de Obra</Label>
                  <Input
                    placeholder="Ej: 15000"
                    type="number"
                    value={formData.labor_cost || ""}
                    onChange={(e) =>
                      onLaborCostChange(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </details>
          </div>

          {/* Expiration */}
          <div>
            <Label>Validez del Presupuesto (días)</Label>
            <Input
              type="number"
              value={formData.expiration_days}
              onChange={(e) =>
                onExpirationDaysChange(parseInt(e.target.value) || 30)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Notas Internas</Label>
            <Textarea
              placeholder="Notas para el equipo..."
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                onNotesChange(e.target.value, formData.customer_notes)
              }
            />
          </div>
          <div>
            <Label>Notas para el Cliente</Label>
            <Textarea
              placeholder="Notas visibles para el cliente..."
              rows={3}
              value={formData.customer_notes}
              onChange={(e) => onNotesChange(formData.notes, e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={saving} type="submit">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Crear Presupuesto
            </>
          )}
        </Button>
      </div>
    </>
  );
}
