/**
 * Customer & Prescription selection section for CreateQuoteForm.
 * Extracted from CreateQuoteForm.tsx.
 */
"use client";

import { Eye, Loader2, Plus, Search, User } from "lucide-react";
import { useEffect, useState } from "react";

import CreatePrescriptionForm from "@/components/admin/CreatePrescriptionForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getMaxAddition,
  hasAddition,
  type PresbyopiaSolution,
} from "@/lib/presbyopia-helpers";
import { translatePrescriptionType } from "@/lib/prescription-helpers";

export interface CreateQuoteFormCustomerSectionProps {
  loadingSettings: boolean;
  customerSearch: string;
  customerResults: unknown[];
  selectedCustomer: unknown;
  searchingCustomers: boolean;
  prescriptions: unknown[];
  selectedPrescription: unknown;
  loadingPrescriptions: boolean;
  presbyopiaSolution: PresbyopiaSolution;
  onCustomerSearchChange: (v: string) => void;
  onCustomerSelect: (customer: unknown) => void;
  onCustomerClear: () => void;
  onPrescriptionSelect: (prescription: unknown) => void;
  onPresbyopiaSolutionChange: (v: PresbyopiaSolution) => void;
  onOpenCreatePrescription: () => void;
  onCloseCreatePrescription: () => void;
  onPrescriptionCreated: (customerId: string) => void;
  showCreatePrescription: boolean;
  availableTreatments?: {
    value: string;
    label: string;
    cost: number;
    enabled: boolean;
  }[];
}

export function CreateQuoteFormCustomerSection({
  customerSearch,
  customerResults,
  selectedCustomer,
  searchingCustomers,
  prescriptions,
  selectedPrescription,
  loadingPrescriptions,
  presbyopiaSolution,
  onCustomerSearchChange,
  onCustomerSelect,
  onCustomerClear,
  onPrescriptionSelect,
  onPresbyopiaSolutionChange,
  onOpenCreatePrescription,
  onCloseCreatePrescription,
  onPrescriptionCreated,
  showCreatePrescription,
}: CreateQuoteFormCustomerSectionProps) {
  return (
    <>
      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCustomer ? (
            <div
              className="flex items-center justify-between p-4 border rounded-lg bg-admin-bg-secondary"
              style={{ backgroundColor: "var(--admin-border-primary)" }}
            >
              <div>
                <div className="font-medium">
                  {(selectedCustomer as any).first_name}{" "}
                  {(selectedCustomer as any).last_name}
                </div>
                <div className="text-sm text-admin-text-tertiary">
                  {(selectedCustomer as any).email}
                </div>
              </div>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={onCustomerClear}
              >
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
              <Input
                className="pl-10"
                placeholder="Buscar cliente por nombre o email..."
                value={customerSearch}
                onChange={(e) => onCustomerSearchChange(e.target.value)}
              />
              {customerSearch.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchingCustomers ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : (customerResults || []).length > 0 ? (
                    customerResults.map((customer: any) => (
                      <div
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                        key={customer.id}
                        onClick={() => {
                          onCustomerSelect(customer);
                        }}
                      >
                        <div className="font-medium">
                          {customer.first_name} {customer.last_name}
                        </div>
                        <div className="text-sm text-admin-text-tertiary space-y-1">
                          {customer.email && <div>{customer.email}</div>}
                          {customer.rut && <div>RUT: {customer.rut}</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-admin-text-tertiary">
                      No se encontraron clientes
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescription Selection */}
      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Receta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPrescriptions ? (
              <div className="text-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-admin-text-tertiary">
                  Este cliente no tiene recetas registradas
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenCreatePrescription}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Nueva Receta
                </Button>
              </div>
            ) : (
              <Select
                value={(selectedPrescription as any)?.id || ""}
                onValueChange={(value) => {
                  const prescription = prescriptions.find(
                    (p: any) => p.id === value,
                  );
                  if (prescription) onPrescriptionSelect(prescription);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una receta" />
                </SelectTrigger>
                <SelectContent>
                  {prescriptions.map((prescription: any) => (
                    <SelectItem key={prescription.id} value={prescription.id}>
                      {prescription.prescription_date} -{" "}
                      {translatePrescriptionType(
                        prescription.prescription_type,
                      )}
                      {prescription.is_current && " (Actual)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prescription Summary */}
      {selectedPrescription && (
        <>
          <div className="p-4 border rounded-lg bg-blue-50 text-blue-900">
            <p className="font-medium mb-2">Resumen de Receta</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-semibold">OD:</span> Esf{" "}
                {(selectedPrescription as any).od_sphere ?? "—"} / Cil{" "}
                {(selectedPrescription as any).od_cylinder ?? "—"}
                {(selectedPrescription as any).od_add &&
                  (selectedPrescription as any).od_add > 0 && (
                    <span className="ml-2 text-orange-600">
                      Add: +{(selectedPrescription as any).od_add}
                    </span>
                  )}
              </div>
              <div>
                <span className="font-semibold">OS:</span> Esf{" "}
                {(selectedPrescription as any).os_sphere ?? "—"} / Cil{" "}
                {(selectedPrescription as any).os_cylinder ?? "—"}
                {(selectedPrescription as any).os_add &&
                  (selectedPrescription as any).os_add > 0 && (
                    <span className="ml-2 text-orange-600">
                      Add: +{(selectedPrescription as any).os_add}
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* Presbyopia Solution Selector */}
          {hasAddition(selectedPrescription as any) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Solución para Presbicia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertDescription>
                    Esta receta tiene adición (+
                    {getMaxAddition(selectedPrescription as any)} D). Selecciona
                    cómo deseas manejar la presbicia.
                  </AlertDescription>
                </Alert>
                <RadioGroup
                  className="space-y-3"
                  value={presbyopiaSolution}
                  onValueChange={(value) => {
                    onPresbyopiaSolutionChange(value as PresbyopiaSolution);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id="progressive" value="progressive" />
                    <Label className="cursor-pointer" htmlFor="progressive">
                      Progresivo (Recomendado)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id="bifocal" value="bifocal" />
                    <Label className="cursor-pointer" htmlFor="bifocal">
                      Bifocal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id="trifocal" value="trifocal" />
                    <Label className="cursor-pointer" htmlFor="trifocal">
                      Trifocal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id="two_separate" value="two_separate" />
                    <Label className="cursor-pointer" htmlFor="two_separate">
                      Dos lentes separados (Lejos + Cerca)
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create Prescription Dialog */}
      {selectedCustomer && (
        <Dialog
          open={showCreatePrescription}
          onOpenChange={(open) => !open && onCloseCreatePrescription()}
        >
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-7xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle>Nueva Receta</DialogTitle>
              <DialogDescription>
                Crea una nueva receta oftalmológica para{" "}
                {(selectedCustomer as any).first_name}{" "}
                {(selectedCustomer as any).last_name}
              </DialogDescription>
            </DialogHeader>
            <CreatePrescriptionForm
              customerId={(selectedCustomer as any).id}
              onCancel={onCloseCreatePrescription}
              onSuccess={() => {
                onCloseCreatePrescription();
                onPrescriptionCreated((selectedCustomer as any).id);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
