import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Eye, Loader2 } from "lucide-react";
import { usePrescriptionSearch } from "../hooks";
import { PrescriptionFullDisplay } from "@/components/admin/PrescriptionFullDisplay";
import { Prescription } from "../types/quote.types";
import { formatDate } from "@/lib/utils";
import { translatePrescriptionType } from "@/lib/prescription-helpers";
import {
  hasAddition,
  getMaxAddition,
  getRecommendedLensTypes,
} from "@/lib/presbyopia-helpers";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface PrescriptionSelectionProps {
  customerId: string | null;
  customerName?: string;
  selectedPrescription: Prescription | null;
  onPrescriptionSelect: (prescription: Prescription) => void;
  onPrescriptionClear: () => void;
  presbyopiaSolution: string;
  onPresbyopiaSolutionChange: (solution: string) => void;
  onCreateNewPrescription: () => void;
  disabled?: boolean;
}

export function PrescriptionSelection({
  customerId,
  customerName,
  selectedPrescription,
  onPrescriptionSelect,
  onPrescriptionClear,
  presbyopiaSolution,
  onPresbyopiaSolutionChange,
  onCreateNewPrescription,
  disabled = false,
}: PrescriptionSelectionProps) {
  const {
    prescriptions,
    selected,
    loading,
    selectPrescription,
    clearPrescription,
    refetch,
  } = usePrescriptionSearch(customerId);

  const handleSelect = (prescription: Prescription) => {
    selectPrescription(prescription);
    onPrescriptionSelect(prescription);
  };

  const handleClear = () => {
    clearPrescription();
    onPrescriptionClear();
  };

  // Show prescription summary when selected
  if (selectedPrescription) {
    return (
      <div className="space-y-4">
        <PrescriptionFullDisplay
          prescription={selectedPrescription}
          title="Receta seleccionada"
          subtitle={
            selectedPrescription.prescription_date && (
              <>
                Fecha:{" "}
                {new Date(
                  selectedPrescription.prescription_date + "T12:00:00",
                ).toLocaleDateString("es-CL")}
                {selectedPrescription.prescription_type && (
                  <>
                    {" "}
                    • Tipo:{" "}
                    {translatePrescriptionType(
                      selectedPrescription.prescription_type,
                    )}
                  </>
                )}
              </>
            )
          }
          badges={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
            >
              Cambiar receta
            </Button>
          }
        />

        {/* Presbyopia Solution Selector */}
        {hasAddition(selectedPrescription) && (
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
                  {getMaxAddition(selectedPrescription)} D). Selecciona cómo
                  deseas manejar la presbicia.
                </AlertDescription>
              </Alert>
              <RadioGroup
                value={presbyopiaSolution}
                onValueChange={onPresbyopiaSolutionChange}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="progressive" id="progressive" />
                  <Label htmlFor="progressive" className="cursor-pointer">
                    Progresivo (Recomendado)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bifocal" id="bifocal" />
                  <Label htmlFor="bifocal" className="cursor-pointer">
                    Bifocal
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="trifocal" id="trifocal" />
                  <Label htmlFor="trifocal" className="cursor-pointer">
                    Trifocal
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="two_separate" id="two_separate" />
                  <Label htmlFor="two_separate" className="cursor-pointer">
                    Dos lentes separados (Lejos + Cerca)
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Show prescription selection UI
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Eye className="h-5 w-5 mr-2" />
          Receta
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
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
              onClick={onCreateNewPrescription}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Nueva Receta
            </Button>
          </div>
        ) : (
          <Select
            value={selected?.id || ""}
            onValueChange={(value) => {
              const prescription = prescriptions.find((p) => p.id === value);
              if (prescription) {
                handleSelect(prescription);
              }
            }}
          >
            <SelectTrigger disabled={disabled}>
              <SelectValue placeholder="Selecciona una receta" />
            </SelectTrigger>
            <SelectContent>
              {prescriptions.map((prescription) => (
                <SelectItem key={prescription.id} value={prescription.id}>
                  {customerName ? `${customerName} · ` : ""}
                  {prescription.prescription_date
                    ? formatDate(prescription.prescription_date)
                    : "Sin fecha"}
                  {" · "}
                  {translatePrescriptionType(prescription.prescription_type)}
                  {prescription.is_current && " (Actual)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}
