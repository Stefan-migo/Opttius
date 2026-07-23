"use client";

import { Eye, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ContactLensFields, SingleLensField, TreatmentsSection, TwoSeparateLensFields } from "./_components/LensSections";
import { LensTypeToggle } from "./_components/LensTypeToggle";
import type { CreateQuoteFormLensSectionProps } from "./CreateQuoteFormLensSection.types";

export type { CreateQuoteFormLensSectionProps };

export function CreateQuoteFormLensSection(props: CreateQuoteFormLensSectionProps) {
  const { lensType, presbyopiaSolution, formData, lensFamilies, loadingFamilies, contactLensFamilies, loadingContactLensFamilies,
    farLensFamilyId, nearLensFamilyId, farLensCost, nearLensCost, selectedPrescription, availableTreatments,
    calculatingPrice, calculatingContactLensPrice, onLensTypeChange, onLensFamilyChange, onContactLensFamilyChange,
    onContactLensQuantityChange, onContactLensPriceChange, onFarLensFamilyChange, onNearLensFamilyChange,
    onLensCostChange, onSourcingTypeChange, onLensFormDataChange, onTreatmentToggle } = props;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center"><Eye className="h-5 w-5 mr-2" />{presbyopiaSolution === "two_separate" ? "Configuración de Lentes" : "Configuración de Lente"}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <LensTypeToggle lensType={lensType} onChange={onLensTypeChange} />

        {lensType === "contact" ? (
          <ContactLensFields calculatingContactLensPrice={calculatingContactLensPrice} contactLensFamilies={contactLensFamilies} formData={formData} loadingContactLensFamilies={loadingContactLensFamilies} onContactLensFamilyChange={onContactLensFamilyChange} onContactLensPriceChange={onContactLensPriceChange} onContactLensQuantityChange={onContactLensQuantityChange} />
        ) : (
          <>
            {presbyopiaSolution === "two_separate" ? (
              <TwoSeparateLensFields farLensCost={farLensCost} farLensFamilyId={farLensFamilyId} formData={formData} lensFamilies={lensFamilies} loadingFamilies={loadingFamilies} nearLensCost={nearLensCost} nearLensFamilyId={nearLensFamilyId} onFarLensFamilyChange={onFarLensFamilyChange} onNearLensFamilyChange={onNearLensFamilyChange} />
            ) : (
              <SingleLensField formData={formData} lensFamilies={lensFamilies} loadingFamilies={loadingFamilies} presbyopiaSolution={presbyopiaSolution} selectedPrescription={selectedPrescription} onLensFamilyChange={onLensFamilyChange} />
            )}

            {renderStatusMessages(presbyopiaSolution, farLensFamilyId, nearLensFamilyId, formData.lens_family_id, formData.lens_type, formData.lens_material, lensFamilies, formData.lens_sourcing_type, onSourcingTypeChange)}
            {calculatingPrice && <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /><span>Calculando precio del lente...</span></div>}

            {!(presbyopiaSolution === "two_separate" && (farLensFamilyId || nearLensFamilyId)) && (
              <div><Label>Índice de Refracción</Label><Input className={formData.lens_family_id ? "bg-gray-50" : ""} placeholder={formData.lens_family_id ? formData.lens_index ? formData.lens_index.toString() : "—" : "Ej: 1.67"} readOnly={!!formData.lens_family_id} step="0.01" type="number" value={formData.lens_index || ""} onChange={(e: unknown) => { if (!formData.lens_family_id) onLensFormDataChange("lens_index", parseFloat(e.target.value) || null); }} />
                {formData.lens_family_id && formData.lens_material && <p className="text-xs text-gray-500 mt-1">Índice automático según material: {formData.lens_material}</p>}
              </div>
            )}

            {presbyopiaSolution !== "two_separate" && <TreatmentsSection availableTreatments={availableTreatments} formData={formData} onLensFormDataChange={onLensFormDataChange} onTreatmentToggle={onTreatmentToggle} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function renderStatusMessages(presbyopiaSolution: string, farLensFamilyId: string, nearLensFamilyId: string, lensFamilyId: string, lensType: string, lensMaterial: string, lensFamilies: unknown[], sourcingType: string, onSourcingTypeChange: unknown) {
  if (presbyopiaSolution === "two_separate") {
    if (farLensFamilyId || nearLensFamilyId) return <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-sm text-blue-800">La configuración de lentes se determina automáticamente según las familias seleccionadas.</p></div>;
    return <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"><p className="text-sm text-yellow-800 mb-2">No hay familias de lentes seleccionadas. Los precios de los lentes deben ingresarse manualmente en la sección de Precios y Costos.</p><p className="text-xs text-yellow-700">Tip: Selecciona familias de lentes para calcular los precios automáticamente según la prescripción.</p></div>;
  }
  if (lensFamilyId) {
    const sf = lensFamilies.find((f: unknown) => f.id === lensFamilyId);
    return <div className="space-y-3">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-sm text-blue-800">Tipo: {lensType || "—"} · Material: {lensMaterial || "—"} (heredados de la familia)</p></div>
      {sf?.is_stock_available === true && <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <Label className="text-sm font-medium text-green-800 block mb-2">Disponibilidad del Lente</Label>
        <RadioGroup className="flex gap-4" value={sourcingType} onValueChange={(v: "stock" | "surfaced") => onSourcingTypeChange(v)}>
          <div className="flex items-center space-x-2"><RadioGroupItem id="lens-stock" value="stock" /><Label className="cursor-pointer" htmlFor="lens-stock">📦 Stock (Entrega inmediata)</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem id="lens-surfaced" value="surfaced" /><Label className="cursor-pointer" htmlFor="lens-surfaced">🔧 Tallado a pedido</Label></div>
        </RadioGroup>
        <p className="text-xs text-green-700 mt-1">Este lens tiene stock disponible. Selecciona Stock para entrega inmediata.</p>
      </div>}
    </div>;
  }
  return <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"><p className="text-sm text-yellow-800 mb-2">No hay familia de lentes seleccionada. El precio del lente debe ingresarse manualmente.</p><p className="text-xs text-yellow-700">Tip: Selecciona una familia de lentes para calcular el precio automáticamente.</p></div>;
}
