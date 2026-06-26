"use client";

import { Calculator, Eye, Package, User } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Quote } from "@/hooks/useQuote";
import { getLensTypeLabel } from "@/lib/lens-type-labels";
import { formatCurrency, formatDate } from "@/lib/utils";

interface QuoteInfoCardProps {
  quote: Quote;
  getCustomerId: (q: Quote | null) => string;
}

export function QuoteInfoCard({ quote, getCustomerId }: QuoteInfoCardProps) {
  const customerName =
    quote.customer?.first_name && quote.customer?.last_name
      ? `${quote.customer.first_name} ${quote.customer.last_name}`
      : "Sin nombre";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {quote.customer ? (
            <>
              <div>
                <p className="text-sm text-admin-text-tertiary">Nombre</p>
                <p className="font-medium">{customerName}</p>
              </div>
              {quote.customer.email && (
                <div>
                  <p className="text-sm text-admin-text-tertiary">Email</p>
                  <p className="font-medium">{quote.customer.email}</p>
                </div>
              )}
              {quote.customer.phone && (
                <div>
                  <p className="text-sm text-admin-text-tertiary">Teléfono</p>
                  <p className="font-medium">{quote.customer.phone}</p>
                </div>
              )}
              {quote.customer?.id ? (
                <Link href={`/admin/customers/${quote.customer.id}`}>
                  <Button className="w-full mt-4" size="sm" variant="outline">
                    Ver Cliente
                  </Button>
                </Link>
              ) : null}
            </>
          ) : (
            <div>
              <p className="text-sm text-admin-text-tertiary text-red-500">
                Cliente no encontrado (ID: {getCustomerId(quote)})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescription Info */}
      {quote.prescription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Receta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-admin-text-tertiary">Fecha</p>
              <p className="font-medium">
                {formatDate(quote.prescription.prescription_date)}
              </p>
            </div>
            {quote.prescription.prescription_type && (
              <div>
                <p className="text-sm text-admin-text-tertiary">Tipo</p>
                <p className="font-medium">
                  {quote.prescription.prescription_type}
                </p>
              </div>
            )}
            {quote.prescription.issued_by && (
              <div>
                <p className="text-sm text-admin-text-tertiary">Emitida por</p>
                <p className="font-medium">{quote.prescription.issued_by}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Resumen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-admin-text-tertiary">Fecha</p>
            <p className="font-medium">{formatDate(quote.quote_date)}</p>
          </div>
          {quote.expiration_date && (
            <div>
              <p className="text-sm text-admin-text-tertiary">Válido hasta</p>
              <p className="font-medium">
                {new Date(quote.expiration_date).toLocaleDateString("es-CL")}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-admin-text-tertiary">Total</p>
            <p className="text-2xl font-bold text-admin-success">
              {formatCurrency(quote.total_amount)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Marco y Lente - Single merged card */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            <Eye className="h-5 w-5 mr-2" />
            Marco y Lente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {quote.presbyopia_solution === "two_separate" ? (
            <>
              <div className="space-y-2 pb-4 border-b border-admin-border-primary/20">
                <p className="text-xs font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                  Par Lejos
                </p>
                <p className="font-medium">
                  Marco: {quote.frame_name || "—"}
                  {quote.frame_brand && ` (${quote.frame_brand})`}
                </p>
                <p className="font-medium">
                  Lente:{" "}
                  {quote.far_lens_family?.name ||
                    getLensTypeLabel(quote.lens_type) ||
                    "—"}
                </p>
                <p className="text-sm font-semibold text-admin-success">
                  Precio: {formatCurrency(quote.frame_price)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                  Par Cerca
                </p>
                <p className="font-medium">
                  Marco:{" "}
                  {quote.customer_own_near_frame
                    ? "Cliente trae marco"
                    : `${quote.near_frame_name || "—"}${quote.near_frame_brand ? ` (${quote.near_frame_brand})` : ""}`}
                </p>
                <p className="font-medium">
                  Lente: {quote.near_lens_family?.name || "—"}
                </p>
                {!quote.customer_own_near_frame && (
                  <p className="text-sm font-semibold text-admin-success">
                    Precio: {formatCurrency(quote.near_frame_price || 0)}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div>
                <p className="text-sm text-admin-text-tertiary">Marco</p>
                <p className="font-medium">{quote.frame_name || "—"}</p>
                {quote.frame_brand && (
                  <p className="text-sm text-admin-text-tertiary">
                    {quote.frame_brand}
                    {quote.frame_model && ` · ${quote.frame_model}`}
                  </p>
                )}
                <p className="text-sm font-semibold text-admin-success">
                  Precio: {formatCurrency(quote.frame_price)}
                </p>
              </div>
              <div>
                <p className="text-sm text-admin-text-tertiary">Lente</p>
                <p className="font-medium">
                  {quote.lens_family?.name ||
                    getLensTypeLabel(quote.lens_type) ||
                    "—"}
                </p>
                <p className="text-sm text-admin-text-tertiary">
                  {quote.lens_material}
                  {quote.lens_index && ` · Índice ${quote.lens_index}`}
                </p>
                {quote.lens_treatments && quote.lens_treatments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {quote.lens_treatments.map((treatment, idx) => (
                      <Badge key={idx} variant="outline">
                        {treatment}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
