"use client";

import { Eye, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Quote } from "@/hooks/useQuote";
import { getLensTypeLabel } from "@/lib/lens-type-labels";
import { formatCurrency } from "@/lib/utils";

type PrescriptionFields = {
  od_sphere: number | null;
  od_cylinder: number | null;
  od_axis: number | null;
  od_add: number | null;
  od_pd: number | null;
  od_near_pd: number | null;
  os_sphere: number | null;
  os_cylinder: number | null;
  os_axis: number | null;
  os_add: number | null;
  os_pd: number | null;
  os_near_pd: number | null;
  frame_pd: number | null;
  height_segmentation: number | null;
  prism_od: string | null;
  prism_os: string | null;
  issued_by: string | null;
  notes: string | null;
};

export function QuoteItemsCardDetails({ quote }: { quote: Quote }) {
  const rx = quote.prescription as PrescriptionFields | null;
  return (
    <>
      {/* Prescription Details */}
      {rx && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Detalles de la Receta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Right Eye (OD) */}
              <div className="space-y-3">
                <h3 className="font-semibold text-epoch-primary border-b pb-2">
                  Ojo Derecho (OD)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {rx.od_sphere !== null &&
                    rx.od_sphere !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Esfera
                        </p>
                        <p className="font-medium">
                          {rx.od_sphere > 0 ? "+" : ""}
                          {rx.od_sphere} D
                        </p>
                      </div>
                    )}
                  {rx.od_cylinder !== null &&
                    rx.od_cylinder !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Cilindro
                        </p>
                        <p className="font-medium">
                          {rx.od_cylinder > 0 ? "+" : ""}
                          {rx.od_cylinder} D
                        </p>
                      </div>
                    )}
                  {rx.od_axis !== null &&
                    rx.od_axis !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">Eje</p>
                        <p className="font-medium">
                          {rx.od_axis}°
                        </p>
                      </div>
                    )}
                  {rx.od_add !== null &&
                    rx.od_add !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Adición
                        </p>
                        <p className="font-medium">
                          +{rx.od_add} D
                        </p>
                      </div>
                    )}
                  {rx.od_pd !== null &&
                    rx.od_pd !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          DP Lejos
                        </p>
                        <p className="font-medium">
                          {rx.od_pd} mm
                        </p>
                      </div>
                    )}
                  {rx.od_near_pd !== null &&
                    rx.od_near_pd !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          DP Cerca
                        </p>
                        <p className="font-medium">
                          {rx.od_near_pd} mm
                        </p>
                      </div>
                    )}
                </div>
                {rx.prism_od && (
                  <div className="mt-2">
                    <p className="text-xs text-admin-text-tertiary">Prisma</p>
                    <p className="font-medium">{rx.prism_od}</p>
                  </div>
                )}
              </div>

              {/* Left Eye (OS) */}
              <div className="space-y-3">
                <h3 className="font-semibold text-epoch-primary border-b pb-2">
                  Ojo Izquierdo (OS)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {rx.os_sphere !== null &&
                    rx.os_sphere !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Esfera
                        </p>
                        <p className="font-medium">
                          {rx.os_sphere > 0 ? "+" : ""}
                          {rx.os_sphere} D
                        </p>
                      </div>
                    )}
                  {rx.os_cylinder !== null &&
                    rx.os_cylinder !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Cilindro
                        </p>
                        <p className="font-medium">
                          {rx.os_cylinder > 0 ? "+" : ""}
                          {rx.os_cylinder} D
                        </p>
                      </div>
                    )}
                  {rx.os_axis !== null &&
                    rx.os_axis !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">Eje</p>
                        <p className="font-medium">
                          {rx.os_axis}°
                        </p>
                      </div>
                    )}
                  {rx.os_add !== null &&
                    rx.os_add !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Adición
                        </p>
                        <p className="font-medium">
                          +{rx.os_add} D
                        </p>
                      </div>
                    )}
                  {rx.os_pd !== null &&
                    rx.os_pd !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          DP Lejos
                        </p>
                        <p className="font-medium">
                          {rx.os_pd} mm
                        </p>
                      </div>
                    )}
                  {rx.os_near_pd !== null &&
                    rx.os_near_pd !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          DP Cerca
                        </p>
                        <p className="font-medium">
                          {rx.os_near_pd} mm
                        </p>
                      </div>
                    )}
                </div>
                {rx.prism_os && (
                  <div className="mt-2">
                    <p className="text-xs text-admin-text-tertiary">Prisma</p>
                    <p className="font-medium">{rx.prism_os}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Measurements */}
            <div className="mt-6 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              {rx.frame_pd !== null &&
                rx.frame_pd !== undefined && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">
                      DP del Marco
                    </p>
                    <p className="font-medium">
                      {rx.frame_pd} mm
                    </p>
                  </div>
                )}
              {rx.height_segmentation !== null &&
                rx.height_segmentation !== undefined && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">
                      Altura de Segmento
                    </p>
                    <p className="font-medium">
                      {rx.height_segmentation} mm
                    </p>
                  </div>
                )}
              {rx.issued_by && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Prescrito por
                  </p>
                  <p className="font-medium">{rx.issued_by}</p>
                </div>
              )}
            </div>

            {rx.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-admin-text-tertiary">
                  Notas de la Receta
                </p>
                <p className="font-medium whitespace-pre-wrap text-sm">
                  {rx.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Frame Details */}
      {quote.presbyopia_solution === "two_separate" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Far Frame (Lejos) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Marco de Lejos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-admin-text-tertiary">Nombre</p>
                  <p className="font-medium">{quote.frame_name || "—"}</p>
                </div>
                {quote.frame_brand && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">Marca</p>
                    <p className="font-medium">{quote.frame_brand}</p>
                  </div>
                )}
                {quote.frame_model && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">Modelo</p>
                    <p className="font-medium">{quote.frame_model}</p>
                  </div>
                )}
                {quote.frame_color && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">Color</p>
                    <p className="font-medium">{quote.frame_color}</p>
                  </div>
                )}
                {quote.frame_size && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">Tamaño</p>
                    <p className="font-medium">{quote.frame_size}</p>
                  </div>
                )}
                {quote.frame_sku && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">SKU</p>
                    <p className="font-medium">{quote.frame_sku}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-admin-text-tertiary">Precio</p>
                  <p className="font-semibold text-admin-success">
                    {formatCurrency(quote.frame_price)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Near Frame (Cerca) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Marco de Cerca
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quote.customer_own_near_frame ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    Cliente trae marco (recambio de cristales)
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-admin-text-tertiary">Nombre</p>
                    <p className="font-medium">
                      {quote.near_frame_name || "—"}
                    </p>
                  </div>
                  {quote.near_frame_brand && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">Marca</p>
                      <p className="font-medium">{quote.near_frame_brand}</p>
                    </div>
                  )}
                  {quote.near_frame_model && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">Modelo</p>
                      <p className="font-medium">{quote.near_frame_model}</p>
                    </div>
                  )}
                  {quote.near_frame_color && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">Color</p>
                      <p className="font-medium">{quote.near_frame_color}</p>
                    </div>
                  )}
                  {quote.near_frame_size && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">Tamaño</p>
                      <p className="font-medium">{quote.near_frame_size}</p>
                    </div>
                  )}
                  {quote.near_frame_sku && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">SKU</p>
                      <p className="font-medium">{quote.near_frame_sku}</p>
                    </div>
                  )}
                  {quote.near_frame_price !== undefined &&
                    quote.near_frame_price !== null && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Precio
                        </p>
                        <p className="font-semibold text-admin-success">
                          {formatCurrency(quote.near_frame_price || 0)}
                        </p>
                      </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Detalles del Marco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-admin-text-tertiary">Nombre</p>
                <p className="font-medium">{quote.frame_name || "—"}</p>
              </div>
              {quote.frame_brand && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">Marca</p>
                  <p className="font-medium">{quote.frame_brand}</p>
                </div>
              )}
              {quote.frame_model && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">Modelo</p>
                  <p className="font-medium">{quote.frame_model}</p>
                </div>
              )}
              {quote.frame_color && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">Color</p>
                  <p className="font-medium">{quote.frame_color}</p>
                </div>
              )}
              {quote.frame_size && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">Tamaño</p>
                  <p className="font-medium">{quote.frame_size}</p>
                </div>
              )}
              {quote.frame_sku && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">SKU</p>
                  <p className="font-medium">{quote.frame_sku}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lens Details */}
      {quote.presbyopia_solution === "two_separate" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Far Lens (Lejos) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Lente de Lejos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quote.lens_type && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">
                      Tipo de Lente
                    </p>
                    <p className="font-medium">
                      {getLensTypeLabel(quote.lens_type)}
                    </p>
                  </div>
                )}
                {quote.far_lens_family && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-800 font-semibold mb-1">
                      Familia de lente
                    </p>
                    <p className="text-sm text-blue-900">
                      {quote.far_lens_family.name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Costo del Lente
                  </p>
                  <p className="font-semibold text-admin-success">
                    {formatCurrency(quote.far_lens_cost || 0)}
                  </p>
                </div>
                <div className="text-xs text-admin-text-tertiary">
                  <p className="mb-1">Solución para Presbicia:</p>
                  <Badge variant="outline">Dos lentes separados - Lejos</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Near Lens (Cerca) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Lente de Cerca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quote.lens_type && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">
                      Tipo de Lente
                    </p>
                    <p className="font-medium">
                      {getLensTypeLabel(quote.lens_type)}
                    </p>
                  </div>
                )}
                {quote.near_lens_family && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-800 font-semibold mb-1">
                      Familia de lente
                    </p>
                    <p className="text-sm text-blue-900">
                      {quote.near_lens_family.name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Costo del Lente
                  </p>
                  <p className="font-semibold text-admin-success">
                    {formatCurrency(quote.near_lens_cost || 0)}
                  </p>
                </div>
                <div className="text-xs text-admin-text-tertiary">
                  <p className="mb-1">Solución para Presbicia:</p>
                  <Badge variant="outline">Dos lentes separados - Cerca</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Detalles del Lente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quote.lens_type && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Tipo de Lente
                  </p>
                  <p className="font-medium">
                    {getLensTypeLabel(quote.lens_type)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-admin-text-tertiary">
                  Familia de lente
                </p>
                <p className="font-medium">{quote.lens_family?.name || "—"}</p>
              </div>
              {quote.lens_material && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">Material</p>
                  <p className="font-medium">{quote.lens_material}</p>
                </div>
              )}
              {quote.lens_index && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Índice de Refracción
                  </p>
                  <p className="font-medium">{quote.lens_index}</p>
                </div>
              )}
              {quote.lens_treatments && quote.lens_treatments.length > 0 && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Tratamientos
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {quote.lens_treatments.map(
                      (treatment: string, idx: number) => (
                        <Badge key={idx} variant="outline">
                          {treatment}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              )}
              {quote.lens_tint_color && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Color del Tinte
                  </p>
                  <p className="font-medium">{quote.lens_tint_color}</p>
                </div>
              )}
              {quote.lens_tint_percentage && (
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Porcentaje de Tinte
                  </p>
                  <p className="font-medium">{quote.lens_tint_percentage}%</p>
                </div>
              )}
              {quote.presbyopia_solution &&
                quote.presbyopia_solution !== "none" && (
                  <div>
                    <p className="text-xs text-admin-text-tertiary">
                      Solución para Presbicia
                    </p>
                    <Badge variant="outline">
                      {quote.presbyopia_solution === "progressive"
                        ? "Progresivo"
                        : quote.presbyopia_solution === "bifocal"
                          ? "Bifocal"
                          : quote.presbyopia_solution === "trifocal"
                            ? "Trifocal"
                            : quote.presbyopia_solution}
                    </Badge>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notas y Observaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {quote.notes && (
            <div>
              <p className="text-sm text-admin-text-tertiary mb-1">
                Notas Internas
              </p>
              <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary border border-admin-border-secondary/50 p-3 rounded-lg">
                {quote.notes}
              </p>
            </div>
          )}
          {quote.customer_notes && (
            <div>
              <p className="text-sm text-admin-text-tertiary mb-1">
                Notas para el Cliente
              </p>
              <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary border border-admin-border-secondary/50 p-3 rounded-lg">
                {quote.customer_notes}
              </p>
            </div>
          )}
          {quote.terms_and_conditions && (
            <div>
              <p className="text-sm text-admin-text-tertiary mb-1">
                Términos y Condiciones
              </p>
              <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary border border-admin-border-secondary/50 p-3 rounded-lg">
                {quote.terms_and_conditions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
