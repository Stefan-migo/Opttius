/**
 * POSAdvancedSaleCustomerTab — Customer & Prescription tab for the Optical Sale form.
 *
 * Displays selected customer info, quick customer data, prescription selector,
 * external prescription form, and presbyopia solution selector.
 */
"use client";

import { Badge } from "@/components/ui/badge";
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
import { User, X } from "lucide-react";

import type { Prescription } from "@/lib/api/services/customerService";
import type {
  ExternalPrescriptionData,
  OrderFormData,
  POSAdvancedSaleProps,
} from "./POSAdvancedSale.types";

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
                {/* Build display name from available fields */}
                <div className="font-medium">
                  {customer.first_name && customer.last_name
                    ? `${customer.first_name} ${customer.last_name}`.trim()
                    : customer.name || customer.business_name || "Sin nombre"}
                </div>
                {/* Show email separately if available */}
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

        {/* Quick Customer Info - Show when no registered customer but quick customer data exists */}
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
              Datos del cliente no registrado. Complete la receta externa para
              crear la venta.
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

            {/* Customer Prescriptions */}
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
                      if (prescription) {
                        // Auto-suggest lens family based on prescription
                        suggestLensFamily();
                      }
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
                                <Badge
                                  className="ml-2 text-xs"
                                  variant="secondary"
                                >
                                  Actual
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                rx.prescription_date,
                              ).toLocaleDateString("es-CL")}
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

                {/* Show selected prescription values in OD/OI format */}
                {selectedPrescription && (
                  <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-medium text-sm">Valores de Receta</h5>
                      {selectedPrescription.is_current && (
                        <Badge className="text-xs" variant="outline">
                          Receta Vigente
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium">OD (Ojo Derecho):</span>
                        <div className="text-muted-foreground">
                          {selectedPrescription?.od_sphere != null
                            ? `Esf: ${selectedPrescription!.od_sphere! >= 0 ? "+" : ""}${selectedPrescription!.od_sphere}`
                            : "Sin dato"}
                          {(selectedPrescription?.od_cylinder ?? 0) !== 0 &&
                            ` Cil: ${selectedPrescription!.od_cylinder! >= 0 ? "+" : ""}${selectedPrescription!.od_cylinder}`}
                          {(selectedPrescription?.od_axis ?? 0) !== 0 &&
                            ` x ${selectedPrescription!.od_axis}°`}
                          {(selectedPrescription?.od_add ?? 0) > 0 &&
                            ` Ad: +${selectedPrescription!.od_add}`}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">OI (Ojo Izquierdo):</span>
                        <div className="text-muted-foreground">
                          {selectedPrescription?.os_sphere != null
                            ? `Esf: ${selectedPrescription!.os_sphere! >= 0 ? "+" : ""}${selectedPrescription!.os_sphere}`
                            : "Sin dato"}
                          {(selectedPrescription?.os_cylinder ?? 0) !== 0 &&
                            ` Cil: ${selectedPrescription!.os_cylinder! >= 0 ? "+" : ""}${selectedPrescription!.os_cylinder}`}
                          {(selectedPrescription?.os_axis ?? 0) !== 0 &&
                            ` x ${selectedPrescription!.os_axis}°`}
                          {(selectedPrescription?.os_add ?? 0) > 0 &&
                            ` Ad: +${selectedPrescription!.os_add}`}
                        </div>
                      </div>
                    </div>
                    {/* DP - Show as single binocular value */}
                    {(selectedPrescription?.pd_distance ||
                      selectedPrescription?.od_pd ||
                      selectedPrescription?.os_pd) && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">
                          Distancia Pupilar (DP):
                        </div>
                        <div className="flex gap-4 mt-1">
                          {/* Distance PD - Show as single binocular value */}
                          {(selectedPrescription?.od_pd ||
                            selectedPrescription?.pd_distance) && (
                            <div>
                              <span className="text-muted-foreground">
                                Lejos:
                              </span>{" "}
                              <span className="font-medium">
                                {/* Calculate binocular PD from monocular values */}
                                {selectedPrescription?.pd_distance
                                  ? `${selectedPrescription.pd_distance}mm`
                                  : selectedPrescription?.od_pd &&
                                      selectedPrescription?.os_pd
                                    ? `${Number(selectedPrescription.od_pd) + Number(selectedPrescription.os_pd)}mm`
                                    : selectedPrescription?.od_pd
                                      ? `${selectedPrescription.od_pd}mm`
                                      : ""}
                              </span>
                            </div>
                          )}
                          {/* Near PD - Show as single binocular value */}
                          {selectedPrescription?.pd_near && (
                            <div>
                              <span className="text-muted-foreground">
                                Cerca:
                              </span>{" "}
                              <span className="font-medium">
                                {selectedPrescription?.pd_near}mm
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Presbyopia Solution Selector - Show when prescription has addition */}
                {selectedPrescription &&
                  ((selectedPrescription.od_add &&
                    selectedPrescription.od_add > 0) ||
                    (selectedPrescription.os_add &&
                      selectedPrescription.os_add > 0)) && (
                    <div className="mt-4 p-3 border border-amber-200 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                      <Label className="text-amber-700 dark:text-amber-300 font-medium block mb-2">
                        Solución de Presbicia
                      </Label>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                        Esta receta tiene adición. Selecciona cómo quieres
                        fabricar los lentes:
                      </p>
                      <div className="space-y-2">
                        {/* 1. Progressive */}
                        <div
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            orderFormData.presbyopia_solution === "progressive"
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground"
                          }`}
                          onClick={() =>
                            setOrderFormData((prev) => ({
                              ...prev,
                              presbyopia_solution: "progressive",
                            }))
                          }
                        >
                          <div className="font-medium">Lente Progresivo</div>
                          <div className="text-xs text-muted-foreground">
                            Un solo lente con graduación progresiva (lejos +
                            cerca)
                          </div>
                        </div>
                        {/* 2. Bifocal */}
                        <div
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            orderFormData.presbyopia_solution === "single"
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground"
                          }`}
                          onClick={() =>
                            setOrderFormData((prev) => ({
                              ...prev,
                              presbyopia_solution: "single",
                            }))
                          }
                        >
                          <div className="font-medium">Lentes Bifocales</div>
                          <div className="text-xs text-muted-foreground">
                            Dos graduaciones en un mismo lente (lejos y cerca)
                          </div>
                        </div>
                        {/* 3. Two Separate */}
                        <div
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            orderFormData.presbyopia_solution === "two_separate"
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground"
                          }`}
                          onClick={() =>
                            setOrderFormData((prev) => ({
                              ...prev,
                              presbyopia_solution: "two_separate",
                            }))
                          }
                        >
                          <div className="font-medium">
                            Dos Lentes Separados
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Un lente para lejos y otro para cerca
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* External Prescription Form - Show when: enabled OR has quick customer data without registered customer */}
        {(useExternalPrescription ||
          (!customer && (quickCustomerName || quickCustomerRUT))) && (
          <div className="space-y-4">
            <Separator />
            <h4 className="font-medium">Datos de Receta Externa</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha Receta</Label>
                <Input
                  type="date"
                  value={externalPrescriptionData.prescription_date}
                  onChange={(e) =>
                    setExternalPrescriptionData((prev) => ({
                      ...prev,
                      prescription_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Fecha Vencimiento</Label>
                <Input
                  type="date"
                  value={externalPrescriptionData.expiration_date}
                  onChange={(e) =>
                    setExternalPrescriptionData((prev) => ({
                      ...prev,
                      expiration_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Doctor/Optometrista</Label>
                <Input
                  placeholder="Nombre del profesional"
                  value={externalPrescriptionData.issued_by}
                  onChange={(e) =>
                    setExternalPrescriptionData((prev) => ({
                      ...prev,
                      issued_by: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Licencia</Label>
                <Input
                  placeholder="N° de licencia"
                  value={externalPrescriptionData.issued_by_license}
                  onChange={(e) =>
                    setExternalPrescriptionData((prev) => ({
                      ...prev,
                      issued_by_license: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* OD Values */}
            <div className="p-3 border rounded-lg bg-muted/30">
              <h5 className="font-medium mb-2">Ojo Derecho (OD)</h5>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Esfera</Label>
                  <Input
                    placeholder="-2.00"
                    value={externalPrescriptionData.od_sphere}
                    onChange={(e) =>
                      setExternalPrescriptionData((prev) => ({
                        ...prev,
                        od_sphere: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Cilindro</Label>
                  <Input
                    placeholder="-0.50"
                    value={externalPrescriptionData.od_cylinder}
                    onChange={(e) =>
                      setExternalPrescriptionData((prev) => ({
                        ...prev,
                        od_cylinder: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Eje</Label>
                  <Input
                    placeholder="180"
                    value={externalPrescriptionData.od_axis}
                    onChange={(e) =>
                      setExternalPrescriptionData((prev) => ({
                        ...prev,
                        od_axis: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Adición</Label>
                  <Input
                    placeholder="+2.50"
                    value={externalPrescriptionData.od_add}
                    onChange={(e) =>
                      setExternalPrescriptionData((prev) => ({
                        ...prev,
                        od_add: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* OS Values */}
            <div className="p-3 border rounded-lg bg-muted/30">
              <h5 className="font-medium mb-2">Ojo Izquierdo (OI)</h5>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Esfera</Label>
                  <Input
                    placeholder="-2.00"
                    value={externalPrescriptionData.os_sphere}
                    onChange={(e) =>
                      setExternalPrescriptionData((prev) => ({
                        ...prev,
                        os_sphere: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Cilindro</Label>
                  <Input
                    placeholder="-0.50"
                    value={externalPrescriptionData.os_cylinder}
                    onChange={(e) =>
                      setExternalPrescriptionData((prev) => ({
                        ...prev,
                        os_cylinder: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Eje</Label>
                  <Input
                    placeholder="180"
                    value={externalPrescriptionData.os_axis}
                    onChange={(e) =>
                      setExternalPrescriptionData((prev) => ({
                        ...prev,
                        os_axis: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Adición</Label>
                  <Input
                    placeholder="+2.50"
                    value={externalPrescriptionData.os_add}
                    onChange={(e) =>
                      setExternalPrescriptionData((prev) => ({
                        ...prev,
                        os_add: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* PD - Distancia Pupilar Binocular */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>DP Lejos (Binocular)</Label>
                <Input
                  placeholder="63"
                  value={externalPrescriptionData.pd}
                  onChange={(e) =>
                    setExternalPrescriptionData((prev) => ({
                      ...prev,
                      pd: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Distancia pupilar total (OD + OI)
                </p>
              </div>
              <div>
                <Label>DP Cerca (Binocular)</Label>
                <Input
                  placeholder="60"
                  value={externalPrescriptionData.near_pd}
                  onChange={(e) =>
                    setExternalPrescriptionData((prev) => ({
                      ...prev,
                      near_pd: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Distancia pupilar para visión cercana
                </p>
              </div>
            </div>

            {/* Presbyopia Solution Selector - Show when external prescription has addition */}
            {(externalPrescriptionData.od_add &&
              externalPrescriptionData.od_add.trim() !== "") ||
            (externalPrescriptionData.os_add &&
              externalPrescriptionData.os_add.trim() !== "") ? (
              <div className="mt-4 p-3 border border-amber-200 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <Label className="text-amber-700 dark:text-amber-300 font-medium block mb-2">
                  Solución de Presbicia
                </Label>
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                  Esta receta tiene adición. Selecciona cómo quieres fabricar
                  los lentes:
                </p>
                <div className="space-y-2">
                  {/* 1. Progressive */}
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      orderFormData.presbyopia_solution === "progressive"
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                    onClick={() =>
                      setOrderFormData((prev) => ({
                        ...prev,
                        presbyopia_solution: "progressive",
                      }))
                    }
                  >
                    <div className="font-medium">Lente Progresivo</div>
                    <div className="text-xs text-muted-foreground">
                      Un solo lente con graduación progresiva (lejos + cerca)
                    </div>
                  </div>
                  {/* 2. Bifocal */}
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      orderFormData.presbyopia_solution === "single"
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                    onClick={() =>
                      setOrderFormData((prev) => ({
                        ...prev,
                        presbyopia_solution: "single",
                      }))
                    }
                  >
                    <div className="font-medium">Lentes Bifocales</div>
                    <div className="text-xs text-muted-foreground">
                      Un solo lente (para lejos o cerca, según necesidad)
                    </div>
                  </div>
                  {/* 3. Two Separate */}
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      orderFormData.presbyopia_solution === "two_separate"
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground"
                    }`}
                    onClick={() =>
                      setOrderFormData((prev) => ({
                        ...prev,
                        presbyopia_solution: "two_separate",
                      }))
                    }
                  >
                    <div className="font-medium">Dos Lentes Separados</div>
                    <div className="text-xs text-muted-foreground">
                      Un lente para lejos y otro para cerca
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Next Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={onNextTab}>Siguiente: Marco</Button>
        </div>
      </CardContent>
    </Card>
  );
}
