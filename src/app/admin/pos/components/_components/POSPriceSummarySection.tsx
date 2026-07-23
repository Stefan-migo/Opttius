"use client";

import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

interface OrderFormData {
  presbyopia_solution: string;
  customer_own_frame: boolean;
  frame_name: string | null;
  near_frame_name: string | null;
  near_frame_sku: string | null;
  near_lens_family_id: string | null;
  near_lens_family_name: string | null;
  lens_family_id: string | null;
  lens_family_name: string | null;
  treatment_ids: string[];
  labor_cost: number;
}

interface FrameProduct {
  id: string;
  name: string;
  price: number;
}

interface Treatment {
  id: string;
  label: string;
  cost: number;
}

interface LensFamily {
  readonly id: string;
  readonly name: string;
  readonly lens_type: string;
}

interface POSPriceSummarySectionProps {
  orderFormData: OrderFormData;
  selectedFrame: FrameProduct | null;
  customerOwnNearFrame: boolean;
  selectedNearFrame: FrameProduct | null;
  lensFamilies: readonly LensFamily[];
  treatments: Treatment[];
  lensPrice: () => number;
  treatmentsPrice: number;
}

/**
 * POSPriceSummarySection — order summary with frame, lens, treatment rows.
 *
 * Extracted from POSAdvancedSalePricingTab.tsx.
 */
export function POSPriceSummarySection({
  orderFormData,
  selectedFrame,
  customerOwnNearFrame,
  selectedNearFrame,
  lensFamilies,
  treatments,
  lensPrice,
  treatmentsPrice,
}: POSPriceSummarySectionProps) {
  return (
    <>
      {orderFormData.presbyopia_solution === "two_separate" ? (
        <>
          {/* Distance Vision Section */}
          <div className="p-3 border rounded-lg bg-muted/30">
            <div className="font-medium mb-2">Visión Lejos</div>
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

      <Separator />
    </>
  );
}
