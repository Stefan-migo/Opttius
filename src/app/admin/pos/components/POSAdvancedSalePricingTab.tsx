/**
 * POSAdvancedSalePricingTab — Pricing & Cart tab for the Optical Sale form.
 *
 * Handles price summary, discount controls, notes field, add to cart button,
 * and create quote button.
 */
"use client";

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
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Package, Tag } from "lucide-react";

import type { Prescription } from "@/lib/api/services/customerService";
import type {
  OrderFormData,
  POSProduct,
  Treatment,
  POSAdvancedSaleProps,
} from "./POSAdvancedSale.types";

export interface POSAdvancedSalePricingTabProps {
  customer: POSAdvancedSaleProps["customer"];
  quickCustomerName?: string | null;
  quickCustomerRUT?: string | null;
  quickCustomerEmail?: string | null;
  quickCustomerPhone?: string | null;
  selectedPrescription: Prescription | null;
  useExternalPrescription: boolean;
  orderFormData: OrderFormData;
  selectedFrame: POSProduct | null;
  customerOwnNearFrame: boolean;
  selectedNearFrame: POSProduct | null;
  lensFamilies: readonly {
    readonly id: string;
    readonly name: string;
    readonly lens_type: string;
  }[];
  treatments: Treatment[];
  lensPrice: () => number;
  nearLensPriceValue: number;
  treatmentsPrice: number;
  totalPrice: () => number;
  discountAmount: () => number;
  discountType: "none" | "percentage" | "fixed";
  setDiscountType: (v: "none" | "percentage" | "fixed") => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;
  handleAddToCart: () => void;
  handleCreateQuote: () => Promise<void>;
  creatingQuote: boolean;
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;
  onPrevTab: () => void;
}

