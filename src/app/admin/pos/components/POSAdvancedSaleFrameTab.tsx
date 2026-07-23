/**
 * POSAdvancedSaleFrameTab — Frame Selection tab for the Optical Sale form.
 *
 * Handles distance frame search, near frame search, frame results display,
 * customer own frame toggle, and manual frame entry.
 */
"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { FrameDetailsPanel } from "./_components/FrameDetailsPanel";
import { FrameSearchResults } from "./_components/FrameSearchResults";
import { ManualFrameEntry } from "./_components/ManualFrameEntry";
import type { OrderFormData,POSProduct } from "./POSAdvancedSale.types";

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

                {/* Frame Results - Distance */}
                {selectedFrame === null && frameSearchTerm.length >= 2 && (
                  <FrameSearchResults
                    loading={frameLoading}
                    results={frameResults}
                    onSelect={setSelectedFrame}
                  />
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

        {/* Show frame results for single/progressive */}
        {orderFormData.presbyopia_solution !== "two_separate" &&
          !orderFormData.customer_own_frame &&
          selectedFrame === null &&
          frameSearchTerm.length >= 2 && (
            <FrameSearchResults
              loading={frameLoading}
              results={frameResults}
              onSelect={setSelectedFrame}
            />
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

                {/* Near Frame Results */}
                {selectedNearFrame === null &&
                  nearFrameSearchTerm.length >= 2 && (
                    <FrameSearchResults
                      loading={nearFrameLoading}
                      results={nearFrameResults}
                      onSelect={setSelectedNearFrame}
                    />
                  )}
              </>
            )}
          </div>
        )}

        {/* Selected Frame Display - Distance */}
        {selectedFrame && !orderFormData.customer_own_frame && (
          <FrameDetailsPanel
            frame={selectedFrame}
            title="Marco Seleccionado para Lejos"
            variant="blue"
            onRemove={() => {
              setSelectedFrame(null);
              setFrameSearchTerm("");
            }}
          />
        )}

        {/* Selected Frame Display - Near */}
        {orderFormData.presbyopia_solution === "two_separate" &&
          selectedNearFrame &&
          !customerOwnNearFrame && (
            <FrameDetailsPanel
              frame={selectedNearFrame}
              title="Marco Seleccionado para Cerca"
              variant="green"
              onRemove={() => {
                setSelectedNearFrame(null);
                setNearFrameSearchTerm("");
              }}
            />
          )}

        {/* Manual Frame Entry - For Distance */}
        {orderFormData.customer_own_frame && (
          <ManualFrameEntry
            nameValue={orderFormData.frame_name}
            skuValue={orderFormData.frame_sku}
            title={
              orderFormData.presbyopia_solution === "two_separate"
                ? "Datos del Marco para Lejos"
                : "Datos del Marco"
            }
            onNameChange={(v) =>
              setOrderFormData((prev) => ({ ...prev, frame_name: v }))
            }
            onSkuChange={(v) =>
              setOrderFormData((prev) => ({ ...prev, frame_sku: v }))
            }
          />
        )}

        {/* Manual Near Frame Entry - Only for two_separate */}
        {orderFormData.presbyopia_solution === "two_separate" &&
          customerOwnNearFrame && (
            <ManualFrameEntry
              nameValue={orderFormData.near_frame_name}
              skuValue={orderFormData.near_frame_sku}
              title="Datos del Marco para Cerca"
              titleClassName="text-green-700 dark:text-green-300"
              onNameChange={(v) =>
                setOrderFormData((prev) => ({ ...prev, near_frame_name: v }))
              }
              onSkuChange={(v) =>
                setOrderFormData((prev) => ({ ...prev, near_frame_sku: v }))
              }
            />
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
