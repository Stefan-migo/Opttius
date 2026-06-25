/**
 * Frame selection section for CreateQuoteForm.
 * Extracted from CreateQuoteForm.tsx.
 */
"use client";

import { Loader2, Package, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "./CreateQuoteForm.constants";

export interface CreateQuoteFormFrameSectionProps {
  presbyopiaSolution: string;
  customerOwnFrame: boolean;
  selectedFrame: unknown;
  frameSearch: string;
  frameResults: unknown[];
  searchingFrames: boolean;
  customerOwnNearFrame: boolean;
  selectedNearFrame: unknown;
  nearFrameSearch: string;
  nearFrameResults: unknown[];
  searchingNearFrames: boolean;
  formData: {
    frame_name: string;
    frame_sku: string;
    frame_price: number;
    frame_cost: number;
    frame_brand: string;
    frame_model: string;
    frame_color: string;
    frame_size: string;
    near_frame_name: string;
    near_frame_sku: string;
    near_frame_price: number;
    near_frame_cost: number;
    near_frame_brand: string;
    near_frame_model: string;
    near_frame_color: string;
    near_frame_size: string;
  };
  onCustomerOwnFrameChange: (checked: boolean) => void;
  onFrameSearchChange: (v: string) => void;
  onFrameSelect: (frame: unknown) => void;
  onFrameClear: () => void;
  onFrameFormDataChange: (field: string, value: any) => void;
  onCustomerOwnNearFrameChange: (checked: boolean) => void;
  onNearFrameSearchChange: (v: string) => void;
  onNearFrameSelect: (frame: unknown) => void;
  onNearFrameClear: () => void;
  onNearFrameFormDataChange: (field: string, value: any) => void;
}

export function CreateQuoteFormFrameSection({
  presbyopiaSolution,
  customerOwnFrame,
  selectedFrame,
  frameSearch,
  frameResults,
  searchingFrames,
  customerOwnNearFrame,
  selectedNearFrame,
  nearFrameSearch,
  nearFrameResults,
  searchingNearFrames,
  formData,
  onCustomerOwnFrameChange,
  onFrameSearchChange,
  onFrameSelect,
  onFrameClear,
  onFrameFormDataChange,
  onCustomerOwnNearFrameChange,
  onNearFrameSearchChange,
  onNearFrameSelect,
  onNearFrameClear,
  onNearFrameFormDataChange,
}: CreateQuoteFormFrameSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          {presbyopiaSolution === "two_separate" ? "Marco para Lejos" : "Marco"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Own Frame Toggle */}
        <div className="flex items-center gap-2">
          <input
            checked={customerOwnFrame}
            className="h-4 w-4 rounded border-gray-300"
            id="customer_own_frame"
            type="checkbox"
            onChange={(e) => {
              onCustomerOwnFrameChange(e.target.checked);
              if (e.target.checked) {
                onFrameClear();
                onFrameFormDataChange("customer_own_frame", true);
                onFrameFormDataChange("frame_product_id", "");
                onFrameFormDataChange("frame_price", 0);
                onFrameFormDataChange("frame_cost", 0);
              } else {
                onFrameFormDataChange("customer_own_frame", false);
              }
            }}
          />
          <Label className="cursor-pointer" htmlFor="customer_own_frame">
            Cliente trae marco (recambio de cristales)
          </Label>
        </div>

        {customerOwnFrame ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Nombre del Marco *</Label>
              <Input
                required
                placeholder="Marco del cliente"
                value={formData.frame_name}
                onChange={(e) =>
                  onFrameFormDataChange("frame_name", e.target.value)
                }
              />
            </div>
            <div>
              <Label>Número de Serie</Label>
              <Input
                placeholder="Número de serie del marco"
                value={formData.frame_sku}
                onChange={(e) =>
                  onFrameFormDataChange("frame_sku", e.target.value)
                }
              />
            </div>
          </div>
        ) : selectedFrame ? (
          <div
            className="flex items-center justify-between p-4 border rounded-lg bg-admin-bg-secondary"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <div>
              <div className="font-medium">{(selectedFrame as any).name}</div>
              <div className="text-sm text-admin-text-tertiary">
                {(selectedFrame as any).frame_brand}{" "}
                {(selectedFrame as any).frame_model} · Stock:{" "}
                {(selectedFrame as any).total_available_quantity !== undefined
                  ? (selectedFrame as any).total_available_quantity
                  : (selectedFrame as any).total_inventory_quantity !==
                      undefined
                    ? (selectedFrame as any).total_inventory_quantity
                    : ((selectedFrame as any).available_quantity ??
                      (selectedFrame as any).inventory_quantity ??
                      0)}
              </div>
              <div className="text-sm font-semibold text-admin-success">
                {formatPrice((selectedFrame as any).price)}
              </div>
            </div>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={onFrameClear}
            >
              Cambiar
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
            <Input
              className="pl-10"
              placeholder="Buscar marco por nombre, marca o SKU..."
              value={frameSearch}
              onChange={(e) => onFrameSearchChange(e.target.value)}
            />
            {frameSearch.length >= 2 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchingFrames ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : (frameResults || []).length > 0 ? (
                  frameResults.map((frame: any) => (
                    <div
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                      key={frame.id}
                      onClick={() => onFrameSelect(frame)}
                    >
                      <div className="font-medium">{frame.name}</div>
                      <div className="text-sm text-admin-text-tertiary">
                        {frame.frame_brand} {frame.frame_model} - Stock:{" "}
                        {frame.available_quantity ??
                          frame.inventory_quantity ??
                          0}
                      </div>
                      <div className="text-sm font-semibold text-admin-success">
                        {formatPrice(frame.price)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-admin-text-tertiary">
                    No se encontraron marcos
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manual frame entry */}
        {!selectedFrame && !customerOwnFrame && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Nombre del Marco</Label>
              <Input
                placeholder="Ej: Ray-Ban RB2140"
                value={formData.frame_name}
                onChange={(e) =>
                  onFrameFormDataChange("frame_name", e.target.value)
                }
              />
            </div>
            <div>
              <Label>Precio del Marco</Label>
              <Input
                placeholder="0"
                type="number"
                value={formData.frame_price || ""}
                onChange={(e) => {
                  const price = parseFloat(e.target.value) || 0;
                  onFrameFormDataChange("frame_price", price);
                  onFrameFormDataChange("frame_cost", price);
                }}
              />
            </div>
          </div>
        )}

        {/* Second frame for two separate lenses (near vision) */}
        {presbyopiaSolution === "two_separate" && (
          <div className="border-t pt-4 mt-4">
            <Label className="text-base font-semibold mb-2 block">
              Marco para Cerca
            </Label>

            {/* Near frame own frame toggle */}
            <div className="flex items-center gap-2 mb-4">
              <input
                checked={customerOwnNearFrame}
                className="h-4 w-4 rounded border-gray-300"
                id="customer_own_near_frame"
                type="checkbox"
                onChange={(e) => {
                  onCustomerOwnNearFrameChange(e.target.checked);
                  if (e.target.checked) {
                    onNearFrameClear();
                    onNearFrameFormDataChange("near_frame_product_id", "");
                    onNearFrameFormDataChange("near_frame_name", "");
                    onNearFrameFormDataChange("near_frame_brand", "");
                    onNearFrameFormDataChange("near_frame_model", "");
                    onNearFrameFormDataChange("near_frame_color", "");
                    onNearFrameFormDataChange("near_frame_size", "");
                    onNearFrameFormDataChange("near_frame_sku", "");
                    onNearFrameFormDataChange("near_frame_price", 0);
                    onNearFrameFormDataChange("near_frame_cost", 0);
                  }
                }}
              />
              <Label
                className="cursor-pointer"
                htmlFor="customer_own_near_frame"
              >
                Cliente trae marco (recambio de cristales)
              </Label>
            </div>

            {customerOwnNearFrame ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre del Marco (Cerca) *</Label>
                  <Input
                    required
                    placeholder="Marco del cliente"
                    value={formData.near_frame_name}
                    onChange={(e) =>
                      onNearFrameFormDataChange(
                        "near_frame_name",
                        e.target.value,
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Número de Serie</Label>
                  <Input
                    placeholder="Número de serie del marco"
                    value={formData.near_frame_sku}
                    onChange={(e) =>
                      onNearFrameFormDataChange(
                        "near_frame_sku",
                        e.target.value,
                      )
                    }
                  />
                </div>
              </div>
            ) : selectedNearFrame ? (
              <div
                className="flex items-center justify-between p-4 border rounded-lg bg-admin-bg-secondary"
                style={{ backgroundColor: "var(--admin-border-primary)" }}
              >
                <div>
                  <div className="font-medium">
                    {(selectedNearFrame as any).name}
                  </div>
                  <div className="text-sm text-admin-text-tertiary">
                    {(selectedNearFrame as any).frame_brand}{" "}
                    {(selectedNearFrame as any).frame_model} · Stock:{" "}
                    {(selectedNearFrame as any).available_quantity ??
                      (selectedNearFrame as any).inventory_quantity ??
                      0}
                  </div>
                  <div className="text-sm font-semibold text-admin-success">
                    {formatPrice((selectedNearFrame as any).price)}
                  </div>
                </div>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={onNearFrameClear}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
                <Input
                  className="pl-10"
                  placeholder="Buscar marco para cerca por nombre, marca o SKU..."
                  value={nearFrameSearch}
                  onChange={(e) => onNearFrameSearchChange(e.target.value)}
                />
                {nearFrameSearch.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchingNearFrames ? (
                      <div className="p-4 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : (nearFrameResults || []).length > 0 ? (
                      nearFrameResults.map((frame: any) => (
                        <div
                          className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                          key={frame.id}
                          onClick={() => onNearFrameSelect(frame)}
                        >
                          <div className="font-medium">{frame.name}</div>
                          <div className="text-sm text-admin-text-tertiary">
                            {frame.frame_brand} {frame.frame_model} - Stock:{" "}
                            {frame.available_quantity ??
                              frame.inventory_quantity ??
                              0}
                          </div>
                          <div className="text-sm font-semibold text-admin-success">
                            {formatPrice(frame.price)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-admin-text-tertiary">
                        No se encontraron marcos
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Manual near frame entry */}
            {!selectedNearFrame && !customerOwnNearFrame && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Nombre del Marco (Cerca)</Label>
                  <Input
                    placeholder="Ej: Ray-Ban RB2140"
                    value={formData.near_frame_name}
                    onChange={(e) =>
                      onNearFrameFormDataChange(
                        "near_frame_name",
                        e.target.value,
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Precio del Marco (Cerca)</Label>
                  <Input
                    placeholder="0"
                    type="number"
                    value={formData.near_frame_price || ""}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value) || 0;
                      onNearFrameFormDataChange("near_frame_price", price);
                      onNearFrameFormDataChange("near_frame_cost", price);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
