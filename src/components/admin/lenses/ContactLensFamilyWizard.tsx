"use client";

import { ArrowLeft, ArrowRight, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { FamilyInfoStep } from "./_components/FamilyInfoStep";
import { useContactLensFamilyWizard } from "./_hooks/useContactLensFamilyWizard";
import { ContactLensMatrixManager } from "./ContactLensMatrixManager";

interface ContactLensFamilyWizardProps { familyId?: string; }

export function ContactLensFamilyWizard({ familyId }: ContactLensFamilyWizardProps) {
  const { step, loading, initialLoading, categories, data, setData, errors, handleNext, handleBack, handleSubmit } = useContactLensFamilyWizard(familyId);

  if (initialLoading) {
    return <div className="max-w-4xl mx-auto flex items-center justify-center py-12">Cargando...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step >= 1 ? "bg-primary text-primary-foreground border-primary" : "border-gray-300 text-gray-500"}`}>1</div>
          <div className="ml-2 font-medium text-sm">Información</div>
        </div>
        <div className={`w-24 h-1 mx-4 ${step >= 2 ? "bg-primary" : "bg-gray-200"}`} />
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step >= 2 ? "bg-primary text-primary-foreground border-primary" : "border-gray-300 text-gray-500"}`}>2</div>
          <div className="ml-2 font-medium text-sm">Matrices de Precios</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{step === 1 ? "Información de la Familia" : "Configuración de Matrices"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && <FamilyInfoStep categories={categories} data={data} errors={errors} onChange={(d) => setData((prev) => ({ ...prev, ...d }))} />}
          {step === 2 && <ContactLensMatrixManager matrices={data.matrices} onChange={(matrices) => setData((prev) => ({ ...prev, matrices }))} />}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={step === 1 ? () => window.history.back() : handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />{step === 1 ? "Volver" : "Atrás"}
            </Button>
            {step === 1 ? (
              <Button onClick={handleNext}>Siguiente<ArrowRight className="h-4 w-4 ml-2" /></Button>
            ) : (
              <Button disabled={loading} onClick={handleSubmit}>
                {loading ? "Guardando..." : <><Save className="h-4 w-4 mr-2" />{familyId ? "Actualizar Familia" : "Crear Familia"}</>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
