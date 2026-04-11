import { Loader2, Package, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useFrameSearch } from "../hooks";
import { Frame } from "../types/quote.types";

interface FrameSelectionProps {
  presbyopiaSolution: string;
  customerOwnFrame: boolean;
  selectedFrame: Frame | null;
  onCustomerOwnFrameChange: (checked: boolean) => void;
  onFrameSelect: (frame: Frame) => void;
  onFrameClear: () => void;
  onManualFrameDataChange: (field: string, value: unknown) => void;
  frameData: {
    frame_name: string;
    frame_sku: string;
    frame_price: number;
    frame_cost: number;
  };
  disabled?: boolean;
}

export function FrameSelection({
  presbyopiaSolution,
  customerOwnFrame,
  selectedFrame,
  onCustomerOwnFrameChange,
  onFrameSelect,
  onFrameClear,
  onManualFrameDataChange,
  frameData,
  disabled = false,
}: FrameSelectionProps) {
  const {
    search: frameSearch,
    setSearch: setFrameSearch,
    results: frameResults,
    selected: searchedFrame,
    loading: searchingFrames,
    selectFrame,
    clearFrame,
  } = useFrameSearch();

  const handleFrameSelect = (frame: Frame) => {
    selectFrame(frame);
    onFrameSelect(frame);
  };

  const handleFrameClear = () => {
    clearFrame();
    onFrameClear();
  };

  const handleSearchChange = (value: string) => {
    setFrameSearch(value);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          {presbyopiaSolution === "two_separate" ? "Marco para Lejos" : "Marco"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Own Frame Checkbox */}
        <div className="flex items-center gap-2">
          <input
            checked={customerOwnFrame}
            className="h-4 w-4 rounded border-gray-300"
            disabled={disabled}
            id="customer_own_frame"
            type="checkbox"
            onChange={(e) => onCustomerOwnFrameChange(e.target.checked)}
          />
          <Label className="cursor-pointer" htmlFor="customer_own_frame">
            Cliente trae marco (recambio de cristales)
          </Label>
        </div>

        {/* Customer Own Frame Form */}
        {customerOwnFrame ? (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Nombre del Marco *</Label>
              <Input
                required
                disabled={disabled}
                placeholder="Marco del cliente"
                value={frameData.frame_name}
                onChange={(e) =>
                  onManualFrameDataChange("frame_name", e.target.value)
                }
              />
            </div>
            <div>
              <Label>Número de Serie</Label>
              <Input
                disabled={disabled}
                placeholder="Número de serie del marco"
                value={frameData.frame_sku}
                onChange={(e) =>
                  onManualFrameDataChange("frame_sku", e.target.value)
                }
              />
            </div>
          </div>
        ) : selectedFrame ? (
          /* Selected Frame Display */
          <div
            className="flex items-center justify-between p-4 border rounded-lg bg-admin-bg-secondary"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <div>
              <div className="font-medium">{selectedFrame.name}</div>
              <div className="text-sm text-tierra-media">
                {selectedFrame.brand} {selectedFrame.model} · Stock:{" "}
                {selectedFrame.quantity || 0}
              </div>
              <div className="text-sm font-semibold text-verde-suave">
                {formatPrice(selectedFrame.price)}
              </div>
            </div>
            <Button
              disabled={disabled}
              size="sm"
              type="button"
              variant="outline"
              onClick={handleFrameClear}
            >
              <X className="h-4 w-4 mr-2" />
              Cambiar
            </Button>
          </div>
        ) : (
          /* Frame Search */
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-tierra-media" />
            <Input
              className="pl-10"
              disabled={disabled}
              placeholder="Buscar marco por nombre, marca o SKU..."
              value={frameSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {frameSearch.length >= 2 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchingFrames ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : frameResults.length > 0 ? (
                  frameResults.map((frame) => (
                    <div
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                      key={frame.id}
                      onClick={() => handleFrameSelect(frame)}
                    >
                      <div className="font-medium">{frame.name}</div>
                      <div className="text-sm text-tierra-media">
                        {frame.brand} {frame.model} - Stock:{" "}
                        {frame.quantity || 0}
                      </div>
                      <div className="text-sm font-semibold text-verde-suave">
                        {formatPrice(frame.price)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-tierra-media">
                    No se encontraron marcos
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manual Frame Entry */}
        {!selectedFrame && !customerOwnFrame && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Nombre del Marco</Label>
              <Input
                disabled={disabled}
                placeholder="Ej: Ray-Ban RB2140"
                value={frameData.frame_name}
                onChange={(e) =>
                  onManualFrameDataChange("frame_name", e.target.value)
                }
              />
            </div>
            <div>
              <Label>Precio del Marco</Label>
              <Input
                disabled={disabled}
                placeholder="0"
                type="number"
                value={frameData.frame_price || ""}
                onChange={(e) => {
                  const price = parseFloat(e.target.value) || 0;
                  onManualFrameDataChange("frame_price", price);
                  onManualFrameDataChange("frame_cost", price);
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
