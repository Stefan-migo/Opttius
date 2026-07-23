/**
 * POSAdvancedSaleCustomerTab — Customer & Prescription tab for the Optical Sale form.
 *
 * Displays selected customer info, quick customer data, prescription selector,
 * external prescription form, and presbyopia solution selector.
 */
"use client";

import { User, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Prescription } from "@/lib/api/services/customerService";

import { POSPrescriptionDetail } from "./_components/POSPrescriptionDetail";
import { ExternalPrescriptionForm } from "./ExternalPrescriptionForm";
import type {
  ExternalPrescriptionData,
  OrderFormData,
  POSAdvancedSaleProps,
} from "./POSAdvancedSale.types";
import { PresbyopiaSolutionSelector } from "./PresbyopiaSolutionSelector";

export interface POSAdvancedSaleCustomerTabProps {
  customer: POSAdvancedSaleProps["customer"];
  onCustomerChange: POSAdvancedSaleProps["onCustomerChange"];
  quickCustomerName?: string | null;
  quickCustomerRUT?: string | null;
  quickCustomerEmail?: string | null;
  quickCustomerPhone?: string | null;
  prescriptions: Prescription[];
  selectedPrescription: Prescription | null;
  setSelectedPrescription: (v: Prescription | null) => void;
  loadingPrescriptions: boolean;
  useExternalPrescription: boolean;
  setUseExternalPrescription: (v: boolean) => void;
  externalPrescriptionData: ExternalPrescriptionData;
  setExternalPrescriptionData: React.Dispatch<
    React.SetStateAction<ExternalPrescriptionData>
  >;
  orderFormData: OrderFormData;
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;
  suggestLensFamily: () => void;
  onNextTab: () => void;
}

export function POSAdvancedSaleCustomerTab({
  customer,
  onCustomerChange,
  quickCustomerName,
  quickCustomerRUT,
  quickCustomerEmail,
  quickCustomerPhone,
  prescriptions,
  selectedPrescription,
  setSelectedPrescription,
  loadingPrescriptions,
  useExternalPrescription,
  setUseExternalPrescription,
  externalPrescriptionData,
  setExternalPrescriptionData,
  orderFormData,
  setOrderFormData,
  suggestLensFamily,
  onNextTab,
}: POSAdvancedSaleCustomerTabProps) {
  const hasPrescriptionAddition =
    (selectedPrescription?.od_add ?? 0) > 0 ||
    (selectedPrescription?.os_add ?? 0) > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Cliente y Receta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Customer */}
        <div>
          <Label>Cliente Seleccionado</Label>
          {customer ? (
            <div className="mt-1 p-3 border rounded-lg bg-muted/50 space-y-2">
              <div className="space-y-1">
                <div className="font-medium">
                  {customer.first_name && customer.last_name
                    ? `${customer.first_name} ${customer.last_name}`.trim()
                    : customer.name || customer.business_name || "Sin nombre"}
                </div>
                {customer.email && (
                  <div className="text-sm text-muted-foreground">
                    Email: {customer.email}
                  </div>
                )}
                {customer.rut && (
                  <div className="text-sm text-muted-foreground">
                    RUT: {customer.rut}
                  </div>
                )}
              </div>
              <Button
                className="text-destructive"
                size="sm"
                variant="ghost"
                onClick={() => onCustomerChange(null)}
              >
                <X className="h-4 w-4 mr-1" />
                Cambiar cliente
              </Button>
            </div>
          ) : (
            <div className="mt-1 p-3 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
              Seleccione un cliente en el panel de búsqueda superior
            </div>
          )}
        </div>

        {/* Quick Customer Info */}
        {!customer && (quickCustomerName || quickCustomerRUT) && (
          <div className="mt-2 p-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">
                Cliente Rápido
              </span>
            </div>
            <div className="space-y-1 text-sm">
              {quickCustomerName && (
                <div>
                  <span className="text-muted-foreground">Nombre: </span>
                  <span className="font-medium">{quickCustomerName}</span>
                </div>
              )}
              {quickCustomerRUT && (
                <div>
                  <span className="text-muted-foreground">RUT: </span>
                  <span className="font-medium">{quickCustomerRUT}</span>
                </div>
              )}
              {quickCustomerEmail && (
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  <span className="font-medium">{quickCustomerEmail}</span>
                </div>
              )}
              {quickCustomerPhone && (
                <div>
                  <span className="text-muted-foreground">Teléfono: </span>
                  <span className="font-medium">{quickCustomerPhone}</span>
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              Datos del cliente no registrado. Complete la receta externa para crear la venta.
            </div>
          </div>
        )}

        {/* Prescription Selection */}
        {customer && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={!useExternalPrescription ? "default" : "outline"}
                onClick={() => setUseExternalPrescription(false)}
              >
                Receta del Cliente
              </Button>
              <Button
                size="sm"
                variant={useExternalPrescription ? "default" : "outline"}
                onClick={() => setUseExternalPrescription(true)}
              >
                Receta Externa
              </Button>
            </div>

            {!useExternalPrescription && (
              <div>
                <Label>Seleccionar Receta</Label>
                {loadingPrescriptions ? (
                  <div className="text-sm text-muted-foreground mt-1">
                    Cargando recetas...
                  </div>
                ) : prescriptions.length > 0 ? (
                  <Select
                    value={selectedPrescription?.id || ""}
                    onValueChange={(value) => {
                      const prescription = prescriptions.find(
                        (p) => p.id === value,
                      );
                      setSelectedPrescription(prescription || null);
                      if (prescription) suggestLensFamily();
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona una receta" />
                    </SelectTrigger>
                    <SelectContent>
                      {prescriptions.map((rx) => (
                        <SelectItem key={rx.id} value={rx.id}>
                          <div className="flex justify-between items-center w-full gap-4">
                            <span>
                              {rx.prescription_number ||
                                `Receta ${rx.id.slice(0, 8)}`}
                              {rx.is_current && (
                                <Badge className="ml-2 text-xs" variant="secondary">
                                  Actual
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(rx.prescription_date).toLocaleDateString("es-CL")}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground mt-1 p-2 border rounded">
                    No hay recetas disponibles para este cliente
                  </div>
                )}

                {selectedPrescription && (
                  <POSPrescriptionDetail prescription={selectedPrescription} />
                )}

                {hasPrescriptionAddition && (
                  <PresbyopiaSolutionSelector
                    value={orderFormData.presbyopia_solution}
                    onChange={(value) =>
                      setOrderFormData((prev) => ({
                        ...prev,
                        presbyopia_solution: value as "single" | "two_separate" | "progressive",
                      }))
                    }
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* External Prescription Form */}
        {(useExternalPrescription ||
          (!customer && (quickCustomerName || quickCustomerRUT))) && (
          <ExternalPrescriptionForm
            data={externalPrescriptionData}
            presbyopiaValue={orderFormData.presbyopia_solution}
            onChange={setExternalPrescriptionData}
            onPresbyopiaChange={(value) =>
              setOrderFormData((prev) => ({
                ...prev,
                presbyopia_solution: value as "single" | "two_separate" | "progressive",
              }))
            }
          />
        )}

        {/* Next Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={onNextTab}>Siguiente: Marco</Button>
        </div>
      </CardContent>
    </Card>
  );
}
