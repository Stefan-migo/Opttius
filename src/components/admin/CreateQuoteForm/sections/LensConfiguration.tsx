import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Loader2, RefreshCw } from "lucide-react";
import { useBranch } from "@/hooks/useBranch";
import {
  QuoteFormData,
  LensFamily,
  ContactLensFamily,
} from "../types/quote.types";

interface LensConfigurationProps {
  formData: QuoteFormData;
  presbyopiaSolution: string;
  lensType: "optical" | "contact";
  manualLensPrice: boolean;
  onUpdateField: (field: keyof QuoteFormData, value: any) => void;
  onManualLensPriceToggle: () => void;
  onCalculateLensPrice: () => void;
  disabled?: boolean;
}

export function LensConfiguration({
  formData,
  presbyopiaSolution,
  lensType,
  manualLensPrice,
  onUpdateField,
  onManualLensPriceToggle,
  onCalculateLensPrice,
  disabled = false,
}: LensConfigurationProps) {
  const { currentBranchId } = useBranch();
  const [lensFamilies, setLensFamilies] = useState<LensFamily[]>([]);
  const [contactLensFamilies, setContactLensFamilies] = useState<
    ContactLensFamily[]
  >([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [loadingContactLensFamilies, setLoadingContactLensFamilies] =
    useState(false);

  // Fetch lens families
  useEffect(() => {
    const fetchLensFamilies = async () => {
      try {
        setLoadingFamilies(true);
        const res = await fetch("/api/admin/lens-families");
        if (res.ok) {
          const data = await res.json();
          // Standardized API returns data in 'data' field
          if (data.success && Array.isArray(data.data)) {
            setLensFamilies(data.data);
          } else {
            setLensFamilies(data.families || []);
          }
        }
      } catch (error) {
        console.error("Error fetching lens families:", error);
      } finally {
        setLoadingFamilies(false);
      }
    };

    fetchLensFamilies();
  }, []);

  // Fetch contact lens families
  useEffect(() => {
    const fetchContactLensFamilies = async () => {
      try {
        setLoadingContactLensFamilies(true);
        const res = await fetch("/api/admin/contact-lens-families");
        if (res.ok) {
          const data = await res.json();
          // Standardized API returns data in 'data' field
          if (data.success && Array.isArray(data.data)) {
            setContactLensFamilies(data.data);
          } else {
            setContactLensFamilies(data.families || []);
          }
        }
      } catch (error) {
        console.error("Error fetching contact lens families:", error);
      } finally {
        setLoadingContactLensFamilies(false);
      }
    };

    if (lensType === "contact") {
      fetchContactLensFamilies();
    }
  }, [lensType]);

  // Lens treatments options
  const lensTreatments = [
    { value: "anti_reflective", label: "Antireflejo" },
    { value: "blue_light_filter", label: "Filtro de luz azul" },
    { value: "uv_protection", label: "Protección UV" },
    { value: "scratch_resistant", label: "Resistente a rayones" },
    { value: "anti_fog", label: "Antivaho" },
    { value: "photochromic", label: "Fotocromático" },
    { value: "polarized", label: "Polarizado" },
    { value: "tint", label: "Tinte" },
    { value: "prism_extra", label: "Prisma Extra" },
  ];

  // Handle treatment selection
  const handleTreatmentToggle = (treatmentValue: string) => {
    const currentTreatments = [...formData.lens_treatments];
    const index = currentTreatments.indexOf(treatmentValue);

    if (index >= 0) {
      currentTreatments.splice(index, 1);
    } else {
      currentTreatments.push(treatmentValue);
    }

    onUpdateField("lens_treatments", currentTreatments);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Eye className="h-5 w-5 mr-2" />
          {lensType === "contact" ? "Lentes de Contacto" : "Lentes"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Lens Type Toggle */}
        <div className="flex gap-2">
          <Button
            variant={lensType === "optical" ? "default" : "outline"}
            onClick={() => onUpdateField("lens_type", "optical")}
            disabled={disabled}
          >
            Ópticos
          </Button>
          <Button
            variant={lensType === "contact" ? "default" : "outline"}
            onClick={() => onUpdateField("lens_type", "contact")}
            disabled={disabled}
          >
            Contacto
          </Button>
        </div>

        {/* Contact Lens Family Selection */}
        {lensType === "contact" && (
          <div>
            <Label>Familia de Lentes de Contacto</Label>
            <Select
              value={formData.contact_lens_family_id || "none"}
              onValueChange={(value) =>
                onUpdateField(
                  "contact_lens_family_id",
                  value === "none" ? "" : value,
                )
              }
              disabled={loadingContactLensFamilies || disabled}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingContactLensFamilies
                      ? "Cargando..."
                      : "Selecciona familia"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  Sin familia (precio manual)
                </SelectItem>
                {contactLensFamilies.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                    {family.brand ? ` (${family.brand})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Optical Lens Family Selection */}
        {lensType === "optical" && (
          <div>
            <Label>Familia de Lentes</Label>
            <Select
              value={formData.lens_family_id || "none"}
              onValueChange={(value) => {
                onUpdateField("lens_family_id", value === "none" ? "" : value);
                onUpdateField("lens_cost", 0); // Reset cost to trigger recalculation
              }}
              disabled={loadingFamilies || disabled}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingFamilies ? "Cargando..." : "Selecciona familia"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  Sin familia (precio manual)
                </SelectItem>
                {lensFamilies.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                    {family.brand ? ` (${family.brand})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Family Description */}
            {formData.lens_family_id &&
              (() => {
                const selectedFamily = lensFamilies.find(
                  (f) => f.id === formData.lens_family_id,
                );
                return selectedFamily?.description ? (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                    <p className="font-semibold mb-1">{selectedFamily.name}</p>
                    <p>{selectedFamily.description}</p>
                  </div>
                ) : null;
              })()}

            {/* Lens Properties */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Tipo de Lente</Label>
                <Input
                  value={formData.lens_type}
                  onChange={(e) => onUpdateField("lens_type", e.target.value)}
                  placeholder="Ej: Progresivo"
                  readOnly={!!formData.lens_family_id}
                  className={formData.lens_family_id ? "bg-gray-50" : ""}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label>Material</Label>
                <Input
                  value={formData.lens_material}
                  onChange={(e) =>
                    onUpdateField("lens_material", e.target.value)
                  }
                  placeholder="Ej: Policarbonato"
                  readOnly={!!formData.lens_family_id}
                  className={formData.lens_family_id ? "bg-gray-50" : ""}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Lens Index */}
            <div className="mt-4">
              <Label>Índice de Refracción</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.lens_index || ""}
                onChange={(e) =>
                  onUpdateField(
                    "lens_index",
                    parseFloat(e.target.value) || null,
                  )
                }
                placeholder={
                  formData.lens_family_id
                    ? formData.lens_index
                      ? formData.lens_index.toString()
                      : "—"
                    : "Ej: 1.67"
                }
                readOnly={!!formData.lens_family_id}
                className={formData.lens_family_id ? "bg-gray-50" : ""}
                disabled={disabled}
              />
              {formData.lens_family_id && formData.lens_material && (
                <p className="text-xs text-gray-500 mt-1">
                  Índice automático según material: {formData.lens_material}
                </p>
              )}
            </div>

            {/* Lens Treatments */}
            {presbyopiaSolution !== "two_separate" && (
              <div className="mt-6">
                <Label>Tratamientos</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {lensTreatments
                    .filter((treatment) => {
                      // Some treatments are only available without family
                      if (!formData.lens_family_id) return true;
                      return (
                        treatment.value === "tint" ||
                        treatment.value === "prism_extra"
                      );
                    })
                    .map((treatment) => {
                      const isSelected = formData.lens_treatments.includes(
                        treatment.value,
                      );
                      const isDisabled =
                        !!formData.lens_family_id &&
                        [
                          "anti_reflective",
                          "blue_light_filter",
                          "uv_protection",
                          "scratch_resistant",
                          "anti_fog",
                          "photochromic",
                          "polarized",
                        ].includes(treatment.value);

                      return (
                        <div
                          key={treatment.value}
                          className="flex items-center"
                        >
                          <input
                            type="checkbox"
                            id={`treatment-${treatment.value}`}
                            checked={isSelected}
                            onChange={() =>
                              handleTreatmentToggle(treatment.value)
                            }
                            disabled={isDisabled || disabled}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label
                            htmlFor={`treatment-${treatment.value}`}
                            className="ml-2 text-sm cursor-pointer"
                          >
                            {treatment.label}
                          </Label>
                        </div>
                      );
                    })}
                </div>
                {!formData.lens_family_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    Sin familia: puedes agregar cualquier tratamiento
                    manualmente.
                  </p>
                )}
              </div>
            )}

            {/* Manual Price Toggle */}
            <div className="flex items-center gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onManualLensPriceToggle}
                disabled={presbyopiaSolution === "two_separate" || disabled}
              >
                {manualLensPrice ? "Auto" : "Manual"}
              </Button>
              {!manualLensPrice && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCalculateLensPrice}
                  disabled={disabled}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Calcular
                </Button>
              )}
            </div>

            {/* Lens Cost Input */}
            <div className="mt-4">
              <Label>Costo del Lente</Label>
              <Input
                type="number"
                value={formData.lens_cost || ""}
                onChange={(e) =>
                  onUpdateField("lens_cost", parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                className={
                  formData.lens_family_id && !manualLensPrice
                    ? "bg-gray-50"
                    : ""
                }
                readOnly={
                  presbyopiaSolution === "two_separate" ||
                  (!!formData.lens_family_id && !manualLensPrice)
                }
                disabled={disabled}
              />
              {presbyopiaSolution === "two_separate" && (
                <p className="text-xs text-gray-500 mt-1">
                  Suma automática: Lejos ($
                  {(formData.far_lens_cost || 0).toLocaleString()}) + Cerca ($
                  {(formData.near_lens_cost || 0).toLocaleString()})
                </p>
              )}
              {formData.lens_family_id && (
                <p className="text-xs text-gray-500 mt-1">
                  {manualLensPrice
                    ? "Precio manual ingresado"
                    : "Precio calculado automáticamente"}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
