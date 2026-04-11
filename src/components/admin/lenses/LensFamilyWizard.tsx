"use client";

import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  LensFamilyBasicForm,
  LensFamilyFormData as BasicFormData,
} from "./LensFamilyBasicForm";
import { LensMatrixFormData, LensMatrixManager } from "./LensMatrixManager";

interface FullLensFamilyData extends BasicFormData {
  matrices: LensMatrixFormData[];
}

export function LensFamilyWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FullLensFamilyData>({
    name: "",
    brand: "",
    category_id: null,
    lens_type: "single_vision",
    lens_material: "cr39",
    description: "",
    is_active: true,
    matrices: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleBasicInfoChange = (basicData: BasicFormData) => {
    setData((prev) => ({ ...prev, ...basicData }));
    // Clear errors when user types
    if (errors.name && basicData.name) {
      setErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  const handleMatricesChange = (matrices: LensMatrixFormData[]) => {
    setData((prev) => ({ ...prev, matrices }));
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!data.name.trim()) newErrors.name = "El nombre es requerido";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const matricesPayload =
        data.matrices.length > 0
          ? data.matrices.map(({ id: _id, ...m }) => m)
          : [];
      const payload =
        matricesPayload.length > 0
          ? { ...data, matrices: matricesPayload }
          : { ...data, matrices: [], create_with_defaults: true };
      const response = await fetch("/api/admin/lens-families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear familia de lentes");
      }

      toast.success("Familia de lentes creada exitosamente");
      router.push("/admin/products?tab=lens-families");
    } catch (error: unknown) {
      console.error(error);
      toast.error(error.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Stepper Header */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= 1
                ? "bg-primary text-primary-foreground border-primary"
                : "border-gray-300 text-gray-500"
            }`}
          >
            1
          </div>
          <div className="ml-2 font-medium text-sm">Información</div>
        </div>
        <div
          className={`w-24 h-1 mx-4 ${
            step >= 2 ? "bg-primary" : "bg-gray-200"
          }`}
        />
        <div className="flex items-center">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step >= 2
                ? "bg-primary text-primary-foreground border-primary"
                : "border-gray-300 text-gray-500"
            }`}
          >
            2
          </div>
          <div className="ml-2 font-medium text-sm">Matrices de Precios</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1
              ? "Información de la Familia"
              : "Configuración de Matrices"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <LensFamilyBasicForm
              data={data}
              errors={errors}
              onChange={handleBasicInfoChange}
            />
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-900">
                  Resumen de Familia
                </h4>
                <p className="text-sm text-blue-800">
                  {data.name} ({data.brand}) - {data.lens_type} -{" "}
                  {data.lens_material}
                </p>
              </div>
              <LensMatrixManager
                lensType={data.lens_type}
                matrices={data.matrices}
                onChange={handleMatricesChange}
              />
            </div>
          )}

          <div className="flex justify-between pt-6 border-t mt-6">
            {step === 1 ? (
              <Button
                variant="outline"
                onClick={() => router.push("/admin/products?tab=lens-families")}
              >
                Cancelar
              </Button>
            ) : (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Atrás
              </Button>
            )}

            {step === 1 ? (
              <Button onClick={handleNext}>
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button disabled={loading} onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Creando..." : "Crear Familia Completa"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
