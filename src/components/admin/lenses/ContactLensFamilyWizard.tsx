"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import {
  ContactLensMatrixManager,
  ContactLensMatrixFormData,
} from "./ContactLensMatrixManager";
import type {
  ContactLensUseType,
  ContactLensModality,
  ContactLensPackaging,
} from "@/types/contact-lens";

const USE_TYPES = [
  { value: "daily", label: "Diario" },
  { value: "bi_weekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
  { value: "extended_wear", label: "Uso Prolongado" },
];

const MODALITIES = [
  { value: "spherical", label: "Esférico" },
  { value: "toric", label: "Tórico" },
  { value: "multifocal", label: "Multifocal" },
  { value: "cosmetic", label: "Cosmético" },
];

const MATERIALS = [
  { value: "silicone_hydrogel", label: "Hidrogel de Silicona" },
  { value: "hydrogel", label: "Hidrogel" },
  { value: "rigid_gas_permeable", label: "RGP" },
];

const PACKAGING_TYPES = [
  { value: "box_30", label: "Caja de 30 lentes" },
  { value: "box_6", label: "Caja de 6 lentes" },
  { value: "box_3", label: "Caja de 3 lentes" },
  { value: "bottle", label: "Botella" },
];

interface ContactLensFamilyFormData {
  name: string;
  brand: string;
  category_id: string | null;
  use_type: ContactLensUseType;
  modality: ContactLensModality;
  material: string | undefined;
  packaging: ContactLensPackaging;
  base_curve: string;
  diameter: string;
  description: string;
  is_active: boolean;
}

interface FullContactLensFamilyData extends ContactLensFamilyFormData {
  matrices: ContactLensMatrixFormData[];
}

interface ContactLensFamilyWizardProps {
  familyId?: string;
}

export function ContactLensFamilyWizard({
  familyId,
}: ContactLensFamilyWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!familyId);
  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [data, setData] = useState<FullContactLensFamilyData>({
    name: "",
    brand: "",
    category_id: null,
    use_type: "monthly",
    modality: "spherical",
    material: undefined,
    packaging: "box_6",
    base_curve: "",
    diameter: "",
    description: "",
    is_active: true,
    matrices: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        const cats = json.categories || json.data || [];
        setCategories(
          cats.filter((c: { slug?: string }) =>
            [
              "lentes-contacto",
              "monofocales",
              "progresivos",
              "bifocales",
              "lectura",
              "ocupacional",
              "deportivo",
            ].includes(c.slug ?? ""),
          ),
        );
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (familyId) {
      fetch(
        `/api/admin/contact-lens-families/${familyId}?include_matrices=true`,
      )
        .then((r) => {
          if (!r.ok) throw new Error("Error al cargar familia");
          return r.json();
        })
        .then((json) => {
          const f = json.family;
          const matrices = (f.contact_lens_price_matrices || []).map(
            (m: {
              id: string;
              sphere_min: number;
              sphere_max: number;
              cylinder_min: number;
              cylinder_max: number;
              axis_min: number;
              axis_max: number;
              addition_min: number;
              addition_max: number;
              base_price: number;
              cost: number;
              is_active: boolean;
            }) => ({
              id: m.id,
              sphere_min: m.sphere_min,
              sphere_max: m.sphere_max,
              cylinder_min: m.cylinder_min,
              cylinder_max: m.cylinder_max,
              axis_min: m.axis_min,
              axis_max: m.axis_max,
              addition_min: m.addition_min,
              addition_max: m.addition_max,
              base_price: m.base_price,
              cost: m.cost,
              is_active: m.is_active,
            }),
          );
          setData({
            name: f.name || "",
            brand: f.brand || "",
            category_id: f.category_id || null,
            use_type: f.use_type || "monthly",
            modality: f.modality || "spherical",
            material: f.material || undefined,
            packaging: f.packaging || "box_6",
            base_curve: f.base_curve != null ? String(f.base_curve) : "",
            diameter: f.diameter != null ? String(f.diameter) : "",
            description: f.description || "",
            is_active: f.is_active ?? true,
            matrices,
          });
        })
        .catch((err) => {
          console.error(err);
          toast.error("Error al cargar familia");
        })
        .finally(() => setInitialLoading(false));
    }
  }, [familyId]);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!data.name.trim()) newErrors.name = "El nombre es requerido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
  };

  const handleSubmit = async () => {
    if (!familyId && data.matrices.length === 0) {
      toast.error("Debe agregar al menos una matriz de precios");
      return;
    }

    try {
      setLoading(true);

      const body = {
        name: data.name.trim(),
        brand: data.brand || null,
        category_id: data.category_id || null,
        use_type: data.use_type,
        modality: data.modality,
        material: data.material || null,
        packaging: data.packaging,
        base_curve: data.base_curve ? parseFloat(data.base_curve) : null,
        diameter: data.diameter ? parseFloat(data.diameter) : null,
        description: data.description || null,
        is_active: data.is_active,
        matrices: data.matrices.map((m) => ({
          sphere_min: m.sphere_min,
          sphere_max: m.sphere_max,
          cylinder_min: m.cylinder_min,
          cylinder_max: m.cylinder_max,
          axis_min: m.axis_min,
          axis_max: m.axis_max,
          addition_min: m.addition_min,
          addition_max: m.addition_max,
          base_price: m.base_price,
          cost: m.cost,
          is_active: m.is_active,
        })),
      };

      const url = familyId
        ? `/api/admin/contact-lens-families/${familyId}`
        : "/api/admin/contact-lens-families";
      const method = familyId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            (familyId
              ? "Error al actualizar familia de lentes de contacto"
              : "Error al crear familia de lentes de contacto"),
        );
      }

      toast.success(
        familyId
          ? "Familia actualizada exitosamente"
          : "Familia de lentes de contacto creada exitosamente",
      );
      router.push("/admin/products?tab=contact-lens-families");
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-12">
        Cargando...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={data.name}
                    onChange={(e) =>
                      setData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ej: Air Optix Aqua"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500">{errors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={data.brand}
                    onChange={(e) =>
                      setData((prev) => ({ ...prev, brand: e.target.value }))
                    }
                    placeholder="Ej: Alcon"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Categoría</Label>
                <Select
                  value={data.category_id ?? "__none__"}
                  onValueChange={(value) =>
                    setData((prev) => ({
                      ...prev,
                      category_id: value === "__none__" ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoría</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="use_type">Tipo de Uso *</Label>
                  <Select
                    value={data.use_type}
                    onValueChange={(value: ContactLensUseType) =>
                      setData((prev) => ({ ...prev, use_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modality">Modalidad *</Label>
                  <Select
                    value={data.modality}
                    onValueChange={(value: ContactLensModality) =>
                      setData((prev) => ({ ...prev, modality: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODALITIES.map((mod) => (
                        <SelectItem key={mod.value} value={mod.value}>
                          {mod.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="material">Material</Label>
                  <Select
                    value={data.material || "__none__"}
                    onValueChange={(value) =>
                      setData((prev) => ({
                        ...prev,
                        material: value === "__none__" ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Ninguno</SelectItem>
                      {MATERIALS.map((mat) => (
                        <SelectItem key={mat.value} value={mat.value}>
                          {mat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packaging">Embalaje *</Label>
                  <Select
                    value={data.packaging}
                    onValueChange={(value: ContactLensPackaging) =>
                      setData((prev) => ({ ...prev, packaging: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGING_TYPES.map((pkg) => (
                        <SelectItem key={pkg.value} value={pkg.value}>
                          {pkg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_curve">Curva Base (BC)</Label>
                  <Input
                    id="base_curve"
                    type="number"
                    step="0.1"
                    min="7"
                    max="10"
                    value={data.base_curve}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        base_curve: e.target.value,
                      }))
                    }
                    placeholder="Ej: 8.4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diameter">Diámetro (DIA)</Label>
                  <Input
                    id="diameter"
                    type="number"
                    step="0.1"
                    min="13"
                    max="15"
                    value={data.diameter}
                    onChange={(e) =>
                      setData((prev) => ({ ...prev, diameter: e.target.value }))
                    }
                    placeholder="Ej: 14.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={data.description}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Descripción opcional"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={data.is_active}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Activa
                </Label>
              </div>
            </div>
          )}

          {step === 2 && (
            <ContactLensMatrixManager
              matrices={data.matrices}
              onChange={(matrices) =>
                setData((prev) => ({ ...prev, matrices }))
              }
            />
          )}

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? () => router.back() : handleBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {step === 1 ? "Volver" : "Atrás"}
            </Button>
            {step === 1 ? (
              <Button onClick={handleNext}>
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  "Guardando..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {familyId ? "Actualizar Familia" : "Crear Familia"}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
