/**
 * POSAdvancedSaleFrameTab — Frame Selection tab for the Optical Sale form.
 *
 * Handles distance frame search, near frame search, frame results display,
 * customer own frame toggle, and manual frame entry.
 */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import { Search } from "lucide-react";

import type { POSProduct, OrderFormData } from "./POSAdvancedSale.types";

export interface POSAdvancedSaleFrameTabProps {
  orderFormData: OrderFormData;
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;
  selectedFrame: POSProduct | null;
  setSelectedFrame: (v: POSProduct | null) => void;
  frameSearchTerm: string;
  setFrameSearchTerm: (v: string) => void;
  frameResults: POSProduct[];
  frameLoading: boolean;
  nearFrameSearchTerm: string;
  setNearFrameSearchTerm: (v: string) => void;
  nearFrameResults: POSProduct[];
  nearFrameLoading: boolean;
  selectedNearFrame: POSProduct | null;
  setSelectedNearFrame: (v: POSProduct | null) => void;
  customerOwnNearFrame: boolean;
  setCustomerOwnNearFrame: (v: boolean) => void;
  onPrevTab: () => void;
  onNextTab: () => void;
}

export function POSAdvancedSaleFrameTab({
  orderFormData,
  setOrderFormData,
  selectedFrame,
  setSelectedFrame,
  frameSearchTerm,
  setFrameSearchTerm,
  frameResults,
  frameLoading,
  nearFrameSearchTerm,
  setNearFrameSearchTerm,
  nearFrameResults,
  nearFrameLoading,
  selectedNearFrame,
  setSelectedNearFrame,
  customerOwnNearFrame,
  setCustomerOwnNearFrame,
  onPrevTab,
  onNextTab,
}: POSAdvancedSaleFrameTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Selección de Marco</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Own Frame Toggle - Only show when NOT two_separate */}
        {orderFormData.presbyopia_solution !== "two_separate" && (
          <div className="flex items-center gap-2">
            <input
              checked={orderFormData.customer_own_frame}
              className="w-4 h-4"
              id="customerOwnFrame"
              type="checkbox"
              onChange={(e) =>
                setOrderFormData((prev) => ({
                  ...prev,
                  customer_own_frame: e.target.checked,
                }))
              }
            />
            <Label className="cursor-pointer" htmlFor="customerOwnFrame">
              El cliente trae su propio marco
            </Label>
          </div>
        )}

        {/* For two_separate solution, show checkboxes for each lens */}
        {orderFormData.presbyopia_solution === "two_separate" && (
          <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <input
                checked={orderFormData.customer_own_frame}
                className="w-4 h-4"
                id="customerOwnFrameDistance"
                type="checkbox"
                onChange={(e) =>
                  setOrderFormData((prev) => ({
                    ...prev,
                    customer_own_frame: e.target.checked,
                  }))
                }
              />
              <Label
                className="cursor-pointer text-blue-700 dark:text-blue-300"
                htmlFor="customerOwnFrameDistance"
              >
                El cliente trae su propio marco para lejos
              </Label>
            </div>

            {!orderFormData.customer_own_frame && (
              <>
                <Label className="text-blue-700 dark:text-blue-300 font-medium block mb-2">
                  Marco para Visión Lejos
                </Label>
                <div>
                  <Label>Buscar Armazón para Lejos</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar por nombre, marca, modelo..."
                      value={frameSearchTerm}
                      onChange={(e) => setFrameSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Frame Results - Distance - Hide when frame is selected */}
                {selectedFrame === null && frameSearchTerm.length >= 2 && (
                  <>
                    {frameLoading ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Buscando...
                      </div>
                    ) : frameResults.length > 0 ? (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2 mt-2">
                          {frameResults.map((frame) => (
                            <div
                              className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-muted-foreground"
                              key={frame.id}
                              onClick={() => setSelectedFrame(frame)}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">
                                    {frame.name}
                                  </div>
                                  {frame.sku && (
                                    <div className="text-xs text-muted-foreground">
                                      SKU: {frame.sku}
                                    </div>
                                  )}
                                  {frame.brand && (
                                    <div className="text-xs text-muted-foreground">
                                      Marca: {frame.brand}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    {formatCurrency(frame.price || 0)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Stock: {frame.inventory_quantity || 0}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No se encontraron armazones
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* For single/progressive solution - show frame search */}
        {orderFormData.presbyopia_solution !== "two_separate" &&
          !orderFormData.customer_own_frame && (
            <div>
              <Label>Buscar Armazón</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nombre, marca, modelo..."
                  value={frameSearchTerm}
                  onChange={(e) => setFrameSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}

        {/* Show frame results for single/progressive - Hide when frame is selected */}
        {orderFormData.presbyopia_solution !== "two_separate" &&
          !orderFormData.customer_own_frame &&
          selectedFrame === null &&
          frameSearchTerm.length >= 2 && (
            <>
              {frameLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Buscando...
                </div>
              ) : frameResults.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 mt-2">
                    {frameResults.map((frame) => (
                      <div
                        className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-muted-foreground"
                        key={frame.id}
                        onClick={() => setSelectedFrame(frame)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{frame.name}</div>
                            {frame.sku && (
                              <div className="text-xs text-muted-foreground">
                                SKU: {frame.sku}
                              </div>
                            )}
                            {frame.brand && (
                              <div className="text-xs text-muted-foreground">
                                Marca: {frame.brand}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatCurrency(frame.price || 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Stock: {frame.inventory_quantity || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No se encontraron armazones
                </div>
              )}
            </>
          )}

        {/* Frame for Near - Only for two_separate */}
        {orderFormData.presbyopia_solution === "two_separate" && (
          <div className="p-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2 mb-3">
              <input
                checked={customerOwnNearFrame}
                className="w-4 h-4"
                id="customerOwnNearFrame"
                type="checkbox"
                onChange={(e) => setCustomerOwnNearFrame(e.target.checked)}
              />
              <Label
                className="cursor-pointer text-green-700 dark:text-green-300"
                htmlFor="customerOwnNearFrame"
              >
                El cliente trae su propio marco para cerca
              </Label>
            </div>

            {!customerOwnNearFrame && (
              <>
                <Label className="text-green-700 dark:text-green-300 font-medium block mb-2">
                  Marco para Visión Cercana (Cerca)
                </Label>
                <div>
                  <Label>Buscar Armazón para Cerca</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar por nombre, marca, modelo..."
                      value={nearFrameSearchTerm}
                      onChange={(e) => setNearFrameSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Near Frame Results - Hide when frame is selected */}
                {selectedNearFrame === null &&
                  nearFrameSearchTerm.length >= 2 && (
                    <>
                      {nearFrameLoading ? (
                        <div className="text-center py-4 text-muted-foreground">
                          Buscando...
                        </div>
                      ) : nearFrameResults.length > 0 ? (
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2 mt-2">
                            {nearFrameResults.map((frame) => (
                              <div
                                className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-muted-foreground"
                                key={frame.id}
                                onClick={() => setSelectedNearFrame(frame)}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium">
                                      {frame.name}
                                    </div>
                                    {frame.sku && (
                                      <div className="text-xs text-muted-foreground">
                                        SKU: {frame.sku}
                                      </div>
                                    )}
                                    {frame.brand && (
                                      <div className="text-xs text-muted-foreground">
                                        Marca: {frame.brand}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold">
                                      {formatCurrency(frame.price || 0)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Stock: {frame.inventory_quantity || 0}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No se encontraron armazones
                        </div>
                      )}
                    </>
                  )}
              </>
            )}
          </div>
        )}

        {/* Selected Frame Display - Distance */}
        {selectedFrame && !orderFormData.customer_own_frame && (
          <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-blue-700 dark:text-blue-300">
                  Marco Seleccionado para Lejos
                </div>
                <div className="text-sm">{selectedFrame.name}</div>
                {selectedFrame.brand && (
                  <div className="text-xs text-muted-foreground">
                    Marca: {selectedFrame.brand}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold text-blue-700 dark:text-blue-300">
                  {formatCurrency(selectedFrame.price || 0)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFrame(null);
                    setFrameSearchTerm("");
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  Quitar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Frame Display - Near */}
        {orderFormData.presbyopia_solution === "two_separate" &&
          selectedNearFrame &&
          !customerOwnNearFrame && (
            <div className="p-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-green-700 dark:text-green-300">
                    Marco Seleccionado para Cerca
                  </div>
                  <div className="text-sm">{selectedNearFrame.name}</div>
                  {selectedNearFrame.brand && (
                    <div className="text-xs text-muted-foreground">
                      Marca: {selectedNearFrame.brand}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-700 dark:text-green-300">
                    {formatCurrency(selectedNearFrame.price || 0)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedNearFrame(null);
                      setNearFrameSearchTerm("");
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            </div>
          )}

        {/* Manual Frame Entry - For Distance - Show ONLY when customer brings own frame */}
        {orderFormData.customer_own_frame && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium">
              {orderFormData.presbyopia_solution === "two_separate"
                ? "Datos del Marco para Lejos"
                : "Datos del Marco"}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre/Descripción</Label>
                <Input
                  placeholder="Ej: Marco del cliente"
                  value={orderFormData.frame_name}
                  onChange={(e) =>
                    setOrderFormData((prev) => ({
                      ...prev,
                      frame_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>SKU/Código</Label>
                <Input
                  placeholder="Opcional"
                  value={orderFormData.frame_sku}
                  onChange={(e) =>
                    setOrderFormData((prev) => ({
                      ...prev,
                      frame_sku: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Manual Near Frame Entry - Only for two_separate and customer brings own near frame */}
        {orderFormData.presbyopia_solution === "two_separate" &&
          customerOwnNearFrame && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-medium text-green-700 dark:text-green-300">
                Datos del Marco para Cerca
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nombre/Descripción</Label>
                  <Input
                    placeholder="Ej: Marco para lectura"
                    value={orderFormData.near_frame_name}
                    onChange={(e) =>
                      setOrderFormData((prev) => ({
                        ...prev,
                        near_frame_name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>SKU/Código</Label>
                  <Input
                    placeholder="Opcional"
                    value={orderFormData.near_frame_sku}
                    onChange={(e) =>
                      setOrderFormData((prev) => ({
                        ...prev,
                        near_frame_sku: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrevTab}>
            Atrás
          </Button>
          <Button onClick={onNextTab}>Siguiente: Lentes</Button>
        </div>
      </CardContent>
    </Card>
  );
}
