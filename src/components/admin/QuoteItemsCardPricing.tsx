"use client";

import { DollarSign } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Quote } from "@/hooks/useQuote";
import { formatCurrency } from "@/lib/utils";

export function QuoteItemsCardPricing({ quote }: { quote: Quote }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Desglose de Precios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {quote.presbyopia_solution === "two_separate" ? (
            <>
              <div className="space-y-1 pb-2 border-b">
                <p className="text-sm font-semibold text-admin-text-tertiary mb-2">
                  Marco y Lente de Lejos:
                </p>
                <div className="flex justify-between pl-4">
                  <span className="text-xs text-admin-text-tertiary">
                    Marco de Lejos:
                  </span>
                  <span className="text-xs font-medium">
                    {formatCurrency(quote.frame_cost)}
                  </span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-xs text-admin-text-tertiary">
                    Lente de Lejos:
                  </span>
                  <span className="text-xs font-medium">
                    {formatCurrency(quote.far_lens_cost || 0)}
                  </span>
                </div>
              </div>
              <div className="space-y-1 pb-2 border-b">
                <p className="text-sm font-semibold text-admin-text-tertiary mb-2">
                  Marco y Lente de Cerca:
                </p>
                {quote.customer_own_near_frame ? (
                  <div className="flex justify-between pl-4">
                    <span className="text-xs text-admin-text-tertiary">
                      Marco de Cerca:
                    </span>
                    <span className="text-xs font-medium">
                      $0 (Cliente trae marco)
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between pl-4">
                    <span className="text-xs text-admin-text-tertiary">
                      Marco de Cerca:
                    </span>
                    <span className="text-xs font-medium">
                      {quote.near_frame_cost !== undefined &&
                      quote.near_frame_cost !== null
                        ? formatCurrency(quote.near_frame_cost)
                        : formatCurrency(0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pl-4">
                  <span className="text-xs text-admin-text-tertiary">
                    Lente de Cerca:
                  </span>
                  <span className="text-xs font-medium">
                    {formatCurrency(quote.near_lens_cost || 0)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-admin-text-tertiary">
                  Costo de Tratamientos:
                </span>
                <span className="font-medium">
                  {formatCurrency(quote.treatments_cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-admin-text-tertiary">
                  Costo de Mano de Obra:
                </span>
                <span className="font-medium">
                  {formatCurrency(quote.labor_cost)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-admin-text-tertiary">
                  Costo de Marco:
                </span>
                <span className="font-medium">
                  {formatCurrency(quote.frame_cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-admin-text-tertiary">
                  Costo de Lente:
                </span>
                <span className="font-medium">
                  {formatCurrency(quote.lens_cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-admin-text-tertiary">
                  Costo de Tratamientos:
                </span>
                <span className="font-medium">
                  {formatCurrency(quote.treatments_cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-admin-text-tertiary">
                  Costo de Mano de Obra:
                </span>
                <span className="font-medium">
                  {formatCurrency(quote.labor_cost)}
                </span>
              </div>
            </>
          )}
          <div className="border-t pt-2 flex justify-between">
            <span className="font-medium">Subtotal:</span>
            <span className="font-medium">
              {formatCurrency(quote.subtotal)}
            </span>
          </div>
          {quote.discount_amount > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Descuento ({quote.discount_percentage}%):</span>
              <span className="font-medium">
                -{formatCurrency(quote.discount_amount)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-admin-text-tertiary">IVA (19%):</span>
            <span className="font-medium">
              {formatCurrency(quote.tax_amount)}
            </span>
          </div>
          <div className="border-t pt-2 flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-admin-success">
              {formatCurrency(quote.total_amount)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