export function POSAdvancedSalePricingTab({
  customer,
  quickCustomerName,
  quickCustomerRUT,
  quickCustomerEmail,
  quickCustomerPhone,
  selectedPrescription,
  useExternalPrescription,
  orderFormData,
  selectedFrame,
  customerOwnNearFrame,
  selectedNearFrame,
  lensFamilies,
  treatments,
  lensPrice,
  nearLensPriceValue,
  treatmentsPrice,
  totalPrice,
  discountAmount,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  handleAddToCart,
  handleCreateQuote,
  creatingQuote,
  setOrderFormData,
  onPrevTab,
}: POSAdvancedSalePricingTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Resumen y Precios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="space-y-3">
          <h4 className="font-medium">Resumen de la Orden</h4>

          {/* Customer */}
          <div className="flex flex-col text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente:</span>
              <span>
                {customer
                  ? customer.first_name && customer.last_name
                    ? `${customer.first_name} ${customer.last_name}`.trim()
                    : customer.name || customer.business_name || "Sin nombre"
                  : quickCustomerName || "Sin cliente"}
              </span>
            </div>
            {/* Show quick customer details */}
            {!customer &&
              (quickCustomerRUT ||
                quickCustomerEmail ||
                quickCustomerPhone) && (
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span></span>
                  <span className="text-right">
                    {quickCustomerRUT && <span>RUT: {quickCustomerRUT} </span>}
                    {quickCustomerEmail && (
                      <span>Email: {quickCustomerEmail} </span>
                    )}
                    {quickCustomerPhone && (
                      <span>Tel: {quickCustomerPhone}</span>
                    )}
                  </span>
                </div>
              )}
          </div>

          {/* Prescription */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Receta:</span>
            <span>
              {selectedPrescription
                ? selectedPrescription.prescription_number ||
                  `Receta ${selectedPrescription.id.slice(0, 8)}`
                : useExternalPrescription
                  ? "Receta Externa"
                  : "Sin receta"}
            </span>
          </div>

          <Separator />

          {/* For two_separate solution - show separate sections for distance and near */}
          {orderFormData.presbyopia_solution === "two_separate" ? (
            <>
              {/* Distance Vision Section */}
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="font-medium mb-2">Visión Lejos</div>
                {/* Frame for Distance */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Marco:</span>
                  <span>
                    {orderFormData.customer_own_frame
                      ? orderFormData.frame_name || "Marco del cliente"
                      : selectedFrame?.name || "No seleccionado"}
                  </span>
                </div>
                {selectedFrame && !orderFormData.customer_own_frame && (
                  <div className="flex justify-between text-sm ml-4">
                    <span className="text-muted-foreground">Precio:</span>
                    <span>{formatCurrency(selectedFrame.price || 0)}</span>
                  </div>
                )}
                {/* Lens for Distance */}
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Lente:</span>
                  <span>
                    {orderFormData.lens_family_id
                      ? orderFormData.lens_family_name || "Seleccionado"
                      : "No seleccionado"}
                  </span>
                </div>
                <div className="flex justify-between text-sm ml-4">
                  <span className="text-muted-foreground">Precio:</span>
                  <span>{formatCurrency(80000)}</span>
                </div>
              </div>

              {/* Near Vision Section */}
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="font-medium mb-2">Visión Cerca</div>
                {/* Frame for Near */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Marco:</span>
                  <span>
                    {customerOwnNearFrame
                      ? orderFormData.near_frame_name || "Marco del cliente"
                      : selectedNearFrame?.name || "No seleccionado"}
                  </span>
                </div>
                {selectedNearFrame && !customerOwnNearFrame && (
                  <div className="flex justify-between text-sm ml-4">
                    <span className="text-muted-foreground">Precio:</span>
                    <span>{formatCurrency(selectedNearFrame.price || 0)}</span>
                  </div>
                )}
                {/* Lens for Near */}
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Lente:</span>
                  <span>
                    {orderFormData.near_lens_family_id
                      ? orderFormData.near_lens_family_name || "Seleccionado"
                      : "No seleccionado"}
                  </span>
                </div>
                <div className="flex justify-between text-sm ml-4">
                  <span className="text-muted-foreground">Precio:</span>
                  <span>{formatCurrency(35000)}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Frame - Single/Progressive */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Marco:</span>
                <span>
                  {orderFormData.customer_own_frame
                    ? orderFormData.frame_name || "Marco del cliente"
                    : selectedFrame?.name || "No seleccionado"}
                </span>
              </div>

              {/* Frame Price */}
              {selectedFrame && !orderFormData.customer_own_frame && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground ml-4">
                    Precio Marco:
                  </span>
                  <span>{formatCurrency(selectedFrame.price || 0)}</span>
                </div>
              )}

              {/* Lens */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lentes:</span>
                <span>
                  {orderFormData.lens_family_id
                    ? [...lensFamilies].find(
                        (f) => f.id === orderFormData.lens_family_id,
                      )?.name || "Seleccionado"
                    : "No seleccionado"}
                </span>
              </div>

              {orderFormData.lens_family_id && (
                <div className="flex justify-between text-sm ml-4">
                  <span className="text-muted-foreground">Precio Lentes:</span>
                  <span>{formatCurrency(lensPrice())}</span>
                </div>
              )}
            </>
          )}

          {/* Treatments */}
          {orderFormData.treatment_ids.length > 0 && (
            <div className="ml-4 space-y-1">
              <div className="text-xs text-muted-foreground">Tratamientos:</div>
              {orderFormData.treatment_ids.map((id) => {
                const treatment = treatments.find((t) => t.id === id);
                return treatment ? (
                  <div className="flex justify-between text-sm" key={id}>
                    <span className="ml-2">- {treatment.label}</span>
                    <span>{formatCurrency(treatment.cost)}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Labor */}
          {orderFormData.labor_cost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground ml-4">Mano de Obra:</span>
              <span>{formatCurrency(orderFormData.labor_cost)}</span>
            </div>
          )}

          {/* Discount */}
          <div className="space-y-2 pt-2">
            <Label className="text-sm font-medium">Descuento</Label>
            <div className="flex gap-2">
              <Select
                value={discountType}
                onValueChange={(value) =>
                  setDiscountType(value as typeof discountType)
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin descuento</SelectItem>
                  <SelectItem value="percentage">Porcentaje</SelectItem>
                  <SelectItem value="fixed">Monto fijo</SelectItem>
                </SelectContent>
              </Select>
              {discountType !== "none" && (
                <Input
                  className="flex-1"
                  type="number"
                  min={0}
                  max={discountType === "percentage" ? 100 : undefined}
                  placeholder={
                    discountType === "percentage" ? "0-100" : "Monto"
                  }
                  value={discountValue || ""}
                  onChange={(e) =>
                    setDiscountValue(parseFloat(e.target.value) || 0)
                  }
                />
              )}
            </div>
            {discountType === "percentage" && discountValue > 0 && (
              <div className="text-sm text-green-600">
                Descuento: -{formatCurrency(discountAmount())} ({discountValue}
                %)
              </div>
            )}
            {discountType === "fixed" && discountValue > 0 && (
              <div className="text-sm text-green-600">
                Descuento: -{formatCurrency(discountValue)}
              </div>
            )}
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between text-lg font-bold pt-2">
            <span>Total</span>
            <span>{formatCurrency(totalPrice())}</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label>Notas</Label>
          <Input
            className="mt-1"
            placeholder="Notas adicionales..."
            value={orderFormData.notes}
            onChange={(e) =>
              setOrderFormData((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-4">
          <Button
            className="w-full"
            disabled={
              !selectedFrame &&
              !orderFormData.lens_family_id &&
              orderFormData.labor_cost === 0
            }
            size="lg"
            onClick={handleAddToCart}
          >
            <Package className="h-5 w-5 mr-2" />
            Agregar al Carrito
          </Button>

          <Button
            className="w-full"
            variant="secondary"
            disabled={
              (!customer && !quickCustomerName && !quickCustomerRUT) ||
              creatingQuote
            }
            size="lg"
            onClick={handleCreateQuote}
          >
            {creatingQuote ? (
              "Creando..."
            ) : (
              <>
                <Tag className="h-5 w-5 mr-2" />
                {!customer && (quickCustomerName || quickCustomerRUT)
                  ? "Crear Cliente y Presupuesto"
                  : "Crear Presupuesto"}
              </>
            )}
          </Button>

          <Button className="w-full" variant="outline" onClick={onPrevTab}>
            Atrás
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
