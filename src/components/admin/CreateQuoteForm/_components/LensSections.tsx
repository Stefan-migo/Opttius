"use client";

import { CheckCircle, Info, Loader2 } from "lucide-react";

import { ContactLensFamilyCombobox } from "@/components/admin/lenses/ContactLensFamilyCombobox";
import { LensFamilyCombobox } from "@/components/admin/lenses/LensFamilyCombobox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { formatPrice } from "./CreateQuoteForm.constants";

export function ContactLensFields({ formData, contactLensFamilies, loadingContactLensFamilies, onContactLensFamilyChange, onContactLensQuantityChange, onContactLensPriceChange, calculatingContactLensPrice }: unknown) {
  return (<div className="space-y-4"><div><Label>Familia de Lentes de Contacto</Label><ContactLensFamilyCombobox categorySlug="lentes-contacto" families={contactLensFamilies} loading={loadingContactLensFamilies} value={formData.contact_lens_family_id || ""} onChange={(v: string) => onContactLensFamilyChange(v)} /></div>
    {formData.contact_lens_family_id && <><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Cantidad de Cajas</Label><Input min="1" type="number" value={formData.contact_lens_quantity || 1} onChange={(e: unknown) => onContactLensQuantityChange(parseInt(e.target.value) || 1)} /></div><div><Label>Precio Total</Label><Input placeholder="Se calcula automáticamente" type="number" value={formData.contact_lens_price || ""} onChange={(e: unknown) => onContactLensPriceChange(parseFloat(e.target.value) || 0)} /></div></div>{calculatingContactLensPrice && <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /><span>Calculando precio del lente de contacto...</span></div>}</>}</div>);
}

export function TwoSeparateLensFields({ formData, lensFamilies, loadingFamilies, farLensFamilyId, nearLensFamilyId, farLensCost, nearLensCost, onFarLensFamilyChange, onNearLensFamilyChange }: unknown) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2"><Label>Lente de Lejos</Label><LensFamilyCombobox families={lensFamilies} loading={loadingFamilies} presbyopiaSolution="two_separate" value={farLensFamilyId || ""} onChange={(v: string) => onFarLensFamilyChange(v)} />{farLensCost > 0 && <p className="text-sm text-green-600 font-medium">Precio: ${farLensCost.toLocaleString()}</p>}</div>
      <div className="space-y-2"><Label>Lente de Cerca</Label><LensFamilyCombobox families={lensFamilies} loading={loadingFamilies} presbyopiaSolution="two_separate" value={nearLensFamilyId || ""} onChange={(v: string) => onNearLensFamilyChange(v)} />{nearLensCost > 0 && <p className="text-sm text-green-600 font-medium">Precio: ${nearLensCost.toLocaleString()}</p>}</div>
    </div>
  );
}

export function SingleLensField({ formData, lensFamilies, loadingFamilies, selectedPrescription, presbyopiaSolution, onLensFamilyChange }: unknown) {
  return (<div><div className="flex items-center gap-2 mb-2"><Label>Familia de Lentes</Label><div className="group relative"><Info className="h-4 w-4 text-gray-400 cursor-help" /><div className="absolute left-0 top-6 z-50 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">Selecciona una familia de lentes para calcular automáticamente el precio según la prescripción.</div></div></div>
    <LensFamilyCombobox families={lensFamilies} loading={loadingFamilies} placeholder="Selecciona familia (opcional)" presbyopiaSolution={presbyopiaSolution} prescriptionType={selectedPrescription?.prescription_type} value={formData.lens_family_id || ""} onChange={(v: string) => onLensFamilyChange(v)} />
    {formData.lens_family_id && (() => { const f = lensFamilies.find((x: unknown) => x.id === formData.lens_family_id); return f?.description ? <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800"><p className="font-semibold mb-1">{f.name}</p><p>{f.description}</p></div> : null; })()}
    <p className="text-xs text-gray-500 mt-1">Si seleccionas una familia, el precio se calculará automáticamente según la prescripción{presbyopiaSolution !== "none" && ` y adición (+${selectedPrescription?.od_add || ""} D)`}</p>
  </div>);
}

export function TreatmentsSection({ formData, availableTreatments, onTreatmentToggle, onLensFormDataChange }: unknown) {
  return (<div><Label>Tratamientos y Recubrimientos</Label><p className="text-xs text-gray-500 mb-2">Selecciona los tratamientos adicionales que deseas agregar al lente.</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
      {availableTreatments.filter((t: unknown) => !formData.lens_family_id || t.value === "tint" || t.value === "prism_extra").map((treatment: unknown) => {
        const isSelected = formData.lens_treatments.includes(treatment.value);
        const disabled = !!formData.lens_family_id && ["anti_reflective", "blue_light_filter", "uv_protection", "scratch_resistant", "anti_fog", "photochromic", "polarized"].includes(treatment.value);
        return (<div className={`p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? "border-admin-success bg-admin-success/10" : "border-gray-200 hover:border-epoch-primary"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`} key={treatment.value} onClick={() => !disabled && onTreatmentToggle(treatment)}>
          <div className="flex items-center justify-between"><div className="flex items-center">{isSelected && <CheckCircle className="h-4 w-4 text-admin-success mr-2" />}<span className={isSelected ? "font-medium" : ""}>{treatment.label}</span></div><Badge variant="outline">{formatPrice(treatment.cost)}</Badge></div>
        </div>);
      })}
    </div>
    {!formData.lens_family_id && <p className="text-xs text-gray-500 mt-1">Sin familia: puedes agregar cualquier tratamiento manualmente.</p>}
    {formData.lens_treatments.includes("tint") && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4"><div><Label>Color del Tinte</Label><Input placeholder="Ej: Gris, Marrón, Verde" value={formData.lens_tint_color} onChange={(e: unknown) => onLensFormDataChange("lens_tint_color", e.target.value)} /></div><div><Label>Porcentaje de Tinte (%)</Label><Input max="100" min="0" placeholder="0-100" type="number" value={formData.lens_tint_percentage || ""} onChange={(e: unknown) => onLensFormDataChange("lens_tint_percentage", parseInt(e.target.value) || 0)} /></div></div>}
  </div>);
}
