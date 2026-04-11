import { Eye, Loader2, Plus } from "lucide-react";

import { PrescriptionFullDisplay } from "@/components/admin/PrescriptionFullDisplay";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMaxAddition, hasAddition } from "@/lib/presbyopia-helpers";
import { translatePrescriptionType } from "@/lib/prescription-helpers";
import { formatDate } from "@/lib/utils";

import { usePrescriptionSearch } from "../hooks";
import { Prescription } from "../types/quote.types";

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
          badges={
            <Button
              disabled={disabled}
              size="sm"
              type="button"
              variant="outline"
              onClick={handleClear}
            >
              Cambiar receta
            </Button>
          }
          prescription={selectedPrescription}
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
          title="Receta seleccionada"
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
                className="space-y-3"
                value={presbyopiaSolution}
                onValueChange={onPresbyopiaSolutionChange}
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
              disabled={disabled}
              type="button"
              variant="outline"
              onClick={onCreateNewPrescription}
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
